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

    const mapyUrl = new URL("https://api.mapy.com/v1/suggest");
    mapyUrl.searchParams.set("lang", lang);
    mapyUrl.searchParams.set("limit", "6");
    // Jen konkrétní adresy s číslem popisným — u nich API vrací i PSČ.
    mapyUrl.searchParams.set("type", "regional.address");
    mapyUrl.searchParams.set("query", q);
    // POZOR: parametr se jmenuje "locality", ne "country".
    // "country" API tiše ignoruje a výsledky by nebyly omezené na ČR.
    mapyUrl.searchParams.set("locality", country);

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

      // Ulice s číslem popisným je v item.name, např. "Týnská ulička 610/7".
      const street = String(item.name || "").trim();

      // PSČ je vlastní pole item.zip. V regionalStructure NENÍ — hledat ho tam
      // znamená, že se PSČ nikdy nevyplní, což je hlavní přínos našeptávače.
      const zip = String(item.zip || "").replace(/\s+/g, "");

      let city = "";
      let cityPart = "";
      let countryName = "";

      for (const elem of reg) {
        const elemType = String(elem.type || "");
        const elemName = String(elem.name || "").trim();
        if (!elemName) continue;

        if (elemType === "regional.municipality" && !city) {
          city = elemName;
        } else if (elemType === "regional.municipality_part" && !cityPart) {
          cityPart = elemName;
        } else if (elemType === "regional.country") {
          countryName = elemName;
        }
      }

      // POZOR: item.label je NÁZEV TYPU ("Adresa", "Město"), ne adresa.
      // Do nabídky patří item.name a jako podtitulek item.location.
      return {
        label: street,
        context: String(item.location || [cityPart, city, countryName].filter(Boolean).join(", ")).trim(),
        street,
        city: city || cityPart || "",
        zip,
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
