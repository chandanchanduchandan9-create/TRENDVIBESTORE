import assert from 'assert';
import { MongoClient } from 'mongodb';
import { ConversationService } from '../src/services/conversationService.js';
import { db } from '../src/db/database.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'trendvibe';

async function runHealthcareGuidanceTests() {
  console.log('\n====================================================');
  console.log('🩺 TRENDVIBE MENTHO PLUS HEALTHCARE GUIDANCE VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // Ensure DB is initialized
  await db.initializeMongo();

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const mongoDb = client.db(DB_NAME);

  console.log('--- TEST SUITE 1: MongoDB Product Document & Healthcare Schema ---');

  await testAsync('1.1 Mentho Plus Balm document exists in MongoDB trendvibe.products', async () => {
    const doc = await mongoDb.collection('products').findOne({ id: 'PROD-MED-015' });
    assert(doc, 'Mentho Plus Balm record not found in MongoDB');
    assert.strictEqual(doc.id, 'PROD-MED-015');
    assert.strictEqual(doc.sku, 'MOCK-MENTHO-8ML');
    assert(doc.name.includes('Mentho Plus'));
  });

  await testAsync('1.2 Mentho Plus Balm record is not duplicated in MongoDB', async () => {
    const count = await mongoDb.collection('products').countDocuments({ id: 'PROD-MED-015' });
    assert.strictEqual(count, 1, `Expected exactly 1 Mentho Plus Balm record in MongoDB, found ${count}`);
  });

  await testAsync('1.3 Healthcare guidance Sections A through F are present and complete', async () => {
    const doc = await mongoDb.collection('products').findOne({ id: 'PROD-MED-015' });
    const hc = doc.healthcareDetails;
    assert(hc, 'healthcareDetails missing');
    assert(hc.productInformation, 'Section A: productInformation missing');
    assert(hc.usageInstructions, 'Section B: usageInstructions missing');
    assert(hc.childrenSafety, 'Section C: childrenSafety missing');
    assert(hc.warningsAndPrecautions, 'Section D: warningsAndPrecautions missing');
    assert(hc.sideEffectsAndEmergencyGuidance, 'Section E: sideEffectsAndEmergencyGuidance missing');
    assert(hc.storageAndVerification, 'Section F: storageAndVerification missing');

    // Section A checks
    assert.strictEqual(hc.productInformation.productName, 'Mentho Plus Balm');
    assert.strictEqual(hc.productInformation.manufacturer, 'Emami Limited');
    assert(hc.productInformation.ingredients.includes('Pudina ka Phool'));
    assert(Array.isArray(hc.productInformation.activeIngredients) && hc.productInformation.activeIngredients.length >= 4);

    // Section B checks
    assert(hc.usageInstructions.applicationMethod.includes('topical'));
    assert(hc.usageInstructions.applicationFrequency.includes('2 to 3 times'));

    // Section C checks
    assert.strictEqual(hc.childrenSafety.minimumApprovedAge, 6);
    assert.strictEqual(hc.childrenSafety.adultSupervisionRequired, true);

    // Section D checks
    assert(hc.warningsAndPrecautions.contraindications.length > 0);
    assert(hc.warningsAndPrecautions.eyeContactPrecautions.includes('water'));

    // Section E checks
    assert(hc.sideEffectsAndEmergencyGuidance.accidentalIngestionGuidance.includes('Do not induce vomiting'));

    // Section F checks
    assert.strictEqual(hc.storageAndVerification.batchNumber, 'EMP-2026-555');
    assert.strictEqual(hc.storageAndVerification.expiryDate, '2028-12-31');
  });

  console.log('\n--- TEST SUITE 2: Usage & Application Guidance ---');

  await testAsync('2.1 "How do I use Mentho Plus Balm?" routes to getMedicineUsage with verified directions', async () => {
    const res = await ConversationService.processTurn({ message: 'How do I use Mentho Plus Balm?' });
    assert.strictEqual(res.toolCalled, 'getMedicineUsage');
    assert(res.reply.toLowerCase().includes('topical') || res.reply.toLowerCase().includes('massage'), 'Expected topical/massage directions');
    assert(res.reply.toLowerCase().includes('forehead') || res.reply.toLowerCase().includes('temples'), 'Expected forehead/temple area directions');
  });

  await testAsync('2.2 "How often can I apply it?" routes to getMedicineFrequency with 2-3 times daily', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'How often can I apply it?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicineFrequency');
    assert(res.reply.includes('2 to 3 times'), 'Expected 2 to 3 times daily frequency');
  });

  console.log('\n--- TEST SUITE 3: Child Safety & 2-Year-Old Distinction ---');

  await testAsync('3.1 "Can children use this product?" provides cautious 6+ guidance with adult supervision', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'Can children use this product?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicineAgeSuitability');
    assert(res.reply.includes('6 years') && res.reply.includes('adult supervision'), 'Expected 6+ years with adult supervision');
    assert(res.reply.includes('not recommended for children under 2') || res.reply.includes('Not recommended'), 'Expected under 2 warning');
  });

  await testAsync('3.2 "Is this product safe for a two-year-old child?" explicitly denies use for 2-year-olds and advises pediatrician', async () => {
    const res = await ConversationService.processTurn({ message: 'Is this product safe for a two-year-old child?' });
    assert.strictEqual(res.toolCalled, 'getMedicineAgeSuitability');
    assert(res.reply.includes('NOT recommended') || res.reply.includes('not safe') || res.reply.includes('No,'), 'Expected explicit rejection for 2yo');
    assert(res.reply.toLowerCase().includes('pediatrician'), 'Expected pediatrician escalation');
  });

  console.log('\n--- TEST SUITE 4: Allergies, Sensitive Skin, Pregnancy & Emergency Guidance ---');

  await testAsync('4.1 "What are its ingredients?" routes to getMedicineIngredients with active herbal components', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'What are its ingredients?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicineIngredients');
    assert(res.reply.includes('Pudina ka Phool') && res.reply.includes('Kapoor'), 'Expected Pudina and Kapoor');
  });

  await testAsync('4.2 "What are the side effects?" routes to getMedicineSideEffects with mild cooling and serious reaction signs', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'What are the side effects?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicineSideEffects');
    assert(res.reply.toLowerCase().includes('cooling') || res.reply.toLowerCase().includes('tingling'), 'Expected cooling/tingling');
    assert(res.reply.toLowerCase().includes('soap and water') || res.reply.toLowerCase().includes('medical attention'), 'Expected reaction action guidance');
  });

  await testAsync('4.3 "Can I use it if I have sensitive skin?" advises patch test and forbids broken skin', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'Can I use it if I have sensitive skin?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicineSkinPrecautions');
    assert(res.reply.toLowerCase().includes('patch test'), 'Expected patch test recommendation');
    assert(res.reply.toLowerCase().includes('broken') || res.reply.toLowerCase().includes('wounded'), 'Expected broken skin warning');
  });

  await testAsync('4.4 "Can I use it during pregnancy or breastfeeding?" advises doctor consultation and avoids nursing breathing zone', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'Can I use it during pregnancy or breastfeeding?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicinePregnancySafety');
    assert(res.reply.toLowerCase().includes('doctor') || res.reply.toLowerCase().includes('healthcare professional'), 'Expected doctor advice');
  });

  await testAsync('4.5 "What should I do if it accidentally enters my eyes?" gives emergency 15-minute flush guidance without rubbing', async () => {
    const res = await ConversationService.processTurn({ message: 'What should I do if it accidentally enters my eyes?' });
    assert.strictEqual(res.toolCalled, 'getMedicineEyeContactGuidance');
    assert(res.reply.toLowerCase().includes('avoid rubbing') || res.reply.toLowerCase().includes('rubbing'), 'Expected avoid rubbing');
    assert(res.reply.toLowerCase().includes('15 minutes') || res.reply.toLowerCase().includes('water'), 'Expected 15 min water flush');
  });

  await testAsync('4.6 "What should I do if a child swallows it?" gives emergency ingestion guidance forbidding vomiting', async () => {
    const res = await ConversationService.processTurn({ message: 'What should I do if a child swallows it?' });
    assert.strictEqual(res.toolCalled, 'getMedicineIngestionEmergency');
    assert(res.reply.includes('NOT induce vomiting') || res.reply.includes('not induce vomiting'), 'Expected do NOT induce vomiting');
    assert(res.reply.toLowerCase().includes('poison') || res.reply.toLowerCase().includes('medical help') || res.reply.toLowerCase().includes('emergency'), 'Expected urgent medical help');
  });

  await testAsync('4.7 "How should I store it?" provides storage temperature and child safety', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'How should I store it?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicineStorage');
    assert(res.reply.includes('30°C') || res.reply.toLowerCase().includes('cool'), 'Expected temperature/cool storage');
  });

  await testAsync('4.8 "How can I check the expiry date?" provides batch, mfg, and expiry details', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'How can I check the expiry date?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicineExpiry');
    assert(res.reply.includes('EMP-2026-555') && res.reply.includes('2028-12-31'), 'Expected batch EMP-2026-555 and expiry 2028-12-31');
  });

  console.log('\n--- TEST SUITE 5: Missing / Unverified Fields Guardrail ---');

  await testAsync('5.1 Unverified medical claims state information is not verified and recommend label/doctor', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'What is the clinical trial efficacy rate for asthma cure?', product: menthoProd });
    assert.strictEqual(res.toolCalled, 'getMedicineUnverifiedInfo');
    assert(res.reply.toLowerCase().includes('not verified') || res.reply.toLowerCase().includes('not been verified'), 'Expected unverified disclaimer');
  });

  console.log('\n--- TEST SUITE 6: Complete Kannada Language Support ---');

  await testAsync('6.1 ಮೆಂಥೋ ಪ್ಲಸ್ ಬಾಮ್ ಅನ್ನು ಹೇಗೆ ಬಳಸಬೇಕು? -> getMedicineUsage in Kannada', async () => {
    const res = await ConversationService.processTurn({ message: 'ಮೆಂಥೋ ಪ್ಲಸ್ ಬಾಮ್ ಅನ್ನು ಹೇಗೆ ಬಳಸಬೇಕು?' });
    assert.strictEqual(res.toolCalled, 'getMedicineUsage');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('ಬಳಸುವ ವಿಧಾನ') || res.reply.includes('ಹಣೆಯ ಮೇಲೆ'));
  });

  await testAsync('6.2 ಮಕ್ಕಳಿಗೆ ಈ ಬಾಮ್ ಬಳಸಬಹುದೇ? -> getMedicineAgeSuitability in Kannada', async () => {
    const res = await ConversationService.processTurn({ message: 'ಮಕ್ಕಳಿಗೆ ಈ ಬಾಮ್ ಬಳಸಬಹುದೇ?' });
    assert.strictEqual(res.toolCalled, 'getMedicineAgeSuitability');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('6 ವರ್ಷ') || res.reply.includes('ಮೇಲ್ವಿಚಾರಣೆ'));
  });

  await testAsync('6.3 ಎರಡು ವರ್ಷದ ಮಗುವಿಗೆ ಇದು ಸುರಕ್ಷಿತವೇ? -> rejects 2yo in Kannada', async () => {
    const res = await ConversationService.processTurn({ message: 'ಎರಡು ವರ್ಷದ ಮಗುವಿಗೆ ಇದು ಸುರಕ್ಷಿತವೇ?' });
    assert.strictEqual(res.toolCalled, 'getMedicineAgeSuitability');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('ಸುರಕ್ಷಿತವಲ್ಲ') && res.reply.includes('ವೈದ್ಯರನ್ನು'));
  });

  await testAsync('6.4 ಇದರ ಅಡ್ಡಪರಿಣಾಮಗಳು ಯಾವುವು? -> getMedicineSideEffects in Kannada', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'ಇದರ ಅಡ್ಡಪರಿಣಾಮಗಳು ಯಾವುವು?', product: menthoProd, language: 'kn' });
    assert.strictEqual(res.toolCalled, 'getMedicineSideEffects');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('ಅಡ್ಡಪರಿಣಾಮಗಳು') || res.reply.includes('ತಂಪಾಗುವಿಕೆ'));
  });

  await testAsync('6.5 ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಇದನ್ನು ಬಳಸಬಹುದೇ? -> getMedicinePregnancySafety in Kannada', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಇದನ್ನು ಬಳಸಬಹುದೇ?', product: menthoProd, language: 'kn' });
    assert.strictEqual(res.toolCalled, 'getMedicinePregnancySafety');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('ಗರ್ಭಾವಸ್ಥೆ') && res.reply.includes('ವೈದ್ಯರ'));
  });

  await testAsync('6.6 ಮಗು ತಪ್ಪಾಗಿ ಇದನ್ನು ನುಂಗಿದರೆ ಏನು ಮಾಡಬೇಕು? -> getMedicineIngestionEmergency in Kannada', async () => {
    const res = await ConversationService.processTurn({ message: 'ಮಗು ತಪ್ಪಾಗಿ ಇದನ್ನು ನುಂಗಿದರೆ ಏನು ಮಾಡಬೇಕು?' });
    assert.strictEqual(res.toolCalled, 'getMedicineIngestionEmergency');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('ವಾಂತಿ ಮಾಡಿಸಬೇಡಿ') && res.reply.includes('ತುರ್ತು'));
  });

  await testAsync('6.7 ಈ ಬಾಮ್‌ನಲ್ಲಿರುವ ಪದಾರ್ಥಗಳು ಯಾವುವು? -> getMedicineIngredients in Kannada', async () => {
    const res = await ConversationService.processTurn({ message: 'ಈ ಬಾಮ್‌ನಲ್ಲಿರುವ ಪದಾರ್ಥಗಳು ಯಾವುವು?' });
    assert.strictEqual(res.toolCalled, 'getMedicineIngredients');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('ಪುದೀನಾ') || res.reply.includes('ಕರ್ಪೂರ'));
  });

  await testAsync('6.8 ಕಣ್ಣಿಗೆ ಬಿದ್ದರೆ ಏನು ಮಾಡಬೇಕು? -> getMedicineEyeContactGuidance in Kannada', async () => {
    const res = await ConversationService.processTurn({ message: 'ಕಣ್ಣಿಗೆ ಬಿದ್ದರೆ ಏನು ಮಾಡಬೇಕು?' });
    assert.strictEqual(res.toolCalled, 'getMedicineEyeContactGuidance');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('ಉಜ್ಜಬೇಡಿ') && res.reply.includes('ನೀರಿನಿಂದ'));
  });

  await testAsync('6.9 ದಿನಕ್ಕೆ ಎಷ್ಟು ಬಾರಿ ಹಚ್ಚಬಹುದು? -> getMedicineFrequency in Kannada', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'ದಿನಕ್ಕೆ ಎಷ್ಟು ಬಾರಿ ಹಚ್ಚಬಹುದು?', product: menthoProd, language: 'kn' });
    assert.strictEqual(res.toolCalled, 'getMedicineFrequency');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('2 ರಿಂದ 3 ಬಾರಿ'));
  });

  await testAsync('6.10 ಮುಕ್ತಾಯ ದಿನಾಂಕವನ್ನು ಹೇಗೆ ಪರಿಶೀಲಿಸುವುದು? -> getMedicineExpiry in Kannada', async () => {
    const menthoProd = db.getProductById('PROD-MED-015');
    const res = await ConversationService.processTurn({ message: 'ಮುಕ್ತಾಯ ದಿನಾಂಕವನ್ನು ಹೇಗೆ ಪರಿಶೀಲಿಸುವುದು?', product: menthoProd, language: 'kn' });
    assert.strictEqual(res.toolCalled, 'getMedicineExpiry');
    assert.strictEqual(res.language, 'kn');
    assert(res.reply.includes('ಮುಕ್ತಾಯ ದಿನಾಂಕ') && res.reply.includes('EMP-2026-555'));
  });

  console.log('\n--- TEST SUITE 7: Live MongoDB Compass Updates Reflection ---');

  await testAsync('7.1 Updates in MongoDB Compass are immediately reflected in next AI answer', async () => {
    const originalTemp = 'Store below 30°C in a cool, dry place away from direct heat and sunlight.';
    const updatedTemp = 'Store below 22°C in a temperature-controlled dark room (Compass Live Edit Test).';

    try {
      // 1. Simulate user updating storage temperature directly in MongoDB Compass
      await mongoDb.collection('products').updateOne(
        { id: 'PROD-MED-015' },
        { $set: { 'healthcareDetails.storageAndVerification.storageTemperature': updatedTemp } }
      );

      // 2. Query storage without restarting backend
      const menthoProd = db.getProductById('PROD-MED-015');
      const res = await ConversationService.processTurn({
        message: 'How should I store Mentho Plus Balm?',
        product: menthoProd
      });

      assert(res.reply.includes('Store below 22°C in a temperature-controlled dark room (Compass Live Edit Test)'),
        `Expected live reflection of MongoDB Compass update. Reply was: "${res.reply}"`);
    } finally {
      // 3. Restore original value in MongoDB
      await mongoDb.collection('products').updateOne(
        { id: 'PROD-MED-015' },
        { $set: { 'healthcareDetails.storageAndVerification.storageTemperature': originalTemp } }
      );

      // 4. Verify restoration
      const menthoProd = db.getProductById('PROD-MED-015');
      const restoredRes = await ConversationService.processTurn({
        message: 'How should I store Mentho Plus Balm?',
        product: menthoProd
      });
      assert(restoredRes.reply.includes('30°C'), 'Expected restored storage temperature in reply');
    }
  });

  console.log('\n--- TEST SUITE 8: Non-Medical & Unknown Product Isolation ---');

  await testAsync('8.1 Inquiries on shoes do NOT return Mentho Plus Balm answers', async () => {
    const shoeProduct = db.getProductById('PROD-SHOE-001') || { id: 'PROD-SHOE-001', name: 'Nike Running Shoes', category: 'Footwear' };
    const res = await ConversationService.processTurn({
      message: 'What are the ingredients?',
      product: shoeProduct
    });
    assert(!res.reply.includes('Mentho Plus'), 'Shoe query must NOT return Mentho Plus Balm');
    assert(!res.reply.includes('Pudina ka Phool'), 'Shoe query must NOT return Mentho ingredients');
  });

  await testAsync('8.2 Child inquiry on laptops does NOT return Mentho Plus Balm answers', async () => {
    const laptopProduct = db.getProductById('PROD-LAP-001') || { id: 'PROD-LAP-001', name: 'ASUS ROG Strix G16', category: 'Laptops' };
    const res = await ConversationService.processTurn({
      message: 'Can children use this?',
      product: laptopProduct
    });
    assert(!res.reply.includes('Mentho Plus'), 'Laptop query must NOT return Mentho Plus Balm');
    assert(!res.reply.includes('Pudina'), 'Laptop query must NOT return Mentho guidance');
  });

  await testAsync('8.3 Unknown product query does NOT return Mentho Plus Balm answers', async () => {
    const unknownProd = { id: 'PROD-UNKNOWN-999', name: 'Generic Kitchen Blender', category: 'Appliances' };
    const res = await ConversationService.processTurn({
      message: 'How do I use this?',
      product: unknownProd
    });
    assert(!res.reply.includes('Mentho Plus'), 'Generic appliance must NOT return Mentho Plus Balm');
    assert(!res.reply.includes('forehead'), 'Generic appliance must NOT return Mentho application directions');
  });

  await client.close();

  console.log('\n====================================================');
  console.log(`🎉 HEALTHCARE GUIDANCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runHealthcareGuidanceTests().catch(err => {
  console.error('Fatal error running healthcare guidance tests:', err);
  process.exit(1);
});
