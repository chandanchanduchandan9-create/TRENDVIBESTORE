import { db } from '../db/database.js';
import { GeminiService } from './geminiService.js';
import { ProductKnowledgeService } from './productKnowledgeService.js';

/**
 * AutomaticKnowledgeRetrievalService
 * Implements Zyro AI — Automatic Knowledge Retrieval (Rules 1 to 12):
 *
 * 1. Check the existing TrendVibe Store database and approved product knowledge first.
 * 2. If a public product fact is missing, use Google Search grounding through the Gemini API.
 * 3. Prefer the exact manufacturer's official website, product label and authoritative sources.
 * 4. Confirm the source applies to the correct product, formulation, pack size and variant.
 * 5. Use retrieved information to answer the customer naturally in the active conversation language.
 * 6. When evidence is uncertain or conflicting, disclose that limitation instead of guessing.
 * 7. Store reusable verified product facts with the product ID, source URL, verification date and evidence status.
 * 8. Recheck information when it may have changed. Do not treat old search results as permanently current.
 * 9. Never use Google Search as the authority for TrendVibe selling prices, stock, discounts, delivery promises, COD eligibility, order totals or store policies.
 * 10. Never invent medical dosage, age restrictions, drug interactions, side effects, prescription status, batch authenticity or safety certifications.
 * 11. If a question cannot be verified, explain what is unknown and suggest the appropriate manufacturer, label, healthcare professional or store administrator.
 * 12. Do not use positiveOutOfSyllabus for a valid product question just because its answer is missing from the database.
 */
export class AutomaticKnowledgeRetrievalService {
  // Store-exclusive commercial attributes that must NEVER use Google Search as authority (Rule 9)
  static STORE_EXCLUSIVE_ATTRIBUTES = new Set([
    'selling_price',
    'mrp',
    'discount',
    'stock',
    'delivery_promise',
    'cod_eligibility',
    'order_total',
    'store_policy',
    'return_policy',
    'exchange_policy'
  ]);

  // Medical & safety-critical attributes that must NEVER be invented (Rule 10)
  static RESTRICTED_SAFETY_MEDICAL_ATTRIBUTES = new Set([
    'medical_dosage',
    'age_restrictions',
    'drug_interactions',
    'side_effects',
    'prescription_status',
    'batch_authenticity',
    'safety_certifications',
    'fssai_license',
    'lab_testing_certificate'
  ]);

  /**
   * Detects whether a customer message is a genuine off-topic / banter query
   * (e.g., jokes, weather, robot persona, compliments, math trivia, party styling opinion, free gifts)
   * versus a valid product question (Rule 12).
   */
  static isBanterOrOffTopicQuery(text = '') {
    const lower = String(text || '').toLowerCase().trim();
    if (!lower) return false;

    // 1. Jokes, humor, riddles
    if (/\b(joke|funny|laugh|humor|humour|riddle|meme)\b/i.test(lower)) return true;

    // 2. Weather, time, news, sports, politics, movies
    if (/\b(weather|raining|sunny|temperature outside|cricket|football|election|prime minister|president|movie|song|sing a song)\b/i.test(lower)) return true;

    // 3. AI persona / robot / human banter
    if (/\b(are you a (?:robot|bot|human|ai|real person)|who created you|do you sleep|do you eat|how old are you)\b/i.test(lower)) return true;

    // 4. Subjective fashion party styling / complimenting
    if (/\b(good for a (?:college )?party|will i look (?:good|cool|handsome)|compliment)\b/i.test(lower)) return true;

    // 5. Free gifts / bargaining banter
    if (/\b(free gift|extra discount|give me for free|bargain|secret coupon)\b/i.test(lower)) return true;

    // 6. Pure compliments / appreciation
    if (/\b(doing an? (?:awesome|great|good) job|you are (?:awesome|great|smart|cool|amazing)|thank you so much zyro)\b/i.test(lower)) return true;

    // 7. Pure arithmetic / general trivia (e.g., "What is 2+2?")
    if (/^what is \d+\s*[\+\-\*\/]\s*\d+\??$/i.test(lower)) return true;

    return false;
  }

  /**
   * Determines if a question is a valid product question that should be handled by
   * Automatic Knowledge Retrieval rather than positiveOutOfSyllabus (Rule 12 & Tool-Routing Rules 1, 2, 6).
   */
  static isValidProductQuestion(question = '', product = null) {
    const lower = String(question || '').toLowerCase().trim();
    if (!lower || !product) return false;
    if (this.isBanterOrOffTopicQuery(lower)) return false;

    const extracted = this.identifyRequestedAttribute(lower, product);
    if (extracted.attributeKey !== 'unclassified') return true;

    // Also treat questions asking about specific product properties ("what is the...", "does it have...", "does this support...", "is there...")
    // Including all 9 Rule 1 valid product question categories: uses, dosage, age limits, ingredients, warnings, side effects, interactions, prescription requirements, authenticity
    const productKeywords = /\b(uses?|used for|indications?|purpose|benefits?|dosage|dose|age limit|age restriction|minimum age|safe for children|ingredients?|composition|excipients?|warnings?|precautions?|cautions?|contraindications?|side effects?|adverse reactions?|interactions?|interact with|prescription|otc|schedule h|authentic|authenticity|original|genuine|counterfeit|pharmacopoeia|mechanism of action|pharmacokinetics|half-life|sar|radiation|bluetooth|codec|aptx|ldac|box|in the box|charger|cable|origin|manufactured|assembled|made in|gamut|srgb|ntsc|mux|optimus|dex|ir blaster|infrared|glycemic|gi index|calcium|fiber|shrink|shrinkage|gsm|thread count|driver|frequency|impedance|refresh rate|nits|brightness|gorilla glass|waterproof|ip68|ip65|certification|bis|iso|batch|fssai|lab test|ph level|shelf life|vegan|gluten|allergen|calorie|protein|watt|voltage|port|hdmi|thunderbolt|wi-fi|esim|nfc|ois|zoom|aperture|sensor|mah|fast charging|weight|dimensions|material|fabric|sole|cushion|shade|undertone|spf|paraben|sulfate)\b/i;

    return productKeywords.test(lower);
  }

  /**
   * Extracts the normalized attributeKey, category of fact, and any requested variant, packSize, or formulation
   * from the customer's question.
   */
  static identifyRequestedAttribute(question = '', product = {}) {
    const lower = String(question || '').toLowerCase().trim();

    // Extract variant / packSize / formulation mentions from query if present
    const variantMatch = lower.match(/\b(128\s*gb|256\s*gb|512\s*gb|1\s*tb|8\s*gb|12\s*gb|16\s*gb|32\s*gb|pro max|pro|plus|ultra|rtx\s*\d+|xl|xxl)\b/i);
    const packMatch = lower.match(/\b(\d+\s*(?:tablets?|capsules?|ml|g|kg|sachets?|pieces?|balls?|pack))\b/i);
    const formMatch = lower.match(/\b(\d+\s*mg|tablet|capsule|syrup|gel|cream|spray|balm|lotion|powder)\b/i);

    const requestedVariant = variantMatch ? variantMatch[1].toUpperCase() : null;
    const requestedPackSize = packMatch ? packMatch[1] : null;
    const requestedFormulation = formMatch ? formMatch[1] : null;
    const forceRecheck = /\b(recheck|re-verify|latest|updated|check again|current as of today|refresh)\b/i.test(lower);

    // 1. Store-Exclusive Commercial Attributes (Rule 9)
    if (/\b(selling price|store price|trendvibe price|mrp|how much does it cost|price of)\b/i.test(lower) && !/\b(hypothetical)\b/i.test(lower)) {
      return { attributeKey: 'selling_price', label: 'TrendVibe selling price & MRP', isStoreExclusive: true, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(in stock|stock count|inventory|units available|warehouse stock)\b/i.test(lower)) {
      return { attributeKey: 'stock', label: 'live store stock availability', isStoreExclusive: true, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(active discount|promotional offer|coupon|deal|percentage off)\b/i.test(lower)) {
      return { attributeKey: 'discount', label: 'TrendVibe store discount', isStoreExclusive: true, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(cod|cash on delivery|pay on delivery)\b/i.test(lower)) {
      return { attributeKey: 'cod_eligibility', label: 'Cash on Delivery (COD) eligibility', isStoreExclusive: true, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(delivery promise|delivery date|when will you deliver|shipping charge|delivery time)\b/i.test(lower)) {
      return { attributeKey: 'delivery_promise', label: 'TrendVibe delivery timeline and charges', isStoreExclusive: true, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(order total|total bill|final payable amount)\b/i.test(lower)) {
      return { attributeKey: 'order_total', label: 'order total calculation', isStoreExclusive: true, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(return policy|exchange policy|refund policy|store policy)\b/i.test(lower)) {
      return { attributeKey: 'store_policy', label: 'TrendVibe return and store policy', isStoreExclusive: true, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }

    // 2. Medical & Safety-Critical Attributes (Rule 10 & Tool-Routing Rule 1)
    if (/\b(dosage|how many (?:tablets|ml|drops|spoons)|dose for|maximum daily dose|overdose|how often should i take)\b/i.test(lower)) {
      return { attributeKey: 'medical_dosage', label: 'medical dosage and administration', isStoreExclusive: false, isRestrictedSafetyMedical: true, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(age restriction|age limit|minimum age|safe for (?:infants|babies|toddlers|newborns|children|kids)|pediatric)\b/i.test(lower)) {
      return { attributeKey: 'age_restrictions', label: 'age restrictions and pediatric suitability', isStoreExclusive: false, isRestrictedSafetyMedical: true, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(drug interaction|interactions?|interact with|take with (?:alcohol|antibiotics|blood thinners|warfarin|aspirin|other medicines))\b/i.test(lower)) {
      return { attributeKey: 'drug_interactions', label: 'drug interactions', isStoreExclusive: false, isRestrictedSafetyMedical: true, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(side effects?|adverse reactions?|drowsiness|liver damage|kidney)\b/i.test(lower)) {
      return { attributeKey: 'side_effects', label: 'medical side effects', isStoreExclusive: false, isRestrictedSafetyMedical: true, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(prescription required|prescription requirements?|prescription status|schedule h|without prescription|otc status|need a prescription)\b/i.test(lower)) {
      return { attributeKey: 'prescription_status', label: 'prescription / OTC regulatory status', isStoreExclusive: false, isRestrictedSafetyMedical: true, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(batch authenticity|verify batch|authentic batch|batch number certificate|counterfeit check|authenticity|is (?:this|it) authentic|is (?:this|it) genuine)\b/i.test(lower)) {
      return { attributeKey: 'batch_authenticity', label: 'batch authenticity and certificate', isStoreExclusive: false, isRestrictedSafetyMedical: true, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(safety certification|bis registration number|ul certification|ce certificate number|iso certificate|fssai license|fssai number|lab test report)\b/i.test(lower)) {
      return { attributeKey: 'safety_certifications', label: 'official safety and regulatory certification', isStoreExclusive: false, isRestrictedSafetyMedical: true, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(warnings?|precautions?|contraindications?|who should not (?:use|take)|cautions?)\b/i.test(lower)) {
      return { attributeKey: 'product_warnings', label: 'safety warnings and contraindications', isStoreExclusive: false, isRestrictedSafetyMedical: true, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }

    // 3. Public Product Facts (Eligible for DB check first -> Google Search grounding if missing)
    if (/\b(pharmacopoeia|ip standard|bp standard|usp standard|compendial standard)\b/i.test(lower)) {
      return { attributeKey: 'pharmacopoeia_standard', label: 'pharmacopoeia standard (IP/BP/USP)', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(mechanism of action|pharmacological action|how does (?:paracetamol|this medicine|the drug|it) work in the body|pharmacokinetics|half-life|half life)\b/i.test(lower)) {
      return { attributeKey: 'mechanism_of_action', label: 'pharmacological mechanism of action', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(uses of|what is (?:it|this) used for|what are the uses|indications|purpose of)\b/i.test(lower)) {
      return { attributeKey: 'product_uses', label: 'product uses and indications', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(ingredients?|composition|active ingredient|excipients)\b/i.test(lower)) {
      return { attributeKey: 'product_ingredients', label: 'ingredients and composition', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(sar\b|sar value|specific absorption rate|radiation level)/i.test(lower)) {
      return { attributeKey: 'sar_value', label: 'SAR (Specific Absorption Rate) radiation value', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(bluetooth codec|aptx|ldac|lhdc|aac codec|audio codec)/i.test(lower)) {
      return { attributeKey: 'bluetooth_codec', label: 'Bluetooth audio codec support', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(bluetooth version|which bluetooth)/i.test(lower)) {
      return { attributeKey: 'bluetooth_version', label: 'Bluetooth version', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(in the box|box contents|what comes in the box|included in the box|package contents)/i.test(lower)) {
      return { attributeKey: 'box_contents', label: 'in-the-box package contents', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(country of origin|where is it (?:made|manufactured|assembled)|made in which country)/i.test(lower)) {
      return { attributeKey: 'country_of_origin', label: 'country of origin and assembly', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(color gamut|colour gamut|srgb|ntsc|dci-p3)/i.test(lower)) {
      return { attributeKey: 'color_gamut', label: 'display color gamut (sRGB / NTSC)', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(mux switch|advanced optimus)/i.test(lower)) {
      return { attributeKey: 'mux_switch', label: 'MUX Switch / Advanced Optimus support', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(samsung dex|dex support|wireless dex)/i.test(lower)) {
      return { attributeKey: 'dex_support', label: 'Samsung DeX support', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(ir blaster|infrared remote|infrared sensor)/i.test(lower)) {
      return { attributeKey: 'ir_blaster', label: 'IR Blaster (Infrared sensor)', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(glycemic index|\bgi\b|blood sugar index)/i.test(lower)) {
      return { attributeKey: 'glycemic_index', label: 'glycemic index (GI)', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(shrink|shrinkage|does it shrink|washing shrinkage)/i.test(lower)) {
      return { attributeKey: 'shrinkage_tolerance', label: 'fabric shrinkage tolerance', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }
    if (/\b(driver size|speaker driver|neodymium|mm driver)/i.test(lower)) {
      return { attributeKey: 'driver_size', label: 'acoustic driver size', isStoreExclusive: false, isRestrictedSafetyMedical: false, requestedVariant, requestedPackSize, requestedFormulation, forceRecheck };
    }

    return {
      attributeKey: 'unclassified',
      label: 'requested product specification',
      isStoreExclusive: false,
      isRestrictedSafetyMedical: false,
      requestedVariant,
      requestedPackSize,
      requestedFormulation,
      forceRecheck
    };
  }

  /**
   * Summarizes verified baseline product facts from the store database for Rule 7
   * ("If evidence is missing or conflicting, explain what is verified and what remains unknown").
   */
  static getVerifiedBaselineForProduct(product = {}) {
    if (!product || !product.name) return 'Product identity in TrendVibe Store catalog';
    const parts = [`Product: ${product.name}`];
    if (product.brand || product.manufacturer) parts.push(`Brand/Manufacturer: ${product.brand || product.manufacturer}`);
    if (product.activeIngredient || product.composition) parts.push(`Composition: ${product.activeIngredient || product.composition}`);
    if (product.salePrice !== undefined && product.salePrice !== null && Number(product.salePrice) > 0) {
      parts.push(`Store Price: ₹${Number(product.salePrice).toLocaleString('en-IN')}`);
    }
    if (product.inStock !== undefined) {
      parts.push(`Stock: ${product.inStock ? 'In Stock' : 'Out of Stock'}`);
    }
    return parts.join(', ');
  }

  /**
   * Step 1: Checks the existing TrendVibe Store database and approved product knowledge first (Rule 1).
   */
  static checkStoreDatabaseFirst(product, attributeKey, question = '') {
    if (!product) return { found: false };
    const specs = product.specs || {};
    const universal = ProductKnowledgeService.toUniversal(product);
    const uSpecs = universal?.specifications || {};
    const lowerQ = String(question || '').toLowerCase();

    // Direct lookup map in existing product & specs
    const directMap = {
      selling_price: product.salePrice !== undefined ? `₹${Number(product.salePrice).toLocaleString('en-IN')} (MRP: ₹${Number(product.price || product.salePrice).toLocaleString('en-IN')}, Discount: ${product.discountPercent || 0}%)` : null,
      stock: (product.stockCount !== undefined || product.stock?.overall !== undefined) ? `${product.inStock ? 'In Stock' : 'Out of Stock'} (${product.stock?.overall ?? product.stockCount ?? 0} units in TrendVibe warehouse)` : null,
      discount: product.discountPercent !== undefined ? `${product.discountPercent}% active store discount off MRP ₹${Number(product.price || product.salePrice).toLocaleString('en-IN')}` : null,
      delivery_promise: product.deliveryInfo || product.deliveryDays || null,
      cod_eligibility: product.codAvailable !== undefined ? (product.codAvailable ? 'Eligible for Cash on Delivery (COD)' : 'Prepaid only (UPI/Cards)') : null,
      store_policy: product.returnPolicy ? `${product.returnPolicy}${product.exchangePolicy ? ' ' + product.exchangePolicy : ''}` : null,
      medical_dosage: product.dosage || specs.dosage || uSpecs.dosage_guidance || null,
      age_restrictions: product.ageGroup || specs.ageGroup || uSpecs.age_suitability || null,
      drug_interactions: product.drugInteractions || specs.drugInteractions || uSpecs.drug_interactions || null,
      side_effects: product.sideEffects || specs.sideEffects || uSpecs.side_effects || null,
      prescription_status: product.prescriptionRequired !== undefined
        ? (typeof product.prescriptionRequired === 'string' ? product.prescriptionRequired : (product.prescriptionRequired ? 'Prescription Required' : 'Over-the-Counter (OTC)'))
        : (uSpecs.prescription_status || null),
      batch_authenticity: product.batchNumber && !String(product.batchNumber).startsWith('DEMO-')
        ? `Batch ${product.batchNumber} (${product.verificationStatus || 'Verified store batch'})`
        : null,
      safety_certifications: (product.fssaiNumber && !/not available/i.test(product.fssaiNumber))
        ? product.fssaiNumber
        : (specs.certification || specs.regulatoryInfo || product.regulatoryInfo || null),
      product_warnings: product.warnings || product.precautions || specs.warnings || uSpecs.warnings || null,
      product_uses: product.uses || (Array.isArray(product.primaryUses) ? product.primaryUses.join(', ') : product.primaryUses) || specs.usage || uSpecs.uses || null,
      product_ingredients: product.activeIngredient || product.composition || (Array.isArray(product.completeIngredients) ? product.completeIngredients.join(', ') : null) || specs.ingredients || null,
      pharmacopoeia_standard: specs.pharmacopoeiaStandard || product.pharmacopoeiaStandard || null,
      mechanism_of_action: specs.mechanismOfAction || product.mechanismOfAction || null,
      sar_value: specs.sar || specs.sarValue || product.sarValue || null,
      bluetooth_codec: specs.bluetoothCodec || specs.audioCodecs || null,
      bluetooth_version: specs.bluetooth || null,
      box_contents: specs.inTheBox || specs.boxContents || product.boxContents || null,
      country_of_origin: specs.countryOfOrigin || product.countryOfOrigin || null,
      color_gamut: specs.colorGamut || specs.srgb || null,
      mux_switch: specs.muxSwitch || null,
      dex_support: specs.dexSupport || null,
      ir_blaster: specs.irBlaster || null,
      glycemic_index: specs.glycemicIndex || product.glycemicIndex || null,
      shrinkage_tolerance: specs.shrinkage || product.shrinkage || null,
      driver_size: specs.driverSize || specs.drivers || null
    };

    const candidate = directMap[attributeKey];
    if (candidate && !/not available in verified/i.test(String(candidate))) {
      // For restricted medical queries asking about a specific unrecorded interaction (e.g. "Can I take Dolo 650 with Warfarin?" or "dosage for a 2-month-old infant"),
      // check if the specific sub-question is actually covered by the DB string:
      if (attributeKey === 'medical_dosage' && /\b(infant|newborn|baby|toddler|month old|1 year old|2 year old|pregnant|kidney failure)\b/i.test(lowerQ)) {
        if (!new RegExp(lowerQ.match(/\b(infant|newborn|baby|toddler|pregnant|kidney)\b/i)[1], 'i').test(String(candidate))) {
          return { found: false, reason: 'SPECIFIC_PATIENT_GROUP_DOSAGE_NOT_IN_DB' };
        }
      }
      return {
        found: true,
        factValue: String(candidate),
        source: product.officialProductSource || product.manufacturerSource || 'TrendVibe Store Verified Product Database',
        verificationDate: product.lastVerifiedDate || new Date().toISOString()
      };
    }

    return { found: false };
  }

  /**
   * Main 12-Rule Retrieval & Response Pipeline
   */
  static async retrieveAndAnswer({
    question = '',
    product = null,
    productId = null,
    language = 'en',
    forceRecheck = false,
    maxAgeHours = 168,
    mockGroundingResponse = null
  }) {
    const resolvedProduct = product || (productId ? db.getProductById(productId) : null);
    if (!resolvedProduct) {
      return {
        success: false,
        toolCalled: 'automaticKnowledgeRetrieval',
        evidenceStatus: 'UNVERIFIED',
        knowledgeSource: 'NONE',
        reply: this.formatUnverifiedFallback({
          product: { name: 'the requested product', category: 'general' },
          attributeLabel: 'product identity',
          language,
          reason: 'Product could not be found in the TrendVibe Store catalog.'
        })
      };
    }

    const extracted = this.identifyRequestedAttribute(question, resolvedProduct);
    const attributeKey = extracted.attributeKey;
    const attributeLabel = extracted.label;
    const effectiveForceRecheck = Boolean(forceRecheck || extracted.forceRecheck);

    // =========================================================================
    // RULE 9: NEVER USE GOOGLE SEARCH FOR TRENDVIBE COMMERCIAL / STORE POLICIES
    // =========================================================================
    if (extracted.isStoreExclusive || this.STORE_EXCLUSIVE_ATTRIBUTES.has(attributeKey)) {
      const dbResult = this.checkStoreDatabaseFirst(resolvedProduct, attributeKey, question);

      // Special check if customer asks for unrecorded store commercial terms (e.g. custom bulk discount, international shipping)
      const isCustomUnrecordedStoreQuery = /\b(bulk order|international shipping|outside india|custom discount|unlisted|unverified|credit period|wholesale)\b/i.test(question);

      if (dbResult.found && !isCustomUnrecordedStoreQuery) {
        const reply = this.formatNaturalVerifiedAnswer({
          product: resolvedProduct,
          attributeLabel,
          factValue: dbResult.factValue,
          sourceTitle: 'TrendVibe Store Live Database',
          language
        });
        return {
          success: true,
          toolCalled: 'automaticKnowledgeRetrieval',
          attributeKey,
          knowledgeSource: 'TRENDVIBE_DATABASE',
          authoritySource: 'TRENDVIBE_STORE_DATABASE_ONLY',
          googleSearchUsed: false,
          googleSearchBlocked: true,
          evidenceStatus: 'VERIFIED',
          factValue: dbResult.factValue,
          reply
        };
      }

      const reply = this.formatStoreExclusiveUnverifiedResponse({
        product: resolvedProduct,
        attributeLabel,
        language
      });
      return {
        success: false,
        toolCalled: 'automaticKnowledgeRetrieval',
        attributeKey,
        knowledgeSource: 'TRENDVIBE_DATABASE',
        authoritySource: 'TRENDVIBE_STORE_DATABASE_ONLY',
        googleSearchUsed: false,
        googleSearchBlocked: true,
        evidenceStatus: 'UNVERIFIED',
        reply
      };
    }

    // =========================================================================
    // RULE 1: CHECK EXISTING TRENDVIBE DATABASE & APPROVED KNOWLEDGE FIRST
    // =========================================================================
    const dbCheck = this.checkStoreDatabaseFirst(resolvedProduct, attributeKey, question);
    if (dbCheck.found) {
      const reply = this.formatNaturalVerifiedAnswer({
        product: resolvedProduct,
        attributeLabel,
        factValue: dbCheck.factValue,
        sourceTitle: dbCheck.source,
        language
      });
      return {
        success: true,
        toolCalled: 'automaticKnowledgeRetrieval',
        attributeKey,
        knowledgeSource: 'TRENDVIBE_DATABASE',
        googleSearchUsed: false,
        reusedStoredFact: false,
        evidenceStatus: 'VERIFIED',
        factValue: dbCheck.factValue,
        sourceUrl: resolvedProduct.officialProductSource || null,
        verificationDate: dbCheck.verificationDate,
        reply
      };
    }

    // =========================================================================
    // RULE 10: NEVER INVENT MEDICAL DOSAGE, AGE RESTRICTIONS, DRUG INTERACTIONS,
    // SIDE EFFECTS, PRESCRIPTION STATUS, BATCH AUTHENTICITY OR CERTIFICATIONS
    // =========================================================================
    if (extracted.isRestrictedSafetyMedical || this.RESTRICTED_SAFETY_MEDICAL_ATTRIBUTES.has(attributeKey)) {
      const reply = this.formatRestrictedSafetyMedicalRefusal({
        product: resolvedProduct,
        attributeKey,
        attributeLabel,
        language
      });
      return {
        success: false,
        toolCalled: 'automaticKnowledgeRetrieval',
        attributeKey,
        knowledgeSource: 'SAFETY_MEDICAL_GUARDRAIL',
        googleSearchUsed: false,
        medicalSafetyGuardrailTriggered: true,
        evidenceStatus: 'UNVERIFIED',
        reply
      };
    }

    // =========================================================================
    // RULES 7 & 8: CHECK STORED REUSABLE VERIFIED FACTS & STALENESS / TTL
    // =========================================================================
    const storedFact = db.getVerifiedFact(resolvedProduct.id, attributeKey, {
      variant: extracted.requestedVariant,
      packSize: extracted.requestedPackSize,
      formulation: extracted.requestedFormulation,
      maxAgeHours,
      forceRecheck: effectiveForceRecheck
    });

    if (storedFact && !storedFact.isStale && !mockGroundingResponse) {
      const reply = this.formatNaturalVerifiedAnswer({
        product: resolvedProduct,
        attributeLabel,
        factValue: storedFact.factValue,
        sourceTitle: storedFact.sourceTitle || storedFact.sourceUrl,
        sourceUrl: storedFact.sourceUrl,
        language
      });
      return {
        success: true,
        toolCalled: 'automaticKnowledgeRetrieval',
        attributeKey,
        knowledgeSource: 'STORED_VERIFIED_FACT',
        googleSearchUsed: false,
        reusedStoredFact: true,
        recheckedStaleFact: false,
        evidenceStatus: storedFact.evidenceStatus,
        factRecord: storedFact,
        factValue: storedFact.factValue,
        sourceUrl: storedFact.sourceUrl,
        verificationDate: storedFact.verificationDate,
        reply
      };
    }

    const wasStaleRecheck = Boolean(storedFact && storedFact.isStale);

    // =========================================================================
    // RULES 2, 3, 4: USE GOOGLE SEARCH GROUNDING VIA GEMINI API
    // PREFER OFFICIAL MANUFACTURER / LABEL & CONFIRM EXACT PRODUCT/VARIANT
    // =========================================================================
    const groundedResult = await GeminiService.retrieveGroundedProductFact({
      question,
      product: resolvedProduct,
      attributeKey,
      variant: extracted.requestedVariant,
      packSize: extracted.requestedPackSize,
      formulation: extracted.requestedFormulation,
      mockGroundingResponse
    });

    // =========================================================================
    // RULE 6: WHEN EVIDENCE IS UNCERTAIN OR CONFLICTING, DISCLOSE LIMITATION
    // =========================================================================
    if (groundedResult.evidenceStatus === 'UNCERTAIN' || groundedResult.evidenceStatus === 'CONFLICTING') {
      // Store record with UNCERTAIN / CONFLICTING evidenceStatus so audit trail is preserved (Rule 7)
      const uncertainRecord = db.saveVerifiedFact({
        productId: resolvedProduct.id,
        productName: resolvedProduct.name,
        variant: extracted.requestedVariant,
        packSize: extracted.requestedPackSize,
        formulation: extracted.requestedFormulation,
        attributeKey,
        question,
        factValue: groundedResult.factValue || null,
        sourceUrl: groundedResult.sourceUrl || null,
        sourceTitle: groundedResult.sourceTitle || '',
        sourceType: groundedResult.sourceType || 'google_search_grounded',
        evidenceStatus: groundedResult.evidenceStatus,
        groundingQueries: groundedResult.groundingQueries || [],
        conflictingSources: groundedResult.conflictingSources || [],
        notes: groundedResult.reason || groundedResult.conflictOrUncertaintyNote || 'Evidence uncertain or conflicting.'
      });

      const reply = this.formatUncertainOrConflictingResponse({
        product: resolvedProduct,
        attributeLabel,
        groundedResult,
        language
      });

      return {
        success: false,
        toolCalled: 'automaticKnowledgeRetrieval',
        attributeKey,
        knowledgeSource: 'GOOGLE_SEARCH_GROUNDING',
        googleSearchUsed: true,
        reusedStoredFact: false,
        recheckedStaleFact: wasStaleRecheck,
        evidenceStatus: groundedResult.evidenceStatus,
        factRecord: uncertainRecord,
        sourceUrl: groundedResult.sourceUrl,
        variantMatch: groundedResult.variantMatch,
        reply
      };
    }

    // =========================================================================
    // RULES 5 & 7: STORE VERIFIED FACT & ANSWER NATURALLY IN ACTIVE LANGUAGE
    // =========================================================================
    if (groundedResult.success && groundedResult.evidenceStatus === 'VERIFIED' && groundedResult.factValue) {
      const savedFact = db.saveVerifiedFact({
        productId: resolvedProduct.id,
        productName: resolvedProduct.name,
        variant: extracted.requestedVariant || null,
        packSize: extracted.requestedPackSize || null,
        formulation: extracted.requestedFormulation || null,
        attributeKey,
        question,
        factValue: groundedResult.factValue,
        sourceUrl: groundedResult.sourceUrl,
        sourceTitle: groundedResult.sourceTitle,
        sourceType: groundedResult.sourceType || 'manufacturer_official',
        evidenceStatus: 'VERIFIED',
        groundingQueries: groundedResult.groundingQueries || [],
        notes: groundedResult.variantMatch?.confirmedVariant ? `Confirmed variant: ${groundedResult.variantMatch.confirmedVariant}` : ''
      });

      const reply = this.formatNaturalVerifiedAnswer({
        product: resolvedProduct,
        attributeLabel,
        factValue: savedFact.factValue,
        sourceTitle: savedFact.sourceTitle,
        sourceUrl: savedFact.sourceUrl,
        language
      });

      return {
        success: true,
        toolCalled: 'automaticKnowledgeRetrieval',
        attributeKey,
        knowledgeSource: 'GOOGLE_SEARCH_GROUNDING',
        googleSearchUsed: true,
        reusedStoredFact: false,
        recheckedStaleFact: wasStaleRecheck,
        evidenceStatus: 'VERIFIED',
        factRecord: savedFact,
        factValue: savedFact.factValue,
        sourceUrl: savedFact.sourceUrl,
        verificationDate: savedFact.verificationDate,
        variantMatch: groundedResult.variantMatch,
        reply
      };
    }

    // =========================================================================
    // RULE 11: IF QUESTION CANNOT BE VERIFIED, EXPLAIN WHAT IS UNKNOWN AND
    // SUGGEST APPROPRIATE MANUFACTURER, LABEL, HEALTHCARE PRO OR STORE ADMIN
    // =========================================================================
    const unverifiedReply = this.formatUnverifiedFallback({
      product: resolvedProduct,
      attributeLabel,
      language,
      reason: groundedResult.reason
    });

    return {
      success: false,
      toolCalled: 'automaticKnowledgeRetrieval',
      attributeKey,
      knowledgeSource: 'UNVERIFIED_AFTER_GROUNDING',
      googleSearchUsed: true,
      reusedStoredFact: false,
      recheckedStaleFact: wasStaleRecheck,
      evidenceStatus: 'UNVERIFIED',
      reply: unverifiedReply
    };
  }

  /**
   * Formats a natural response in the active conversation language (Rule 5).
   */
  static formatNaturalVerifiedAnswer({ product, attributeLabel, factValue, sourceTitle = '', sourceUrl = '', language = 'en' }) {
    const name = product.name || 'this product';
    const srcText = sourceTitle ? ` (Verified via ${sourceTitle})` : '';

    if (language === 'kn') {
      return `${name} ಕುರಿತು ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ (${attributeLabel}): ${factValue}${srcText}. ನೀವು ಈ ಉತ್ಪನ್ನವನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
    }
    if (language === 'kn_roman') {
      return `${name} kuritu verified mahiti (${attributeLabel}): ${factValue}${srcText}. Neevu ee product kharidisalu bayasuttira?`;
    }
    return `For the ${name}, the verified ${attributeLabel} is: ${factValue}${srcText}. Are you interested to buy the product?`;
  }

  /**
   * Discloses limitation honestly when evidence is uncertain or conflicting (Rule 6 & Tool-Routing Rule 7).
   */
  static formatUncertainOrConflictingResponse({ product, attributeLabel, groundedResult, language = 'en' }) {
    const name = product.name || 'this product';
    const status = groundedResult.evidenceStatus;
    const note = groundedResult.conflictOrUncertaintyNote || groundedResult.reason || 'available sources do not confirm the exact variant or show differing specifications';
    const candidateNote = groundedResult.factValue ? ` (${groundedResult.factValue})` : '';
    const verifiedBaseline = this.getVerifiedBaselineForProduct(product);

    if (language === 'kn') {
      return `ಕ್ಷಮಿಸಿ, ${name} ನ ${attributeLabel} ಕುರಿತು ಲಭ್ಯವಿರುವ ಮಾಹಿತಿಯು ಅನಿಶ್ಚಿತವಾಗಿದೆ ಅಥವಾ ವಿಭಿನ್ನವಾಗಿದೆ (${note})${candidateNote}. ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ: ${verifiedBaseline}. ತಿಳಿಯದ/ಅನಿಶ್ಚಿತ ಮಾಹಿತಿ: ${attributeLabel}. ನಾನು ಊಹಿಸಿ ತಪ್ಪು ಮಾಹಿತಿ ನೀಡುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ಅಧಿಕೃತ ತಯಾರಕರ (${product.brand || 'Manufacturer'}) ವೆಬ್‌ಸೈಟ್ ಅಥವಾ ಉತ್ಪನ್ನದ ಲೇಬಲ್ ಅನ್ನು ಪರಿಶೀಲಿಸಿ.`;
    }
    if (language === 'kn_roman') {
      return `Kshamisi, ${name} na ${attributeLabel} bagge evidence uncertain athava conflicting agide (${note})${candidateNote}. Verified info: ${verifiedBaseline}. Unknown/conflicting: ${attributeLabel}. Nanu guess maduvudilla. Dayavittu official manufacturer (${product.brand || 'Manufacturer'}) website athava product label check madi.`;
    }
    return `I want to be transparent: the available evidence regarding the ${attributeLabel} for ${name} is ${status.toLowerCase()} because ${note}${candidateNote}. What is verified: ${verifiedBaseline}. What remains ${status.toLowerCase()}/unknown: ${attributeLabel}. Rather than guessing, I recommend checking the official ${product.brand || 'manufacturer'} website, the physical product label, or contacting our TrendVibe Store administrator for confirmation.`;
  }

  /**
   * Formats refusal to use Google Search for store-exclusive pricing/stock/policies (Rule 9).
   */
  static formatStoreExclusiveUnverifiedResponse({ product, attributeLabel, language = 'en' }) {
    const name = product.name || 'this product';
    const verifiedBaseline = this.getVerifiedBaselineForProduct(product);
    if (language === 'kn') {
      return `${name} ನ ${attributeLabel} ಕುರಿತು ಆನ್‌ಲೈನ್ ಸರ್ಚ್ ಫಲಿತಾಂಶಗಳನ್ನು ನಾವು ಬಳಸುವುದಿಲ್ಲ, ಏಕೆಂದರೆ ಬೆಲೆ, ಸ್ಟಾಕ್ ಮತ್ತು ಸ್ಟೋರ್ ನೀತಿಗಳಿಗೆ TrendVibe Store ಡೇಟಾಬೇಸ್ ಮಾತ್ರ ಅಧಿಕೃತವಾಗಿದೆ. ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ: ${verifiedBaseline}. ಈ ನಿರ್ದಿಷ್ಟ ಮಾಹಿತಿ ಪ್ರಸ್ತುತ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ; ದಯವಿಟ್ಟು ನಮ್ಮ ಸ್ಟೋರ್ ಅಡ್ಮಿನಿಸ್ಟ್ರೇಟರ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.`;
    }
    if (language === 'kn_roman') {
      return `${name} na ${attributeLabel} ge Google Search authority alla. TrendVibe Store database mathra official. Verified info: ${verifiedBaseline}. Ee specific detail database nalli illa; dayavittu store administrator annu samparkisi.`;
    }
    return `I cannot use external search results for ${attributeLabel} on ${name}, as only the TrendVibe Store database is authoritative for selling prices, live stock, discounts, delivery promises, COD eligibility, and store policies. What is verified: ${verifiedBaseline}. What remains unknown: ${attributeLabel}. Because this specific detail is not currently recorded in our store database, please contact our TrendVibe Store administrator for verified assistance.`;
  }

  /**
   * Formats strict medical/safety guardrail response when a safety/medical fact is missing (Rule 10, Rule 11 & Tool-Routing Rule 7).
   */
  static formatRestrictedSafetyMedicalRefusal({ product, attributeKey, attributeLabel, language = 'en' }) {
    const name = product.name || 'this product';
    const mfr = product.brand || product.manufacturerSource || 'the manufacturer';
    const verifiedBaseline = this.getVerifiedBaselineForProduct(product);

    if (language === 'kn') {
      return `ಕ್ಷಮಿಸಿ, ${name} ಗಾಗಿ ${attributeLabel} ಕುರಿತು ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ನಮ್ಮ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ. ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ: ${verifiedBaseline}. ತಿಳಿಯದ ಮಾಹಿತಿ: ${attributeLabel}. ಸುರಕ್ಷತಾ ನಿಯಮಗಳ ಪ್ರಕಾರ ನಾನು ವೈದ್ಯಕೀಯ ಡೋಸೇಜ್, ವಯಸ್ಸಿನ ಮಿತಿ, ಅಡ್ಡಪರಿಣಾಮಗಳು, ಬ್ಯಾಚ್ ದೃಢೀಕರಣ ಅಥವಾ ಸುರಕ್ಷತಾ ಪ್ರಮಾಣಪತ್ರಗಳನ್ನು ಎಂದಿಗೂ ಊಹಿಸುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ಉತ್ಪನ್ನದ ಅಧಿಕೃತ ಲೇಬಲ್, ತಯಾರಕರು (${mfr}) ಅಥವಾ ಅರ್ಹ ವೈದ್ಯರು/ಫಾರ್ಮಸಿಸ್ಟ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.`;
    }
    if (language === 'kn_roman') {
      return `Kshamisi, ${name} ge ${attributeLabel} bagge verified data nammalli illa. Verified info: ${verifiedBaseline}. Unknown: ${attributeLabel}. Safety rules prakara nanu medical dosage, age restrictions, drug interactions, side effects athava safety certifications annu invent maduvudilla. Dayavittu product label, manufacturer (${mfr}), athava qualified healthcare professional (doctor/pharmacist) annu consult madi.`;
    }
    return `I do not have verified information for the ${attributeLabel} of ${name} in our approved product records. What is verified: ${verifiedBaseline}. What remains unknown: ${attributeLabel}. For your safety, I never invent or guess medical dosage, age restrictions, drug interactions, side effects, prescription status, batch authenticity, or safety certifications. Please check the official product packaging label, contact the manufacturer (${mfr}), or consult a qualified healthcare professional or our store administrator.`;
  }

  /**
   * Explains what is verified and what remains unknown, and suggests the appropriate manufacturer, label,
   * healthcare professional, or store administrator when a question cannot be verified (Rule 11 & Tool-Routing Rule 7).
   */
  static formatUnverifiedFallback({ product, attributeLabel, language = 'en', reason = '' }) {
    const name = product?.name || 'this product';
    const cat = String(product?.category || '').toLowerCase();
    const mfr = product?.brand || 'the official manufacturer';
    const isMed = /med|health|pharma/i.test(cat);
    const isFood = /food|snack|meal/i.test(cat);
    const verifiedBaseline = this.getVerifiedBaselineForProduct(product);

    if (language === 'kn') {
      const suggestionKn = isMed
        ? `ದಯವಿಟ್ಟು ಉತ್ಪನ್ನದ ಲೇಬಲ್, ತಯಾರಕರು (${mfr}), ಅರ್ಹ ವೈದ್ಯಕೀಯ ವೃತ್ತಿಪರರು ಅಥವಾ ಸ್ಟೋರ್ ಅಡ್ಮಿನಿಸ್ಟ್ರೇಟರ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.`
        : `ದಯವಿಟ್ಟು ಅಧಿಕೃತ ತಯಾರಕರು (${mfr}), ಉತ್ಪನ್ನದ ಲೇಬಲ್ ಅಥವಾ ನಮ್ಮ TrendVibe ಸ್ಟೋರ್ ಅಡ್ಮಿನಿಸ್ಟ್ರೇಟರ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.`;
      return `ಕ್ಷಮಿಸಿ, ${name} ನ ${attributeLabel} ಕುರಿತು ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ: ${verifiedBaseline}. ತಿಳಿಯದ ಮಾಹಿತಿ: ${attributeLabel}. ${suggestionKn}`;
    }

    if (language === 'kn_roman') {
      const suggestionRom = isMed
        ? `Dayavittu product label, manufacturer (${mfr}), healthcare professional athava store administrator annu samparkisi.`
        : `Dayavittu official manufacturer (${mfr}), product label athava TrendVibe store administrator annu samparkisi.`;
      return `Kshamisi, ${name} na ${attributeLabel} bagge official sources inda verify madalu sadhyavagalilla. Verified info: ${verifiedBaseline}. Unknown: ${attributeLabel}. ${suggestionRom}`;
    }

    const suggestionEn = isMed
      ? `Please refer to the physical product label, contact the manufacturer (${mfr}), consult a qualified healthcare professional, or reach out to our TrendVibe Store administrator.`
      : isFood
      ? `Please check the food packaging label, contact our kitchen/manufacturer (${mfr}), consult a nutritionist/healthcare professional if dietary-related, or reach out to our TrendVibe Store administrator.`
      : `Please check the official manufacturer (${mfr}) website, inspect the product label, or contact our TrendVibe Store administrator for direct verification.`;

    return `I could not verify the ${attributeLabel} for ${name} from our database or authoritative manufacturer sources. What is verified: ${verifiedBaseline}. What remains unknown: ${attributeLabel}. ${suggestionEn}`;
  }
}
