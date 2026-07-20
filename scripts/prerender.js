import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { blogArticles } from '../src/blogData.js';
import { mockProducts } from '../src/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const calendarData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/tcgCalendar2026.json'), 'utf-8')
);

// Helper to load environment variables from process.env and .env.local
function loadEnv() {
  const env = { ...process.env };
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().startsWith('#') || !line.includes('=')) continue;
        const index = line.indexOf('=');
        const key = line.substring(0, index).trim();
        let value = line.substring(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    } catch (err) {
      console.warn('Failed to parse .env.local file:', err.message);
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase Client
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Fetch active products from DB (fallback to mock)
async function getProducts() {
  if (!supabase) return mockProducts;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*');
    if (error) throw error;
    const filtered = data ? data.filter(p => p.id !== 'POK-SV2-112') : [];
    return filtered.length > 0 ? filtered : mockProducts;
  } catch (err) {
    console.warn('Prerender db products fetch failed, using mockProducts:', err.message);
    return mockProducts;
  }
}

// Fetch FAQ items from DB
async function getFAQs() {
  if (!supabase) return [];
  try {
    const { data: categories, error: catErr } = await supabase
      .from('faq_categories')
      .select('*')
      .order('position', { ascending: true });
    
    const { data: items, error: itemErr } = await supabase
      .from('faq_items')
      .select('*')
      .order('position', { ascending: true });

    if (catErr || itemErr) throw (catErr || itemErr);
    
    return categories.map(cat => ({
      ...cat,
      items: items.filter(item => item.category_id === cat.id)
    }));
  } catch (err) {
    console.warn('Prerender db FAQs fetch failed:', err.message);
    return [];
  }
}

// Simple HTML Escaper for security/formatting
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Extract plain text from either block editor JSON or raw HTML descriptions
function extractPlaintextDescription(rawDesc) {
  if (!rawDesc) return '';
  if (typeof rawDesc !== 'string') return '';
  
  const trimmed = rawDesc.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const blocks = JSON.parse(trimmed);
      if (Array.isArray(blocks)) {
        return blocks
          .filter(b => b.type === 'text' && b.value)
          .map(b => b.value.replace(/<[^>]*>/g, ''))
          .join(' ');
      }
    } catch (e) {
      // Fallback if parsing fails
    }
  }
  
  return trimmed.replace(/<[^>]*>/g, '');
}

// Clean product images from inline base64 bloat for prerendered HTML
function cleanImageUrl(imgUrl) {
  if (!imgUrl || imgUrl.startsWith('data:')) {
    return '/Northvale Logo.webp';
  }
  return imgUrl;
}

function cleanAbsoluteImageUrl(imgUrl) {
  if (!imgUrl || imgUrl.startsWith('data:')) {
    return 'https://northvaletcg.eu/Northvale Logo.webp';
  }
  return imgUrl;
}

// Generate JSON-LD Schema block
function generateJsonLd(type, data) {
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`;
}

// Basic Header HTML
const headerHtml = `
<header class="nv-header glass-header" style="position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); background: rgba(11, 12, 16, 0.75);">
  <div class="container nv-header-container" style="max-width: 1200px; margin: 0 auto; padding: 16px; display: flex; align-items: center; justify-content: space-between;">
    <a href="/" class="nv-logo" style="display: flex; align-items: center; text-decoration: none;">
      <img src="/Northvale Logo.webp" alt="Northvale Logo" style="height: 32px;" />
    </a>
    <nav class="nv-nav-menu" style="display: flex; gap: 24px; font-weight: 500;">
      <a href="/sealed-catalog/" style="color: #c5c6c7; text-decoration: none;">Sealed Produkty</a>
      <a href="/grading/" style="color: #c5c6c7; text-decoration: none;">Grading</a>
      <a href="/buylist/" style="color: #c5c6c7; text-decoration: none;">Výkup</a>
      <a href="/faq/" style="color: #c5c6c7; text-decoration: none;">FAQ</a>
      <a href="/blog/" style="color: #c5c6c7; text-decoration: none;">Blog</a>
    </nav>
  </div>
</header>
`;

// Basic Footer HTML
const footerHtml = `
<footer class="nv-footer" style="background: #0b0c10; border-top: 1px solid rgba(255,255,255,0.06); padding: 48px 16px; margin-top: 64px; color: #8a8a92;">
  <div class="container" style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 32px;">
    <div style="flex: 1; min-width: 250px;">
      <h4 style="color: #fff; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Northvale TCG</h4>
      <p style="font-size: 14px; line-height: 1.6;">Prémiový e-shop a komunitní portál pro sběratele karetních her Pokémon, Disney Lorcana a One Piece. Zaručená originalita, bezpečné sběratelské balení.</p>
    </div>
    <div style="flex: 1; min-width: 200px;">
      <h4 style="color: #fff; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Užitečné Odkazy</h4>
      <a href="/gdpr-vop/" style="display: block; color: #8a8a92; text-decoration: none; margin-bottom: 8px; font-size: 14px;">Obchodní & GDPR dokumentace</a>
      <a href="/gdpr-vop/?tab=doprava" style="display: block; color: #8a8a92; text-decoration: none; margin-bottom: 8px; font-size: 14px;">Doprava a platba</a>
      <a href="/gdpr-vop/?tab=vop" style="display: block; color: #8a8a92; text-decoration: none; margin-bottom: 8px; font-size: 14px;">Obchodní podmínky (VOP)</a>
      <a href="/gdpr-vop/?tab=gdpr" style="display: block; color: #8a8a92; text-decoration: none; margin-bottom: 8px; font-size: 14px;">Ochrana osobních údajů</a>
      <a href="/about/" style="display: block; color: #8a8a92; text-decoration: none; margin-bottom: 8px; font-size: 14px;">O nás</a>
      <a href="/community/" style="display: block; color: #8a8a92; text-decoration: none; margin-bottom: 8px; font-size: 14px;">Komunita</a>
      <a href="/support/" style="display: block; color: #8a8a92; text-decoration: none; margin-bottom: 8px; font-size: 14px;">Zákaznická podpora</a>
      <a href="/grading-guide/" style="display: block; color: #8a8a92; text-decoration: none; margin-bottom: 8px; font-size: 14px;">Průvodce gradingem</a>
    </div>
    <div style="flex: 1; min-width: 200px;">
      <h4 style="color: #fff; margin-bottom: 16px; font-family: 'Outfit', sans-serif;">Kontakt</h4>
      <p style="font-size: 14px; margin-bottom: 8px;">E-mail: <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; text-decoration: none;">info@northvaletcg.eu</a></p>
      <p style="font-size: 14px; margin-bottom: 8px;">Telefon: <a href="tel:+420739666779" style="color: #fdbd16; text-decoration: none;">+420 739 666 779</a></p>
      <p style="font-size: 13px;">Provozovatel: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice, IČO: 29618142</p>
    </div>
  </div>
</footer>

`;

async function prerender() {
  console.log('=== STARTING STATIC ROUTE PRERENDER ===');
  
  const distDir = path.resolve(__dirname, '../dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('dist/index.html not found! Run npm run build first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const products = await getProducts();
  const faqs = await getFAQs();

  // Route specs
  const routes = [];

  // 1. Homepage Spec
  routes.push({
    path: '',
    title: 'Pokémon karty, Lorcana a One Piece TCG | Northvale TCG',
    description: 'Originální Pokémon karty, Disney Lorcana a One Piece TCG produkty. Booster boxy, ETB, kusovky i grading. Bezpečné sběratelské balení a rychlá doprava po ČR.',
    canonicalUrl: 'https://northvaletcg.eu/',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://northvaletcg.eu/#organization",
          "name": "Northvale TCG",
          "url": "https://northvaletcg.eu/",
          "logo": "https://northvaletcg.eu/Northvale%20Logo.webp",
          "sameAs": [
            "https://www.instagram.com/northvaletcg/?utm_source=ig_web_button_share_sheet",
            "https://www.facebook.com/share/18yajuq6N1/?mibextid=wwXIfr"
          ],
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Bratří Čapků 1095",
            "addressLocality": "Holice",
            "postalCode": "53401",
            "addressCountry": "CZ"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+420-739-666-779",
            "contactType": "customer service",
            "email": "info@northvaletcg.eu"
          },
          "vatID": "CZ29618142"
        },
        {
          "@type": "WebSite",
          "@id": "https://northvaletcg.eu/#website",
          "url": "https://northvaletcg.eu/",
          "name": "Northvale TCG",
          "publisher": { "@id": "https://northvaletcg.eu/#organization" }
        }
      ]
    },
    content: `
      <main style="max-width: 1200px; margin: 0 auto; padding: 48px 16px; text-align: center;">
        <h1 style="font-size: 36px; font-family: 'Outfit', sans-serif; color: #fff; margin-bottom: 24px;">Pokémon karty, Lorcana a One Piece TCG</h1>
        <p style="font-size: 18px; color: #8a8a92; max-width: 800px; margin: 0 auto 48px auto; line-height: 1.6;">Vítejte na Northvale TCG, prémiovém portálu pro sběratele. Zaručujeme 100% originální sealed produkty, spolehlivé doručení a perfektní sběratelské balení.</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 48px;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 32px; border-radius: 8px;">
            <h2 style="color: #fff; margin-bottom: 16px;">Sealed Produkty</h2>
            <p style="color: #8a8a92; font-size: 14px; margin-bottom: 24px;">Booster boxy, Elite Trainer Boxy (ETB), speciální edice a dárkové kufříky.</p>
            <a href="/sealed-catalog/" style="color: #fdbd16; text-decoration: none; font-weight: 600;">Prozkoumat katalog →</a>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 32px; border-radius: 8px;">
            <h2 style="color: #fff; margin-bottom: 16px;">Grading Karet</h2>
            <p style="color: #8a8a92; font-size: 14px; margin-bottom: 24px;">Profesionální ověření pravosti a stavu vašich nejvzácnějších TCG karet.</p>
            <a href="/grading/" style="color: #fdbd16; text-decoration: none; font-weight: 600;">Více o gradingu →</a>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 32px; border-radius: 8px;">
            <h2 style="color: #fff; margin-bottom: 16px;">Sběratelský Blog</h2>
            <p style="color: #8a8a92; font-size: 14px; margin-bottom: 24px;">Návody jak poznat falešné karty, investiční tipy a produktové recenze.</p>
            <a href="/blog/" style="color: #fdbd16; text-decoration: none; font-weight: 600;">Číst články →</a>
          </div>
        </div>
      </main>
    `
  });

  // 2. Sealed Catalog Spec
  routes.push({
    path: 'sealed-catalog',
    title: 'Pokémon booster boxy a ETB | Northvale TCG',
    description: 'Originální balíčky (boostery), boxy, ETB a příslušenství pro karetní hry Pokémon, Lorcana a One Piece.',
    canonicalUrl: 'https://northvaletcg.eu/sealed-catalog/',
    content: `
      <main style="max-width: 1200px; margin: 0 auto; padding: 48px 16px;">
        <h1 style="font-size: 32px; font-family: 'Outfit', sans-serif; color: #fff; margin-bottom: 24px;">Katalog Sealed Produktů</h1>
        <p style="font-size: 16px; color: #8a8a92; margin-bottom: 32px;">Kompletní sortiment sběratelských karetních produktů. Booster Boxy, Elite Trainer Boxy a speciální balení.</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;">
          ${products.map(prod => `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px; text-align: left; display: flex; flex-direction: column;">
              <div style="height: 180px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.15); border-radius: 4px; margin-bottom: 16px; overflow: hidden;">
                <img src="${cleanImageUrl(prod.image)}" alt="${escapeHtml(prod.name)}" style="max-height: 100%; max-width: 100%; object-fit: contain;" />
              </div>
              <h3 style="font-size: 15px; color: #fff; margin-bottom: 8px; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 42px;">${escapeHtml(prod.name)}</h3>
              <p style="font-size: 18px; color: #fdbd16; font-weight: 700; margin-top: auto;">${prod.price.toLocaleString()} Kč</p>
              <a href="/sealed-detail/${prod.id}/" style="display: block; text-align: center; background: rgba(253, 189, 22, 0.08); border: 1px solid rgba(253, 189, 22, 0.3); color: #fdbd16; padding: 8px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: 600; margin-top: 12px;">Zobrazit detail</a>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 64px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 32px;">
          <h2 style="color: #fff; font-size: 20px; margin-bottom: 12px;">Co je Pokémon booster box a pro koho se hodí?</h2>
          <p style="color: #8a8a92; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Pokémon Booster Box (nebo též displej) obsahuje obvykle 36 samostatných balíčků (boosterů) vybrané edice. Jedná se o finančně nejvýhodnější způsob, jak nasbírat velké množství karet z konkrétního setu. Rozbalování booster boxu přináší garanci určitého počtu vzácných a tajných (secret rare) karet, což jej činí ideálním dárkem pro náročné sběratele i hráče, kteří chtějí sestavit turnajový balíček.</p>
          <h2 style="color: #fff; font-size: 20px; margin-bottom: 12px;">Co je Elite Trainer Box (ETB)?</h2>
          <p style="color: #8a8a92; font-size: 14px; line-height: 1.6;">Elite Trainer Box (ETB) je speciální sběratelská krabice, která kromě 8 až 10 boosterů obsahuje kompletní příslušenství ke hraní: obaly na karty s ilustrací edice, kostky, žetony poškození, energetické karty a stručného průvodce setem. Krabice sama slouží jako stylový pořadač. ETB je skvělým dárkem pro začátečníky i pokročilé sběratele, kteří ocení exkluzivní promo karty a designové obaly.</p>
        </div>
      </main>
    `
  });

  // 3. Blog List Spec
  routes.push({
    path: 'blog',
    title: 'Průvodce a články ze světa TCG | Northvale TCG',
    description: 'Průvodce světem karetních her, tipy na ochranu sbírky, rady pro začátečníky a návody pro rozpoznání padělaných karet.',
    canonicalUrl: 'https://northvaletcg.eu/blog/',
    content: `
      <main style="max-width: 1200px; margin: 0 auto; padding: 48px 16px;">
        <h1 style="font-size: 32px; font-family: 'Outfit', sans-serif; color: #fff; margin-bottom: 16px;">Northvale TCG Blog</h1>
        <p style="font-size: 16px; color: #8a8a92; margin-bottom: 48px;">Vše, co potřebujete vědět o Pokémon, Lorcana a One Piece. Tipy, analýzy a průvodce.</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px;">
          ${blogArticles.map(art => {
            const slug = art.id === 'jak-rozpoznat-fale-nou-pok-mon-kartu' ? 'jak-rozpoznat-falesnou-pokemon-kartu' : art.id;
            return `
              <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; text-align: left;">
                <div style="height: 180px; overflow: hidden; background: rgba(0,0,0,0.2);">
                  <img src="${art.image}" alt="${escapeHtml(art.title)}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div style="padding: 24px; display: flex; flex-direction: column; flex: 1;">
                  <span style="color: #fdbd16; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">${escapeHtml(art.category)}</span>
                  <h3 style="font-size: 18px; color: #fff; margin-bottom: 12px; font-family: 'Outfit', sans-serif;"><a href="/blog/${slug}/" style="color: #fff; text-decoration: none;">${escapeHtml(art.title)}</a></h3>
                  <p style="font-size: 14px; color: #8a8a92; line-height: 1.6; margin-bottom: 20px;">${escapeHtml(art.description)}</p>
                  <a href="/blog/${slug}/" style="color: #fdbd16; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: auto;">Číst více →</a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </main>
    `
  });

  // 4. Blog Details Spec
  blogArticles.forEach(art => {
    const slug = art.id === 'jak-rozpoznat-fale-nou-pok-mon-kartu' ? 'jak-rozpoznat-falesnou-pokemon-kartu' : art.id;
    
    // Process content block to raw HTML
    let bodyHtml = '';
    art.content.forEach(blk => {
      if (blk.type === 'h2') {
        bodyHtml += `<h2 style="color: #fff; font-family: 'Outfit', sans-serif; font-size: 22px; margin-top: 32px; margin-bottom: 16px;">${escapeHtml(blk.text)}</h2>`;
      } else if (blk.type === 'h3') {
        bodyHtml += `<h3 style="color: #fff; font-family: 'Outfit', sans-serif; font-size: 18px; margin-top: 24px; margin-bottom: 12px;">${escapeHtml(blk.text)}</h3>`;
      } else if (blk.type === 'image') {
        bodyHtml += `<div style="margin: 24px 0; border-radius: 8px; overflow: hidden;"><img src="${blk.src}" alt="${escapeHtml(blk.alt || art.title)}" style="width: 100%; max-height: 450px; object-fit: cover;" /></div>`;
      } else {
        let rawText = escapeHtml(blk.text);
        rawText = rawText
          .replace(/katalogu sealed produktů/g, '<a href="/sealed-catalog/" style="color:#fdbd16;text-decoration:underline;">katalogu sealed produktů</a>')
          .replace(/jak poznat falešné TCG karty/g, '<a href="/blog/jak-rozpoznat-falesnou-pokemon-kartu/" style="color:#fdbd16;text-decoration:underline;">jak poznat falešné TCG karty</a>')
          .replace(/jak rozpoznat falešnou Pokémon kartu/g, '<a href="/blog/jak-rozpoznat-falesnou-pokemon-kartu/" style="color:#fdbd16;text-decoration:underline;">jak rozpoznat falešnou Pokémon kartu</a>');
        
        bodyHtml += `<p style="font-size: 15px; color: #c5c6c7; line-height: 1.7; margin-bottom: 16px;">${rawText}</p>`;
      }
    });

    const dates = {
      'jak-rozpoznat-falesnou-pokemon-kartu': '2026-07-28T12:00:00Z',
      'jak-zacit-s-pokemon-kartami': '2026-07-25T12:00:00Z',
      'kde-koupit-pokemon-karty-v-cesku': '2026-07-22T12:00:00Z',
      'kde-sehnat-pokemon-karty-v-cr': '2026-07-19T12:00:00Z',
      'prislusenstvi-pro-karty': '2026-07-15T12:00:00Z',
      'vybava-sberatele-pokemon-karet': '2026-07-12T12:00:00Z'
    };
    const pubDate = dates[art.id] || "2026-06-18T12:00:00Z";
    const wordCount = art.content
      .filter(blk => blk.type !== 'image')
      .reduce((sum, blk) => sum + (blk.text ? blk.text.split(/\s+/).length : 0), 0);

    let pageTitle = `${art.title} | Northvale TCG`;
    if (pageTitle.length > 60) {
      pageTitle = art.title;
    }
    if (pageTitle.length > 60) {
      pageTitle = pageTitle.substring(0, 57) + "...";
    }

    let metaDesc = art.description || "";
    if (metaDesc.length > 160) {
      metaDesc = metaDesc.substring(0, 157) + "...";
    }

    routes.push({
      path: `blog/${slug}`,
      title: pageTitle,
      description: metaDesc,
      canonicalUrl: `https://northvaletcg.eu/blog/${slug}/`,
      schema: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Domů",
                "item": "https://northvaletcg.eu/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://northvaletcg.eu/blog/"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": art.title,
                "item": `https://northvaletcg.eu/blog/${slug}/`
              }
            ]
          },
          {
            "@type": "BlogPosting",
            "headline": art.title,
            "description": art.description,
            "image": `https://northvaletcg.eu${art.image}`,
            "datePublished": pubDate,
            "dateModified": pubDate,
            "wordCount": wordCount,
            "author": {
              "@type": "Person",
              "name": "Northvale TCG Team"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Northvale TCG",
              "logo": {
                "@type": "ImageObject",
                "url": "https://northvaletcg.eu/Northvale%20Logo.webp"
              }
            }
          }
        ]
      },
      content: `
        <main style="max-width: 800px; margin: 0 auto; padding: 48px 16px; text-align: left;">
          <a href="/blog/" style="color: #8a8a92; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 24px;">← Zpět na blog</a>
          <span style="color: #fdbd16; font-size: 12px; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 8px;">${escapeHtml(art.category)}</span>
          <h1 style="font-size: 32px; font-family: 'Outfit', sans-serif; color: #fff; margin-bottom: 16px; line-height: 1.3;">${escapeHtml(art.title)}</h1>
          <div style="font-size: 13px; color: #8a8a92; margin-bottom: 32px;">Doba čtení: ${art.readTime}</div>
          
          <div style="border-radius: 8px; overflow: hidden; margin-bottom: 32px;">
            <img src="${art.image}" alt="${escapeHtml(art.title)}" style="width: 100%; max-height: 400px; object-fit: cover;" />
          </div>
          
          <article>
            ${bodyHtml}
          </article>

          <div style="margin-top: 64px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 32px;">
            <h3 style="color: #fff; font-size: 20px; font-family: 'Outfit', sans-serif; margin-bottom: 20px;">Související články</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
              ${blogArticles.filter(a => a.id !== art.id).slice(0, 2).map(rel => {
                const relSlug = rel.id === 'jak-rozpoznat-fale-nou-pok-mon-kartu' ? 'jak-rozpoznat-falesnou-pokemon-kartu' : rel.id;
                return `
                  <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 16px;">
                    <h4 style="font-size: 14px; margin-bottom: 8px; font-family: 'Outfit', sans-serif; line-height: 1.4;"><a href="/blog/${relSlug}/" style="color: #fff; text-decoration: none;">${escapeHtml(rel.title)}</a></h4>
                    <a href="/blog/${relSlug}/" style="color: #fdbd16; font-size: 13px; text-decoration: none; font-weight: 600;">Číst článek →</a>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </main>
      `
    });
  });

  // 5. Product Detail Specs
  products.forEach(prod => {
    if (prod.type === 'single' || prod.type === 'slab') return;
    
    let brandName = "Pokémon";
    const prodGame = prod.game || "";
    if (prodGame.toLowerCase().includes("lorcana") || prod.name.toLowerCase().includes("lorcana")) {
      brandName = "Disney Lorcana";
    } else if (prodGame.toLowerCase().includes("piece") || prod.name.toLowerCase().includes("one piece")) {
      brandName = "One Piece TCG";
    } else if (prodGame.toLowerCase().includes("riftbound")) {
      brandName = "Riftbound";
    } else if (prodGame) {
      brandName = prodGame;
    }

    // If description is missing/thin in DB, generate and attempt to save it
    if (supabase && (!prod.description || prod.description.trim().length < 10)) {
      const generatedDesc = `Originální ${prod.name} pro sběratele a hráče karetní hry ${brandName}. Sběratelské balení, 100% originální distribuce.`;
      const generatedShort = `Koupit originální ${prod.name} online na Northvale TCG za skvělou cenu.`;
      
      supabase
        .from('products')
        .update({
          description: JSON.stringify([{ id: 'b-auto-generated', type: 'text', value: generatedDesc }]),
          short_description: generatedShort
        })
        .eq('id', prod.id)
        .then(({ error }) => {
          if (error) {
            console.warn(`Could not update description for product ${prod.id} in DB:`, error.message);
          } else {
            console.log(`Successfully saved generated description for ${prod.id} to DB.`);
          }
        })
        .catch(err => {
          console.warn(`Failed database write attempt for product ${prod.id}:`, err);
        });

      prod.description = JSON.stringify([{ id: 'b-auto-generated', type: 'text', value: generatedDesc }]);
      prod.short_description = generatedShort;
    }

    let plainDesc = extractPlaintextDescription(prod.short_description || prod.shortDesc || prod.description || prod.desc);
    if (!plainDesc || plainDesc.trim().length < 10) {
      const typeLabel = prod.type === 'booster_box' ? 'booster box' : (prod.type === 'etb' ? 'Elite Trainer Box' : 'speciální balení');
      plainDesc = `Kupte si originální ${prod.name} na Northvale TCG. Tento exkluzivní ${typeLabel} pro hru ${brandName} je perfektní volbou pro hráče i sběratele. Zaručujeme originalitu a doručení.`;
    }

    let metaDesc = plainDesc.replace(/\s+/g, ' ').trim();
    if (metaDesc.length > 160) {
      metaDesc = metaDesc.substring(0, 157) + "...";
    }

    let pageTitle = `${prod.name} | koupit online | Northvale TCG`;
    if (pageTitle.length > 60) {
      pageTitle = `${prod.name} | Northvale TCG`;
    }
    if (pageTitle.length > 60) {
      pageTitle = prod.name;
    }
    if (pageTitle.length > 60) {
      pageTitle = pageTitle.substring(0, 57) + "...";
    }

    routes.push({
      path: `sealed-detail/${prod.id}`,
      title: pageTitle,
      description: metaDesc,
      canonicalUrl: `https://northvaletcg.eu/sealed-detail/${prod.id}/`,
      schema: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Domů",
                "item": "https://northvaletcg.eu/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": prod.type === 'single' ? "Kusovky" : "Sealed",
                "item": prod.type === 'single' ? "https://northvaletcg.eu/singles-catalog/" : "https://northvaletcg.eu/sealed-catalog/"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": prod.name,
                "item": `https://northvaletcg.eu/sealed-detail/${prod.id}/`
              }
            ]
          },
          {
            "@type": "Product",
            "name": prod.name,
            "description": plainDesc || "Originální sealed produkt pro sběratele a hráče.",
            "image": (prod.image && !prod.image.startsWith('data:')) ? prod.image : 'https://northvaletcg.eu/Northvale Logo.webp',
            "sku": prod.sku || prod.id,
            "mpn": prod.id,
            "brand": {
              "@type": "Brand",
              "name": brandName
            },
            "offers": {
              "@type": "Offer",
              "url": `https://northvaletcg.eu/sealed-detail/${prod.id}/`,
              "priceCurrency": "CZK",
              "price": prod.price,
              "availability": prod.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "itemCondition": "https://schema.org/NewCondition",
              "seller": {
                "@type": "Organization",
                "name": "Northvale TCG"
              }
            }
          }
        ]
      },
      content: `
        <main style="max-width: 1200px; margin: 0 auto; padding: 48px 16px; display: flex; flex-wrap: wrap; gap: 48px; text-align: left;">
          <div style="flex: 1; min-width: 300px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.15); border-radius: 8px; padding: 32px; height: 400px;">
            <img src="${cleanImageUrl(prod.image)}" alt="${escapeHtml(prod.name)}" style="max-height: 100%; max-width: 100%; object-fit: contain;" />
          </div>
          <div style="flex: 1.2; min-width: 300px; display: flex; flex-direction: column;">
            <span style="color: #fdbd16; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">${escapeHtml(prod.game || 'TCG')} / ${escapeHtml(prod.type || 'Sealed')}</span>
            <h1 style="font-size: 28px; font-family: 'Outfit', sans-serif; color: #fff; margin-bottom: 16px; line-height: 1.3;">${escapeHtml(prod.name)}</h1>
            <p style="font-size: 24px; color: #fdbd16; font-weight: 800; margin-bottom: 24px;">${prod.price.toLocaleString()} Kč</p>
            
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 20px; margin-bottom: 24px;">
              <div style="font-size: 13px; color: #8a8a92; margin-bottom: 4px;">Dostupnost:</div>
              <div style="font-size: 15px; color: ${prod.stock > 0 ? '#81c784' : '#e57373'}; font-weight: 600; margin-bottom: 12px;">
                ${prod.stock > 0 ? `Skladem (${prod.stock} ks)` : 'Vyprodáno'}
              </div>
              <button style="width: 100%; background: #fdbd16; border: none; color: #0b0c10; padding: 12px; border-radius: 4px; font-weight: 700; cursor: pointer; text-transform: uppercase;">Koupit online</button>
            </div>
            
            <div style="color: #c5c6c7; font-size: 15px; line-height: 1.6;">
              <h3 style="color: #fff; margin-bottom: 8px; font-family: 'Outfit', sans-serif;">Popis produktu</h3>
              <p>${escapeHtml(prod.shortDesc || prod.desc || 'Originální sealed produkt pro sběratele a hráče.')}</p>
            </div>
          </div>

          <div style="width: 100%; margin-top: 64px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 48px;">
            <h3 style="color: #fff; font-size: 22px; font-family: 'Outfit', sans-serif; margin-bottom: 24px;">Související produkty</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
              ${products.filter(p => p.id !== prod.id && p.type !== 'single' && p.type !== 'slab').slice(0, 3).map(rel => `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px; display: flex; flex-direction: column;">
                  <div style="height: 150px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.15); border-radius: 4px; margin-bottom: 12px; overflow: hidden;">
                    <img src="${cleanImageUrl(rel.image)}" alt="${escapeHtml(rel.name)}" style="max-height: 100%; max-width: 100%; object-fit: contain;" />
                  </div>
                  <h4 style="font-size: 14px; color: #fff; margin-bottom: 8px; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 38px;">${escapeHtml(rel.name)}</h4>
                  <p style="font-size: 16px; color: #fdbd16; font-weight: 700; margin-top: auto;">${rel.price.toLocaleString()} Kč</p>
                  <a href="/sealed-detail/${rel.id}/" style="display: block; text-align: center; background: rgba(253, 189, 22, 0.08); border: 1px solid rgba(253, 189, 22, 0.3); color: #fdbd16; padding: 6px 0; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 600; margin-top: 8px;">Detail produktu</a>
                </div>
              `).join('')}
            </div>
          </div>
        </main>
      `
    });
  });

  // 6. FAQ Spec
  routes.push({
    path: 'faq',
    title: 'Často kladené dotazy (FAQ) | Northvale TCG',
    description: 'Často kladené dotazy ohledně doručení, bezpečného balení, gradingových služeb a ověřování originality karet.',
    canonicalUrl: 'https://northvaletcg.eu/faq/',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Domů",
              "item": "https://northvaletcg.eu/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "FAQ",
              "item": "https://northvaletcg.eu/faq/"
            }
          ]
        },
        {
          "@type": "FAQPage",
          "mainEntity": faqs.length > 0 ? faqs.flatMap(cat => cat.items.map(item => ({
            "@type": "Question",
            "name": item.question_cz,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": item.answer_cz
            }
          }))) : [
            {
              "@type": "Question",
              "name": "Jak probíhá doručení objednávek?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Doručujeme po celé České republice a Slovensku prostřednictvím služeb DPD a GLS."
              }
            },
            {
              "@type": "Question",
              "name": "Jak garantujete originalitu karet?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Veškeré zboží odebíráme výhradně od oficiálních distributorů. Každý produkt prochází fyzickou kontrolou pravosti."
              }
            }
          ]
        }
      ]
    },
    content: `
      <main style="max-width: 900px; margin: 0 auto; padding: 48px 16px; text-align: left;">
        <h1 style="font-size: 32px; font-family: 'Outfit', sans-serif; color: #fff; margin-bottom: 16px;">Často Kladené Dotazy (FAQ)</h1>
        <p style="font-size: 16px; color: #8a8a92; margin-bottom: 48px;">Vše, co potřebujete vědět o nákupu, dopravě, gradingu a výkupu karet na jednom místě.</p>
        
        <div style="display: flex; flex-direction: column; gap: 32px;">
          ${faqs.length > 0 ? faqs.map(cat => `
            <div>
              <h2 style="color: #fdbd16; font-family: 'Outfit', sans-serif; font-size: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; margin-bottom: 16px;">${escapeHtml(cat.name_cz)}</h2>
              <div style="display: flex; flex-direction: column; gap: 16px;">
                ${cat.items.map(item => `
                  <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 16px;">
                    <h3 style="font-size: 15px; color: #fff; margin-bottom: 8px; font-weight: 600;">Q: ${escapeHtml(item.question_cz)}</h3>
                    <p style="font-size: 14px; color: #c5c6c7; line-height: 1.6; margin: 0;">A: ${escapeHtml(item.answer_cz)}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('') : `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 16px;">
              <h3 style="font-size: 15px; color: #fff; margin-bottom: 8px; font-weight: 600;">Jak probíhá doručení objednávek?</h3>
              <p style="font-size: 14px; color: #c5c6c7; line-height: 1.6;">Doručujeme po celé České republice prostřednictvím služeb DPD a GLS, a to jak na adresu, tak na výdejní místa. Odeslání zásilek probíhá standardně do 24 hodin od objednání.</p>
            </div>
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 16px;">
              <h3 style="font-size: 15px; color: #fff; margin-bottom: 8px; font-weight: 600;">Jak garantujete originalitu karet?</h3>
              <p style="font-size: 14px; color: #c5c6c7; line-height: 1.6;">Veškeré zboží odebíráme výhradně od oficiálních distributorů. Každý sealed produkt i kusová karta prochází před odesláním fyzickou kontrolou pravosti naším odborníkem.</p>
            </div>
          `}
        </div>
      </main>
    `
  });

  // 7. General static pages specs (about, grading, buylist, gdpr-vop, grading-guide)
  const staticSpecs = [
    {
      path: 'about',
      title: 'O nás a našem příběhu | Northvale TCG',
      description: 'Příběh e-shopu Northvale TCG založeného z vášně pro sbírání a hraní karetních her Pokémon, Lorcana a One Piece.',
      h1: 'O Nás - Northvale TCG',
      body: 'Jsme parta dlouholetých sběratelů a hráčů, kteří se rozhodli přinést na český trh prémiovou platformu pro nákup sealed produktů i kusovek. Záleží nám na každém detailu – od rychlého odeslání přes poctivé sběratelské balení až po naprostou jistotu pravosti.'
    },
    {
      path: 'grading',
      title: 'Profesionální grading a ověření karet | Northvale TCG',
      description: 'Zprostředkujeme pro vás ověření stavu a pravosti vašich karet u předních světových autorit (PSA, Beckett, APGrading). Bezpečné odeslání a pojištění.',
      h1: 'Grading Servis Karet',
      body: 'Nechte si své nejlepší a nejhodnotnější TCG karty certifikovat. Spolupracujeme s předními gradingovými institucemi. Vaše karty bezpečně zabalíme, pojistíme a postaráme se o kompletní proces odeslání, cla a návratu zpět do vašich rukou.'
    },
    {
      path: 'grading-guide',
      title: 'Průvodce gradingem PSA, APG a Beckett | Northvale TCG',
      description: 'Průvodce gradingem sběratelských karet. Jak připravit karty pro grading, jaké zvolit služby, na co se zaměřit a jak vypočítat stav.',
      h1: 'Gradingový Průvodce Karet',
      body: 'Chystáte se odeslat své první karty na grading? Přečtěte si náš podrobný návod o tom, jak karty správně posoudit (centrování, rohy, hrany, povrch), jak je připravit pro bezpečné odeslání a jaké standardy splňují jednotlivé gradingové firmy.'
    },
    {
      path: 'buylist',
      title: 'Výkup Pokémon a Lorcana karet online | Northvale TCG',
      description: 'Rychlý výkup kusových karet a přebytků. Nabídněte nám své karty a získejte hotovost nebo Store Credit s bonusem.',
      h1: 'Výkup Karetních Přebytků',
      body: 'Máte doma hromadu karet, které nepotřebujete? Nabídněte nám je k výkupu! Vykupujeme vybrané kusovky z Pokémon, Lorcana i One Piece. Zvolit můžete vyplacení v hotovosti na účet, nebo získat navýšený Store Credit pro nákup nových booster boxů na našem e-shopu.'
    },
    {
      path: 'gdpr-vop',
      title: 'Obchodní podmínky (VOP) a ochrana soukromí | Northvale TCG',
      description: 'Všeobecné obchodní podmínky (VOP), zásady ochrany osobních údajů (GDPR) a informace o dopravě a reklamacích.',
      h1: 'Obchodní a Právní Informace',
      body: 'Na této stránce najdete veškeré právní a smluvní dokumenty e-shopu. Všeobecné obchodní podmínky, reklamační řád, podrobnosti o možnostech dopravy a platby, a zásady nakládání s osobními údaji sběratelů.'
    },
    {
      path: 'community',
      title: 'TCG komunitní turnaje a akce | Northvale TCG',
      description: 'Podporujeme místní herní komunity karetních her Pokémon a Lorcana. Sponzorujeme ceny do turnajů, dodáváme herní obaly a boostery.',
      h1: 'TCG Komunita a Turnaje',
      body: 'Northvale TCG aktivně podporuje místní herní skupiny a turnaje v karetních hrách. Nechceme konkurovat lokálním hernám, ale pomáhat jim růst – sponzorujeme prize pooly a dodáváme příslušenství.'
    },
    {
      path: 'support',
      title: 'Kontakt a zákaznická podpora | Northvale TCG',
      description: 'Máte dotaz k objednávce, doručení nebo výkupu? Kontaktujte naši zákaznickou podporu prostřednictvím e-mailu nebo telefonu.',
      h1: 'Zákaznická Podpora',
      body: 'Jsme tu pro vás. Pokud máte jakýkoliv dotaz k doručení zásilky, stavu objednávky, výkupu karet nebo k naší nabídce, ozvěte se nám přes e-mail nebo na telefonním čísle.'
    }
  ];

  staticSpecs.forEach(spec => {
    routes.push({
      path: spec.path,
      title: spec.title,
      description: spec.description,
      canonicalUrl: `https://northvaletcg.eu/${spec.path}/`,
      content: `
        <main style="max-width: 800px; margin: 0 auto; padding: 48px 16px; text-align: left;">
          <h1 style="font-size: 32px; font-family: 'Outfit', sans-serif; color: #fff; margin-bottom: 24px;">${escapeHtml(spec.h1)}</h1>
          <p style="font-size: 16px; color: #c5c6c7; line-height: 1.8;">${escapeHtml(spec.body)}</p>
        </main>
      `
    });
  });

  // 8. TCG Release Calendar Spec
  const configPath = path.resolve(__dirname, '../src/config.js');
  const configText = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '';
  const showCalendar = configText.includes('showCalendar: true');

  if (showCalendar) {
    const calendarItemsHtml = calendarData.map(item => `
      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <td style="padding: 16px 20px; color: #fff;"><strong>${escapeHtml(item.name)}</strong></td>
        <td style="padding: 16px 20px; color: #a855f7;">${escapeHtml(item.game)}</td>
        <td style="padding: 16px 20px; color: rgba(255,255,255,0.7); font-family: monospace;">${escapeHtml(item.releaseDate)}</td>
        <td style="padding: 16px 20px; color: #10b981;">${escapeHtml(item.preorderStatus)}</td>
      </tr>
    `).join('');

    routes.push({
      path: 'kalendar-vydani',
      title: 'Kalendář vydání TCG setů 2026 | Northvale TCG',
      description: 'Aktuální přehled plánovaných setů Pokémon, Disney Lorcana, One Piece TCG a Riftbound pro rok 2026. Sledujte data vydání a stav předobjednávek na Northvale TCG.',
      canonicalUrl: 'https://northvaletcg.eu/kalendar-vydani/',
      schema: {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Kalendář vydání TCG setů 2026",
        "description": "Přehled nadcházejících setů pro Pokémon, Lorcana, One Piece a Riftbound.",
        "itemListElement": calendarData.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Event",
            "name": item.name,
            "startDate": item.releaseDate.split('. ').reverse().join('-'),
            "description": `${item.game} TCG set release. Stav předobjednávek: ${item.preorderStatus}.`,
            "location": {
              "@type": "Place",
              "name": "Northvale TCG",
              "address": "Bratří Čapků 1095, 534 01 Holice"
            }
          }
        }))
      },
      content: `
        <main style="max-width: 900px; margin: 0 auto; padding: 48px 16px; text-align: left;">
          <span style="font-size: 11.5px; font-weight: 700; color: #fdbd16; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">TCG RELEASES • 2026</span>
          <h1 style="font-size: 32px; font-family: 'Outfit', sans-serif; color: #fff; margin-bottom: 12px;">Kalendář vydání TCG setů 2026</h1>
          <p style="font-size: 16px; color: #8a8a92; margin-bottom: 32px; line-height: 1.6;">Sledujte plánované novinky a start předobjednávek pro karetní hry Pokémon, Disney Lorcana, One Piece a Riftbound.</p>
          
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; overflow-x: auto; margin-bottom: 32px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14.5px;">
              <thead>
                <tr style="background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06);">
                  <th style="padding: 16px 20px; color: rgba(255,255,255,0.6); font-weight: 600;">Název setu / produktu</th>
                  <th style="padding: 16px 20px; color: rgba(255,255,255,0.6); font-weight: 600;">Hra</th>
                  <th style="padding: 16px 20px; color: rgba(255,255,255,0.6); font-weight: 600;">Datum vydání</th>
                  <th style="padding: 16px 20px; color: rgba(255,255,255,0.6); font-weight: 600;">Stav předobjednávek</th>
                </tr>
              </thead>
              <tbody>
                ${calendarItemsHtml}
              </tbody>
            </table>
          </div>
        </main>
      `
    });
  }

  // Write files
  for (const r of routes) {
    const fullContent = `
      <div id="nv-ssr-container">
        ${headerHtml}
        <div id="nv-ssr-content">
          ${r.content}
        </div>
        ${footerHtml}
      </div>
    `;

    let rendered = baseHtml;
    rendered = rendered.replace(
      '<div id="root"></div>', 
      `<div id="root">${fullContent}</div>`
    );

    rendered = rendered.replace(
      /<title>[^]*?<\/title>/gi, 
      `<title>${escapeHtml(r.title)}</title>`
    );

    rendered = rendered.replace(
      /<meta[^>]*?name="description"[^>]*?content="[^]*?"[^]*?\/?>/gi, 
      `<meta name="description" content="${escapeHtml(r.description)}" />`
    );

    // Resolve dynamic social share metadata type and images
    let ogType = 'website';
    let ogImageUrl = 'https://northvaletcg.eu/Northvale Logo.webp';
    if (r.path.startsWith('blog/')) {
      ogType = 'article';
      const slug = r.path.split('/')[1];
      const art = blogArticles.find(a => (a.id === slug || (a.id === 'jak-rozpoznat-fale-nou-pok-mon-kartu' && slug === 'jak-rozpoznat-falesnou-pokemon-kartu')));
      if (art && art.image) {
        ogImageUrl = `https://northvaletcg.eu${art.image}`;
      }
    } else if (r.path.startsWith('sealed-detail/')) {
      ogType = 'product';
      const prodId = r.path.split('/')[1];
      const prod = products.find(p => p.id === prodId);
      if (prod && prod.image) {
        ogImageUrl = cleanAbsoluteImageUrl(prod.image);
      }
    }

    const headInsertion = `
    <link rel="canonical" href="${r.canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(r.title)}" />
    <meta property="og:description" content="${escapeHtml(r.description)}" />
    <meta property="og:url" content="${r.canonicalUrl}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:site_name" content="Northvale TCG" />
    <meta property="og:locale" content="cs_CZ" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(r.title)}" />
    <meta name="twitter:description" content="${escapeHtml(r.description)}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    ${r.schema ? generateJsonLd(r.schema["@type"] || r.schema[0]?.["@type"], r.schema) : ''}
    </head>`;

    rendered = rendered.replace('</head>', headInsertion);

    if (r.path === '') {
      fs.writeFileSync(indexHtmlPath, rendered, 'utf-8');
      console.log(`Prerendered homepage saved to dist/index.html`);
    } else {
      const targetDir = path.join(distDir, r.path);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetPath = path.join(targetDir, 'index.html');
      fs.writeFileSync(targetPath, rendered, 'utf-8');
      console.log(`Prerendered route saved to ${targetPath}`);
    }
  }

  console.log('=== ROUTE PRERENDER COMPLETED SUCCESSFULLY ===');
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
