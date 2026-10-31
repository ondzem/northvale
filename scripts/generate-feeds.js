import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { isFeedProduct, buildGoogleFeed, buildHeurekaFeed, buildZboziFeed, buildSrovnavacFeed } from '../supabase/functions/_shared/feed-builders.js';

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
    .select('id, name, game, edition, category, subcat, description, short_description, price, stock, preorder, image, custom_params, ean, on_order, delivery_time, lang, type');

  if (error) {
    console.error('Failed to fetch products:', error.message);
    process.exit(1);
  }

  // Filter out test products and invalid items
  const filteredProducts = (products || []).filter(isFeedProduct);

  console.log(`Generating feeds for ${filteredProducts.length} products...`);

  // Ensure public/feeds and public/product-images directories exist
  const feedsDir = path.resolve(__dirname, '../public/feeds');
  const imgDir = path.resolve(__dirname, '../public/product-images');
  
  if (!fs.existsSync(feedsDir)) {
    fs.mkdirSync(feedsDir, { recursive: true });
  }

  // Obsah feedů sestavuje supabase/functions/_shared/feed-builders.js (stejný kód jede v edge funkci product-feed)
  const imageFor = (p) => getCleanImageUrl(p, imgDir);

  const googleXml = buildGoogleFeed(filteredProducts, imageFor);
  fs.writeFileSync(path.join(feedsDir, 'google.xml'), googleXml, 'utf-8');
  console.log('Google Merchant feed saved to public/feeds/google.xml');

  const heurekaXml = buildHeurekaFeed(filteredProducts, imageFor);
  fs.writeFileSync(path.join(feedsDir, 'heureka.xml'), heurekaXml, 'utf-8');
  console.log('Heureka feed saved to public/feeds/heureka.xml');

  const zboziXml = buildZboziFeed(filteredProducts, imageFor);
  fs.writeFileSync(path.join(feedsDir, 'zbozi.xml'), zboziXml, 'utf-8');
  console.log('Zboží feed saved to public/feeds/zbozi.xml');

  fs.writeFileSync(path.join(feedsDir, 'srovnavac.xml'), buildSrovnavacFeed(filteredProducts, imageFor), 'utf-8');
  console.log('Srovnávač feed saved to public/feeds/srovnavac.xml');

  console.log('Feeds generation completed successfully!');
}

run();
