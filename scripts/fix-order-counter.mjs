#!/usr/bin/env node
/**
 * NORTHVALE — kontrola a srovnání čítače čísel objednávek
 * -------------------------------------------------------
 * Nová databázová sekvence (tabulka order_counter) startuje na pevné hodnotě.
 * Pokud je nižší než nejvyšší už existující objednávka, další objednávka by
 * dostala použité číslo a PŘEPSALA by starou objednávku.
 *
 * Tento skript projde všechny objednávky v úložišti, najde nejvyšší číslo
 * a porovná ho s databázovým čítačem.
 *
 * KONTROLA (nic nemění):
 *   SUPABASE_SERVICE_ROLE_KEY="..." node scripts/fix-order-counter.mjs
 *
 * SROVNÁNÍ (nastaví čítač):
 *   SUPABASE_SERVICE_ROLE_KEY="..." node scripts/fix-order-counter.mjs --apply
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnvLocal() {
  const p = join(ROOT, '.env.local');
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const envFile = loadEnvLocal();
const SUPABASE_URL = process.env.SUPABASE_URL || envFile.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('CHYBA: chybí VITE_SUPABASE_URL (.env.local) nebo SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const C = { reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', gray: '\x1b[90m', bold: '\x1b[1m' };
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function listAll(folder) {
  const all = [];
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await db.storage.from('pohoda-orders').list(folder, { limit, offset });
    if (error || !data || data.length === 0) break;
    all.push(...data.map(f => f.name));
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function main() {
  console.log(`${C.bold}Kontrola čítače čísel objednávek${C.reset}`);
  console.log(`${C.gray}projekt: ${SUPABASE_URL}${C.reset}\n`);

  // 1. nejvyšší číslo mezi existujícími objednávkami
  const names = [...await listAll(''), ...await listAll('processed')];
  const numbers = names
    .map(n => (n.match(/^order_(\d+)\.(json|xml)$/) || [])[1])
    .filter(Boolean)
    .map(Number)
    .filter(n => !isNaN(n));

  const maxOrder = numbers.length ? Math.max(...numbers) : 0;
  console.log(`Objednávek v úložišti:        ${numbers.length}`);
  console.log(`Nejvyšší použité číslo:       ${maxOrder || '—'}`);

  // 2. starý čítač v úložišti
  let storageCounter = 0;
  try {
    const { data } = await db.storage.from('pohoda-orders').download('invoice_counter.json');
    if (data) storageCounter = Number(JSON.parse(await data.text())?.next_number || 0);
  } catch (_e) {}
  console.log(`Starý čítač v úložišti:       ${storageCounter || '—'}`);

  // 3. nový čítač v databázi
  const { data: row, error: rowErr } = await db.from('order_counter').select('next_number').eq('id', 'invoice').maybeSingle();
  if (rowErr) {
    console.error(`\n${C.red}Tabulka order_counter není dostupná: ${rowErr.message}${C.reset}`);
    console.error(`${C.red}Zkontrolujte, že migrace 20260803222500_order_counter.sql je aplikovaná.${C.reset}`);
    process.exit(1);
  }
  const dbCounter = Number(row?.next_number || 0);
  console.log(`Nový čítač v databázi:        ${dbCounter || '—'}`);

  // 4. vyhodnocení
  const safe = Math.max(maxOrder + 1, storageCounter, 260100010);
  console.log(`\nBezpečná hodnota čítače:      ${C.bold}${safe}${C.reset}`);

  if (dbCounter > maxOrder && dbCounter >= storageCounter) {
    console.log(`\n${C.green}✓ V pořádku — čítač je před všemi použitými čísly. Nic dělat nemusíte.${C.reset}\n`);
    return;
  }

  console.log(`\n${C.red}${C.bold}⚠ POZOR: čítač je pozadu.${C.reset}`);
  console.log(`${C.red}Další objednávka by dostala číslo ${dbCounter}, které už je použité,${C.reset}`);
  console.log(`${C.red}a přepsala by existující objednávku.${C.reset}`);

  if (!APPLY) {
    console.log(`\nSrovnáte to příkazem:`);
    console.log(`${C.bold}  SUPABASE_SERVICE_ROLE_KEY="..." node scripts/fix-order-counter.mjs --apply${C.reset}\n`);
    process.exit(1);
  }

  const { error: updErr } = await db.from('order_counter').update({ next_number: safe }).eq('id', 'invoice');
  if (updErr) {
    console.error(`\n${C.red}Nepodařilo se nastavit čítač: ${updErr.message}${C.reset}\n`);
    process.exit(1);
  }

  const { data: check } = await db.from('order_counter').select('next_number').eq('id', 'invoice').maybeSingle();
  console.log(`\n${C.green}✓ Čítač nastaven na ${check?.next_number}. Další objednávka dostane toto číslo.${C.reset}\n`);
}

main().catch(err => {
  console.error(`${C.red}Chyba: ${err.message}${C.reset}`);
  process.exit(1);
});
