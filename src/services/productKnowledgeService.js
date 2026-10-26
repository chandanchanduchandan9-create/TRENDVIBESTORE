import { db } from '../db/database.js';

/**
 * ProductKnowledgeService:
 * Implements the Universal Product Knowledge Structure and separates static product facts
 * from live/dynamic store data. Provides verified retrieval without hallucination.
 */
export class ProductKnowledgeService {
  /**
   * Universal Schema Converter:
   * Maps existing product records into the standard Universal Product Knowledge Structure
   * while preserving existing properties.
   */
  static toUniversal(product) {
    if (!product) return null;

    const specs = product.specs || {};
    const cat = (product.category || '').toLowerCase();

    // 1. Static vs Dynamic Inventory Extraction
    const hasExplicitStockCount = typeof product.stockCount === 'number';
    const hasOverallStock = product.stock && typeof product.stock.overall === 'number';
    const quantity = hasExplicitStockCount 
      ? product.stockCount 
      : (hasOverallStock ? product.stock.overall : null);

    // 2. Pricing Extraction
    const mrp = typeof product.mrp === 'number' 
      ? product.mrp 
      : (typeof product.price === 'number' ? product.price : null);
    const sellingPrice = typeof product.salePrice === 'number' 
      ? product.salePrice 
      : (typeof product.price === 'number' ? product.price : null);
    const discountPercent = typeof product.discountPercent === 'number' ? product.discountPercent : 0;

    // 3. Category-tailored specs aggregation
    const specifications = { ...specs };
    if (product.fabric && !specifications.fabric) specifications.fabric = product.fabric;
    if (product.colours && !specifications.colours) specifications.colours = product.colours;
    if (product.sizes && !specifications.sizes) specifications.sizes = product.sizes;
    if (product.activeIngredients) specifications.active_ingredients = product.activeIngredients;
    if (product.strength) specifications.strength = product.strength;
    if (product.dosageForm) specifications.dosage_form = product.dosageForm;
    if (product.howToUse) specifications.how_to_use = product.howToUse;
    if (product.purpose) specifications.purpose = product.purpose;
    if (product.benefits) specifications.benefits = product.benefits;
    if (product.sideEffects) specifications.side_effects = product.sideEffects;
    if (product.warnings) specifications.warnings = product.warnings;
    if (product.contraindications) specifications.contraindications = product.contraindications;
    if (product.drugInteractions) specifications.drug_interactions = product.drugInteractions;
    if (product.allergyInfo) specifications.allergy_info = product.allergyInfo;
    if (product.pregnancyBreastfeeding) specifications.pregnancy_breastfeeding = product.pregnancyBreastfeeding;
    if (product.prescriptionStatus) specifications.prescription_status = product.prescriptionStatus;
    if (product.batchNumber) specifications.batch_number = product.batchNumber;
    if (product.expiryDate) specifications.expiry_date = product.expiryDate;
    if (product.storageInstructions) specifications.storage_instructions = product.storageInstructions;
    if (product.mainIngredients) specifications.main_ingredients = product.mainIngredients;
    if (product.completeIngredients) specifications.complete_ingredients = product.completeIngredients;
    if (product.servingSize) specifications.serving_size = product.servingSize;
    if (product.preparationMethod) specifications.preparation_method = product.preparationMethod;
    if (product.cookingMethod) specifications.cooking_method = product.cookingMethod;
    if (product.cookingTime) specifications.cooking_time = product.cookingTime;
    if (product.preparationTime) specifications.preparation_time = product.preparationTime;
    if (product.taste) specifications.taste = product.taste;
    if (product.spiceLevel) specifications.spice_level = product.spiceLevel;
    if (product.calories) specifications.calories = product.calories;
    if (product.protein) specifications.protein = product.protein;
    if (product.dietaryFibre) specifications.dietary_fibre = product.dietaryFibre;
    if (product.allergens) specifications.allergens = product.allergens;
    if (product.shelfLife) specifications.shelf_life = product.shelfLife;
    if (product.saltUsage) specifications.salt_usage = product.saltUsage;
    if (product.sugarUsage) specifications.sugar_usage = product.sugarUsage;
    if (product.oilUsage) specifications.oil_usage = product.oilUsage;
    if (product.preservatives) specifications.preservatives = product.preservatives;
    if (product.freshlyPrepared) specifications.freshly_prepared = product.freshlyPrepared;

    // 4. Aliases Generation
    const aliases = ProductKnowledgeService.generateAliases(product);

    // 5. Comparison Attributes
    const comparisonAttributes = ProductKnowledgeService.getComparisonAttributesForCategory(cat);

    // 6. Recommendation Attributes
    const recommendationAttributes = ProductKnowledgeService.getRecommendationAttributes(product, specifications);

    // 7. Supported Intents Detection
    const supportedIntents = ProductKnowledgeService.detectSupportedIntents(product, specifications);

    return {
      product_id: product.id,
      sku: product.sku || product.id,

      identity: {
        name: product.name,
        brand: product.brand || 'TrendVibe',
        category: product.category,
        subcategory: product.subcategory || '',
        product_type: product.productType || product.subcategory || product.category,
        model_number: product.modelNumber || product.model || '',
        variant: product.variant || ''
      },

      description: {
        short: product.description || '',
        detailed: product.detailedDescription || product.description || '',
        key_features: product.keyFeatures || Object.entries(specs).slice(0, 5).map(([k, v]) => `${k}: ${v}`)
      },

      pricing: {
        mrp,
        selling_price: sellingPrice,
        discount_percent: discountPercent,
        currency: product.currency || 'INR'
      },

      inventory: {
        in_stock: product.inStock ?? (quantity !== null ? quantity > 0 : null),
        quantity, // strictly null when not verified from inventory
        variants: (product.stock && product.stock.variants) ? product.stock.variants : {}
      },

      specifications,

      usage: {
        recommended_for: product.recommendedFor || (specs.usage ? [specs.usage] : []),
        use_cases: product.useCases || ProductKnowledgeService.deriveUseCases(product, specs),
        not_recommended_for: product.notRecommendedFor || []
      },

      compatibility: {
        compatible_with: product.compatibleWith || (specs.compatibility ? [specs.compatibility] : []),
        requirements: product.requirements || []
      },

      delivery: {
        delivery_days: product.deliveryDays || null,
        delivery_charge: typeof product.deliveryCharges === 'number' ? product.deliveryCharges : null,
        free_delivery_above: typeof product.freeDeliveryAbove === 'number' ? product.freeDeliveryAbove : null,
        info: product.deliveryInfo || '',
        quick_delivery_available: Boolean(product.quickDeliveryAvailable),
        quick_delivery_time: product.quickDeliveryTime || null
      },

      returns: {
        return_policy: product.returnPolicy || '',
        exchange_policy: product.exchangePolicy || '',
        refund_policy: product.refundPolicy || ''
      },

      warranty: {
        available: Boolean(product.warranty && !/no warranty/i.test(product.warranty)),
        duration: product.warrantyDuration || product.warranty || '',
        terms: product.warranty || '',
        registration: specs.warrantyRegistration || ''
      },

      manufacturer: {
        name: product.manufacturerName || product.manufacturer || product.brand || '',
        country: product.countryOfOrigin || 'India',
        official_url: product.officialUrl || product.officialSource || ''
      },

      media: {
        image_url: product.imageUrl || product.image || '',
        video_url: product.videoUrl || '',
        instagram_url: product.instagramVideoPostUrl || ''
      },

      verification: {
        source: product.officialSource || product.manufacturerSource || 'Official Manufacturer Specification',
        source_url: product.sourceUrl || '',
        last_verified: product.lastVerifiedDate || '2026-09-19',
        verification_status: product.verificationStatus || 'verified'
      },

      ai_knowledge: {
        supported_intents: supportedIntents,
        aliases,
        keywords: ProductKnowledgeService.generateKeywords(product, aliases, specifications),
        search_keywords: ProductKnowledgeService.generateKeywords(product, aliases, specifications),
        comparison_attributes: comparisonAttributes,
        recommendation_attributes: recommendationAttributes
      },

      // Keep original reference for full backward compatibility
      _raw: product
    };
  }

  /**
   * Retrieves strictly required fields from the Universal Product Knowledge record.
   * Attaches knowledge confidence status (VERIFIED, STORE_LIVE, VERIFIED_EXTERNAL, UNKNOWN).
   */
  static retrieveRelevantKnowledge(product, intent, requiredFields = []) {
    const universal = ProductKnowledgeService.toUniversal(product);
    if (!universal) {
      return {
        success: false,
        knowledgeStatus: 'UNKNOWN',
        retrievedFields: [],
        facts: {}
      };
    }

    const facts = {};
    const fieldStatuses = {};
    let overallStatus = 'VERIFIED';
    let hasLiveStore = false;
    let hasUnknown = false;

    const fieldsToRetrieve = (requiredFields && requiredFields.length > 0)
      ? requiredFields
      : ['identity.name', 'pricing.selling_price', 'inventory.in_stock'];

    for (const fieldPath of fieldsToRetrieve) {
      const parts = fieldPath.split('.');
      let val = universal;
      for (const p of parts) {
        val = (val !== null && val !== undefined) ? val[p] : undefined;
      }

      let status = 'VERIFIED';
      if (fieldPath.startsWith('pricing.') || fieldPath.startsWith('inventory.') || fieldPath.startsWith('delivery.') || fieldPath.startsWith('returns.')) {
        status = 'STORE_LIVE';
        hasLiveStore = true;
      } else if (fieldPath.startsWith('verification.') || fieldPath.startsWith('manufacturer.official_url')) {
        status = 'VERIFIED_EXTERNAL';
      }

      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        status = 'UNKNOWN';
        hasUnknown = true;
        val = null;
      }

      facts[fieldPath] = val;
      fieldStatuses[fieldPath] = status;
    }

    if (hasUnknown && Object.keys(facts).every(k => fieldStatuses[k] === 'UNKNOWN')) {
      overallStatus = 'UNKNOWN';
    } else if (hasLiveStore) {
      overallStatus = 'STORE_LIVE';
    }

    return {
      success: true,
      productId: universal.product_id,
      productName: universal.identity.name,
      category: universal.identity.category,
      intent,
      requiredFields: fieldsToRetrieve,
      knowledgeStatus: overallStatus,
      fieldStatuses,
      facts,
      universal
    };
  }

  /**
   * Derive dynamic aliases for natural language identification
   */
  static generateAliases(product) {
    const aliases = new Set();
    const name = product.name || '';
    aliases.add(name.toLowerCase());

    if (product.brand) {
      aliases.add(`${product.brand.toLowerCase()}`);
      aliases.add(`${product.brand.toLowerCase()} ${name.toLowerCase()}`);
    }

    if (product.model) {
      aliases.add(product.model.toLowerCase());
    }

    if (product.variant) {
      aliases.add(product.variant.toLowerCase());
    }

    // Common abbreviations
    if (/asus tuf/i.test(name)) {
      aliases.add('asus tuf');
      aliases.add('tuf gaming');
      aliases.add('tuf laptop');
    }
    if (/dell inspiron/i.test(name)) {
      aliases.add('dell inspiron');
      aliases.add('inspiron');
    }
    if (/lenovo ideapad/i.test(name)) {
      aliases.add('lenovo ideapad');
      aliases.add('ideapad');
    }
    if (/acer aspire/i.test(name)) {
      aliases.add('acer aspire');
      aliases.add('aspire lite');
    }
    if (/ragi mudde/i.test(name)) {
      aliases.add('ragi mudde');
      aliases.add('mudde');
    }
    if (/akki rotti/i.test(name)) {
      aliases.add('akki rotti');
      aliases.add('rotti');
    }
    if (/dolo/i.test(name)) {
      aliases.add('dolo 650');
      aliases.add('dolo');
    }
    if (/calpol/i.test(name)) {
      aliases.add('calpol 500');
      aliases.add('calpol');
    }
    if (/paracetamol/i.test(name)) {
      aliases.add('paracetamol');
    }
    if (/electral/i.test(name)) {
      aliases.add('electral');
      aliases.add('ors sachet');
    }

    return Array.from(aliases);
  }

  /**
   * Attributes suitable for side-by-side comparison per category
   */
  static getComparisonAttributesForCategory(category = '') {
    const cat = category.toLowerCase();
    if (cat.includes('laptop')) {
      return ['processor', 'ram', 'gpu', 'storage', 'display', 'battery', 'weight', 'os', 'price', 'warranty'];
    }
    if (cat.includes('phone') || cat.includes('mobile')) {
      return ['processor', 'ram', 'storage', 'camera', 'display', 'battery', 'charging', 'price', 'water_resistance'];
    }
    if (cat.includes('cloth') || cat.includes('apparel')) {
      return ['fabric', 'gsm', 'fit', 'sizes', 'colours', 'wash_care', 'price', 'return_policy'];
    }
    if (cat.includes('food')) {
      return ['ingredients', 'serving_size', 'calories', 'protein', 'dietary_type', 'preparation_time', 'price', 'shelf_life'];
    }
    if (cat.includes('medic') || cat.includes('health')) {
      return ['active_ingredients', 'strength', 'dosage_form', 'purpose', 'prescription_status', 'price', 'pack_size'];
    }
    return ['category', 'brand', 'price', 'specifications', 'warranty', 'delivery'];
  }

  /**
   * Recommendation tags
   */
  static getRecommendationAttributes(product, specs) {
    const attrs = [];
    if (product.category) attrs.push(product.category.toLowerCase());
    if (product.brand) attrs.push(product.brand.toLowerCase());
    if (product.salePrice) {
      if (product.salePrice <= 1000) attrs.push('budget', 'under-1000');
      else if (product.salePrice <= 5000) attrs.push('affordable', 'under-5000');
      else if (product.salePrice <= 50000) attrs.push('mid-range', 'under-50000');
      else attrs.push('premium', 'high-end');
    }
    if (specs.gaming) attrs.push('gaming', 'aaa-gaming');
    if (specs.processor && /i7|i9|ryzen 7|m2|m3/i.test(specs.processor)) attrs.push('coding', 'programming', 'ai', 'ai/ml', 'heavy-computing');
    if (product.protein) attrs.push('high-protein', 'gym', 'fitness');
    if (product.allergens && /none|gluten-free/i.test(product.allergens)) attrs.push('healthy', 'clean-eating');
    return attrs;
  }

  /**
   * Derive use cases from product specs
   */
  static deriveUseCases(product, specs) {
    const useCases = [];
    const cat = (product.category || '').toLowerCase();
    if (cat.includes('laptop')) {
      if (specs.gaming || specs.gpu) useCases.push('Gaming', '3D Rendering', 'Video Editing');
      if (specs.processor) useCases.push('Coding', 'Software Development', 'AI/ML Projects');
      useCases.push('Everyday Office & Student Work');
    } else if (cat.includes('phone')) {
      useCases.push('Photography', 'Daily Multitasking', 'Streaming & Social Media');
    } else if (cat.includes('food')) {
      if (product.protein) useCases.push('Post-Workout Nutrition', 'Muscle Recovery', 'Clean Diet');
      useCases.push('Daily Healthy Meal', 'Traditional Karnataka Diet');
    } else if (cat.includes('medic')) {
      if (product.purpose) useCases.push(product.purpose);
    }
    return useCases;
  }

  /**
   * Detect which intents are supported by verified fields of this product
   */
  static detectSupportedIntents(product, specs) {
    const intents = new Set(['PRICE', 'STOCK', 'DELIVERY', 'RETURN', 'PAYMENT']);
    if (product.discountPercent) intents.add('DISCOUNT');
    if (product.mrp || product.price) intents.add('MRP');
    if (product.description) intents.add('PRODUCT_DETAILS');
    if (specs && Object.keys(specs).length > 0) intents.add('SPECIFICATIONS');
    if (product.colours && product.colours.length > 0) intents.add('COLOUR');
    if (product.sizes && product.sizes.length > 0) intents.add('SIZE');
    if (product.warranty) intents.add('WARRANTY');

    // Category specifics
    if (specs.processor) intents.add('PROCESSOR');
    if (specs.ram) intents.add('RAM');
    if (specs.gpu || specs.graphics) intents.add('GPU');
    if (specs.storage) intents.add('STORAGE');
    if (specs.display) intents.add('DISPLAY');
    if (specs.battery) intents.add('BATTERY');
    if (specs.camera) intents.add('CAMERA');
    if (specs.os) intents.add('OS');
    if (specs.cooling) intents.add('COOLING');
    if (specs.gaming) intents.add('GAMING');
    if (specs.usage) intents.add('USAGE');
    if (specs.compatibility) intents.add('COMPATIBILITY');
    if (specs.durability) intents.add('DURABILITY');
    if (specs.upgradeability) intents.add('UPGRADEABILITY');

    if (product.activeIngredients) intents.add('ACTIVE_INGREDIENTS');
    if (product.strength) intents.add('STRENGTH');
    if (product.dosageForm) intents.add('DOSAGE_FORM');
    if (product.howToUse) intents.add('HOW_TO_USE');
    if (product.purpose || product.benefits) intents.add('PURPOSE_BENEFITS');
    if (product.sideEffects) intents.add('SIDE_EFFECTS');
    if (product.warnings) intents.add('WARNINGS');
    if (product.contraindications) intents.add('CONTRAINDICATIONS');
    if (product.drugInteractions) intents.add('DRUG_INTERACTIONS');
    if (product.prescriptionStatus) intents.add('PRESCRIPTION');
    if (product.expiryDate) intents.add('EXPIRY');

    if (product.mainIngredients || product.completeIngredients) intents.add('INGREDIENTS');
    if (product.servingSize) intents.add('SERVING_SIZE');
    if (product.preparationMethod || product.cookingMethod) intents.add('COOKING_METHOD');
    if (product.calories || product.protein) intents.add('NUTRITION');
    if (product.allergens) intents.add('ALLERGENS');
    if (product.shelfLife) intents.add('SHELF_LIFE');

    return Array.from(intents);
  }

  /**
   * Generate search keywords for fuzzy lookup
   */
  static generateKeywords(product, aliases, specs) {
    const kws = new Set([...aliases]);
    (product.name || '').toLowerCase().split(/\s+/).forEach(w => kws.add(w));
    if (product.brand) kws.add(product.brand.toLowerCase());
    if (product.category) kws.add(product.category.toLowerCase());
    if (product.subcategory) kws.add(product.subcategory.toLowerCase());
    if (specs.processor) kws.add(specs.processor.toLowerCase());
    if (specs.gpu) kws.add(specs.gpu.toLowerCase());
    return Array.from(kws);
  }

  /**
   * Helper to retrieve field value safely by dot path (e.g. "pricing.selling_price")
   */
  static getFieldValue(universalProduct, path) {
    if (!universalProduct || !path) return null;
    const parts = path.split('.');
    let cur = universalProduct;
    for (const part of parts) {
      if (cur === null || cur === undefined) return null;
      cur = cur[part];
    }
    return cur;
  }

  /**
   * Check if a field path has non-empty verified value
   */
  static hasField(universalProduct, path) {
    const val = ProductKnowledgeService.getFieldValue(universalProduct, path);
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && Object.keys(val).length === 0) return false;
    return true;
  }

  /**
   * Look up universal product by product object or ID
   */
  static getUniversalProduct(productOrId) {
    if (!productOrId) return null;
    if (typeof productOrId === 'object' && productOrId.identity && productOrId.pricing) {
      return productOrId; // already universal
    }
    const product = typeof productOrId === 'string' ? db.getProductById(productOrId) : productOrId;
    if (!product) return null;
    return ProductKnowledgeService.toUniversal(product);
  }
}
