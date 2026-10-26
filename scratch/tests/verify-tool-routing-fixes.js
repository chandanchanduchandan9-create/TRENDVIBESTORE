import { ConversationService } from '../src/services/conversationService.js';
import { db } from '../src/db/database.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=======================================================');
  console.log('🧪 VERIFY TOOL ROUTING FIXES ACROSS ALL CATEGORIES');
  console.log('=======================================================');

  const clothProd = db.getProductById('PROD-CLOTH-001');
  const lapProd = db.getProductById('PROD-LAP-001');
  const foodProd = db.getProductById('FOOD-KAR-001');
  const medProd = db.getProductById('MED-PARA-001');
  const mobProd = db.getProductById('PROD-MOB-001');

  // 1. SAFETY & WARNINGS ACROSS CATEGORIES
  console.log('\n🛡️ 1. Category-Aware Safety Questions');
  
  // 1A. Clothing: Fabric Safety (no Paracetamol hijack)
  const resCloth = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'Are there any safety warnings or fabric allergies on this t-shirt?'
  });
  assert(resCloth.toolCalled === 'getSafetyInformation', 'Clothing safety routes to getSafetyInformation');
  assert(resCloth.activeProduct.id === clothProd.id, 'Clothing retains PROD-CLOTH-001 context without medicine substitution');
  assert(resCloth.reply.toLowerCase().includes('skin-safe') || resCloth.reply.toLowerCase().includes('cotton'), 'Answers fabric skin safety facts');

  // 1B. Laptop: Overheating & Cooling (no Sunglasses hijack)
  const resLap = await ConversationService.processTurn({
    productId: lapProd.id,
    message: 'Is there any safety warning or overheating protection?'
  });
  assert(resLap.toolCalled === 'getLaptopCooling', 'Laptop overheating routes to getLaptopCooling');
  assert(resLap.activeProduct.id === lapProd.id, 'Laptop retains PROD-LAP-001 context without sunglasses substitution');
  assert(resLap.reply.toLowerCase().includes('fan') || resLap.reply.toLowerCase().includes('cooling'), 'Delivers verified cooling architecture');

  // 1C. Food: Hygiene & Safety
  const resFood = await ConversationService.processTurn({
    productId: foodProd.id,
    message: 'What are the safety and hygiene details for this food?'
  });
  assert(resFood.toolCalled === 'getFoodSafetyDetails', 'Food safety routes to getFoodSafetyDetails');
  assert(resFood.activeProduct.id === foodProd.id, 'Food retains FOOD-KAR-001 context');

  // 1D. Medicine: Clinical Side Effects
  const resMed = await ConversationService.processTurn({
    productId: medProd.id,
    message: 'What are the side effects and safety warnings?'
  });
  assert(resMed.toolCalled === 'getMedicineSideEffects', 'Medicine safety routes to getMedicineSideEffects');
  assert(resMed.activeProduct.id === medProd.id, 'Medicine retains MED-PARA-001 context');

  // 2. PRICE & HYPOTHETICAL DISCOUNT CALCULATIONS
  console.log('\n💰 2. Price & Hypothetical Discount Calculations');

  // 2A. Listed Price
  const resPrice = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'What is the price?'
  });
  assert(resPrice.toolCalled === 'getPrice', 'Price query routes to getPrice');
  assert(resPrice.reply.includes('1,199'), 'Quotes verified current sale price ₹1,199');

  // 2B. Hypothetical 30% discount
  const resHypo = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'If I get 30% discount, what is the price?'
  });
  assert(resHypo.toolCalled === 'calculateDiscount', 'Hypothetical discount query routes to calculateDiscount');
  assert(resHypo.hypotheticalPercent === 30, 'Correctly identifies 30% discount');
  assert(resHypo.hypotheticalPrice === 839, 'Calculates correct discounted price (₹839)');

  // 2C. Kannada Hypothetical discount
  const resHypoKn = await ConversationService.processTurn({
    productId: clothProd.id,
    message: '25% discount kotre bele eshtu agutte?',
    language: 'kn'
  });
  assert(resHypoKn.toolCalled === 'calculateDiscount', 'Kannada hypothetical discount routes to calculateDiscount');
  assert(resHypoKn.language === 'kn', 'Replies in Kannada');
  assert(resHypoKn.reply.includes('ರಿಯಾಯಿತಿ'), 'Delivers Kannada discount explanation');

  // 3. STOCK & VARIANTS
  console.log('\n📦 3. Stock & Variant Enquiries');
  const resStock = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'Is M size in Vintage Black available in stock?'
  });
  assert(resStock.toolCalled === 'checkStock', 'Stock check routes to checkStock');
  assert(resStock.reply.toLowerCase().includes('stock'), 'Quotes live stock count');

  // 4. WARRANTY, COMPATIBILITY & USAGE DIRECTIONS
  console.log('\n🔧 4. Warranty, Compatibility & Usage Directions');

  // 4A. Laptop Warranty
  const resLapWarr = await ConversationService.processTurn({
    productId: lapProd.id,
    message: 'What is the warranty period for this laptop?'
  });
  assert(resLapWarr.toolCalled === 'getLaptopWarranty', 'Laptop warranty routes to getLaptopWarranty');

  // 4B. Clothing Warranty
  const resClothWarr = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'Is there any warranty or guarantee on this t-shirt?'
  });
  assert(resClothWarr.toolCalled === 'getWarranty', 'General clothing warranty routes to getWarranty');

  // 4C. Laptop Compatibility
  const resCompat = await ConversationService.processTurn({
    productId: lapProd.id,
    message: 'Is this compatible with 4K external monitors?'
  });
  assert(resCompat.toolCalled === 'getLaptopCompatibility', 'Laptop compatibility routes to getLaptopCompatibility');

  // 4D. Clothing Usage / Wash Care
  const resUsage = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'How to wash and care for this t-shirt?'
  });
  assert(resUsage.toolCalled === 'getProductUsage', 'Wash care directions route to getProductUsage');
  assert(resUsage.activeProduct.id === clothProd.id, 'Retains t-shirt context without false product switch');

  // 5. ORDER WORKFLOW & CONFIRMATION
  console.log('\n🛒 5. Order Workflow & Confirmation Protocol');

  // 5A. Positive interest on apparel without size -> askSize
  const resOrder1 = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'I want to order this product'
  });
  assert(resOrder1.toolCalled === 'askSize', 'Unspecified size on clothing prompts for size selection');

  // 5B. Providing size -> presents summary and requests confirmation
  const resOrder2 = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'Size L please',
    history: [
      { role: 'user', message: 'I want to order this product' },
      { role: 'ai', message: 'Which size would you like to order?' }
    ]
  });
  assert(resOrder2.toolCalled === 'requestOrderConfirmation', 'Providing size presents order summary and requests explicit confirmation');
  assert(!resOrder2.orderConfirmed, 'Order is NOT confirmed until explicit confirmation received');

  // 5C. Explicit customer confirmation -> createOrder
  const resOrder3 = await ConversationService.processTurn({
    productId: clothProd.id,
    message: 'Yes, please confirm my order now with COD',
    history: [
      { role: 'user', message: 'Size L please' },
      { role: 'ai', message: 'Should I confirm your order for 1 unit of TrendVibe Tee in size L via Cash on Delivery?' }
    ]
  });
  assert(resOrder3.toolCalled === 'createOrder', 'Explicit customer confirmation triggers createOrder');
  assert(resOrder3.orderConfirmed === true, 'Order marked confirmed');
  assert(resOrder3.orderData?.orderId?.startsWith('ORD-'), 'Valid Order ID generated');

  // 5D. Non-clothing product confirmation
  const resOrderLap = await ConversationService.processTurn({
    productId: lapProd.id,
    message: 'Yes, please confirm my order now via COD',
    history: [
      { role: 'ai', message: 'Should I confirm your order for 1 unit of ASUS TUF Gaming via Cash on Delivery?' }
    ]
  });
  assert(resOrderLap.toolCalled === 'createOrder', 'Non-clothing explicit confirmation triggers createOrder');
  assert(resOrderLap.orderData?.orderId?.startsWith('ORD-'), 'Laptop Order ID generated');

  // =========================================================================
  // 6. ZYRO AI — 7 TOOL-ROUTING RULES VERIFICATION
  // =========================================================================
  console.log('\n🧭 6. Zyro AI — 7 Tool-Routing Rules Verification (Rules 1 to 7)');

  const doloProd = db.getProductById('PROD-MED-001');

  // Register a temporary incomplete medicine product in the in-memory DB to test Rules 1, 3, 5, 6, 7
  const incompleteMedId = 'MED-INCOMPLETE-TEST-999';
  const incompleteMedProduct = {
    id: incompleteMedId,
    name: 'ZyroCare Herbal Cough Lozenge',
    brand: 'ZyroPharma Labs',
    manufacturer: 'ZyroPharma Labs',
    category: 'Medicines & Healthcare Products',
    subcategory: 'Cough & Cold',
    isMedicalProduct: true,
    activeIngredient: 'Tulsi & Ginger Extract 50 mg',
    dosageForm: 'Lozenge',
    packSize: '10 Lozenges',
    inStock: true,
    stockCount: 5,
    stock: { overall: 5 },
    codAvailable: false,
    paymentMethods: ['UPI', 'Credit/Debit Cards'],
    deliveryDays: '1-2 business days',
    deliveryCharges: 'Free (₹0)'
    // Intentionally missing: uses, dosage, ageGroup, warnings, sideEffects, drugInteractions, prescriptionRequired, batchNumber, salePrice, price
  };
  db.products.set(incompleteMedId, incompleteMedProduct);

  try {
    // -----------------------------------------------------------------------
    // RULE 1: Valid product questions (uses, dosage, age limits, ingredients,
    // warnings, side effects, interactions, prescription requirements, authenticity)
    // are NEVER classified as positiveOutOfSyllabus even when catalogue is incomplete.
    // -----------------------------------------------------------------------
    console.log('\n  [Rule 1] Valid Product Questions (Complete & Incomplete Catalogue) -> Never positiveOutOfSyllabus');
    const rule1Queries = [
      { q: 'What are the uses of this medicine?', expectedTool: 'getMedicineUses' },
      { q: 'What is the dosage and how many tablets should I take?', expectedTool: 'getMedicineDosage' },
      { q: 'What is the age limit or minimum age for children?', expectedTool: 'getMedicineAgeSuitability' },
      { q: 'What are the ingredients and composition?', expectedTool: 'getMedicineIngredients' },
      { q: 'What are the warnings and precautions?', expectedTool: 'getMedicineWarnings' },
      { q: 'What are the side effects?', expectedTool: 'getMedicineSideEffects' },
      { q: 'Are there any drug interactions?', expectedTool: 'getMedicineInteractions' },
      { q: 'Is a prescription required to buy this?', expectedTool: 'getMedicinePrescriptionStatus' },
      { q: 'Is this medicine authentic and what is the batch verification?', expectedTool: 'getMedicineAuthenticity' }
    ];

    for (const item of rule1Queries) {
      // Test on complete medicine product (Dolo 650)
      const resComplete = await ConversationService.processTurn({
        productId: doloProd.id,
        message: item.q
      });
      assert(
        resComplete.toolCalled === item.expectedTool && resComplete.toolCalled !== 'positiveOutOfSyllabus',
        `Rule 1 (Complete DB): "${item.q}" routes to ${item.expectedTool} (got ${resComplete.toolCalled})`
      );

      // Test on incomplete medicine product (ZyroCare Herbal Cough Lozenge)
      const resIncomplete = await ConversationService.processTurn({
        productId: incompleteMedId,
        message: item.q
      });
      assert(
        resIncomplete.toolCalled === item.expectedTool && resIncomplete.toolCalled !== 'positiveOutOfSyllabus' && resIncomplete.isOutOfSyllabus === false,
        `Rule 1 (Incomplete DB): "${item.q}" routes to ${item.expectedTool} and NEVER positiveOutOfSyllabus (got ${resIncomplete.toolCalled})`
      );
    }

    // -----------------------------------------------------------------------
    // RULE 2: Call corresponding implemented tool or verified knowledge lookup;
    // if required tool does not exist, use public-information search fallback.
    // -----------------------------------------------------------------------
    console.log('\n  [Rule 2] Implemented Tool Lookup vs Public-Information Search Fallback');
    const fallbackPharm = await ConversationService.processTurn({
      productId: doloProd.id,
      message: 'What is the pharmacopoeia standard of Dolo 650?'
    });
    assert(
      fallbackPharm.toolCalled === 'automaticKnowledgeRetrieval',
      `Rule 2: Question without dedicated medicine tool ("pharmacopoeia standard") falls back to automaticKnowledgeRetrieval (got ${fallbackPharm.toolCalled})`
    );
    assert(
      fallbackPharm.reply.includes('Indian Pharmacopoeia (IP)'),
      'Rule 2: Public-information search fallback returns verified Indian Pharmacopoeia (IP) fact'
    );

    const fallbackMoa = await ConversationService.processTurn({
      productId: doloProd.id,
      message: 'What is the mechanism of action of Dolo 650?'
    });
    assert(
      fallbackMoa.toolCalled === 'automaticKnowledgeRetrieval' && fallbackMoa.reply.includes('prostaglandin'),
      `Rule 2: "mechanism of action" uses public-information search fallback (got ${fallbackMoa.toolCalled})`
    );

    // -----------------------------------------------------------------------
    // RULE 3: Use getMedicinePrice for store prices. Never generate a price
    // from model knowledge, a previous conversation, an example, or search result.
    // -----------------------------------------------------------------------
    console.log('\n  [Rule 3] Use getMedicinePrice for Store Prices & Never Invent Missing Prices');
    const medPriceValid = await ConversationService.processTurn({
      productId: doloProd.id,
      message: 'What is the price of Dolo 650?'
    });
    assert(
      medPriceValid.toolCalled === 'getMedicinePrice',
      `Rule 3: Medicine price query routes to getMedicinePrice (got ${medPriceValid.toolCalled})`
    );
    assert(
      medPriceValid.price === 30 && medPriceValid.priceSource === 'TRENDVIBE_STORE_DATABASE',
      'Rule 3: Returns exact ₹30 store DB price with priceSource = TRENDVIBE_STORE_DATABASE'
    );

    const medPriceMissing = await ConversationService.processTurn({
      productId: incompleteMedId,
      message: 'What is the price of ZyroCare Herbal Cough Lozenge?'
    });
    assert(
      medPriceMissing.toolCalled === 'getMedicinePrice',
      `Rule 3: Missing medicine price still routes to getMedicinePrice (got ${medPriceMissing.toolCalled})`
    );
    assert(
      medPriceMissing.price === null && medPriceMissing.evidenceStatus === 'UNVERIFIED',
      'Rule 3: Never invents a fallback price when store price is missing from DB'
    );
    assert(
      medPriceMissing.reply.includes('What is verified:') && medPriceMissing.reply.includes('What remains unknown:'),
      'Rule 3 & 7: Explains what is verified and states that store selling price is unknown without guessing'
    );

    // -----------------------------------------------------------------------
    // RULE 4: Use getMedicineDelivery for delivery information and configured
    // store payment/COD lookup (getPaymentOptions) for COD eligibility.
    // -----------------------------------------------------------------------
    console.log('\n  [Rule 4] Use getMedicineDelivery for Delivery & getPaymentOptions for COD Eligibility');
    const medDeliveryRes = await ConversationService.processTurn({
      productId: doloProd.id,
      message: 'When will Dolo 650 be delivered and what are the delivery details?'
    });
    assert(
      medDeliveryRes.toolCalled === 'getMedicineDelivery',
      `Rule 4: Medicine delivery query routes to getMedicineDelivery (got ${medDeliveryRes.toolCalled})`
    );

    const medCodRes = await ConversationService.processTurn({
      productId: doloProd.id,
      message: 'Is COD available for Dolo 650?'
    });
    assert(
      medCodRes.toolCalled === 'getPaymentOptions',
      `Rule 4: Medicine COD eligibility query routes to getPaymentOptions, NOT getMedicineDelivery (got ${medCodRes.toolCalled})`
    );
    assert(
      medCodRes.codAvailable === true,
      'Rule 4: Returns verified COD eligibility from store payment lookup'
    );

    const clothCodRes = await ConversationService.processTurn({
      productId: clothProd.id,
      message: 'Is COD available for this t-shirt?'
    });
    assert(
      clothCodRes.toolCalled === 'getPaymentOptions',
      `Rule 4: General product COD query routes to getPaymentOptions, NOT checkStock or getDeliveryInformation (got ${clothCodRes.toolCalled})`
    );

    // -----------------------------------------------------------------------
    // RULE 5: Call requestOrderConfirmation only after validating live price,
    // stock, quantity, applicable charges, payment method, and customer consent.
    // -----------------------------------------------------------------------
    console.log('\n  [Rule 5] Validate Live Price, Stock, Quantity, Charges, Payment Method & Consent Before requestOrderConfirmation');
    const validOrderConf = await ConversationService.processTurn({
      productId: doloProd.id,
      message: 'I want to buy 2 units of Dolo 650'
    });
    assert(
      validOrderConf.toolCalled === 'requestOrderConfirmation',
      `Rule 5: Validated medicine buy intent calls requestOrderConfirmation (got ${validOrderConf.toolCalled})`
    );
    assert(
      Boolean(
        validOrderConf.orderValidation &&
        validOrderConf.orderValidation.validated === true &&
        validOrderConf.orderValidation.livePrice === 30 &&
        validOrderConf.orderValidation.inStock === true &&
        validOrderConf.orderValidation.quantity === 2 &&
        validOrderConf.orderValidation.applicableCharges === 0 &&
        validOrderConf.orderValidation.totalPayable === 60 &&
        validOrderConf.orderValidation.paymentMethod &&
        validOrderConf.orderValidation.customerConsent === true
      ),
      'Rule 5: Attaches complete orderValidation object verifying livePrice, inStock, quantity, applicableCharges, paymentMethod, and customerConsent'
    );

    // 5.1 Block requestOrderConfirmation when livePrice is missing
    const blockedMissingPriceOrder = await ConversationService.processTurn({
      productId: incompleteMedId,
      message: 'I want to buy 1 unit of ZyroCare Herbal Cough Lozenge'
    });
    assert(
      blockedMissingPriceOrder.toolCalled !== 'requestOrderConfirmation' &&
      blockedMissingPriceOrder.orderValidation?.validated === false &&
      blockedMissingPriceOrder.orderValidation?.failedCheck === 'livePrice',
      `Rule 5: Blocks requestOrderConfirmation when livePrice is missing (toolCalled=${blockedMissingPriceOrder.toolCalled}, failedCheck=${blockedMissingPriceOrder.orderValidation?.failedCheck})`
    );

    // 5.2 Block requestOrderConfirmation when requested quantity exceeds live stock
    const blockedExcessQtyOrder = await ConversationService.processTurn({
      productId: doloProd.id,
      message: 'I want to buy 999 units of Dolo 650'
    });
    assert(
      blockedExcessQtyOrder.toolCalled === 'checkStock' &&
      blockedExcessQtyOrder.orderValidation?.validated === false &&
      blockedExcessQtyOrder.orderValidation?.failedCheck === 'quantity',
      `Rule 5: Blocks requestOrderConfirmation when requested quantity (999) exceeds live stock (toolCalled=${blockedExcessQtyOrder.toolCalled})`
    );

    // 5.3 Block requestOrderConfirmation when COD is explicitly requested on a prepaid-only product
    incompleteMedProduct.salePrice = 120;
    incompleteMedProduct.price = 150;
    const blockedCodOrder = await ConversationService.processTurn({
      productId: incompleteMedId,
      message: 'I want to buy 1 unit of ZyroCare Herbal Cough Lozenge via COD'
    });
    assert(
      blockedCodOrder.toolCalled === 'getPaymentOptions' &&
      blockedCodOrder.orderValidation?.validated === false &&
      blockedCodOrder.orderValidation?.failedCheck === 'paymentMethod',
      `Rule 5: Blocks requestOrderConfirmation when COD is requested on a non-COD eligible product (toolCalled=${blockedCodOrder.toolCalled})`
    );

    // -----------------------------------------------------------------------
    // RULE 6: Use positiveOutOfSyllabus ONLY when genuinely unrelated to
    // supported products or store services, not when a product answer is missing.
    // -----------------------------------------------------------------------
    console.log('\n  [Rule 6] Use positiveOutOfSyllabus Only for Genuinely Unrelated Requests');
    const unrelatedJoke = await ConversationService.processTurn({
      productId: doloProd.id,
      message: 'Tell me a funny joke about robots'
    });
    assert(
      unrelatedJoke.toolCalled === 'positiveOutOfSyllabus' && unrelatedJoke.isOutOfSyllabus === true,
      `Rule 6: Genuinely unrelated joke routes to positiveOutOfSyllabus (got ${unrelatedJoke.toolCalled})`
    );

    const missingProductFactQuery = await ConversationService.processTurn({
      productId: incompleteMedId,
      message: 'What are the drug interactions for ZyroCare Herbal Cough Lozenge?'
    });
    assert(
      missingProductFactQuery.toolCalled !== 'positiveOutOfSyllabus' && missingProductFactQuery.isOutOfSyllabus === false,
      `Rule 6: Missing product answer from DB NEVER routes to positiveOutOfSyllabus (got ${missingProductFactQuery.toolCalled})`
    );

    // -----------------------------------------------------------------------
    // RULE 7: If evidence is missing or conflicting, explain what is verified
    // and what remains unknown. Never invent medicine instructions, safety claims, prices, or order status.
    // -----------------------------------------------------------------------
    console.log('\n  [Rule 7] Explain What Is Verified & What Remains Unknown/Conflicting Without Inventing');
    assert(
      missingProductFactQuery.reply.includes('What is verified:') &&
      missingProductFactQuery.reply.includes('What remains unknown:') &&
      missingProductFactQuery.reply.includes('never invent'),
      'Rule 7: Missing medicine interaction response explicitly states What is verified, What remains unknown, and never invents claims'
    );

    // Test conflicting price (salePrice > MRP)
    incompleteMedProduct.salePrice = 250;
    incompleteMedProduct.price = 150;
    const conflictingPriceRes = await ConversationService.processTurn({
      productId: incompleteMedId,
      message: 'What is the price of ZyroCare Herbal Cough Lozenge?'
    });
    assert(
      conflictingPriceRes.toolCalled === 'getMedicinePrice' &&
      conflictingPriceRes.evidenceStatus === 'CONFLICTING' &&
      conflictingPriceRes.reply.includes('What is verified:') &&
      conflictingPriceRes.reply.includes('conflicting'),
      'Rule 7: Detects conflicting store price/MRP and explains what is verified vs conflicting without guessing'
    );
  } finally {
    db.products.delete(incompleteMedId);
  }

  console.log('\n=======================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=======================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
