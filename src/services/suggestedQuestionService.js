import { db } from '../db/database.js';

/**
 * DYNAMIC SUGGESTED QUESTION SERVICE
 * Generates context-aware, 5–8 natural customer question suggestions dynamically
 * from the complete verified background dataset of the currently selected product.
 * 
 * Rules:
 * 1. Directly answerable using the verified product/store dataset.
 * 2. Relevant to the product category.
 * 3. Never repeat questions or topics already answered in the conversation.
 * 4. Adapt to conversation stage and purchase intent (prioritizing order/COD/delivery).
 * 5. Adapt dynamically to customer language (English vs Kannada).
 * 6. Never assume or invent missing information; skip any question whose underlying field is missing.
 * 7. Strictly bounded to 5–8 suggestions.
 */
export class SuggestedQuestionService {

  /**
   * Normalize text for keyword & intent detection
   */
  static normalizeText(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[^\w\s\u0C80-\u0CFF]/gi, ' ').trim();
  }

  /**
   * Check if a field value is valid and non-empty
   */
  static hasValue(val) {
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0 && !/^not available/i.test(val);
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'number') return !isNaN(val);
    if (typeof val === 'boolean') return true;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return false;
  }

  /**
   * Extract all discussed topics from conversational history, latest message, and AI reply
   */
  static extractDiscussedTopics(history = [], latestMessage = '', latestReply = '') {
    const discussed = new Set();
    const allTexts = [];

    if (Array.isArray(history)) {
      for (const t of history) {
        if (t.text) allTexts.push(t.text);
        if (t.toolCalled) {
          const tc = t.toolCalled.toLowerCase();
          if (tc.includes('price')) discussed.add('price');
          if (tc.includes('stock')) discussed.add('stock');
          if (tc.includes('delivery')) discussed.add('delivery');
          if (tc.includes('cod') || tc.includes('payment')) discussed.add('payment_cod');
          if (tc.includes('return') || tc.includes('exchange') || tc.includes('refund')) discussed.add('return_exchange');
          if (tc.includes('order') || tc.includes('checkout')) discussed.add('order_intent');
          if (tc.includes('size')) discussed.add('sizes');
          if (tc.includes('colour') || tc.includes('color')) discussed.add('colours');
          if (tc.includes('ingredient')) discussed.add('ingredients');
          if (tc.includes('recipe') || tc.includes('serving') || tc.includes('taste')) discussed.add('food_details');
          if (tc.includes('spec') || tc.includes('hardware') || tc.includes('processor') || tc.includes('ram')) discussed.add('specs_core');
          if (tc.includes('display') || tc.includes('screen')) discussed.add('display');
          if (tc.includes('battery')) discussed.add('battery');
          if (tc.includes('camera')) discussed.add('camera');
          if (tc.includes('warranty')) discussed.add('warranty');
          if (tc.includes('uses') || tc.includes('purpose') || tc.includes('benefit')) discussed.add('medicine_uses');
          if (tc.includes('dosage') || tc.includes('howtouse')) discussed.add('medicine_dosage');
          if (tc.includes('sideeffect') || tc.includes('warning')) discussed.add('medicine_safety');
          if (tc.includes('prescription')) discussed.add('prescription');
          if (tc.includes('expiry') || tc.includes('storage')) discussed.add('expiry_storage');
          if (tc.includes('storelocation')) discussed.add('store_location');
        }
      }
    }

    if (latestMessage) allTexts.push(latestMessage);
    if (latestReply) allTexts.push(latestReply);

    const corpus = allTexts.join(' ').toLowerCase();

    // 1. Price & Discounts
    if (/\b(price|cost|how much|rate|discount|offer|deal|mrp|rupees|₹|rs|ಬೆಲೆ|ಎಷ್ಟು|ರಿಯಾಯಿತಿ)\b/i.test(corpus)) {
      discussed.add('price');
    }

    // 2. Stock & Availability
    if (/\b(stock|in stock|available|available ideya|inventory|sold out|ಯೂನಿಟ್|ಸ್ಟಾಕ್|ಲಭ್ಯವಿದೆಯೇ)\b/i.test(corpus)) {
      discussed.add('stock');
    }

    // 3. Sizes & Fit & Storage/RAM configurations
    if (/\b(size|sizes|sizing|fit|s|m|l|xl|xxl|small|medium|large|extra large|configurations?|storage configurations|ram variants|variants|capacities|pack sizes?|portion|serving sizes?|shoe sizes?|ಸೈಜ್|ಫಿಟ್|ಕಾನ್ಫಿಗರೇಶನ್)\b/i.test(corpus)) {
      discussed.add('sizes');
    }

    // 4. Colours & Shades
    if (/\b(colour|colours|color|colors|shade|shades|black|white|blue|red|green|ಬಣ್ಣ|ಶೇಡ್)\b/i.test(corpus)) {
      discussed.add('colours');
    }

    // 5. Fabric & Material
    if (/\b(fabric|material|cotton|polyester|gsm|cloth|textile|upper|sole|ಫ್ಯಾಬ್ರಿಕ್|ಬಟ್ಟೆ)\b/i.test(corpus)) {
      discussed.add('fabric_material');
    }

    // 6. Wash Care
    if (/\b(wash|washing|wash care|machine wash|dry clean|ತೊಳೆಯುವ)\b/i.test(corpus)) {
      discussed.add('wash_care');
    }

    // 7. Core Specs / Processor / RAM / Storage
    if (/\b(processor|cpu|intel|amd|ryzen|snapdragon|ram|rom|storage|ssd|hard disk|gb|tb|ಪ್ರೊಸೆಸರ್|ಸ್ಟೋರೇಜ್)\b/i.test(corpus)) {
      discussed.add('specs_core');
    }

    // 8. Display & Refresh Rate
    if (/\b(display|screen|resolution|refresh rate|hz|oled|amoled|ips|ಡಿಸ್ಪ್ಲೇ|ಸ್ಕ್ರೀನ್)\b/i.test(corpus)) {
      discussed.add('display');
    }

    // 9. Battery & Charging
    if (/\b(battery|mah|charging|charger|fast charging|backup|ಬ್ಯಾಟರಿ|ಚಾರ್ಜಿಂಗ್)\b/i.test(corpus)) {
      discussed.add('battery');
    }

    // 10. Camera
    if (/\b(camera|megapixel|mp|selfie|portrait|zoom|4k|ಕ್ಯಾಮೆರಾ)\b/i.test(corpus)) {
      discussed.add('camera');
    }

    // 11. Audio & ANC
    if (/\b(anc|noise cancellation|audio|sound|bass|mic|microphone|ಧ್ವನಿ)\b/i.test(corpus)) {
      discussed.add('audio_anc');
    }

    // 12. Medicine Active Ingredients & Strength
    if (/\b(active ingredient|ingredients|composition|salt|strength|mg|ಪದಾರ್ಥ|ಸಾಮಗ್ರಿ)\b/i.test(corpus)) {
      discussed.add('ingredients');
    }

    // 13. Medicine Uses & Purpose
    if (/\b(use|uses|purpose|symptoms|cure|indication|benefits|ಉಪಯೋಗ|ಪ್ರಯೋಜನ)\b/i.test(corpus)) {
      discussed.add('medicine_uses');
    }

    // 14. Medicine Dosage & Directions
    if (/\b(dosage|dose|how to use|how to take|before food|after food|drops|tablet|ಸೇವಿಸುವುದು|ತೆಗೆದುಕೊಳ್ಳುವ)\b/i.test(corpus)) {
      discussed.add('medicine_dosage');
    }

    // 15. Medicine Side Effects & Warnings
    if (/\b(side effect|side effects|precautions|warnings|contraindications|allergy|safe|ಅಡ್ಡಪರಿಣಾಮ|ಎಚ್ಚರಿಕೆ)\b/i.test(corpus)) {
      discussed.add('medicine_safety');
    }

    // 16. Prescription Status
    if (/\b(prescription|rx|doctor|over the counter|otc|ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್)\b/i.test(corpus)) {
      discussed.add('prescription');
    }

    // 17. Expiry Date & Storage
    if (/\b(expiry|expiry date|shelf life|batch|storage|store|temperature|ಎಕ್ಸ್‌ಪೈರಿ|ಶೇಖರಣಾ)\b/i.test(corpus)) {
      discussed.add('expiry_storage');
    }

    // 18. Food Ingredients & Veg/Non-Veg
    if (/\b(food ingredients|masala|veg|vegetarian|non-veg|vegan|dietary|ಸಸ್ಯಾಹಾರ|ಮಾಂಸಾಹಾರ)\b/i.test(corpus)) {
      discussed.add('food_ingredients');
    }

    // 19. Food Taste & Serving
    if (/\b(taste|spicy|spice level|sweet|serving|how to eat|reheating|preparation|ರುಚಿ|ಖಾರ|ಬಡಿಸುವ)\b/i.test(corpus)) {
      discussed.add('food_details');
    }

    // 19B. Food Nutrition & Allergens
    if (/\b(protein|calories?|carbs|fat|nutrition|preservatives?|allergens?|ಪ್ರೋಟೀನ್|ಕ್ಯಾಲೋರಿ)\b/i.test(corpus)) {
      discussed.add('food_nutrition');
    }

    // 19C. Dedicated GPU & Gaming
    if (/\b(gpu|graphics|graphics card|rtx|geforce|gaming|aaa games|ಗ್ರಾಫಿಕ್ಸ್)\b/i.test(corpus)) {
      discussed.add('specs_gpu');
    }

    // 19D. Phone AI Features & IP Rating
    if (/\b(ai features?|ip rating|water resistant|waterproof|ip68|charger in box)\b/i.test(corpus)) {
      discussed.add('specs_phone_features');
    }

    // 19E. Laptop Cooling & Thermal
    if (/\b(cooling|thermal|fans?|overheating|heat|iceblade|ಕೂಲಿಂಗ್)\b/i.test(corpus)) {
      discussed.add('specs_cooling');
    }

    // 19F. Laptop Keyboard & RGB Backlighting
    if (/\b(keyboard|keyboards|backlit|rgb|wasd|typing|ಕೀಬೋರ್ಡ್)\b/i.test(corpus)) {
      discussed.add('specs_keyboard');
    }

    // 19G. Laptop Weight & Portability
    if (/\b(weight|weigh|portable|portability|heavy|kg|grams?|ತೂಕ)\b/i.test(corpus)) {
      discussed.add('specs_weight');
    }

    // 19H. Laptop Upgradeability & Expansion
    if (/\b(upgrade|upgradeability|upgradeable|expand|expansion|slots?|ಅಪ್‌ಗ್ರೇಡ್)\b/i.test(corpus)) {
      discussed.add('specs_upgrade');
    }

    // 19I. Laptop Durability & Military Testing
    if (/\b(durability|durable|military|mil-std|mil-std-810h|build quality|ಬಾಳಿಕೆ)\b/i.test(corpus)) {
      discussed.add('specs_durability');
    }

    // 19J. Laptop OS & Pre-installed Software
    if (/\b(operating system|os|windows|windows 11|ms office|ಆಪರೇಟಿಂಗ್ ಸಿಸ್ಟಮ್)\b/i.test(corpus)) {
      discussed.add('specs_os');
    }

    // 19K. AI / Machine Learning Suitability
    if (/\b(ai|ml|artificial intelligence|machine learning|deep learning|data science|coding|ಪ್ರೋಗ್ರಾಮಿಂಗ್)\b/i.test(corpus)) {
      discussed.add('ai_ml_suitability');
    }

    // 19L. Warranty Registration Portal
    if (/\b(warranty registration|register warranty|snid|service tag|myasus|vantage|ನೋಂದಾಯಿಸುವುದು)\b/i.test(corpus)) {
      discussed.add('warranty_reg');
    }

    // 19M. 5G & Mobile Connectivity
    if (/\b(5g|connectivity|sim|bands?|network)\b/i.test(corpus)) {
      discussed.add('specs_connectivity');
    }

    // 19N. Fast Charging & Charger
    if (/\b(fast charge|fast charging|charging speed|wattage|67w|33w|120w|ಚಾರ್ಜಿಂಗ್)\b/i.test(corpus)) {
      discussed.add('specs_charging');
    }

    // 19O. Food Reheating & Serving
    if (/\b(reheat|reheating|microwave|warm|ಮರುಬಿಸಿ)\b/i.test(corpus)) {
      discussed.add('food_reheat');
    }

    // 19P. Food Traditional Heritage
    if (/\b(traditional|heritage|authentic|origin|history|ಸಾಂಪ್ರದಾಯಿಕ)\b/i.test(corpus)) {
      discussed.add('food_heritage');
    }

    // 19Q. Food Cancellation & Order Policy
    if (/\b(food cancel|cancellation policy|cancel food|ಕ್ಯಾನ್ಸಲ್)\b/i.test(corpus)) {
      discussed.add('food_cancel');
    }

    // 19R. Food Hygiene & Safety
    if (/\b(hygiene|safety standards|cleanliness|food safety|ನೈರ್ಮಲ್ಯ)\b/i.test(corpus)) {
      discussed.add('food_hygiene');
    }

    // 19S. Medicine Food Requirement (Before/After Food)
    if (/\b(before food|after food|empty stomach|with meals?|ಊಟಕ್ಕೆ ಮುಂಚೆ|ಊಟದ ನಂತರ)\b/i.test(corpus)) {
      discussed.add('med_food_req');
    }

    // 19T. Medicine Age Suitability
    if (/\b(age limit|age suitability|children|kids|elderly|seniors|ವಯಸ್ಸಿನ)\b/i.test(corpus)) {
      discussed.add('med_age');
    }

    // 19U. Medicine Drug Interactions
    if (/\b(drug interactions?|interact|other medicines?|ಪ್ರತಿಕೂಲ)\b/i.test(corpus)) {
      discussed.add('med_interactions');
    }

    // 19V. Medicine Authenticity & Batch Verification
    if (/\b(authentic|genuine|counterfeit|original|batch verification|ಅಸಲಿ)\b/i.test(corpus)) {
      discussed.add('med_authenticity');
    }

    // 20. Skin Type Suitability (Cosmetics)
    if (/\b(skin type|oily skin|dry skin|sensitive skin|dermatologist|ತ್ವಚೆ|ಚರ್ಮ)\b/i.test(corpus)) {
      discussed.add('skin_suitability');
    }

    // 21. Warranty & Guarantee
    if (/\b(warranty|guarantee|repair|service tag|myasus|ವಾರಂಟಿ)\b/i.test(corpus)) {
      discussed.add('warranty');
    }

    // 22. Delivery Timeline & Shipping
    if (/\b(delivery|shipping|courier|dispatch|days|how long to deliver|pincode|quick delivery|20 min|twenty min|instant delivery|ಡೆಲಿವರಿ|ರವಾನೆ|ತ್ವರಿತ|೨೦ ನಿಮಿಷ)\b/i.test(corpus)) {
      discussed.add('delivery');
      discussed.add('quick_delivery');
    }

    // 23. Cash on Delivery & Payment
    if (/\b(cod|cash on delivery|payment|upi|card|pay on delivery|ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ|ಪಾವತಿ)\b/i.test(corpus)) {
      discussed.add('payment_cod');
    }

    // 24. Return & Exchange Policy
    if (/\b(return|exchange|refund|replacement|replace|ರಿಟರ್ನ್|ಎಕ್ಸ್‌ಚೇಂಜ್|ಮರುಪಾವತಿ)\b/i.test(corpus)) {
      discussed.add('return_exchange');
    }

    // 25. Order Placement Intent
    if (/\b(place order|buy now|confirm order|want to buy|interested to buy|book this|ಖರೀದಿಸಲು|ಆರ್ಡರ್)\b/i.test(corpus)) {
      discussed.add('order_intent');
    }

    // 26. Store Location & Physical Visit
    if (/\b(store location|store address|where is the store|visit store|indiranagar|showroom|ಅಂಗಡಿ ಎಲ್ಲಿ|ವಿಳಾಸ)\b/i.test(corpus)) {
      discussed.add('store_location');
    }

    return discussed;
  }

  /**
   * Detect customer purchase intent from conversation history and latest message
   */
  static detectPurchaseIntent(history = [], latestMessage = '') {
    const combined = [
      ...history.map(t => t.text || ''),
      latestMessage || ''
    ].join(' ').toLowerCase();

    const highIntentRegex = /(buy|order|purchase|checkout|confirm my order|place order|cash on delivery|send to my address|i will take it|want to order|ಖರೀದಿಸಲು|ಆರ್ಡರ್ ಮಾಡಲು|ಬುಕ್ ಮಾಡಲು|ಆರ್ಡರ್ ಕನ್ಫರ್ಮ್)/i;
    const mediumIntentRegex = /(how to buy|how to order|can i order|payment method|cod available|when will it arrive|delivery to bengaluru|ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ ಇದೆಯಾ|ಹೇಗೆ ಆರ್ಡರ್ ಮಾಡುವುದು)/i;

    if (highIntentRegex.test(combined)) {
      return { hasPurchaseIntent: true, level: 'high' };
    }
    if (mediumIntentRegex.test(combined)) {
      return { hasPurchaseIntent: true, level: 'medium' };
    }
    return { hasPurchaseIntent: false, level: 'low' };
  }

  /**
   * Detect conversation stage
   */
  static detectConversationStage(history = [], discussedTopics = new Set(), purchaseIntent = { hasPurchaseIntent: false }) {
    if (purchaseIntent.hasPurchaseIntent) {
      return 'purchase_intent';
    }
    const turnCount = history.length;
    if (turnCount === 0 || (turnCount <= 1 && discussedTopics.size === 0)) {
      return 'discovery';
    }
    if (discussedTopics.has('delivery') || discussedTopics.has('payment_cod') || discussedTopics.has('return_exchange')) {
      return 'decision';
    }
    if (discussedTopics.has('stock') || discussedTopics.has('sizes') || discussedTopics.has('colours') || discussedTopics.has('specs_core') || discussedTopics.has('price')) {
      return 'evaluation';
    }
    return 'evaluation';
  }

  /**
   * Detect language (English vs Kannada)
   */
  static detectLanguage(language = 'en', latestMessage = '', history = []) {
    const latest = (latestMessage || '').trim().toLowerCase();

    // 1. Explicit Roman Kannada switch
    if (/(switch to roman kannada|speak in roman kannada|roman kannada|kanglish)\b/i.test(latest) || language === 'kn_roman' || language === 'roman_kn') {
      return 'kn_roman';
    }

    // 2. Explicit English switch in latest message always wins
    if (/(switch to english|speak in english|speak english|english please|change to english|english)\b/i.test(latest) || latest === 'english') {
      return 'en';
    }

    // 3. Explicit Kannada switch in latest message
    if (/(switch to kannada|speak in kannada|kannadadalli mathadi|kannada ge switch|kannadadalli heli)\b/i.test(latest) || /[\u0C80-\u0CFF]/.test(latestMessage)) {
      return 'kn';
    }

    // 4. If explicit language requested
    if (language === 'kn') return 'kn';
    if (language === 'en') {
      if (/\b(kannada|kannadadalli|mathadi|heli|ideya|beku|eshtu|aguthe|madabahuda)\b/i.test(latest)) {
        return 'kn';
      }
      return 'en';
    }

    // 5. Check recent user turns
    const userTurns = history.filter(t => t.role === 'user' || t.role === 'customer').slice(-2);
    for (const t of userTurns) {
      if (t.language === 'kn_roman' || t.language === 'roman_kn') return 'kn_roman';
      if (/[\u0C80-\u0CFF]/.test(t.text)) return 'kn';
      if (/\b(kannadadalli|mathadi|kannada)\b/i.test(t.text)) return 'kn';
    }

    return 'en';
  }

  /**
   * Main Generator Method:
   * Dynamically generates 5–8 context-aware, category-tailored suggested questions
   * from the complete verified background dataset of the currently selected product.
   */
  static generateSuggestedQuestions(product, options = {}) {
    if (!product) return [];

    const {
      history = [],
      latestMessage = '',
      latestReply = '',
      language = 'en',
      stage: forcedStage = null,
      purchaseIntent: forcedIntent = null
    } = options;

    const lang = SuggestedQuestionService.detectLanguage(language, latestMessage, history);
    const isKn = lang === 'kn';

    // 1. Discussed Topics
    const discussedTopics = SuggestedQuestionService.extractDiscussedTopics(history, latestMessage, latestReply);

    // 2. Purchase Intent
    const purchaseIntent = forcedIntent || SuggestedQuestionService.detectPurchaseIntent(history, latestMessage);

    // 3. Conversation Stage
    const stage = forcedStage || SuggestedQuestionService.detectConversationStage(history, discussedTopics, purchaseIntent);

    // 4. Inspect Product Dataset & Store Info
    const candidatePool = [];

    // Direct Asked Text & Question ID Matching
    const askedTexts = new Set();
    const allQueryTexts = [];
    if (Array.isArray(history)) {
      for (const t of history) {
        if (t.text) {
          allQueryTexts.push(t.text);
          askedTexts.add(SuggestedQuestionService.normalizeText(t.text));
        }
      }
    }
    if (latestMessage) {
      allQueryTexts.push(latestMessage);
      askedTexts.add(SuggestedQuestionService.normalizeText(latestMessage));
    }

    // Helper to add question candidate with strict field checks
    const addCandidate = (def) => {
      // def: { id, topic, priority, stages, condition, textEn, textKn, icon }
      if (typeof def.condition === 'function') {
        if (!def.condition(product)) return;
      } else if (!def.condition) {
        return;
      }

      // Check if candidate exact text was already asked
      const normEn = SuggestedQuestionService.normalizeText(def.textEn);
      const normKn = SuggestedQuestionService.normalizeText(def.textKn);
      const normRoman = def.textRoman ? SuggestedQuestionService.normalizeText(def.textRoman) : '';

      if (askedTexts.has(normEn) || askedTexts.has(normKn) || (normRoman && askedTexts.has(normRoman))) {
        return;
      }

      // Check if any query in history directly asked this question or vice-versa
      for (const raw of allQueryTexts) {
        const normRaw = SuggestedQuestionService.normalizeText(raw);
        if (normRaw && normRaw.length > 5) {
          if (normEn.includes(normRaw) || normRaw.includes(normEn) || (normKn && normRaw.includes(normKn))) {
            return;
          }
        }
      }

      // Check if topic is already discussed
      if (discussedTopics.has(def.topic)) return;

      let score = def.priority || 50;

      // Stage adjustment
      if (def.stages && (def.stages.includes(stage) || def.stages.includes('exploring') || def.stages.includes('initial'))) {
        score += 15;
      }

      // Conversational flow score boosts based on discussed topics
      if (discussedTopics.has('price')) {
        if (def.topic === 'payment_cod') score += 40;
        if (def.topic === 'delivery') score += 35;
        if (def.topic === 'return_exchange') score += 30;
        if (def.topic === 'stock') score += 25;
      }
      if (discussedTopics.has('stock')) {
        if (def.topic === 'order_intent') score += 50;
        if (def.topic === 'delivery') score += 40;
        if (def.topic === 'payment_cod') score += 35;
      }
      if (discussedTopics.has('sizes') || discussedTopics.has('colours')) {
        if (def.topic === 'stock') score += 40;
        if (def.topic === 'price') score += 35;
        if (def.topic === 'payment_cod') score += 30;
      }
      if (discussedTopics.has('delivery')) {
        if (def.topic === 'payment_cod') score += 45;
        if (def.topic === 'order_intent') score += 50;
        if (def.topic === 'return_exchange') score += 35;
      }
      if (discussedTopics.has('payment_cod')) {
        if (def.topic === 'order_intent') score += 60;
        if (def.topic === 'return_exchange') score += 40;
        if (def.topic === 'delivery') score += 35;
      }
      if (discussedTopics.has('specs_core') || discussedTopics.has('specs_gpu') || discussedTopics.has('ingredients') || discussedTopics.has('food_ingredients') || discussedTopics.has('medicine_uses')) {
        if (def.topic === 'price') score += 40;
        if (def.topic === 'stock') score += 35;
        if (def.topic === 'warranty') score += 30;
      }

      // Purchase intent adjustment
      if (purchaseIntent.hasPurchaseIntent) {
        if (['order_intent', 'payment_cod', 'delivery', 'stock', 'return_exchange'].includes(def.topic)) {
          score += 55;
        } else {
          score -= 20;
        }
      }

      const text = isKn ? def.textKn : (lang === 'kn_roman' ? (def.textRoman || def.textEn) : def.textEn);
      if (!text) return;

      candidatePool.push({
        id: def.id,
        topic: def.topic,
        score,
        text,
        icon: def.icon || '💬'
      });
    };

    const category = (product.category || '').toLowerCase();
    const specs = product.specs || {};
    const store = db.getStoreLocation();

    // -------------------------------------------------------------------------
    // CANDIDATE DEFINITIONS WITH STRICT VERIFIED DATA FIELD GUARDS
    // -------------------------------------------------------------------------

    // A. PRICING & DISCOUNT (Condition: salePrice or price exists)
    addCandidate({
      id: 'check_price_discount',
      topic: 'price',
      priority: 85,
      stages: ['discovery', 'initial', 'evaluation', 'exploring'],
      condition: (p) => SuggestedQuestionService.hasValue(p.salePrice) || SuggestedQuestionService.hasValue(p.price),
      textEn: (product.discountPercent > 0)
        ? `What is the price after the ${product.discountPercent}% discount?`
        : `What is the price of ${product.name}?`,
      textKn: (product.discountPercent > 0)
        ? `${product.discountPercent}% ರಿಯಾಯಿತಿಯ ನಂತರ ಅಂತಿಮ ಬೆಲೆ ಎಷ್ಟು?`
        : `${product.name} ನ ಬೆಲೆ ಎಷ್ಟು?`,
      icon: '💰'
    });

    // B. STOCK AVAILABILITY (Condition: inStock or stockCount exists)
    addCandidate({
      id: 'check_stock',
      topic: 'stock',
      priority: 80,
      stages: ['discovery', 'initial', 'evaluation', 'exploring', 'purchase_intent'],
      condition: (p) => p.inStock !== undefined || SuggestedQuestionService.hasValue(p.stockCount),
      textEn: `Is this product currently in stock?`,
      textKn: `ಇದು ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್‌ನಲ್ಲಿ ಲಭ್ಯವಿದೆಯೇ?`,
      icon: '🏷️'
    });

    // C. SIZES / CONFIGURATIONS (Condition: sizes array is populated)
    let sizesTextEn = `What sizes are available for this?`;
    let sizesTextKn = `ಇದರಲ್ಲಿ ಯಾವ ಸೈಜ್‌ಗಳು ಲಭ್ಯವಿವೆ?`;
    let sizesIcon = '📏';

    if (/laptop/i.test(category)) {
      sizesTextEn = `What RAM and SSD storage configurations are available?`;
      sizesTextKn = `ಯಾವ RAM ಮತ್ತು SSD ಸ್ಟೋರೇಜ್ ಕಾನ್ಫಿಗರೇಶನ್‌ಗಳು ಲಭ್ಯವಿವೆ?`;
      sizesIcon = '💾';
    } else if (/mobile|phone/i.test(category)) {
      sizesTextEn = `What storage capacities and RAM variants are available?`;
      sizesTextKn = `ಯಾವ ಸ್ಟೋರೇಜ್ ಮತ್ತು RAM ವೇರಿಯಂಟ್‌ಗಳು ಲಭ್ಯವಿವೆ?`;
      sizesIcon = '📱';
    } else if (/medic|health/i.test(category)) {
      sizesTextEn = `What pack sizes or tablet counts are available?`;
      sizesTextKn = `ಯಾವ ಪ್ಯಾಕ್ ಸೈಜ್‌ಗಳು ಲಭ್ಯವಿವೆ?`;
      sizesIcon = '📦';
    } else if (/food/i.test(category)) {
      sizesTextEn = `What portion or serving sizes are available?`;
      sizesTextKn = `ಯಾವ ಸರ್ವಿಂಗ್ ಅಥವಾ ಪೋರ್ಷನ್ ಅಳತೆಗಳು ಲಭ್ಯವಿವೆ?`;
      sizesIcon = '🍽️';
    } else if (/shoe/i.test(category)) {
      sizesTextEn = `What UK shoe sizes are available?`;
      sizesTextKn = `ಯಾವ UK ಶೂ ಸೈಜ್‌ಗಳು ಲಭ್ಯವಿವೆ?`;
      sizesIcon = '👟';
    }

    addCandidate({
      id: 'check_sizes',
      topic: 'sizes',
      priority: 82,
      stages: ['discovery', 'initial', 'evaluation', 'exploring'],
      condition: (p) => Array.isArray(p.sizes) && p.sizes.length > 0,
      textEn: sizesTextEn,
      textKn: sizesTextKn,
      icon: sizesIcon
    });

    // D. COLOURS / SHADES (Condition: colours array is populated)
    let coloursTextEn = `What colour options are available?`;
    let coloursTextKn = `ಯಾವ ಬಣ್ಣಗಳ ಆಯ್ಕೆಗಳು ಲಭ್ಯವಿವೆ?`;
    let coloursIcon = '🎨';

    if (/cosmetic/i.test(category)) {
      coloursTextEn = `What shades or finishes are available?`;
      coloursTextKn = `ಯಾವ ಶೇಡ್‌ಗಳು ಅಥವಾ ಫಿನಿಶ್‌ಗಳು ಲಭ್ಯವಿವೆ?`;
      coloursIcon = '💄';
    } else if (/laptop|mobile|phone/i.test(category)) {
      coloursTextEn = `What colour finishes are available?`;
      coloursTextKn = `ಯಾವ ಕಲರ್ ಫಿನಿಶ್‌ಗಳು ಲಭ್ಯವಿವೆ?`;
      coloursIcon = '🎨';
    }

    addCandidate({
      id: 'check_colours',
      topic: 'colours',
      priority: 78,
      stages: ['discovery', 'initial', 'evaluation', 'exploring'],
      condition: (p) => !/food|medic|health/i.test(category) && Array.isArray(p.colours) && p.colours.length > 0,
      textEn: coloursTextEn,
      textKn: coloursTextKn,
      icon: coloursIcon
    });

    // E. CLOTHING: FABRIC & FIT (Condition: specs.fabric exists)
    addCandidate({
      id: 'check_fabric_fit',
      topic: 'fabric_material',
      priority: 75,
      stages: ['exploring'],
      condition: (p) => /cloth|apparel|shoe/i.test(category) && SuggestedQuestionService.hasValue(specs.fabric || specs.upper),
      textEn: specs.fit
        ? `What fabric is used and what is the fit?`
        : `What fabric and material is this made of?`,
      textKn: `ಇದರಲ್ಲಿ ಯಾವ ಫ್ಯಾಬ್ರಿಕ್ ಮತ್ತು ಮೆಟೀರಿಯಲ್ ಬಳಸಲಾಗಿದೆ?`,
      icon: '👕'
    });

    // F. CLOTHING: GSM WEIGHT (Condition: specs.gsm exists)
    addCandidate({
      id: 'check_gsm_weight',
      topic: 'fabric_material',
      priority: 70,
      stages: ['exploring'],
      condition: (p) => /cloth/i.test(category) && SuggestedQuestionService.hasValue(specs.gsm),
      textEn: `What is the GSM fabric weight of this item?`,
      textKn: `ಈ ಬಟ್ಟೆಯ GSM ತೂಕ ಎಷ್ಟು?`,
      icon: '⚖️'
    });

    // G. CLOTHING: WASH CARE (Condition: specs.washCare exists)
    addCandidate({
      id: 'check_wash_care',
      topic: 'wash_care',
      priority: 65,
      stages: ['exploring'],
      condition: (p) => /cloth/i.test(category) && SuggestedQuestionService.hasValue(specs.washCare),
      textEn: `What are the wash and care instructions?`,
      textKn: `ಇದನ್ನು ತೊಳೆಯುವ ಮತ್ತು ನಿರ್ವಹಿಸುವ ವಿಧಾನವೇನು?`,
      icon: '🧼'
    });

    // H. LAPTOP / MOBILE: PROCESSOR & CHIP (Condition: specs.processor or specs.cpu exists)
    addCandidate({
      id: 'check_processor',
      topic: 'specs_core',
      priority: 88,
      stages: ['initial', 'exploring'],
      condition: (p) => /laptop|mobile|phone|electronics/i.test(category) && SuggestedQuestionService.hasValue(specs.processor || specs.cpu),
      textEn: `Which processor powers this device?`,
      textKn: `ಈ ಡಿವೈಸ್‌ನಲ್ಲಿ ಯಾವ ಪ್ರೊಸೆಸರ್ ಇದೆ?`,
      icon: '⚡'
    });

    // I. LAPTOP / MOBILE: RAM & STORAGE (Condition: specs.ram or specs.storage exists)
    addCandidate({
      id: 'check_ram_storage',
      topic: 'specs_core',
      priority: 85,
      stages: ['initial', 'exploring'],
      condition: (p) => /laptop|mobile|phone/i.test(category) && (SuggestedQuestionService.hasValue(specs.ram) || SuggestedQuestionService.hasValue(specs.storage)),
      textEn: specs.upgradeability
        ? `What is the RAM and storage, and can it be upgraded?`
        : `What are the RAM and storage capacities?`,
      textKn: `ಇದರ RAM ಮತ್ತು ಸ್ಟೋರೇಜ್ ಸಾಮರ್ಥ್ಯ ಎಷ್ಟು?`,
      icon: '💾'
    });

    // J. LAPTOP / MOBILE: BATTERY & CHARGING (Condition: specs.battery or specs.charging exists)
    addCandidate({
      id: 'check_battery',
      topic: 'battery',
      priority: 80,
      stages: ['exploring'],
      condition: (p) => /laptop|mobile|phone|electronics/i.test(category) && (SuggestedQuestionService.hasValue(specs.battery) || SuggestedQuestionService.hasValue(specs.chargingTime)),
      textEn: specs.charging
        ? `What is the battery capacity and fast charging speed?`
        : `How long does the battery last?`,
      textKn: `ಬ್ಯಾಟರಿ ಸಾಮರ್ಥ್ಯ ಮತ್ತು ಚಾರ್ಜಿಂಗ್ ಸ್ಪೀಡ್ ಎಷ್ಟು?`,
      icon: '🔋'
    });

    // K. LAPTOP / MOBILE: DISPLAY & REFRESH RATE (Condition: specs.display or specs.refreshRate exists)
    addCandidate({
      id: 'check_display',
      topic: 'display',
      priority: 78,
      stages: ['exploring'],
      condition: (p) => /laptop|mobile|phone/i.test(category) && (SuggestedQuestionService.hasValue(specs.display) || SuggestedQuestionService.hasValue(specs.refreshRate)),
      textEn: specs.refreshRate
        ? `What are the display specs and refresh rate?`
        : `What are the screen and display specifications?`,
      textKn: `ಡಿಸ್ಪ್ಲೇ ಗಾತ್ರ ಮತ್ತು ರಿಫ್ರೆಶ್ ರೇಟ್ ಎಷ್ಟು?`,
      icon: '🖥️'
    });

    // L. MOBILE / LAPTOP: CAMERA (Condition: specs.camera exists)
    addCandidate({
      id: 'check_camera',
      topic: 'camera',
      priority: 75,
      stages: ['exploring'],
      condition: (p) => /laptop|mobile|phone/i.test(category) && SuggestedQuestionService.hasValue(specs.camera),
      textEn: `What are the camera specifications?`,
      textKn: `ಕ್ಯಾಮೆರಾ ಸ್ಪೆಸಿಫಿಕೇಶನ್‌ಗಳು ಯಾವುವು?`,
      icon: '📸'
    });

    // M. ELECTRONICS: ANC & AUDIO (Condition: specs.anc or specs.audioCodecs exists)
    addCandidate({
      id: 'check_anc',
      topic: 'audio_anc',
      priority: 82,
      stages: ['initial', 'exploring'],
      condition: (p) => /electronics|accessory/i.test(category) && (SuggestedQuestionService.hasValue(specs.anc) || SuggestedQuestionService.hasValue(specs.audioCodecs)),
      textEn: `Does this have Active Noise Cancellation (ANC)?`,
      textKn: `ಇದರಲ್ಲಿ ಆಕ್ಟಿವ್ ನಾಯ್ಸ್ ಕ್ಯಾನ್ಸಲೇಶನ್ (ANC) ಇದೆಯೇ?`,
      icon: '🎧'
    });

    // N. MEDICINE: ACTIVE INGREDIENTS & STRENGTH (Condition: activeIngredients or strength exists)
    addCandidate({
      id: 'check_med_ingredients',
      topic: 'ingredients',
      priority: 90,
      stages: ['initial', 'exploring'],
      condition: (p) => /medic|health/i.test(category) && (SuggestedQuestionService.hasValue(p.activeIngredients) || SuggestedQuestionService.hasValue(p.strength)),
      textEn: `What active ingredients and strength are in this medicine?`,
      textKn: `ಈ ಔಷಧಿಯಲ್ಲಿರುವ ಸಕ್ರಿಯ ಪದಾರ್ಥಗಳು (active ingredients) ಯಾವುವು?`,
      icon: '💊'
    });

    // O. MEDICINE: USES & PURPOSE (Condition: purpose or benefits exists)
    addCandidate({
      id: 'check_med_uses',
      topic: 'medicine_uses',
      priority: 92,
      stages: ['initial', 'exploring'],
      condition: (p) => /medic|health/i.test(category) && (SuggestedQuestionService.hasValue(p.purpose) || SuggestedQuestionService.hasValue(p.benefits)),
      textEn: `What is this medicine used for and what are its benefits?`,
      textKn: `ಈ ಔಷಧಿಯ ಮುಖ್ಯ ಉಪಯೋಗಗಳು ಮತ್ತು ಪ್ರಯೋಜನಗಳು ಯಾವುವು?`,
      icon: '🩺'
    });

    // P. MEDICINE: DOSAGE & HOW TO USE (Condition: howToUse or dosageForm exists)
    addCandidate({
      id: 'check_med_dosage',
      topic: 'medicine_dosage',
      priority: 85,
      stages: ['exploring'],
      condition: (p) => /medic|health/i.test(category) && (SuggestedQuestionService.hasValue(p.howToUse) || SuggestedQuestionService.hasValue(p.dosageForm)),
      textEn: `How should this medicine be taken and what is the dosage?`,
      textKn: `ಈ ಔಷಧಿಯನ್ನು ಹೇಗೆ ಸೇವಿಸಬೇಕು ಮತ್ತು ಡೋಸೇಜ್ ವಿವರಗಳೇನು?`,
      icon: '🕒'
    });

    // Q. MEDICINE: WARNINGS & PRECAUTIONS (Condition: warnings or sideEffects exists)
    addCandidate({
      id: 'check_med_warnings',
      topic: 'medicine_safety',
      priority: 80,
      stages: ['exploring'],
      condition: (p) => /medic|health/i.test(category) && (SuggestedQuestionService.hasValue(p.warnings) || SuggestedQuestionService.hasValue(p.sideEffects)),
      textEn: `Are there any warnings, precautions, or side effects?`,
      textKn: `ಇದಕ್ಕೆ ಯಾವುದಾದರೂ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು ಅಥವಾ ಅಡ್ಡಪರಿಣಾಮಗಳಿವೆಯೇ?`,
      icon: '⚠️'
    });

    // R. MEDICINE: PRESCRIPTION REQUIREMENT (Condition: prescriptionStatus exists)
    addCandidate({
      id: 'check_med_prescription',
      topic: 'prescription',
      priority: 78,
      stages: ['exploring', 'purchase_intent'],
      condition: (p) => /medic|health/i.test(category) && SuggestedQuestionService.hasValue(p.prescriptionStatus),
      textEn: `Do I need a doctor's prescription to purchase this?`,
      textKn: `ಇದನ್ನು ಖರೀದಿಸಲು ವೈದ್ಯರ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಗತ್ಯವಿದೆಯೇ?`,
      icon: '📋'
    });

    // R2. MEDICINE: QUICK 20-MINUTE DELIVERY (Condition: quickDeliveryAvailable exists or is medicine)
    addCandidate({
      id: 'check_med_quick_delivery',
      topic: 'quick_delivery',
      priority: 77,
      stages: ['exploring', 'purchase_intent', 'decision'],
      condition: (p) => /medic|health/i.test(category) && (p.quickDeliveryAvailable || SuggestedQuestionService.hasValue(p.deliveryDays)),
      textEn: `Is 20-minute quick delivery available for this medicine?`,
      textKn: `ಈ ಔಷಧಿಗೆ 20 ನಿಮಿಷಗಳ ತ್ವರಿತ ಡೆಲಿವರಿ ಲಭ್ಯವಿದೆಯೇ?`,
      icon: '⚡'
    });

    // S. MEDICINE / FOOD / COSMETICS: EXPIRY & STORAGE (Condition: expiryDate or storageInstructions exists)
    addCandidate({
      id: 'check_expiry_storage',
      topic: 'expiry_storage',
      priority: 72,
      stages: ['exploring'],
      condition: (p) => (/medic|health|food|cosmetic/i.test(category)) && (SuggestedQuestionService.hasValue(p.expiryDate) || SuggestedQuestionService.hasValue(p.storageInstructions)),
      textEn: `What is the expiry date and how should it be stored?`,
      textKn: `ಇದರ ಎಕ್ಸ್‌ಪೈರಿ ದಿನಾಂಕ ಮತ್ತು ಶೇಖರಣಾ ವಿಧಾನವೇನು?`,
      icon: '📅'
    });

    // T. FOOD: INGREDIENTS & DIETARY TYPE (Condition: mainIngredients or completeIngredients exists)
    addCandidate({
      id: 'check_food_ingredients',
      topic: 'food_ingredients',
      priority: 92,
      stages: ['initial', 'exploring'],
      condition: (p) => /food|snack|beverage/i.test(category) && (SuggestedQuestionService.hasValue(p.mainIngredients) || SuggestedQuestionService.hasValue(p.completeIngredients)),
      textEn: (p) => p.foodType
        ? `What ingredients are in this and is it ${p.foodType}?`
        : `What ingredients are used in this food item?`,
      textEn: `What ingredients are used in this food item?`,
      textKn: `ಇದರಲ್ಲಿ ಯಾವ ಸಾಮಗ್ರಿಗಳನ್ನು ಬಳಸಲಾಗಿದೆ ಮತ್ತು ಇದು ಸಸ್ಯಾಹಾರವೇ?`,
      icon: '🍲'
    });

    // U. FOOD: TASTE & SPICE LEVEL (Condition: taste or spiceLevel exists)
    addCandidate({
      id: 'check_food_taste',
      topic: 'food_details',
      priority: 84,
      stages: ['exploring'],
      condition: (p) => /food/i.test(category) && (SuggestedQuestionService.hasValue(p.taste) || SuggestedQuestionService.hasValue(p.spiceLevel)),
      textEn: `What is the taste and spice level of this food?`,
      textKn: `ಇದರ ರುಚಿ ಮತ್ತು ಖಾರದ ಮಟ್ಟ ಹೇಗಿದೆ?`,
      icon: '🌶️'
    });

    // V. FOOD: SERVING METHOD & PREPARATION (Condition: servingMethod or howToEat exists)
    addCandidate({
      id: 'check_food_serving',
      topic: 'food_details',
      priority: 78,
      stages: ['exploring'],
      condition: (p) => /food/i.test(category) && (SuggestedQuestionService.hasValue(p.servingMethod) || SuggestedQuestionService.hasValue(p.howToEat) || SuggestedQuestionService.hasValue(p.preparationMethod)),
      textEn: `How should this food be served and eaten?`,
      textKn: `ಇದನ್ನು ಹೇಗೆ ಬಡಿಸುವುದು ಮತ್ತು ಸೇವಿಸುವುದು?`,
      icon: '🍽️'
    });

    // VB. FOOD: PROTEIN & NUTRITION (Condition: protein or calories exists)
    addCandidate({
      id: 'check_food_nutrition',
      topic: 'food_nutrition',
      priority: 86,
      stages: ['initial', 'exploring'],
      condition: (p) => /food/i.test(category) && (SuggestedQuestionService.hasValue(p.protein) || SuggestedQuestionService.hasValue(p.calories)),
      textEn: `What is the protein and nutritional content per serving?`,
      textKn: `ಇದರಲ್ಲಿ ಪ್ರತಿ ಸರ್ವಿಂಗ್‌ಗೆ ಎಷ್ಟು ಪ್ರೋಟೀನ್ ಮತ್ತು ಕ್ಯಾಲೋರಿಗಳಿವೆ?`,
      icon: '🥗'
    });

    // VC. FOOD: ALLERGENS & PRESERVATIVES (Condition: allergens or preservatives exists)
    addCandidate({
      id: 'check_food_allergens',
      topic: 'food_safety',
      priority: 82,
      stages: ['exploring'],
      condition: (p) => /food/i.test(category) && (SuggestedQuestionService.hasValue(p.allergens) || SuggestedQuestionService.hasValue(p.preservatives)),
      textEn: `Are there any allergen warnings or preservatives?`,
      textKn: `ಇದರಲ್ಲಿ ಯಾವುದೇ ಅಲರ್ಜಿನ್ ಅಥವಾ ಕೃತಕ ಸಂರಕ್ಷಕಗಳು ಇವೆಯೇ?`,
      icon: '🌿'
    });

    // VD. LAPTOP: DEDICATED GPU & GAMING (Condition: specs.gpu or specs.graphics exists)
    addCandidate({
      id: 'check_laptop_gpu',
      topic: 'specs_gpu',
      priority: 84,
      stages: ['initial', 'exploring'],
      condition: (p) => /laptop/i.test(category) && (SuggestedQuestionService.hasValue(specs.gpu) || SuggestedQuestionService.hasValue(specs.graphics)),
      textEn: specs.gaming
        ? `What graphics card (GPU) does this have, and is it good for gaming?`
        : `What graphics card (GPU) is included in this laptop?`,
      textKn: `ಈ ಲ್ಯಾಪ್‌ಟಾಪ್‌ನಲ್ಲಿ ಯಾವ ಗ್ರಾಫಿಕ್ಸ್ ಕಾರ್ಡ್ (GPU) ಇದೆ?`,
      icon: '🎮'
    });

    // VE. PHONE: AI FEATURES & IP WATER RESISTANCE (Condition: specs.aiFeatures or specs.ipRating exists)
    addCandidate({
      id: 'check_phone_features',
      topic: 'specs_phone_features',
      priority: 77,
      stages: ['exploring'],
      condition: (p) => /mobile|phone/i.test(category) && (SuggestedQuestionService.hasValue(specs.aiFeatures) || SuggestedQuestionService.hasValue(specs.ipRating)),
      textEn: specs.aiFeatures
        ? `What AI features and water resistance rating does this phone have?`
        : `What is the IP water resistance rating of this phone?`,
      textKn: `ಈ ಫೋನ್‌ನ ವಾಟರ್ ರೆಸಿಸ್ಟೆನ್ಸ್ ಮತ್ತು AI ಫೀಚರ್‌ಗಳು ಯಾವುವು?`,
      icon: '🤖'
    });

    // VF. MEDICINE: PREGNANCY & BREASTFEEDING SAFETY (Condition: pregnancyBreastfeeding exists)
    addCandidate({
      id: 'check_med_pregnancy',
      topic: 'medicine_safety',
      priority: 76,
      stages: ['exploring'],
      condition: (p) => /medic|health/i.test(category) && SuggestedQuestionService.hasValue(p.pregnancyBreastfeeding),
      textEn: `Is this medicine safe during pregnancy or breastfeeding?`,
      textKn: `ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಅಥವಾ ಹಾಲುಣಿಸುವ ಸಮಯದಲ್ಲಿ ಈ ಔಷಧಿ ಸುರಕ್ಷಿತವೇ?`,
      icon: '🤰'
    });

    // W. COSMETICS: SKIN TYPE SUITABILITY (Condition: specs.skinType exists)
    addCandidate({
      id: 'check_skin_suitability',
      topic: 'skin_suitability',
      priority: 85,
      stages: ['initial', 'exploring'],
      condition: (p) => /cosmetic/i.test(category) && SuggestedQuestionService.hasValue(specs.skinType),
      textEn: `Which skin type is this product suitable for?`,
      textKn: `ಇದು ಯಾವ ಚರ್ಮದ ಪ್ರಕಾರಕ್ಕೆ ಸೂಕ್ತವಾಗಿದೆ?`,
      icon: '✨'
    });

    // X. WARRANTY (Condition: warranty exists)
    addCandidate({
      id: 'check_warranty',
      topic: 'warranty',
      priority: 72,
      stages: ['exploring', 'purchase_intent'],
      condition: (p) => SuggestedQuestionService.hasValue(p.warranty),
      textEn: specs.warrantyRegistration
        ? `What warranty is included and how do I register it?`
        : `What warranty coverage is included with this?`,
      textKn: `ಈ ಉತ್ಪನ್ನಕ್ಕೆ ಎಷ್ಟು ವರ್ಷಗಳ ವಾರಂಟಿ ಲಭ್ಯವಿದೆ?`,
      icon: '🛡️'
    });

    // Y. DELIVERY DAYS & TIMELINE (Condition: deliveryDays or deliveryInfo exists)
    addCandidate({
      id: 'check_delivery',
      topic: 'delivery',
      priority: 76,
      stages: ['exploring', 'purchase_intent'],
      condition: (p) => SuggestedQuestionService.hasValue(p.deliveryDays) || SuggestedQuestionService.hasValue(p.deliveryInfo),
      textEn: `How many days will it take to deliver to Bengaluru?`,
      textKn: `ಬೆಂಗಳೂರಿಗೆ ಡೆಲಿವರಿ ಮಾಡಲು ಎಷ್ಟು ದಿನಗಳು ಬೇಕಾಗುತ್ತವೆ?`,
      icon: '🚚'
    });

    // Z. CASH ON DELIVERY & PAYMENT (Condition: codAvailable exists)
    addCandidate({
      id: 'check_cod_payment',
      topic: 'payment_cod',
      priority: 80,
      stages: ['exploring', 'purchase_intent'],
      condition: (p) => p.codAvailable !== undefined || Array.isArray(p.paymentMethods),
      textEn: `Can I pay using Cash on Delivery (COD) or UPI?`,
      textKn: `ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ (COD) ಅಥವಾ UPI ಮೂಲಕ ಪಾವತಿಸಬಹುದೇ?`,
      icon: '💵'
    });

    // AA. RETURN & EXCHANGE POLICY (Condition: returnPolicy or exchangePolicy exists)
    addCandidate({
      id: 'check_return_policy',
      topic: 'return_exchange',
      priority: 74,
      stages: ['exploring', 'purchase_intent'],
      condition: (p) => SuggestedQuestionService.hasValue(p.returnPolicy) || SuggestedQuestionService.hasValue(p.exchangePolicy),
      textEn: `What is the return and replacement policy?`,
      textKn: `ರಿಟರ್ನ್ ಮತ್ತು ಎಕ್ಸ್‌ಚೇಂಜ್ ಪಾಲಿಸಿ ಏನು?`,
      icon: '🔄'
    });

    // AB. ORDER PLACEMENT INTENT (Always directly answerable via Store Checkout)
    addCandidate({
      id: 'order_now_intent',
      topic: 'order_intent',
      priority: purchaseIntent.hasPurchaseIntent ? 99 : 60,
      stages: ['purchase_intent', 'exploring'],
      condition: (p) => p.inStock !== false,
      textEn: `I want to buy this. Can I confirm my order via COD?`,
      textKn: `ನಾನು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೇನೆ. COD ಮೂಲಕ ಆರ್ಡರ್ ಕನ್ಫರ್ಮ್ ಮಾಡಬಹುದೇ?`,
      icon: '🛍️'
    });

    // AC. PHYSICAL STORE VISIT & PICKUP (Condition: store location exists)
    addCandidate({
      id: 'check_store_location',
      topic: 'store_location',
      priority: 55,
      stages: ['exploring'],
      condition: () => Boolean(store && store.address),
      textEn: `Where is your store located for walk-in pickup in Bengaluru?`,
      textKn: `ಬೆಂಗಳೂರಿನಲ್ಲಿ ನಿಮ್ಮ ಅಂಗಡಿ ಎಲ್ಲಿ ಇದೆ?`,
      icon: '📍'
    });

    // AD. LAPTOP: COOLING & THERMAL (Condition: specs.cooling exists)
    addCandidate({
      id: 'check_laptop_cooling',
      topic: 'specs_cooling',
      priority: 81,
      stages: ['exploring'],
      condition: (p) => /laptop/i.test(category) && (SuggestedQuestionService.hasValue(specs.cooling) || SuggestedQuestionService.hasValue(specs.thermal)),
      textEn: `What cooling technology is used in this laptop?`,
      textKn: `ಈ ಲ್ಯಾಪ್‌ಟಾಪ್‌ನಲ್ಲಿ ಯಾವ ಕೂಲಿಂಗ್ ತಂತ್ರಜ್ಞಾನ ಬಳಸಲಾಗಿದೆ?`,
      icon: '❄️'
    });

    // AE. LAPTOP: BACKLIT KEYBOARD & RGB (Condition: specs.keyboard exists)
    addCandidate({
      id: 'check_laptop_keyboard',
      topic: 'specs_keyboard',
      priority: 78,
      stages: ['exploring'],
      condition: (p) => /laptop/i.test(category) && (SuggestedQuestionService.hasValue(specs.keyboard) || SuggestedQuestionService.hasValue(specs.backlit)),
      textEn: `Does this laptop have a backlit RGB keyboard?`,
      textKn: `ಈ ಲ್ಯಾಪ್‌ಟಾಪ್‌ನಲ್ಲಿ ಬ್ಯಾಕ್‌ಲಿಟ್ RGB ಕೀಬೋರ್ಡ್ ಇದೆಯೇ?`,
      icon: '⌨️'
    });

    // AF. LAPTOP: WEIGHT & PORTABILITY (Condition: specs.weight exists)
    addCandidate({
      id: 'check_laptop_weight',
      topic: 'specs_weight',
      priority: 77,
      stages: ['exploring'],
      condition: (p) => /laptop/i.test(category) && SuggestedQuestionService.hasValue(specs.weight),
      textEn: `How much does this laptop weigh and is it portable?`,
      textKn: `ಈ ಲ್ಯಾಪ್‌ಟಾಪ್‌ನ ತೂಕ ಎಷ್ಟು ಮತ್ತು ಸಾಗಿಸಲು ಸುಲಭವೇ?`,
      icon: '⚖️'
    });

    // AG. LAPTOP: UPGRADEABILITY (Condition: specs.upgradeability exists)
    addCandidate({
      id: 'check_laptop_upgrade',
      topic: 'specs_upgrade',
      priority: 83,
      stages: ['exploring'],
      condition: (p) => /laptop/i.test(category) && (SuggestedQuestionService.hasValue(specs.upgradeability) || SuggestedQuestionService.hasValue(specs.ramSlots)),
      textEn: `Can the RAM and SSD storage be upgraded in the future?`,
      textKn: `ಭವಿಷ್ಯದಲ್ಲಿ RAM ಮತ್ತು SSD ಸ್ಟೋರೇಜ್ ಅನ್ನು ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಬಹುದೇ?`,
      icon: '🛠️'
    });

    // AH. LAPTOP: DURABILITY & MILITARY TESTING (Condition: specs.durability exists)
    addCandidate({
      id: 'check_laptop_durability',
      topic: 'specs_durability',
      priority: 79,
      stages: ['exploring'],
      condition: (p) => /laptop/i.test(category) && SuggestedQuestionService.hasValue(specs.durability),
      textEn: `Does this laptop have military-grade durability testing?`,
      textKn: `ಈ ಲ್ಯಾಪ್‌ಟಾಪ್‌ಗೆ ಮಿಲಿಟರಿ ದರ್ಜೆಯ (MIL-STD) ಬಾಳಿಕೆ ಪ್ರಮಾಣೀಕರಣವಿದೆಯೇ?`,
      icon: '🛡️'
    });

    // AI. LAPTOP: PRE-INSTALLED OS & SOFTWARE (Condition: specs.os exists)
    addCandidate({
      id: 'check_laptop_os',
      topic: 'specs_os',
      priority: 76,
      stages: ['exploring'],
      condition: (p) => /laptop/i.test(category) && SuggestedQuestionService.hasValue(specs.os),
      textEn: `Which operating system is pre-installed on this laptop?`,
      textKn: `ಈ ಲ್ಯಾಪ್‌ಟಾಪ್‌ನಲ್ಲಿ ಯಾವ ಆಪರೇಟಿಂಗ್ ಸಿಸ್ಟಮ್ (OS) ಇನ್ಸ್ಟಾಲ್ ಆಗಿದೆ?`,
      icon: '💻'
    });

    // AJ. LAPTOP: AI / ML WORKLOAD SUITABILITY (Condition: specs.gpu exists)
    addCandidate({
      id: 'check_laptop_aiml',
      topic: 'ai_ml_suitability',
      priority: 85,
      stages: ['exploring'],
      condition: (p) => /laptop/i.test(category) && (SuggestedQuestionService.hasValue(specs.gpu) || SuggestedQuestionService.hasValue(specs.graphics)),
      textEn: `Is this laptop suitable for AI, machine learning, and coding?`,
      textKn: `ಈ ಲ್ಯಾಪ್‌ಟಾಪ್ AI, ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಮತ್ತು ಕೋಡಿಂಗ್‌ಗೆ ಸೂಕ್ತವೇ?`,
      icon: '🤖'
    });

    // AK. LAPTOP: WARRANTY REGISTRATION PORTAL (Condition: specs.warrantyRegistration exists)
    addCandidate({
      id: 'check_laptop_warranty_reg',
      topic: 'warranty_reg',
      priority: 73,
      stages: ['exploring', 'purchase_intent'],
      condition: (p) => /laptop/i.test(category) && SuggestedQuestionService.hasValue(specs.warrantyRegistration),
      textEn: `How do I register the manufacturer warranty online?`,
      textKn: `ತಯಾರಕರ ಅಧಿಕೃತ ವಾರಂಟಿಯನ್ನು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಹೇಗೆ ನೋಂದಾಯಿಸುವುದು?`,
      icon: '📝'
    });

    // AL. PHONE: 5G & CONNECTIVITY (Condition: specs.network or specs.bands5g exists)
    addCandidate({
      id: 'check_phone_5g',
      topic: 'specs_connectivity',
      priority: 80,
      stages: ['exploring'],
      condition: (p) => /mobile|phone/i.test(category) && (SuggestedQuestionService.hasValue(specs.network) || SuggestedQuestionService.hasValue(specs.bands5g)),
      textEn: `Does this phone support 5G bands in India?`,
      textKn: `ಈ ಫೋನ್ ಭಾರತದ 5G ಬ್ಯಾಂಡ್‌ಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆಯೇ?`,
      icon: '📶'
    });

    // AM. PHONE: FAST CHARGING SPEED (Condition: specs.chargingTime or specs.fastCharging exists)
    addCandidate({
      id: 'check_phone_fast_charge',
      topic: 'specs_charging',
      priority: 78,
      stages: ['exploring'],
      condition: (p) => /mobile|phone/i.test(category) && (SuggestedQuestionService.hasValue(specs.chargingTime) || SuggestedQuestionService.hasValue(specs.fastCharging)),
      textEn: `What is the fast charging speed and battery backup?`,
      textKn: `ಇದರ ಫಾಸ್ಟ್ ಚಾರ್ಜಿಂಗ್ ಸ್ಪೀಡ್ ಮತ್ತು ಬ್ಯಾಟರಿ ಬಾಳಿಕೆ ಎಷ್ಟು?`,
      icon: '⚡'
    });

    // AN. FOOD: REHEATING INSTRUCTIONS (Condition: reheatingInstructions exists)
    addCandidate({
      id: 'check_food_reheat',
      topic: 'food_reheat',
      priority: 77,
      stages: ['exploring'],
      condition: (p) => /food/i.test(category) && (SuggestedQuestionService.hasValue(p.reheatingInstructions) || SuggestedQuestionService.hasValue(p.howToEat)),
      textEn: `How should this food be reheated and served?`,
      textKn: `ಇದನ್ನು ಹೇಗೆ ಮರುಬಿಸಿ ಮಾಡುವುದು ಮತ್ತು ಬಡಿಸುವುದು?`,
      icon: '♨️'
    });

    // AO. FOOD: TRADITIONAL HERITAGE (Condition: traditionalInfo or origin exists)
    addCandidate({
      id: 'check_food_tradition',
      topic: 'food_heritage',
      priority: 75,
      stages: ['exploring'],
      condition: (p) => /food/i.test(category) && (SuggestedQuestionService.hasValue(p.traditionalInfo) || SuggestedQuestionService.hasValue(p.origin)),
      textEn: `What is special about the traditional preparation of this dish?`,
      textKn: `ಈ ಸಾಂಪ್ರದಾಯಿಕ ಪಾಕವಿಧಾನದ ವಿಶೇಷತೆಯೇನು?`,
      icon: '👑'
    });

    // AP. FOOD: CANCELLATION POLICY (Condition: cancellationPolicy exists)
    addCandidate({
      id: 'check_food_cancellation',
      topic: 'food_cancel',
      priority: 72,
      stages: ['exploring', 'purchase_intent'],
      condition: (p) => /food/i.test(category) && SuggestedQuestionService.hasValue(p.cancellationPolicy),
      textEn: `What is the food cancellation and refund policy?`,
      textKn: `ಆಹಾರದ ಆರ್ಡರ್ ಕ್ಯಾನ್ಸಲೇಶನ್ ಮತ್ತು ರಿಫಂಡ್ ಪಾಲಿಸಿ ಏನು?`,
      icon: '🚫'
    });

    // AQ. FOOD: HYGIENE & SAFETY (Condition: safetyDetails or hygiene exists)
    addCandidate({
      id: 'check_food_safety',
      topic: 'food_hygiene',
      priority: 76,
      stages: ['exploring'],
      condition: (p) => /food/i.test(category) && (SuggestedQuestionService.hasValue(p.safetyDetails) || SuggestedQuestionService.hasValue(p.hygiene)),
      textEn: `What hygiene and food safety standards are followed?`,
      textKn: `ಇದರಲ್ಲಿ ಯಾವ ನೈರ್ಮಲ್ಯ ಮತ್ತು ಸುರಕ್ಷತಾ ಮಾನದಂಡಗಳನ್ನು ಅನುಸರಿಸಲಾಗುತ್ತದೆ?`,
      icon: '🧼'
    });

    // AR. MEDICINE: FOOD REQUIREMENT (Condition: foodRequirement exists)
    addCandidate({
      id: 'check_med_food_req',
      topic: 'med_food_req',
      priority: 84,
      stages: ['exploring'],
      condition: (p) => /medic|health/i.test(category) && SuggestedQuestionService.hasValue(p.foodRequirement),
      textEn: `Should this medicine be taken before or after food?`,
      textKn: `ಈ ಔಷಧಿಯನ್ನು ಊಟಕ್ಕೆ ಮುಂಚೆ ಅಥವಾ ಊಟದ ನಂತರ ತೆಗೆದುಕೊಳ್ಳಬೇಕೇ?`,
      icon: '🍱'
    });

    // AS. MEDICINE: AGE SUITABILITY (Condition: ageRestrictions or ageSuitability exists)
    addCandidate({
      id: 'check_med_age',
      topic: 'med_age',
      priority: 81,
      stages: ['exploring'],
      condition: (p) => /medic|health/i.test(category) && (SuggestedQuestionService.hasValue(p.ageRestrictions) || SuggestedQuestionService.hasValue(p.ageSuitability)),
      textEn: `What is the recommended age limit for this medicine?`,
      textKn: `ಈ ಔಷಧಿಗೆ ಶಿಫಾರಸು ಮಾಡಲಾದ ವಯಸ್ಸಿನ ಮಿತಿ ಏನು?`,
      icon: '👶'
    });

    // AT. MEDICINE: DRUG INTERACTIONS (Condition: drugInteractions exists)
    addCandidate({
      id: 'check_med_interactions',
      topic: 'med_interactions',
      priority: 79,
      stages: ['exploring'],
      condition: (p) => /medic|health/i.test(category) && SuggestedQuestionService.hasValue(p.drugInteractions),
      textEn: `Are there any known drug interactions to be aware of?`,
      textKn: `ಇದರೊಂದಿಗೆ ತೆಗೆದುಕೊಳ್ಳಬಾರದ ಇತರ ಔಷಧಿಗಳಿವೆಯೇ?`,
      icon: '⚠️'
    });

    // AU. MEDICINE: AUTHENTICITY & BATCH (Condition: batchNumber or regulatoryLicence exists)
    addCandidate({
      id: 'check_med_authenticity',
      topic: 'med_authenticity',
      priority: 77,
      stages: ['exploring'],
      condition: (p) => /medic|health/i.test(category) && (SuggestedQuestionService.hasValue(p.batchNumber) || SuggestedQuestionService.hasValue(p.regulatoryLicence)),
      textEn: `Is this medicine 100% genuine with a verifiable batch number?`,
      textKn: `ಇದು ಪರಿಶೀಲಿಸಬಹುದಾದ ಬ್ಯಾಚ್ ಸಂಖ್ಯೆಯೊಂದಿಗೆ ಅಸಲಿ ಔಷಧಿಯೇ?`,
      icon: '🔍'
    });

    // -------------------------------------------------------------------------
    // SORT, DEDUPLICATE & BOUND SUGGESTIONS (5 TO 8 QUESTIONS)
    // -------------------------------------------------------------------------

    // Sort descending by score
    candidatePool.sort((a, b) => b.score - a.score);

    // Deduplicate by text and topic
    const seenTexts = new Set();
    const seenTopics = new Set();
    const finalSelection = [];

    // Pass 1: Strict topic uniqueness across all slots
    for (const item of candidatePool) {
      if (seenTexts.has(item.text)) continue;
      if (seenTopics.has(item.topic)) continue;

      seenTexts.add(item.text);
      seenTopics.add(item.topic);
      finalSelection.push({
        id: item.id,
        text: item.text,
        icon: item.icon,
        topic: item.topic,
        stage
      });

      if (finalSelection.length >= 8) break;
    }

    // If fewer than 5 questions, relax topic constraint to fill up to 5–8 items
    if (finalSelection.length < 5) {
      for (const item of candidatePool) {
        if (!seenTexts.has(item.text)) {
          seenTexts.add(item.text);
          finalSelection.push({
            id: item.id,
            text: item.text,
            icon: item.icon,
            topic: item.topic,
            stage
          });
        }
        if (finalSelection.length >= 5) break;
      }
    }

    // Ensure strictly between 5 and 8 items
    const bounded = finalSelection.slice(0, 8);
    return bounded;
  }
}
