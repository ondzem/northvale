/**
 * AI korektura newsletteru před odesláním.
 *
 * Admin klikne „Odeslat“ → frontend pošle sem předmět a bloky → Claude
 * zkontroluje pravopis, gramatiku, překlepy, nesoulad CZ/EN a podezřelé
 * odkazy. Vrací seznam nálezů; samotné odeslání tahle funkce NEDĚLÁ.
 *
 * Bez secretu ANTHROPIC_API_KEY vrátí { aiAvailable: false } a admin
 * dostane jen kontrolu odkazů (ta běží v prohlížeči a klíč nepotřebuje).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { getAuthContext, requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `Jsi korektor e-mailových newsletterů českého e-shopu se sběratelskými kartami (Pokémon, One Piece, Magic apod.). Newsletter jde na tisíce zákazníků a chyba poškodí důvěru, proto hledej pečlivě.

Kontroluj:
- pravopis, gramatiku, interpunkci a překlepy (česká i anglická verze),
- zdvojená nebo chybějící slova, nedokončené věty,
- nesoulad mezi CZ a EN verzí (jiná cena, datum, sleva, chybějící informace, EN text ponechaný česky a naopak),
- odkazy: překlepy v adrese (např. „hte“, „htps“, „nortvaletcg“), odkaz, který zjevně nesedí k textu tlačítka,
- zjevné věcné nesmysly (datum v minulosti vůči textu, nulová cena, „sleva 500 %“).

Názvy produktů, karet, edic a značek (např. „Prismatic Evolutions“, „Booster Box“, „ETB“) ber jako správné, pokud nejde o jasný překlep. Neopravuj styl ani marketingový tón — hlásit jen skutečné chyby.

severity:
- "error" = jednoznačná chyba, která se nesmí odeslat (překlep, rozbitý odkaz, gramatická chyba, nesoulad ceny),
- "warning" = pravděpodobná chyba nebo věc, kterou má člověk ověřit.

U každého nálezu uveď: where = kde to je (např. „Předmět CZ“, „Blok 2 – text CZ“, „Blok 3 – odkaz tlačítka“), found = přesný problematický úsek, suggestion = opravené znění, reason = krátké vysvětlení česky.
Když je vše v pořádku, vrať prázdný seznam.`;

const ISSUES_SCHEMA = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["error", "warning"] },
          where: { type: "string" },
          found: { type: "string" },
          suggestion: { type: "string" },
          reason: { type: "string" },
        },
        required: ["severity", "where", "found", "suggestion", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["issues"],
  additionalProperties: false,
};

/** Převede bloky na čitelný text pro korektora. Obrázky se neposílají, jen jejich odkazy. */
function describeNewsletter(subject: string, subjectEN: string, blocks: any[]): string {
  const clip = (v: unknown, n = 4000) => (typeof v === "string" ? v.slice(0, n) : "");
  const lines = [`Předmět CZ: ${clip(subject, 300)}`, `Předmět EN: ${clip(subjectEN, 300)}`, ""];
  (Array.isArray(blocks) ? blocks : []).slice(0, 40).forEach((b, i) => {
    const n = i + 1;
    if (b?.type === "text") {
      lines.push(`Blok ${n} – text CZ:\n${clip(b.content)}`);
      lines.push(`Blok ${n} – text EN:\n${clip(b.contentEN)}`);
    } else if (b?.type === "image") {
      lines.push(`Blok ${n} – obrázek, odkaz CZ: ${clip(b.linkUrl, 500) || "(bez odkazu)"}`);
      lines.push(`Blok ${n} – obrázek, odkaz EN: ${clip(b.linkUrlEN, 500) || "(bez odkazu)"}`);
    } else if (b?.type === "button") {
      lines.push(`Blok ${n} – tlačítko CZ: text „${clip(b.text, 200)}“, odkaz ${clip(b.url, 500)}`);
      lines.push(`Blok ${n} – tlačítko EN: text „${clip(b.textEN, 200)}“, odkaz ${clip(b.urlEN, 500)}`);
    }
    lines.push("");
  });
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Jen admin — jinak by kdokoli mohl pálit placené AI volání.
    const authCtx = await getAuthContext(req, supabase, serviceKey);
    const denied = requireAdmin(authCtx, corsHeaders);
    if (denied) return denied;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ aiAvailable: false, issues: [] });

    const { subject, subjectEN, blocks } = await req.json();
    const client = new Anthropic({ apiKey });

    // fallbacks: "default" — kdyby model požadavek odmítl, API ho samo zopakuje
    // na doporučeném záložním modelu, místo aby kontrola spadla.
    const response: any = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: ISSUES_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: describeNewsletter(subject, subjectEN, blocks) }],
    } as any);

    if (response.stop_reason === "refusal") {
      return json({ aiAvailable: true, aiFailed: true, issues: [] });
    }

    const text = (response.content ?? []).find((b: any) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text);
    return json({ aiAvailable: true, issues: Array.isArray(parsed?.issues) ? parsed.issues : [] });
  } catch (err) {
    // Kontrola nesmí zablokovat odeslání kvůli výpadku AI — admin uvidí, že neproběhla.
    console.error("[check-newsletter] AI kontrola selhala:", err);
    return json({ aiAvailable: true, aiFailed: true, issues: [] });
  }
});
