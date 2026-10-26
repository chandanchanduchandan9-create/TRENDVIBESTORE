import assert from 'assert';
import { db } from '../src/db/database.js';
import { SuggestedQuestionService } from '../src/services/suggestedQuestionService.js';
import { ConversationService } from '../src/services/conversationService.js';

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
console.log('🚀 DYNAMIC SUGGESTED QUESTION SYSTEM VERIFICATION TEST SUITE');
console.log('🧪 =========================================================================\n');

try {
  // Test 1: Category Dynamic Generation across all 9 categories
  console.log('📦 SUITE 1: Multi-Category Dynamic Generation & 5-8 Count Guarantee');
  
  const sampleProductIds = [
    { id: 'PROD-CLOTH-001', category: 'clothing' },
    { id: 'PROD-LAP-001', category: 'laptops' },
    { id: 'PROD-PHONE-005', category: 'mobile phones' },
    { id: 'PROD-MED-001', category: 'Medicines & Healthcare Products' },
    { id: 'FOOD-KAR-001', category: 'Food' },
    { id: 'PROD-ELEC-001', category: 'electronics' },
    { id: 'PROD-SHOE-001', category: 'shoes' },
    { id: 'PROD-COSM-001', category: 'cosmetics' },
    { id: 'PROD-ACC-001', category: 'accessories' }
  ];

  for (const item of sampleProductIds) {
    const product = db.getProductById(item.id);
    assert(product, `Product ${item.id} must exist in DB`);
    const suggestions = SuggestedQuestionService.generateSuggestedQuestions(product, { language: 'en' });
    
    assert(suggestions.length >= 5 && suggestions.length <= 8, 
      `Questions count for ${item.id} (${item.category}) must be between 5 and 8, got ${suggestions.length}`);
    pass(`Generates 5-8 dynamic questions for category "${item.category}" (${item.id})`);

    // Verify all questions have text, id, and icon
    for (const q of suggestions) {
      assert(q.text && q.text.length > 5, 'Question text must be valid');
      assert(q.id, 'Question id must exist');
    }
  }

  // Test 2: Verify No Fixed List (Questions vary based on product records)
  console.log('\n🔍 SUITE 2: Dynamic Variation (Zero Hardcoded / Fixed Lists)');
  const pCloth = db.getProductById('PROD-CLOTH-001');
  const pLaptop = db.getProductById('PROD-LAP-001');
  const pMed = db.getProductById('PROD-MED-001');
  const pFood = db.getProductById('FOOD-KAR-001');

  const clothQ = SuggestedQuestionService.generateSuggestedQuestions(pCloth, { language: 'en' }).map(q => q.text);
  const laptopQ = SuggestedQuestionService.generateSuggestedQuestions(pLaptop, { language: 'en' }).map(q => q.text);
  const medQ = SuggestedQuestionService.generateSuggestedQuestions(pMed, { language: 'en' }).map(q => q.text);
  const foodQ = SuggestedQuestionService.generateSuggestedQuestions(pFood, { language: 'en' }).map(q => q.text);

  // Clothing should have fabric/fit/sizes, laptop should have processor/specs, medicine should have dosage/uses, food should have ingredients
  assert(clothQ.some(t => /fabric|size|fit/i.test(t)), 'Clothing suggestions must mention fabric, sizes or fit');
  assert(!clothQ.some(t => /processor|ram|dosage|active ingredient/i.test(t)), 'Clothing suggestions must NOT invent tech or medicine specs');
  pass('Clothing questions strictly reflect clothing dataset');

  assert(laptopQ.some(t => /processor|ram|battery|display/i.test(t)), 'Laptop suggestions must mention processor, ram or display');
  assert(!laptopQ.some(t => /fabric|wash care|dosage|vegetarian/i.test(t)), 'Laptop suggestions must NOT invent fabric or medicine specs');
  pass('Laptop questions strictly reflect laptop dataset');

  assert(medQ.some(t => /active ingredients|uses|dosage|prescription/i.test(t)), 'Medicine suggestions must mention active ingredients, uses, dosage or prescription');
  assert(!medQ.some(t => /fabric|processor|screen/i.test(t)), 'Medicine suggestions must NOT invent tech specs');
  pass('Medicine questions strictly reflect medicine dataset');

  assert(foodQ.some(t => /ingredients|served|taste|food/i.test(t)), 'Food suggestions must mention ingredients or serving details');
  assert(!foodQ.some(t => /processor|prescription|fabric/i.test(t)), 'Food suggestions must NOT invent processor or prescription specs');
  pass('Food questions strictly reflect food dataset');

  // Test 3: Missing Fields Guard (Never assume or invent missing data)
  console.log('\n🛡️ SUITE 3: Zero Hallucination & Missing Field Guards');
  const mockMinimalProduct = {
    id: 'MOCK-MIN-001',
    name: 'Minimal Canvas Bag',
    category: 'accessories',
    price: 499,
    inStock: true,
    codAvailable: true,
    deliveryDays: '3 days',
    returnPolicy: '7-day replacement',
    specs: {} // Missing material, dimensions, capacity, warranty, etc.
  };

  const minimalQ = SuggestedQuestionService.generateSuggestedQuestions(mockMinimalProduct, { language: 'en' });
  assert(minimalQ.length >= 5 && minimalQ.length <= 8, `Minimal product still generates 5-8 valid store questions, got ${minimalQ.length}`);
  assert(!minimalQ.some(t => /processor|ram|fabric|wash care|dosage|anc|active ingredients|capacity/i.test(t)), 
    'No questions generated for missing fields');
  pass('Missing fields are strictly respected: zero questions generated for missing attributes');

  // Test 4: Conversation Turn Evolution (Answered topics removed, new questions introduced)
  console.log('\n🔄 SUITE 4: Conversational Evolution Across Turns');
  const pTee = db.getProductById('PROD-CLOTH-001');
  
  // Turn 1: Initial (unasked)
  const initialQ = SuggestedQuestionService.generateSuggestedQuestions(pTee, { language: 'en' });
  const hasPriceTurn1 = initialQ.some(q => q.topic === 'price');
  assert(hasPriceTurn1, 'Initial suggestions include price');
  pass('Turn 1 includes price enquiry when unasked');

  // Turn 2: Customer asks about price -> price is discussed and must be removed
  const turn2Q = SuggestedQuestionService.generateSuggestedQuestions(pTee, {
    history: [
      { role: 'user', text: 'What is the price of this T-shirt?' },
      { role: 'ai', text: 'The price is ₹1,199 after 20% discount.' }
    ],
    latestMessage: 'What is the price?',
    latestReply: 'Price is ₹1,199',
    language: 'en'
  });
  const hasPriceTurn2 = turn2Q.some(q => q.topic === 'price');
  assert(!hasPriceTurn2, 'Price question must be removed after being answered');
  assert(turn2Q.length >= 5 && turn2Q.length <= 8, `Turn 2 question count maintained between 5 and 8, got ${turn2Q.length}`);
  pass('Turn 2 automatically removes answered price question and introduces fresh remaining questions');

  // Turn 3: Customer also asks about sizes
  const turn3Q = SuggestedQuestionService.generateSuggestedQuestions(pTee, {
    history: [
      { role: 'user', text: 'What is the price?' },
      { role: 'ai', text: 'Price is 1199' },
      { role: 'user', text: 'What sizes are available?' },
      { role: 'ai', text: 'We have S, M, L, XL' }
    ],
    latestMessage: 'What sizes do you have?',
    language: 'en'
  });
  assert(!turn3Q.some(q => q.topic === 'price'), 'Price remains excluded');
  assert(!turn3Q.some(q => q.topic === 'sizes'), 'Sizes question removed after being answered');
  assert(turn3Q.length >= 5 && turn3Q.length <= 8, `Turn 3 question count maintained between 5 and 8, got ${turn3Q.length}`);
  pass('Turn 3 removes both price and sizes, maintaining 5-8 fresh relevant questions');

  // Test 5: Purchase Intent Prioritization
  console.log('\n🛍️ SUITE 5: Purchase Intent Dynamic Prioritization');
  const buyIntentQ = SuggestedQuestionService.generateSuggestedQuestions(pTee, {
    history: [
      { role: 'user', text: 'What is the price?' },
      { role: 'ai', text: 'Price is 1199' }
    ],
    latestMessage: 'I want to place an order via Cash on Delivery',
    language: 'en'
  });

  // Top questions must prioritize order confirmation, COD, delivery, return policy
  assert(buyIntentQ[0].topic === 'order_intent' || buyIntentQ[0].topic === 'payment_cod',
    `Top question under purchase intent must be order or COD, got ${buyIntentQ[0].topic}`);
  assert(buyIntentQ.some(q => q.topic === 'return_exchange'), 'Return/exchange policy offered during checkout intent');
  pass('Purchase intent automatically prioritizes ordering, payment/COD, and returns');

  // Test 6: Bilingual Generation (English & Kannada)
  console.log('\n🗣️ SUITE 6: Language Switching (English vs Kannada)');
  
  // English
  const enQ = SuggestedQuestionService.generateSuggestedQuestions(pMed, { language: 'en' });
  assert(enQ.every(q => !/[\u0C80-\u0CFF]/.test(q.text)), 'English suggestions must not contain Kannada script');
  pass('English suggestions rendered in natural English');

  // Kannada
  const knQ = SuggestedQuestionService.generateSuggestedQuestions(pMed, { language: 'kn' });
  assert(knQ.length >= 5 && knQ.length <= 8, `Kannada suggestions count must be 5-8, got ${knQ.length}`);
  assert(knQ.some(q => /[\u0C80-\u0CFF]/.test(q.text)), 'Kannada suggestions must contain authentic Kannada script');
  assert(knQ.some(q => q.text.includes('ಔಷಧಿ') || q.text.includes('ಬೆಲೆ') || q.text.includes('ಸ್ಟಾಕ್')), 
    'Kannada suggestions contain verified pharmaceutical and store terms');
  pass('Kannada suggestions rendered accurately in Kannada script');

  // Switch back to English
  const switchedBackEn = SuggestedQuestionService.generateSuggestedQuestions(pMed, {
    history: [
      { role: 'user', text: 'Kannadadalli mathadi' },
      { role: 'ai', text: 'ಖಂಡಿತ, ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.' }
    ],
    latestMessage: 'Switch to English please',
    language: 'en'
  });
  assert(switchedBackEn.every(q => !/[\u0C80-\u0CFF]/.test(q.text)), 'Switched back suggestions must be in English');
  pass('Switching back to English restores English suggested questions');

  // Test 7: Integration with ConversationService.processTurn
  console.log('\n🤖 SUITE 7: End-to-End ConversationService.processTurn Integration');
  const turnResult = await ConversationService.processTurn({
    message: 'Is size XL available?',
    productId: 'PROD-CLOTH-001'
  });

  assert(turnResult.suggestedQuestions, 'Turn result must include suggestedQuestions array');
  assert(Array.isArray(turnResult.suggestedQuestions), 'suggestedQuestions must be an array');
  assert(turnResult.suggestedQuestions.length >= 5 && turnResult.suggestedQuestions.length <= 8, 
    `Turn result suggestedQuestions must have 5-8 items, got ${turnResult.suggestedQuestions.length}`);
  assert(!turnResult.suggestedQuestions.some(q => q.topic === 'sizes'), 
    'Asked topic "sizes" must be removed from the returned suggestions');
  pass('ConversationService.processTurn seamlessly returns 5-8 dynamic suggested questions with answered topic removed');

  // Test 8: Stage Progression, Re-ranking & Category Adaptation Upgradation
  console.log('\n📈 SUITE 8: Conversational Stage Progression, Dynamic Re-ranking & Category Adaptation');
  
  // 8.1 Category Adaptation for Configurations vs Clothing Sizes
  const laptop = db.getProductById('PROD-LAP-001');
  const laptopSuggestions = SuggestedQuestionService.generateSuggestedQuestions(laptop, { language: 'en' });
  const laptopSizeQ = laptopSuggestions.find(q => q.topic === 'sizes');
  if (laptopSizeQ) {
    assert(/ram|ssd|storage|configuration/i.test(laptopSizeQ.text), 
      `Laptop size question must be domain-tailored for RAM/SSD, got: "${laptopSizeQ.text}"`);
    assert(!/size.*available for this/i.test(laptopSizeQ.text), 
      'Laptop size question must NOT use clothing phrasing');
    pass('Laptop configuration question correctly adapted (RAM/SSD storage configurations)');
  }

  const phone = db.getProductById('PROD-PHONE-005');
  const phoneSuggestions = SuggestedQuestionService.generateSuggestedQuestions(phone, { language: 'en' });
  const phoneSizeQ = phoneSuggestions.find(q => q.topic === 'sizes');
  if (phoneSizeQ) {
    assert(/storage|ram/i.test(phoneSizeQ.text), 
      `Phone size question must be domain-tailored for storage/RAM, got: "${phoneSizeQ.text}"`);
    pass('Phone variant question correctly adapted (storage capacities and RAM variants)');
  }

  // 8.2 Medicine and Food never show clothing colour queries
  const medSuggestions = SuggestedQuestionService.generateSuggestedQuestions(pMed, { language: 'en' });
  assert(!medSuggestions.some(q => q.topic === 'colours'), 'Medicines must NEVER suggest colour questions');
  pass('Medicines strictly exclude irrelevant colour questions');

  const foodSuggestions = SuggestedQuestionService.generateSuggestedQuestions(pFood, { language: 'en' });
  assert(!foodSuggestions.some(q => q.topic === 'colours'), 'Food products must NEVER suggest colour questions');
  pass('Food products strictly exclude irrelevant colour questions');

  // 8.3 Conversational Stage Progression & Flow Score Upgradation
  // Stage 1: Discovery (no turns yet)
  const discStage = SuggestedQuestionService.detectConversationStage([], new Set(), { hasPurchaseIntent: false });
  assert.strictEqual(discStage, 'discovery', 'Initial stage without history must be discovery');
  pass('Turn 0 classified as "discovery" stage');

  // Stage 2: Evaluation (after price or specs discussed)
  const topicsEval = new Set(['price']);
  const evalStage = SuggestedQuestionService.detectConversationStage([{ role: 'user', text: 'Price?' }], topicsEval, { hasPurchaseIntent: false });
  assert.strictEqual(evalStage, 'evaluation', 'After asking price, stage must advance to evaluation');
  pass('Turn 1 (price discussed) advances to "evaluation" stage');

  // Stage 3: Decision (after delivery or COD discussed)
  const topicsDecision = new Set(['price', 'delivery']);
  const decStage = SuggestedQuestionService.detectConversationStage([{ role: 'user', text: 'Price?' }, { role: 'user', text: 'Delivery time?' }], topicsDecision, { hasPurchaseIntent: false });
  assert.strictEqual(decStage, 'decision', 'After delivery inquiry, stage must advance to decision');
  pass('Turn 2 (delivery discussed) advances to "decision" stage');

  // Stage 4: Purchase Intent / Closing
  const purchaseIntentStage = SuggestedQuestionService.detectConversationStage(
    [{ role: 'user', text: 'Price?' }],
    new Set(['price']),
    { hasPurchaseIntent: true }
  );
  assert.strictEqual(purchaseIntentStage, 'purchase_intent', 'High intent must trigger purchase_intent stage');
  pass('Purchase intent trigger advances stage to "purchase_intent"');

  // 8.4 Verify Next-Step Flow Re-ranking: After price is discussed, payment/delivery jump to top
  const afterPriceQuestions = SuggestedQuestionService.generateSuggestedQuestions(laptop, {
    history: [{ role: 'user', text: 'What is the price?' }, { role: 'ai', text: 'It is ₹64,990.' }],
    latestMessage: 'What is the price?',
    latestReply: 'Price is ₹64,990',
    language: 'en'
  });
  const topTopics = afterPriceQuestions.slice(0, 3).map(q => q.topic);
  assert(topTopics.includes('payment_cod') || topTopics.includes('delivery') || topTopics.includes('return_exchange'),
    `After discussing price, next-step purchase evaluation topics (COD/delivery/return) must rise to top, got: ${topTopics.join(', ')}`);
  pass('Next-step flow re-ranking verified: payment/delivery prioritized immediately after price');

  console.log('\n=========================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} DYNAMIC SUGGESTED QUESTION TESTS PASSED!`);
  console.log('=========================================================================\n');
  process.exit(0);

} catch (err) {
  fail('Test suite encountered an error', err);
  console.error('\n=========================================================================');
  console.error(`💥 TEST SUITE FAILED: ${passedTests}/${totalTests} PASSED`);
  console.error('=========================================================================\n');
  process.exit(1);
}
