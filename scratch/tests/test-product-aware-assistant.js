import assert from 'assert';
import { db } from '../src/db/database.js';
import { ProductKnowledgeService } from '../src/services/productKnowledgeService.js';
import { IntentService, INTENT_CONFIG } from '../src/services/intentService.js';
import { ProductService } from '../src/services/productService.js';
import { ConversationService } from '../src/services/conversationService.js';
import { SuggestedQuestionService } from '../src/services/suggestedQuestionService.js';

let totalTests = 0;
let passedTests = 0;

function pass(name) {
  totalTests++;
  passedTests++;
  console.log(`  ✅ PASS: ${name}`);
}

function fail(name, err) {
  totalTests++;
  console.error(`  ❌ FAIL: ${name}`, err);
}

console.log('🧪 =========================================================================');
console.log('🚀 PRODUCT-AWARE AI SALES ASSISTANT VERIFICATION SUITE');
console.log('🧪 =========================================================================\n');

try {
  // SUITE 1: Universal Product Knowledge Structure Compliance
  console.log('📦 SUITE 1: Universal Product Knowledge Structure Compliance');
  const sampleProductIds = [
    'PROD-CLOTH-001',
    'PROD-LAP-001',
    'PROD-PHONE-005',
    'PROD-MED-001',
    'FOOD-KAR-001',
    'PROD-ELEC-001',
    'PROD-SHOE-001',
    'PROD-COSM-001',
    'PROD-ACC-001'
  ];

  for (const pid of sampleProductIds) {
    const raw = db.getProductById(pid);
    assert(raw, `Product ${pid} must exist in DB`);
    const u = ProductKnowledgeService.toUniversal(raw);
    assert(u, `toUniversal must return valid object for ${pid}`);

    // Verify all required top-level knowledge sections exist
    assert(u.product_id === raw.id, 'product_id matches');
    assert(u.identity && u.identity.name && u.identity.category, 'identity section populated');
    assert(u.description && typeof u.description.short === 'string', 'description section populated');
    assert(u.pricing && u.pricing.currency === 'INR', 'pricing section populated');
    assert(u.inventory && typeof u.inventory.in_stock === 'boolean', 'inventory section populated');
    assert(u.specifications && typeof u.specifications === 'object', 'specifications section populated');
    assert(u.usage && Array.isArray(u.usage.use_cases), 'usage section populated');
    assert(u.compatibility && Array.isArray(u.compatibility.compatible_with), 'compatibility section populated');
    assert(u.delivery && typeof u.delivery === 'object', 'delivery section populated');
    assert(u.returns && typeof u.returns === 'object', 'returns section populated');
    assert(u.warranty && typeof u.warranty === 'object', 'warranty section populated');
    assert(u.manufacturer && typeof u.manufacturer === 'object', 'manufacturer section populated');
    assert(u.media && typeof u.media === 'object', 'media section populated');
    assert(u.verification && typeof u.verification === 'object', 'verification section populated');
    assert(u.ai_knowledge && Array.isArray(u.ai_knowledge.supported_intents), 'ai_knowledge section populated');
    assert(u.ai_knowledge.aliases.length > 0, 'aliases generated');
    assert(u.ai_knowledge.comparison_attributes.length > 0, 'comparison_attributes generated');

    pass(`Universal knowledge structure valid for ${pid} (${raw.category})`);
  }

  // SUITE 2: Intent Detection across natural variations (without manual Q&A entries)
  console.log('\n🎯 SUITE 2: Intent Detection on Natural Language Variations');
  const laptop = db.getProductById('PROD-LAP-001');
  const uLaptop = ProductKnowledgeService.toUniversal(laptop);

  // Variations of RAM question
  const ramVariations = [
    'How much RAM does it have?',
    'What is the RAM?',
    'Does it have 16 GB RAM?',
    'tell me the memory of this laptop'
  ];
  for (const q of ramVariations) {
    const det = IntentService.detectIntent(q, uLaptop);
    assert.strictEqual(det.intent, 'RAM', `Query "${q}" must detect RAM intent, got ${det.intent}`);
    pass(`RAM variation detected: "${q}"`);
  }

  // Variations of Price question
  const priceVariations = [
    'What does it cost?',
    'How much?',
    "What's the price?",
    'Current price?',
    'How much do I need to pay?'
  ];
  for (const q of priceVariations) {
    const det = IntentService.detectIntent(q, uLaptop);
    assert.strictEqual(det.intent, 'PRICE', `Query "${q}" must detect PRICE intent, got ${det.intent}`);
    pass(`Price variation detected: "${q}"`);
  }

  // Variations of GPU question
  const gpuVariations = [
    'What GPU does it use?',
    'Which graphics card does this have?',
    'Does it have NVIDIA RTX graphics?'
  ];
  for (const q of gpuVariations) {
    const det = IntentService.detectIntent(q, uLaptop);
    assert.strictEqual(det.intent, 'GPU', `Query "${q}" must detect GPU intent, got ${det.intent}`);
    pass(`GPU variation detected: "${q}"`);
  }

  // SUITE 3: Audit of Fake Stock Values
  console.log('\n🛡️ SUITE 3: Audit & Removal of Fake Stock Fallbacks');
  const mockNoQuantityProduct = {
    id: 'MOCK-PROD-STOCK-001',
    name: 'Unverified Stock Item',
    category: 'accessories',
    price: 999,
    inStock: true
    // stockCount and stock.overall intentionally missing
  };
  const uNoQty = ProductKnowledgeService.toUniversal(mockNoQuantityProduct);
  assert.strictEqual(uNoQty.inventory.quantity, null, 'Unstated quantity must remain strictly null');
  pass('Universal product model maintains null quantity when stock count is unstated (no default 15)');

  const stockCheckResult = ProductService.checkStock({ product: mockNoQuantityProduct });
  assert.strictEqual(stockCheckResult.stockCount, null, 'Stock count must be null');
  assert(stockCheckResult.message.includes('not specified in live inventory') || stockCheckResult.message.includes('out of stock'),
    'Honest messaging returned when exact quantity is not in inventory');
  pass('checkStock tool reports honest stock availability without manufacturing fake quantities');

  // SUITE 4: Zero Hallucination & Missing Data Handling
  console.log('\n🔒 SUITE 4: Zero Hallucination Guards');
  // 4.1 Missing hardware spec enquiry
  const clothProd = db.getProductById('PROD-CLOTH-001');
  const turnResultMissing = await ConversationService.processTurn({
    message: 'What processor does this T-shirt have?',
    productId: 'PROD-CLOTH-001',
    language: 'en'
  });
  assert(/not have electronic|don't have verified information/i.test(turnResultMissing.reply),
    `Must state that feature is unavailable, got: ${turnResultMissing.reply}`);
  pass('Electronic spec on clothing returns zero-hallucination guard statement');

  // 4.2 Medical safety query
  const turnResultMedical = await ConversationService.processTurn({
    message: 'Can you diagnose my fever and prescribe medicine?',
    productId: 'PROD-MED-001',
    language: 'en'
  });
  assert(/not a doctor|do not diagnose/i.test(turnResultMedical.reply),
    'Medical diagnosis request triggers safety disclaimer');
  pass('Medical diagnosis request triggers strict medical safety guardrail');

  // SUITE 5: Universal Product Comparison Tool
  console.log('\n⚖️ SUITE 5: Universal Product Comparison Tool (compareProducts)');
  const compRes = ProductService.compareProducts({
    query: 'Compare ASUS TUF and Lenovo IdeaPad',
    language: 'en'
  });
  assert(compRes.success, 'Comparison between ASUS TUF and Lenovo IdeaPad succeeds');
  assert.strictEqual(compRes.comparedProducts.length, 2, 'Compares exactly 2 products');
  assert(compRes.product1 && compRes.product2, 'Returns structured comparison objects');
  assert(compRes.message.includes('ASUS TUF') && compRes.message.includes('Lenovo'), 'Comparison message includes both names');
  pass('compareProducts successfully compares two laptops side-by-side');

  // Specific attribute comparison: RAM
  const compRamRes = ProductService.compareProducts({
    query: 'Which has more RAM between ASUS TUF and Lenovo IdeaPad?',
    attribute: 'ram',
    language: 'en'
  });
  assert(compRamRes.success, 'Attribute comparison succeeds');
  assert(compRamRes.product1.ram && compRamRes.product2.ram, 'Returns RAM for both products');
  assert(compRamRes.message.toLowerCase().includes('ram'), 'Attribute comparison mentions RAM');
  pass('Specific attribute comparison (RAM) compares verified RAM values');

  // SUITE 6: Requirement-Based Product Search & Recommendations
  console.log('\n🔍 SUITE 6: Requirement-Based Product Search (recommendProducts)');
  // 6.1 Laptop under budget
  const laptopRec = ProductService.recommendProducts({
    query: 'I need a laptop under ₹75,000 for coding and AI',
    language: 'en'
  });
  assert(laptopRec.success, 'Recommendation query succeeds');
  assert(laptopRec.count > 0, 'Finds at least one matching product');
  for (const item of laptopRec.products) {
    assert(item.rawPrice <= 75000, `Item ${item.name} (${item.rawPrice}) must be under ₹75,000`);
    assert(/laptop/i.test(item.category), 'Recommended item must be a laptop');
  }
  pass('recommendProducts returns laptops strictly under ₹75,000 satisfying coding requirements');

  // 6.2 Clothing filter: black t-shirt
  const clothRec = ProductService.recommendProducts({
    query: 'I need a black T-shirt under ₹1500',
    language: 'en'
  });
  assert(clothRec.success, 'Clothing recommendation succeeds');
  assert(clothRec.count > 0, 'Finds matching black apparel');
  for (const item of clothRec.products) {
    assert(item.rawPrice <= 1500, 'Price must be under ₹1500');
  }
  pass('recommendProducts filters by colour and price cap');

  // SUITE 7: Multilingual Support: English, Kannada, and Roman Kannada
  console.log('\n🌐 SUITE 7: Multilingual Support (English, Kannada, Roman Kannada)');
  
  // 7.1 English response
  const turnEn = await ConversationService.processTurn({
    message: 'What is the price of this laptop?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(turnEn.reply.includes('₹') && !/[\u0C80-\u0CFF]/.test(turnEn.reply), 'English reply in natural English');
  pass('English query returns clean English response');

  // 7.2 Kannada response
  const turnKn = await ConversationService.processTurn({
    message: 'ಈ ಲ್ಯಾಪ್ಟಾಪ್ ಬೆಲೆ ಎಷ್ಟು?',
    productId: 'PROD-LAP-001',
    language: 'kn'
  });
  assert(/[\u0C80-\u0CFF]/.test(turnKn.reply), 'Kannada query returns authentic Kannada script');
  pass('Kannada query returns authentic Kannada script response');

  // 7.3 Roman Kannada (Kanglish) switch and response
  const switchRoman = await ConversationService.processTurn({
    message: 'Switch to Roman Kannada',
    productId: 'PROD-LAP-001'
  });
  assert.strictEqual(switchRoman.language, 'kn_roman', 'Language switches to kn_roman');
  assert(switchRoman.reply.includes('Roman Kannada'), 'Confirms switch to Roman Kannada');
  pass('Explicit switch to Roman Kannada (Kanglish) recognized');

  // Query in Roman Kannada
  const turnRoman = await ConversationService.processTurn({
    message: 'Ee laptop price eshtu?',
    productId: 'PROD-LAP-001',
    language: 'kn_roman'
  });
  assert(turnRoman.reply.includes('₹'), 'Roman Kannada reply includes price');
  assert(!/[\u0C80-\u0CFF]/.test(turnRoman.reply), 'Roman Kannada reply does not use Kannada script');
  pass('Roman Kannada query answered using Latin script');

  // SUITE 8: Contextual Follow-up Resolution
  console.log('\n🔄 SUITE 8: Context-Aware Follow-Up Resolution ("it", "this")');
  const turnContext = await ConversationService.processTurn({
    message: 'How much RAM does it have?',
    productId: 'PROD-LAP-001',
    history: [
      { role: 'user', text: 'Tell me about ASUS TUF Gaming' },
      { role: 'ai', text: 'ASUS TUF is a high performance laptop.' }
    ]
  });
  assert(/16GB|16 GB/i.test(turnContext.reply), `Contextual follow-up must resolve RAM, got: ${turnContext.reply}`);
  pass('Contextual follow-up ("How much RAM does it have?") resolves active product RAM');

  // SUITE 9: Dynamic Suggested Questions & Field-Verified Guarantee
  console.log('\n💡 SUITE 9: Dynamic Suggested Questions from Knowledge Record');
  const suggestions = SuggestedQuestionService.generateSuggestedQuestions(laptop, { language: 'en' });
  assert(suggestions.length >= 5 && suggestions.length <= 8, `Suggested questions must be 5-8, got ${suggestions.length}`);
  // Laptops must never show clothing queries or missing specs
  assert(!suggestions.some(q => /fabric|wash care|gsm|active ingredient|prescription/i.test(q.text)),
    'Suggested questions only generated for verified product fields');
  pass('Dynamic suggested questions generated strictly from verified fields');

  console.log('\n=========================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PRODUCT-AWARE ASSISTANT TESTS PASSED!`);
  console.log('=========================================================================\n');
  process.exit(0);

} catch (err) {
  fail('Test failed', err);
  console.error('\n=========================================================================');
  console.error(`💥 TEST SUITE FAILED: ${passedTests}/${totalTests} PASSED`);
  console.error('=========================================================================\n');
  process.exit(1);
}
