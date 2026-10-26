import axios from 'axios';
import { db } from '../src/db/database.js';

const BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:3000';

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 TRENDVIBE DBMS & PRODUCT CREATION VERIFICATION SUITE');
  console.log(`🌐 Target Server: ${BASE_URL}`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, success, details = '') {
    if (success) {
      console.log(`✅ [PASS] ${name} ${details ? '— ' + details : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} — ${details}`);
      failed++;
    }
  }

  // 1. Database initialization and status
  try {
    await db.initialize();
    const dbStatus = await db.getDbStatus();
    report('1. DBMS Connection Status', dbStatus.connected && dbStatus.database === 'mongodb',
      `DBMS: ${dbStatus.database}, MongoDB DB: ${dbStatus.databaseName}, Products Count: ${dbStatus.collections?.products}`);
  } catch (err) {
    report('1. DBMS Connection Status', false, err.message);
  }

  // 2. Direct DBMS Verification via database.js
  try {
    const directVerify = await db.verifyDbConnection();
    report('2. Direct DBMS Read/Write/Delete Audit', directVerify.healthy,
      `Ping Latency: ${directVerify.tests?.ping?.latencyMs}ms, CRUD: ${directVerify.tests?.crudOperation?.status}`);
  } catch (err) {
    report('2. Direct DBMS Read/Write/Delete Audit', false, err.message);
  }

  // 3. API Database Verification Endpoint (/api/db/verify)
  try {
    const res = await axios.post(`${BASE_URL}/api/db/verify`);
    report('3. REST API /api/db/verify', res.data.success,
      `Verified MongoDB: ${res.data.verification?.databaseName}, Healthy: ${res.data.verification?.healthy}`);
  } catch (err) {
    report('3. REST API /api/db/verify', false, err.message);
  }

  // 4. Categories API
  try {
    const res = await axios.get(`${BASE_URL}/api/categories`);
    report('4. REST API /api/categories', res.data.success && res.data.count > 0,
      `Loaded ${res.data.count} categories (${res.data.categories.map(c => c.displayName).slice(0, 4).join(', ')}...)`);
  } catch (err) {
    report('4. REST API /api/categories', false, err.message);
  }

  // 5. Photo Upload API (Base64)
  let uploadedImageUrl = null;
  try {
    // 1x1 transparent PNG data uri
    const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await axios.post(`${BASE_URL}/api/upload`, {
      image: samplePngBase64,
      prefix: 'test_photo'
    });
    uploadedImageUrl = uploadRes.data.imageUrl;
    report('5. Photo Upload API (/api/upload)', uploadRes.data.success && Boolean(uploadedImageUrl),
      `Stored Image URL: ${uploadedImageUrl}`);
  } catch (err) {
    report('5. Photo Upload API (/api/upload)', false, err.message);
  }

  // 6. Create Product with Category and Uploaded Photo (/api/seller/products)
  let createdProductId = null;
  try {
    const sampleProduct = {
      name: `TrendVibe Verification Sneaker ${Date.now()}`,
      category: 'shoes',
      brand: 'TrendVibe Athletics',
      description: 'DBMS Verification Product with Category selection and Photo Upload.',
      price: 3499,
      salePrice: 2799,
      stockCount: 25,
      imageUrl: uploadedImageUrl || '/images/products/default.jpg',
      colours: ['Triple Black', 'Glacier White'],
      sizes: ['UK 8', 'UK 9', 'UK 10'],
      inStock: true
    };

    const createRes = await axios.post(`${BASE_URL}/api/seller/products`, sampleProduct);
    createdProductId = createRes.data.product?.id;
    report('6. Create Product with Category & Photo', createRes.data.success && Boolean(createdProductId),
      `Product ID: ${createdProductId}, Name: ${createRes.data.product?.name}, Price: ₹${createRes.data.product?.salePrice}`);
  } catch (err) {
    report('6. Create Product with Category & Photo', false, err.message);
  }

  // 7. Verify Product in MongoDB directly
  try {
    if (db.mongoDb && createdProductId) {
      const doc = await db.mongoDb.collection('products').findOne({ id: createdProductId });
      report('7. Verify Product in MongoDB DBMS Collection', Boolean(doc && doc.id === createdProductId),
        `Found in MongoDB 'products' collection: ${doc?.name} (Category: ${doc?.category})`);
    } else {
      report('7. Verify Product in MongoDB DBMS Collection', false, 'MongoDB collection not accessible');
    }
  } catch (err) {
    report('7. Verify Product in MongoDB DBMS Collection', false, err.message);
  }

  // 8. Verify Product via GET /api/products/:id
  try {
    if (createdProductId) {
      const getRes = await axios.get(`${BASE_URL}/api/products/${createdProductId}`);
      report('8. Retrieve Product via REST API', getRes.data.success && getRes.data.product?.id === createdProductId,
        `Retrieved: ${getRes.data.product?.name}, Image: ${getRes.data.product?.imageUrl}`);
    }
  } catch (err) {
    report('8. Retrieve Product via REST API', false, err.message);
  }

  // 9. Update Product in DBMS
  try {
    if (createdProductId) {
      const updateRes = await axios.put(`${BASE_URL}/api/products/${createdProductId}`, {
        stockCount: 40,
        salePrice: 2499
      });
      report('9. Update Product in DBMS', updateRes.data.success && updateRes.data.product?.stockCount === 40,
        `Updated Stock: ${updateRes.data.product?.stockCount}, New Sale Price: ₹${updateRes.data.product?.salePrice}`);
    }
  } catch (err) {
    report('9. Update Product in DBMS', false, err.message);
  }

  // 10. Clean up test product
  try {
    if (createdProductId) {
      const delRes = await axios.delete(`${BASE_URL}/api/products/${createdProductId}`);
      report('10. Delete Test Product from DBMS', delRes.data.success,
        `Deleted ID: ${createdProductId}`);
    }
  } catch (err) {
    report('10. Delete Test Product from DBMS', false, err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification();
