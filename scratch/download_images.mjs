// Download real product images for phones and laptops
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const IMAGES_DIR = 'public/images/products';

const IMAGE_URLS = {
  // Mobile Phones (GSMArena)
  'PROD-PHONE-005.jpg': 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16.jpg',
  'PROD-PHONE-006.jpg': 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-sm-s931.jpg',
  'PROD-PHONE-007.jpg': 'https://fdn2.gsmarena.com/vv/bigpic/oneplus-13.jpg',
  'PROD-PHONE-008.jpg': 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9a.jpg',
  'PROD-PHONE-009.jpg': 'https://fdn2.gsmarena.com/vv/bigpic/nothing-phone-2a-plus.jpg',
  // Laptops (Official manufacturer CDNs)
  'PROD-LAP-001.jpg': 'https://dlcdnwebimgs.asus.com/gain/ed4c3cdc-29c4-4bdf-a42b-9f008244a173/w800',
  'PROD-LAP-002.jpg': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/inspiron-notebooks/15-3530-intel/media-gallery/black/notebook-inspiron-15-3530-nt-plastic-black-gallery-2.psd?fmt=pjpg&wid=800',
  'PROD-LAP-003.jpg': 'https://p1-ofp.static.pub/medias/25470493404_82XQAG_202211110210051775568019260.png',
  'PROD-LAP-004.jpg': 'https://dlcdnwebimgs.asus.com/gain/8eab0384-e8de-469a-b948-a28660db588c/w800',
  'PROD-LAP-005.jpg': 'https://static-ecapac.acer.com/media/catalog/product/b/a/base_image_8_un.34qsi.01c.jpg',
};

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
      }
    };

    const makeRequest = (requestUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }
      
      protocol.get(requestUrl, options, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`  Redirect ${response.statusCode} -> ${response.headers.location}`);
          const redirectUrl = response.headers.location.startsWith('http') 
            ? response.headers.location 
            : new URL(response.headers.location, requestUrl).href;
          const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
          redirectProtocol.get(redirectUrl, options, (res2) => {
            if (res2.statusCode !== 200) {
              reject(new Error(`HTTP ${res2.statusCode} after redirect`));
              return;
            }
            const fileStream = fs.createWriteStream(destPath);
            res2.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              resolve();
            });
          }).on('error', reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(destPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', reject);
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

async function main() {
  console.log('Downloading product images...\n');
  
  let success = 0;
  let failed = 0;

  for (const [filename, url] of Object.entries(IMAGE_URLS)) {
    const destPath = path.join(IMAGES_DIR, filename);
    const oldSize = fs.existsSync(destPath) ? fs.statSync(destPath).size : 0;
    
    try {
      process.stdout.write(`Downloading ${filename}... `);
      await downloadFile(url, destPath);
      const newSize = fs.statSync(destPath).size;
      
      if (newSize > 1000) {
        console.log(`✅ ${(newSize / 1024).toFixed(1)} KB (was ${(oldSize / 1024).toFixed(1)} KB)`);
        success++;
      } else {
        console.log(`⚠️ File too small (${newSize} bytes), may be an error page`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} downloaded, ${failed} failed.`);
  
  // Show final sizes
  console.log('\nFinal image inventory:');
  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.startsWith('PROD-PHONE') || f.startsWith('PROD-LAP'));
  for (const f of files.sort()) {
    const size = fs.statSync(path.join(IMAGES_DIR, f)).size;
    const isPlaceholder = size === 71975;
    console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB ${isPlaceholder ? '⚠️ PLACEHOLDER' : '✅'}`);
  }
}

main().catch(console.error);
