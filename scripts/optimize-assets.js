import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.resolve(projectRoot, 'public');
const backupDir = path.resolve(publicDir, '.original_backups');

console.log('--- Northvale TCG Image Optimization ---');

// Dynamically check and install sharp
try {
  await import('sharp');
} catch (e) {
  console.log('sharp module is not installed. Installing dynamically...');
  try {
    execSync('npm install sharp --no-save', { stdio: 'inherit', cwd: projectRoot });
    console.log('sharp successfully installed.');
  } catch (err) {
    console.error('Failed to dynamically install sharp. Please run: npm install sharp');
    process.exit(1);
  }
}

const sharp = (await import('sharp')).default;

// Ensure backup folder exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backups folder: ${backupDir}`);
}

const TARGETS = [
  // Category Banners (shown at ~128x47px, we target 400px for 2x retina/sharpness)
  { file: 'Pokemon.webp', width: 400, format: 'webp' },
  { file: 'lorcana logo.webp', width: 400, format: 'webp' },
  { file: 'One piece.webp', width: 400, format: 'webp' },
  { file: 'Prislusentstvi.webp', width: 400, format: 'webp' },
  { file: 'Akryly.webp', width: 400, format: 'webp' },
  { file: 'Ohodnoceni karet.webp', width: 400, format: 'webp' },
  { file: 'Riftbound.webp', width: 400, format: 'webp' },

  // Acrylic card image (convert from 622KB PNG to compressed WebP)
  { file: 'acrylic-etb-box.png', width: 560, height: 560, format: 'webp', out: 'acrylic-etb-box.webp' },

  // Banners & CTA Graphics
  { file: 'grading sekce.webp', width: 840, format: 'webp' },
  { file: 'Grading.webp', width: 840, format: 'webp' },
  { file: 'o nas northvale.webp', width: 1000, format: 'webp' },
  { file: 'Akce - NORTHVALE.webp', width: 1920, format: 'webp' },
  { file: 'Desktop - Grading Karet.webp', width: 1920, format: 'webp' },
  { file: 'Mobile - Grading karet.webp', width: 640, format: 'webp' }
];

const ICONS = [
  'shopping-cart.png',
  'user.png',
  'heart.png',
  'heart (1).png',
  'search.png',
  'instagram.png',
  'youtube.png',
  'tik-tok.png',
  'credit-card.png',
  'truck-moving.png',
  'tachometer-fast.png',
  'badget-check-alt.png'
];

async function optimizeTargets() {
  for (const target of TARGETS) {
    const inputPath = path.resolve(publicDir, target.file);
    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping: ${target.file} (does not exist)`);
      continue;
    }

    // Back up original file if not already backed up
    const backupPath = path.resolve(backupDir, target.file);
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
      console.log(`Backed up original: ${target.file}`);
    }

    const outName = target.out || target.file;
    const outputPath = path.resolve(publicDir, outName);

    console.log(`Optimizing: ${target.file} -> ${outName} (width: ${target.width}px)`);

    try {
      let processor = sharp(backupPath).resize(target.width, target.height || null, {
        fit: 'inside',
        withoutEnlargement: true
      });

      if (target.format === 'webp') {
        processor = processor.webp({ quality: 80, effort: 6 });
      } else if (target.format === 'png') {
        processor = processor.png({ quality: 80, compressionLevel: 9 });
      }

      await processor.toFile(outputPath);
      
      const oldSize = fs.statSync(backupPath).size;
      const newSize = fs.statSync(outputPath).size;
      const savings = ((oldSize - newSize) / oldSize * 100).toFixed(1);
      console.log(`  Done: ${(oldSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB (${savings}% saved)`);
    } catch (err) {
      console.error(`  Error processing ${target.file}:`, err.message);
    }
  }
}

async function optimizeIcons() {
  console.log('\nOptimizing UI Icons to 64x64px if oversized...');
  for (const icon of ICONS) {
    const inputPath = path.resolve(publicDir, icon);
    if (!fs.existsSync(inputPath)) {
      continue;
    }

    try {
      const metadata = await sharp(inputPath).metadata();
      if (metadata.width > 64) {
        // Back up
        const backupPath = path.resolve(backupDir, icon);
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(inputPath, backupPath);
          console.log(`Backed up icon: ${icon}`);
        }

        console.log(`Resizing icon: ${icon} (${metadata.width}x${metadata.height} -> 64x64)`);
        await sharp(inputPath)
          .resize(64, 64, { fit: 'inside', withoutEnlargement: true })
          .png({ quality: 80, compressionLevel: 9 })
          .toFile(inputPath + '.tmp');

        fs.renameSync(inputPath + '.tmp', inputPath);
      }
    } catch (err) {
      console.error(`  Error processing icon ${icon}:`, err.message);
    }
  }
}

await optimizeTargets();
await optimizeIcons();
console.log('\nOptimization complete!');
