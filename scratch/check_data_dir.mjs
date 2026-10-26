import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Simulate what database.js does
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// database.js is at src/db/database.js, so ../../data = data/
// But we're at scratch/, so let's just compute it for src/db/
const dbDir = path.resolve(__dirname, '../src/db');
const dataDir = path.resolve(dbDir, '../../data');
console.log('DB dir:', dbDir);
console.log('Resolved DATA_DIR:', dataDir);
console.log('products.json exists at DATA_DIR:', fs.existsSync(path.join(dataDir, 'products.json')));
console.log('src/data/products.json exists:', fs.existsSync(path.join(__dirname, '../src/data/products.json')));

// Check if data/ at root has products
console.log('root data/ has:', fs.existsSync(path.join(__dirname, '../data')) ? fs.readdirSync(path.join(__dirname, '../data')) : 'DIR NOT FOUND');
