import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { normalizeOrder, normalizeItems } from "../_shared/order-schema.ts";

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

// Convert PEM format key to clean DER buffer
function pemToDerBuffer(pem: string, type: "private" | "public"): ArrayBuffer {
  const header = type === "private" ? "-----BEGIN PRIVATE KEY-----" : "-----BEGIN PUBLIC KEY-----";
  const footer = type === "private" ? "-----END PRIVATE KEY-----" : "-----END PUBLIC KEY-----";
  
  const cleanPem = pem
    .replace(header, "")
    .replace(footer, "")
    .replace(/\s/g, "");
  return base64ToArrayBuffer(cleanPem);
}

async function getNextInvoiceNumber(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("next_order_number");
    if (!error && data !== null && data !== undefined) {
      return String(data);
    }
    if (error) {
      console.error("rpc next_order_number error:", error);
    }
  } catch (err) {
    console.error("Error in getNextInvoiceNumber RPC:", err);
  }
  
  // Fallback to storage sequence if RPC is not yet migrated
  const START_NUMBER = 260100010;
  const fileName = "invoice_counter.json";
  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pohoda-orders")
      .download(fileName);

    let currentNum = START_NUMBER;
    if (!downloadError && fileData) {
      const text = await fileData.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.next_number === "number" && !isNaN(parsed.next_number)) {
        currentNum = Math.max(START_NUMBER, parsed.next_number);
      }
    }

    const nextNum = currentNum + 1;
    const encoder = new TextEncoder();
    const saveBytes = encoder.encode(JSON.stringify({ next_number: nextNum }, null, 2));

    await supabase.storage
      .from("pohoda-orders")
      .upload(fileName, saveBytes, { contentType: "application/json", upsert: true });

    return String(currentNum);
  } catch (err) {
    console.error("Error in fallback getNextInvoiceNumber:", err);
    return String(START_NUMBER);
  }
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

    // Action: Reset Invoice Counter
    if (action === "reset-invoice-counter") {
      const startNum = body.startNumber || 260100010;
      const encoder = new TextEncoder();
      const saveBytes = encoder.encode(JSON.stringify({ next_number: startNum }, null, 2));
      await supabase.storage
        .from("pohoda-orders")
        .upload("invoice_counter.json", saveBytes, { contentType: "application/json", upsert: true });
      return new Response(JSON.stringify({ success: true, message: `Invoice counter set to ${startNum}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Save Daily Deal Config
    if (action === "save-daily-deal-config") {
      const slotId = body.slotId || "active-deal";
      const configData = body.config || {};
      const encoder = new TextEncoder();
      let existingConfig: Record<string, any> = {};
      try {
        const { data: file } = await supabase.storage.from("pohoda-orders").download("daily_deals_config.json");
        if (file) {
          existingConfig = JSON.parse(await file.text());
        }
      } catch (_e) {}
      existingConfig[slotId] = { ...(existingConfig[slotId] || {}), ...configData };
      const saveBytes = encoder.encode(JSON.stringify(existingConfig, null, 2));
      await supabase.storage
        .from("pohoda-orders")
        .upload("daily_deals_config.json", saveBytes, { contentType: "application/json", upsert: true });
      return new Response(JSON.stringify({ success: true, config: existingConfig }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Get Daily Deal Config
    if (action === "get-daily-deal-config") {
      try {
        const { data: file } = await supabase.storage.from("pohoda-orders").download("daily_deals_config.json");
        if (file) {
          const text = await file.text();
          return new Response(JSON.stringify({ success: true, config: JSON.parse(text) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (_e) {}
      return new Response(JSON.stringify({ success: true, config: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 0: Get Reserved Order ID
    if (action === "get-order-id") {
      const seqData = await getNextInvoiceNumber(supabase);
      return new Response(JSON.stringify({ success: true, orderId: seqData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 1: Create Order
    if (action === "create") {
      if (!orderDetails) {
        return new Response(JSON.stringify({ error: "Missing orderDetails." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate sequence number or use passed orderId
      let generatedOrderId = orderId || orderDetails.id;
      if (!generatedOrderId) {
        generatedOrderId = await getNextInvoiceNumber(supabase);
      }

      const rawOrderObj = {
        ...orderDetails,
        id: generatedOrderId,
        created_at: orderDetails.created_at || new Date().toISOString()
      };

      const normalizedOrderData = normalizeOrder(rawOrderObj);

      // Check if order already exists in storage for overwrite protection
      const filename = `order_${generatedOrderId}.json`;
      try {
        const { data: existingFile } = await supabase.storage
          .from("pohoda-orders")
          .download(filename);
        if (existingFile) {
          if (!normalizedOrderData.items || normalizedOrderData.items.length === 0) {
            return new Response(JSON.stringify({ error: "Order already exists" }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (_eExist) {}

      // 1. Decrement Stock safely on server (wrapped per item in try/catch)
      for (const item of (normalizedOrderData.items || [])) {
        try {
          const prodId = item.product_id || item.id;
          if (!prodId) continue;

          // Decrement daily deal stock if applicable
          if (item.product?.isDailyDeal) {
            const slotId = item.product.dealSlotId || 'active-deal';
            const { data: dbDeal } = await supabase
              .from('daily_deal')
              .select('stock')
              .eq('id', slotId)
              .maybeSingle();
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
            if (item.id && item.id !== prodId) {
              const { data: dbProd } = await supabase
                .from('products')
                .select('variants')
                .eq('id', prodId)
                .maybeSingle();
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
                .maybeSingle();
              if (dbProd) {
                const newStock = Math.max(0, (dbProd.stock || 0) - item.quantity);
                await supabase
                  .from('products')
                  .update({ stock: newStock })
                  .eq('id', prodId);
              }
            }
          }
        } catch (stockErr) {
          console.error(`Stock deduction error for item ${item.product_id || item.name}:`, stockErr);
        }
      }

      // Increment discount_codes usage count if discountCode is present
      if (normalizedOrderData.discount_code) {
        try {
          const cleanCode = String(normalizedOrderData.discount_code).trim().toUpperCase();
          const { data: dbItem } = await supabase
            .from('discount_codes')
            .select('id, used_count, max_uses, is_active, active')
            .eq('code', cleanCode)
            .maybeSingle();

          if (dbItem) {
            const newUsedCount = Number(dbItem.used_count || 0) + 1;
            const maxUsesNum = dbItem.max_uses !== null && dbItem.max_uses !== undefined && dbItem.max_uses !== '' ? Number(dbItem.max_uses) : null;
            const isExhausted = maxUsesNum !== null ? (newUsedCount >= maxUsesNum) : false;

            const updatePayload: any = { used_count: newUsedCount };
            if (isExhausted) {
              updatePayload.is_active = false;
              updatePayload.active = false;
            }

            await supabase
              .from('discount_codes')
              .update(updatePayload)
              .eq('id', dbItem.id);
          }
        } catch (discErr) {
          console.error('Failed to increment discount code usage in finalize-order:', discErr);
        }
      }

      // 2. Save canonical order json to storage
      const encoder = new TextEncoder();
      const storageData = {
        order: normalizedOrderData,
        items: normalizedOrderData.items,
        created_at: normalizedOrderData.created_at
      };

      const fileBytes = encoder.encode(JSON.stringify(storageData, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("pohoda-orders")
        .upload(filename, fileBytes, {
          contentType: "application/json",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 3. Update profiles table if logged in
      if (normalizedOrderData.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("order_history, store_credit")
          .eq("id", normalizedOrderData.user_id)
          .maybeSingle();

        if (profile) {
          const history = profile.order_history || [];
          const updatedHistory = [normalizedOrderData, ...history.filter((h: any) => h.id !== normalizedOrderData.id)];
          const newCredit = Math.max(0, (profile.store_credit || 0) - (normalizedOrderData.credit_applied || 0));

          await supabase
            .from("profiles")
            .update({
              order_history: updatedHistory,
              store_credit: newCredit
            })
            .eq("id", normalizedOrderData.user_id);
        }
      }

      // 4. Trigger invoice generation and email immediately if not card payment
      const isCardPayment = String(normalizedOrderData.payment_method || '').toLowerCase().includes('kart')
        || String(normalizedOrderData.payment_method || '').toLowerCase().includes('card')
        || String(normalizedOrderData.payment_method || '').toLowerCase().includes('webpay');

      if (!isCardPayment) {
        try {
          if (!normalizedOrderData.has_no_vat) {
            await fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ order: normalizedOrderData })
            });
          }

          // Trigger send-order-email
          await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ order: normalizedOrderData, items: normalizedOrderData.items })
          });
        } catch (subErr) {
          console.error("Failed to run post-order actions:", subErr);
        }
      }

      // 5. Trigger Heureka "Ověřeno zákazníky" if enabled
      const heurekaOzEnabled = Deno.env.get("HEUREKA_OZ_ENABLED");
      if (heurekaOzEnabled !== "false" && normalizedOrderData.customer_email) {
        const heurekaOzKey = Deno.env.get("HEUREKA_OZ_KEY");
        if (heurekaOzKey) {
          try {
            const productItemIds = (normalizedOrderData.items || []).map((item: any) => item.product_id || item.id);
            const response = await fetch("https://api.heureka.cz/shop-certification/v2/order/log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                apiKey: heurekaOzKey,
                email: normalizedOrderData.customer_email,
                orderId: String(normalizedOrderData.id),
                productItemIds,
              }),
            });
            console.log(`Heureka OZ response status: ${response.status}`);
          } catch (heurekaErr) {
            console.error("Failed to trigger Heureka OZ:", heurekaErr);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, orderId: normalizedOrderData.id, order: normalizedOrderData }), {
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

      if (!isVerified || String(PRCODE) !== "0") {
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
      const existingOrder = storageObj.order || storageObj;

      // Reconstruct & normalize order details with paid status while preserving all fields
      const updatedOrderObj = {
        ...existingOrder,
        id: orderId,
        payment_status: 'paid',
        paymentStatus: 'paid',
        platba: 'uhrazeno',
        items: storageObj.items || existingOrder.items || []
      };

      const normalizedPaidOrder = normalizeOrder(updatedOrderObj);

      // Save updated order back to storage
      const storageData = {
        order: normalizedPaidOrder,
        items: normalizedPaidOrder.items,
        created_at: normalizedPaidOrder.created_at
      };

      const saveBytes = encoder.encode(JSON.stringify(storageData, null, 2));
      await supabase.storage
        .from("pohoda-orders")
        .upload(filename, saveBytes, { contentType: "application/json", upsert: true });

      // Trigger invoice generation and email
      try {
        if (!normalizedPaidOrder.has_no_vat) {
          await fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ order: normalizedPaidOrder })
          });
        }

        await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ order: normalizedPaidOrder, items: normalizedPaidOrder.items })
        });
      } catch (postErr) {
        console.error("Failed to trigger post-order actions for mark_paid:", postErr);
      }

      // Update order status inside profiles if user_id is present
      if (normalizedPaidOrder.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("order_history")
          .eq("id", normalizedPaidOrder.user_id)
          .maybeSingle();

        if (profile) {
          const history = profile.order_history || [];
          const updatedHistory = history.map((o: any) => {
            if (String(o.id) === String(orderId)) {
              return { ...o, payment_status: "paid", paymentStatus: "paid", platba: "uhrazeno" };
            }
            return o;
          });

          if (!updatedHistory.some((h: any) => String(h.id) === String(orderId))) {
            updatedHistory.unshift(normalizedPaidOrder);
          }

          await supabase
            .from("profiles")
            .update({ order_history: updatedHistory })
            .eq("id", normalizedPaidOrder.user_id);
        }
      }

      return new Response(JSON.stringify({ success: true, message: `Order ${orderId} marked as paid successfully.`, order: normalizedPaidOrder }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
