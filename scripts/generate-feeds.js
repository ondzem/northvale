import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function getCleanImageUrl(p, imgDir) {
  if (!p.image) return '';
  
  if (p.image.startsWith('data:')) {
    try {
      const match = p.image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        if (!fs.existsSync(imgDir)) {
          fs.mkdirSync(imgDir, { recursive: true });
        }
        
        const filename = `${p.id}.${ext}`;
        const filepath = path.join(imgDir, filename);
        fs.writeFileSync(filepath, buffer);
        
        return `https://northvaletcg.eu/product-images/${filename}`;
      }
    } catch (err) {
      console.error(`Failed to extract base64 image for product ${p.id}:`, err);
    }
  }
  
  if (p.image.startsWith('http://') || p.image.startsWith('https://')) {
    return p.image;
  }
  
  const cleanPath = p.image.startsWith('/') ? p.image : `/${p.image}`;
  return `https://northvaletcg.eu${cleanPath}`;
}

async function run() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing. Cannot generate feeds.');
    process.exit(1);
  }

  console.log('Fetching products from database...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, game, edition, category, subcat, description, short_description, price, stock, preorder, image, custom_params, ean');

  if (error) {
    console.error('Failed to fetch products:', error.message);
    process.exit(1);
  }

  // Filter out test products and invalid items
  const filteredProducts = (products || []).filter(p => {
    if (p.id === 'POK-SV2-112') return false;
    if (p.name && p.name.toLowerCase().includes('testov')) return false;
    return true;
  });

  console.log(`Generating feeds for ${filteredProducts.length} products...`);

  // Ensure public/feeds and public/product-images directories exist
  const feedsDir = path.resolve(__dirname, '../public/feeds');
  const imgDir = path.resolve(__dirname, '../public/product-images');
  
  if (!fs.existsSync(feedsDir)) {
    fs.mkdirSync(feedsDir, { recursive: true });
  }

  // 1. Generate Google Merchant Feed
  let googleXml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  googleXml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  googleXml += '  <channel>\n';
  googleXml += '    <title>Northvale TCG</title>\n';
  googleXml += '    <link>https://northvaletcg.eu</link>\n';
  googleXml += '    <description>Originální Pokémon karty, Disney Lorcana a One Piece TCG produkty.</description>\n';

  for (const p of filteredProducts) {
    const title = p.name || '';
    const desc = stripHtml(p.short_description || p.description || title);
    const link = `https://northvaletcg.eu/sealed-detail/${p.id}/`;
    const imageLink = getCleanImageUrl(p, imgDir);
    const availability = p.preorder ? 'preorder' : (p.stock > 0 ? 'in_stock' : 'out_of_stock');
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
    if (gtin) {
      googleXml += `      <g:gtin>${escapeXml(gtin)}</g:gtin>\n`;
    }
    googleXml += '    </item>\n';
  }

  googleXml += '  </channel>\n';
  googleXml += '</rss>\n';

  fs.writeFileSync(path.join(feedsDir, 'google.xml'), googleXml, 'utf-8');
  console.log('Google Merchant feed saved to public/feeds/google.xml');

  // 2. Generate Heureka Feed
  let heurekaXml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  heurekaXml += '<SHOP>\n';

  for (const p of filteredProducts) {
    const title = p.name || '';
    const desc = stripHtml(p.short_description || p.description || title);
    const link = `https://northvaletcg.eu/sealed-detail/${p.id}/`;
    const imageLink = getCleanImageUrl(p, imgDir);
    const price = parseFloat(p.price || 0);

    // Heureka delivery date logic: 0 = in stock, YYYY-MM-DD for preorder, 14/30 days fallback if out of stock
    let deliveryDate = '0';
    if (p.preorder) {
      deliveryDate = p.custom_params?.release_date || '14'; // Fallback to 14 days if preorder date unknown
    } else if (p.stock <= 0) {
      deliveryDate = '30'; // Out of stock
    }

    const ean = p.ean || p.custom_params?.ean || p.custom_params?.gtin || '';
    const brand = getBrand(p.game);
    const heurekaCpc = p.custom_params?.heureka_cpc || '5';

    heurekaXml += '  <SHOPITEM>\n';
    heurekaXml += `    <ITEM_ID>${escapeXml(p.id.substring(0, 36))}</ITEM_ID>\n`;
    heurekaXml += `    <PRODUCTNAME>${escapeXml(title)}</PRODUCTNAME>\n`;
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
    heurekaXml += '    <CATEGORYTEXT>Sběratelství | Sběratelské karetní hry</CATEGORYTEXT>\n';
    heurekaXml += '  </SHOPITEM>\n';
  }

  heurekaXml += '</SHOP>\n';

  fs.writeFileSync(path.join(feedsDir, 'heureka.xml'), heurekaXml, 'utf-8');
  console.log('Heureka feed saved to public/feeds/heureka.xml');

  // 3. Generate Zboží Feed
  let zboziXml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  zboziXml += '<SHOP>\n';

  for (const p of filteredProducts) {
    const title = p.name || '';
    const desc = stripHtml(p.short_description || p.description || title);
    const link = `https://northvaletcg.eu/sealed-detail/${p.id}/`;
    const imageLink = getCleanImageUrl(p, imgDir);
    const price = parseFloat(p.price || 0);

    // Zboží delivery date logic: 0 = in stock, -1 = out of stock/on order, or exact days
    let deliveryDate = '0';
    if (p.preorder) {
      deliveryDate = '-1';
    } else if (p.stock <= 0) {
      deliveryDate = '-1';
    }

    const ean = p.ean || p.custom_params?.ean || p.custom_params?.gtin || '';
    const brand = getBrand(p.game);
    const zboziCpc = p.custom_params?.zbozi_cpc || p.custom_params?.heureka_cpc || '5';

    zboziXml += '  <SHOPITEM>\n';
    zboziXml += `    <ITEM_ID>${escapeXml(p.id.substring(0, 36))}</ITEM_ID>\n`;
    zboziXml += `    <PRODUCTNAME>${escapeXml(title)}</PRODUCTNAME>\n`;
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
    zboziXml += '    <CATEGORYTEXT>Sběratelství | Sběratelské karetní hry</CATEGORYTEXT>\n';
    zboziXml += '  </SHOPITEM>\n';
  }

  zboziXml += '</SHOP>\n';

  fs.writeFileSync(path.join(feedsDir, 'zbozi.xml'), zboziXml, 'utf-8');
  console.log('Zboží feed saved to public/feeds/zbozi.xml');

  console.log('Feeds generation completed successfully!');
}

run();
