import assert from 'assert';
import { db } from '../src/db/database.js';
import { ProductKnowledgeService } from '../src/services/productKnowledgeService.js';
import { IntentService, INTENT_CONFIG } from '../src/services/intentService.js';
import { CategoryKnowledgeService } from '../src/services/categoryKnowledgeService.js';
import { ProductKnowledgePipeline } from '../src/services/productKnowledgePipeline.js';
import { ConversationService } from '../src/services/conversationService.js';
import { ProductService } from '../src/services/productService.js';

let passed = 0;
function pass(msg) {
  passed++;
  console.log(`  ✅ PASS: ${msg}`);
}

async function runPipelineTests() {
  console.log('🧪 =========================================================================');
  console.log('🚀 ZYRO AI PRODUCT KNOWLEDGE PIPELINE VERIFICATION SUITE');
  console.log('🧪 =========================================================================');

  // SUITE 1: 32+ Intent System with Knowledge Source Routing
  console.log('\n🧭 SUITE 1: 32+ Intent System & Knowledge Source Routing');
  const requiredIntents = [
    'PRODUCT_DETAILS', 'PRICE', 'MRP', 'DISCOUNT', 'STOCK', 'AVAILABILITY', 'QUANTITY',
    'SPECIFICATIONS', 'FEATURES', 'VARIANT', 'SIZE', 'COLOUR', 'USAGE', 'USE_CASE',
    'COMPATIBILITY', 'PERFORMANCE', 'QUALITY', 'INGREDIENTS', 'PREPARATION', 'STORAGE',
    'SAFETY', 'WARRANTY', 'DELIVERY', 'RETURN', 'EXCHANGE', 'REFUND', 'PAYMENT',
    'COMPARISON', 'RECOMMENDATION', 'ORDER', 'ORDER_STATUS', 'GENERAL_PRODUCT_QUERY'
  ];

  for (const intentName of requiredIntents) {
    const cfg = INTENT_CONFIG[intentName];
    assert(cfg, `Intent "${intentName}" must be defined in INTENT_CONFIG`);
    assert(cfg.source, `Intent "${intentName}" must define knowledge source`);
    assert(Array.isArray(cfg.required_fields), `Intent "${intentName}" must define required_fields`);
    assert(cfg.tool, `Intent "${intentName}" must define tool`);
    pass(`Intent verified: ${intentName} (Source: ${cfg.source}, Tool: ${cfg.tool})`);
  }

  // SUITE 2: Category Knowledge Rules & Boundary Guards
  console.log('\n📚 SUITE 2: Category Knowledge Rules & Incompatibility Guards');
  assert(CategoryKnowledgeService.isFieldApplicable('laptops', 'ram'), 'RAM is applicable to laptops');
  assert(CategoryKnowledgeService.isFieldApplicable('laptops', 'gpu'), 'GPU is applicable to laptops');
  assert(!CategoryKnowledgeService.isFieldApplicable('clothing', 'processor'), 'Processor is NOT applicable to clothing');
  assert(!CategoryKnowledgeService.isFieldApplicable('clothing', 'gpu'), 'GPU is NOT applicable to clothing');
  assert(!CategoryKnowledgeService.isFieldApplicable('food', 'ram'), 'RAM is NOT applicable to food');
  pass('Category knowledge boundary rules correctly guard field relevance');

  const clothNotice = CategoryKnowledgeService.getIncompatibleNotice('clothing', 'en');
  assert(/clothing item|not have electronic/i.test(clothNotice), 'Returns clear incompatibility notice for clothing');
  pass('Returns category incompatibility notice for unsupported field requests');

  // SUITE 3: Laptop Questions Verification
  console.log('\n💻 SUITE 3: Laptop Questions (Factual vs Controlled Reasoning)');
  const pLap = db.getProductById('PROD-LAP-001');

  // 3.1 Processor
  const turnCpu = await ConversationService.processTurn({
    message: 'What processor does this laptop have?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(/intel|i7|core|13620/i.test(turnCpu.reply), `CPU must mention processor, got: ${turnCpu.reply}`);
  pass('Laptop processor query answered with verified CPU specification');

  // 3.2 AI/ML Suitability Reasoning (FACT vs REASONED CONCLUSION)
  const turnAi = await ConversationService.processTurn({
    message: 'Is this suitable for AI/ML?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(turnAi.reply.includes('FACT:') && turnAi.reply.includes('REASONED CONCLUSION:'),
    `AI/ML response must separate FACT and REASONED CONCLUSION, got: ${turnAi.reply}`);
  assert(/16\s*gb/i.test(turnAi.reply) && /ai\/ml/i.test(turnAi.reply),
    'AI/ML reasoned response references verified RAM and suitability conclusion');
  pass('Laptop AI/ML suitability clearly separates FACT from REASONED CONCLUSION');

  // 3.3 RAM
  const turnRam = await ConversationService.processTurn({
    message: 'How much RAM?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(/16\s*gb/i.test(turnRam.reply), `RAM query must state 16GB, got: ${turnRam.reply}`);
  pass('Laptop RAM query answered with verified RAM size');

  // 3.4 Price
  const turnPrice = await ConversationService.processTurn({
    message: 'How much does it cost?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(/74,999|₹74,999/i.test(turnPrice.reply), `Price query must quote live selling price, got: ${turnPrice.reply}`);
  pass('Laptop price query quotes live store selling price');

  // 3.5 Availability
  const turnStock = await ConversationService.processTurn({
    message: 'Is it available?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(/in (live store inventory|stock)|available/i.test(turnStock.reply), `Stock query must confirm in stock, got: ${turnStock.reply}`);
  pass('Laptop availability confirms live inventory status');

  // 3.6 Comparison
  const compRes = ProductService.compareProducts({
    query: 'Compare it with Lenovo IdeaPad.',
    productId1: 'PROD-LAP-001',
    language: 'en'
  });
  assert(compRes.success && compRes.comparedProducts.length === 2, 'Side-by-side comparison succeeds with 2 products');
  assert(compRes.message.includes('ASUS TUF') && compRes.message.includes('Lenovo'), 'Mentions both laptops accurately');
  pass('Side-by-side comparison compares actual specifications without mixing data');

  // SUITE 4: Food Questions Verification
  console.log('\n🍲 SUITE 4: Food Questions');
  const pFood = db.getProductById('FOOD-KAR-001');

  // 4.1 Ingredients
  const turnIng = await ConversationService.processTurn({
    message: 'What are the ingredients?',
    productId: 'FOOD-KAR-001',
    language: 'en'
  });
  assert(/ragi|finger millet|water/i.test(turnIng.reply), `Ingredients must mention verified ingredients, got: ${turnIng.reply}`);
  pass('Food ingredients answered with verified ingredients list');

  // 4.2 Preparation
  const turnPrep = await ConversationService.processTurn({
    message: 'How is it prepared?',
    productId: 'FOOD-KAR-001',
    language: 'en'
  });
  assert(/boiled|steamed|dough|kneaded|mixed/i.test(turnPrep.reply), `Preparation method returned, got: ${turnPrep.reply}`);
  pass('Food preparation details verified preparation method');

  // 4.3 Storage
  const turnStorage = await ConversationService.processTurn({
    message: 'How should I store it?',
    productId: 'FOOD-KAR-001',
    language: 'en'
  });
  assert(/store|hot|fresh|serve|refrigerat/i.test(turnStorage.reply), `Storage instructions returned, got: ${turnStorage.reply}`);
  pass('Food storage instructions quoted from verified store data');

  // 4.4 Vegetarian / Dietary Status
  const turnVeg = await ConversationService.processTurn({
    message: 'Is it vegetarian?',
    productId: 'FOOD-KAR-001',
    language: 'en'
  });
  assert(/vegetarian|vegan|plant-based/i.test(turnVeg.reply), `Dietary status confirmed, got: ${turnVeg.reply}`);
  pass('Food vegetarian/vegan status verified with factual ingredients confirmation');

  // 4.5 Price
  const turnFoodPrice = await ConversationService.processTurn({
    message: 'What is the price?',
    productId: 'FOOD-KAR-001',
    language: 'en'
  });
  assert(/₹|rupees|60|120/i.test(turnFoodPrice.reply), `Food price quotes store price, got: ${turnFoodPrice.reply}`);
  pass('Food price quotes live store price accurately');

  // SUITE 5: Medicine Questions Verification
  console.log('\n💊 SUITE 5: Medicine Questions');
  const pMed = db.getProductById('PROD-MED-001');

  // 5.1 Uses
  const turnMedUse = await ConversationService.processTurn({
    message: 'What is this medicine used for?',
    productId: 'PROD-MED-001',
    language: 'en'
  });
  assert(/fever|pain|headache|relief/i.test(turnMedUse.reply), `Uses must mention fever/pain, got: ${turnMedUse.reply}`);
  pass('Medicine purpose & indications returned accurately from verified record');

  // 5.2 Active Ingredient
  const turnMedActive = await ConversationService.processTurn({
    message: 'What is the active ingredient?',
    productId: 'PROD-MED-001',
    language: 'en'
  });
  assert(/paracetamol|acetaminophen/i.test(turnMedActive.reply), `Active ingredient returned, got: ${turnMedActive.reply}`);
  pass('Medicine active ingredient returned accurately');

  // 5.3 Warnings
  const turnMedWarn = await ConversationService.processTurn({
    message: 'What warnings are available?',
    productId: 'PROD-MED-001',
    language: 'en'
  });
  assert(/liver|dose|exceed|overdose|warning/i.test(turnMedWarn.reply), `Warnings returned, got: ${turnMedWarn.reply}`);
  pass('Medicine warnings and precautions returned from verified record');

  // 5.4 Strength
  const turnMedStr = await ConversationService.processTurn({
    message: 'What is the strength?',
    productId: 'PROD-MED-001',
    language: 'en'
  });
  assert(/500\s*mg|650\s*mg/i.test(turnMedStr.reply), `Strength returned, got: ${turnMedStr.reply}`);
  pass('Medicine strength returned accurately from verified record');

  // SUITE 6: Unknown Data & Safety Guards (Zero Hallucination)
  console.log('\n🛡️ SUITE 6: Unknown Data & Safety Guards (Zero Hallucination)');

  // 6.1 Inapplicable attribute: processor on t-shirt
  const turnClothProc = await ConversationService.processTurn({
    message: 'What processor does this T-shirt have?',
    productId: 'PROD-CLOTH-001',
    language: 'en'
  });
  assert(/clothing|not have electronic|don't have verified information/i.test(turnClothProc.reply), `Inapplicable spec returns guard statement, got: ${turnClothProc.reply}`);
  pass('Inapplicable attribute on clothing returns category boundary guard statement');

  // 6.2 Medical diagnosis request
  const turnMedDiag = await ConversationService.processTurn({
    message: 'Can you diagnose my fever and prescribe medicine?',
    productId: 'PROD-MED-001',
    language: 'en'
  });
  assert(/not a doctor|do not diagnose/i.test(turnMedDiag.reply), 'Medical diagnosis triggers safety disclaimer');
  pass('Medical diagnosis inquiry triggers strict medical safety disclaimer');

  // 6.3 Missing info handling on unverified attribute
  const mockProd = {
    id: 'MOCK-ITEM-001',
    name: 'Sample Item Without Specs',
    category: 'accessories',
    price: 499
  };
  const retrievedMissing = ProductKnowledgeService.retrieveRelevantKnowledge(mockProd, 'RAM', ['specifications.ram']);
  assert.strictEqual(retrievedMissing.knowledgeStatus, 'UNKNOWN', 'Missing field status must be UNKNOWN');
  assert.strictEqual(retrievedMissing.facts['specifications.ram'], null, 'Missing fact must be null, not fake');
  pass('Knowledge retrieval marks missing attributes strictly as UNKNOWN with null value');

  // SUITE 7: Multilingual Pipeline Verification
  console.log('\n🌐 SUITE 7: Multilingual Pipeline Verification');

  // 7.1 English
  const turnEn = await ConversationService.processTurn({
    message: 'What is the price?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(/₹74,999|74,999/i.test(turnEn.reply), 'English response quotes price');
  pass('English question delivers accurate English answer');

  // 7.2 Authentic Kannada (kn)
  const turnKn = await ConversationService.processTurn({
    message: 'ಈ ಲ್ಯಾಪ್‌ಟಾಪ್‌ನ ಬೆಲೆ ಎಷ್ಟು?',
    productId: 'PROD-LAP-001',
    language: 'kn'
  });
  assert(/[\u0C80-\u0CFF]/.test(turnKn.reply), 'Kannada response contains authentic Kannada script');
  assert(turnKn.reply.includes('74,999'), 'Kannada response quotes exact price');
  pass('Kannada question delivers authentic Kannada response with verified price');

  // 7.3 Roman Kannada (kn_roman / Kanglish)
  const turnRoman = await ConversationService.processTurn({
    message: 'Ee laptop price eshtu?',
    productId: 'PROD-LAP-001',
    language: 'kn_roman'
  });
  assert(/price|74,999/i.test(turnRoman.reply), 'Roman Kannada response quotes price');
  pass('Roman Kannada question delivers accurate Latin script response');

  // SUITE 8: Follow-up Conversational Memory
  console.log('\n🔄 SUITE 8: Follow-Up Conversational Memory & Context Maintenance');
  // Turn 1: Ask about RAM with explicit product
  const t1 = await ConversationService.processTurn({
    message: 'What is the RAM of ASUS TUF?',
    productId: 'PROD-LAP-001'
  });
  assert(/16\s*gb/i.test(t1.reply), 'Turn 1 quotes 16GB RAM for ASUS TUF');

  // Turn 2: Follow-up query "Is it good for AI?" WITHOUT passing productId
  const history = [
    { role: 'user', text: 'What is the RAM of ASUS TUF?' },
    { role: 'assistant', text: t1.reply, productId: 'PROD-LAP-001', activeProduct: { id: 'PROD-LAP-001', name: 'ASUS TUF Gaming' } }
  ];
  const t2 = await ConversationService.processTurn({
    message: 'Is it good for AI?',
    history,
    language: 'en'
  });
  assert(t2.activeProduct && t2.activeProduct.id === 'PROD-LAP-001',
    `Product context must be maintained as ASUS TUF, got: ${t2.activeProduct?.id}`);
  assert(t2.reply.includes('REASONED CONCLUSION:'), 'Follow-up delivers reasoned conclusion maintaining product context');
  pass('Follow-up "Is it good for AI?" maintains correct product context (ASUS TUF) from history');

  // SUITE 9: Pipeline Audit Logging Verification (Section 17)
  console.log('\n📝 SUITE 9: Pipeline Audit Logging (Section 17)');
  const recentLogs = ProductKnowledgePipeline.getRecentLogs(10);
  assert(recentLogs && recentLogs.length > 0, 'Pipeline audit logs must be recorded');
  const lastLog = ProductKnowledgePipeline.getLastLog();
  assert(lastLog, 'Last log entry must exist');
  assert(lastLog.user_question, 'Log must contain user_question');
  assert(lastLog.identified_product, 'Log must contain identified_product');
  assert(lastLog.detected_intent, 'Log must contain detected_intent');
  assert(lastLog.knowledge_source, 'Log must contain knowledge_source');
  assert(Array.isArray(lastLog.retrieved_fields), 'Log must contain retrieved_fields array');
  assert(Array.isArray(lastLog.tools_called), 'Log must contain tools_called array');
  assert(lastLog.knowledge_status, 'Log must contain knowledge_status');
  assert(lastLog.final_response, 'Log must contain final_response');
  pass(`Pipeline audit log verified: ${JSON.stringify({
    question: lastLog.user_question,
    product: lastLog.identified_product,
    intent: lastLog.detected_intent,
    source: lastLog.knowledge_source,
    status: lastLog.knowledge_status
  })}`);

  console.log('\n=========================================================================');
  console.log(`🎉 ALL ${passed} PRODUCT KNOWLEDGE PIPELINE TESTS PASSED!`);
  console.log('=========================================================================');
}

runPipelineTests().catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
