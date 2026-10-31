/**
 * Sestavení XML feedů (Heureka, Zboží, Google, srovnávač).
 *
 * Jediný zdroj pravdy: používá ho build (scripts/generate-feeds.js) i edge
 * funkce product-feed, která feedy generuje živě. Čistý JS bez závislostí,
 * aby šel načíst v Node i v Deno.
 */

const SITE = 'https://northvaletcg.eu';
// Stejné hodnoty jako src/config.js (nejlevnější doprava, doprava zdarma).
const SHIPPING_FROM = 79;
const FREE_SHIPPING_FROM = 3500;

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(str) {
  if (!str) return '';
  // Strip HTML tags and replace multiple spaces/newlines with single space
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getBrand(game) {
  if (!game) return 'Northvale';
  const g = game.toLowerCase();
  if (g.includes('pokemon') || g.includes('pokémon')) return 'Pokémon';
  if (g.includes('lorcana')) return 'Disney Lorcana';
  if (g.includes('one-piece') || g.includes('one piece')) return 'One Piece';
  if (g.includes('riftbound')) return 'Riftbound';
  return 'Northvale';
}

/**
 * ITEM_ID pro Heureku/Zboží.cz smí mít nejvýše 36 znaků, takže delší ID se
 * zkracují. Zkrácení ale může u dvou produktů vyjít stejně — pak by srovnávač
 * považoval druhý produkt za ten první. Tady se hlídá, aby k tomu nedošlo:
 * kolidující ID dostane krátkou příponu odvozenou z celého původního ID.
 *
 * DŮLEŽITÉ: už jednou odeslané ID se nesmí měnit, jinak se produkt na Heurece
 * odpáruje a čeká se na nové spárování. Proto se přípona přidává výhradně
 * tomu produktu, který koliduje jako druhý v pořadí.
 */
function shortHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 4);
}

function makeFeedItemId(id, usedIds) {
  const full = String(id || '');
  let candidate = full.substring(0, 36);
  if (usedIds.has(candidate)) {
    const suffix = '-' + shortHash(full);
    candidate = full.substring(0, 36 - suffix.length) + suffix;
    let guard = 0;
    while (usedIds.has(candidate) && guard < 50) {
      candidate = full.substring(0, 35 - suffix.length) + guard + suffix;
      guard++;
    }
    console.warn(`ITEM_ID kolize po zkraceni: "${full}" -> "${candidate}"`);
  }
  usedIds.add(candidate);
  return candidate;
}

// Z dodací lhůty zboží na objednávku („3–7 dnů“) vytáhne nejvyšší počet dní.
function parseDeliveryDays(deliveryTime, fallback = 7) {
  const nums = String(deliveryTime || '').match(/\d+/g);
  if (!nums || nums.length === 0) return fallback;
  return Math.max(...nums.map(Number));
}

/** Test a neplatné položky do feedů nepatří. */
export function isFeedProduct(p) {
  if (p.id === 'POK-SV2-112') return false;
  if (p.name && p.name.toLowerCase().includes('testov')) return false;
  return true;
}

/**
 * Veřejná adresa obrázku. Base64 z DB se při buildu ukládá do
 * /product-images/<id>.<přípona>, u nových produktů tu samou adresu obslouží
 * product-feed (viz public/_redirects).
 */
export function feedImageUrl(p) {
  if (!p.image) return '';
  const m = p.image.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
  if (m) return `${SITE}/product-images/${p.id}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  if (p.image.startsWith('http://') || p.image.startsWith('https://')) return p.image;
  return `${SITE}${p.image.startsWith('/') ? p.image : `/${p.image}`}`;
}

export function buildGoogleFeed(products, imageFor = feedImageUrl) {
  let googleXml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  googleXml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  googleXml += '  <channel>\n';
  googleXml += '    <title>Northvale TCG</title>\n';
  googleXml += '    <link>https://northvaletcg.eu</link>\n';
  googleXml += '    <description>Originální Pokémon karty, Disney Lorcana a One Piece TCG produkty.</description>\n';

  for (const p of products) {
    const title = p.name || '';
    const desc = stripHtml(p.short_description || p.description || title);
    const link = `https://northvaletcg.eu/sealed-detail/${p.id}/`;
    const imageLink = imageFor(p);
    // Zboží na objednávku se u Googlu hlásí jako backorder (dodání po objednání)
    const availability = p.on_order ? 'backorder' : (p.preorder ? 'preorder' : (p.stock > 0 ? 'in_stock' : 'out_of_stock'));
    const price = `${parseFloat(p.price || 0).toFixed(2)} CZK`;
    const brand = getBrand(p.game);
    const gtin = p.ean || p.custom_params?.ean || p.custom_params?.gtin || '';

    googleXml += '    <item>\n';
    googleXml += `      <g:id>${escapeXml(p.id)}</g:id>\n`;
    googleXml += `      <g:title>${escapeXml(title)}</g:title>\n`;
    googleXml += `      <g:description>${escapeXml(desc)}</g:description>\n`;
    googleXml += `      <g:link>${escapeXml(link)}</g:link>\n`;
    googleXml += `      <g:image_link>${escapeXml(imageLink)}</g:image_link>\n`;
    googleXml += `      <g:availability>${escapeXml(availability)}</g:availability>\n`;
    googleXml += `      <g:price>${escapeXml(price)}</g:price>\n`;
    googleXml += '      <g:condition>new</g:condition>\n';
    googleXml += `      <g:brand>${escapeXml(brand)}</g:brand>\n`;
    // Kategorie ve stromu Google (Toys & Games > Games > Card Games).
    googleXml += '      <g:google_product_category>4403</g:google_product_category>\n';
    if (gtin) {
      googleXml += `      <g:gtin>${escapeXml(gtin)}</g:gtin>\n`;
    } else {
      // Bez EAN Google položku zamítne s "chybí GTIN", pokud mu výslovně
      // neřekneme, že výrobce žádný identifikátor nepřidělil.
      googleXml += '      <g:identifier_exists>no</g:identifier_exists>\n';
    }
    googleXml += '    </item>\n';
  }

  googleXml += '  </channel>\n';
  googleXml += '</rss>\n';
  return googleXml;
}

export function buildHeurekaFeed(products, imageFor = feedImageUrl) {
  let heurekaXml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  heurekaXml += '<SHOP>\n';

  const heurekaIds = new Set();
  for (const p of products) {
    const title = p.name || '';
    const desc = stripHtml(p.short_description || p.description || title);
    const link = `https://northvaletcg.eu/sealed-detail/${p.id}/`;
    const imageLink = imageFor(p);
    const price = parseFloat(p.price || 0);

    // Heureka delivery date logic: 0 = in stock, YYYY-MM-DD for preorder, 14/30 days fallback if out of stock
    let deliveryDate = '0';
    if (p.on_order) {
      // Zboží na objednávku — dodání dle lhůty nastavené v adminu
      deliveryDate = String(parseDeliveryDays(p.delivery_time));
    } else if (p.preorder) {
      deliveryDate = p.custom_params?.release_date || '14'; // Fallback to 14 days if preorder date unknown
    } else if (p.stock <= 0) {
      deliveryDate = '30'; // Out of stock
    }

    const ean = p.ean || p.custom_params?.ean || p.custom_params?.gtin || '';
    const brand = getBrand(p.game);
    const heurekaCpc = p.custom_params?.heureka_cpc || '5';

    // Heureka páruje podle PRODUCTNAME a ten MUSÍ obsahovat i výrobce —
    // tag MANUFACTURER se k párování nepoužívá, slouží jen jako filtr.
    // Zdroj: https://sluzby.heureka.cz/napoveda/xml-feed/
    const pairingName = title.toLowerCase().includes(brand.toLowerCase())
      ? title
      : `${brand} ${title}`;

    heurekaXml += '  <SHOPITEM>\n';
    heurekaXml += `    <ITEM_ID>${escapeXml(makeFeedItemId(p.id, heurekaIds))}</ITEM_ID>\n`;
    heurekaXml += `    <PRODUCTNAME>${escapeXml(pairingName.substring(0, 200))}</PRODUCTNAME>\n`;
    // PRODUCT = název tak, jak ho chceme zobrazit zákazníkovi.
    heurekaXml += `    <PRODUCT>${escapeXml(title)}</PRODUCT>\n`;
    heurekaXml += `    <DESCRIPTION>${escapeXml(desc)}</DESCRIPTION>\n`;
    heurekaXml += `    <URL>${escapeXml(link)}</URL>\n`;
    heurekaXml += `    <IMGURL>${escapeXml(imageLink)}</IMGURL>\n`;
    heurekaXml += `    <PRICE_VAT>${price}</PRICE_VAT>\n`;
    heurekaXml += `    <DELIVERY_DATE>${escapeXml(deliveryDate)}</DELIVERY_DATE>\n`;
    heurekaXml += `    <MANUFACTURER>${escapeXml(brand)}</MANUFACTURER>\n`;
    if (ean) {
      heurekaXml += `    <EAN>${escapeXml(ean)}</EAN>\n`;
    }
    heurekaXml += `    <HEUREKA_CPC>${escapeXml(heurekaCpc)}</HEUREKA_CPC>\n`;
    // Kategorie MUSÍ přesně odpovídat stromu Heureky, jinak se produkty nespárují.
    // Ověřeno proti https://www.heureka.cz/direct/xml-export/shops/heureka-sekce.xml
    heurekaXml += '    <CATEGORYTEXT>Heureka.cz | Hobby | Sběratelství | Sběratelské karty</CATEGORYTEXT>\n';
    heurekaXml += '  </SHOPITEM>\n';
  }

  heurekaXml += '</SHOP>\n';
  return heurekaXml;
}

export function buildZboziFeed(products, imageFor = feedImageUrl) {
  let zboziXml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  zboziXml += '<SHOP xmlns="http://www.zbozi.cz/ns/offer/1.0">\n';

  const zboziIds = new Set();
  for (const p of products) {
    const title = p.name || '';
    const desc = stripHtml(p.short_description || p.description || title);
    const link = `https://northvaletcg.eu/sealed-detail/${p.id}/`;
    const imageLink = imageFor(p);
    const price = parseFloat(p.price || 0);

    // Zboží delivery date logic: 0 = in stock, -1 = out of stock/on order, or exact days
    let deliveryDate = '0';
    if (p.on_order) {
      // Zboží na objednávku — dodání dle lhůty nastavené v adminu
      deliveryDate = String(parseDeliveryDays(p.delivery_time));
    } else if (p.preorder) {
      deliveryDate = '-1';
    } else if (p.stock <= 0) {
      deliveryDate = '-1';
    }

    const ean = p.ean || p.custom_params?.ean || p.custom_params?.gtin || '';
    const brand = getBrand(p.game);
    const zboziCpc = p.custom_params?.zbozi_cpc || p.custom_params?.heureka_cpc || '5';
    const fullProductName = brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${title}` : title;

    zboziXml += '  <SHOPITEM>\n';
    zboziXml += `    <ITEM_ID>${escapeXml(makeFeedItemId(p.id, zboziIds))}</ITEM_ID>\n`;
    zboziXml += `    <PRODUCTNAME>${escapeXml(title)}</PRODUCTNAME>\n`;
    zboziXml += `    <PRODUCT>${escapeXml(fullProductName)}</PRODUCT>\n`;
    zboziXml += `    <DESCRIPTION>${escapeXml(desc)}</DESCRIPTION>\n`;
    zboziXml += `    <URL>${escapeXml(link)}</URL>\n`;
    zboziXml += `    <IMGURL>${escapeXml(imageLink)}</IMGURL>\n`;
    zboziXml += `    <PRICE_VAT>${price}</PRICE_VAT>\n`;
    zboziXml += `    <DELIVERY_DATE>${escapeXml(deliveryDate)}</DELIVERY_DATE>\n`;
    zboziXml += `    <MANUFACTURER>${escapeXml(brand)}</MANUFACTURER>\n`;
    if (ean) {
      zboziXml += `    <EAN>${escapeXml(ean)}</EAN>\n`;
    }
    zboziXml += `    <MAX_CPC>${escapeXml(zboziCpc)}</MAX_CPC>\n`;
    // Zboží.cz má vlastní strom kategorií, jiný než Heureka (id 2596).
    // Ověřeno proti https://www.zbozi.cz/static/categories.csv
    zboziXml += '    <CATEGORYTEXT>Kultura a zábava | Volný čas | Společenské hry | Karetní hry | Sběratelské karetní hry</CATEGORYTEXT>\n';
    zboziXml += '  </SHOPITEM>\n';
  }

  zboziXml += '</SHOP>\n';
  return zboziXml;
}

/**
 * Feed pro srovnávač cen: jen Pokémon sealed. Struktura jako Heureka, navíc
 * jazyk (bez něj by se čínský box srovnával s anglickým), počet kusů a doprava.
 * Neznámé značky čtečky feedů přeskakují.
 */
export function buildSrovnavacFeed(products, imageFor = feedImageUrl) {
  let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n<SHOP>\n';
  const ids = new Set();
  for (const p of products) {
    if (getBrand(p.game) !== 'Pokémon' || p.type !== 'sealed') continue;
    const title = p.name || '';
    const ean = p.ean || p.custom_params?.ean || p.custom_params?.gtin || '';
    const available = !!p.on_order || !!p.preorder || p.stock > 0;
    const days = p.on_order ? parseDeliveryDays(p.delivery_time) : 0;

    xml += '  <SHOPITEM>\n';
    xml += `    <ITEM_ID>${escapeXml(makeFeedItemId(p.id, ids))}</ITEM_ID>\n`;
    xml += `    <PRODUCTNAME>${escapeXml(title.substring(0, 200))}</PRODUCTNAME>\n`;
    xml += `    <URL>${escapeXml(`${SITE}/sealed-detail/${p.id}/?utm_source=srovnavac&utm_medium=feed`)}</URL>\n`;
    xml += `    <IMGURL>${escapeXml(imageFor(p))}</IMGURL>\n`;
    xml += `    <PRICE_VAT>${parseFloat(p.price || 0)}</PRICE_VAT>\n`;
    xml += `    <AVAILABILITY>${available ? 'in_stock' : 'out_of_stock'}</AVAILABILITY>\n`;
    xml += `    <STOCK>${Math.max(0, Number(p.stock) || 0)}</STOCK>\n`;
    xml += `    <DELIVERY_DATE>${available ? days : 30}</DELIVERY_DATE>\n`;
    xml += `    <SHIPPING_FROM>${SHIPPING_FROM}</SHIPPING_FROM>\n`;
    xml += `    <FREE_SHIPPING_FROM>${FREE_SHIPPING_FROM}</FREE_SHIPPING_FROM>\n`;
    xml += `    <MANUFACTURER>Pokémon</MANUFACTURER>\n`;
    if (ean) xml += `    <EAN>${escapeXml(ean)}</EAN>\n`;
    xml += `    <PARAM>\n      <PARAM_NAME>Jazyk</PARAM_NAME>\n      <VAL>${escapeXml(p.lang || '')}</VAL>\n    </PARAM>\n`;
    xml += '  </SHOPITEM>\n';
  }
  xml += '</SHOP>\n';
  return xml;
}
