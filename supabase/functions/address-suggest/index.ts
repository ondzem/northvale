// Supabase Edge Function: Address Autocomplete proxy using Mapy.com REST API
// Deploy via: npx supabase functions deploy address-suggest --project-ref bfxzhggjpiyqfolqpxzz

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("MAPY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Service unavailable: MAPY_API_KEY secret is not configured in Supabase environment." }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    let q = String(url.searchParams.get("q") || "").trim();
    q = q.slice(0, 120);

    if (q.length < 2) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawLang = String(url.searchParams.get("lang") || "cs").toLowerCase();
    const lang = rawLang === "en" ? "en" : "cs";

    const rawCountry = String(url.searchParams.get("country") || "cz").toLowerCase();
    const country = /^[a-z]{2}$/.test(rawCountry) ? rawCountry : "cz";

    const mapyUrl = new URL("https://api.mapy.cz/v1/suggest");
    mapyUrl.searchParams.set("lang", lang);
    mapyUrl.searchParams.set("limit", "6");
    mapyUrl.searchParams.set("type", "regional.address,regional.street");
    mapyUrl.searchParams.set("query", q);
    mapyUrl.searchParams.set("country", country);

    const apiRes = await fetch(mapyUrl.toString(), {
      headers: {
        "X-Mapy-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });

    if (!apiRes.ok) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await apiRes.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    const suggestions = items.slice(0, 6).map((item: any) => {
      const reg = Array.isArray(item.regionalStructure) ? item.regionalStructure : [];

      let street = item.name || "";
      let city = "";
      let zip = "";
      let countryName = "";

      for (const elem of reg) {
        const elemType = String(elem.type || "");
        const elemName = String(elem.name || "").trim();

        if (elemType.includes("postal_code")) {
          zip = elemName.replace(/\s+/g, "");
        } else if (elemType.includes("municipality") && !city) {
          city = elemName;
        } else if (elemType.includes("country")) {
          countryName = elemName;
        } else if (elemType.includes("street") && (!street || !street.includes(elemName))) {
          if (!street) street = elemName;
        }
      }

      // If label contains details, use clean label for UI display
      const label = item.label || item.name || [street, city].filter(Boolean).join(", ");

      return {
        label,
        street: street || label,
        city: city || "",
        zip: zip || "",
        country: countryName || "Česko",
      };
    });

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=180",
      },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
