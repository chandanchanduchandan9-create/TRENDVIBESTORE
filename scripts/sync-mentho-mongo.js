import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsPath = path.resolve(__dirname, '../src/data/products.json');

async function syncMongo() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('trendvibe');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  const prod = products.find(p => p.id === 'PROD-MED-015');
  
  if (!prod) {
    throw new Error('PROD-MED-015 not found in products.json');
  }

  const cleanDoc = { ...prod };
  delete cleanDoc._id;
  
  // Upsert into trendvibe.products by id: 'PROD-MED-015'
  const res = await db.collection('products').updateOne(
    { id: 'PROD-MED-015' },
    { $set: cleanDoc },
    { upsert: true }
  );
  
  console.log('MongoDB updateOne result:', res.acknowledged, 'matched:', res.matchedCount, 'modified:', res.modifiedCount);
  
  // Verify document in MongoDB
  const doc = await db.collection('products').findOne({ id: 'PROD-MED-015' });
  console.log('Verified in MongoDB:');
  console.log('  ID:', doc.id);
  console.log('  Name:', doc.name);
  console.log('  Has healthcareDetails:', Boolean(doc.healthcareDetails));
  console.log('  Product Info Name:', doc.healthcareDetails?.productInformation?.productName);
  console.log('  Ingredients:', doc.healthcareDetails?.productInformation?.ingredients?.slice(0, 40) + '...');
  console.log('  Child Safety Min Age:', doc.healthcareDetails?.childrenSafety?.minimumApprovedAge);
  
  await client.close();
}

syncMongo().catch(err => {
  console.error('Failed to sync to MongoDB:', err);
  process.exit(1);
});
