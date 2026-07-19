import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function pingIndexNow() {
  console.log('=== STARTING INDEXNOW SUBMISSION ===');
  
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('Sitemap not found at:', sitemapPath);
    process.exit(1);
  }

  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  
  // Extract all <loc>URLs</loc> from sitemap
  const urlRegex = /<loc>(https:\/\/northvaletcg\.eu[^<]+)<\/loc>/g;
  const urls = [];
  let match;
  while ((match = urlRegex.exec(sitemapContent)) !== null) {
    urls.push(match[1]);
  }

  if (urls.length === 0) {
    console.log('No URLs found in sitemap. Skipping IndexNow ping.');
    return;
  }

  console.log(`Found ${urls.length} URLs in sitemap to submit.`);

  const payload = {
    host: 'northvaletcg.eu',
    key: '1cd89b4e72f04351a9a8d3e91128fa72',
    keyLocation: 'https://northvaletcg.eu/1cd89b4e72f04351a9a8d3e91128fa72.txt',
    urlList: urls
  };

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    console.log(`IndexNow API Response Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      console.log('IndexNow URLs submitted successfully!');
    } else {
      const text = await response.text();
      console.error('IndexNow submission failed. Response:', text);
    }
  } catch (err) {
    console.error('Failed to submit to IndexNow:', err.message);
  }
}

pingIndexNow();
