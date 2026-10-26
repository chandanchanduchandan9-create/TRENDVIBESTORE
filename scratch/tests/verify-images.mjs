import { MongoClient } from 'mongodb';

async function verify() {
  const client = new MongoClient('mongodb://localhost:27017/trendvibe');
  await client.connect();
  const db = client.db('trendvibe');
  const prods = await db.collection('products').find({ id: { $regex: /^(PROD-MED-|FOOD-KAR-)/ } }).project({ id: 1, name: 1, imageUrl: 1, image: 1 }).toArray();
  console.log(`Found ${prods.length} products in MongoDB:`);
  let allMatched = true;
  prods.forEach(p => {
    console.log(`${p.id}: ${p.imageUrl}`);
    if (!p.imageUrl || !p.imageUrl.startsWith('/images/products/')) {
      allMatched = false;
    }
  });
  console.log(`MongoDB sync verification: ${allMatched && prods.length === 25 ? 'PASSED (25/25)' : 'FAILED'}`);
  await client.close();
}

verify().catch(console.error);
