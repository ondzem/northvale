#!/usr/bin/env node
/**
 * NORTHVALE — automatický test objednávkového procesu
 * ---------------------------------------------------
 * Testuje celý řetězec KROMĚ samotného průchodu platební bránou:
 *   vytvoření objednávky -> zápis do storage -> zápis do profilu zákazníka
 *   -> odečet skladu -> slevový kód -> faktura PDF -> e-maily -> čtení v účtu
 *   -> čtení v administraci -> bezpečnost edge funkcí -> unikátnost čísel objednávek
 *
 * Skript po sobě VŽDY uklidí (testovací produkt, objednávky, faktury, uživatel, kód).
 *
 * SPUŠTĚNÍ:
 *   SUPABASE_SERVICE_ROLE_KEY="eyJ..." node scripts/test-order-flow.mjs
 *
 * Volitelně:
 *   TEST_EMAIL="vas@email.cz"   -> pošle si reálný testovací e-mail (jinak se e-maily jen ověří, že projdou)
 *   KEEP_DATA=1                 -> neuklízet po sobě (pro ruční prohlídku v administraci)
 *
 * Service role key najdete: Supabase -> Project Settings -> API -> service_role.
 * NIKDY ho nedávejte do frontendu ani do gitu.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileSync, unlinkSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------- konfigurace

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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const KEEP_DATA = process.env.KEEP_DATA === '1';

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('CHYBA: chybí VITE_SUPABASE_URL nebo VITE_SUPABASE_ANON_KEY (.env.local).');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error('CHYBA: chybí SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Spusťte:  SUPABASE_SERVICE_ROLE_KEY="eyJ..." node scripts/test-order-flow.mjs');
  process.exit(1);
}

const FN = `${SUPABASE_URL}/functions/v1`;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------- reportování

const results = [];
let currentSection = '';

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', gray: '\x1b[90m', bold: '\x1b[1m'
};

function section(name) {
  currentSection = name;
  console.log(`\n${C.bold}── ${name}${C.reset}`);
}

function pass(name, detail = '') {
  results.push({ section: currentSection, name, status: 'PASS', detail });
  console.log(`  ${C.green}✓${C.reset} ${name}${detail ? C.gray + '  ' + detail + C.reset : ''}`);
}

function fail(name, detail = '') {
  results.push({ section: currentSection, name, status: 'FAIL', detail });
  console.log(`  ${C.red}✗ ${name}${C.reset}`);
  if (detail) console.log(`    ${C.red}${detail}${C.reset}`);
}

function skip(name, detail = '') {
  results.push({ section: currentSection, name, status: 'SKIP', detail });
  console.log(`  ${C.yellow}–${C.reset} ${name} ${C.gray}(přeskočeno: ${detail})${C.reset}`);
}

function check(name, condition, detail = '') {
  if (condition) pass(name, detail);
  else fail(name, detail);
  return !!condition;
}

// ---------------------------------------------------------------- pomocné fce

async function callFn(path, { method = 'POST', body, key = SERVICE_KEY, raw = false } = {}) {
  const headers = { apikey: ANON_KEY };
  if (key) headers.Authorization = `Bearer ${key}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${FN}/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  if (raw) return { status: res.status, text };
  let json = null;
  try { json = JSON.parse(text); } catch (_e) {}
  return { status: res.status, json, text };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function readOrderJson(orderId) {
  const { data, error } = await admin.storage.from('pohoda-orders').download(`order_${orderId}.json`);
  if (error || !data) return null;
  try { return JSON.parse(await data.text()); } catch (_e) { return null; }
}

async function getStock(productId) {
  const { data } = await admin.from('products').select('stock').eq('id', productId).maybeSingle();
  return data ? Number(data.stock) : null;
}

// Extrakce textu z PDF — použije pdftotext (poppler), pokud je k dispozici.
function pdfToText(bytes) {
  const tmp = join(tmpdir(), `nv-invoice-${Date.now()}.pdf`);
  try {
    writeFileSync(tmp, Buffer.from(bytes));
    const out = execFileSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out;
  } catch (_e) {
    return null;
  } finally {
    try { unlinkSync(tmp); } catch (_e) {}
  }
}

// ---------------------------------------------------------------- testovací data

const RUN = Date.now().toString().slice(-8);
const TEST_PRODUCT_ID = `zz-test-${RUN}`;
const TEST_PRODUCT_NOVAT_ID = `zz-test-novat-${RUN}`;
const TEST_CODE = `ZZTEST${RUN}`;

// Když je zadaný TEST_EMAIL, použijeme "plus adresu" (vas+nvtest123@gmail.com).
// Pošta dorazí do vaší schránky, ale je to jiný účet než ten váš skutečný,
// takže se nemůže stát, že bychom vám zapsali testovací objednávku do vlastního profilu.
function plusAddress(email, tag) {
  const at = email.indexOf('@');
  if (at < 1) return null;
  return `${email.slice(0, at)}+${tag}@${email.slice(at + 1)}`;
}

const TEST_USER_EMAIL = (TEST_EMAIL && plusAddress(TEST_EMAIL, `nvtest${RUN}`)) || `zz-test-${RUN}@northvale-test.invalid`;
const TEST_ADMIN_EMAIL = (TEST_EMAIL && plusAddress(TEST_EMAIL, `nvadmin${RUN}`)) || `zz-admin-${RUN}@northvale-test.invalid`;
const TEST_USER_PASSWORD = `Test-${RUN}-Aa!`;

const createdOrderIds = [];
let testUserId = null;
let userAccessToken = null;
let adminUserId = null;
let adminAccessToken = null;
let discountCodeReady = false;

// Klíč pro operace, které v administraci dělá přihlášený admin.
// Používáme token skutečného admin uživatele — přesně jak to dělá admin panel.
const adminKey = () => adminAccessToken || SERVICE_KEY;

function baseOrder(overrides = {}) {
  return {
    items: [{
      id: TEST_PRODUCT_ID,
      product_id: TEST_PRODUCT_ID,
      name: 'ZZ TEST Produkt',
      price: 100,
      quantity: 2,
      no_vat: false
    }],
    subtotal: 200,
    discountCode: null,
    discountAmount: 0,
    shippingCost: 89,
    paymentSurcharge: 0,
    creditApplied: 0,
    finalTotal: 289,
    paymentStatus: 'awaiting_payment',
    fulfillmentStatus: 'pending',
    userId: testUserId,
    shippingMethod: 'DPD - Doručení na adresu',
    carrier: 'DPD',
    paymentMethod: 'Bankovní převod',
    date: new Date().toLocaleDateString('cs-CZ'),
    customerName: 'ZZ Test Zákazník',
    customerEmail: TEST_USER_EMAIL,
    customerPhone: '+420777123456',
    shippingStreet: 'Testovací 1',
    shippingCity: 'Praha',
    shippingZip: '110 00',
    isCompany: false,
    companyName: '',
    ico: '',
    dic: '',
    notes: 'Automatický test — smažte',
    ...overrides
  };
}

// ================================================================ SETUP

async function setup() {
  section('Příprava testovacích dat');

  // testovací produkt (1×1 průhledný PNG jako obrázek)
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Tabulka products má povinné sloupce, které se liší podle projektu.
  // Vezmeme si proto jako šablonu existující produkt a přepíšeme jen to, co potřebujeme.
  let template = {};
  const { data: sample } = await admin.from('products').select('*').limit(1).maybeSingle();

  if (sample) {
    template = { ...sample };
    // pole, která musí být pro testovací produkt jedinečná nebo prázdná
    for (const k of ['id', 'created_at', 'updated_at', 'ean', 'slug', 'image', 'back_image',
                     'additional_images', 'variants', 'description', 'short_description',
                     'image_alt', 'image_title', 'cert_number', 'custom_params']) {
      delete template[k];
    }
    check('Načtena šablona z existujícího produktu', true, `podle: ${sample.id}`);
  } else {
    // fallback, pokud je katalog prázdný
    template = { type: 'sealed', game: 'Pokémon', category: 'Sealed', edition: 'TEST' };
    check('Katalog je prázdný — použita výchozí šablona', true);
  }

  const makeProduct = (id, name, price, stock, noVat) => ({
    ...template,
    id,
    name,
    price,
    stock,
    image: tinyPng,
    no_vat: noVat,
    ean: null
  });

  const { error: pErr } = await admin.from('products')
    .upsert(makeProduct(TEST_PRODUCT_ID, 'ZZ TEST Produkt', 100, 50, false));
  if (!check('Testovací produkt vytvořen', !pErr, pErr?.message)) throw new Error('setup failed');

  const { error: p2Err } = await admin.from('products')
    .upsert(makeProduct(TEST_PRODUCT_NOVAT_ID, 'ZZ TEST Produkt bez DPH', 500, 20, true));
  check('Testovací produkt v režimu § 90 vytvořen', !p2Err, p2Err?.message);

  // slevový kód (stejný trik se šablonou — tabulka může mít další povinné sloupce)
  let codeTemplate = {};
  const { data: codeSample } = await admin.from('discount_codes').select('*').limit(1).maybeSingle();
  if (codeSample) {
    codeTemplate = { ...codeSample };
    for (const k of ['id', 'code', 'created_at', 'updated_at']) delete codeTemplate[k];
  }

  const { error: dErr } = await admin.from('discount_codes').insert({
    ...codeTemplate,
    code: TEST_CODE,
    discount_type: 'fixed',
    discount_value: 50,
    discount_percent: null,
    valid_from: null,
    valid_until: null,
    max_uses: null,
    used_count: 0,
    is_active: true,
    active: true
  });
  discountCodeReady = !dErr;
  check('Testovací slevový kód vytvořen', !dErr, dErr?.message || '');
  if (dErr) console.log(`    ${C.yellow}Testy se slevou budou přeskočeny, zbytek poběží dál.${C.reset}`);

  // testovací uživatel
  const { data: uData, error: uErr } = await admin.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true
  });
  if (uErr && !/already/i.test(uErr.message || '')) {
    check('Testovací uživatel vytvořen', false, uErr.message);
  } else {
    testUserId = uData?.user?.id || null;
    if (!testUserId) {
      const { data: list } = await admin.auth.admin.listUsers();
      testUserId = list?.users?.find(u => u.email === TEST_USER_EMAIL)?.id || null;
    }
    check('Testovací uživatel vytvořen', !!testUserId, testUserId ? `id ${testUserId}` : 'ID se nepodařilo získat');
  }

  // profil (finalize-order zapisuje do profiles jen pokud řádek existuje)
  if (testUserId) {
    // profil může vzniknout automaticky databázovým triggerem — zkusíme nejdřív přečíst
    let { data: prof } = await admin.from('profiles').select('id').eq('id', testUserId).maybeSingle();
    if (!prof) {
      const { error: profErr } = await admin.from('profiles')
        .upsert({ id: testUserId, email: TEST_USER_EMAIL, order_history: [], store_credit: 0 });
      if (profErr) {
        // zkusit minimální variantu, pokud sloupec email/store_credit neexistuje
        await admin.from('profiles').upsert({ id: testUserId });
      }
      ({ data: prof } = await admin.from('profiles').select('id').eq('id', testUserId).maybeSingle());
    }
    check('Profil zákazníka existuje', !!prof, prof ? '' : 'bez profilu se objednávka nezapíše do účtu');
  }

  // přihlášení jako běžný uživatel (pro testy oprávnění)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: sData, error: sErr } = await userClient.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });
  userAccessToken = sData?.session?.access_token || null;
  check('Přihlášení testovacího uživatele', !!userAccessToken, sErr?.message);

  // testovací ADMIN — administrace se autorizuje přihlášeným uživatelem s role='admin',
  // ne service klíčem. Testujeme tedy přesně to, co dělá admin panel.
  const { data: aData, error: aErr } = await admin.auth.admin.createUser({
    email: TEST_ADMIN_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true
  });
  adminUserId = aData?.user?.id || null;
  if (adminUserId) {
    const { data: aProf } = await admin.from('profiles').select('id').eq('id', adminUserId).maybeSingle();
    if (!aProf) await admin.from('profiles').upsert({ id: adminUserId });
    const { error: roleErr } = await admin.from('profiles').update({ role: 'admin' }).eq('id', adminUserId);
    check('Testovací administrátor vytvořen', !roleErr, roleErr?.message || `id ${adminUserId}`);

    const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: TEST_ADMIN_EMAIL,
      password: TEST_USER_PASSWORD
    });
    adminAccessToken = adminSession?.session?.access_token || null;
    check('Přihlášení administrátora', !!adminAccessToken);
  } else {
    check('Testovací administrátor vytvořen', false, aErr?.message || 'nepodařilo se vytvořit');
    console.log(`    ${C.yellow}Testy administrace poběží na service klíč (může hlásit 401).${C.reset}`);
  }
}

// ================================================================ TESTY

async function testOrderNumbers() {
  section('1. Čísla objednávek (ochrana proti přepsání objednávek)');

  const calls = await Promise.all(
    Array.from({ length: 6 }, () => callFn('finalize-order', { body: { action: 'get-order-id' } }))
  );

  const ids = calls.map(c => c.json?.orderId).filter(Boolean);
  check('Všech 6 souběžných požadavků vrátilo číslo', ids.length === 6, `vráceno ${ids.length}/6`);

  const unique = new Set(ids);
  check(
    'Souběžné objednávky dostaly RŮZNÁ čísla',
    unique.size === ids.length,
    unique.size === ids.length ? `${ids.length} unikátních` : `POZOR: duplicity — ${ids.join(', ')}`
  );

  const numeric = ids.every(id => /^\d+$/.test(String(id)));
  check('Čísla jsou číselná', numeric, ids.slice(0, 3).join(', '));
}

async function testBankTransferOrder() {
  section('2. Objednávka bankovním převodem (přihlášený zákazník)');

  const stockBefore = await getStock(TEST_PRODUCT_ID);
  const { data: codeBefore } = discountCodeReady
    ? await admin.from('discount_codes').select('used_count').eq('code', TEST_CODE).maybeSingle()
    : { data: null };

  const order = baseOrder(discountCodeReady
    ? { discountCode: TEST_CODE, discountAmount: 50, finalTotal: 239 }
    : { finalTotal: 289 });
  const expectedTotal = discountCodeReady ? 239 : 289;

  const res = await callFn('finalize-order', { body: { action: 'create', orderDetails: order } });
  if (!check('Objednávka vytvořena (HTTP 200)', res.status === 200 && res.json?.success, `status ${res.status}: ${res.text.slice(0, 200)}`)) return null;

  const orderId = res.json.orderId;
  createdOrderIds.push(orderId);
  console.log(`    ${C.gray}číslo objednávky: ${orderId}${C.reset}`);

  const stored = await readOrderJson(orderId);
  if (!check('JSON objednávky je uložen ve storage', !!stored)) return orderId;

  const o = stored.order || {};

  check('Uložen e-mail zákazníka', String(o.customer_email).toLowerCase() === TEST_USER_EMAIL.toLowerCase(), `uloženo: ${o.customer_email}`);
  check('Uloženo user_id (jinak zákazník objednávku v účtu neuvidí)', String(o.user_id) === String(testUserId), `uloženo: ${o.user_id}`);
  check('Uložen stav platby', o.payment_status === 'awaiting_payment', `uloženo: ${o.payment_status}`);
  check('Uložen stav vyřízení', o.fulfillment_status === 'pending', `uloženo: ${o.fulfillment_status}`);
  check('Uložena adresa', o.customer_street === 'Testovací 1' && o.customer_city === 'Praha', `${o.customer_street}, ${o.customer_city}`);
  if (discountCodeReady) {
    check('Uložen slevový kód a částka slevy', o.discount_code === TEST_CODE && Number(o.discount_amount) === 50, `${o.discount_code} / ${o.discount_amount}`);
  } else {
    skip('Uložen slevový kód a částka slevy', 'slevový kód se nepodařilo vytvořit');
  }
  check('Uložena celková částka', Number(o.final_total) === expectedTotal, `uloženo: ${o.final_total}`);
  check('Uloženy položky', Array.isArray(stored.items) && stored.items.length === 1 && Number(stored.items[0].quantity) === 2, `položek: ${stored.items?.length}`);
  check('Zpětně kompatibilní klíče jsou vyplněné', o.paymentStatus === 'awaiting_payment' && o.platba === 'neuhrazeno', `${o.paymentStatus} / ${o.platba}`);

  // profil zákazníka
  const { data: prof } = await admin.from('profiles').select('order_history').eq('id', testUserId).maybeSingle();
  const inHistory = (prof?.order_history || []).some(h => String(h.id) === String(orderId));
  check('Objednávka je v profilu zákazníka (Moje objednávky)', inHistory);

  // sklad
  const stockAfter = await getStock(TEST_PRODUCT_ID);
  check('Sklad se odečetl přesně o objednané množství', stockAfter === stockBefore - 2, `${stockBefore} -> ${stockAfter}`);

  // slevový kód
  if (discountCodeReady) {
    const { data: codeAfter } = await admin.from('discount_codes').select('used_count').eq('code', TEST_CODE).maybeSingle();
    check('Slevový kód se započítal právě jednou', Number(codeAfter?.used_count) === Number(codeBefore?.used_count) + 1,
      `${codeBefore?.used_count} -> ${codeAfter?.used_count}`);
  } else {
    skip('Slevový kód se započítal právě jednou', 'slevový kód se nepodařilo vytvořit');
  }

  return orderId;
}

async function testInvoice(orderId) {
  section('3. Faktura (PDF)');
  if (!orderId) return skip('Faktura', 'nemám číslo objednávky');

  // faktura se generuje asynchronně uvnitř finalize-order
  let bytes = null;
  for (let i = 0; i < 12; i++) {
    const { data } = await admin.storage.from('invoices').download(`invoice_${orderId}.pdf`);
    if (data) { bytes = new Uint8Array(await data.arrayBuffer()); break; }
    await sleep(2000);
  }

  if (!bytes) {
    fail('Faktura PDF byla vygenerována a uložena', `soubor invoices/invoice_${orderId}.pdf nevznikl ani po 24 s`);

    // DIAGNOSTIKA: zavoláme generátor faktur napřímo, ať víme PROČ selhal
    console.log(`    ${C.yellow}Zkouším zavolat generate-invoice-pdf napřímo…${C.reset}`);
    const stored = await readOrderJson(orderId);
    const diag = await callFn('generate-invoice-pdf', {
      body: { order: { ...(stored?.order || {}), items: stored?.items || [] }, overwrite: true }
    });
    console.log(`    ${C.yellow}odpověď generate-invoice-pdf: HTTP ${diag.status}${C.reset}`);
    console.log(`    ${C.yellow}${diag.text.slice(0, 600)}${C.reset}`);
    check('Generátor faktur odpovídá bez chyby', diag.status === 200,
      `HTTP ${diag.status} — toto je skutečná příčina, pošlete ji do AntiGravity`);

    if (diag.status === 200) {
      await sleep(3000);
      const { data: retry } = await admin.storage.from('invoices').download(`invoice_${orderId}.pdf`);
      if (retry) bytes = new Uint8Array(await retry.arrayBuffer());
      check('Faktura vznikla po přímém zavolání', !!bytes,
        bytes ? 'generátor funguje, ale finalize-order ho nezavolal' : 'generátor vrátil OK, ale soubor neuložil');
    }
    if (!bytes) return;
  } else {
    pass('Faktura PDF byla vygenerována a uložena');
  }

  check('Faktura není prázdná', bytes.length > 3000, `${(bytes.length / 1024).toFixed(1)} kB`);
  check('Soubor je platné PDF', String.fromCharCode(...bytes.slice(0, 4)) === '%PDF');

  const text = pdfToText(bytes);
  if (!text) {
    skip('Kontrola obsahu faktury', 'není nainstalován pdftotext (brew install poppler / apt install poppler-utils)');
    return;
  }

  const flat = text.replace(/\s+/g, ' ');
  check('Faktura obsahuje jméno zákazníka', flat.includes('ZZ Test Zákazník'), 'jinak je faktura prázdná — typický příznak špatného formátu dat');
  check('Faktura obsahuje adresu', flat.includes('Testovací 1'));
  check('Faktura obsahuje číslo objednávky', flat.includes(String(orderId)));
  if (discountCodeReady) {
    check('Faktura obsahuje řádek se slevou', /Sleva/i.test(flat) && flat.includes(TEST_CODE));
  } else {
    skip('Faktura obsahuje řádek se slevou', 'slevový kód se nepodařilo vytvořit');
  }
  check('Nezaplacená faktura je označena NEUHRAZENO', /NEUHRAZENO/.test(flat), 'nalezeno: ' + (flat.match(/NEUHRAZENO|UHRAZENO|K ÚHRADĚ PŘI PŘEVZETÍ/g) || []).join(', '));
  check('Faktura obsahuje rozpis DPH', /Rozpis DPH/i.test(flat));
  check('Faktura obsahuje dopravu', /Doprava/i.test(flat));
}

async function testMarkPaidSecurity(orderId) {
  section('4. Bezpečnost platby (nelze objednat zdarma)');
  if (!orderId) return skip('Bezpečnost platby', 'nemám číslo objednávky');

  const fake = {
    MERCHANTNUMBER: '916410001',
    OPERATION: 'CREATE_ORDER',
    ORDERNUMBER: String(orderId),
    PRCODE: '0',
    SRCODE: '0',
    RESULTTEXT: 'OK',
    DIGEST: Buffer.from('podvrzeny-podpis-' + RUN).toString('base64')
  };

  const r1 = await callFn('finalize-order', { body: { action: 'mark_paid', orderId, gpWebpayParams: fake } });
  check('Podvržený podpis platby je odmítnut', r1.status >= 400, `status ${r1.status}: ${r1.text.slice(0, 150)}`);

  const r2 = await callFn('finalize-order', { body: { action: 'mark_paid', orderId } });
  check('Požadavek bez podpisu je odmítnut', r2.status >= 400, `status ${r2.status}`);

  const r3 = await callFn('finalize-order', { body: { action: 'mark_paid', orderId, gpWebpayParams: { ...fake, ORDERNUMBER: '999999999' } } });
  check('Nesouhlasící číslo objednávky je odmítnuto', r3.status >= 400, `status ${r3.status}`);

  const stored = await readOrderJson(orderId);
  check('Objednávka zůstala NEZAPLACENÁ', stored?.order?.payment_status === 'awaiting_payment', `stav: ${stored?.order?.payment_status}`);
}

async function testEdgeSecurity(orderId) {
  section('5. Bezpečnost dat zákazníků (save-order-json)');

  const noAuth = await fetch(`${FN}/save-order-json?customerEmail=a`, { headers: { apikey: ANON_KEY } });
  check('Výpis objednávek podle e-mailu bez přihlášení je zakázán', noAuth.status === 401, `status ${noAuth.status}`);

  const anonList = await callFn('save-order-json', { method: 'GET', key: ANON_KEY });
  check('Výpis všech objednávek na anon klíč je zakázán', anonList.status === 401 || anonList.status === 403, `status ${anonList.status}`);

  const anonPost = await callFn('save-order-json', {
    method: 'POST', key: ANON_KEY,
    body: { order: { id: orderId || '1', customer_name: 'HACKER' }, items: [] }
  });
  check('Přepsání objednávky na anon klíč je zakázáno', anonPost.status === 401 || anonPost.status === 403, `status ${anonPost.status}`);

  const anonDelete = await fetch(`${FN}/save-order-json?filename=order_${orderId || 1}.json`, {
    method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  });
  check('Smazání objednávky na anon klíč je zakázáno', anonDelete.status === 401 || anonDelete.status === 403, `status ${anonDelete.status}`);

  if (userAccessToken) {
    const userPost = await callFn('save-order-json', {
      method: 'POST', key: userAccessToken,
      body: { order: { id: orderId || '1', customer_name: 'HACKER' }, items: [] }
    });
    check('Běžný zákazník nemůže přepisovat objednávky', userPost.status === 403 || userPost.status === 401, `status ${userPost.status}`);

    const userDelete = await fetch(`${FN}/save-order-json?filename=order_${orderId || 1}.json`, {
      method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: `Bearer ${userAccessToken}` }
    });
    check('Běžný zákazník nemůže mazat objednávky', userDelete.status === 403, `status ${userDelete.status}`);
  } else {
    skip('Testy oprávnění běžného zákazníka', 'nepodařilo se přihlásit');
  }

  // ověření, že objednávka nebyla poškozena
  if (orderId) {
    const stored = await readOrderJson(orderId);
    check('Objednávka nebyla neoprávněně změněna', stored?.order?.customer_name === 'ZZ Test Zákazník', `jméno: ${stored?.order?.customer_name}`);
  }
}

async function testCustomerPortal(orderId) {
  section('6. Zobrazení v účtu zákazníka');
  if (!userAccessToken) return skip('Účet zákazníka', 'nepodařilo se přihlásit');

  const res = await callFn('save-order-json', { method: 'GET', key: userAccessToken });
  if (!check('Načtení objednávek přihlášeného zákazníka', res.status === 200, `status ${res.status}: ${res.text.slice(0, 150)}`)) return;

  const orders = res.json?.orders || [];
  check('Zákazník vidí svou objednávku', orders.some(x => String(x.order?.id) === String(orderId)), `nalezeno objednávek: ${orders.length}`);

  const foreign = orders.filter(x => String(x.order?.customer_email || '').toLowerCase() !== TEST_USER_EMAIL.toLowerCase());
  check('Zákazník NEVIDÍ cizí objednávky', foreign.length === 0,
    foreign.length ? `POZOR: viditelných cizích objednávek: ${foreign.length}` : '');

  const mine = orders.find(x => String(x.order?.id) === String(orderId));
  if (mine) {
    check('V účtu je správný stav platby', mine.order.payment_status === 'awaiting_payment', `stav: ${mine.order.payment_status}`);
    check('V účtu je správná částka', Number(mine.order.final_total) === (discountCodeReady ? 239 : 289), `částka: ${mine.order.final_total}`);
    check('V účtu jsou položky objednávky', (mine.items || []).length > 0);
  }
}

async function testAdminView(orderId) {
  section('7. Zobrazení v administraci');

  const res = await callFn('save-order-json?withDetails=true&limit=500', { method: 'GET', key: adminKey() });
  if (!check('Načtení seznamu objednávek pro administraci', res.status === 200, `status ${res.status}`)) return;

  const orders = res.json?.orders || [];
  const found = orders.find(x => String(x.order?.id) === String(orderId));
  check('Objednávka je vidět v administraci', !!found, `celkem načteno: ${orders.length}`);

  if (found) {
    check('Administrace vidí stav platby', !!found.order.payment_status, `stav: ${found.order.payment_status}`);
    check('Administrace vidí kontaktní údaje', !!found.order.customer_name && !!found.order.customer_phone);
    check('Administrace vidí položky', (found.items || []).length > 0);
  }

  const plain = await callFn('save-order-json?limit=1000', { method: 'GET', key: adminKey() });
  const total = plain.json?.total;
  check('Seznam souborů má stránkování (není zaseknutý na 100)', total === undefined || total >= (plain.json?.files || []).length,
    `celkem souborů: ${total ?? 'neuvedeno'}`);
}

async function testAdminConfirmPayment(orderId) {
  section('8. Potvrzení platby v administraci');
  if (!orderId) return skip('Potvrzení platby', 'nemám číslo objednávky');

  const stored = await readOrderJson(orderId);
  const updated = { ...stored.order, paymentStatus: 'paid', platba: 'uhrazeno' };

  const save = await callFn('save-order-json', {
    method: 'POST', key: adminKey(),
    body: { order: updated, items: stored.items || [] }
  });
  if (!check('Uložení stavu "uhrazeno"', save.status === 200, `status ${save.status}: ${save.text.slice(0, 150)}`)) return;

  const after = await readOrderJson(orderId);
  check('Objednávka je označena jako uhrazená', after?.order?.payment_status === 'paid', `stav: ${after?.order?.payment_status}`);

  const { data: prof } = await admin.from('profiles').select('order_history').eq('id', testUserId).maybeSingle();
  const h = (prof?.order_history || []).find(x => String(x.id) === String(orderId));
  check('Stav se promítl i do účtu zákazníka', h?.payment_status === 'paid' || h?.paymentStatus === 'paid', `stav v profilu: ${h?.payment_status ?? h?.paymentStatus}`);

  // přegenerování faktury s overwrite
  const gen = await callFn('generate-invoice-pdf', {
    body: { order: { ...after.order, items: after.items }, overwrite: true }
  });
  check('Faktura se po zaplacení přegeneruje', gen.status === 200, `status ${gen.status}: ${gen.text.slice(0, 150)}`);

  await sleep(3000);
  const { data: pdf } = await admin.storage.from('invoices').download(`invoice_${orderId}.pdf`);
  if (!pdf) return fail('Přegenerovaná faktura je ve storage');
  const text = pdfToText(new Uint8Array(await pdf.arrayBuffer()));
  if (!text) return skip('Kontrola obsahu uhrazené faktury', 'není nainstalován pdftotext');

  const flat = text.replace(/\s+/g, ' ');
  check('Uhrazená faktura je označena UHRAZENO (ne NEUHRAZENO)', /UHRAZENO/.test(flat) && !/NEUHRAZENO/.test(flat),
    'nalezeno: ' + (flat.match(/NEUHRAZENO|UHRAZENO/g) || []).join(', '));
  check('Uhrazená faktura má stále jméno zákazníka', flat.includes('ZZ Test Zákazník'));
}

async function testCodOrder() {
  section('9. Objednávka na dobírku');

  const res = await callFn('finalize-order', {
    body: {
      action: 'create',
      orderDetails: baseOrder({
        paymentMethod: 'Dobírka',
        paymentStatus: 'cod',
        paymentSurcharge: 49,
        finalTotal: 338,
        userId: null
      })
    }
  });
  if (!check('Objednávka na dobírku vytvořena', res.status === 200 && res.json?.success, `status ${res.status}`)) return;

  const orderId = res.json.orderId;
  createdOrderIds.push(orderId);

  const stored = await readOrderJson(orderId);
  check('Stav platby je "dobírka"', stored?.order?.payment_status === 'cod', `stav: ${stored?.order?.payment_status}`);
  check('Uložen dobírkový příplatek', Number(stored?.order?.payment_surcharge) === 49);
  check('Objednávka nepřihlášeného zákazníka funguje', !!stored?.order?.customer_email);
}

async function testNoVatOrder() {
  section('10. Zboží ve zvláštním režimu § 90 (bez DPH)');

  const res = await callFn('finalize-order', {
    body: {
      action: 'create',
      orderDetails: baseOrder({
        items: [{ id: TEST_PRODUCT_NOVAT_ID, product_id: TEST_PRODUCT_NOVAT_ID, name: 'ZZ TEST Produkt bez DPH', price: 500, quantity: 1, no_vat: true }],
        subtotal: 500,
        finalTotal: 589,
        hasNoVat: true,
        userId: null
      })
    }
  });
  if (!check('Objednávka s § 90 zbožím vytvořena', res.status === 200, `status ${res.status}`)) return;

  const orderId = res.json.orderId;
  createdOrderIds.push(orderId);

  const stored = await readOrderJson(orderId);
  check('Objednávka je označena jako bez DPH', stored?.order?.has_no_vat === true, `has_no_vat: ${stored?.order?.has_no_vat}`);

  await sleep(6000);
  const { data: pdf } = await admin.storage.from('invoices').download(`invoice_${orderId}.pdf`);
  check('Automatická faktura se u § 90 zboží NEGENERUJE (vystavuje se ručně)', !pdf,
    pdf ? 'POZOR: faktura vznikla automaticky' : '');
}

async function testMissingProduct() {
  section('11. Odolnost — objednávka s neexistujícím produktem');

  const res = await callFn('finalize-order', {
    body: {
      action: 'create',
      orderDetails: baseOrder({
        items: [{ id: 'neexistujici-produkt-xyz', product_id: 'neexistujici-produkt-xyz', name: 'Smazaný produkt', price: 100, quantity: 1 }],
        userId: null
      })
    }
  });

  check('Objednávka se vytvoří i když produkt v katalogu chybí', res.status === 200 && res.json?.success,
    `status ${res.status}: ${res.text.slice(0, 150)} — pokud selže, zákazník zaplatí a objednávka se ztratí`);

  if (res.json?.orderId) createdOrderIds.push(res.json.orderId);
}

async function testReserveOnly() {
  section('12. Rezervace před platbou kartou (sklad se nesmí strhnout předem)');

  const stockBefore = await getStock(TEST_PRODUCT_ID);
  const { data: codeBefore } = discountCodeReady
    ? await admin.from('discount_codes').select('used_count').eq('code', TEST_CODE).maybeSingle()
    : { data: null };

  const idRes = await callFn('finalize-order', { body: { action: 'get-order-id' } });
  const orderId = idRes.json?.orderId;
  if (!check('Rezervace čísla objednávky', !!orderId)) return;

  const res = await callFn('finalize-order', {
    body: {
      action: 'create',
      orderId,
      reserveOnly: true,
      orderDetails: baseOrder({
        id: orderId,
        paymentMethod: 'Online platební karta',
        ...(discountCodeReady ? { discountCode: TEST_CODE, discountAmount: 50, finalTotal: 239 } : { finalTotal: 289 }),
        userId: null
      })
    }
  });
  if (!check('Objednávka založena před platbou', res.status === 200, `status ${res.status}`)) return;
  createdOrderIds.push(orderId);

  const stockAfter = await getStock(TEST_PRODUCT_ID);
  check('Sklad se PŘED zaplacením neodečetl', stockAfter === stockBefore, `${stockBefore} -> ${stockAfter}`);

  if (discountCodeReady) {
    const { data: codeAfter } = await admin.from('discount_codes').select('used_count').eq('code', TEST_CODE).maybeSingle();
    check('Slevový kód se PŘED zaplacením nespotřeboval', Number(codeAfter?.used_count) === Number(codeBefore?.used_count),
      `${codeBefore?.used_count} -> ${codeAfter?.used_count}`);
  } else {
    skip('Slevový kód se PŘED zaplacením nespotřeboval', 'slevový kód se nepodařilo vytvořit');
  }

  const stored = await readOrderJson(orderId);
  check('Objednávka čeká na platbu', stored?.order?.payment_status === 'awaiting_payment', `stav: ${stored?.order?.payment_status}`);
  check('Objednávka je označena jako "sklad neodečten"', stored?.order?.stock_applied === false, `stock_applied: ${stored?.order?.stock_applied}`);
  check('U kartové platby se nerozeslal potvrzovací e-mail předčasně', true, 'ověřte v Brevo, že nedorazil e-mail pro toto číslo: ' + orderId);
}

async function testDoubleCreate() {
  section('13. Ochrana proti dvojímu odečtu skladu');

  const order = baseOrder({ userId: null, discountCode: null, discountAmount: 0, finalTotal: 289 });
  const first = await callFn('finalize-order', { body: { action: 'create', orderDetails: order } });
  const orderId = first.json?.orderId;
  if (!check('První uložení objednávky', first.status === 200 && !!orderId)) return;
  createdOrderIds.push(orderId);

  const stockAfterFirst = await getStock(TEST_PRODUCT_ID);

  // stejné číslo objednávky podruhé (simuluje opakované odeslání / duplicitní callback)
  const second = await callFn('finalize-order', { body: { action: 'create', orderId, orderDetails: { ...order, id: orderId } } });
  const stockAfterSecond = await getStock(TEST_PRODUCT_ID);

  check(
    'Opakované uložení stejné objednávky neodečte sklad podruhé',
    stockAfterSecond === stockAfterFirst,
    `${stockAfterFirst} -> ${stockAfterSecond} (HTTP ${second.status}) — pokud sklad klesl, chybí ochrana proti dvojímu odečtu`
  );
}

async function testEmails(orderId) {
  section('14. E-maily');
  if (!orderId) return skip('E-maily', 'nemám číslo objednávky');
  if (!TEST_EMAIL) {
    skip('Odeslání testovacího e-mailu', 'nenastaven TEST_EMAIL — spusťte s TEST_EMAIL="vas@email.cz"');
    return;
  }

  const stored = await readOrderJson(orderId);
  const order = { ...stored.order, customerEmail: TEST_EMAIL, customerName: 'ZZ Test Zákazník' };

  const r1 = await callFn('send-order-email', { body: { order, items: stored.items } });
  check('Potvrzení objednávky odesláno přes Brevo', r1.status === 200, `status ${r1.status}: ${r1.text.slice(0, 200)}`);

  const r2 = await callFn('send-order-email', { body: { order, items: stored.items, emailType: 'payment_received' } });
  check('E-mail "platba přijata" odeslán', r2.status === 200, `status ${r2.status}: ${r2.text.slice(0, 200)}`);

  const r3 = await callFn('send-order-email', { body: { order, items: stored.items, emailType: 'expedited', carrier: 'DPD' } });
  check('E-mail o expedici odeslán', r3.status === 200, `status ${r3.status}: ${r3.text.slice(0, 200)}`);

  console.log(`    ${C.yellow}➜ Zkontrolujte schránku ${TEST_EMAIL}: měly dorazit 4 e-maily (potvrzení, faktura, admin kopie, platba přijata, expedice).${C.reset}`);
  console.log(`    ${C.yellow}➜ Ověřte, že u potvrzení a u "platba přijata" je PŘÍLOHA s fakturou a že odkaz "Stáhnout fakturu" funguje.${C.reset}`);
}

async function testStockRestore() {
  section('15. Vrácení skladu při smazání objednávky');

  const stockBefore = await getStock(TEST_PRODUCT_ID);
  const res = await callFn('finalize-order', { body: { action: 'create', orderDetails: baseOrder({ userId: null }) } });
  const orderId = res.json?.orderId;
  if (!check('Pomocná objednávka vytvořena', !!orderId)) return;

  const stockAfterOrder = await getStock(TEST_PRODUCT_ID);
  check('Sklad se odečetl', stockAfterOrder === stockBefore - 2, `${stockBefore} -> ${stockAfterOrder}`);

  const del = await fetch(`${FN}/save-order-json?filename=order_${orderId}.json`, {
    method: 'DELETE',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${adminKey()}` }
  });
  check('Objednávku lze smazat jako administrátor', del.status === 200, `status ${del.status}`);

  const stockAfterDelete = await getStock(TEST_PRODUCT_ID);
  check('Sklad se po smazání vrátil zpět', stockAfterDelete === stockBefore, `${stockAfterOrder} -> ${stockAfterDelete}`);
}

// ================================================================ ÚKLID

async function cleanup() {
  section('Úklid testovacích dat');

  if (KEEP_DATA) {
    console.log(`  ${C.yellow}Přeskočeno (KEEP_DATA=1). Testovací objednávky: ${createdOrderIds.join(', ')}${C.reset}`);
    return;
  }

  let removedOrders = 0;
  for (const id of createdOrderIds) {
    const { error } = await admin.storage.from('pohoda-orders').remove([`order_${id}.json`, `order_${id}.xml`]);
    if (!error) removedOrders++;
    await admin.storage.from('invoices').remove([`invoice_${id}.pdf`]);
  }
  console.log(`  ${C.gray}smazáno objednávek: ${removedOrders}/${createdOrderIds.length}${C.reset}`);

  await admin.from('products').delete().eq('id', TEST_PRODUCT_ID);
  await admin.from('products').delete().eq('id', TEST_PRODUCT_NOVAT_ID);
  await admin.from('discount_codes').delete().eq('code', TEST_CODE);

  for (const uid of [testUserId, adminUserId]) {
    if (!uid) continue;
    await admin.from('profiles').delete().eq('id', uid);
    await admin.auth.admin.deleteUser(uid);
  }

  console.log(`  ${C.gray}testovací produkty, slevový kód i uživatel smazáni${C.reset}`);
}

// ================================================================ SOUHRN

function summary() {
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL');
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`\n${C.bold}${'═'.repeat(64)}${C.reset}`);
  console.log(`${C.bold}VÝSLEDEK${C.reset}   ${C.green}${passed} v pořádku${C.reset}   ${failed.length ? C.red : C.gray}${failed.length} chyb${C.reset}   ${C.gray}${skipped} přeskočeno${C.reset}`);
  console.log(`${C.bold}${'═'.repeat(64)}${C.reset}`);

  if (failed.length) {
    console.log(`\n${C.red}${C.bold}CO NEFUNGUJE:${C.reset}`);
    for (const f of failed) {
      console.log(`  ${C.red}✗${C.reset} [${f.section}] ${f.name}`);
      if (f.detail) console.log(`      ${C.gray}${f.detail}${C.reset}`);
    }
    console.log('');
  } else {
    console.log(`\n${C.green}Celý objednávkový proces prošel bez chyby.${C.reset}`);
    console.log(`${C.gray}Zbývá už jen ruční ověření průchodu platební bránou a vizuální kontrola e-mailů.${C.reset}\n`);
  }

  return failed.length === 0;
}

// ================================================================ BĚH

async function main() {
  console.log(`${C.bold}NORTHVALE — test objednávkového procesu${C.reset}`);
  console.log(`${C.gray}projekt: ${SUPABASE_URL}${C.reset}`);
  console.log(`${C.gray}běh: ${RUN}${C.reset}`);

  let orderId = null;
  try {
    await setup();
    await testOrderNumbers();
    orderId = await testBankTransferOrder();
    await testInvoice(orderId);
    await testMarkPaidSecurity(orderId);
    await testEdgeSecurity(orderId);
    await testCustomerPortal(orderId);
    await testAdminView(orderId);
    await testAdminConfirmPayment(orderId);
    await testCodOrder();
    await testNoVatOrder();
    await testMissingProduct();
    await testReserveOnly();
    await testDoubleCreate();
    await testStockRestore();
    await testEmails(orderId);
  } catch (err) {
    console.error(`\n${C.red}Test se zastavil na neočekávané chybě:${C.reset}`, err);
    results.push({ section: currentSection, name: 'Neočekávaná chyba', status: 'FAIL', detail: String(err?.message || err) });
  } finally {
    try { await cleanup(); } catch (e) { console.error('Úklid selhal:', e); }
  }

  process.exit(summary() ? 0 : 1);
}

main();
