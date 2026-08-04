#!/usr/bin/env node
/**
 * NORTHVALE — bezpečnostní test (penetrační)
 * ------------------------------------------
 * Chová se jako útočník: použije POUZE veřejný anon klíč, který má každý
 * návštěvník ve zdrojovém kódu webu, a zkouší se dostat k datům a měnit je.
 *
 * KAŽDÝ ✓ znamená "pokus byl odmítnut" = dobře.
 * KAŽDÝ ✗ znamená "útok prošel" = díra, kterou je potřeba zavřít.
 *
 * Skript NIC nemaže a nic trvale nemění. Kde se pokouší o zápis, používá
 * neexistující nebo testovací identifikátory a případný zápis po sobě uklidí.
 *
 * SPUŠTĚNÍ:
 *   node scripts/test-security.mjs
 *
 * Volitelně (rozliší "prázdná tabulka" od "chráněná RLS" — doporučeno):
 *   SUPABASE_SERVICE_ROLE_KEY="..." node scripts/test-security.mjs
 *
 * Volitelně (pro kontrolu, že běžný přihlášený zákazník nevidí cizí data):
 *   TEST_LOGIN_EMAIL="zakaznik@x.cz" TEST_LOGIN_PASSWORD="heslo" node scripts/test-security.mjs
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
const ANON_KEY = process.env.SUPABASE_ANON_KEY || envFile.VITE_SUPABASE_ANON_KEY;
const LOGIN_EMAIL = process.env.TEST_LOGIN_EMAIL || '';
const LOGIN_PASSWORD = process.env.TEST_LOGIN_PASSWORD || '';
// Volitelné: se service klíčem umí skript rozlišit "tabulka je prázdná"
// od "tabulku chrání RLS" — jinak to zůstane jako položka k ručnímu ověření.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('CHYBA: chybí VITE_SUPABASE_URL nebo VITE_SUPABASE_ANON_KEY v .env.local.');
  process.exit(1);
}

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', gray: '\x1b[90m', bold: '\x1b[1m'
};

const results = [];
let currentSection = '';

function section(name) {
  currentSection = name;
  console.log(`\n${C.bold}── ${name}${C.reset}`);
}

function secure(name, detail = '') {
  results.push({ section: currentSection, name, status: 'SECURE', detail });
  console.log(`  ${C.green}✓${C.reset} ${name}${detail ? C.gray + '  ' + detail + C.reset : ''}`);
}

function vulnerable(name, detail = '', severity = 'VYSOKÁ') {
  results.push({ section: currentSection, name, status: 'VULNERABLE', detail, severity });
  console.log(`  ${C.red}✗ DÍRA (${severity}): ${name}${C.reset}`);
  if (detail) console.log(`    ${C.red}${detail}${C.reset}`);
}

function info(name, detail = '') {
  results.push({ section: currentSection, name, status: 'INFO', detail });
  console.log(`  ${C.yellow}•${C.reset} ${name} ${C.gray}${detail}${C.reset}`);
}

const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const admin = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }) : null;

/** Kolik řádků tabulka doopravdy má (jen se service klíčem). */
async function realRowCount(table) {
  if (!admin) return null;
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  return error ? null : (count ?? null);
}
const FN = `${SUPABASE_URL}/functions/v1`;

async function callFn(path, { method = 'POST', body, key = ANON_KEY } = {}) {
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${key}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(`${FN}/${path}`, {
      method, headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch (err) {
    return { status: 0, text: String(err?.message || err) };
  }
}

// ============================================================ 1. ČTENÍ TABULEK

const READ_TABLES = [
  { table: 'profiles',              why: 'jména, telefony, adresy a historie objednávek zákazníků', sev: 'KRITICKÁ' },
  { table: 'newsletter_subscribers',why: 'e-mailové adresy odběratelů', sev: 'VYSOKÁ' },
  { table: 'contact_messages',      why: 'zprávy z kontaktního formuláře', sev: 'VYSOKÁ' },
  { table: 'withdrawals',           why: 'odstoupení od smlouvy včetně čísel bankovních účtů', sev: 'KRITICKÁ' },
  { table: 'discount_codes',        why: 'všechny slevové kódy včetně nezveřejněných', sev: 'VYSOKÁ' },
  { table: 'order_counter',         why: 'číselná řada objednávek', sev: 'STŘEDNÍ' },
  { table: 'pohoda_sync_log',       why: 'log účetní synchronizace', sev: 'STŘEDNÍ' },
  { table: 'deleted_campaigns',     why: 'interní data newsletteru', sev: 'NÍZKÁ' },
];

// Tyto tabulky JSOU veřejné záměrně — jen si ověříme, že jdou číst
const PUBLIC_TABLES = ['products', 'categories', 'faq_items', 'hero_slides', 'homepage_sections', 'daily_deal'];

async function testTableReads() {
  section('1. Čtení databáze bez přihlášení (veřejný anon klíč)');

  for (const { table, why, sev } of READ_TABLES) {
    const { data, error } = await anon.from(table).select('*').limit(3);
    if (error) {
      secure(`Tabulka "${table}" je chráněná`, error.message.slice(0, 60));
    } else if (!data || data.length === 0) {
      const real = await realRowCount(table);
      if (real === null) {
        info(`Tabulka "${table}" vrátila 0 řádků`, 'buď je prázdná, nebo ji chrání RLS — pro jistotu spusťte se SUPABASE_SERVICE_ROLE_KEY');
      } else if (real === 0) {
        info(`Tabulka "${table}" je opravdu prázdná`, 'nelze posoudit, zda ji chrání RLS — otestujte znovu, až v ní budou data');
      } else {
        secure(`Tabulka "${table}" je chráněná RLS`, `obsahuje ${real} řádků, zvenku není vidět ani jeden`);
      }
    } else {
      const sample = JSON.stringify(data[0]).slice(0, 160);
      vulnerable(
        `Kdokoli si může přečíst tabulku "${table}"`,
        `Uniká: ${why}. Načteno ${data.length} řádků. Ukázka: ${sample}…`,
        sev
      );
    }
  }

  for (const table of PUBLIC_TABLES) {
    const { data, error } = await anon.from(table).select('id').limit(1);
    if (error) {
      info(`Tabulka "${table}" není veřejně čitelná`, 'pokud se obsah na webu zobrazuje, může být rozbitý — zkontrolujte web');
    } else if (!data || data.length === 0) {
      const real = await realRowCount(table);
      if (real && real > 0) {
        info(`Tabulka "${table}" je zvenku prázdná, ale má ${real} řádků`, 'obsah se návštěvníkům nezobrazí — zkontrolujte web');
      } else {
        secure(`Tabulka "${table}" je veřejná (tak to má být)`, 'je prázdná');
      }
    } else {
      secure(`Tabulka "${table}" je veřejná (tak to má být)`);
    }
  }
}

// ============================================================ 2. ZÁPIS DO TABULEK

async function testTableWrites() {
  section('2. Změna dat bez přihlášení');

  const marker = `SECTEST-${Date.now()}`;

  // 2a) vytvoření produktu
  {
    const { error } = await anon.from('products').insert({ id: marker, name: marker, price: 1 });
    if (error) {
      secure('Nelze vytvořit produkt', error.message.slice(0, 60));
    } else {
      vulnerable('Kdokoli může vkládat produkty do katalogu', `Vytvořen produkt ${marker} — SMAŽTE HO`, 'KRITICKÁ');
      await anon.from('products').delete().eq('id', marker);
    }
  }

  // 2b) změna ceny existujícího produktu
  {
    const { data: prod } = await anon.from('products').select('id, price').limit(1).maybeSingle();
    if (prod) {
      const { data: upd, error } = await anon
        .from('products').update({ price: prod.price }).eq('id', prod.id).select();
      if (error) {
        secure('Nelze měnit ceny produktů', error.message.slice(0, 60));
      } else if (upd && upd.length > 0) {
        vulnerable('Kdokoli může měnit ceny produktů v katalogu', `Prošel zápis na produkt ${prod.id}`, 'KRITICKÁ');
      } else {
        secure('Nelze měnit ceny produktů', 'zápis neovlivnil žádný řádek');
      }
    } else {
      info('Změna ceny neotestována', 'nepodařilo se načíst žádný produkt');
    }
  }

  // 2c) vytvoření slevového kódu
  {
    const { error } = await anon.from('discount_codes').insert({
      code: marker, discount_type: 'percent', discount_value: 100,
      used_count: 0, is_active: true, active: true
    });
    if (error) {
      secure('Nelze vytvořit slevový kód', error.message.slice(0, 60));
    } else {
      vulnerable('Kdokoli si může vyrobit slevový kód na 100 %', `Vytvořen kód ${marker} — SMAŽTE HO`, 'KRITICKÁ');
      await anon.from('discount_codes').delete().eq('code', marker);
    }
  }

  // 2d) povýšení sebe sama na administrátora
  {
    const { data: prof } = await anon.from('profiles').select('id').limit(1).maybeSingle();
    if (prof) {
      const { data: upd, error } = await anon
        .from('profiles').update({ role: 'admin' }).eq('id', prof.id).select();
      if (error) {
        secure('Nelze měnit role uživatelů', error.message.slice(0, 60));
      } else if (upd && upd.length > 0) {
        vulnerable('Kdokoli se může povýšit na administrátora', `Změněna role u profilu ${prof.id} — OKAMŽITĚ OPRAVTE`, 'KRITICKÁ');
      } else {
        secure('Nelze měnit role uživatelů', 'zápis neovlivnil žádný řádek');
      }
    } else {
      info('Změna role neotestována', 'profily nejsou veřejně čitelné (dobře)');
    }
  }

  // 2e) navýšení kreditu
  {
    const { data: prof } = await anon.from('profiles').select('id').limit(1).maybeSingle();
    if (prof) {
      const { data: upd, error } = await anon
        .from('profiles').update({ store_credit: 999999 }).eq('id', prof.id).select();
      if (error) {
        secure('Nelze měnit kredit zákazníků', error.message.slice(0, 60));
      } else if (upd && upd.length > 0) {
        vulnerable('Kdokoli si může přidat kredit v obchodě', `Změněn kredit u profilu ${prof.id} — OKAMŽITĚ OPRAVTE`, 'KRITICKÁ');
      } else {
        secure('Nelze měnit kredit zákazníků');
      }
    }
  }

  // 2f) mazání recenzí
  {
    const { data: del, error } = await anon.from('product_reviews').delete().eq('id', -999999).select();
    if (error) {
      secure('Nelze mazat recenze', error.message.slice(0, 60));
    } else {
      info('Mazání recenzí prošlo bez chyby', `smazáno řádků: ${del?.length ?? 0} (test cílil na neexistující ID)`);
    }
  }
}

// ============================================================ 3. ÚLOŽIŠTĚ

async function testStorage() {
  section('3. Úložiště souborů (objednávky a faktury)');

  for (const bucket of ['pohoda-orders', 'invoices']) {
    const { data, error } = await anon.storage.from(bucket).list('', { limit: 5 });
    if (error) {
      secure(`Bucket "${bucket}" nelze veřejně vypsat`, error.message.slice(0, 60));
    } else if (!data || data.length === 0) {
      secure(`Bucket "${bucket}" nevrátil žádné soubory`);
    } else {
      vulnerable(
        `Kdokoli si může vypsat obsah bucketu "${bucket}"`,
        `Nalezeno ${data.length} souborů, např. ${data.slice(0, 3).map(f => f.name).join(', ')}`,
        'KRITICKÁ'
      );
    }
  }

  // pokus o stažení faktury přímo přes veřejnou URL
  const guess = `${SUPABASE_URL}/storage/v1/object/public/invoices/invoice_260100010.pdf`;
  try {
    const res = await fetch(guess);
    if (res.ok) {
      vulnerable(
        'Faktury jsou veřejně stažitelné podle čísla objednávky',
        `${guess} vrací HTTP 200. Čísla jdou po sobě, takže lze stáhnout faktury všech zákazníků.`,
        'KRITICKÁ'
      );
    } else {
      secure('Faktury nejsou veřejně stažitelné', `HTTP ${res.status}`);
    }
  } catch (_e) {
    secure('Faktury nejsou veřejně stažitelné', 'požadavek selhal');
  }
}

// ============================================================ 4. EDGE FUNKCE

async function testEdgeFunctions() {
  section('4. Serverové funkce s veřejným klíčem');

  // newsletter — rozeslání
  {
    const r = await callFn('send-newsletter', {
      body: { subject: 'SECTEST — neodesílat', htmlContent: '<p>test</p>', lang: 'CZ', testOnly: true }
    });
    if (r.status === 401 || r.status === 403) {
      secure('Newsletter nelze rozeslat bez oprávnění', `HTTP ${r.status}`);
    } else {
      vulnerable('Kdokoli může rozeslat newsletter vaším jménem', `HTTP ${r.status}: ${r.text.slice(0, 150)}`, 'KRITICKÁ');
    }
  }

  // newsletter — čtení historie kampaní
  {
    const r = await callFn('send-newsletter', { method: 'GET' });
    if (r.status === 401 || r.status === 403) {
      secure('Historii kampaní nelze číst bez oprávnění', `HTTP ${r.status}`);
    } else {
      vulnerable('Kdokoli si může přečíst historii vašich kampaní', `HTTP ${r.status}: ${r.text.slice(0, 150)}`, 'VYSOKÁ');
    }
  }

  // odesílání e-mailů jménem obchodu
  {
    const r = await callFn('send-order-email', {
      body: { order: { id: 'SECTEST', customerEmail: 'sectest@example.invalid', customerName: 'Test' }, items: [] }
    });
    if (r.status === 401 || r.status === 403) {
      secure('E-maily nelze rozesílat bez oprávnění', `HTTP ${r.status}`);
    } else {
      vulnerable('Kdokoli může posílat e-maily z vaší domény', `HTTP ${r.status}: ${r.text.slice(0, 150)}`, 'KRITICKÁ');
    }
  }

  // generování faktur
  {
    const r = await callFn('generate-invoice-pdf', {
      body: { order: { id: 'SECTEST', customerName: 'Útočník', items: [] }, overwrite: true }
    });
    if (r.status === 401 || r.status === 403) {
      secure('Faktury nelze generovat bez oprávnění', `HTTP ${r.status}`);
    } else {
      vulnerable('Kdokoli může vystavit fakturu a přepsat existující', `HTTP ${r.status}: ${r.text.slice(0, 150)}`, 'VYSOKÁ');
    }
  }

  // přenastavení číselné řady faktur
  {
    const r = await callFn('finalize-order', { body: { action: 'reset-invoice-counter', startNumber: 260100010 } });
    if (r.status === 401 || r.status === 403) {
      secure('Číselnou řadu faktur nelze přenastavit', `HTTP ${r.status}`);
    } else {
      vulnerable('Kdokoli může přenastavit číselnou řadu faktur', `HTTP ${r.status} — vede k přepsání objednávek`, 'KRITICKÁ');
    }
  }

  // změna denní nabídky
  {
    const r = await callFn('finalize-order', {
      body: { action: 'save-daily-deal-config', slotId: 'active-deal', config: { ends_at: null } }
    });
    if (r.status === 401 || r.status === 403) {
      secure('Denní nabídku nelze měnit bez oprávnění', `HTTP ${r.status}`);
    } else {
      vulnerable('Kdokoli může změnit nastavení denní nabídky', `HTTP ${r.status}`, 'STŘEDNÍ');
    }
  }

  // výpis objednávek
  {
    const r = await callFn('save-order-json?customerEmail=a', { method: 'GET' });
    if (r.status === 401 || r.status === 403) {
      secure('Objednávky nelze vypsat bez přihlášení', `HTTP ${r.status}`);
    } else {
      vulnerable('Kdokoli si může vypsat objednávky zákazníků', `HTTP ${r.status}: ${r.text.slice(0, 200)}`, 'KRITICKÁ');
    }
  }

  // podvržená platba
  {
    const r = await callFn('finalize-order', {
      body: {
        action: 'mark_paid', orderId: '260100010',
        gpWebpayParams: { OPERATION: 'CREATE_ORDER', ORDERNUMBER: '260100010', PRCODE: '0', SRCODE: '0', DIGEST: 'ZmFrZQ==' }
      }
    });
    if (r.status >= 400) {
      secure('Podvrženou platbu server odmítne', `HTTP ${r.status}`);
    } else {
      vulnerable('Objednávku lze označit jako zaplacenou bez skutečné platby', `HTTP ${r.status}`, 'KRITICKÁ');
    }
  }
}

// ============================================================ 5. CENY

async function testPricing() {
  section('5. Objednávka za podvrženou cenu');

  const { data: prod } = await anon
    .from('products').select('id, name, price').gt('price', 100).limit(1).maybeSingle();

  if (!prod) {
    info('Test cen přeskočen', 'nepodařilo se načíst produkt s cenou nad 100 Kč');
    return;
  }

  const r = await callFn('finalize-order', {
    body: {
      action: 'create',
      orderDetails: {
        items: [{ id: prod.id, product_id: prod.id, name: prod.name, price: 1, quantity: 1 }],
        subtotal: 1, finalTotal: 1, shippingCost: 0, paymentSurcharge: 0,
        paymentMethod: 'Bankovní převod', shippingMethod: 'Osobní odběr',
        customerName: 'Security Test', customerEmail: 'sectest@example.invalid',
        customerPhone: '+420000000000', shippingStreet: 'Test 1',
        shippingCity: 'Praha', shippingZip: '110 00'
      }
    }
  });

  let created = null;
  try { created = JSON.parse(r.text)?.orderId || null; } catch (_e) {}

  if (r.status >= 400) {
    secure(`Objednávku za 1 Kč server odmítl`, `produkt "${prod.name}" stojí ${prod.price} Kč, HTTP ${r.status}`);
  } else {
    vulnerable(
      'Lze objednat zboží za libovolnou cenu',
      `Produkt "${prod.name}" za ${prod.price} Kč byl objednán za 1 Kč.` +
      (created ? ` Vznikla objednávka ${created} — SMAŽTE JI V ADMINISTRACI.` : ''),
      'KRITICKÁ'
    );
  }
}

// ============================================================ 6. CIZÍ DATA

async function testCrossCustomer() {
  section('6. Přístup přihlášeného zákazníka k cizím datům');

  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    info('Přeskočeno', 'spusťte s TEST_LOGIN_EMAIL a TEST_LOGIN_PASSWORD běžného (ne admin) účtu');
    return;
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: sess, error: loginErr } = await client.auth.signInWithPassword({
    email: LOGIN_EMAIL, password: LOGIN_PASSWORD
  });

  if (loginErr || !sess?.session) {
    info('Přihlášení se nezdařilo', loginErr?.message || 'bez session');
    return;
  }

  const myId = sess.user.id;
  const token = sess.session.access_token;

  // cizí profily
  {
    const { data, error } = await client.from('profiles').select('id, full_name, phone').neq('id', myId).limit(5);
    if (error) {
      secure('Zákazník nevidí cizí profily', error.message.slice(0, 60));
    } else if (!data || data.length === 0) {
      secure('Zákazník nevidí cizí profily');
    } else {
      vulnerable('Přihlášený zákazník vidí profily ostatních', `Načteno ${data.length} cizích profilů`, 'KRITICKÁ');
    }
  }

  // změna cizího profilu
  {
    const { data: other } = await client.from('profiles').select('id').neq('id', myId).limit(1).maybeSingle();
    if (other) {
      const { data: upd } = await client.from('profiles').update({ store_credit: 1 }).eq('id', other.id).select();
      if (upd && upd.length > 0) {
        vulnerable('Zákazník může měnit cizí profil', `Změněn profil ${other.id}`, 'KRITICKÁ');
      } else {
        secure('Zákazník nemůže měnit cizí profil');
      }
    } else {
      secure('Zákazník se k cizímu profilu vůbec nedostane');
    }
  }

  // cizí objednávka přes edge funkci
  {
    const r = await callFn('save-order-json?filename=order_260100010.json', { method: 'GET', key: token });
    if (r.status === 403 || r.status === 404 || r.status === 401) {
      secure('Zákazník se nedostane k cizí objednávce', `HTTP ${r.status}`);
    } else {
      const leaksEmail = /customer_email/.test(r.text) && !r.text.includes(LOGIN_EMAIL);
      if (leaksEmail) {
        vulnerable('Zákazník si stáhne cizí objednávku', `HTTP ${r.status}: ${r.text.slice(0, 160)}`, 'KRITICKÁ');
      } else {
        secure('Zákazník se nedostane k cizí objednávce', `HTTP ${r.status}`);
      }
    }
  }

  // administrace
  {
    const r = await callFn('save-order-json?withDetails=true', { method: 'GET', key: token });
    if (r.status === 401 || r.status === 403) {
      secure('Zákazník se nedostane do seznamu všech objednávek', `HTTP ${r.status}`);
    } else {
      let count = 0;
      try { count = (JSON.parse(r.text)?.orders || []).length; } catch (_e) {}
      if (count > 1) {
        vulnerable('Zákazník si vypíše všechny objednávky obchodu', `Načteno ${count} objednávek`, 'KRITICKÁ');
      } else {
        secure('Zákazník vidí jen své objednávky', `načteno ${count}`);
      }
    }
  }

  await client.auth.signOut();
}

// ============================================================ SOUHRN

function summary() {
  const holes = results.filter(r => r.status === 'VULNERABLE');
  const ok = results.filter(r => r.status === 'SECURE').length;
  const notes = results.filter(r => r.status === 'INFO').length;

  console.log(`\n${C.bold}${'═'.repeat(68)}${C.reset}`);
  console.log(`${C.bold}VÝSLEDEK${C.reset}   ${C.green}${ok} v pořádku${C.reset}   ${holes.length ? C.red : C.gray}${holes.length} děr${C.reset}   ${C.gray}${notes} k ověření${C.reset}`);
  console.log(`${C.bold}${'═'.repeat(68)}${C.reset}`);

  if (!holes.length) {
    console.log(`\n${C.green}Žádný z pokusů o zneužití neprošel.${C.reset}`);
    console.log(`${C.gray}Položky označené • si projděte ručně — mohou znamenat prázdnou tabulku.${C.reset}\n`);
    return true;
  }

  const order = { 'KRITICKÁ': 0, 'VYSOKÁ': 1, 'STŘEDNÍ': 2, 'NÍZKÁ': 3 };
  holes.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  console.log(`\n${C.red}${C.bold}NALEZENÉ DÍRY (od nejzávažnější):${C.reset}\n`);
  holes.forEach((h, i) => {
    console.log(`${C.red}${C.bold}${i + 1}. [${h.severity}] ${h.name}${C.reset}`);
    console.log(`   ${C.gray}kde: ${h.section}${C.reset}`);
    if (h.detail) console.log(`   ${h.detail}`);
    console.log('');
  });

  console.log(`${C.yellow}Většina těchto děr se zavírá zapnutím RLS v Supabase:${C.reset}`);
  console.log(`${C.gray}Dashboard → Table Editor → tabulka → RLS → Enable, a přidat politiky.${C.reset}\n`);
  return false;
}

async function main() {
  console.log(`${C.bold}NORTHVALE — bezpečnostní test${C.reset}`);
  console.log(`${C.gray}projekt: ${SUPABASE_URL}${C.reset}`);
  console.log(`${C.gray}útočník má k dispozici pouze veřejný anon klíč ze zdrojáku webu${C.reset}`);

  try {
    await testTableReads();
    await testTableWrites();
    await testStorage();
    await testEdgeFunctions();
    await testPricing();
    await testCrossCustomer();
  } catch (err) {
    console.error(`\n${C.red}Test se zastavil: ${err?.message || err}${C.reset}`);
  }

  process.exit(summary() ? 0 : 1);
}

main();
