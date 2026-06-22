import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { blogArticles } from '../src/blogData.js';
import { mockProducts } from '../src/mockData.js';

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
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.includes('=')) continue;
        const index = line.indexOf('=');
        const key = line.substring(0, index).trim();
        let value = line.substring(index + 1).trim();
        // Strip quotes
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

async function getProducts(supabaseUrl, supabaseAnonKey) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Falling back to mockProducts.');
    return mockProducts;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('products')
      .select('id, type');

    if (error) {
      throw error;
    }
    if (data && data.length > 0) {
      console.log(`Successfully fetched ${data.length} products from Supabase.`);
      return data;
    }
    console.warn('Supabase query returned empty product list. Falling back to mockProducts.');
    return mockProducts;
  } catch (err) {
    console.warn('Database query failed, using local mock fallback:', err.message || err);
    return mockProducts;
  }
}

async function run() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  console.log('Generating Sitemap for northvaletcg.eu...');
  const products = await getProducts(supabaseUrl, supabaseAnonKey);

  const baseUrl = 'https://northvaletcg.eu';

  // 1. Static URLs
  const staticUrls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/sealed-catalog`, priority: '0.8', changefreq: 'daily' },
    { loc: `${baseUrl}/singles-catalog`, priority: '0.8', changefreq: 'daily' },
    { loc: `${baseUrl}/slabs-catalog`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${baseUrl}/buylist`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${baseUrl}/grading`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${baseUrl}/grading-guide`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${baseUrl}/community`, priority: '0.6', changefreq: 'weekly' },
    { loc: `${baseUrl}/support`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${baseUrl}/faq`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${baseUrl}/about`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${baseUrl}/blog`, priority: '0.7', changefreq: 'daily' },
    { loc: `${baseUrl}/gdpr-vop`, priority: '0.5', changefreq: 'monthly' }
  ];

  // 2. Blog URLs (Note: We use the cleaned up slug 'jak-rozpoznat-falesnou-pokemon-kartu' for first article)
  const blogUrls = blogArticles.map(article => {
    // Clean up slug if it has the broken diacritics structure
    const slug = article.id === 'jak-rozpoznat-fale-nou-pok-mon-kartu' 
      ? 'jak-rozpoznat-falesnou-pokemon-kartu' 
      : article.id;
    return {
      loc: `${baseUrl}/blog/${slug}`,
      priority: '0.6',
      changefreq: 'weekly'
    };
  });

  // 3. Product Detail URLs
  const productUrls = products.map(product => {
    const isSingle = product.type === 'single' || product.type === 'slab';
    const path = isSingle ? `/singles-detail/${product.id}` : `/sealed-detail/${product.id}`;
    return {
      loc: `${baseUrl}${path}`,
      priority: '0.6',
      changefreq: 'weekly'
    };
  });

  const allUrls = [...staticUrls, ...blogUrls, ...productUrls];

  // Build the XML content
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of allUrls) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    if (url.priority) {
      xml += `    <priority>${url.priority}</priority>\n`;
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf-8');
  console.log(`Sitemap generated successfully at: ${outputPath} (${allUrls.length} links total)`);
}

run();
