/**
 * XML feedy a záložní obrázky produktů.
 *
 *   POST /product-feed/refresh  (x-cron-secret) — složí feedy a změněné uloží
 *        do veřejného bucketu `feeds`; volá cron každých 15 minut
 *   GET  /product-feed/image/<id>.<přípona>
 *
 * Web bucket vystavuje přes netlify/edge-functions/feeds.js na stálých adresách
 * northvaletcg.eu/feeds/*.xml, takže se párování na Heurece a Zboží nemění.
 * Úložiště dává skutečné Last-Modified a chrání funkci před opakovaným stahováním.
 * Žádné nasazení webu = žádné kredity Netlify. Obrázky obsluhuje jen pro produkty
 * přidané po posledním nasazení; ostatní jsou statické soubory z buildu.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isFeedProduct,
  buildGoogleFeed,
  buildHeurekaFeed,
  buildZboziFeed,
  buildSrovnavacFeed,
} from "../_shared/feed-builders.js";

const BUILDERS: Record<string, (products: any[]) => string> = {
  heureka: buildHeurekaFeed,
  zbozi: buildZboziFeed,
  google: buildGoogleFeed,
  srovnavac: buildSrovnavacFeed,
};

const client = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

/** Uloží jen feedy, které se změnily — Last-Modified pak odpovídá skutečnosti. */
async function refreshFeeds() {
  const supabase = client();
  const { data, error } = await supabase.from("feed_products").select("*");
  if (error) throw error;
  if (!data?.length) throw new Error("feed_products je prázdné");
  const products = data.filter(isFeedProduct);

  const updated: string[] = [];
  for (const [name, build] of Object.entries(BUILDERS)) {
    const xml = build(products);
    const path = `${name}.xml`;
    const { data: current } = await supabase.storage.from("feeds").download(path);
    if (current && (await current.text()) === xml) continue;
    const { error: upErr } = await supabase.storage.from("feeds").upload(path, new TextEncoder().encode(xml), {
      contentType: "application/xml; charset=utf-8",
      cacheControl: "300",
      upsert: true,
    });
    if (upErr) throw upErr;
    updated.push(name);
  }
  return updated;
}

async function imageResponse(file: string) {
  const id = file.replace(/\.[a-zA-Z0-9]+$/, "");
  const { data } = await client().from("products").select("image").eq("id", id).maybeSingle();
  const m = String(data?.image || "").match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/s);
  if (!m) return new Response("Nenalezeno", { status: 404 });
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=86400" } });
}

serve(async (req) => {
  try {
    const path = new URL(req.url).pathname;

    if (path.endsWith("/refresh")) {
      const secret = Deno.env.get("FEED_CRON_SECRET");
      if (req.method !== "POST" || !secret || req.headers.get("x-cron-secret") !== secret) {
        return new Response("Unauthorized", { status: 401 });
      }
      const updated = await refreshFeeds();
      return new Response(JSON.stringify({ updated }), { headers: { "Content-Type": "application/json" } });
    }

    const image = path.match(/\/image\/([A-Za-z0-9._-]{1,120})$/);
    if (image && (req.method === "GET" || req.method === "HEAD")) return await imageResponse(image[1]);
    return new Response("Nenalezeno", { status: 404 });
  } catch (err) {
    console.error("[product-feed] chyba:", err);
    return new Response("Dočasně nedostupné.", { status: 503, headers: { "Retry-After": "300" } });
  }
});
