import { db } from '../src/db/database.js';
import { GeminiService } from '../src/services/geminiService.js';
import { AutomaticKnowledgeRetrievalService } from '../src/services/automaticKnowledgeRetrievalService.js';
import { ConversationService } from '../src/services/conversationService.js';
import { ProductKnowledgePipeline } from '../src/services/productKnowledgePipeline.js';

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
  console.log('======================================================================');
  console.log('🔎 ZYRO AI — AUTOMATIC KNOWLEDGE RETRIEVAL (12-RULE VERIFICATION)');
  console.log('======================================================================\n');

  // Clean any pre-existing test facts for deterministic testing
  db.invalidateVerifiedFact('PROD-PHONE-005', 'sar_value');
  db.invalidateVerifiedFact('PROD-PHONE-007', 'bluetooth_codec');
  db.invalidateVerifiedFact('PROD-LAP-001', 'mux_switch');
  db.invalidateVerifiedFact('PROD-LAP-001', 'color_gamut');
  db.invalidateVerifiedFact('FOOD-KAR-001', 'glycemic_index');

  // ---------------------------------------------------------------------------
  // RULE 1: Check existing TrendVibe Store database and approved knowledge first
  // ---------------------------------------------------------------------------
  console.log('1️⃣  RULE 1: Check TrendVibe Store Database & Approved Knowledge First');
  const dbFirstRes = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
    question: 'What is the prescription status of Dolo 650?',
    productId: 'PROD-MED-001',
    language: 'en'
  });
  assert(dbFirstRes.success === true, 'Rule 1: Resolves approved medicine fact from TrendVibe database');
  assert(dbFirstRes.knowledgeSource === 'TRENDVIBE_DATABASE', `Rule 1: knowledgeSource is TRENDVIBE_DATABASE (got ${dbFirstRes.knowledgeSource})`);
  assert(dbFirstRes.googleSearchUsed === false, 'Rule 1: Does not call Google Search when fact exists in store DB');
  assert(dbFirstRes.evidenceStatus === 'VERIFIED', 'Rule 1: Marks DB fact as VERIFIED');

  // ---------------------------------------------------------------------------
  // RULE 2: If a public product fact is missing, use Google Search grounding
  // ---------------------------------------------------------------------------
  console.log('\n2️⃣  RULE 2: Missing Public Product Fact -> Google Search Grounding via Gemini API');
  const sarTurn = await ConversationService.processTurn({
    message: 'What is the SAR radiation value of iPhone 16?',
    productId: 'PROD-PHONE-005',
    language: 'en'
  });
  assert(sarTurn.toolCalled === 'automaticKnowledgeRetrieval', `Rule 2: Routes missing public SAR question to automaticKnowledgeRetrieval (got ${sarTurn.toolCalled})`);
  assert(sarTurn.knowledgeSource === 'GOOGLE_SEARCH_GROUNDING', `Rule 2: Uses GOOGLE_SEARCH_GROUNDING for missing public fact (got ${sarTurn.knowledgeSource})`);
  assert(sarTurn.googleSearchUsed === true, 'Rule 2: Flags googleSearchUsed = true');
  assert(sarTurn.reply.includes('1.14 W/kg') && sarTurn.reply.includes('1.15 W/kg'), 'Rule 2: Retrieves accurate iPhone 16 SAR values');

  const muxTurn = await ConversationService.processTurn({
    message: 'Does ASUS TUF Gaming have a MUX switch?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(muxTurn.toolCalled === 'automaticKnowledgeRetrieval', 'Rule 2: Routes missing laptop MUX switch query to automaticKnowledgeRetrieval');
  assert(muxTurn.reply.includes('MUX Switch') && muxTurn.reply.includes('Advanced Optimus'), 'Rule 2: Answers MUX switch support from grounded manufacturer specs');

  // ---------------------------------------------------------------------------
  // RULE 3: Prefer exact manufacturer's official website, label & authority
  // ---------------------------------------------------------------------------
  console.log('\n3️⃣  RULE 3: Prefer Official Manufacturer Website, Product Label & Authoritative Sources');
  const iphoneProd = db.getProductById('PROD-PHONE-005');
  const rankedSources = GeminiService.rankAuthoritativeSources([
    { uri: 'https://randomtechrumors.blog/iphone-16-sar', title: 'Rumored SAR blog post' },
    { uri: 'https://reddit.com/r/iphone/comments/sar', title: 'Reddit forum thread' },
    { uri: 'https://www.apple.com/in/legal/rfexposure/iphone16,1/', title: 'Apple Official RF Exposure — iPhone 16' }
  ], iphoneProd);
  assert(rankedSources[0].uri.includes('apple.com'), `Rule 3: Ranks official apple.com #1 above blogs and forums (got ${rankedSources[0].uri})`);
  assert(rankedSources[0].sourceType === 'manufacturer_official', 'Rule 3: Classifies apple.com as manufacturer_official');
  assert(rankedSources[rankedSources.length - 1].sourceType === 'unverified_forum', 'Rule 3: Demotes forum/blog sources to lowest priority');

  // ---------------------------------------------------------------------------
  // RULE 4: Confirm source applies to correct product, formulation, pack size & variant
  // ---------------------------------------------------------------------------
  console.log('\n4️⃣  RULE 4: Confirm Exact Product, Formulation, Pack Size & Variant');
  const wrongVariantMatch = GeminiService.verifySourceProductMatch({
    product: db.getProductById('PROD-PHONE-005'), // Apple iPhone 16
    candidateText: 'The iPhone 16 Pro features a 5x Tetraprism telephoto lens.',
    sourceTitle: 'iPhone 16 Pro Technical Specifications'
  });
  assert(wrongVariantMatch.matches === false, 'Rule 4: Rejects iPhone 16 Pro source when active product is standard iPhone 16');

  const wrongStrengthMatch = GeminiService.verifySourceProductMatch({
    product: db.getProductById('MED-PARA-001'), // Paracetamol 500 mg Tablet
    candidateText: 'Each film-coated tablet contains Paracetamol IP 650 mg.',
    sourceTitle: 'Paracetamol 650 mg Label'
  });
  assert(wrongStrengthMatch.matches === false, 'Rule 4: Rejects 650 mg formulation source when product is Paracetamol 500 mg');

  const exactMatch = GeminiService.verifySourceProductMatch({
    product: db.getProductById('PROD-PHONE-006'), // Samsung Galaxy S25
    candidateText: 'Samsung Galaxy S25 supports Wired and Wireless Samsung DeX.',
    sourceTitle: 'Samsung Galaxy S25 Official Specs',
    requestedVariant: '256GB'
  });
  assert(exactMatch.matches === true && exactMatch.confirmedVariant === '256GB', 'Rule 4: Confirms exact product and requested variant');

  // ---------------------------------------------------------------------------
  // RULE 5: Answer naturally in active conversation language (en, kn, kn_roman)
  // ---------------------------------------------------------------------------
  console.log('\n5️⃣  RULE 5: Natural Responses in Active Conversation Language (en, kn, kn_roman)');
  const knTurn = await ConversationService.processTurn({
    message: 'OnePlus 13 ನಲ್ಲಿ ಯಾವ ಬ್ಲೂಟೂತ್ ಆಡಿಯೋ ಕೋಡೆಕ್ (Bluetooth codec) ಇದೆ?',
    productId: 'PROD-PHONE-007',
    language: 'kn'
  });
  assert(knTurn.language === 'kn', 'Rule 5: Maintains Kannada language (kn)');
  assert(knTurn.reply.includes('ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ') && knTurn.reply.includes('aptX HD') && knTurn.reply.includes('LDAC'), 'Rule 5: Answers naturally in Kannada script with verified codecs');

  const romanTurn = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
    question: 'What is the glycemic index of Ragi Mudde?',
    productId: 'FOOD-KAR-001',
    language: 'kn_roman'
  });
  assert(romanTurn.reply.includes('verified mahiti') && romanTurn.reply.includes('54 and 68'), 'Rule 5: Answers naturally in Romanized Kannada (kn_roman)');

  // ---------------------------------------------------------------------------
  // RULE 6: Disclose limitation when evidence is uncertain or conflicting
  // ---------------------------------------------------------------------------
  console.log('\n6️⃣  RULE 6: Disclose Limitation When Evidence is Uncertain or Conflicting');
  const conflictingTurn = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
    question: 'What is the sRGB color gamut of ASUS TUF Gaming?',
    productId: 'PROD-LAP-001',
    language: 'en',
    mockGroundingResponse: {
      evidenceStatus: 'CONFLICTING',
      factValue: 'Base 144Hz panel is 45% NTSC (62.5% sRGB) while select regional 165Hz panels list 100% sRGB',
      sourceUrl: 'https://www.asus.com/in/laptops/for-gaming/tuf-gaming/',
      sourceTitle: 'ASUS TUF Gaming Regional Panel Specifications',
      conflictOrUncertaintyNote: 'regional sub-variants list either 62.5% sRGB (144Hz) or 100% sRGB (165Hz)'
    }
  });
  assert(conflictingTurn.evidenceStatus === 'CONFLICTING', 'Rule 6: Marks conflicting evidence as CONFLICTING');
  assert(conflictingTurn.reply.includes('conflicting') && conflictingTurn.reply.includes('Rather than guessing'), 'Rule 6: Explicitly discloses conflict instead of guessing');

  // Clean up mock conflicting record so subsequent tests use verified record
  db.invalidateVerifiedFact('PROD-LAP-001', 'color_gamut');

  // ---------------------------------------------------------------------------
  // RULE 7: Store reusable verified product facts with productId, sourceUrl, verificationDate, evidenceStatus
  // ---------------------------------------------------------------------------
  console.log('\n7️⃣  RULE 7: Store & Reuse Verified Product Facts');
  const storedSarFact = db.getVerifiedFact('PROD-PHONE-005', 'sar_value');
  assert(Boolean(storedSarFact), 'Rule 7: Stored verified fact exists in database for PROD-PHONE-005 sar_value');
  assert(storedSarFact.productId === 'PROD-PHONE-005', 'Rule 7: Stored fact includes productId');
  assert(storedSarFact.sourceUrl === 'https://www.apple.com/in/legal/rfexposure/iphone16,1/', 'Rule 7: Stored fact includes official sourceUrl');
  assert(Boolean(storedSarFact.verificationDate), 'Rule 7: Stored fact includes ISO verificationDate');
  assert(storedSarFact.evidenceStatus === 'VERIFIED', 'Rule 7: Stored fact includes evidenceStatus = VERIFIED');

  // Query again to verify reuse without calling Google Search again
  const reusedSarRes = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
    question: 'What is the SAR value of iPhone 16?',
    productId: 'PROD-PHONE-005',
    language: 'en'
  });
  assert(reusedSarRes.knowledgeSource === 'STORED_VERIFIED_FACT', `Rule 7: Reuses STORED_VERIFIED_FACT on subsequent query (got ${reusedSarRes.knowledgeSource})`);
  assert(reusedSarRes.reusedStoredFact === true && reusedSarRes.googleSearchUsed === false, 'Rule 7: Avoids redundant Google Search when stored fact is fresh');

  // ---------------------------------------------------------------------------
  // RULE 8: Recheck information when it may have changed (do not treat old results as permanently current)
  // ---------------------------------------------------------------------------
  console.log('\n8️⃣  RULE 8: Recheck Stale Facts & Do Not Treat Old Search Results as Permanently Current');
  // Save a fact with a verificationDate 15 days in the past (360 hours ago, exceeding 168h TTL)
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString();
  db.saveVerifiedFact({
    productId: 'PROD-LAP-001',
    attributeKey: 'color_gamut',
    factValue: 'Old cached color gamut record',
    sourceUrl: 'https://www.asus.com/in/laptops/for-gaming/tuf-gaming/asus-tuf-gaming-f15-2023/techspec/',
    sourceTitle: 'ASUS Official Specs',
    verificationDate: fifteenDaysAgo,
    ttlHours: 168,
    evidenceStatus: 'VERIFIED'
  });

  const staleCheck = db.getVerifiedFact('PROD-LAP-001', 'color_gamut');
  assert(staleCheck.isStale === true && staleCheck.stalenessReason === 'EXPIRED_TTL', 'Rule 8: Detects expired TTL on 15-day-old search result');

  const recheckedRes = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
    question: 'What is the color gamut of ASUS TUF Gaming?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(recheckedRes.recheckedStaleFact === true, 'Rule 8: Automatically rechecks stale fact via Google Search grounding');
  assert(recheckedRes.googleSearchUsed === true, 'Rule 8: Executes fresh grounding lookup for expired fact');
  assert(recheckedRes.factValue.includes('45% NTSC'), 'Rule 8: Updates stored fact with fresh verified value');

  const refreshedFact = db.getVerifiedFact('PROD-LAP-001', 'color_gamut');
  assert(refreshedFact.isStale === false && refreshedFact.recheckCount >= 1, 'Rule 8: Refreshes verificationDate and increments recheckCount');

  // ---------------------------------------------------------------------------
  // RULE 9: Never use Google Search as authority for TrendVibe prices, stock, discounts, delivery, COD, totals, policies
  // ---------------------------------------------------------------------------
  console.log('\n9️⃣  RULE 9: Never Use Google Search for TrendVibe Prices, Stock, Discounts, Delivery, COD, Totals, or Store Policies');
  const storePriceCheck = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
    question: 'What is the selling price of Apple iPhone 16?',
    productId: 'PROD-PHONE-005',
    language: 'en'
  });
  assert(storePriceCheck.googleSearchBlocked === true && storePriceCheck.googleSearchUsed === false, 'Rule 9: Explicitly blocks Google Search for selling price');
  assert(storePriceCheck.authoritySource === 'TRENDVIBE_STORE_DATABASE_ONLY', 'Rule 9: Enforces TRENDVIBE_STORE_DATABASE_ONLY authority');
  assert(storePriceCheck.reply.includes('₹74,900'), 'Rule 9: Returns verified store selling price from TrendVibe DB');

  const customBulkPriceCheck = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
    question: 'What is the selling price for an international bulk order outside India?',
    productId: 'PROD-PHONE-005',
    language: 'en'
  });
  assert(customBulkPriceCheck.googleSearchBlocked === true && customBulkPriceCheck.googleSearchUsed === false, 'Rule 9: Never falls back to Google Search even when custom store price is missing from DB');
  assert(customBulkPriceCheck.reply.includes('only the TrendVibe Store database is authoritative') && /store administrator/i.test(customBulkPriceCheck.reply), 'Rule 9: Directs unrecorded store policy/pricing query to TrendVibe Store administrator');

  // ---------------------------------------------------------------------------
  // RULE 10: Never invent medical dosage, age restrictions, drug interactions, side effects, prescription status, batch authenticity, or safety certifications
  // ---------------------------------------------------------------------------
  console.log('\n🔟 RULE 10: Never Invent Medical Dosage, Age Restrictions, Interactions, Side Effects, Prescription Status, Batch Authenticity, or Certifications');
  const infantDosageTurn = await ConversationService.processTurn({
    message: 'What is the exact dosage of Dolo 650 for a 2 month old infant?',
    productId: 'PROD-MED-001',
    language: 'en'
  });
  assert(infantDosageTurn.medicalSafetyGuardrailTriggered === true, 'Rule 10: Triggers medicalSafetyGuardrailTriggered for unrecorded infant dosage');
  assert(infantDosageTurn.googleSearchUsed === false, 'Rule 10: Does not invent or scrape unverified pediatric dosage');
  assert(infantDosageTurn.evidenceStatus === 'UNVERIFIED', 'Rule 10: Marks unrecorded infant dosage as UNVERIFIED');
  assert(infantDosageTurn.reply.includes('never invent or guess medical dosage') && infantDosageTurn.reply.includes('qualified healthcare professional'), 'Rule 10: Advises consulting product label, manufacturer, or healthcare professional');

  const fssaiTurn = await ConversationService.processTurn({
    message: 'What is the FSSAI license number and lab test report for Ragi Mudde?',
    productId: 'FOOD-KAR-001',
    language: 'en'
  });
  assert(fssaiTurn.medicalSafetyGuardrailTriggered === true && fssaiTurn.evidenceStatus === 'UNVERIFIED', 'Rule 10: Never invents unrecorded FSSAI license or safety certification');

  // ---------------------------------------------------------------------------
  // RULE 11: When a question cannot be verified, explain what is unknown and suggest manufacturer, label, healthcare professional, or store administrator
  // ---------------------------------------------------------------------------
  console.log('\n1️⃣1️⃣ RULE 11: Honest Disclosure of Unknowns & Appropriate Referrals');
  const unknownSpecTurn = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
    question: 'What is the dielectric constant of the internal motherboard PCB in ASUS TUF Gaming?',
    productId: 'PROD-LAP-001',
    language: 'en'
  });
  assert(unknownSpecTurn.evidenceStatus === 'UNVERIFIED', 'Rule 11: Marks unverifiable hardware question as UNVERIFIED');
  assert(unknownSpecTurn.reply.includes('could not verify') && unknownSpecTurn.reply.includes('ASUS') && unknownSpecTurn.reply.includes('product label') && /store administrator/i.test(unknownSpecTurn.reply), 'Rule 11: Explains what is unknown and suggests manufacturer, product label, or store administrator');

  // ---------------------------------------------------------------------------
  // RULE 12: Do not use positiveOutOfSyllabus for a valid product question just because its answer is missing from the database
  // ---------------------------------------------------------------------------
  console.log('\n1️⃣2️⃣ RULE 12: Never Use positiveOutOfSyllabus for Valid Product Questions Missing from DB');
  const validMissingProductTurn = await ConversationService.processTurn({
    message: 'What is the shrinkage tolerance of this t-shirt after washing?',
    productId: 'PROD-CLOTH-001',
    language: 'en'
  });
  assert(validMissingProductTurn.toolCalled === 'automaticKnowledgeRetrieval', `Rule 12: Routes valid fabric shrinkage question to automaticKnowledgeRetrieval instead of positiveOutOfSyllabus (got ${validMissingProductTurn.toolCalled})`);
  assert(validMissingProductTurn.isOutOfSyllabus !== true, 'Rule 12: Does NOT flag valid product question as isOutOfSyllabus');
  assert(validMissingProductTurn.reply.includes('2% dimensional tolerance'), 'Rule 12: Answers valid missing product question using grounded product label data');

  const validUnverifiableProductTurn = await ConversationService.processTurn({
    message: 'What is the exact Bluetooth impedance and harmonic distortion of this t-shirt?',
    productId: 'PROD-CLOTH-001',
    language: 'en'
  });
  assert(validUnverifiableProductTurn.toolCalled === 'automaticKnowledgeRetrieval', `Rule 12: Routes unverifiable product spec question to automaticKnowledgeRetrieval, NOT positiveOutOfSyllabus (got ${validUnverifiableProductTurn.toolCalled})`);
  assert(validUnverifiableProductTurn.isOutOfSyllabus === false, 'Rule 12: Sets isOutOfSyllabus = false for valid product question');

  // Verify genuine banter still uses positiveOutOfSyllabus
  const banterTurn = await ConversationService.processTurn({
    message: 'Can you tell me a joke?',
    productId: 'PROD-CLOTH-001',
    language: 'en'
  });
  assert(banterTurn.toolCalled === 'positiveOutOfSyllabus', 'Rule 12: Preserves positiveOutOfSyllabus for genuine banter/jokes');

  console.log('\n======================================================================');
  console.log(`🎉 AUTOMATIC KNOWLEDGE RETRIEVAL SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error in verify-automatic-knowledge-retrieval:', err);
  process.exit(1);
});
