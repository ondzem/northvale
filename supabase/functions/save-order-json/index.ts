// Supabase Edge Function to save order details as JSON in storage
// Deploy via Supabase CLI: supabase functions deploy save-order-json

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const customerEmail = url.searchParams.get("customerEmail");

    // Public Customer Order Lookup (filtered strictly by customer's email)
    if (req.method === "GET" && customerEmail) {
      const { data: fileList, error: listErr } = await supabase.storage.from("pohoda-orders").list("", {
        limit: 200,
        sortBy: { column: "name", order: "desc" }
      });

      if (listErr) throw listErr;

      const matchingOrders: any[] = [];
      const jsonFiles = (fileList || []).filter(f => f.name.startsWith("order_") && f.name.endsWith(".json"));

      for (const file of jsonFiles) {
        try {
          const { data: fileBlob } = await supabase.storage.from("pohoda-orders").download(file.name);
          if (fileBlob) {
            const text = await fileBlob.text();
            const jsonObj = JSON.parse(text);
            const o = jsonObj.order || {};
            const itemEmail = (o.customer_email || o.email || '').toLowerCase();
            
            if (itemEmail === customerEmail.toLowerCase()) {
              matchingOrders.push({
                ...jsonObj,
                fileName: file.name
              });
            }
          }
        } catch (_e) {}
      }

      return new Response(JSON.stringify({ orders: matchingOrders }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate"
        },
      });
    }

    // Authenticate and verify admin role for admin operations (DELETE, full list)
    const authHeader = req.headers.get("authorization");
    if (!authHeader && req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Missing authorization header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile && profile.role !== "admin" && req.method === "DELETE") {
          return new Response(JSON.stringify({ error: "Forbidden. Admin access required." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const filename = url.searchParams.get("filename");

      if (!filename) {
        return new Response(JSON.stringify({ error: "Missing filename parameter." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const baseName = filename.replace(/\.(json|xml)$/, "");
      const filesToDelete = [`${baseName}.json`, `${baseName}.xml`];

      // Download JSON first to check order status & restore product stock if unfulfilled
      let restoredCount = 0;
      try {
        const { data: fileBlob } = await supabase.storage.from("pohoda-orders").download(`${baseName}.json`);
        if (fileBlob) {
          const text = await fileBlob.text();
          const jsonObj = JSON.parse(text);
          const orderObj = jsonObj.order || {};
          const itemsObj = jsonObj.items || [];
          
          const status = (orderObj.status || '').toLowerCase();
          const hasDpdParcel = !!orderObj.dpd_parcel_number;

          // Only restore stock if package was NOT shipped / dispatched via DPD!
          if (!hasDpdParcel && status !== 'shipped' && status !== 'delivered' && status !== 'completed' && status !== 'odesláno' && status !== 'doručeno') {
            for (const item of itemsObj) {
              const productId = item.product_id || item.id || item.code;
              const qty = Number(item.quantity || 1);
              if (productId && qty > 0) {
                const { data: prod } = await supabase.from("products").select("id, stock, variants").eq("id", productId).maybeSingle();
                if (prod) {
                  if (prod.stock !== null && prod.stock !== undefined) {
                    await supabase.from("products").update({ stock: Number(prod.stock || 0) + qty }).eq("id", productId);
                    restoredCount += qty;
                  } else if (Array.isArray(prod.variants) && prod.variants.length > 0) {
                    let variantMatched = false;
                    const updatedVariants = prod.variants.map((v: any) => {
                      if (item.variant_id && v.id === item.variant_id) {
                        variantMatched = true;
                        return { ...v, stock: Number(v.stock || 0) + qty };
                      }
                      return v;
                    });
                    if (!variantMatched && updatedVariants.length > 0) {
                      updatedVariants[0] = { ...updatedVariants[0], stock: Number(updatedVariants[0].stock || 0) + qty };
                    }
                    await supabase.from("products").update({ variants: updatedVariants }).eq("id", productId);
                    restoredCount += qty;
                  }
                }
              }
            }
          }
        }
      } catch (stockErr) {
        console.error("[save-order-json] Stock restoration check failed:", stockErr);
      }

      const { data, error } = await supabase.storage.from("pohoda-orders").remove(filesToDelete);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: `Files deleted: ${filesToDelete.join(", ")}`, restoredCount, deleted: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const filename = url.searchParams.get("filename");

      if (filename) {
        const { data, error } = await supabase.storage.from("pohoda-orders").download(filename);
        if (error) throw error;
        const text = await data.text();
        return new Response(text, {
          status: 200,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
          },
        });
      } else {
        const { data, error } = await supabase.storage.from("pohoda-orders").list("", {
          limit: 100,
          sortBy: { column: "name", order: "desc" }
        });
        if (error) throw error;
        return new Response(JSON.stringify({ files: data }), {
          status: 200,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
          },
        });
      }
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST or GET." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { order, items } = body;

    if (!order || !order.id) {
      return new Response(JSON.stringify({ error: "Missing required order details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedOrder = {
      ...order,
      customer_name: order.customer_name || order.customerName || '',
      customer_email: order.customer_email || order.customerEmail || '',
      customer_phone: order.customer_phone || order.customerPhone || '',
      customer_street: order.customer_street || order.shippingStreet || '',
      customer_city: order.customer_city || order.shippingCity || '',
      customer_zip: order.customer_zip || order.shippingZip || '',
      shipping_method: order.shipping_method || order.shippingMethod || '',
      payment_method: order.payment_method || order.paymentMethod || '',
      shipping_cost: order.shipping_cost !== undefined ? order.shipping_cost : (order.shippingCost || 0),
      payment_surcharge: order.payment_surcharge !== undefined ? order.payment_surcharge : (order.paymentSurcharge || 0),
      subtotal: order.subtotal !== undefined ? order.subtotal : (order.cartSubtotal || 0),
      final_total: order.final_total !== undefined ? order.final_total : (order.finalTotal || order.totalPrice || 0),
      carrier: order.carrier || ((order.shipping_method || order.shippingMethod || '').includes('GLS') ? 'GLS' : (order.shipping_method || order.shippingMethod || '').includes('DPD') ? 'DPD' : 'Osobní odběr')
    };

    const orderData = {
      order: normalizedOrder,
      items: items || order.items || [],
      created_at: new Date().toISOString()
    };

    const encoder = new TextEncoder();
    const fileData = encoder.encode(JSON.stringify(orderData, null, 2));

    const { error: uploadError } = await supabase.storage
      .from("pohoda-orders")
      .upload(`order_${order.id}.json`, fileData, {
        contentType: "application/json",
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Also update order_history array inside user profile if userId is present
    if (order.userId) {
      try {
        console.log(`[save-order-json] Syncing order history for userId: ${order.userId}`);
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("order_history")
          .eq("id", order.userId)
          .single();

        if (fetchError) {
          console.error(`[save-order-json] Failed to fetch profile for userId ${order.userId}:`, fetchError.message);
        } else {
          const history = profile?.order_history || [];
          const orderIdx = history.findIndex((o: any) => o.id === order.id);
          let updatedHistory;
          
          if (orderIdx >= 0) {
            updatedHistory = [...history];
            updatedHistory[orderIdx] = { ...updatedHistory[orderIdx], ...order, items: items || [] };
          } else {
            updatedHistory = [{ ...order, items: items || [] }, ...history];
          }

          const { error: updateError } = await supabase
            .from("profiles")
            .update({ order_history: updatedHistory })
            .eq("id", order.userId);

          if (updateError) {
            console.error(`[save-order-json] Failed to update order_history for userId ${order.userId}:`, updateError.message);
          } else {
            console.log(`[save-order-json] Successfully updated order_history in profiles.`);
          }
        }
      } catch (err) {
        console.error("[save-order-json] Unexpected error updating profile order_history:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, message: `Order ${order.id} saved successfully.` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
