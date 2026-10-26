import { db } from '../db/database.js';

export class LaptopService {
  /**
   * Supported flagship laptop models mapping
   */
  static SUPPORTED_LAPTOPS = [
    { id: 'PROD-LAP-001', canonical: 'ASUS TUF Gaming', shortName: 'TUF Gaming', brand: 'ASUS' },
    { id: 'PROD-LAP-002', canonical: 'Dell Inspiron 15', shortName: 'Dell Inspiron', brand: 'Dell' },
    { id: 'PROD-LAP-003', canonical: 'Lenovo IdeaPad Slim 3', shortName: 'IdeaPad Slim 3', brand: 'Lenovo' },
    { id: 'PROD-LAP-004', canonical: 'ASUS Vivobook 15', shortName: 'ASUS Vivobook', brand: 'ASUS' },
    { id: 'PROD-LAP-005', canonical: 'Acer Aspire Lite', shortName: 'Acer Aspire', brand: 'Acer' }
  ];

  /**
   * Identify laptop product from text or return null
   */
  static identifyProductFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();

    // 1. ASUS TUF Gaming
    if (/\b(asus tuf gaming|tuf gaming|asus tuf|tuf f15|tuf15|tuf)\b/i.test(lower)) {
      return db.getProductById('PROD-LAP-001');
    }
    // 2. Dell Inspiron 15
    if (/\b(dell inspiron 15|dell inspiron|inspiron 15|inspiron 3530|inspiron|dell)\b/i.test(lower)) {
      return db.getProductById('PROD-LAP-002');
    }
    // 3. Lenovo IdeaPad Slim 3
    if (/\b(lenovo ideapad slim 3|ideapad slim 3|lenovo ideapad|ideapad 3|ideapad slim|lenovo slim 3|slim 3|lenovo)\b/i.test(lower)) {
      return db.getProductById('PROD-LAP-003');
    }
    // 4. ASUS Vivobook 15
    if (/\b(asus vivobook 15|asus vivobook|vivobook 15|vivobook|x1504va|x1504|bq343ws|lap-asus-vivobook15-001)\b/i.test(lower)) {
      return db.getProductById('PROD-LAP-004');
    }
    // 5. Acer Aspire Lite
    if (/\b(acer aspire lite|aspire lite|acer aspire|aspire|acer)\b/i.test(lower)) {
      return db.getProductById('PROD-LAP-005');
    }

    return null;
  }

  /**
   * Identify multiple laptops for comparison (e.g. "ASUS TUF Gaming vs ASUS Vivobook 15")
   */
  static identifyProductsForComparison(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = [];

    if (/\b(asus tuf gaming|tuf gaming|asus tuf|tuf f15|tuf15|tuf)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-LAP-001'));
    }
    if (/\b(dell inspiron 15|dell inspiron|inspiron 15|inspiron|dell)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-LAP-002'));
    }
    if (/\b(lenovo ideapad slim 3|ideapad slim 3|ideapad 3|ideapad slim|lenovo slim 3|slim 3|lenovo)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-LAP-003'));
    }
    if (/\b(asus vivobook 15|asus vivobook|vivobook 15|vivobook|x1504va|x1504|bq343ws|lap-asus-vivobook15-001)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-LAP-004'));
    }
    if (/\b(acer aspire lite|aspire lite|acer aspire|aspire|acer)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-LAP-005'));
    }

    return found.filter(Boolean);
  }

  /**
   * Extract variant attributes (RAM, storage, processor/gpu, colour) from inquiry
   */
  static extractVariantAttributes(text) {
    if (!text) return { ram: null, storage: null, colour: null, config: null };
    const lower = text.toLowerCase();

    // RAM
    let ram = null;
    const ramMatch = lower.match(/\b(8gb|16gb|32gb)\s*(?:ram|memory)?\b/i);
    if (ramMatch) ram = ramMatch[1].toUpperCase();

    // Storage
    let storage = null;
    const storageMatch = lower.match(/\b(512gb|1tb|512|1024)\b/i);
    if (storageMatch) {
      const s = storageMatch[1].toUpperCase();
      storage = s.endsWith('GB') || s.endsWith('TB') ? s : (s === '1024' ? '1TB' : s + 'GB');
    }

    // Config (GPU or Processor Tier)
    let config = null;
    if (/\b(rtx 4060|4060)\b/i.test(lower)) config = 'RTX 4060';
    else if (/\b(rtx 4050|4050)\b/i.test(lower)) config = 'RTX 4050';
    else if (/\b(core i7|i7)\b/i.test(lower)) config = 'Core i7';
    else if (/\b(core i5|i5)\b/i.test(lower)) config = 'Core i5';
    else if (/\b(core i3|i3)\b/i.test(lower)) config = 'Core i3';

    // Colour
    let colour = null;
    const colourPatterns = [
      'mecha gray', 'jaeger gray', 'platinum silver', 'carbon black',
      'arctic grey', 'abyss blue', 'cool silver', 'quiet blue',
      'steel gray', 'titanium silver', 'silver', 'black', 'grey', 'gray', 'blue'
    ];
    for (const c of colourPatterns) {
      if (new RegExp(`\\b${c}\\b`, 'i').test(lower)) {
        colour = c;
        break;
      }
    }

    return { ram, storage, colour, config };
  }

  /**
   * Resolve specific variant stock and price
   */
  static resolveVariantDetails(product, { storage, colour, ram, config }) {
    if (!product || !product.stock || !product.stock.variants) {
      return {
        variantKey: null,
        stockCount: product ? (product.stockCount || 0) : 0,
        inStock: product ? Boolean(product.inStock) : false,
        price: product ? product.salePrice : 0,
        mrp: product ? product.price : 0
      };
    }

    const variants = product.stock.variants;
    let matchedKey = null;
    let stockCount = 0;

    for (const [key, count] of Object.entries(variants)) {
      const lowerKey = key.toLowerCase();
      const matchCol = !colour || lowerKey.includes(colour.toLowerCase());
      const matchSto = !storage || lowerKey.includes(storage.toLowerCase());
      const matchRam = !ram || lowerKey.includes(ram.toLowerCase());
      const matchCfg = !config || lowerKey.includes(config.toLowerCase());

      if (matchCol && matchSto && matchRam && matchCfg) {
        matchedKey = key;
        stockCount = count;
        break;
      }
    }

    if (!matchedKey) {
      const firstEntry = Object.entries(variants)[0];
      matchedKey = firstEntry ? firstEntry[0] : null;
      stockCount = firstEntry ? firstEntry[1] : (product.stockCount || 0);
    }

    let price = product.salePrice;
    let mrp = product.price;

    if (product.variantPrices) {
      for (const [vName, vPrice] of Object.entries(product.variantPrices)) {
        const lowerV = vName.toLowerCase();
        if ((storage && lowerV.includes(storage.toLowerCase())) || (config && lowerV.includes(config.toLowerCase()))) {
          price = vPrice;
          break;
        }
      }
    }

    if (product.variantMrp) {
      for (const [vName, vMrp] of Object.entries(product.variantMrp)) {
        const lowerV = vName.toLowerCase();
        if ((storage && lowerV.includes(storage.toLowerCase())) || (config && lowerV.includes(config.toLowerCase()))) {
          mrp = vMrp;
          break;
        }
      }
    }

    return {
      variantKey: matchedKey,
      stockCount,
      inStock: stockCount > 0,
      price,
      mrp
    };
  }

  /**
   * Detect question category for laptop queries
   */
  static detectQuestionCategory(text, isComparison = false) {
    if (isComparison) return 'comparison';
    const lower = text.toLowerCase();

    // 1. Comparison
    if (/\b(vs|compare|versus|comparison|difference between)\b/i.test(lower)) return 'comparison';

    // 2. Warranty Registration
    if (/(?:register (?:the |my )?warranty|warranty registration|how (?:do|can) i register (?:the |my )?(?:warranty|laptop)|where can i register (?:the |my )?warranty|how do i activate (?:the |my )?warranty|activate warranty|documents (?:needed|required) for warranty|register (?:my )?laptop|registration|ವಾರಂಟಿ ನೋಂದಣಿ|ನೋಂದಾಯಿಸುವುದು ಹೇಗೆ)/i.test(lower)) {
      return 'warrantyRegistration';
    }

    // 3. Warranty Questions
    if (/(?:what warranty|warranty period|warranty support|accidental damage|onsite warranty|international warranty|ವಾರಂಟಿ)/i.test(lower)) {
      return 'warranty';
    }

    // 4. Delivery Questions
    if (/(?:deliver|delivery|shipping|when will (?:i|it|this) (?:get|arrive|reach)|expected delivery|courier|dispatch|pincode|ಡೆಲಿವರಿ)/i.test(lower)) {
      return 'delivery';
    }

    // 5. Order Questions
    if (/(?:i want to buy|buy|purchase|order|cancel|return|exchange|replacement|return policy|exchange policy|ಆರ್ಡರ್|ಖರೀದಿ|ರಿಟರ್ನ್)/i.test(lower) && !/(?:price|how much|cost|mrp)/i.test(lower)) {
      return 'order';
    }

    // 6. Gaming Questions
    if (/(?:good for gaming|can it play games|play gta|play valorant|play cyberpunk|fps|ray tracing|dlss|gaming performance|is it a gaming laptop|ಗೇಮಿಂಗ್)/i.test(lower)) {
      return 'gaming';
    }

    // 7. Student / Professional Usage Questions
    if (/(?:good for (?:students?|college|school|office|coding|programming|cad|video editing|work|business)|usage|who is this for|ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ)/i.test(lower)) {
      return 'usage';
    }

    // 8. Cooling Questions
    if (/(?:cooling|thermal|heats? up|overheat|fans|iceblade|arc flow|heatpipes|temperatures|ಕೂಲಿಂಗ್)/i.test(lower)) {
      return 'cooling';
    }

    // 9. Durability Questions
    if (/(?:durability|military grade|mil-std|build quality|drop test|sturdy|hinge|antimicrobial|ಬಾಳಿಕೆ)/i.test(lower)) {
      return 'durability';
    }

    // 10. Upgradeability Questions
    if (/(?:upgrade|upgradeable|can i upgrade (?:ram|ssd|storage)|expandable|expand ram|extra slot|ಅಪ್‌ಗ್ರೇಡ್)/i.test(lower)) {
      return 'upgradeability';
    }

    // 11. Compatibility Questions
    if (/(?:compatibility|compatible|external monitor|docking|connect to tv|power bank|ಹೊಂದಾಣಿಕೆ)/i.test(lower)) {
      return 'compatibility';
    }

    // 12. GPU / Graphics Questions
    if (/(?:gpu|graphics card|dedicated graphics|rtx|geforce|iris xe|uhd graphics|vram|tgp|ಗ್ರಾಫಿಕ್ಸ್)/i.test(lower)) {
      return 'gpu';
    }

    // 13. Processor Questions
    if (/(?:processor|cpu|chipset|intel|core i5|core i7|core i3|ryzen|cores|threads|clock speed|ಪ್ರೊಸೆಸರ್)/i.test(lower)) {
      return 'processor';
    }

    // 14. RAM Questions
    if (/(?:how much ram|ram size|ram capacity|ram speed|ddr5|ddr4|lpddr5|dual channel|ram)/i.test(lower) && !/(?:camera|battery|screen|display|gpu|processor)/i.test(lower)) {
      return 'ram';
    }

    // 15. SSD / Storage Questions
    if (/(?:ssd|storage|hard drive|nvme|pcie|how much storage|storage type|512gb|1tb|ಸ್ಟೋರೇಜ್)/i.test(lower) && !/(?:camera|battery|screen|display|ram)/i.test(lower)) {
      return 'storage';
    }

    // 16. Display Questions
    if (/(?:display|screen|144hz|120hz|60hz|refresh rate|ips|fhd|nits|brightness|anti-glare|eye care|tuv|ಡಿಸ್ಪ್ಲೇ|ಸ್ಕ್ರೀನ್)/i.test(lower)) {
      return 'display';
    }

    // 17. Battery Questions
    if (/(?:battery|battery life|battery backup|how long does (?:the )?battery last|\b\d*\s*wh\b|ಬ್ಯಾಟರಿ)/i.test(lower) && !/(?:charge|charging|charger)/i.test(lower)) {
      return 'battery';
    }

    // 18. Charging Questions
    if (/(?:charge|charging|charger|adapter|fast charging|expresscharge|rapid charge|\b\d+\s*w\b|watt|type-c charging|ಚಾರ್ಜಿಂಗ್|ಚಾರ್ಜರ್)/i.test(lower)) {
      return 'charging';
    }

    // 19. Port and Connectivity Questions
    if (/(?:ports?|connectivity|thunderbolt|usb-c|usb port|hdmi|card reader|sd card|wifi|wi-fi|bluetooth|ethernet|lan port|ಪೋರ್ಟ್ಸ್)/i.test(lower)) {
      return 'ports';
    }

    // 20. Keyboard & Touchpad Questions
    if (/(?:keyboard|touchpad|trackpad|backlit|rgb keyboard|numpad|numeric keypad|key travel|ಕೀಬೋರ್ಡ್)/i.test(lower)) {
      return 'keyboard';
    }

    // 21. Camera & Audio Questions
    if (/(?:camera|webcam|privacy shutter|audio|speakers|sound|microphone|dolby atmos|waves maxxaudio|ಕ್ಯಾಮೆರಾ|ಆಡಿಯೋ)/i.test(lower)) {
      return 'cameraAudio';
    }

    // 22. Weight and Dimensions
    if (/(?:weight|how heavy|how much does it weigh|dimensions|thickness|size of laptop|ತೂಕ|ಗಾತ್ರ)/i.test(lower)) {
      return 'weight';
    }

    // 23. Operating System Questions
    if (/(?:operating system|which os|what os|\bos\b|windows|windows 11|ms office|office home|ಸಾಫ್ಟ್‌ವೇರ್)/i.test(lower)) {
      return 'os';
    }

    // 24. Colour Questions
    if (/(?:what colours|which colour|colours available|colors available|colour options|shades|mecha gray|platinum silver|arctic grey|cool silver|steel gray|ಬಣ್ಣ)/i.test(lower)) {
      return 'colours';
    }

    // 25. Price Questions
    if (/(?:price|cost|how much|mrp|discount|offer|deal|rate|amount|bele|estu|ಬೆಲೆ|ದರ)/i.test(lower)) {
      return 'price';
    }

    // 26. Stock and Availability
    if (/(?:available|in stock|how many are left|how many left|units left|is it in stock|when will it be restocked|stock|ಸ್ಟಾಕ್|ಲಭ್ಯವಿದೆಯಾ)/i.test(lower)) {
      return 'stock';
    }

    // Basic Product Info (Default)
    return 'basic';
  }


  /**
   * Process a laptop question dynamically across all products and categories
   */
  static processLaptopQuestion({ text, product, currentLang = 'en' }) {
    const lower = text.toLowerCase();
    const isKn = currentLang === 'kn';

    // 1. Check for Comparison Query
    const isComparisonQuery = /\b(vs|compare|versus|comparison|difference between)\b/i.test(lower);
    if (isComparisonQuery) {
      const comparedProducts = LaptopService.identifyProductsForComparison(text);
      if (comparedProducts.length >= 2) {
        return LaptopService.handleComparison({
          products: comparedProducts,
          text,
          currentLang
        });
      }
    }

    // 2. Identify Laptop Product
    let activeProduct = product;
    const identified = LaptopService.identifyProductFromText(text);
    if (identified) {
      activeProduct = identified;
    }

    // 3. Ambiguous Laptop Clarification Check
    const isGenericLaptopQuestion =
      /^(is the laptop available|is it available|how much is the laptop|what is the price of the laptop|tell me about the laptop|is 16gb available|does it have 120hz|is it good for gaming)\b/i.test(lower.trim()) ||
      (!activeProduct || (activeProduct.category !== 'laptops' && activeProduct.category !== 'Laptop'));

    if (!activeProduct || (activeProduct.category !== 'laptops' && activeProduct.category !== 'Laptop')) {
      if (isKn) {
        return {
          reply: "ನೀವು ಯಾವ ಲ್ಯಾಪ್ಟಾಪ್ ಬಗ್ಗೆ ಕೇಳುತ್ತಿದ್ದೀರಿ — ASUS TUF Gaming, Dell Inspiron 15, Lenovo IdeaPad Slim 3, ASUS Vivobook 15, ಅಥವಾ Acer Aspire Lite?",
          toolCalled: 'clarifyLaptopProduct',
          ambiguity: 'product',
          activeProduct: null
        };
      }
      return {
        reply: "Which laptop do you mean — ASUS TUF Gaming, Dell Inspiron 15, Lenovo IdeaPad Slim 3, ASUS Vivobook 15, or Acer Aspire Lite?",
        toolCalled: 'clarifyLaptopProduct',
        ambiguity: 'product',
        activeProduct: null
      };
    }

    // 4. Extract Variant Attributes
    const variantAttrs = LaptopService.extractVariantAttributes(text);
    const resolvedVariant = LaptopService.resolveVariantDetails(activeProduct, variantAttrs);

    // 5. Detect Category
    const category = LaptopService.detectQuestionCategory(text, isComparisonQuery);

    // Dispatch to handler
    switch (category) {
      case 'processor':
        return LaptopService.handleProcessor(activeProduct, currentLang);
      case 'gpu':
        return LaptopService.handleGpu(activeProduct, currentLang);
      case 'ram':
        return LaptopService.handleRam(activeProduct, variantAttrs, currentLang);
      case 'storage':
        return LaptopService.handleStorage(activeProduct, variantAttrs, currentLang);
      case 'display':
        return LaptopService.handleDisplay(activeProduct, currentLang);
      case 'battery':
        return LaptopService.handleBattery(activeProduct, currentLang);
      case 'charging':
        return LaptopService.handleCharging(activeProduct, currentLang);
      case 'ports':
        return LaptopService.handlePorts(activeProduct, currentLang);
      case 'keyboard':
        return LaptopService.handleKeyboard(activeProduct, currentLang);
      case 'cameraAudio':
        return LaptopService.handleCameraAudio(activeProduct, currentLang);
      case 'cooling':
        return LaptopService.handleCooling(activeProduct, currentLang);
      case 'weight':
        return LaptopService.handleWeight(activeProduct, currentLang);
      case 'os':
        return LaptopService.handleOs(activeProduct, currentLang);
      case 'gaming':
        return LaptopService.handleGaming(activeProduct, currentLang);
      case 'usage':
        return LaptopService.handleUsage(activeProduct, currentLang);
      case 'durability':
        return LaptopService.handleDurability(activeProduct, currentLang);
      case 'upgradeability':
        return LaptopService.handleUpgradeability(activeProduct, currentLang);
      case 'compatibility':
        return LaptopService.handleCompatibility(activeProduct, currentLang);
      case 'warranty':
        return LaptopService.handleWarranty(activeProduct, currentLang);
      case 'warrantyRegistration':
        return LaptopService.handleWarrantyRegistration(activeProduct, currentLang);
      case 'price':
        return LaptopService.handlePrice(activeProduct, variantAttrs, resolvedVariant, currentLang);
      case 'colours':
        return LaptopService.handleColours(activeProduct, variantAttrs, resolvedVariant, currentLang);
      case 'stock':
        return LaptopService.handleStock(activeProduct, variantAttrs, resolvedVariant, currentLang);
      case 'delivery':
        return LaptopService.handleDelivery(activeProduct, currentLang);
      case 'order':
        return LaptopService.handleOrder(activeProduct, currentLang);
      case 'comparison':
        return LaptopService.handleComparison({
          products: [activeProduct, db.getProductById('PROD-LAP-002') || activeProduct],
          text,
          currentLang
        });
      default:
        return LaptopService.handleBasicInfo(activeProduct, currentLang);
    }
  }

  // --- DYNAMIC HANDLERS ---

  // Basic Info
  static handleBasicInfo(product, currentLang) {
    const s = product.specs || {};
    if (currentLang === 'kn') {
      const reply = `${product.name} (${product.brand} - Model: ${product.model || product.name}): ${product.description} ಪ್ರಮುಖ ವಿವರಗಳು: ಪ್ರೊಸೆಸರ್: ${s.processor || 'Not officially specified.'}, ಗ್ರಾಫಿಕ್ಸ್: ${s.gpu || s.graphics || 'Not officially specified.'}, RAM: ${s.ram || 'Not officially specified.'}, ಡಿಸ್ಪ್ಲೇ: ${s.display || 'Not officially specified.'}. ನಮ್ಮ ಸ್ಟೋರ್ ಬೆಲೆ ₹${Math.round(product.salePrice).toLocaleString('en-IN')} (MRP ₹${Math.round(product.price).toLocaleString('en-IN')}). ನೀವು ನಿರ್ದಿಷ್ಟ ವಿವರಗಳನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?`;
      return { reply, toolCalled: 'getLaptopBasicInfo', activeProduct: product };
    }
    const reply = `The ${product.name} by ${product.brand} (Model: ${product.model || product.name}) is powered by ${s.processor || 'Not officially specified.'}. Key specifications: Graphics: ${s.gpu || s.graphics || 'Not officially specified.'}, RAM: ${s.ram || 'Not officially specified.'}, Storage: ${s.storage || 'Not officially specified.'}, Display: ${s.display || 'Not officially specified.'}. Current store price is ₹${Math.round(product.salePrice).toLocaleString('en-IN')} (MRP ₹${Math.round(product.price).toLocaleString('en-IN')}, ${product.discountPercent}% off). What specific feature would you like to explore?`;
    return { reply, toolCalled: 'getLaptopBasicInfo', activeProduct: product };
  }

  // Processor
  static handleProcessor(product, currentLang) {
    const s = product.specs || {};
    const proc = s.processor || s.cpu || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಪ್ರೊಸೆಸರ್ ಅಧಿಕೃತ ವಿವರ: ${proc}. (ಅಧಿಕೃತ ತಯಾರಕರ ತಾಂತ್ರಿಕ ವಿವರಗಳನ್ನು ಮಾತ್ರ ಒದಗಿಸಲಾಗಿದೆ).`,
        toolCalled: 'getLaptopProcessor',
        activeProduct: product
      };
    }
    return {
      reply: `Processor specification for ${product.name}: ${proc}. This is sourced directly from the official ${product.brand} manufacturer technical documentation.`,
      toolCalled: 'getLaptopProcessor',
      activeProduct: product
    };
  }

  // GPU
  static handleGpu(product, currentLang) {
    const s = product.specs || {};
    const gpu = s.gpu || s.graphics || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಗ್ರಾಫಿಕ್ಸ್ (GPU) ವಿವರ: ${gpu}.`,
        toolCalled: 'getLaptopGpu',
        activeProduct: product
      };
    }
    return {
      reply: `Graphics (GPU) specification for ${product.name}: ${gpu}. All GPU details and power profiles are verified from official ${product.brand} specifications.`,
      toolCalled: 'getLaptopGpu',
      activeProduct: product
    };
  }

  // RAM
  static handleRam(product, variantAttrs, currentLang) {
    const s = product.specs || {};
    const ram = s.ram || 'Not officially specified.';
    const up = s.upgradeability || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ RAM ವಿವರ: ${ram}. ಅಪ್‌ಗ್ರೇಡ್ ವಿವರ: ${up}.`,
        toolCalled: 'getLaptopRam',
        activeProduct: product
      };
    }
    return {
      reply: `RAM specifications for ${product.name}: ${ram}. Upgradeability: ${up}.`,
      toolCalled: 'getLaptopRam',
      activeProduct: product
    };
  }

  // Storage
  static handleStorage(product, variantAttrs, currentLang) {
    const s = product.specs || {};
    const storage = s.storage || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಸ್ಟೋರೇಜ್ ವಿವರ: ${storage}. ಲಭ್ಯವಿರುವ ಸ್ಟೋರೇಜ್ ಆಯ್ಕೆಗಳು: ${(product.sizes || []).join(', ')}.`,
        toolCalled: 'getLaptopStorage',
        activeProduct: product
      };
    }
    return {
      reply: `Storage specifications for ${product.name}: ${storage}. Available configurations: ${(product.sizes || []).join(', ')}.`,
      toolCalled: 'getLaptopStorage',
      activeProduct: product
    };
  }

  // Display
  static handleDisplay(product, currentLang) {
    const s = product.specs || {};
    const display = s.display || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಡಿಸ್ಪ್ಲೇ ವಿವರ: ${display}.`,
        toolCalled: 'getLaptopDisplay',
        activeProduct: product
      };
    }
    return {
      reply: `Display specifications for ${product.name}: ${display}. Verified from official ${product.brand} documentation.`,
      toolCalled: 'getLaptopDisplay',
      activeProduct: product
    };
  }

  // Battery
  static handleBattery(product, currentLang) {
    const s = product.specs || {};
    const battery = s.battery || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಬ್ಯಾಟರಿ ವಿವರ: ${battery}.`,
        toolCalled: 'getLaptopBattery',
        activeProduct: product
      };
    }
    return {
      reply: `Battery specification for ${product.name}: ${battery}. Actual runtime may vary based on workload, display brightness, and power profiles.`,
      toolCalled: 'getLaptopBattery',
      activeProduct: product
    };
  }

  // Charging
  static handleCharging(product, currentLang) {
    const s = product.specs || {};
    const charging = s.charging || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಚಾರ್ಜಿಂಗ್ ಮತ್ತು ಅಡಾಪ್ಟರ್ ವಿವರ: ${charging}.`,
        toolCalled: 'getLaptopCharging',
        activeProduct: product
      };
    }
    return {
      reply: `Charging specifications for ${product.name}: ${charging}.`,
      toolCalled: 'getLaptopCharging',
      activeProduct: product
    };
  }

  // Ports
  static handlePorts(product, currentLang) {
    const s = product.specs || {};
    const ports = s.ports || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನಲ್ಲಿರುವ ಪೋರ್ಟ್‌ಗಳು ಮತ್ತು ಕನೆಕ್ಟಿವಿಟಿ: ${ports}.`,
        toolCalled: 'getLaptopPorts',
        activeProduct: product
      };
    }
    return {
      reply: `Port and connectivity options for ${product.name}: ${ports}.`,
      toolCalled: 'getLaptopPorts',
      activeProduct: product
    };
  }

  // Keyboard & Touchpad
  static handleKeyboard(product, currentLang) {
    const s = product.specs || {};
    const kb = s.keyboard || 'Not officially specified.';
    const tp = s.touchpad ? ` Touchpad: ${s.touchpad}.` : '';
    const tpKn = s.touchpad ? ` ಟ್ರ್ಯಾಕ್‌ಪ್ಯಾಡ್: ${s.touchpad}.` : '';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಕೀಬೋರ್ಡ್ ವಿವರ: ${kb}.${tpKn}`,
        toolCalled: 'getLaptopKeyboard',
        activeProduct: product
      };
    }
    return {
      reply: `Keyboard and touchpad details for ${product.name}: ${kb}.${tp}`,
      toolCalled: 'getLaptopKeyboard',
      activeProduct: product
    };
  }

  // Camera & Audio
  static handleCameraAudio(product, currentLang) {
    const s = product.specs || {};
    const cam = s.camera || 'Not officially specified.';
    const aud = s.audio || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಕ್ಯಾಮೆರಾ ಮತ್ತು ಆಡಿಯೋ ವಿವರ: ವೆಬ್‌ಕ್ಯಾಮ್: ${cam}. ಆಡಿಯೋ/ಸ್ಪೀಕರ್‌ಗಳು: ${aud}.`,
        toolCalled: 'getLaptopCameraAudio',
        activeProduct: product
      };
    }
    return {
      reply: `Camera and audio specifications for ${product.name}: Webcam: ${cam}. Audio: ${aud}.`,
      toolCalled: 'getLaptopCameraAudio',
      activeProduct: product
    };
  }

  // Cooling
  static handleCooling(product, currentLang) {
    const s = product.specs || {};
    const cooling = s.cooling || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಕೂಲಿಂಗ್ ಮತ್ತು ಥರ್ಮಲ್ ಸಿಸ್ಟಮ್: ${cooling}.`,
        toolCalled: 'getLaptopCooling',
        activeProduct: product
      };
    }
    return {
      reply: `Thermal and cooling architecture for ${product.name}: ${cooling}.`,
      toolCalled: 'getLaptopCooling',
      activeProduct: product
    };
  }

  // Weight and Dimensions
  static handleWeight(product, currentLang) {
    const s = product.specs || {};
    const wt = s.weight || 'Not officially specified.';
    const dim = s.dimensions || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ತೂಕ: ${wt}. ಅಳತೆಗಳು (Dimensions): ${dim}.`,
        toolCalled: 'getLaptopWeight',
        activeProduct: product
      };
    }
    return {
      reply: `Weight and physical dimensions for ${product.name}: Weight: ${wt}. Dimensions: ${dim}.`,
      toolCalled: 'getLaptopWeight',
      activeProduct: product
    };
  }

  // Operating System
  static handleOs(product, currentLang) {
    const s = product.specs || {};
    const os = s.os || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನಲ್ಲಿ ಪ್ರೀ-ಇನ್‌ಸ್ಟಾಲ್ ಆಗಿರುವ ಆಪರೇಟಿಂಗ್ ಸಿಸ್ಟಮ್: ${os}.`,
        toolCalled: 'getLaptopOs',
        activeProduct: product
      };
    }
    return {
      reply: `Operating system details for ${product.name}: ${os}.`,
      toolCalled: 'getLaptopOs',
      activeProduct: product
    };
  }

  // Gaming Performance
  static handleGaming(product, currentLang) {
    const s = product.specs || {};
    const gaming = s.gaming || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಗೇಮಿಂಗ್ ಕಾರ್ಯಕ್ಷಮತೆ: ${gaming}`,
        toolCalled: 'getLaptopGaming',
        activeProduct: product
      };
    }
    return {
      reply: `Gaming performance assessment for ${product.name}: ${gaming}`,
      toolCalled: 'getLaptopGaming',
      activeProduct: product
    };
  }

  // Student / Professional Usage
  static handleUsage(product, currentLang) {
    const s = product.specs || {};
    const usage = s.usage || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಬಳಕೆ ಸಾಮರ್ಥ್ಯ: ${usage}`,
        toolCalled: 'getLaptopUsage',
        activeProduct: product
      };
    }
    return {
      reply: `Target usage and workload suitability for ${product.name}: ${usage}`,
      toolCalled: 'getLaptopUsage',
      activeProduct: product
    };
  }

  // Durability & Build
  static handleDurability(product, currentLang) {
    const s = product.specs || {};
    const dur = s.durability || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಬಾಳಿಕೆ ಮತ್ತು ಗುಣಮಟ್ಟ: ${dur}`,
        toolCalled: 'getLaptopDurability',
        activeProduct: product
      };
    }
    return {
      reply: `Durability standards and build quality for ${product.name}: ${dur}`,
      toolCalled: 'getLaptopDurability',
      activeProduct: product
    };
  }

  // Upgradeability
  static handleUpgradeability(product, currentLang) {
    const s = product.specs || {};
    const up = s.upgradeability || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಅಪ್‌ಗ್ರೇಡ್ ಸಾಮರ್ಥ್ಯ (RAM & SSD): ${up}`,
        toolCalled: 'getLaptopUpgradeability',
        activeProduct: product
      };
    }
    return {
      reply: `Hardware upgradeability for ${product.name}: ${up}`,
      toolCalled: 'getLaptopUpgradeability',
      activeProduct: product
    };
  }

  // Compatibility
  static handleCompatibility(product, currentLang) {
    const s = product.specs || {};
    const comp = s.compatibility || 'Not officially specified.';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಡಿವೈಸ್ ಹೊಂದಾಣಿಕೆ (Compatibility): ${comp}`,
        toolCalled: 'getLaptopCompatibility',
        activeProduct: product
      };
    }
    return {
      reply: `Peripheral and display compatibility for ${product.name}: ${comp}`,
      toolCalled: 'getLaptopCompatibility',
      activeProduct: product
    };
  }

  // Warranty
  static handleWarranty(product, currentLang) {
    const w = product.warranty || 'Not officially specified.';
    const sw = product.storeWarranty ? ` Store Guarantee: ${product.storeWarranty}` : '';
    const swKn = product.storeWarranty ? ` ಸ್ಟೋರ್ ಭರವಸೆ: ${product.storeWarranty}` : '';
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ವಾರಂಟಿ ವಿವರ: ತಯಾರಕರ ವಾರಂಟಿ: ${w}.${swKn}`,
        toolCalled: 'getLaptopWarranty',
        activeProduct: product
      };
    }
    return {
      reply: `Warranty coverage for ${product.name}: Official Manufacturer Warranty: ${w}.${sw}`,
      toolCalled: 'getLaptopWarranty',
      activeProduct: product
    };
  }

  // Warranty Registration
  static handleWarrantyRegistration(product, currentLang) {
    const s = product.specs || {};
    const reg = s.warrantyRegistration;
    if (!reg) {
      const fallback = currentLang === 'kn' 
        ? "ಈ ಉತ್ಪನ್ನಕ್ಕೆ ವಾರಂಟಿ ನೋಂದಣಿ ಮಾಹಿತಿಯನ್ನು ಅಧಿಕೃತವಾಗಿ ನಿರ್ದಿಷ್ಟಪಡಿಸಲಾಗಿಲ್ಲ." 
        : "Warranty registration information is not officially specified for this product.";
      return {
        reply: fallback,
        toolCalled: 'getLaptopWarrantyRegistration',
        activeProduct: product
      };
    }
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನ ಅಧಿಕೃತ ವಾರಂಟಿ ನೋಂದಣಿ ವಿಧಾನ: ${reg}`,
        toolCalled: 'getLaptopWarrantyRegistration',
        activeProduct: product
      };
    }
    return {
      reply: `Official warranty registration procedure for ${product.name}: ${reg}`,
      toolCalled: 'getLaptopWarrantyRegistration',
      activeProduct: product
    };
  }

  // Price
  static handlePrice(product, variantAttrs, resolvedVariant, currentLang) {
    const price = resolvedVariant.price || product.salePrice;
    const mrp = resolvedVariant.mrp || product.price;
    const formattedPrice = `₹${Math.round(price).toLocaleString('en-IN')}`;
    const formattedMrp = `₹${Math.round(mrp).toLocaleString('en-IN')}`;
    const discount = Math.round(((mrp - price) / mrp) * 100);

    const variantName = resolvedVariant.variantKey ? ` (${resolvedVariant.variantKey})` : '';

    if (currentLang === 'kn') {
      const reply = `${product.name}${variantName} ನ ಪ್ರಸ್ತುತ ಸ್ಟೋರ್ ಬೆಲೆ ${formattedPrice} (MRP ${formattedMrp} ಮೇಲೆ ${discount}% ರಿಯಾಯಿತಿ ಇದೆ). ನೀವು ಈ ಲ್ಯಾಪ್ಟಾಪ್ ಅನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ?`;
      return {
        reply,
        toolCalled: 'getLaptopPrice',
        price,
        mrp,
        activeProduct: product
      };
    }

    const reply = `The current store price for ${product.name}${variantName} is ${formattedPrice} (MRP ${formattedMrp}, with a ${discount}% discount). Would you like to proceed with ordering this laptop?`;
    return {
      reply,
      toolCalled: 'getLaptopPrice',
      price,
      mrp,
      activeProduct: product
    };
  }

  // Colours
  static handleColours(product, variantAttrs, resolvedVariant, currentLang) {
    const colours = product.colours || [];
    const colList = colours.join(', ');

    if (variantAttrs.colour) {
      const isAvailable = resolvedVariant.inStock;
      if (currentLang === 'kn') {
        const reply = isAvailable
          ? `ಹೌದು, ${product.name} ${variantAttrs.colour} ಬಣ್ಣದಲ್ಲಿ ಲಭ್ಯವಿದೆ! (${resolvedVariant.stockCount} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯ). ಬೆಲೆ: ₹${Math.round(resolvedVariant.price).toLocaleString('en-IN')}.`
          : `ಕ್ಷಮಿಸಿ, ${product.name} ${variantAttrs.colour} ಬಣ್ಣದಲ್ಲಿ ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್ ಮುಗಿದಿದೆ. ಲಭ್ಯವಿರುವ ಇತರ ಬಣ್ಣಗಳು: ${colList}.`;
        return { reply, toolCalled: 'getLaptopColours', activeProduct: product };
      }
      const reply = isAvailable
        ? `Yes, the ${product.name} is available in ${variantAttrs.colour}! (${resolvedVariant.stockCount} units in live store inventory). Current price: ₹${Math.round(resolvedVariant.price).toLocaleString('en-IN')}.`
        : `Currently, the ${product.name} in ${variantAttrs.colour} is out of stock. Other official colours available: ${colList}.`;
      return { reply, toolCalled: 'getLaptopColours', activeProduct: product };
    }

    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ನಲ್ಲಿ ಅಧಿಕೃತವಾಗಿ ಲಭ್ಯವಿರುವ ಬಣ್ಣಗಳು: ${colList}. ನೀವು ಯಾವ ಬಣ್ಣವನ್ನು ಇಷ್ಟಪಡುತ್ತೀರಿ?`,
        toolCalled: 'getLaptopColours',
        activeProduct: product
      };
    }
    return {
      reply: `Official colours available for ${product.name}: ${colList}. Which colour do you prefer?`,
      toolCalled: 'getLaptopColours',
      activeProduct: product
    };
  }

  // Stock
  static handleStock(product, variantAttrs, resolvedVariant, currentLang) {
    const isAvailable = resolvedVariant.inStock;
    const stockCount = resolvedVariant.stockCount;
    const variantDesc = resolvedVariant.variantKey ? ` (${resolvedVariant.variantKey})` : '';

    if (currentLang === 'kn') {
      const reply = isAvailable
        ? `ಹೌದು, ${product.name}${variantDesc} ನಮ್ಮ ಲೈವ್ ಸ್ಟೋರ್ ಸ್ಟಾಕ್‌ನಲ್ಲಿದೆ (${stockCount} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯ). ನೀವು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`
        : `ಕ್ಷಮಿಸಿ, ${product.name}${variantDesc} ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್‌ನಲ್ಲಿಲ್ಲ.`;
      return { reply, toolCalled: 'getLaptopStock', activeProduct: product };
    }

    const reply = isAvailable
      ? `Yes, the ${product.name}${variantDesc} is in live store inventory with ${stockCount} units available for dispatch. Would you like to place an order?`
      : `Sorry, the ${product.name}${variantDesc} is currently out of stock. We can notify you as soon as fresh units arrive.`;
    return { reply, toolCalled: 'getLaptopStock', activeProduct: product };
  }

  // Delivery
  static handleDelivery(product, currentLang) {
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ಡೆಲಿವರಿ ವಿವರ: ಭಾರತದ ಎಲ್ಲಾ ಪಿನ್‌ಕೋಡ್‌ಗಳಿಗೆ 2-3 ವ್ಯವಹಾರ ದಿನಗಳಲ್ಲಿ ಸುರಕ್ಷಿತ ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಕೊರಿಯರ್ ಮೂಲಕ ಉಚಿತ ಡೆಲಿವರಿ (₹0). ನಿಮ್ಮ ಪಿನ್‌ಕೋಡ್ ತಿಳಿಸಿದರೆ ನಿಖರವಾದ ಸಮಯವನ್ನು ನಾನು ದೃಢೀಕರಿಸಬಲ್ಲೆ.`,
        toolCalled: 'getLaptopDelivery',
        activeProduct: product
      };
    }
    return {
      reply: `Delivery details for ${product.name}: We provide doorstep express courier delivery across all Indian postal PIN codes in ${product.deliveryDays || '2-3 days'} with tamper-evident security packaging. Delivery charge: Free (₹0). Please share your PIN code to confirm the exact delivery timeline.`,
      toolCalled: 'getLaptopDelivery',
      activeProduct: product
    };
  }

  // Order Info
  static handleOrder(product, currentLang) {
    if (currentLang === 'kn') {
      return {
        reply: `${product.name} ಆರ್ಡರ್ ಮತ್ತು ಪಾಲಿಸಿ ಮಾಹಿತಿ: ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ (COD), UPI ಮತ್ತು ಕಾರ್ಡ್‌ಗಳ ಮೂಲಕ ಆರ್ಡರ್ ಮಾಡಬಹುದು. ಯಾವುದೇ ಹಾರ್ಡ್‌ವೇರ್ ದೋಷವಿದ್ದಲ್ಲಿ 7 ದಿನಗಳ ರಿಪ್ಲೇಸ್‌ಮೆಂಟ್ ಗ್ಯಾರಂಟಿ ಇದೆ. ನೀವು ಈಗ ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ?`,
        toolCalled: 'getLaptopOrderInfo',
        activeProduct: product
      };
    }
    return {
      reply: `Order and policy information for ${product.name}: You can order via Cash on Delivery (COD), UPI, Net Banking, or Credit/Debit Cards with No-Cost EMI options. Backed by our 7-day technical replacement guarantee and trade-in exchange bonuses. Would you like me to confirm your order?`,
      toolCalled: 'getLaptopOrderInfo',
      activeProduct: product
    };
  }

  // Comparison
  static handleComparison({ products, text, currentLang }) {
    const isKn = currentLang === 'kn';
    const [p1, p2] = products;
    const s1 = p1.specs || {};
    const s2 = p2.specs || {};

    if (isKn) {
      const reply = `ಹೋಲಿಕೆ: ${p1.name} vs ${p2.name}:\n\n` +
        `• ಪ್ರೊಸೆಸರ್: ${p1.name} (${s1.processor || 'N/A'}) vs ${p2.name} (${s2.processor || 'N/A'})\n` +
        `• ಗ್ರಾಫಿಕ್ಸ್ (GPU): ${p1.name} (${s1.gpu || s1.graphics || 'N/A'}) vs ${p2.name} (${s2.gpu || s2.graphics || 'N/A'})\n` +
        `• RAM & ಸ್ಟೋರೇಜ್: ${p1.name} (${s1.ram || 'N/A'} / ${s1.storage || 'N/A'}) vs ${p2.name} (${s2.ram || 'N/A'} / ${s2.storage || 'N/A'})\n` +
        `• ಡಿಸ್ಪ್ಲೇ: ${p1.name} (${s1.display || 'N/A'}) vs ${p2.name} (${s2.display || 'N/A'})\n` +
        `• ಬ್ಯಾಟರಿ & ಚಾರ್ಜಿಂಗ್: ${p1.name} (${s1.battery || 'N/A'}) vs ${p2.name} (${s2.battery || 'N/A'})\n` +
        `• ಬಳಕೆ ಉದ್ದೇಶ: ${p1.name} (${s1.usage || 'N/A'}) vs ${p2.name} (${s2.usage || 'N/A'})\n` +
        `• ಸ್ಟೋರ್ ಬೆಲೆ: ${p1.name} (₹${Math.round(p1.salePrice).toLocaleString('en-IN')}) vs ${p2.name} (₹${Math.round(p2.salePrice).toLocaleString('en-IN')}).\n\n` +
        `ನಿಮಗೆ ಇವುಗಳಲ್ಲಿ ಯಾವ ಲ್ಯಾಪ್ಟಾಪ್ ಬಗ್ಗೆ ಹೆಚ್ಚಿನ ವಿವರಗಳು ಬೇಕು?`;
      return {
        reply,
        toolCalled: 'compareLaptopProducts',
        comparedProducts: [p1.id, p2.id],
        activeProduct: p1
      };
    }

    const reply = `Comparison: ${p1.name} vs ${p2.name}:\n\n` +
      `• Processor: ${p1.name} (${s1.processor || 'Not officially specified.'}) vs ${p2.name} (${s2.processor || 'Not officially specified.'})\n` +
      `• Graphics: ${p1.name} (${s1.gpu || s1.graphics || 'Not officially specified.'}) vs ${p2.name} (${s2.gpu || s2.graphics || 'Not officially specified.'})\n` +
      `• RAM & Storage: ${p1.name} (${s1.ram || 'N/A'} / ${s1.storage || 'N/A'}) vs ${p2.name} (${s2.ram || 'N/A'} / ${s2.storage || 'N/A'})\n` +
      `• Display: ${p1.name} (${s1.display || 'N/A'}) vs ${p2.name} (${s2.display || 'N/A'})\n` +
      `• Battery & Charging: ${p1.name} (${s1.battery || 'N/A'}, ${s1.charging || 'N/A'}) vs ${p2.name} (${s2.battery || 'N/A'}, ${s2.charging || 'N/A'})\n` +
      `• Target Usage: ${p1.name} (${s1.usage || 'N/A'}) vs ${p2.name} (${s2.usage || 'N/A'})\n` +
      `• Store Pricing: ${p1.name} (₹${Math.round(p1.salePrice).toLocaleString('en-IN')}, MRP ₹${Math.round(p1.price).toLocaleString('en-IN')}) vs ${p2.name} (₹${Math.round(p2.salePrice).toLocaleString('en-IN')}, MRP ₹${Math.round(p2.price).toLocaleString('en-IN')}).\n\n` +
      `Which of these two models better fits your computing needs?`;

    return {
      reply,
      toolCalled: 'compareLaptopProducts',
      comparedProducts: [p1.id, p2.id],
      activeProduct: p1
    };
  }
}
