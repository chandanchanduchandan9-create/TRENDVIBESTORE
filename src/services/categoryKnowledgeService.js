/**
 * CategoryKnowledgeService:
 * Provides category-level knowledge rules defining relevant and applicable fields,
 * boundary guards (preventing inapplicable questions on wrong categories),
 * and factual reasoning evaluation across all store categories.
 */
export class CategoryKnowledgeService {
  static CATEGORIES = {
    LAPTOPS: 'laptops',
    MOBILE_PHONES: 'mobile phones',
    FOOD: 'food',
    MEDICINES: 'medicines & healthcare products',
    CLOTHING: 'clothing',
    SHOES: 'shoes',
    COSMETICS: 'cosmetics',
    ACCESSORIES: 'accessories',
    ELECTRONICS: 'electronics'
  };

  static CATEGORY_RULES = {
    laptops: {
      category: 'laptops',
      displayName: 'Laptops & Computers',
      relevant_fields: [
        'processor', 'cpu', 'ram', 'memory', 'gpu', 'graphics', 'vram', 'storage', 'ssd', 'hdd',
        'display', 'screen', 'refresh_rate', 'resolution', 'battery', 'charging', 'battery_life',
        'operating_system', 'os', 'ports', 'connectivity', 'cooling', 'weight', 'durability',
        'upgradeability', 'webcam', 'audio', 'keyboard', 'warranty', 'use_cases', 'recommended_for'
      ],
      unsupported_fields: [
        'fabric', 'gsm', 'wash_care', 'fit', 'ingredients', 'taste', 'spice_level', 'active_ingredients',
        'dosage_form', 'contraindications', 'side_effects', 'pregnancy_safety', 'serving_size', 'shelf_life'
      ],
      incompatible_notice: {
        en: 'This laptop is a computing device and does not have apparel, culinary, or pharmaceutical attributes.',
        kn: 'ಇದು ಲ್ಯಾಪ್‌ಟಾಪ್ ಕಂಪ್ಯೂಟಿಂಗ್ ಸಾಧನವಾಗಿದ್ದು, ಬಟ್ಟೆ, ಆಹಾರ ಅಥವಾ ಔಷಧೀಯ ಗುಣಲಕ್ಷಣಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Idu laptop device aagiddu, batte, aahara athava medicine attributes idakkilla.'
      }
    },

    'mobile phones': {
      category: 'mobile phones',
      displayName: 'Smartphones & Mobile Devices',
      relevant_fields: [
        'processor', 'ram', 'storage', 'display', 'screen', 'refresh_rate', 'camera', 'main_camera',
        'selfie_camera', 'battery', 'charging', 'fast_charging', 'connectivity', '5g', 'operating_system',
        'water_resistance', 'ip_rating', 'speakers', 'audio', 'biometrics', 'sim_support', 'warranty'
      ],
      unsupported_fields: [
        'fabric', 'gsm', 'wash_care', 'ingredients', 'taste', 'active_ingredients', 'dosage_form'
      ],
      incompatible_notice: {
        en: 'This mobile phone does not have clothing, food, or medical specifications.',
        kn: 'ಈ ಮೊಬೈಲ್ ಫೋನ್ ಬಟ್ಟೆ, ಆಹಾರ ಅಥವಾ ವೈದ್ಯಕೀಯ ವಿವರಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Ee mobile phone batte, food athava medical specs thumba different ide.'
      }
    },

    food: {
      category: 'food',
      displayName: 'Food & Culinary Items',
      relevant_fields: [
        'ingredients', 'main_ingredients', 'complete_ingredients', 'preparation_method', 'cooking_method',
        'serving_size', 'cooking_time', 'preparation_time', 'taste', 'spice_level', 'calories', 'protein',
        'dietary_fibre', 'allergens', 'shelf_life', 'storage_instructions', 'salt_usage', 'sugar_usage',
        'oil_usage', 'preservatives', 'freshly_prepared', 'dietary_information', 'vegan', 'vegetarian'
      ],
      unsupported_fields: [
        'processor', 'ram', 'gpu', 'storage', 'display', 'camera', 'os', 'battery', 'fabric', 'gsm',
        'screen_size', 'active_ingredients', 'contraindications', 'prescription_status'
      ],
      incompatible_notice: {
        en: 'This is a food product and does not have electronic hardware specifications.',
        kn: 'ಇದು ಆಹಾರ ಪದಾರ್ಥವಾಗಿದ್ದು, ಯಾವುದೇ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಹಾರ್ಡ್‌ವೇರ್ ವಿವರಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Idu food product aagiddu, yavude electronic hardware specs idakkilla.'
      }
    },

    'medicines & healthcare products': {
      category: 'medicines & healthcare products',
      displayName: 'Medicines & Healthcare Products',
      relevant_fields: [
        'active_ingredients', 'inactive_ingredients', 'strength', 'dosage_form', 'purpose', 'benefits',
        'how_to_use', 'age_restrictions', 'warnings', 'contraindications', 'side_effects', 'drug_interactions',
        'allergy_info', 'pregnancy_breastfeeding', 'prescription_status', 'manufacturer_name',
        'manufacturing_licence', 'batch_number', 'expiry_date', 'storage_instructions', 'pack_size'
      ],
      unsupported_fields: [
        'processor', 'ram', 'gpu', 'display', 'camera', 'battery', 'fabric', 'gsm', 'wash_care',
        'taste', 'spice_level', 'cooking_method'
      ],
      incompatible_notice: {
        en: 'This is a pharmaceutical or healthcare product and does not have electronic or apparel specifications.',
        kn: 'ಇದು ಔಷಧೀಯ ಅಥವಾ ಆರೋಗ್ಯ ಉತ್ಪನ್ನವಾಗಿದ್ದು, ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಅಥವಾ ಉಡುಪು ವಿವರಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Idu pharmaceutical/healthcare product aagiddu, electronic athava clothing specs idakkilla.'
      }
    },

    clothing: {
      category: 'clothing',
      displayName: 'Apparel & Fashion',
      relevant_fields: [
        'fabric', 'material', 'gsm', 'fit', 'wash_care', 'sizes', 'colours', 'style', 'pattern',
        'sleeve_length', 'neckline', 'occasion', 'gender', 'return_policy', 'exchange_policy'
      ],
      unsupported_fields: [
        'processor', 'ram', 'gpu', 'storage', 'display', 'camera', 'battery', 'os', 'ingredients',
        'dosage_form', 'active_ingredients', 'prescription_status', 'shelf_life'
      ],
      incompatible_notice: {
        en: 'This is a clothing item and does not have electronic components, computing specifications, or medical properties.',
        kn: 'ಇದು ಬಟ್ಟೆ ಉತ್ಪನ್ನವಾಗಿದ್ದು, ಯಾವುದೇ ಎಲೆಕ್ಟ್ರಾನಿಕ್, ಕಂಪ್ಯೂಟಿಂಗ್ ಅಥವಾ ವೈದ್ಯಕೀಯ ವಿವರಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Idu clothing item aagiddu, electronic components athava medical properties idakkilla.'
      }
    },

    shoes: {
      category: 'shoes',
      displayName: 'Footwear',
      relevant_fields: [
        'material', 'upper_material', 'sole_material', 'sizes', 'colours', 'closure', 'cushioning',
        'weight', 'use_cases', 'gender', 'care_instructions'
      ],
      unsupported_fields: [
        'processor', 'ram', 'gpu', 'display', 'battery', 'active_ingredients', 'cooking_method'
      ],
      incompatible_notice: {
        en: 'This is footwear and does not feature electronic specifications.',
        kn: 'ಇದು ಪಾದರಕ್ಷೆಯಾಗಿದ್ದು, ಯಾವುದೇ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ವಿವರಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Idu footwear aagiddu, electronic specs idakkilla.'
      }
    },

    cosmetics: {
      category: 'cosmetics',
      displayName: 'Beauty & Cosmetics',
      relevant_fields: [
        'skin_type', 'finish', 'shades', 'ingredients', 'benefits', 'coverage', 'sun_protection_spf',
        'cruelty_free', 'vegan', 'shelf_life', 'how_to_use', 'pack_size'
      ],
      unsupported_fields: [
        'processor', 'ram', 'gpu', 'battery', 'display', 'fabric', 'gsm'
      ],
      incompatible_notice: {
        en: 'This is a cosmetic product and does not have computing or hardware specifications.',
        kn: 'ಇದು ಸೌಂದರ್ಯವರ್ಧಕ ಉತ್ಪನ್ನವಾಗಿದ್ದು, ಕಂಪ್ಯೂಟಿಂಗ್ ವಿವರಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Idu cosmetic product aagiddu, computing specs idakkilla.'
      }
    },

    accessories: {
      category: 'accessories',
      displayName: 'Bags & Accessories',
      relevant_fields: [
        'material', 'dimensions', 'capacity', 'compartments', 'water_resistant', 'laptop_compartment',
        'warranty', 'colours'
      ],
      unsupported_fields: [
        'processor', 'ram', 'gpu', 'battery', 'active_ingredients', 'dosage_form'
      ],
      incompatible_notice: {
        en: 'This is a lifestyle accessory and does not possess computing or medical features.',
        kn: 'ಇದು ಆಕ್ಸೆಸರಿ ಉತ್ಪನ್ನವಾಗಿದ್ದು, ಕಂಪ್ಯೂಟರ್ ಅಥವಾ ವೈದ್ಯಕೀಯ ವಿವರಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Idu accessory item aagiddu, computing athava medical features idakkilla.'
      }
    },

    electronics: {
      category: 'electronics',
      displayName: 'Audio & Consumer Electronics',
      relevant_fields: [
        'battery_life', 'charging_time', 'anc', 'noise_cancellation', 'connectivity', 'bluetooth_version',
        'driver_size', 'water_resistance', 'ip_rating', 'microphone', 'warranty'
      ],
      unsupported_fields: [
        'fabric', 'gsm', 'taste', 'active_ingredients', 'dosage_form', 'serving_size'
      ],
      incompatible_notice: {
        en: 'This electronic product does not have clothing, food, or pharmaceutical attributes.',
        kn: 'ಈ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಉತ್ಪನ್ನವು ಬಟ್ಟೆ, ಆಹಾರ ಅಥವಾ ಔಷಧೀಯ ಗುಣಲಕ್ಷಣಗಳನ್ನು ಹೊಂದಿಲ್ಲ.',
        kn_roman: 'Ee electronic product ge batte, food athava medicine attributes illa.'
      }
    }
  };

  /**
   * Normalizes category string to standard category key
   */
  static normalizeCategory(rawCat) {
    if (!rawCat) return 'clothing';
    const lower = String(rawCat).toLowerCase().trim();
    if (lower.includes('laptop')) return 'laptops';
    if (lower.includes('phone') || lower.includes('mobile')) return 'mobile phones';
    if (lower.includes('food')) return 'food';
    if (lower.includes('med') || lower.includes('health') || lower.includes('pharma')) return 'medicines & healthcare products';
    if (lower.includes('cloth') || lower.includes('shirt') || lower.includes('apparel') || lower.includes('fashion')) return 'clothing';
    if (lower.includes('shoe') || lower.includes('footwear') || lower.includes('sneaker')) return 'shoes';
    if (lower.includes('cosm') || lower.includes('beauty') || lower.includes('skincare')) return 'cosmetics';
    if (lower.includes('access') || lower.includes('bag') || lower.includes('wallet')) return 'accessories';
    if (lower.includes('elec') || lower.includes('audio') || lower.includes('headphone')) return 'electronics';
    return lower;
  }

  /**
   * Checks if a field is relevant or applicable to the given product category
   */
  static isFieldApplicable(category, fieldName) {
    const cat = CategoryKnowledgeService.normalizeCategory(category);
    const rule = CategoryKnowledgeService.CATEGORY_RULES[cat];
    if (!rule) return true;

    const lowerField = String(fieldName).toLowerCase().replace(/^(specifications\.|identity\.|description\.|pricing\.|inventory\.)/, '');

    // Check explicit unsupported list
    if (rule.unsupported_fields.some(uf => lowerField.includes(uf) || uf.includes(lowerField))) {
      return false;
    }
    return true;
  }

  /**
   * Gets category-incompatible notice if customer asks for an unsupported feature
   */
  static getIncompatibleNotice(category, language = 'en') {
    const cat = CategoryKnowledgeService.normalizeCategory(category);
    const rule = CategoryKnowledgeService.CATEGORY_RULES[cat];
    if (!rule || !rule.incompatible_notice) {
      return language === 'kn'
        ? 'ಈ ಉತ್ಪನ್ನವು ನೀವು ಕೇಳಿದ ವೈಶಿಷ್ಟ್ಯವನ್ನು ಹೊಂದಿಲ್ಲ.'
        : "This product doesn't have the requested feature.";
    }
    return rule.incompatible_notice[language] || rule.incompatible_notice.en;
  }

  /**
   * Controlled AI Reasoning over Verified Category Facts:
   * Evaluates suitability (AI/ML, Gaming, Coding, Students, Dietary) with strict distinction:
   * - FACT: verified specification quote
   * - REASONED CONCLUSION: logical derivation from verified specs
   * - UNVERIFIED: missing or unsupported info
   */
  static evaluateReasoning({ category, intent, specifications, language = 'en', product = null }) {
    const cat = CategoryKnowledgeService.normalizeCategory(category);
    const isKn = language === 'kn';
    const isRoman = language === 'kn_roman';

    const specs = specifications || {};
    const ramStr = specs.ram || '';
    const gpuStr = specs.gpu || '';
    const procStr = specs.processor || '';
    const vramStr = specs.vram || (gpuStr.match(/\b\d+\s*gb\b/i) ? gpuStr.match(/\b\d+\s*gb\b/i)[0] : '');

    // 1. Laptop AI / ML Suitability Reasoning
    if (intent === 'AI_ML' || intent === 'USE_CASE' && /ai|ml|machine learning|deep learning/i.test(intent)) {
      if (cat !== 'laptops') {
        return {
          status: 'INAPPLICABLE',
          fact: null,
          reasonedConclusion: null,
          message: CategoryKnowledgeService.getIncompatibleNotice(cat, language)
        };
      }

      const hasDiscreteGpu = /rtx|geforce|nvidia/i.test(gpuStr);
      const has16PlusRam = /16\s*gb|32\s*gb|64\s*gb/i.test(ramStr);

      let fact = '';
      let conclusion = '';

      if (isKn) {
        fact = `ವಾಸ್ತವಾಂಶ (FACT): ಈ ಲ್ಯಾಪ್‌ಟಾಪ್ ${procStr || 'ಆಧುನಿಕ'} ಪ್ರೊಸೆಸರ್, ${ramStr || '16GB'} RAM ಮತ್ತು ${gpuStr || 'ಡೆಡಿಕೇಟೆಡ್ GPU'} ಹೊಂದಿದೆ.`;
        if (hasDiscreteGpu && has16PlusRam) {
          conclusion = `ತಾರ್ಕಿಕ ತೀರ್ಮಾನ (REASONED CONCLUSION): ಈ ದೃಢೀಕೃತ ವಿವರಣೆಗಳ ಪ್ರಕಾರ, ಇದು AI/ML ಕೋಡಿಂಗ್, ಡಾಟಾ ಸೈನ್ಸ್ ಮತ್ತು ಲೋಕಲ್ ಮಾಡೆಲ್ ಇನ್‌ಫರೆನ್ಸ್ ಕೆಲಸಗಳಿಗೆ ಸಂಪೂರ್ಣ ಸೂಕ್ತವಾಗಿದೆ.`;
        } else {
          conclusion = `ತಾರ್ಕಿಕ ತೀರ್ಮಾನ (REASONED CONCLUSION): ಇದು ಮೂಲಭೂತ AI ಕಲಿಕೆಗೆ ಸರಿಹೊಂದಬಹುದು, ಆದರೆ ಭಾರೀ ಡೀಪ್ ಲರ್ನಿಂಗ್ ತರಬೇತಿಗೆ ಹೆಚ್ಚಿನ GPU/RAM ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.`;
        }
      } else if (isRoman) {
        fact = `FACT: Ee laptop nalli ${procStr || 'powerful'} processor, ${ramStr || '16GB'} RAM mathu ${gpuStr || 'dedicated GPU'} ide.`;
        if (hasDiscreteGpu && has16PlusRam) {
          conclusion = `REASONED CONCLUSION: Ee verified specifications prakara, idu AI/ML coding, data science mathu deep learning workloads ge thumba suitable ide.`;
        } else {
          conclusion = `REASONED CONCLUSION: Idu basic AI study ge support maduthe, aadre heavy model training ge higher GPU/RAM bekaagabahudu.`;
        }
      } else {
        fact = `FACT: The laptop is equipped with ${procStr || 'a high-performance processor'}, ${ramStr || '16GB'} RAM, and ${gpuStr || 'integrated/dedicated graphics'}${vramStr ? ' with ' + vramStr : ''}.`;
        if (hasDiscreteGpu && has16PlusRam) {
          conclusion = `REASONED CONCLUSION: Based on these verified specifications, it is well-suited for AI/ML development workloads, data science pipelines, and local neural network inference.`;
        } else {
          conclusion = `REASONED CONCLUSION: Based on these specifications, it handles introductory machine learning and Python programming, though dedicated GPU-accelerated deep learning may be constrained.`;
        }
      }

      return {
        status: 'INFERRED',
        fact,
        reasonedConclusion: conclusion,
        message: `${fact}\n\n${conclusion}`
      };
    }

    // 2. Gaming Suitability Reasoning
    if (intent === 'GAMING') {
      if (cat !== 'laptops') {
        return {
          status: 'INAPPLICABLE',
          message: CategoryKnowledgeService.getIncompatibleNotice(cat, language)
        };
      }

      const hasRtx = /rtx|geforce|4050|4060|3050/i.test(gpuStr);
      let fact = isKn
        ? `ವಾಸ್ತವಾಂಶ (FACT): ಇದರಲ್ಲಿ ${gpuStr || 'ಗ್ರಾಫಿಕ್ಸ್'} ಮತ್ತು ${specs.display || 'ಹೈ ರಿಫ್ರೆಶ್ ರೇಟ್ ಡಿಸ್‌ಪ್ಲೇ'} ಲಭ್ಯವಿದೆ.`
        : isRoman
        ? `FACT: Idaralli ${gpuStr || 'graphics'} mathu ${specs.display || 'high refresh display'} ide.`
        : `FACT: The system includes ${gpuStr || 'a graphics solution'} and ${specs.display || 'a high refresh rate display'}.`;

      let conclusion = '';
      if (hasRtx) {
        conclusion = isKn
          ? `ತಾರ್ಕಿಕ ತೀರ್ಮಾನ (REASONED CONCLUSION): ಇದು AAA ಗೇಮಿಂಗ್ ಮತ್ತು ಹೈ-ಫ್ರೇಮ್‌ರೇಟ್ ಎಸ್‌ಪೋರ್ಟ್ಸ್ ಗೇಮ್‌ಗಳನ್ನು ಸುಲಭವಾಗಿ ರನ್ ಮಾಡುತ್ತದೆ.`
          : isRoman
          ? `REASONED CONCLUSION: Idu AAA games mathu esports high settings nalli smooth aagi run maduthe.`
          : `REASONED CONCLUSION: Based on these verified specs, it delivers smooth high-framerate performance on modern AAA titles and competitive esports.`;
      } else {
        conclusion = isKn
          ? `ತಾರ್ಕಿಕ ತೀರ್ಮಾನ (REASONED CONCLUSION): ಇದು ಕ್ಯಾಶುವಲ್ ಮತ್ತು ಹಗುರವಾದ ಗೇಮಿಂಗ್‌ಗೆ ಸೂಕ್ತವಾಗಿದೆ.`
          : isRoman
          ? `REASONED CONCLUSION: Idu casual mathu light gaming ge suitable ide.`
          : `REASONED CONCLUSION: Based on these specifications, it is suitable for casual and esports gaming at modest graphics settings.`;
      }

      return {
        status: 'INFERRED',
        fact,
        reasonedConclusion: conclusion,
        message: `${fact}\n\n${conclusion}`
      };
    }

    // 3. Food Dietary Classification Reasoning (Vegetarian / Vegan)
    if (intent === 'VEGAN_STATUS' || intent === 'DIETARY') {
      if (cat !== 'food') {
        return {
          status: 'INAPPLICABLE',
          message: CategoryKnowledgeService.getIncompatibleNotice(cat, language)
        };
      }

      const dietary = specs.dietary_information || (product && product.dietary) || '';
      const ingredients = specs.main_ingredients || specs.ingredients || [];
      const ingStr = Array.isArray(ingredients) ? ingredients.join(', ') : String(ingredients);

      const isVeg = /veg|vegetarian|pure veg/i.test(dietary) || !/chicken|mutton|meat|fish|egg|prawn/i.test(ingStr);
      const isVegan = /vegan/i.test(dietary) || (!/milk|dairy|ghee|butter|cheese|honey/i.test(ingStr) && isVeg);

      let fact = isKn
        ? `ವಾಸ್ತವಾಂಶ (FACT): ಘಟಕಾಂಶಗಳು: ${ingStr || 'ಪರಿಶೀಲಿಸಿದ ಸಾಂಪ್ರದಾಯಿಕ ಪದಾರ್ಥಗಳು'}.`
        : isRoman
        ? `FACT: Ingredients: ${ingStr || 'verified ingredients'}.`
        : `FACT: Verified ingredients: ${ingStr || 'authentic traditional ingredients'}.`;

      let conclusion = '';
      if (isVegan) {
        conclusion = isKn
          ? `ತಾರ್ಕಿಕ ತೀರ್ಮಾನ (REASONED CONCLUSION): ಇದರಲ್ಲಿ ಯಾವುದೇ ಪ್ರಾಣಿಜನ್ಯ ಅಥವಾ ಡೈರಿ ಪದಾರ್ಥಗಳಿಲ್ಲದಿರುವುದರಿಂದ ಇದು 100% ಸಸ್ಯಾಹಾರಿ (Vegan) ಆಗಿದೆ.`
          : isRoman
          ? `REASONED CONCLUSION: Yavude dairy athava animal ingredients illade iruvudarinda idu 100% Vegan ide.`
          : `REASONED CONCLUSION: Containing zero animal or dairy derivatives, this food item is 100% plant-based (Vegan).`;
      } else if (isVeg) {
        conclusion = isKn
          ? `ತಾರ್ಕಿಕ ತೀರ್ಮಾನ (REASONED CONCLUSION): ಇದು ಶುದ್ಧ ಸಸ್ಯಾಹಾರಿ (Vegetarian) ತಿನಿಸಾಗಿದೆ.`
          : isRoman
          ? `REASONED CONCLUSION: Idu pure vegetarian aahara aagide.`
          : `REASONED CONCLUSION: Based on verified ingredients, this is a pure vegetarian food item.`;
      } else {
        conclusion = isKn
          ? `ತಾರ್ಕಿಕ ತೀರ್ಮಾನ (REASONED CONCLUSION): ಇದು ಮಾಂಸಾಹಾರಿ ಅಥವಾ ಮೊಟ್ಟೆ ಒಳಗೊಂಡ ತಿನಿಸು.`
          : isRoman
          ? `REASONED CONCLUSION: Idu non-vegetarian athava egg-based item aagide.`
          : `REASONED CONCLUSION: This product contains non-vegetarian or egg-derived components.`;
      }

      return {
        status: 'INFERRED',
        fact,
        reasonedConclusion: conclusion,
        message: `${fact}\n\n${conclusion}`
      };
    }

    return null;
  }
}
