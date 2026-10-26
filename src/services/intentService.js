import { ProductKnowledgeService } from './productKnowledgeService.js';

/**
 * Reusable Intent System and Question Template Engine
 * Defines configurations for 32+ e-commerce intents and question templates across
 * English, Kannada, and Roman Kannada (Kanglish), with explicit Knowledge Source routing.
 */
export const INTENT_CONFIG = {
  // 1. COMMERCIAL & PRICING (Source: STORE_DATABASE)
  PRICE: {
    intent: 'PRICE',
    required_fields: ['pricing.selling_price', 'pricing.mrp', 'pricing.discount_percent'],
    source: 'STORE_DATABASE',
    tool: 'getPrice',
    patterns: [
      /\b(price|cost|how much|rate|selling price|current price|amount|mrp|rupees|rs|₹|ಬೆಲೆ|ಎಷ್ಟು|ಖರ್ಚು|bele|eshtu|rate)\b/i,
      /\b(how much do i (have to|need to)?\s*pay|what does it cost)\b/i
    ],
    example_questions: [
      'What is the price?',
      'How much does it cost?',
      'What is the current price?',
      'How much do I need to pay?'
    ],
    templates: {
      en: 'What is the price of this product?',
      kn: 'ಈ ಉತ್ಪನ್ನದ ಬೆಲೆ ಎಷ್ಟು?',
      kn_roman: 'Ee product bele eshtu?'
    }
  },
  DISCOUNT: {
    intent: 'DISCOUNT',
    required_fields: ['pricing.discount_percent'],
    source: 'STORE_DATABASE',
    tool: 'getPrice',
    patterns: [
      /\b(discount|offer|deal|rebate|percentage off|savings|ರಿಯಾಯಿತಿ|ಆಫರ್|discount ideya|offer ideya)\b/i
    ],
    example_questions: [
      'What is the discount available?',
      'Is there any offer on this product?'
    ],
    templates: {
      en: 'What is the discount on this product?',
      kn: 'ಇದರ ಮೇಲೆ ಎಷ್ಟು ರಿಯಾಯಿತಿ ಇದೆ?',
      kn_roman: 'Idara mele eshtu discount ide?'
    }
  },
  MRP: {
    intent: 'MRP',
    required_fields: ['pricing.mrp'],
    source: 'STORE_DATABASE',
    tool: 'getPrice',
    patterns: [
      /\b(mrp|original price|maximum retail price|list price|ಮೂಲ ಬೆಲೆ)\b/i
    ],
    example_questions: ['What is the MRP of this item?'],
    templates: {
      en: 'What is the original MRP?',
      kn: 'ಇದರ ಮೂಲ ಎಂಆರ್‌ಪಿ (MRP) ಎಷ್ಟು?',
      kn_roman: 'Idara original MRP eshtu?'
    }
  },
  PAYMENT: {
    intent: 'PAYMENT',
    required_fields: ['returns', 'pricing'],
    source: 'STORE_DATABASE',
    tool: 'getPaymentOptions',
    patterns: [
      /\b(payment|pay|cod|cash on delivery|upi|gpay|phonepe|paytm|credit card|debit card|emi|net banking|ಪಾವತಿ|ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ|payment options)\b/i
    ],
    example_questions: [
      'Can I pay via Cash on Delivery (COD)?',
      'What payment methods are supported?'
    ],
    templates: {
      en: 'Can I pay via Cash on Delivery (COD) or UPI?',
      kn: 'ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ (COD) ಅಥವಾ UPI ಮೂಲಕ ಪಾವತಿಸಬಹುದೇ?',
      kn_roman: 'Cash on Delivery (COD) athava UPI moolaka payment madabahuda?'
    }
  },

  // 2. INVENTORY & AVAILABILITY (Source: LIVE_INVENTORY)
  STOCK: {
    intent: 'STOCK',
    required_fields: ['inventory.in_stock'],
    source: 'LIVE_INVENTORY',
    tool: 'checkStock',
    patterns: [
      /\b(stock|in stock|is it in stock|do you have this|sold out|ಸ್ಟಾಕ್|stock ideya)\b/i
    ],
    example_questions: [
      'Is it available in stock?',
      'Do you have this in stock?'
    ],
    templates: {
      en: 'Is this product currently in stock?',
      kn: 'ಇದು ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್‌ನಲ್ಲಿ ಲಭ್ಯವಿದೆಯೇ?',
      kn_roman: 'Idu prastuta stock nalli ideya?'
    }
  },
  AVAILABILITY: {
    intent: 'AVAILABILITY',
    required_fields: ['inventory.in_stock'],
    source: 'LIVE_INVENTORY',
    tool: 'checkStock',
    patterns: [
      /\b(available|availability|is it available|still available|ಲಭ್ಯವಿದೆಯೇ|available ideya)\b/i
    ],
    example_questions: ['Is it available right now?'],
    templates: {
      en: 'Is this item currently available?',
      kn: 'ಇದು ಈಗ ಲಭ್ಯವಿದೆಯೇ?',
      kn_roman: 'Idu eega available ideya?'
    }
  },
  QUANTITY: {
    intent: 'QUANTITY',
    required_fields: ['inventory.quantity'],
    source: 'LIVE_INVENTORY',
    tool: 'checkStock',
    patterns: [
      /\b(how many units|how many pieces|quantity available|units left|number of units|count left|ಎಷ್ಟು ಯೂನಿಟ್‌ಗಳು|eshtu units)\b/i
    ],
    example_questions: ['How many units are left in stock?'],
    templates: {
      en: 'How many units are available?',
      kn: 'ಎಷ್ಟು ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯವಿವೆ?',
      kn_roman: 'Eshtu units available ide?'
    }
  },
  VARIANT: {
    intent: 'VARIANT',
    required_fields: ['inventory.variants'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getVariants',
    patterns: [
      /\b(variants|options|models|types|different versions|configurations|ರೂಪಾಂತರಗಳು|variants ideya)\b/i
    ],
    example_questions: ['What variants or configurations are available?'],
    templates: {
      en: 'What variants are available?',
      kn: 'ಯಾವ ಯಾವ ರೂಪಾಂತರಗಳು ಲಭ್ಯವಿವೆ?',
      kn_roman: 'Yava yava variants available ide?'
    }
  },
  SIZE: {
    intent: 'SIZE',
    required_fields: ['specifications.sizes'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'checkSize',
    patterns: [
      /\b(sizes?|what sizes|dimensions|size chart|fit size|ಗಾತ್ರ|sizes ideya|size yavudu)\b/i
    ],
    example_questions: ['What sizes are available for this product?'],
    templates: {
      en: 'What sizes are available?',
      kn: 'ಯಾವ ಯಾವ ಗಾತ್ರಗಳು ಲಭ್ಯವಿವೆ?',
      kn_roman: 'Yava yava sizes available ide?'
    }
  },
  COLOUR: {
    intent: 'COLOUR',
    required_fields: ['specifications.colours'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'checkColour',
    patterns: [
      /\b(colours?|colors?|shades?|finishes?|ಬಣ್ಣ|colours ideya|banna yavudu)\b/i
    ],
    example_questions: ['What colors are available?'],
    templates: {
      en: 'What colours are available?',
      kn: 'ಯಾವ ಯಾವ ಬಣ್ಣಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ?',
      kn_roman: 'Yava yava colours nalli available ide?'
    }
  },

  // 3. PRODUCT SPECS & HARDWARE (Source: PRODUCT_KNOWLEDGE)
  PRODUCT_DETAILS: {
    intent: 'PRODUCT_DETAILS',
    required_fields: ['description.short', 'identity.name'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(tell me about (it|this|the product)|product details|product information|overview|vivara|bagge heli)\b/i
    ],
    example_questions: ['Tell me about this product.'],
    templates: {
      en: 'Can you give me an overview of this product?',
      kn: 'ಈ ಉತ್ಪನ್ನದ ಸಂಪೂರ್ಣ ವಿವರ ನೀಡಬಹುದೇ?',
      kn_roman: 'Ee product bagge complete overview kodtheera?'
    }
  },
  SPECIFICATIONS: {
    intent: 'SPECIFICATIONS',
    required_fields: ['specifications'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(specs|specifications|hardware|technical details|ವಿಶೇಷತೆಗಳು)\b/i
    ],
    example_questions: ['What are the technical specifications?'],
    templates: {
      en: 'What are the key technical specifications?',
      kn: 'ಇದರ ಮುಖ್ಯ ತಾಂತ್ರಿಕ ವಿವರಗಳು ಯಾವುವು?',
      kn_roman: 'Idara key technical specifications yenu?'
    }
  },
  FEATURES: {
    intent: 'FEATURES',
    required_fields: ['description.key_features'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(features|key features|highlights|special features|ವೈಶಿಷ್ಟ್ಯಗಳು)\b/i
    ],
    example_questions: ['What are the key features of this product?'],
    templates: {
      en: 'What are the key features of this item?',
      kn: 'ಇದರ ಪ್ರಮುಖ ವೈಶಿಷ್ಟ್ಯಗಳು ಯಾವುವು?',
      kn_roman: 'Idara key features yenu?'
    }
  },
  PROCESSOR: {
    intent: 'PROCESSOR',
    required_fields: ['specifications.processor'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(processor|cpu|chipset|intel|ryzen|snapdragon|bionic|ಪ್ರೊಸೆಸರ್)\b/i
    ],
    example_questions: ['Which processor powers this device?'],
    templates: {
      en: 'Which processor powers this device?',
      kn: 'ಇದರಲ್ಲಿ ಯಾವ ಪ್ರೊಸೆಸರ್ ಇದೆ?',
      kn_roman: 'Idaralli yava processor ide?'
    }
  },
  RAM: {
    intent: 'RAM',
    required_fields: ['specifications.ram'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(ram|memory|ddr4|ddr5|how much ram|what is the ram|does it have .*?ram)\b/i
    ],
    example_questions: [
      'How much RAM does it have?',
      'What is the RAM capacity?',
      'Can the RAM be upgraded?'
    ],
    templates: {
      en: 'How much RAM does it have and can it be upgraded?',
      kn: 'ಇದರಲ್ಲಿ ಎಷ್ಟು RAM ಇದೆ ಮತ್ತು ವಿಸ್ತರಿಸಬಹುದೇ?',
      kn_roman: 'Idaralli eshtu RAM ide mathu upgrade madabahuda?'
    }
  },
  GPU: {
    intent: 'GPU',
    required_fields: ['specifications.gpu'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(gpu|graphics|rtx|geforce|vram|graphics card|ಗ್ರಾಫಿಕ್ಸ್)\b/i
    ],
    example_questions: ['What GPU does it have?'],
    templates: {
      en: 'What graphics card (GPU) does this laptop have?',
      kn: 'ಇದರಲ್ಲಿ ಯಾವ ಗ್ರಾಫಿಕ್ಸ್ ಕಾರ್ಡ್ (GPU) ಇದೆ?',
      kn_roman: 'Idaralli yava graphics card (GPU) ide?'
    }
  },
  STORAGE: {
    intent: 'STORAGE',
    required_fields: ['specifications.storage'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(storage|ssd|nvme|hard drive|internal storage|rom|gb ssd|tb ssd|ಸ್ಟೋರೇಜ್)\b/i
    ],
    example_questions: ['How much SSD storage is included?'],
    templates: {
      en: 'What is the storage capacity?',
      kn: 'ಇದರ ಸ್ಟೋರೇಜ್ ಸಾಮರ್ಥ್ಯ ಎಷ್ಟು?',
      kn_roman: 'Idara storage capacity eshtu?'
    }
  },
  DISPLAY: {
    intent: 'DISPLAY',
    required_fields: ['specifications.display'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(display|screen|refresh rate|hz|ips|amoled|resolution|brightness|144hz|120hz|ಡಿಸ್‌ಪ್ಲೇ)\b/i
    ],
    example_questions: ['What are the display size and refresh rate?'],
    templates: {
      en: 'What are the display specifications and refresh rate?',
      kn: 'ಇದರ ಡಿಸ್‌ಪ್ಲೇ ಗಾತ್ರ ಮತ್ತು ರಿಫ್ರೆಶ್ ರೇಟ್ ಎಷ್ಟು?',
      kn_roman: 'Idara display size mathu refresh rate yenu?'
    }
  },
  BATTERY: {
    intent: 'BATTERY',
    required_fields: ['specifications.battery'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(battery|charging|mah|whr|fast charging|backup|battery life|ಬ್ಯಾಟರಿ)\b/i
    ],
    example_questions: ['How long does the battery last?'],
    templates: {
      en: 'What is the battery capacity and charging speed?',
      kn: 'ಇದರ ಬ್ಯಾಟರಿ ಬ್ಯಾಕಪ್ ಮತ್ತು ಚಾರ್ಜಿಂಗ್ ವೇಗ ಎಷ್ಟು?',
      kn_roman: 'Idara battery capacity mathu charging speed yenu?'
    }
  },
  CAMERA: {
    intent: 'CAMERA',
    required_fields: ['specifications.camera'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(camera|webcam|megapixel|mp|selfie|sensors|ಕ್ಯಾಮೆರಾ)\b/i
    ],
    example_questions: ['What are the camera specifications?'],
    templates: {
      en: 'What camera capabilities are included?',
      kn: 'ಕ್ಯಾಮೆರಾ ವಿಶೇಷತೆಗಳು ಯಾವುವು?',
      kn_roman: 'Camera specifications yenu?'
    }
  },

  // 4. USAGE, SUITABILITY, COMPATIBILITY & PERFORMANCE (Source: PRODUCT_KNOWLEDGE)
  USAGE: {
    intent: 'USAGE',
    required_fields: ['usage.recommended_for'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(good for|suitable for|recommended for|can i use (it|this) for|who is this for|use cases?)\b/i
    ],
    example_questions: [
      'What use cases is this recommended for?'
    ],
    templates: {
      en: 'What use cases and workflows is this recommended for?',
      kn: 'ಯಾವ ಕೆಲಸಗಳಿಗೆ ಅಥವಾ ಬಳಕೆಗಳಿಗೆ ಇದು ಸೂಕ್ತ?',
      kn_roman: 'Yava workflow mathu usage ge idu recommend aguthe?'
    }
  },
  USE_CASE: {
    intent: 'USE_CASE',
    required_fields: ['usage.use_cases', 'specifications'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(is (it|this) suitable for|is it good for (ai|ml|gaming|coding|programming|editing|students)|ai\/ml|machine learning)\b/i
    ],
    example_questions: [
      'Is it suitable for AI/ML?',
      'Is it good for gaming?'
    ],
    templates: {
      en: 'Is this suitable for heavy workloads like AI/ML or gaming?',
      kn: 'ಇದು AI/ML ಅಥವಾ ಗೇಮಿಂಗ್‌ನಂತಹ ಕೆಲಸಗಳಿಗೆ ಸೂಕ್ತವೇ?',
      kn_roman: 'Idu AI/ML athava gaming ge suitable ideya?'
    }
  },
  COMPATIBILITY: {
    intent: 'COMPATIBILITY',
    required_fields: ['compatibility.compatible_with'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(compatible with|works with|connect to|supports|external monitor|docking|requirements)\b/i
    ],
    example_questions: ['What devices or peripherals is it compatible with?'],
    templates: {
      en: 'What devices and peripherals is this compatible with?',
      kn: 'ಯಾವ ಸಾಧನಗಳೊಂದಿಗೆ ಇದು ಹೊಂದಿಕೊಳ್ಳುತ್ತದೆ?',
      kn_roman: 'Yava devices jothe idu compatible aguthe?'
    }
  },
  PERFORMANCE: {
    intent: 'PERFORMANCE',
    required_fields: ['specifications.processor', 'specifications.gpu', 'specifications.ram'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(performance|speed|how fast|benchmarks|fps|multitasking|smoothness)\b/i
    ],
    example_questions: ['What is the performance level of this device?'],
    templates: {
      en: 'How does this device perform for intense multitasking?',
      kn: 'ಹೆವಿ ಮಲ್ಟಿಟಾಸ್ಕಿಂಗ್‌ನಲ್ಲಿ ಇದರ ಕಾರ್ಯಕ್ಷಮತೆ (performance) ಹೇಗಿದೆ?',
      kn_roman: 'Heavy multitasking nalli idara performance hegide?'
    }
  },
  QUALITY: {
    intent: 'QUALITY',
    required_fields: ['specifications'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(quality|build quality|materials?|durability|military grade|certification|sturdy|ಗುಣಮಟ್ಟ)\b/i
    ],
    example_questions: ['What is the build quality and durability standard?'],
    templates: {
      en: 'What is the build quality and material standard?',
      kn: 'ಇದರ ಗುಣಮಟ್ಟ ಮತ್ತು ಬಾಳಿಕೆ ಹೇಗಿದೆ?',
      kn_roman: 'Idara build quality mathu durability hegide?'
    }
  },

  // 5. FOOD & INGREDIENTS (Source: PRODUCT_KNOWLEDGE)
  INGREDIENTS: {
    intent: 'INGREDIENTS',
    required_fields: ['specifications.main_ingredients'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(ingredients?|what is (it|this) made (of|from)|materials?|fabric|ಪದಾರ್ಥಗಳು|ingredients yenu)\b/i
    ],
    example_questions: ['What are the ingredients in this food item?'],
    templates: {
      en: 'What are the main ingredients used?',
      kn: 'ಇದರಲ್ಲಿ ಬಳಸಲಾದ ಮುಖ್ಯ ಪದಾರ್ಥಗಳು ಯಾವುವು?',
      kn_roman: 'Idaralli use madiro main ingredients yenu?'
    }
  },
  PREPARATION: {
    intent: 'PREPARATION',
    required_fields: ['specifications.preparation_method'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(how is (it|this) (made|prepared|cooked)|cooking method|preparation|ಮಾಡುವ ವಿಧಾನ|recipe|reheat)\b/i
    ],
    example_questions: ['How is this traditional dish prepared?'],
    templates: {
      en: 'How is this dish prepared and cooked?',
      kn: 'ಈ ಸಾಂಪ್ರದಾಯಿಕ ತಿನಿಸನ್ನು ಹೇಗೆ ತಯಾರಿಸಲಾಗುತ್ತದೆ?',
      kn_roman: 'Ee dish hege prepare madthare?'
    }
  },
  COOKING_METHOD: {
    intent: 'COOKING_METHOD',
    required_fields: ['specifications.preparation_method'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(cooking method|how to cook|reheating instructions)\b/i
    ],
    example_questions: ['What is the cooking and preparation method?'],
    templates: {
      en: 'What is the cooking or heating method?',
      kn: 'ತಯಾರಿಸುವ ಅಥವಾ ಬಿಸಿಮಾಡುವ ವಿಧಾನವೇನು?',
      kn_roman: 'Prepare maduva athava bisi maduva vidhana yenu?'
    }
  },
  STORAGE: {
    intent: 'STORAGE',
    required_fields: ['specifications.storage_instructions'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(how should i store|storage|store it|keep in fridge|refrigeration|cool dry place|ಶೇಖರಣೆ)\b/i
    ],
    example_questions: ['How should this item be stored?'],
    templates: {
      en: 'How should this item be stored for freshness?',
      kn: 'ಇದನ್ನು ಹೇಗೆ ಶೇಖರಿಸಿಡಬೇಕು?',
      kn_roman: 'Idanna hege store madbeku?'
    }
  },
  SERVING_SIZE: {
    intent: 'SERVING_SIZE',
    required_fields: ['specifications.serving_size'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(serving size|portion size|how much is one serving|quantity served|ಸರ್ವಿಂಗ್ ಗಾತ್ರ)\b/i
    ],
    example_questions: ['What is the serving size?'],
    templates: {
      en: 'What is the serving size for this item?',
      kn: 'ಇದರ ಸರ್ವಿಂಗ್ ಗಾತ್ರ ಎಷ್ಟು?',
      kn_roman: 'Idara serving size eshtu?'
    }
  },
  NUTRITION: {
    intent: 'NUTRITION',
    required_fields: ['specifications.protein'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(nutrition|protein|calories|carbs|dietary fibre|fat|macro nutrients|ಪೌಷ್ಟಿಕಾಂಶ)\b/i
    ],
    example_questions: ['What is the protein and calorie count?'],
    templates: {
      en: 'What is the nutritional information (protein/calories)?',
      kn: 'ಇದರ ಪ್ರೋಟೀನ್ ಮತ್ತು ಕ್ಯಾಲೋರಿ ಪ್ರಮಾಣ ಎಷ್ಟು?',
      kn_roman: 'Idara protein mathu calories details yenu?'
    }
  },
  ALLERGENS: {
    intent: 'ALLERGENS',
    required_fields: ['specifications.allergens'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(allergens?|gluten|dairy|nuts|preservatives|safe for allergy|ಅಲರ್ಜಿ)\b/i
    ],
    example_questions: ['Does it contain any allergens or preservatives?'],
    templates: {
      en: 'Does this contain any allergens or added preservatives?',
      kn: 'ಇದರಲ್ಲಿ ಅಲರ್ಜಿ ಉಂಟುಮಾಡುವ ಪದಾರ್ಥಗಳಿವೆಯೇ?',
      kn_roman: 'Idaralli allergens athava preservatives ideya?'
    }
  },

  // 6. MEDICINES & HEALTHCARE (Source: PRODUCT_KNOWLEDGE)
  ACTIVE_INGREDIENTS: {
    intent: 'ACTIVE_INGREDIENTS',
    required_fields: ['specifications.active_ingredients'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(active ingredients?|salt composition|composition|molecule|chemical composition|ಸಕ್ರಿಯ ಪದಾರ್ಥಗಳು)\b/i
    ],
    example_questions: ['What are the active ingredients?'],
    templates: {
      en: 'What are the active pharmaceutical ingredients?',
      kn: 'ಈ ಔಷಧಿಯಲ್ಲಿರುವ ಸಕ್ರಿಯ ಪದಾರ್ಥಗಳು (active ingredients) ಯಾವುವು?',
      kn_roman: 'Ee medicine nalli active ingredients yenu?'
    }
  },
  PURPOSE_BENEFITS: {
    intent: 'PURPOSE_BENEFITS',
    required_fields: ['specifications.purpose'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(what is (this|it) (used for|medicine used for)|purpose|benefits|indications|treats|cure|relief|ಏನು ಉಪಯೋಗ|use yenu)\b/i
    ],
    example_questions: ['What is this medicine used for?'],
    templates: {
      en: 'What is this product used for and what are its benefits?',
      kn: 'ಈ ಔಷಧಿಯ ಮುಖ್ಯ ಉಪಯೋಗಗಳು ಮತ್ತು ಪ್ರಯೋಜನಗಳು ಯಾವುವು?',
      kn_roman: 'Ee medicine use mathu benefits yenu?'
    }
  },
  DOSAGE_FORM: {
    intent: 'DOSAGE_FORM',
    required_fields: ['specifications.dosage_form'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(dosage form|how to use|directions|tablet|capsule|syrup|spray|gel|ಬಳಸುವ ವಿಧಾನ|hege use madbeku)\b/i
    ],
    example_questions: ['How should this be taken or applied?'],
    templates: {
      en: 'How should this product be used or taken?',
      kn: 'ಇದನ್ನು ಹೇಗೆ ಬಳಸಬೇಕು ಮತ್ತು ಡೋಸೇಜ್ ವಿವರಗಳೇನು?',
      kn_roman: 'Idanna hege use madbeku mathu dosage yenu?'
    }
  },
  SAFETY: {
    intent: 'SAFETY',
    required_fields: ['specifications.warnings'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(what warnings are available|warnings|side effects|precautions|contraindications|adverse effects|ಅಡ್ಡಪರಿಣಾಮಗಳು|side effects ideya)\b/i
    ],
    example_questions: ['Are there any warnings or side effects?'],
    templates: {
      en: 'Are there any warnings, precautions, or side effects?',
      kn: 'ಇದಕ್ಕೆ ಯಾವುದಾದರೂ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು ಅಥವಾ ಅಡ್ಡಪರಿಣಾಮಗಳಿವೆಯೇ?',
      kn_roman: 'Idakke warnings athava side effects ideya?'
    }
  },
  PRESCRIPTION: {
    intent: 'PRESCRIPTION',
    required_fields: ['specifications.prescription_status'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(prescription|otc|over the counter|doctor prescription|rx|ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್)\b/i
    ],
    example_questions: ['Is a doctor prescription required?'],
    templates: {
      en: 'Is a doctor prescription required to purchase this?',
      kn: 'ಇದನ್ನು ಖರೀದಿಸಲು ವೈದ್ಯರ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಗತ್ಯವಿದೆಯೇ?',
      kn_roman: 'Idannu buy madoke doctor prescription beka?'
    }
  },
  EXPIRY: {
    intent: 'EXPIRY',
    required_fields: ['specifications.expiry_date'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(expiry|expiration date|shelf life|batch number|best before|ಮುಕ್ತಾಯ ದಿನಾಂಕ|expiry yavaga)\b/i
    ],
    example_questions: ['What is the expiry date and shelf life?'],
    templates: {
      en: 'What is the batch expiry date and storage instruction?',
      kn: 'ಇದರ ಮುಕ್ತಾಯ ದಿನಾಂಕ ಮತ್ತು ಶೇಖರಣಾ ವಿಧಾನವೇನು?',
      kn_roman: 'Idara expiry date mathu storage instructions yenu?'
    }
  },

  // 7. LOGISTICS, POLICIES & STORE OPERATIONS (Source: STORE_DATABASE & VERIFIED_PRODUCT_SOURCE)
  DELIVERY: {
    intent: 'DELIVERY',
    required_fields: ['delivery.delivery_days'],
    source: 'STORE_DATABASE',
    tool: 'getDeliveryInformation',
    patterns: [
      /\b(delivery|shipping|courier|dispatch|how long|when will it arrive|pincode|ಡೆಲಿವರಿ|delivery yavaga|arrive yavaga)\b/i
    ],
    example_questions: [
      'When will it arrive?',
      'How many days for delivery to Bengaluru?'
    ],
    templates: {
      en: 'How many days will delivery take to my address?',
      kn: 'ಡೆಲಿವರಿ ಮಾಡಲು ಎಷ್ಟು ದಿನಗಳು ಬೇಕಾಗುತ್ತವೆ?',
      kn_roman: 'Delivery ge eshtu days aguthe?'
    }
  },
  RETURN: {
    intent: 'RETURN',
    required_fields: ['returns.return_policy'],
    source: 'STORE_DATABASE',
    tool: 'getReturnPolicy',
    patterns: [
      /\b(return|return policy|ರಿಟರ್ನ್|ವಾಪಸ್|return madabahuda)\b/i
    ],
    example_questions: [
      'Can I return it?',
      'What is the return policy?'
    ],
    templates: {
      en: 'What is the return policy?',
      kn: 'ಇದರ ರಿಟರ್ನ್ ನಿಯಮಗಳೇನು?',
      kn_roman: 'Idara return policy yenu?'
    }
  },
  EXCHANGE: {
    intent: 'EXCHANGE',
    required_fields: ['returns.exchange_policy'],
    source: 'STORE_DATABASE',
    tool: 'getReturnPolicy',
    patterns: [
      /\b(exchange|replacement|swap size|change color|ಬದಲಾವಣೆ|exchange madabahuda)\b/i
    ],
    example_questions: ['Can I exchange it for another size?'],
    templates: {
      en: 'What is the exchange and replacement policy?',
      kn: 'ಬೇರೆ ಸೈಜ್‌ಗೆ ಬದಲಾಯಿಸಲು (Exchange) ಅವಕಾಶವಿದೆಯೇ?',
      kn_roman: 'Bere size ge exchange madabahuda?'
    }
  },
  REFUND: {
    intent: 'REFUND',
    required_fields: ['returns.refund_policy'],
    source: 'STORE_DATABASE',
    tool: 'getReturnPolicy',
    patterns: [
      /\b(refund|money back|reimbursement|ಹಣ ವಾಪಸ್|refund agutha)\b/i
    ],
    example_questions: ['How do refunds work?'],
    templates: {
      en: 'How is the refund credited upon return?',
      kn: 'ರಿಟರ್ನ್ ಮಾಡಿದರೆ ಹಣ ಹೇಗೆ ವಾಪಸ್ ಬರುತ್ತದೆ?',
      kn_roman: 'Return madidre refund hege baruthe?'
    }
  },
  WARRANTY: {
    intent: 'WARRANTY',
    required_fields: ['warranty.duration'],
    source: 'VERIFIED_PRODUCT_SOURCE',
    tool: 'getProductDetails',
    patterns: [
      /\b(warranty|guarantee|register warranty|service tag|myasus|ವಾರಂಟಿ|warranty ideya)\b/i
    ],
    example_questions: [
      'What warranty is provided?',
      'How do I register warranty?'
    ],
    templates: {
      en: 'What warranty is included and how is it serviced?',
      kn: 'ಇದಕ್ಕೆ ಎಷ್ಟು ಅವಧಿಯ ವಾರಂಟಿ ಲಭ್ಯವಿದೆ?',
      kn_roman: 'Idakke eshtu duration warranty ide?'
    }
  },

  // 8. ACTIONS, COMPARISONS & RECOMMENDATIONS (Source: PRODUCT_KNOWLEDGE + STORE_DATABASE)
  COMPARISON: {
    intent: 'COMPARISON',
    required_fields: [],
    source: 'PRODUCT_KNOWLEDGE + STORE_DATABASE',
    tool: 'compareProducts',
    patterns: [
      /\b(compare|versus|\bvs\b|difference between|how are these (two|products) different|which has more|which is better)\b/i
    ],
    example_questions: [
      'Compare ASUS TUF and Lenovo IdeaPad.',
      'Which has more RAM?',
      'Which has better storage?'
    ],
    templates: {
      en: 'How does this compare to other products in this category?',
      kn: 'ಇದೇ ವರ್ಗದ ಇತರ ಉತ್ಪನ್ನಗಳಿಗೆ ಹೋಲಿಸಿದರೆ ಇದು ಹೇಗಿದೆ?',
      kn_roman: 'Other products jothe compare madidre idu hegide?'
    }
  },
  RECOMMENDATION: {
    intent: 'RECOMMENDATION',
    required_fields: [],
    source: 'PRODUCT_KNOWLEDGE + STORE_DATABASE',
    tool: 'recommendProducts',
    patterns: [
      /\b(recommend|suggest|i need a|looking for a|under ₹?\d+|budget of|show me products for)\b/i
    ],
    example_questions: [
      'I need a laptop under ₹70,000 for coding and AI.',
      'I need a black T-shirt, XL, under ₹1,000.'
    ],
    templates: {
      en: 'Can you recommend the best option under my budget?',
      kn: 'ನನ್ನ ಬಜೆಟ್‌ಗೆ ತಕ್ಕಂತೆ ಉತ್ತಮ ಉತ್ಪನ್ನವನ್ನು ಸೂಚಿಸಬಹುದೇ?',
      kn_roman: 'Nanna budget ge best product recommend madtheera?'
    }
  },
  ORDER: {
    intent: 'ORDER',
    required_fields: ['pricing.selling_price'],
    source: 'STORE_DATABASE',
    tool: 'createOrder',
    patterns: [
      /\b(buy now|place order|order this|confirm order|want to buy|interested to buy|ಖರೀದಿಸಲು|ಆರ್ಡರ್ ಮಾಡಲು|buy madoke|order madoke)\b/i
    ],
    example_questions: ['I want to buy this product. How do I order?'],
    templates: {
      en: 'I want to buy this. Can I confirm my order via COD?',
      kn: 'ನಾನು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೇನೆ. COD ಮೂಲಕ ಆರ್ಡರ್ ಕನ್ಫರ್ಮ್ ಮಾಡಬಹುದೇ?',
      kn_roman: 'Nanu idanna buy madthini. COD order confirm madoke agutha?'
    }
  },
  ORDER_STATUS: {
    intent: 'ORDER_STATUS',
    required_fields: [],
    source: 'STORE_DATABASE',
    tool: 'getOrderStatus',
    patterns: [
      /\b(where is my order|order status|track my order|tracking number|order id|ನನ್ನ ಆರ್ಡರ್ ಎಲ್ಲಿದೆ|order track)\b/i
    ],
    example_questions: ['Where is my order?'],
    templates: {
      en: 'Where is my order and what is the tracking status?',
      kn: 'ನನ್ನ ಆರ್ಡರ್ ಎಲ್ಲಿದೆ ಮತ್ತು ಟ್ರ್ಯಾಕಿಂಗ್ ಸ್ಟೇಟಸ್ ತಿಳಿಸಿ?',
      kn_roman: 'Nanna order yellide tracking status heli?'
    }
  },
  STORE_LOCATION: {
    intent: 'STORE_LOCATION',
    required_fields: [],
    source: 'STORE_DATABASE',
    tool: 'getStoreLocation',
    patterns: [
      /\b(store location|store address|where is the store|visit store|bengaluru store|ಅಂಗಡಿ ಎಲ್ಲಿ|store yellide)\b/i
    ],
    example_questions: ['Where is your physical store located?'],
    templates: {
      en: 'Where is your store located for walk-in pickup?',
      kn: 'ನಿಮ್ಮ ಅಂಗಡಿಯ ವಿಳಾಸ ಎಲ್ಲಿದೆ?',
      kn_roman: 'Nimma store address yellide?'
    }
  },
  GENERAL_PRODUCT_QUERY: {
    intent: 'GENERAL_PRODUCT_QUERY',
    required_fields: ['identity.name', 'description.short'],
    source: 'PRODUCT_KNOWLEDGE',
    tool: 'getProductDetails',
    patterns: [
      /\b(tell me about|info|information|what is this)\b/i
    ],
    example_questions: ['Tell me about this item.'],
    templates: {
      en: 'Tell me about this product.',
      kn: 'ಈ ಉತ್ಪನ್ನದ ವಿವರ ತಿಳಿಸಿ.',
      kn_roman: 'Ee product details heli.'
    }
  }
};

export class IntentService {
  /**
   * Detect customer intent from message, active product, and conversational context
   */
  static detectIntent(text = '', universalProduct = null, history = []) {
    const raw = (text || '').trim();
    const lower = raw.toLowerCase();

    // 1. Comparison Intent Check
    if (INTENT_CONFIG.COMPARISON.patterns.some(p => p.test(lower))) {
      return {
        intent: 'COMPARISON',
        config: INTENT_CONFIG.COMPARISON,
        source: INTENT_CONFIG.COMPARISON.source,
        tool: INTENT_CONFIG.COMPARISON.tool,
        requiredFields: INTENT_CONFIG.COMPARISON.required_fields,
        isComparison: true,
        hasRequiredData: true
      };
    }

    // 2. Recommendation / Requirement-Based Search Intent Check
    if (INTENT_CONFIG.RECOMMENDATION.patterns.some(p => p.test(lower))) {
      return {
        intent: 'RECOMMENDATION',
        config: INTENT_CONFIG.RECOMMENDATION,
        source: INTENT_CONFIG.RECOMMENDATION.source,
        tool: INTENT_CONFIG.RECOMMENDATION.tool,
        requiredFields: INTENT_CONFIG.RECOMMENDATION.required_fields,
        isRecommendation: true,
        hasRequiredData: true
      };
    }

    // 3. Order Placement Intent Check
    if (INTENT_CONFIG.ORDER.patterns.some(p => p.test(lower))) {
      return {
        intent: 'ORDER',
        config: INTENT_CONFIG.ORDER,
        source: INTENT_CONFIG.ORDER.source,
        tool: INTENT_CONFIG.ORDER.tool,
        requiredFields: INTENT_CONFIG.ORDER.required_fields,
        hasRequiredData: true
      };
    }

    // 4. Check Granular Product Specs First (RAM, GPU, CPU, etc.)
    const specificIntents = [
      'USE_CASE', 'PERFORMANCE', 'QUALITY',
      'RAM', 'GPU', 'PROCESSOR', 'STORAGE', 'DISPLAY', 'BATTERY', 'CAMERA',
      'ACTIVE_INGREDIENTS', 'DOSAGE_FORM', 'PURPOSE_BENEFITS', 'SAFETY', 'PRESCRIPTION', 'EXPIRY',
      'INGREDIENTS', 'PREPARATION', 'COOKING_METHOD', 'SERVING_SIZE', 'NUTRITION', 'ALLERGENS',
      'USAGE', 'COMPATIBILITY', 'WARRANTY', 'FEATURES'
    ];

    for (const key of specificIntents) {
      const cfg = INTENT_CONFIG[key];
      if (cfg && cfg.patterns.some(p => p.test(lower))) {
        const hasData = universalProduct 
          ? cfg.required_fields.every(f => ProductKnowledgeService.hasField(universalProduct, f))
          : true;
        return {
          intent: cfg.intent,
          config: cfg,
          source: cfg.source,
          tool: cfg.tool,
          requiredFields: cfg.required_fields,
          hasRequiredData: hasData
        };
      }
    }

    // 5. Commercial, Stock, Logistics, and Policy Intents
    const broadIntents = [
      'PRICE', 'DISCOUNT', 'MRP', 'PAYMENT',
      'STOCK', 'AVAILABILITY', 'QUANTITY', 'VARIANT', 'SIZE', 'COLOUR',
      'DELIVERY', 'RETURN', 'EXCHANGE', 'REFUND', 'STORAGE', 'ORDER_STATUS', 'STORE_LOCATION',
      'PRODUCT_DETAILS', 'SPECIFICATIONS'
    ];

    for (const key of broadIntents) {
      const cfg = INTENT_CONFIG[key];
      if (cfg && cfg.patterns.some(p => p.test(lower))) {
        const hasData = universalProduct 
          ? cfg.required_fields.every(f => ProductKnowledgeService.hasField(universalProduct, f))
          : true;
        return {
          intent: cfg.intent,
          config: cfg,
          source: cfg.source,
          tool: cfg.tool,
          requiredFields: cfg.required_fields,
          hasRequiredData: hasData
        };
      }
    }

    // 6. Default Fallback Intent
    return {
      intent: 'GENERAL_PRODUCT_QUERY',
      config: INTENT_CONFIG.GENERAL_PRODUCT_QUERY,
      source: INTENT_CONFIG.GENERAL_PRODUCT_QUERY.source,
      tool: INTENT_CONFIG.GENERAL_PRODUCT_QUERY.tool,
      requiredFields: INTENT_CONFIG.GENERAL_PRODUCT_QUERY.required_fields,
      hasRequiredData: true
    };
  }

  /**
   * Parse structured filter criteria from a natural-language requirement query
   * Example: "I need a laptop under ₹70,000 for coding and AI"
   */
  static parseRequirementFilters(text = '') {
    const lower = text.toLowerCase();
    const filters = {
      category: null,
      maxPrice: null,
      minPrice: null,
      colour: null,
      size: null,
      useCases: []
    };

    // Category extraction
    if (/laptop|notebook|computer/i.test(lower)) filters.category = 'laptops';
    else if (/phone|mobile|smartphone/i.test(lower)) filters.category = 'mobile phones';
    else if (/cloth|shirt|t-shirt|tee|pant|chino|trouser|apparel/i.test(lower)) filters.category = 'clothing';
    else if (/shoe|sneaker|boot/i.test(lower)) filters.category = 'shoes';
    else if (/food|snack|dish|meal|diet/i.test(lower)) filters.category = 'Food';
    else if (/medicine|health|tablet|capsule|balm|cream|spray/i.test(lower)) filters.category = 'Medicines & Healthcare Products';

    // Price extraction
    const maxPriceMatch = lower.match(/(under|below|less than|max|budget of)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
    if (maxPriceMatch) {
      filters.maxPrice = parseInt(maxPriceMatch[2].replace(/,/g, ''), 10);
    }
    const minPriceMatch = lower.match(/(above|more than|at least|min)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
    if (minPriceMatch) {
      filters.minPrice = parseInt(minPriceMatch[2].replace(/,/g, ''), 10);
    }

    // Size extraction
    const sizeMatch = lower.match(/\b(xxl|2xl|xl|extra large|large|medium|small|s|m|l|xs|30|32|34|36|38|40|uk\s*\d+)\b/i);
    if (sizeMatch) filters.size = sizeMatch[1].toUpperCase();

    // Colour extraction
    const colourMatch = lower.match(/\b(black|white|blue|green|gray|grey|beige|brown|pink|red|orange|olive)\b/i);
    if (colourMatch) filters.colour = colourMatch[1].toLowerCase();

    // Use cases extraction
    if (/coding|programming|developer|developer machine/i.test(lower)) filters.useCases.push('coding');
    if (/ai|ml|machine learning|deep learning/i.test(lower)) filters.useCases.push('AI/ML');
    if (/gaming|games|fps/i.test(lower)) filters.useCases.push('gaming');
    if (/editing|video|render/i.test(lower)) filters.useCases.push('video editing');
    if (/gym|fitness|protein|workout/i.test(lower)) filters.useCases.push('fitness');

    return filters;
  }

  /**
   * Parse comparison target products and specific attribute from query
   * Example: "Compare ASUS TUF and Lenovo IdeaPad" or "Which has more RAM between ASUS and Lenovo?"
   */
  static parseComparisonQuery(text = '', allProducts = []) {
    const lower = text.toLowerCase();
    let attribute = null;

    if (/ram|memory/i.test(lower)) attribute = 'ram';
    else if (/gpu|graphics/i.test(lower)) attribute = 'gpu';
    else if (/processor|cpu/i.test(lower)) attribute = 'processor';
    else if (/storage|ssd/i.test(lower)) attribute = 'storage';
    else if (/battery|charging/i.test(lower)) attribute = 'battery';
    else if (/display|screen/i.test(lower)) attribute = 'display';
    else if (/price|cost/i.test(lower)) attribute = 'price';
    else if (/camera/i.test(lower)) attribute = 'camera';
    else if (/protein|nutrition/i.test(lower)) attribute = 'protein';
    else if (/ingredient/i.test(lower)) attribute = 'ingredients';

    // Find matched products
    const matched = [];
    for (const p of allProducts) {
      const u = ProductKnowledgeService.toUniversal(p);
      const aliases = (u.ai_knowledge && u.ai_knowledge.aliases) ? u.ai_knowledge.aliases : [p.name.toLowerCase()];
      if (aliases.some(alias => lower.includes(alias))) {
        matched.push(p);
      }
    }

    return {
      products: matched,
      attribute
    };
  }
}
