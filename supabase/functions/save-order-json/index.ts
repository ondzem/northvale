// Supabase Edge Function to save order details as JSON in storage
// Deploy via Supabase CLI: supabase functions deploy save-order-json

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const filename = url.searchParams.get("filename");

      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      if (filename) {
        const { data, error } = await supabase.storage.from("pohoda-orders").download(filename);
        if (error) throw error;
        const text = await data.text();
        return new Response(text, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { data, error } = await supabase.storage.from("pohoda-orders").list("", {
          limit: 100,
          sortBy: { column: "name", order: "desc" }
        });
        if (error) throw error;
        return new Response(JSON.stringify({ files: data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orderData = {
      order,
      items: items || [],
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
