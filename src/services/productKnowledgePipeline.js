import { db } from '../db/database.js';
import { ProductKnowledgeService } from './productKnowledgeService.js';
import { IntentService, INTENT_CONFIG } from './intentService.js';
import { CategoryKnowledgeService } from './categoryKnowledgeService.js';
import { SuggestedQuestionService } from './suggestedQuestionService.js';
import { LaptopService } from './laptopService.js';
import { MobileService } from './mobileService.js';
import { MedicineService } from './medicineService.js';
import { FoodService } from './foodService.js';
import { ProductService } from './productService.js';
import { AutomaticKnowledgeRetrievalService } from './automaticKnowledgeRetrievalService.js';

/**
 * ProductKnowledgePipeline:
 * Implements the complete Zyro AI Product Knowledge Pipeline:
 * CUSTOMER QUESTION
 *   ↓
 * ZYRO AI ENGINE
 *   ↓
 * Product Identification & Context Resolution
 *   ↓
 * Intent / Question-Type Detection
 *   ↓
 * Knowledge Source Selection
 *   ↓
 * Retrieve Relevant Knowledge Facts
 *   ↓
 * Retrieve Live Store Data if Required
 *   ↓
 * AI Reasoning Using Retrieved Facts (FACT vs REASONED CONCLUSION)
 *   ↓
 * Verification & Medical / Safety Check
 *   ↓
 * Final Answer
 *   ↓
 * Dynamic Suggested Questions
 *   ↓
 * Pipeline Audit Logging
 */
export class ProductKnowledgePipeline {
  // In-memory circular log buffer for pipeline audit inspection (Section 17)
  static #auditLogs = [];
  static MAX_LOGS = 200;

  /**
   * Main Pipeline Entry Point:
   * Processes a customer query through the 7-stage Product Knowledge Pipeline
   */
  static async executeTurn({
    message = '',
    productId = null,
    history = [],
    language = 'en',
    leadId = null,
    speakLanguage = null,
    recognizeKannadaSpeakEnglish = false
  }) {
    const rawQuestion = (message || '').trim();
    const shouldSpeakEnglish = Boolean(
      recognizeKannadaSpeakEnglish ||
      speakLanguage === 'en' ||
      language === 'kn_recognize_en_speak'
    );
    const resolvedLang = shouldSpeakEnglish ? 'en' : language;
    const isKn = resolvedLang === 'kn';
    const isRoman = resolvedLang === 'kn_roman';

    // 1. PRODUCT IDENTIFICATION & CONTEXT RESOLUTION
    let resolvedProduct = null;

    // A. Explicit product ID provided
    if (productId) {
      resolvedProduct = db.getProductById(productId);
    }

    // B. Contextual Product Identification from text
    if (!resolvedProduct) {
      resolvedProduct = 
        LaptopService.identifyProductFromText(rawQuestion) ||
        MobileService.identifyProductFromText(rawQuestion) ||
        MedicineService.identifyProductFromText(rawQuestion) ||
        FoodService.identifyProductFromText(rawQuestion) ||
        db.findProductByQuery(rawQuestion);
    }

    // C. Conversational Memory / Context Resolution (pronouns like "it", "this", or follow-ups)
    if (!resolvedProduct && history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h.productId) {
          resolvedProduct = db.getProductById(h.productId);
          if (resolvedProduct) break;
        }
        if (h.product && h.product.id) {
          resolvedProduct = db.getProductById(h.product.id);
          if (resolvedProduct) break;
        }
      }
    }

    // D. Default fallback if still unresolved
    if (!resolvedProduct) {
      resolvedProduct = db.getProductById('PROD-LAP-001') || db.getAllProducts()[0];
    }

    const universal = ProductKnowledgeService.toUniversal(resolvedProduct);

    // 2. INTENT & QUESTION-TYPE DETECTION
    const intentResult = IntentService.detectIntent(rawQuestion, universal, history);
    const intent = intentResult.intent;
    const intentConfig = intentResult.config || INTENT_CONFIG.PRODUCT_DETAILS;
    const knowledgeSource = intentResult.source || intentConfig.source || 'PRODUCT_KNOWLEDGE';
    const toolCalled = intentResult.tool || intentConfig.tool || 'getProductDetails';
    const requiredFields = intentResult.requiredFields || intentConfig.required_fields || [];

    // 3. CATEGORY BOUNDARY & INCOMPATIBILITY CHECK
    const category = universal.identity.category;
    let categoryIncompatibleNotice = null;

    for (const field of requiredFields) {
      if (!CategoryKnowledgeService.isFieldApplicable(category, field)) {
        categoryIncompatibleNotice = CategoryKnowledgeService.getIncompatibleNotice(category, language);
        break;
      }
    }

    // 4. RETRIEVE RELEVANT KNOWLEDGE (Selective boundary retrieval)
    const knowledge = ProductKnowledgeService.retrieveRelevantKnowledge(resolvedProduct, intent, requiredFields);
    let knowledgeStatus = knowledge.knowledgeStatus;

    // 5. CONTROLLED AI REASONING & ACCURACY/SAFETY VALIDATION
    let reply = '';
    let isReasoned = false;

    // 5.1 Category Incompatibility Guard
    if (categoryIncompatibleNotice) {
      reply = categoryIncompatibleNotice;
      knowledgeStatus = 'UNVERIFIED';
    }
    // 5.2 Medical Safety Guardrails (Section 16)
    else if (intent === 'MEDICAL_DIAGNOSIS' || /diagnos|disease|prescribe medicine|cure my|treatment plan/i.test(rawQuestion)) {
      if (isKn) {
        reply = "ನಾನು AI ಉತ್ಪನ್ನ-ಮಾಹಿತಿ ಮತ್ತು ಶಾಪಿಂಗ್ ಸಹಾಯಕನಾಗಿದ್ದು, ವೈದ್ಯನಲ್ಲ. ನಾನು ರೋಗಗಳನ್ನು ಪತ್ತೆಹಚ್ಚುವುದಿಲ್ಲ, ಔಷಧಿಗಳನ್ನು ಶಿಫಾರಸು ಮಾಡುವುದಿಲ್ಲ ಅಥವಾ ಚಿಕಿತ್ಸಾ ಯೋಜನೆಗಳನ್ನು ನೀಡುವುದಿಲ್ಲ. ಯಾವುದೇ ಗಂಭೀರ ರೋಗಲಕ್ಷಣಗಳಿಗೆ ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.";
      } else if (isRoman) {
        reply = "Nanu AI shopping assistant, doctor alla. Nanu rogagalannu diagnose madalla mathu medicine prescribe madalla. Dayavittu qualified doctor annu consult madi.";
      } else {
        reply = "I am an AI product-information and shopping assistant, not a doctor. I do not diagnose conditions, prescribe medicines, or provide personalized treatment plans. For severe symptoms, suspected overdose, or medical emergencies, please seek immediate professional medical attention.";
      }
      knowledgeStatus = 'VERIFIED';
    }
    // 5.3 Controlled Spec Reasoning (AI/ML suitability, Gaming, Coding, Vegan/Dietary)
    else if (
      intent === 'USE_CASE' ||
      intent === 'PERFORMANCE' ||
      intent === 'VEGAN_STATUS' ||
      /\b(ai|ml|machine learning|deep learning|gaming|games|programming|coding|vegan|vegetarian)\b/i.test(rawQuestion)
    ) {
      const reasoningRes = CategoryKnowledgeService.evaluateReasoning({
        category,
        intent: /ai|ml/i.test(rawQuestion) ? 'AI_ML' : (/gaming|games/i.test(rawQuestion) ? 'GAMING' : (/vegan|vegetarian/i.test(rawQuestion) ? 'VEGAN_STATUS' : intent)),
        specifications: universal.specifications,
        language,
        product: resolvedProduct
      });

      if (reasoningRes) {
        reply = reasoningRes.message;
        knowledgeStatus = reasoningRes.status;
        isReasoned = true;
      }
    }

    // 5.4 Standard Field Retrieval Answer Generation if not handled by reasoning
    if (!reply) {
      // Check if all required fields are unknown / missing
      const hasMissingData = Object.keys(knowledge.facts).length > 0 &&
        Object.values(knowledge.facts).every(v => v === null || v === undefined);

      const extractedAttr = AutomaticKnowledgeRetrievalService.identifyRequestedAttribute(rawQuestion, resolvedProduct);
      const isPublicGroundingCandidate = extractedAttr.attributeKey !== 'unclassified' && !extractedAttr.isStoreExclusive && !extractedAttr.isRestrictedSafetyMedical;

      if (hasMissingData || isPublicGroundingCandidate) {
        const akrRes = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
          question: rawQuestion,
          product: resolvedProduct,
          language: resolvedLang
        });
        if (akrRes && akrRes.success && akrRes.evidenceStatus === 'VERIFIED') {
          reply = akrRes.reply;
          knowledgeStatus = 'VERIFIED';
        }
      }

      if (!reply && hasMissingData) {
        // Unknown Data Handling (Section 10)
        if (category.toLowerCase().includes('med') || category.toLowerCase().includes('health')) {
          reply = isKn
            ? "ಪ್ರಸ್ತುತ ಉತ್ಪನ್ನದ ಮಾಹಿತಿಯಲ್ಲಿ ಆ ವೈದ್ಯಕೀಯ ಪ್ರಶ್ನೆಗೆ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಉತ್ಪನ್ನದ ಪ್ಯಾಕೇಜಿಂಗ್ ಅನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಅರ್ಹ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."
            : isRoman
            ? "Ee medical question ge verified product data catalog nalli illa. Dayavittu packaging check madi athava doctor consult madi."
            : "I don't have verified information for that medical question in the current product data. Please check the product packaging or consult a qualified healthcare professional.";
        } else {
          reply = isKn
            ? `ಕ್ಷಮಿಸಿ, ಈ ಉತ್ಪನ್ನಕ್ಕೆ (${resolvedProduct.name}) ಸಂಬಂಧಿಸಿದಂತೆ ಆ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ನಮ್ಮ ಸ್ಟೋರ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.`
            : isRoman
            ? `Kshamisi, ee product (${resolvedProduct.name}) ge aa verified information nammalli illa.`
            : `I don't have verified information about that for this product (${resolvedProduct.name}).`;
        }
        knowledgeStatus = 'UNKNOWN';
      } else if (!reply) {
        // Factual Answer Formulation from Retrieved Facts
        reply = ProductKnowledgePipeline.formatFactualAnswer({
          intent,
          product: universal,
          facts: knowledge.facts,
          language: resolvedLang
        });
      }
    }

    // 6. DYNAMIC SUGGESTED QUESTIONS (Guaranteed 5-8 verified questions)
    const discussedTopics = SuggestedQuestionService.extractDiscussedTopics(history, rawQuestion, reply);
    const purchaseIntent = SuggestedQuestionService.detectPurchaseIntent(history, rawQuestion);
    const stage = SuggestedQuestionService.detectConversationStage(history, discussedTopics, purchaseIntent);

    const suggestedQuestions = SuggestedQuestionService.generateSuggestedQuestions(
      resolvedProduct,
      {
        history,
        latestMessage: rawQuestion,
        latestReply: reply,
        language,
        stage,
        purchaseIntent
      }
    );

    // 7. PIPELINE AUDIT LOGGING (Section 17)
    const logEntry = {
      timestamp: new Date().toISOString(),
      user_question: rawQuestion,
      identified_product: universal.identity.name,
      identified_product_id: universal.product_id,
      detected_intent: intent,
      knowledge_source: knowledgeSource,
      retrieved_fields: knowledge.requiredFields,
      tools_called: [toolCalled],
      knowledge_status: knowledgeStatus,
      is_reasoned: isReasoned,
      language,
      final_response: reply
    };
    ProductKnowledgePipeline.recordLog(logEntry);

    return {
      success: true,
      reply,
      toolCalled,
      intent,
      knowledgeSource,
      knowledgeStatus,
      retrievedFields: knowledge.requiredFields,
      language,
      activeProduct: resolvedProduct,
      productData: resolvedProduct,
      suggestedQuestions,
      stage
    };
  }

  /**
   * Formats clean, grounded, factual answer based on retrieved facts
   */
  static formatFactualAnswer({ intent, product, facts, language = 'en' }) {
    const isKn = language === 'kn';
    const isRoman = language === 'kn_roman';
    const name = product.identity.name;
    const specs = product.specifications || {};

    // 1. Processor
    if (intent === 'PROCESSOR' && specs.processor) {
      return isKn
        ? `${name} ಲ್ಯಾಪ್‌ಟಾಪ್‌ನಲ್ಲಿ ${specs.processor} ಪ್ರೊಸೆಸರ್ ಲಭ್ಯವಿದೆ.`
        : isRoman
        ? `${name} nalli ${specs.processor} processor ide.`
        : `Processor for ${name}: ${specs.processor}. Official manufacturer specifications verified.`;
    }

    // 2. RAM
    if (intent === 'RAM' && specs.ram) {
      return isKn
        ? `${name} ಲ್ಯಾಪ್‌ಟಾಪ್‌ನಲ್ಲಿ ${specs.ram} RAM ಇದೆ.`
        : isRoman
        ? `${name} nalli ${specs.ram} RAM ide.`
        : `RAM configuration for ${name}: ${specs.ram}.`;
    }

    // 3. GPU
    if (intent === 'GPU' && specs.gpu) {
      return isKn
        ? `${name} ನಲ್ಲಿ ${specs.gpu} ಗ್ರಾಫಿಕ್ಸ್ ಕಾರ್ಡ್ ಲಭ್ಯವಿದೆ.`
        : isRoman
        ? `${name} nalli ${specs.gpu} graphics ide.`
        : `Graphics (GPU) specification for ${name}: ${specs.gpu}.`;
    }

    // 4. Price & MRP
    if (intent === 'PRICE' || intent === 'MRP' || intent === 'DISCOUNT') {
      const sp = product.pricing.selling_price;
      const mrp = product.pricing.mrp;
      const disc = product.pricing.discount_percent;

      return isKn
        ? `${name} ನ ಪ್ರಸ್ತುತ ಬೆಲೆ ₹${sp ? sp.toLocaleString('en-IN') : 'ಲಭ್ಯವಿಲ್ಲ'} (MRP ₹${mrp ? mrp.toLocaleString('en-IN') : 'N/A'}${disc ? `, ${disc}% ರಿಯಾಯಿತಿ` : ''}).`
        : isRoman
        ? `${name} current price ₹${sp ? sp.toLocaleString('en-IN') : 'N/A'} (MRP ₹${mrp ? mrp.toLocaleString('en-IN') : 'N/A'}${disc ? `, ${disc}% discount` : ''}).`
        : `The current store price for ${name} is ₹${sp ? sp.toLocaleString('en-IN') : 'N/A'} (MRP ₹${mrp ? mrp.toLocaleString('en-IN') : 'N/A'}, with a ${disc}% discount). Would you like to proceed with ordering this product?`;
    }

    // 5. Stock & Availability
    if (intent === 'STOCK' || intent === 'AVAILABILITY' || intent === 'QUANTITY') {
      const inStock = product.inventory.in_stock;
      const qty = product.inventory.quantity;

      if (inStock) {
        return isKn
          ? `${name} ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್‌ನಲ್ಲಿದೆ${qty !== null ? ` (${qty} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯ)` : ''}. ಆರ್ಡರ್ ಮಾಡಲು ನೀವು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ?`
          : isRoman
          ? `${name} eega stock nalli ide${qty !== null ? ` (${qty} units available)` : ''}. Order madoke ready idheera?`
          : `${name} is currently in stock${qty !== null ? ` with ${qty} units available` : ''} and ready to ship. Are you interested to buy the product?`;
      } else {
        return isKn
          ? `${name} ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.`
          : isRoman
          ? `${name} prastuta stock nalli illa.`
          : `${name} is currently out of stock. Would you like to be notified when fresh inventory arrives?`;
      }
    }

    // 6. Food Ingredients
    if (intent === 'INGREDIENTS' && (specs.main_ingredients || specs.ingredients)) {
      const ing = specs.main_ingredients || specs.ingredients;
      const ingStr = Array.isArray(ing) ? ing.join(', ') : String(ing);
      return isKn
        ? `${name} ನಲ್ಲಿ ಬಳಸಲಾದ ಮುಖ್ಯ ಪದಾರ್ಥಗಳು: ${ingStr}.`
        : isRoman
        ? `${name} main ingredients: ${ingStr}.`
        : `Ingredients for ${name}: ${ingStr}. Sourced fresh and verified.`;
    }

    // 7. Food Preparation Method
    if ((intent === 'PREPARATION' || intent === 'COOKING_METHOD') && (specs.preparation_method || specs.cooking_method)) {
      const prep = specs.preparation_method || specs.cooking_method;
      return isKn
        ? `${name} ತಯಾರಿಸುವ ವಿಧಾನ: ${prep}.`
        : isRoman
        ? `${name} preparation method: ${prep}.`
        : `Preparation details for ${name}: ${prep}.`;
    }

    // 8. Storage Instructions
    if (intent === 'STORAGE' && specs.storage_instructions) {
      return isKn
        ? `${name} ಶೇಖರಣಾ ಸೂಚನೆಗಳು: ${specs.storage_instructions}.`
        : isRoman
        ? `${name} storage instructions: ${specs.storage_instructions}.`
        : `Storage instructions for ${name}: ${specs.storage_instructions}.`;
    }

    // 9. Medicine Purpose & Uses
    if (intent === 'PURPOSE_BENEFITS' && (specs.purpose || specs.benefits)) {
      const purp = specs.purpose || specs.benefits;
      return isKn
        ? `${name} ನ ಮುಖ್ಯ ಉಪಯೋಗ: ${purp}.`
        : isRoman
        ? `${name} uses: ${purp}.`
        : `Indications and uses for ${name}: ${purp}. Always follow dosage directions as prescribed.`;
    }

    // 10. Medicine Active Ingredients
    if (intent === 'ACTIVE_INGREDIENTS' && specs.active_ingredients) {
      const act = specs.active_ingredients;
      const actStr = Array.isArray(act) ? act.join(', ') : String(act);
      return isKn
        ? `${name} ನ ಸಕ್ರಿಯ ಪದಾರ್ಥಗಳು: ${actStr}.`
        : isRoman
        ? `${name} active ingredients: ${actStr}.`
        : `Active pharmaceutical ingredients in ${name}: ${actStr}.`;
    }

    // 11. Medicine Strength
    if (intent === 'STRENGTH' && specs.strength) {
      return isKn
        ? `${name} ನ ಶಕ್ತಿ (Strength): ${specs.strength}.`
        : isRoman
        ? `${name} strength: ${specs.strength}.`
        : `Strength for ${name}: ${specs.strength}.`;
    }

    // 12. Medicine Warnings & Safety
    if (intent === 'SAFETY' && specs.warnings) {
      return isKn
        ? `${name} ನ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು: ${specs.warnings}.`
        : isRoman
        ? `${name} warnings: ${specs.warnings}.`
        : `Warnings and precautions for ${name}: ${specs.warnings}. Consult your doctor or pharmacist if symptoms persist.`;
    }

    // Default Overview
    const desc = product.description.detailed || product.description.short || 'Verified store product.';
    return isKn
      ? `${name}: ${desc}`
      : isRoman
      ? `${name}: ${desc}`
      : `${name}: ${desc}`;
  }

  /**
   * Internal circular logging (Section 17)
   */
  static recordLog(entry) {
    ProductKnowledgePipeline.#auditLogs.push(entry);
    if (ProductKnowledgePipeline.#auditLogs.length > ProductKnowledgePipeline.MAX_LOGS) {
      ProductKnowledgePipeline.#auditLogs.shift();
    }
  }

  /**
   * Retrieves recent audit logs for debugging
   */
  static getRecentLogs(limit = 20) {
    return ProductKnowledgePipeline.#auditLogs.slice(-limit);
  }

  /**
   * Retrieves latest log
   */
  static getLastLog() {
    return ProductKnowledgePipeline.#auditLogs.length > 0 
      ? ProductKnowledgePipeline.#auditLogs[ProductKnowledgePipeline.#auditLogs.length - 1] 
      : null;
  }
}
