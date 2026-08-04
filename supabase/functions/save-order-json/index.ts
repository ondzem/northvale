import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { normalizeOrder, normalizeItems } from "../_shared/order-schema.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

async function listAllStorageFiles(supabase: any): Promise<Array<{ name: string; path: string }>> {
  const allFiles: Array<{ name: string; path: string }> = [];

  const fetchFolder = async (folderPath: string) => {
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase.storage
        .from("pohoda-orders")
        .list(folderPath, {
          limit,
          offset,
          sortBy: { column: "name", order: "desc" }
        });

      if (error || !data || data.length === 0) break;

      for (const item of data) {
        if (item.name === ".emptyFolderPlaceholder") continue;
        const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
        allFiles.push({ name: item.name, path: fullPath });
      }

      if (data.length < limit) break;
      offset += limit;
    }
  };

  await fetchFolder("");
  await fetchFolder("processed");
  return allFiles;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    let authUser: any = null;
    let isServiceRole = false;
    let isAdmin = false;

    if (token) {
      if (token === supabaseServiceKey) {
        isServiceRole = true;
        isAdmin = true;
      } else {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          authUser = user;
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile && profile.role === "admin") {
            isAdmin = true;
          }
        }
      }
    }

    const url = new URL(req.url);

    // GET requests
    if (req.method === "GET") {
      const filename = url.searchParams.get("filename");
      const withDetails = url.searchParams.get("withDetails") === "true";
      const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "200", 10));
      const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

      // 1. Single File download by filename
      if (filename) {
        if (!authUser && !isServiceRole) {
          return new Response(JSON.stringify({ error: "Unauthorized. Authentication required." }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase.storage.from("pohoda-orders").download(filename);
        if (error || !data) {
          return new Response(JSON.stringify({ error: "File not found." }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const text = await data.text();
        let parsed: any = {};
        try {
          parsed = JSON.parse(text);
        } catch (_e) {}

        if (!isAdmin && authUser) {
          const norm = normalizeOrder(parsed.order || parsed);
          const ownerEmail = String(norm.customer_email || '').toLowerCase().trim();
          const userEmail = String(authUser.email || '').toLowerCase().trim();
          if (ownerEmail !== userEmail) {
            return new Response(JSON.stringify({ error: "Forbidden." }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        return new Response(text, {
          status: 200,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
          },
        });
      }

      // 2. Customer or Admin List lookup
      if (!authUser && !isServiceRole) {
        return new Response(JSON.stringify({ error: "Unauthorized. Valid authentication required." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allFiles = await listAllStorageFiles(supabase);

      // 6b: Admin or Service Role full list or batch withDetails (with limit, offset & parallel chunking)
      if (isAdmin || isServiceRole) {
        if (withDetails) {
          const detailedOrders: any[] = [];
          const jsonFiles = allFiles
            .filter(f => f.name.startsWith("order_") && f.name.endsWith(".json"))
            .slice(offset, offset + limit);

          const chunkSize = 10;
          for (let i = 0; i < jsonFiles.length; i += chunkSize) {
            const chunk = jsonFiles.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (file) => {
              try {
                const { data: fileBlob } = await supabase.storage.from("pohoda-orders").download(file.path);
                if (fileBlob) {
                  const text = await fileBlob.text();
                  const jsonObj = JSON.parse(text);
                  detailedOrders.push({
                    ...jsonObj,
                    order: normalizeOrder(jsonObj.order || jsonObj),
                    fileName: file.name
                  });
                }
              } catch (_e) {}
            }));
          }

          return new Response(JSON.stringify({ orders: detailedOrders, total: allFiles.filter(f => f.name.startsWith("order_") && f.name.endsWith(".json")).length }), {
            status: 200,
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate"
            },
          });
        }

        return new Response(JSON.stringify({ files: allFiles.slice(offset, offset + limit), total: allFiles.length }), {
          status: 200,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
          },
        });
      }

      // Regular customer list lookup strictly by verified user's token email
      const userEmail = String(authUser.email || '').toLowerCase().trim();
      const matchingOrders: any[] = [];
      const jsonFiles = allFiles.filter(f => f.name.startsWith("order_") && (f.name.endsWith(".json") || f.name.endsWith(".xml")));

      for (const file of jsonFiles) {
        try {
          const { data: fileBlob } = await supabase.storage.from("pohoda-orders").download(file.path);
          if (fileBlob) {
            const text = await fileBlob.text();
            let jsonObj: any;
            if (file.name.endsWith(".xml")) {
              const idMatch = text.match(/<ord:number>([^<]+)<\/ord:number>/) || text.match(/<number>([^<]+)<\/number>/);
              const emailMatch = text.match(/<typ:email>([^<]+)<\/typ:email>/) || text.match(/<email>([^<]+)<\/email>/);
              const nameMatch = text.match(/<typ:company>([^<]+)<\/typ:company>/) || text.match(/<typ:name>([^<]+)<\/typ:name>/);
              jsonObj = {
                order: {
                  id: idMatch ? idMatch[1] : file.name.replace("order_", "").replace(".xml", ""),
                  customer_email: emailMatch ? emailMatch[1] : "",
                  customer_name: nameMatch ? nameMatch[1] : "",
                  shipping_method: "Doprava",
                  payment_method: "Platba"
                },
                items: []
              };
            } else {
              jsonObj = JSON.parse(text);
            }

            const normalizedObj = normalizeOrder(jsonObj.order || jsonObj);
            const itemEmail = String(normalizedObj.customer_email || '').toLowerCase().trim();

            if (itemEmail === userEmail) {
              matchingOrders.push({
                ...jsonObj,
                order: normalizedObj,
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

    // DELETE Method: Requires authenticated admin
    if (req.method === "DELETE") {
      if (!authUser && !isServiceRole) {
        return new Response(JSON.stringify({ error: "Unauthorized. Login required." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden. Admin access required." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const filename = url.searchParams.get("filename");
      if (!filename) {
        return new Response(JSON.stringify({ error: "Missing filename parameter." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const baseName = String(filename).replace(/^.*[\\\/]/, "").replace(/\.(json|xml)$/, "");
      const filesToDelete = [
        `${baseName}.json`,
        `${baseName}.xml`,
        `processed/${baseName}.json`,
        `processed/${baseName}.xml`
      ];

      let restoredCount = 0;
      try {
        let fileBlob = (await supabase.storage.from("pohoda-orders").download(`${baseName}.json`)).data;
        if (!fileBlob) {
          fileBlob = (await supabase.storage.from("pohoda-orders").download(`processed/${baseName}.json`)).data;
        }
        if (fileBlob) {
          const text = await fileBlob.text();
          const jsonObj = JSON.parse(text);
          const normalized = normalizeOrder(jsonObj.order || jsonObj);
          
          // 6a: Support items in jsonObj.items || normalized.items
          const itemsToRestore = normalizeItems(jsonObj.items || normalized.items || []);

          if (normalized.fulfillment_status !== 'shipped' && normalized.fulfillment_status !== 'completed') {
            for (const item of itemsToRestore) {
              const productId = item.product_id || item.id;
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

    // POST Method: Requires Admin or Service Role
    if (req.method === "POST") {
      if (!authUser && !isServiceRole) {
        return new Response(JSON.stringify({ error: "Unauthorized. Authentication required." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!isAdmin && !isServiceRole) {
        return new Response(JSON.stringify({ error: "Forbidden. Admin or internal key required." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const rawOrder = body.order || body;
      const rawItems = body.items || rawOrder.items || [];

      if (!rawOrder || !rawOrder.id) {
        return new Response(JSON.stringify({ error: "Missing required order details or order id." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedOrder = normalizeOrder({ ...rawOrder, items: rawItems });
      const orderData = {
        ...body,
        order: normalizedOrder,
        items: normalizedOrder.items,
        created_at: normalizedOrder.created_at || new Date().toISOString()
      };

      const encoder = new TextEncoder();
      const fileData = encoder.encode(JSON.stringify(orderData, null, 2));

      const { error: uploadError } = await supabase.storage
        .from("pohoda-orders")
        .upload(`order_${normalizedOrder.id}.json`, fileData, {
          contentType: "application/json",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update profiles order_history if user_id is present
      if (normalizedOrder.user_id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("order_history")
            .eq("id", normalizedOrder.user_id)
            .maybeSingle();

          if (profile) {
            const history = profile.order_history || [];
            // 6c: Convert to string for strict comparison
            const updatedHistory = [normalizedOrder, ...history.filter((h: any) => String(h.id) !== String(normalizedOrder.id))];

            await supabase
              .from("profiles")
              .update({ order_history: updatedHistory })
              .eq("id", normalizedOrder.user_id);
          }
        } catch (err) {
          console.error("[save-order-json] Unexpected error updating profile order_history:", err);
        }
      }

      return new Response(JSON.stringify({ success: true, message: `Order ${normalizedOrder.id} saved successfully.`, order: normalizedOrder }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
