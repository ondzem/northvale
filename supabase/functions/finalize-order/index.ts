import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helpers for Base64 and ArrayBuffer conversion
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/\s/g, ""));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert PEM format key (with header/footer) to clean DER buffer
function pemToDerBuffer(pem: string, type: "private" | "public"): ArrayBuffer {
  const header = type === "private" ? "-----BEGIN PRIVATE KEY-----" : "-----BEGIN PUBLIC KEY-----";
  const footer = type === "private" ? "-----END PRIVATE KEY-----" : "-----END PUBLIC KEY-----";
  
  const cleanPem = pem
    .replace(header, "")
    .replace(footer, "")
    .replace(/\s/g, "");
  return base64ToArrayBuffer(cleanPem);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action = "create", orderId, orderDetails } = body;

    // Ensure pohoda-orders bucket is private
    try {
      await supabase.storage.createBucket("pohoda-orders", { public: false });
    } catch (_bErr) {}
    try {
      await supabase.storage.updateBucket("pohoda-orders", { public: false });
    } catch (_uErr) {}

    // Action 1: Create Order
    if (action === "create") {
      if (!orderDetails || !orderDetails.items) {
        return new Response(JSON.stringify({ error: "Missing orderDetails or items." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate sequence number from database sequence
      const { data: seqData, error: seqError } = await supabase.rpc("get_next_order_number");
      if (seqError || !seqData) {
        throw new Error(seqError?.message || "Failed to generate sequence order number.");
      }
      const generatedOrderId = seqData;

      const order = {
        ...orderDetails,
        id: generatedOrderId,
        created_at: new Date().toISOString()
      };

      // 1. Decrement Stock atomically on server
      for (const item of order.items) {
        const prodId = item.product_id || item.id;
        if (!prodId) continue;

        // Decrement daily deal stock if applicable
        if (item.product?.isDailyDeal) {
          const slotId = item.product.dealSlotId || 'active-deal';
          const { data: dbDeal } = await supabase
            .from('daily_deal')
            .select('stock')
            .eq('id', slotId)
            .single();
          if (dbDeal) {
            const newDealStock = Math.max(0, (dbDeal.stock || 0) - item.quantity);
            await supabase
              .from('daily_deal')
              .update({ stock: newDealStock })
              .eq('id', slotId);
          }
        }

        // Decrement main product stock
        if (prodId !== 'deal-of-the-day') {
          // If it is a variant
          if (item.id && item.id !== prodId) {
            const { data: dbProd } = await supabase
              .from('products')
              .select('variants')
              .eq('id', prodId)
              .single();
            if (dbProd && dbProd.variants) {
              const updatedVariants = dbProd.variants.map((v: any) => {
                if (v.id === item.id) {
                  return { ...v, stock: Math.max(0, (v.stock || 0) - item.quantity) };
                }
                return v;
              });
              await supabase
                .from('products')
                .update({ variants: updatedVariants })
                .eq('id', prodId);
            }
          } else {
            const { data: dbProd } = await supabase
              .from('products')
              .select('stock')
              .eq('id', prodId)
              .single();
            if (dbProd) {
              const newStock = Math.max(0, (dbProd.stock || 0) - item.quantity);
              await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', prodId);
            }
          }
        }
      }

      // 2. Save order json to storage
      const encoder = new TextEncoder();
      const storageData = {
        order: {
          id: order.id,
          created_at: order.created_at,
          customer_name: order.customerName,
          customer_city: order.shippingCity,
          customer_street: order.shippingStreet,
          customer_zip: order.shippingZip,
          customer_email: order.customerEmail,
          customer_phone: order.customerPhone,
          payment_method: order.paymentMethod,
          shipping_method: order.shippingMethod,
          shipping_cost: order.shippingCost,
          payment_surcharge: order.paymentSurcharge,
          notes: order.notes || '',
          pickup_point_details: order.pickupPointDetails || null,
          carrier: order.shippingMethod ? (
            order.shippingMethod.includes('GLS') ? 'GLS' :
            order.shippingMethod.includes('DPD') ? 'DPD' :
            (order.shippingMethod.includes('Zásilkovna') || order.shippingMethod.includes('Packeta')) ? 'Zásilkovna' :
            order.shippingMethod.includes('Pošta') ? 'Česká pošta' :
            'Osobní odběr'
          ) : 'GLS'
        },
        items: order.items.map((item: any) => ({
          name: item.name,
          product_id: item.id || item.product_id || item.name,
          quantity: item.quantity,
          price: item.price
        })),
        created_at: order.created_at
      };

      const fileBytes = encoder.encode(JSON.stringify(storageData, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("pohoda-orders")
        .upload(`order_${order.id}.json`, fileBytes, {
          contentType: "application/json",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 3. Update profiles table if logged in
      if (order.userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("order_history, store_credit")
          .eq("id", order.userId)
          .single();

        if (profile) {
          const history = profile.order_history || [];
          const updatedHistory = [order, ...history];
          const newCredit = Math.max(0, (profile.store_credit || 0) - (order.creditApplied || 0));

          await supabase
            .from("profiles")
            .update({
              order_history: updatedHistory,
              store_credit: newCredit
            })
            .eq("id", order.userId);
        }
      }

      // 4. Trigger invoice generation and email immediately if not card payment
      if (order.paymentMethod !== "card" && order.paymentMethod !== "online platba") {
        try {
          // Trigger generate-invoice-pdf
          await fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ order })
          });

          // Trigger send-order-email
          await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ order })
          });
        } catch (subErr) {
          console.error("Failed to run post-order actions:", subErr);
        }
      }

      // 5. Trigger Heureka "Ověřeno zákazníky" if enabled
      const heurekaOzEnabled = Deno.env.get("HEUREKA_OZ_ENABLED");
      if (heurekaOzEnabled !== "false" && order.customerEmail) {
        const heurekaOzKey = Deno.env.get("HEUREKA_OZ_KEY");
        if (heurekaOzKey) {
          try {
            const productItemIds = (order.items || []).map((item: any) => item.product_id || item.id);
            const response = await fetch("https://api.heureka.cz/shop-certification/v2/order/log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                apiKey: heurekaOzKey,
                email: order.customerEmail,
                orderId: String(order.id),
                productItemIds,
              }),
            });
            console.log(`Heureka OZ response status: ${response.status}`);
            if (!response.ok) {
              const resText = await response.text();
              console.error(`Heureka OZ error response: ${resText}`);
            }
          } catch (heurekaErr) {
            console.error("Failed to trigger Heureka OZ:", heurekaErr);
          }
        } else {
          console.warn("HEUREKA_OZ_ENABLED is set, but HEUREKA_OZ_KEY is missing.");
        }
      }

      return new Response(JSON.stringify({ success: true, orderId: order.id, order }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 2: Mark Paid (GP Webpay success callback)
    if (action === "mark_paid") {
      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing orderId." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { gpWebpayParams } = body;
      if (!gpWebpayParams) {
        return new Response(JSON.stringify({ error: "Missing GP Webpay payment verification parameters." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify GP Webpay signature
      const gpePublicKeyPem = Deno.env.get("GP_WEBPAY_GPE_PUBLIC_KEY");
      if (!gpePublicKeyPem) {
        throw new Error("Missing GP_WEBPAY_GPE_PUBLIC_KEY environment variable.");
      }

      const { 
        MERCHANTNUMBER, 
        OPERATION, 
        ORDERNUMBER, 
        MERORDERNUM, 
        PRCODE, 
        SRCODE, 
        RESULTTEXT, 
        DIGEST 
      } = gpWebpayParams;

      if (!ORDERNUMBER || !PRCODE || !DIGEST || String(ORDERNUMBER) !== String(orderId)) {
        return new Response(JSON.stringify({ error: "Invalid payment parameters or order ID mismatch." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reconstruct signature verification string (strict order)
      let verifyString = `${OPERATION}|${ORDERNUMBER}`;
      if (MERORDERNUM) {
        verifyString += `|${MERORDERNUM}`;
      }
      verifyString += `|${PRCODE}|${SRCODE}`;
      if (RESULTTEXT) {
        verifyString += `|${RESULTTEXT}`;
      }

      // Import GPE Public Key
      const publicKeyDer = pemToDerBuffer(gpePublicKeyPem, "public");
      const publicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyDer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-1",
        },
        false,
        ["verify"]
      );

      // Verify the signature
      const encoder = new TextEncoder();
      const isVerified = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        publicKey,
        base64ToArrayBuffer(DIGEST),
        encoder.encode(verifyString)
      );

      if (!isVerified || PRCODE !== "0") {
        return new Response(JSON.stringify({ error: "GP Webpay payment verification failed or declined." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the order from storage
      const filename = `order_${orderId}.json`;
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("pohoda-orders")
        .download(filename);

      if (downloadError || !fileData) {
        throw new Error(downloadError?.message || `Failed to download order ${orderId} JSON.`);
      }

      const text = await fileData.text();
      const storageObj = JSON.parse(text);

      // Reconstruct order details for finalization
      const order = {
        id: orderId,
        customerName: storageObj.order.customer_name,
        customerEmail: storageObj.order.customer_email,
        customerPhone: storageObj.order.customer_phone,
        shippingStreet: storageObj.order.customer_street,
        shippingCity: storageObj.order.customer_city,
        shippingZip: storageObj.order.customer_zip,
        paymentMethod: "card",
        paymentStatus: "paid",
        shippingMethod: storageObj.order.shipping_method,
        shippingCost: storageObj.order.shipping_cost,
        paymentSurcharge: storageObj.order.payment_surcharge,
        finalTotal: storageObj.order.final_total || (storageObj.items || []).reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) + (storageObj.order.shipping_cost || 0) + (storageObj.order.payment_surcharge || 0),
        notes: storageObj.order.notes,
        items: storageObj.items.map((item: any) => ({
          id: item.product_id,
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        userId: storageObj.order.userId || null
      };

      // Trigger invoice generation and email
      try {
        await fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ order })
        });

        await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ order })
        });
      } catch (postErr) {
        console.error("Failed to trigger post-order actions for mark_paid:", postErr);
      }

      // Update order status inside profiles if userId is present
      if (order.userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("order_history")
          .eq("id", order.userId)
          .single();

        if (profile && profile.order_history) {
          const updatedHistory = profile.order_history.map((o: any) => {
            if (o.id === orderId) {
              return { ...o, paymentStatus: "paid" };
            }
            return o;
          });

          await supabase
            .from("profiles")
            .update({ order_history: updatedHistory })
            .eq("id", order.userId);
        }
      }

      return new Response(JSON.stringify({ success: true, message: `Order ${orderId} marked as paid successfully.` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
