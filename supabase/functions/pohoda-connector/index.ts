import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { uploadInvoiceXml, downloadStockXml, archiveStockXml, testFtpConnection } from "./ftp.ts";
import { buildInvoiceXml } from "./xml-generator.ts";
import { parseStockXml } from "./xml-parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Helper pro logování do databáze
async function logSync(
  supabase: any,
  direction: "IN" | "OUT",
  operation: string,
  status: "SUCCESS" | "ERROR" | "WARNING",
  message: string,
  payloadExcerpt?: string
) {
  try {
    const { error } = await supabase
      .from("pohoda_sync_log")
      .insert({
        direction,
        operation,
        status,
        message,
        payload_excerpt: payloadExcerpt ? payloadExcerpt.substring(0, 2000) : null
      });
    if (error) {
      console.error("Failed to write log to database:", error);
    }
  } catch (err) {
    console.error("Database log writing error:", err);
  }
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Inicializace Supabase s Service Role Key pro obcházení RLS
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Pokud je to POST, můžeme vzít akci i z těla
    let bodyData: any = {};
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
      } catch {
        // Ignorovat chybějící body
      }
    }

    const currentAction = action || bodyData.action || "help";
    const companyIco = Deno.env.get("POHODA_ICO") || "12345678"; // IČO firmy

    // Zabezpečení pomocí API klíče nebo Supabase Authorization
    const apiKey = url.searchParams.get("api_key");
    const validApiKey = Deno.env.get("POHODA_API_KEY");
    
    let isAuthorized = false;
    
    // 1. Ověření přes API klíč (pro externí volání z Pohody nebo skriptů)
    if (apiKey && apiKey === validApiKey) {
      isAuthorized = true;
    }
    
    // 2. Akce "export-order" může být volána z e-shopu kýmkoliv (včetně zákazníků při dokončení objednávky)
    if (!isAuthorized && currentAction === "export-order") {
      isAuthorized = true;
    }
    
    // 3. Ověření přes přihlášeného admina v Supabase
    if (!isAuthorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
            
          if (profile && (profile.role === "admin" || profile.role === "superadmin")) {
            isAuthorized = true;
          }
        }
      }
    }
    
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid API key or insufficient permissions." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AKCE 1: Test připojení k FTP ---
    if (currentAction === "test-connection") {
      try {
        const fileList = await testFtpConnection();
        await logSync(
          supabase,
          "OUT",
          "test-connection",
          "SUCCESS",
          `FTP připojení úspěšné. Nalezeno ${fileList.length} položek v kořenovém adresáři.`,
          JSON.stringify(fileList)
        );
        return new Response(JSON.stringify({ success: true, files: fileList }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        const errMsg = err.message || String(err);
        await logSync(supabase, "OUT", "test-connection", "ERROR", `FTP test selhal: ${errMsg}`);
        return new Response(JSON.stringify({ success: false, error: errMsg }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- AKCE 2: Export objednávky do Pohody ---
    if (currentAction === "export-order") {
      const order = bodyData.order;
      if (!order || !order.orderNumber) {
        return new Response(JSON.stringify({ error: "Missing 'order' payload or orderNumber." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // Sestavíme XML
        const xmlContent = buildInvoiceXml(order, companyIco);
        const fileName = `faktura_${order.orderNumber}.xml`;

        // Nahrajeme na FTP
        await uploadInvoiceXml(fileName, xmlContent);

        await logSync(
          supabase,
          "OUT",
          "export-order",
          "SUCCESS",
          `Objednávka č. ${order.orderNumber} úspěšně vyexportována na FTP.`,
          xmlContent
        );

        return new Response(JSON.stringify({ success: true, fileName }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        const errMsg = err.message || String(err);
        await logSync(
          supabase,
          "OUT",
          "export-order",
          "ERROR",
          `Export objednávky č. ${order?.orderNumber} selhal: ${errMsg}`,
          JSON.stringify(order)
        );
        return new Response(JSON.stringify({ success: false, error: errMsg }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- AKCE 3: Import stavu zásob z Pohody do E-shopu ---
    if (currentAction === "import-stock") {
      const fileName = url.searchParams.get("file") || bodyData.file || "zasoby.xml";
      
      try {
        // 1. Stáhneme soubor z FTP
        const xmlContent = await downloadStockXml(fileName);
        
        // 2. Vyparsujeme položky
        const stockItems = parseStockXml(xmlContent);
        
        if (stockItems.length === 0) {
          await logSync(
            supabase,
            "IN",
            "import-stock",
            "WARNING",
            "Stažený XML soubor neobsahoval žádné platné zásoby k importu.",
            xmlContent.substring(0, 1000)
          );
          return new Response(JSON.stringify({ success: true, message: "No items parsed from XML." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 3. Provedeme aktualizaci zásob v Supabase
        let updatedCount = 0;
        let variantUpdatedCount = 0;
        const errors: string[] = [];

        for (const item of stockItems) {
          try {
            // Zkusíme nejprve najít produkt, kde id = SKU (např. sealed boxy, příslušenství)
            const { data: directProduct, error: directError } = await supabase
              .from("products")
              .select("id, stock")
              .eq("id", item.sku)
              .maybeSingle();

            if (directProduct) {
              // Přímá aktualizace
              const updateData: any = { stock: item.stock };
              if (item.price !== undefined) {
                updateData.price = item.price;
              }

              const { error: updateError } = await supabase
                .from("products")
                .update(updateData)
                .eq("id", item.sku);

              if (updateError) throw updateError;
              updatedCount++;
            } else {
              // Pokud produkt přímo podle ID neexistuje, zkusíme vyhledat v JSONB poli variants (singles)
              const { data: variantProduct, error: varError } = await supabase
                .from("products")
                .select("id, variants")
                .filter("variants", "cs", `[{"id": "${item.sku}"}]`)
                .maybeSingle();

              if (variantProduct && variantProduct.variants) {
                const updatedVariants = variantProduct.variants.map((v: any) => {
                  if (v.id === item.sku) {
                    return {
                      ...v,
                      stock: item.stock,
                      ...(item.price !== undefined ? { price: item.price } : {})
                    };
                  }
                  return v;
                });

                const { error: varUpdateError } = await supabase
                  .from("products")
                  .update({ variants: updatedVariants })
                  .eq("id", variantProduct.id);

                if (varUpdateError) throw varUpdateError;
                variantUpdatedCount++;
              }
            }
          } catch (err) {
            errors.push(`Chyba u položky SKU ${item.sku}: ${err.message || String(err)}`);
          }
        }

        // 4. Archivujeme stažený soubor na FTP s časovým razítkem, aby se neimportoval znovu
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const archiveName = `zasoby_${timestamp}.xml`;
        await archiveStockXml(fileName, archiveName);

        const status = errors.length > 0 ? "WARNING" : "SUCCESS";
        const summaryMessage = `Import dokončen. Aktualizováno ${updatedCount} běžných produktů a ${variantUpdatedCount} variant karet. Chyb: ${errors.length}.`;
        
        await logSync(
          supabase,
          "IN",
          "import-stock",
          status,
          summaryMessage + (errors.length > 0 ? ` Chyby: ${errors.join(", ")}` : ""),
          `Počet importovaných SKU: ${stockItems.length}`
        );

        return new Response(
          JSON.stringify({
            success: true,
            summary: {
              totalItems: stockItems.length,
              updatedProducts: updatedCount,
              updatedVariants: variantUpdatedCount,
              errors: errors.length > 0 ? errors : undefined
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errMsg = err.message || String(err);
        await logSync(supabase, "IN", "import-stock", "ERROR", `Import zásob selhal: ${errMsg}`);
        return new Response(JSON.stringify({ success: false, error: errMsg }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Nápověda pro případ chybějící nebo nesprávné akce
    return new Response(
      JSON.stringify({
        message: "Northvale Pohoda Connector Edge Function",
        endpoints: {
          "action=test-connection": "Otestuje připojení k FTP",
          "action=export-order": "Vytvoří a nahraje XML fakturu pro objednávku (vyžaduje POST payload)",
          "action=import-stock": "Stáhne a zpracuje XML soubor zásob z FTP"
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
