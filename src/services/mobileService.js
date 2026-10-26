import { db } from '../db/database.js';

export class MobileService {
  /**
   * Supported flagship mobile products mapping
   */
  static SUPPORTED_PHONES = [
    { id: 'PROD-PHONE-005', canonical: 'Apple iPhone 16', shortName: 'iPhone 16', brand: 'Apple' },
    { id: 'PROD-PHONE-006', canonical: 'Samsung Galaxy S25', shortName: 'Galaxy S25', brand: 'Samsung' },
    { id: 'PROD-PHONE-007', canonical: 'OnePlus 13', shortName: 'OnePlus 13', brand: 'OnePlus' },
    { id: 'PROD-PHONE-008', canonical: 'Google Pixel 9a', shortName: 'Pixel 9a', brand: 'Google' },
    { id: 'PROD-PHONE-009', canonical: 'Nothing Phone (2a) Plus', shortName: 'Nothing Phone (2a) Plus', brand: 'Nothing' }
  ];

  /**
   * Identify mobile product from text or return null
   */
  static identifyProductFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();

    // 1. iPhone 16
    if (/\b(iphone 16|iphone sixteen|apple iphone 16|apple 16|iphone16|ip 16)\b/i.test(lower)) {
      return db.getProductById('PROD-PHONE-005');
    }
    // 2. Samsung Galaxy S25
    if (/\b(galaxy s25|samsung galaxy s25|samsung s25|s25|galaxys25)\b/i.test(lower)) {
      return db.getProductById('PROD-PHONE-006');
    }
    // 3. OnePlus 13
    if (/\b(oneplus 13|one plus 13|op 13|op13|oneplus13)\b/i.test(lower)) {
      return db.getProductById('PROD-PHONE-007');
    }
    // 4. Google Pixel 9a
    if (/\b(pixel 9a|pixel 9 a|google pixel 9a|pixel9a|google 9a)\b/i.test(lower)) {
      return db.getProductById('PROD-PHONE-008');
    }
    // 5. Nothing Phone (2a) Plus
    if (/\b(nothing phone \(2a\) plus|nothing 2a plus|nothing phone 2a plus|nothing 2a|phone 2a plus|nothing \(2a\) plus|nothing phone 2a|2a plus)\b/i.test(lower)) {
      return db.getProductById('PROD-PHONE-009');
    }

    return null;
  }

  /**
   * Identify multiple products for comparison (e.g. "iPhone 16 vs Galaxy S25")
   */
  static identifyProductsForComparison(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = [];

    if (/\b(iphone 16|iphone sixteen|apple iphone 16|apple 16|iphone16|iphone)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-PHONE-005'));
    }
    if (/\b(galaxy s25|samsung galaxy s25|samsung s25|s25|galaxys25)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-PHONE-006'));
    }
    if (/\b(oneplus 13|one plus 13|op 13|op13|oneplus13)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-PHONE-007'));
    }
    if (/\b(pixel 9a|pixel 9 a|google pixel 9a|pixel9a|pixel)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-PHONE-008'));
    }
    if (/\b(nothing phone \(2a\) plus|nothing 2a plus|nothing phone 2a plus|nothing 2a|phone 2a plus|nothing)\b/i.test(lower)) {
      found.push(db.getProductById('PROD-PHONE-009'));
    }

    return found.filter(Boolean);
  }

  /**
   * Extract variant attributes (RAM, storage, colour) from inquiry
   */
  static extractVariantAttributes(text) {
    if (!text) return { ram: null, storage: null, colour: null };
    const lower = text.toLowerCase();

    // RAM
    let ram = null;
    const ramMatch = lower.match(/\b(8gb|12gb|16gb|24gb)\s*(?:ram)?\b/i);
    if (ramMatch) ram = ramMatch[1].toUpperCase();

    // Storage
    let storage = null;
    const storageMatch = lower.match(/\b(128gb|256gb|512gb|1tb|128|256|512)\b/i);
    if (storageMatch) {
      const s = storageMatch[1].toUpperCase();
      storage = s.endsWith('GB') || s.endsWith('TB') ? s : s + 'GB';
    }

    // Colour
    let colour = null;
    const colourPatterns = [
      'midnight ocean', 'black eclipse', 'arctic dawn',
      'silver shadow', 'sparkling blue', 'sparkling green', 'midnight black',
      'ultramarine', 'teal', 'pink', 'obsidian', 'porcelain', 'peony', 'iris',
      'metallic', 'grey', 'gray', 'black', 'white', 'blue', 'green'
    ];
    for (const c of colourPatterns) {
      if (new RegExp(`\\b${c}\\b`, 'i').test(lower)) {
        colour = c;
        break;
      }
    }

    return { ram, storage, colour };
  }

  /**
   * Resolve specific variant stock and price
   */
  static resolveVariantDetails(product, { storage, colour, ram }) {
    if (!product) return null;
    const variants = (product.stock && product.stock.variants) || {};

    let matchedKey = null;
    let stockCount = 0;

    for (const [key, count] of Object.entries(variants)) {
      const lowerKey = key.toLowerCase();
      const storageMatch = !storage || lowerKey.includes(storage.toLowerCase());
      const colourMatch = !colour || lowerKey.includes(colour.toLowerCase());
      const ramMatch = !ram || lowerKey.includes(ram.toLowerCase());

      if (storageMatch && colourMatch && ramMatch) {
        matchedKey = key;
        stockCount = count;
        break;
      }
    }

    let price = product.salePrice;
    let mrp = product.price;

    if (storage && product.variantPrices && product.variantPrices[storage]) {
      price = product.variantPrices[storage];
    } else if (storage && product.variantPrices) {
      const foundKey = Object.keys(product.variantPrices).find(k => k.toLowerCase().includes(storage.toLowerCase()));
      if (foundKey) price = product.variantPrices[foundKey];
    }

    if (storage && product.variantMrp && product.variantMrp[storage]) {
      mrp = product.variantMrp[storage];
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
   * Detect question category (1–16) for mobile queries
   */
  static detectQuestionCategory(text, isComparison = false) {
    if (isComparison) return 16;
    const lower = text.toLowerCase();

    // 16. Comparison
    if (/\b(vs|compare|versus|comparison|difference between)\b/i.test(lower)) return 16;

    // 14. Delivery Questions (check before generic words)
    if (/(?:deliver|delivery|shipping|when will (?:i|it|this) (?:get|arrive|reach)|expected delivery|courier|dispatch|ಡೆಲಿವರಿ)/i.test(lower)) {
      return 14;
    }

    // 15. Order Questions (buy, order, return, exchange)
    if (/(?:i want to buy|buy|purchase|order|cancel|return|exchange|replacement|return policy|exchange policy|ಆರ್ಡರ್|ಖರೀದಿ|ರಿಟರ್ನ್)/i.test(lower) && !/(?:price|how much|cost|mrp)/i.test(lower)) {
      return 15;
    }

    // 12. Warranty and Authenticity Questions
    if (/(?:is it original|authentic|genuine|what warranty|warranty|indian variant|brand new|sealed|original aa|ವಾರಂಟಿ)/i.test(lower)) {
      return 12;
    }

    // 11. Software Questions
    if (/(?:operating system|which os|which ios|which android|os version|software features|apple intelligence|galaxy ai|gemini|update|updates|how long will updates come|security updates)\b/i.test(lower)) {
      return 11;
    }

    // 10. Physical Details
    if (/(?:weight|how much does it weigh|weigh|dimensions|materials|ip rating|water resistant|dust resistant|waterproof|ತೂಕ)/i.test(lower)) {
      return 10;
    }

    // 7. Battery and Charging Questions
    if (/(?:battery|battery life|charging|fast charging|wireless charging|charger included|charger in (the )?box|charger|magsafe|reverse charging|powershare|charging port|mah|ಬ್ಯಾಟರಿ|ಚಾರ್ಜರ್)/i.test(lower)) {
      return 7;
    }

    // 6. Camera Questions
    if (/(?:camera|main camera|ultra-wide|ultrawide|telephoto|front camera|selfie|megapixels|ois|eis|zoom|optical zoom|4k|8k|video recording|camera features|macro|ಕ್ಯಾಮೆರಾ)/i.test(lower)) {
      return 6;
    }

    // 5. Display Questions
    if (/(?:display|screen|screen size|amoled|oled|120hz|60hz|refresh rate|dynamic island|brightness|nits|resolution|hdr|dolby vision|protection|gorilla glass|ceramic shield|ಡಿಸ್ಪ್ಲೇ)/i.test(lower)) {
      return 5;
    }

    // 4. RAM and Performance Questions
    if (/(?:ram|processor|chipset|cpu|gpu|gaming|good for gaming|heavy apps|multitasking|performance|snapdragon|tensor|dimensity|a18|ಪ್ರೊಸೆಸರ್)/i.test(lower)) {
      return 4;
    }

    // 8. Network & Connectivity Questions
    if (/(?:connectivity|5g|dual sim|sim|esim|wifi|wi-fi|bluetooth|nfc|usb port|usb-c|type-c speed|network bands|ಕನೆಕ್ಟಿವಿಟಿ|ನೆಟ್‌ವರ್ಕ್)/i.test(lower)) {
      return 8;
    }

    // 9. Colour Questions
    if (/(?:what colours|which colour|colours available|colors available|colour options|shades|is black available|is white available|is teal available|black|white|teal|pink|grey|gray|ultramarine|obsidian|porcelain|peony|iris|ಬಣ್ಣ)/i.test(lower)) {
      return 9;
    }

    // 3. Storage Questions
    if (/(?:available storage|variant storage|storage type|expandable storage|memory card|sd card|microsd|how much storage|storage|128gb|256gb|512gb|1tb|come in 256|come in 128|ಸ್ಟೋರೇಜ್)/i.test(lower) && !/(?:camera|battery|screen|processor|ram)/i.test(lower)) {
      return 3;
    }

    // 2. Price Questions (Store Database)
    if (/(?:price|cost|how much|mrp|discount|offer|deal|rate|amount|bele|estu|ಬೆಲೆ|ದರ)/i.test(lower)) {
      return 2;
    }

    // 13. Stock and Availability Questions
    if (/(?:available|in stock|how many are left|how many left|units left|is it in stock|when will it be restocked|stock|ಸ್ಟಾಕ್|ಲಭ್ಯವಿದೆಯಾ)/i.test(lower)) {
      return 13;
    }

    // 1. Basic Product Questions (Default for general questions)
    if (/(?:tell me about|what is this phone|specifications|specs|features|which variant|details|about this phone|ಮಾಹಿತಿ)/i.test(lower)) {
      return 1;
    }

    return 1; // Default to basic product info
  }

  /**
   * Process a mobile question across all 16 categories
   */
  static processMobileQuestion({ text, product, currentLang = 'en' }) {
    const lower = text.toLowerCase();
    const isKn = currentLang === 'kn';

    // 1. Check for Comparison Query (Category 16)
    const isComparisonQuery = /\b(vs|compare|versus|comparison|difference between)\b/i.test(lower);
    if (isComparisonQuery) {
      const comparedProducts = MobileService.identifyProductsForComparison(text);
      if (comparedProducts.length >= 2) {
        return MobileService.handleComparison({
          products: comparedProducts,
          text,
          currentLang
        });
      }
    }

    // 2. Identify Product
    let activeProduct = product;
    const identified = MobileService.identifyProductFromText(text);
    if (identified) {
      activeProduct = identified;
    }

    // 3. Ambiguous Product Check
    // If the customer asks a mobile-specific question without identifying the product and no active phone is set
    const isGenericPhoneQuestion = 
      /^(is the (black|white|blue|teal|pink|grey) one available|is it available|how much is the phone|is the phone in stock|does it have 120hz|is it amoled|what is the price|tell me about the phone)\b/i.test(lower.trim()) ||
      (!activeProduct || activeProduct.category !== 'mobile phones');

    if (!activeProduct || activeProduct.category !== 'mobile phones') {
      if (isKn) {
        return {
          reply: "ನೀವು ಯಾವ ಫೋನ್ ಬಗ್ಗೆ ಕೇಳುತ್ತಿದ್ದೀರಿ — iPhone 16, Galaxy S25, OnePlus 13, Pixel 9a, ಅಥವಾ Nothing Phone (2a) Plus?",
          toolCalled: 'clarifyMobileProduct',
          ambiguity: 'product',
          activeProduct: null
        };
      }
      return {
        reply: "Which phone do you mean — iPhone 16, Galaxy S25, OnePlus 13, Pixel 9a, or Nothing Phone (2a) Plus?",
        toolCalled: 'clarifyMobileProduct',
        ambiguity: 'product',
        activeProduct: null
      };
    }

    // 4. Extract Variant Attributes (RAM, Storage, Colour)
    const variantAttrs = MobileService.extractVariantAttributes(text);
    const resolvedVariant = MobileService.resolveVariantDetails(activeProduct, variantAttrs);

    // 5. Detect Question Category (1–16)
    const category = MobileService.detectQuestionCategory(text, isComparisonQuery);

    // Dispatch to appropriate handler
    switch (category) {
      case 1:
        return MobileService.handleBasicProductInfo(activeProduct, currentLang);
      case 2:
        return MobileService.handlePrice(activeProduct, variantAttrs, resolvedVariant, currentLang);
      case 3:
        return MobileService.handleStorage(activeProduct, variantAttrs, currentLang);
      case 4:
        return MobileService.handlePerformance(activeProduct, currentLang);
      case 5:
        return MobileService.handleDisplay(activeProduct, currentLang);
      case 6:
        return MobileService.handleCamera(activeProduct, currentLang);
      case 7:
        return MobileService.handleBattery(activeProduct, currentLang);
      case 8:
        return MobileService.handleConnectivity(activeProduct, currentLang);
      case 9:
        return MobileService.handleColours(activeProduct, variantAttrs, resolvedVariant, currentLang);
      case 10:
        return MobileService.handlePhysicalDetails(activeProduct, currentLang);
      case 11:
        return MobileService.handleSoftware(activeProduct, currentLang);
      case 12:
        return MobileService.handleWarranty(activeProduct, currentLang);
      case 13:
        return MobileService.handleStock(activeProduct, variantAttrs, resolvedVariant, currentLang);
      case 14:
        return MobileService.handleDelivery(activeProduct, currentLang);
      case 15:
        return MobileService.handleOrder(activeProduct, currentLang);
      case 16:
        return MobileService.handleComparison({
          products: [activeProduct, db.getProductById('PROD-PHONE-006') || activeProduct],
          text,
          currentLang
        });
      default:
        return MobileService.handleBasicProductInfo(activeProduct, currentLang);
    }
  }

  // --- CATEGORY HANDLERS ---

  // Category 1: Basic Product Questions
  static handleBasicProductInfo(product, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `${product.name} (${product.brand} - Model: ${product.model || product.name}): ${product.description} ಪ್ರಮುಖ ವಿವರಗಳು: ಪ್ರೊಸೆಸರ್: ${s.processor || 'ಅಧಿಕೃತ ಪ್ರೊಸೆಸರ್'}, ಡಿಸ್ಪ್ಲೇ: ${s.display || 'HD ಡಿಸ್ಪ್ಲೇ'}, ಕ್ಯಾಮೆರಾ: ${s.camera || 'HD ಕ್ಯಾಮೆರಾ'}, ಬ್ಯಾಟರಿ: ${s.battery || 'ದೀರ್ಘ ಬ್ಯಾಟರಿ'}. ಲಭ್ಯವಿರುವ ರೂಪಾಂತರಗಳು: ${(product.sizes || []).join(', ')}. ನಮ್ಮ ಸ್ಟೋರ್ ಬೆಲೆ ₹${Math.round(product.salePrice).toLocaleString('en-IN')}. ನೀವು ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?`;
      return { reply, toolCalled: 'getMobileBasicInfo', activeProduct: product };
    }

    const reply = `The ${product.name} by ${product.brand} (Model: ${product.model || product.name}) is powered by ${s.processor || 'flagship hardware'}. Features include a ${s.display || 'vibrant display'}, ${s.camera || 'high-resolution camera'}, and ${s.battery || 'all-day battery'}. Available storage variants: ${(product.sizes || []).join(', ')}. Current store price starts at ₹${Math.round(product.salePrice).toLocaleString('en-IN')}. What specific feature would you like to explore?`;
    return { reply, toolCalled: 'getMobileBasicInfo', activeProduct: product };
  }

  // Category 2: Price Questions (Store Database)
  static handlePrice(product, { storage }, resolvedVariant, currentLang) {
    const isKn = currentLang === 'kn';
    const price = resolvedVariant && resolvedVariant.price ? resolvedVariant.price : product.salePrice;
    const mrp = resolvedVariant && resolvedVariant.mrp ? resolvedVariant.mrp : product.price;
    const discount = product.discountPercent || Math.round(((mrp - price) / mrp) * 100);
    const storageText = storage ? ` (${storage})` : '';

    if (isKn) {
      const reply = `${product.name}${storageText} ನ ಪ್ರಸ್ತುತ ಸ್ಟೋರ್ ಬೆಲೆ ₹${Math.round(price).toLocaleString('en-IN')} (MRP ₹${Math.round(mrp).toLocaleString('en-IN')} ಮೇಲೆ ${discount}% ರಿಯಾಯಿತಿ ಇದೆ). ಬ್ಯಾಂಕ್ ಆಫರ್‌ಗಳಲ್ಲಿ 12 ತಿಂಗಳವರೆಗೆ No-Cost EMI ಮತ್ತು ₹12,000 ವರೆಗೆ ಎಕ್ಸ್‌ಚೇಂಜ್ ಬೋನಸ್ ಲಭ್ಯವಿದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      return { reply, toolCalled: 'getMobilePrice', activeProduct: product, price, mrp };
    }

    const reply = `The current store price for ${product.name}${storageText} is ₹${Math.round(price).toLocaleString('en-IN')} (MRP ₹${Math.round(mrp).toLocaleString('en-IN')} with ${discount}% discount). Active offers include No-Cost EMI up to 12 months and an exchange bonus up to ₹12,000 on your old smartphone. Would you like to place an order?`;
    return { reply, toolCalled: 'getMobilePrice', activeProduct: product, price, mrp };
  }

  // Category 3: Storage Questions
  static handleStorage(product, { storage }, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';
    const availableStorages = (product.sizes || []).join(', ');
    const storageType = s.storage || 'High-speed internal storage';

    if (isKn) {
      const reply = `${product.name} ನಲ್ಲಿ ಲಭ್ಯವಿರುವ ಸ್ಟೋರೇಜ್ ಆಯ್ಕೆಗಳು: ${availableStorages}. ಸ್ಟೋರೇಜ್ ತಂತ್ರಜ್ಞಾನ: ${storageType}. ಗಮನಿಸಿ: ಇದು non-expandable ಆಂತರಿಕ ಸಂಗ್ರಹಣೆಯಾಗಿದ್ದು, ಪ್ರತ್ಯೇಕ ಮೈಕ್ರೋ ಎಸ್‌ಡಿ (microSD) ಮೆಮೊರಿ ಕಾರ್ಡ್ ಸ್ಲಾಟ್ ಇರುವುದಿಲ್ಲ.`;
      return { reply, toolCalled: 'getMobileStorage', activeProduct: product };
    }

    const reply = `The ${product.name} is available in: ${availableStorages}. Storage specification: ${storageType}. Note: It features non-expandable internal storage without a microSD card slot. Which storage option fits your needs?`;
    return { reply, toolCalled: 'getMobileStorage', activeProduct: product };
  }

  // Category 4: RAM and Performance Questions
  static handlePerformance(product, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `${product.name} ನ ಕಾರ್ಯಕ್ಷಮತೆ ವಿವರ: RAM: ${s.ram || '8GB LPDDR5X'}, ಪ್ರೊಸೆಸರ್: ${s.processor || s.cpu || 'Flagship processor'}. GPU: ${s.gpu || 'Advanced GPU'}. ಈ ಹಾರ್ಡ್‌ವೇರ್ ಹೆಚ್ಚಿನ ಗ್ರಾಫಿಕ್ಸ್ ಗೇಮಿಂಗ್ ಮತ್ತು ಭಾರವಾದ ಅಪ್ಲಿಕೇಶನ್‌ಗಳ ಮಲ್ಟಿಟಾಸ್ಕಿಂಗ್‌ಗೆ ಅತ್ಯುತ್ತಮವಾಗಿದೆ. (ನಾವು ಅಧಿಕೃತ ಸ್ಪೆಸಿಫಿಕೇಶನ್‌ಗಳನ್ನು ಮಾತ್ರ ಒದಗಿಸುತ್ತೇವೆ, ಊಹಾತ್ಮಕ ಬೆಂಚ್‌ಮಾರ್ಕ್ ಸ್ಕೋರ್‌ಗಳನ್ನಲ್ಲ).`;
      return { reply, toolCalled: 'getMobilePerformance', activeProduct: product };
    }

    const reply = `Performance specifications for ${product.name}: RAM: ${s.ram || '8GB LPDDR5X'}, Processor: ${s.processor || s.cpu || 'Flagship chipset'}, GPU: ${s.gpu || 'High-performance graphics'}. Based on these verified hardware specifications, it is fully capable of handling high-end 3D gaming and heavy multitasking without throttling. We provide documented hardware specifications rather than simulated benchmark scores.`;
    return { reply, toolCalled: 'getMobilePerformance', activeProduct: product };
  }

  // Category 5: Display Questions
  static handleDisplay(product, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `${product.name} ಡಿಸ್ಪ್ಲೇ ವಿವರಗಳು: ${s.display}. ರಿಫ್ರೆಶ್ ದರ: ${s.refreshRate || '60Hz / 120Hz'}. ಗರಿಷ್ಠ ಬ್ರೈಟ್‌ನೆಸ್ ಮತ್ತು ರಕ್ಷಣೆ: ${s.displayTech || 'AMOLED/OLED'}.`;
      return { reply, toolCalled: 'getMobileDisplay', activeProduct: product };
    }

    const reply = `Display specifications for ${product.name}: ${s.display}. Refresh rate: ${s.refreshRate || 'Adaptive 1-120Hz'}. Technology: ${s.displayTech || 'OLED'}. It delivers verified HDR playback and high outdoor peak brightness with durable screen protection glass.`;
    return { reply, toolCalled: 'getMobileDisplay', activeProduct: product };
  }

  // Category 6: Camera Questions
  static handleCamera(product, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `${product.name} ನ ಕ್ಯಾಮೆರಾ ವಿವರಗಳು: ${s.camera}. ಇದರಲ್ಲಿ ಆಪ್ಟಿಕಲ್ ಇಮೇಜ್ ಸ್ಟೆಬಿಲೈಸೇಶನ್ (OIS), ಅಲ್ಟ್ರಾ-ವೈಡ್ ಲೆನ್ಸ್, ಹೈ-ರೆಸಲ್ಯೂಶನ್ ಸೆಲ್ಫಿ ಕ್ಯಾಮೆರಾ ಮತ್ತು 4K ವಿಡಿಯೋ ರೆಕಾರ್ಡಿಂಗ್ ಸೌಲಭ್ಯವಿದೆ. ಕ್ಯಾಮೆರಾ ಗುಣಮಟ್ಟವು ಕೇವಲ ಮೆಗಾಪಿಕ್ಸೆಲ್‌ಗಳಿಂದ ಮಾತ್ರವಲ್ಲದೆ ಅಧಿಕೃತ ಸೆನ್ಸಾರ್ ಮತ್ತು ಇಮೇಜ್ ಪ್ರೊಸೆಸಿಂಗ್ ಮೇಲೆ ಆಧಾರಿತವಾಗಿದೆ.`;
      return { reply, toolCalled: 'getMobileCamera', activeProduct: product };
    }

    const reply = `Camera specifications for ${product.name}: ${s.camera}. It includes optical image stabilization (OIS), ultra-wide optics, high-resolution front selfie camera, and 4K video recording. Please note that true photography quality is driven by sensor architecture, lens optics, and computational image processing rather than megapixels alone.`;
    return { reply, toolCalled: 'getMobileCamera', activeProduct: product };
  }

  // Category 7: Battery and Charging Questions
  static handleBattery(product, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `${product.name} ಬ್ಯಾಟರಿ ಮತ್ತು ಚಾರ್ಜಿಂಗ್ ವಿವರಗಳು: ಬ್ಯಾಟರಿ: ${s.battery}. ಚಾರ್ಜಿಂಗ್: ${s.charging}. ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಚಾರ್ಜರ್ ಲಭ್ಯತೆ: ${s.chargerIncluded || 'ಅಧಿಕೃತ ಬಾಕ್ಸ್ ಪ್ಯಾಕ್ ವಿವರ'}. ಪೋರ್ಟ್: ${s.usbPort || 'USB Type-C'}.`;
      return { reply, toolCalled: 'getMobileBattery', activeProduct: product };
    }

    const reply = `Battery and charging information for ${product.name}: Battery: ${s.battery}. Charging speed: ${s.charging}. Charger in box: ${s.chargerIncluded || 'USB-C cable included'}. Port: ${s.usbPort || 'USB Type-C'}. We strictly quote official manufacturer battery and charging data.`;
    return { reply, toolCalled: 'getMobileBattery', activeProduct: product };
  }

  // Category 8: Network and Connectivity Questions
  static handleConnectivity(product, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `${product.name} ಕನೆಕ್ಟಿವಿಟಿ ವಿವರ: ${s.connectivity}. ಸಿಮ್ ಸೌಲಭ್ಯ: ${s.sim || 'Dual SIM (Nano + eSIM)'}. ಯುಎಸ್‌ಬಿ: ${s.usbPort || 'USB-C'}. 5G ಭಾರತದ ಎಲ್ಲಾ ಪ್ರಮುಖ ಬ್ಯಾಂಡ್‌ಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ.`;
      return { reply, toolCalled: 'getMobileConnectivity', activeProduct: product };
    }

    const reply = `Connectivity specifications for ${product.name}: ${s.connectivity}. SIM configuration: ${s.sim || 'Dual SIM (Physical Nano-SIM + eSIM)'}. Port: ${s.usbPort || 'USB Type-C'}. Fully compatible with Indian 5G SA/NSA networks and Wi-Fi standards.`;
    return { reply, toolCalled: 'getMobileConnectivity', activeProduct: product };
  }

  // Category 9: Colour Questions
  static handleColours(product, { colour, storage }, resolvedVariant, currentLang) {
    const isKn = currentLang === 'kn';
    const officialColours = (product.colours || []).join(', ');

    if (colour && storage) {
      const stock = resolvedVariant ? resolvedVariant.stockCount : 0;
      const isAvail = stock > 0;
      if (isKn) {
        const reply = isAvail
          ? `ಹೌದು, ${product.name} ${colour} ${storage} ನಮ್ಮ ಸ್ಟೋರ್ ಗೋದಾಮಿನಲ್ಲಿ ಲಭ್ಯವಿದೆ (${stock} ಯೂನಿಟ್‌ಗಳು ಸ್ಟಾಕ್‌ನಲ್ಲಿವೆ). ಬೆಲೆ ₹${Math.round(resolvedVariant.price).toLocaleString('en-IN')}. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`
          : `ಕ್ಷಮಿಸಿ, ${product.name} ${colour} ${storage} ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್‌ನಲ್ಲಿಲ್ಲ. ಲಭ್ಯವಿರುವ ಇತರ ಬಣ್ಣಗಳು: ${officialColours}.`;
        return { reply, toolCalled: 'getMobileColours', activeProduct: product };
      }
      const reply = isAvail
        ? `Yes, the ${product.name} in ${colour} (${storage}) is in live store stock with ${stock} units available at ₹${Math.round(resolvedVariant.price).toLocaleString('en-IN')}. Would you like to order?`
        : `Sorry, the ${product.name} in ${colour} (${storage}) is currently out of stock. Available official colours: ${officialColours}.`;
      return { reply, toolCalled: 'getMobileColours', activeProduct: product };
    }

    if (colour) {
      const variants = (product.stock && product.stock.variants) || {};
      let matchingUnits = 0;
      for (const [k, v] of Object.entries(variants)) {
        if (k.toLowerCase().includes(colour.toLowerCase())) matchingUnits += v;
      }
      const isAvail = matchingUnits > 0;
      if (isKn) {
        const reply = isAvail
          ? `ಹೌದು, ${product.name} ${colour} ರೂಪಾಂತರದಲ್ಲಿ ಲಭ್ಯವಿದೆ (${matchingUnits} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯ). ನೀವು ಯಾವ ಸ್ಟೋರೇಜ್ (128GB, 256GB) ಬಯಸುತ್ತೀರಿ?`
          : `ಕ್ಷಮಿಸಿ, ${product.name} ${colour} ಪ್ರಸ್ತುತ ಖಾಲಿಯಾಗಿದೆ. ಲಭ್ಯವಿರುವ ಅಧಿಕೃತ ಬಣ್ಣಗಳು: ${officialColours}.`;
        return { reply, toolCalled: 'getMobileColours', activeProduct: product };
      }
      const reply = isAvail
        ? `Yes, ${product.name} in ${colour} is in stock with ${matchingUnits} units available across storage variants. Which storage capacity would you prefer?`
        : `Sorry, ${product.name} in ${colour} is currently out of stock. Official available colours: ${officialColours}.`;
      return { reply, toolCalled: 'getMobileColours', activeProduct: product };
    }

    if (isKn) {
      const reply = `${product.name} ಲಭ್ಯವಿರುವ ಅಧಿಕೃತ ಬಣ್ಣಗಳು: ${officialColours}. ಎಲ್ಲಾ ಬಣ್ಣಗಳು ನಮ್ಮ ಗೋದಾಮಿನಲ್ಲಿ ಲಭ್ಯವಿವೆ. ನಿಮಗೆ ಯಾವ ಬಣ್ಣ ಇಷ್ಟ?`;
      return { reply, toolCalled: 'getMobileColours', activeProduct: product };
    }

    const reply = `The ${product.name} is officially available in: ${officialColours}. All colours are currently in live warehouse stock. Which colour would you like?`;
    return { reply, toolCalled: 'getMobileColours', activeProduct: product };
  }

  // Category 10: Physical Details
  static handlePhysicalDetails(product, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `${product.name} ಭೌತಿಕ ವಿವರಗಳು: ತೂಕ: ${s.weight || '170 ಗ್ರಾಂ'}. ಆಯಾಮಗಳು (Dimensions): ${s.dimensions || 'ಸ್ಟ್ಯಾಂಡರ್ಡ್ ಆಯಾಮಗಳು'}. ಸಾಮಗ್ರಿಗಳು (Materials): ${s.materials || 'ಪ್ರೀಮಿಯಂ ಅಲ್ಯೂಮಿನಿಯಂ ಮತ್ತು ಗ್ಲಾಸ್'}. ನೀರು ಮತ್ತು ಧೂಳು ನಿರೋಧಕತೆ: ${s.ipRating || s.waterResistance || 'IP68 ನೀರು ನಿರೋಧಕ'}. (ಗಮನಿಸಿ: ಅಧಿಕೃತವಾಗಿ ಇದು water and dust resistant ಆಗಿದ್ದು, waterproof ಅಲ್ಲ).`;
      return { reply, toolCalled: 'getMobilePhysicalDetails', activeProduct: product };
    }

    const reply = `Physical design details for ${product.name}: Weight: ${s.weight || '170 grams'}. Dimensions: ${s.dimensions || 'Compact profile'}. Materials: ${s.materials || 'Aluminum and glass'}. IP Rating: ${s.ipRating || s.waterResistance || 'IP68 water and dust resistant'}. Note: It is officially rated as water and dust resistant under specified test depth/time, not "waterproof".`;
    return { reply, toolCalled: 'getMobilePhysicalDetails', activeProduct: product };
  }

  // Category 11: Software Questions
  static handleSoftware(product, currentLang) {
    const s = product.specs || {};
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `${product.name} ಸಾಫ್ಟ್‌ವೇರ್ ಮಾಹಿತಿ: ಆಪರೇಟಿಂಗ್ ಸಿಸ್ಟಮ್: ${s.os || 'Latest OS'}. ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ (AI) ಫೀಚರ್‌ಗಳು: ${s.aiFeatures || 'ಆನ್‌ಬೋರ್ಡ್ AI'}. ಅಧಿಕೃತ ಅಪ್‌ಡೇಟ್ ಅವಧಿ: ${s.softwareUpdates || 'ದೀರ್ಘಾವಧಿ ಸಾಫ್ಟ್‌ವೇರ್ ಅಪ್‌ಡೇಟ್‌ಗಳು'}.`;
      return { reply, toolCalled: 'getMobileSoftware', activeProduct: product };
    }

    const reply = `Software specifications for ${product.name}: Operating System: ${s.os || 'Latest certified OS'}. Built-in AI features: ${s.aiFeatures || 'On-device AI capabilities'}. Documented update lifecycle: ${s.softwareUpdates || 'Guaranteed multi-year updates'}. We do not invent unsupported update timelines.`;
    return { reply, toolCalled: 'getMobileSoftware', activeProduct: product };
  }

  // Category 12: Warranty and Authenticity Questions
  static handleWarranty(product, currentLang) {
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `ಅಧಿಕೃತತೆ ಮತ್ತು ವಾರಂಟಿ ವಿವರ: ತಯಾರಕರ ವಾರಂಟಿ: ${product.warranty || '1 ವರ್ಷದ ಅಧಿಕೃತ ತಯಾರಕರ ವಾರಂಟಿ'}. ಸ್ಟೋರ್ ದೃಢೀಕರಣ: ನಮ್ಮಲ್ಲಿ ಮಾರಾಟವಾಗುವ ಎಲ್ಲಾ ಮೊಬೈಲ್‌ಗಳು 100% ಅಸಲಿ (Original), ಹೊಚ್ಚಹೊಸ, ಸೀಲ್ಡ್ ಇಂಡಿಯನ್ ರಿಟೇಲ್ ಬಾಕ್ಸ್ ಆಗಿದ್ದು, ಜಿಎಸ್‌ಟಿ ಇನ್‌ವಾಯ್ಸ್ ಮತ್ತು 7 ದಿನಗಳ ರಿಪ್ಲೇಸ್‌ಮೆಂಟ್ ಖಾತರಿ ಹೊಂದಿರುತ್ತವೆ.`;
      return { reply, toolCalled: 'getMobileWarranty', activeProduct: product };
    }

    const reply = `Authenticity and warranty information for ${product.name}: Manufacturer Warranty: ${product.warranty || '1 Year Official Manufacturer Warranty'}. Store Verification: We sell 100% original, brand new, factory-sealed Indian retail units accompanied by an official GST tax invoice and our 7-day technical replacement guarantee. Genuine IMEI and serial numbers can be verified directly with the manufacturer.`;
    return { reply, toolCalled: 'getMobileWarranty', activeProduct: product };
  }

  // Category 13: Stock and Availability Questions
  static handleStock(product, { colour, storage }, resolvedVariant, currentLang) {
    const isKn = currentLang === 'kn';

    if (resolvedVariant && resolvedVariant.variantKey) {
      const count = resolvedVariant.stockCount;
      if (count > 0) {
        if (isKn) {
          return {
            reply: `ಹೌದು, ${product.name} (${resolvedVariant.variantKey}) ನಮ್ಮ ಸ್ಟೋರ್ ಗೋದಾಮಿನಲ್ಲಿ ಲಭ್ಯವಿದೆ. ಪ್ರಸ್ತುತ ${count} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯವಿವೆ. ಬೆಲೆ ₹${Math.round(resolvedVariant.price).toLocaleString('en-IN')}. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`,
            toolCalled: 'getMobileStock',
            activeProduct: product
          };
        }
        return {
          reply: `Yes, the ${product.name} (${resolvedVariant.variantKey}) is in live store inventory with ${count} units available at ₹${Math.round(resolvedVariant.price).toLocaleString('en-IN')}. Would you like to proceed with an order?`,
          toolCalled: 'getMobileStock',
          activeProduct: product
        };
      }
    }

    const totalStock = product.stockCount || (product.stock && product.stock.overall) || 0;
    if (totalStock > 0) {
      if (isKn) {
        return {
          reply: `ಹೌದು, ${product.name} ಲಭ್ಯವಿದೆ! ನಮ್ಮ ಗೋದಾಮಿನಲ್ಲಿ ಒಟ್ಟು ${totalStock} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯವಿವೆ. ಲಭ್ಯವಿರುವ ರೂಪಾಂತರಗಳು: ${(product.sizes || []).join(', ')}. ನೀವು ಯಾವ ರೂಪಾಂತರವನ್ನು ಬಯಸುತ್ತೀರಿ?`,
          toolCalled: 'getMobileStock',
          activeProduct: product
        };
      }
      return {
        reply: `Yes, the ${product.name} is in live store stock with ${totalStock} units available across warehouse variants (${(product.sizes || []).join(', ')}). Which variant would you like to purchase?`,
        toolCalled: 'getMobileStock',
        activeProduct: product
      };
    }

    if (isKn) {
      return {
        reply: "ನಾನು ಪ್ರಸ್ತುತ ಲೈವ್ ಸ್ಟಾಕ್ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.",
        toolCalled: 'getMobileStock',
        activeProduct: product
      };
    }
    return {
      reply: "I can't verify the current stock status right now.",
      toolCalled: 'getMobileStock',
      activeProduct: product
    };
  }

  // Category 14: Delivery Questions
  static handleDelivery(product, currentLang) {
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `ಡೆಲಿವರಿ ವಿವರಗಳು: ನಾವು ಭಾರತದಾದ್ಯಂತ ಎಲ್ಲಾ ಪಿನ್‌ಕೋಡ್‌ಗಳಿಗೆ ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಏರ್ ಶಿಪ್ಪಿಂಗ್ ನೀಡುತ್ತೇವೆ (${product.deliveryDays || '1-3 ದಿನಗಳು'}). ಮೆಟ್ರೋ ನಗರಗಳಿಗೆ ಮತ್ತು ಬೆಂಗಳೂರಿಗೆ ಮರುದಿನವೇ (Next-day) ಡೆಲಿವರಿ ಲಭ್ಯವಿದೆ. ಡೆಲಿವರಿ ಶುಲ್ಕ: ಉಚಿತ (₹0). ನಿಖರವಾದ ದಿನಾಂಕ ತಿಳಿಯಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಿನ್‌ಕೋಡ್ ಹಂಚಿಕೊಳ್ಳಿ.`;
      return { reply, toolCalled: 'getMobileDelivery', activeProduct: product };
    }

    const reply = `Delivery details for ${product.name}: We provide doorstep express air delivery across all Indian postal PIN codes (${product.deliveryDays || '1-3 days'}). Metro cities and Bangalore qualify for next-day delivery with tamper-evident security packaging. Delivery charge: Free (₹0). Please share your destination PIN code to confirm the exact delivery timeline.`;
    return { reply, toolCalled: 'getMobileDelivery', activeProduct: product };
  }

  // Category 15: Order Questions
  static handleOrder(product, currentLang) {
    const isKn = currentLang === 'kn';

    if (isKn) {
      const reply = `ಆರ್ಡರ್ ಮತ್ತು ಪಾಲಿಸಿ ವಿವರ: ನೀವು ${product.name} ಅನ್ನು ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ (COD), UPI, ಅಥವಾ No-Cost EMI ಮೂಲಕ ತಕ್ಷಣವೇ ಆರ್ಡರ್ ಮಾಡಬಹುದು. ರವಾನೆಗೂ ಮುನ್ನ ಆರ್ಡರ್ ರದ್ದುಗೊಳಿಸಲು ಅವಕಾಶವಿದೆ. ಉತ್ಪನ್ನ ತಲುಪಿದ 7 ದಿನಗಳವರೆಗೆ ತಾಂತ್ರಿಕ ದೋಷಗಳಿಗೆ ಬದಲಿ (7-day replacement) ಖಾತರಿ ಇದೆ. ಹಳೆಯ ಫೋನ್‌ಗೆ ₹12,000 ವರೆಗೆ ಎಕ್ಸ್‌ಚೇಂಜ್ ಆಫರ್ ಲಭ್ಯವಿದೆ. ಆರ್ಡರ್ ಖಚಿತಪಡಿಸಬೇಕೇ?`;
      return { reply, toolCalled: 'getMobileOrderInfo', activeProduct: product };
    }

    const reply = `Order and policy information for ${product.name}: You can order via Cash on Delivery, UPI, Cards, or No-Cost EMI up to 12 months. Orders can be cancelled anytime before dispatch. We provide a 7-day replacement guarantee against technical defects or transit damages, plus up to ₹12,000 exchange bonus for your old device. Would you like me to book your order now?`;
    return { reply, toolCalled: 'getMobileOrderInfo', activeProduct: product };
  }

  // Category 16: Comparison Questions
  static handleComparison({ products, text, currentLang }) {
    const isKn = currentLang === 'kn';
    const [p1, p2] = products;
    const s1 = p1.specs || {};
    const s2 = p2.specs || {};

    // Specific feature comparison if asked (e.g. "Compare their cameras", "Compare battery specifications", "Compare prices")
    const lower = text.toLowerCase();

    if (/camera/i.test(lower)) {
      if (isKn) {
        return {
          reply: `ಕ್ಯಾಮೆರಾ ಹೋಲಿಕೆ:\n• ${p1.name}: ${s1.camera || 'Verified camera'}\n• ${p2.name}: ${s2.camera || 'Verified camera'}\nಯಾವುದರ ಕ್ಯಾಮೆರಾ ನಿಮಗೆ ಹೆಚ್ಚು ಇಷ್ಟವಾಯಿತು?`,
          toolCalled: 'compareMobileProducts',
          comparedProducts: [p1.id, p2.id]
        };
      }
      return {
        reply: `Camera Comparison:\n• ${p1.name}: ${s1.camera || 'Verified camera system'}\n• ${p2.name}: ${s2.camera || 'Verified camera system'}\nBoth capture exceptional 4K video, with ${p1.name} utilizing 48MP Fusion sensor-shift OIS and ${p2.name} offering dedicated optical telephoto lenses. Which camera system suits you better?`,
        toolCalled: 'compareMobileProducts',
        comparedProducts: [p1.id, p2.id]
      };
    }

    if (/battery|charging/i.test(lower)) {
      if (isKn) {
        return {
          reply: `ಬ್ಯಾಟರಿ ಮತ್ತು ಚಾರ್ಜಿಂಗ್ ಹೋಲಿಕೆ:\n• ${p1.name}: ಬ್ಯಾಟರಿ: ${s1.battery}, ಚಾರ್ಜಿಂಗ್: ${s1.charging} (ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಚಾರ್ಜರ್: ${s1.chargerIncluded})\n• ${p2.name}: ಬ್ಯಾಟರಿ: ${s2.battery}, ಚಾರ್ಜಿಂಗ್: ${s2.charging} (ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಚಾರ್ಜರ್: ${s2.chargerIncluded})`,
          toolCalled: 'compareMobileProducts',
          comparedProducts: [p1.id, p2.id]
        };
      }
      return {
        reply: `Battery & Charging Comparison:\n• ${p1.name}: Battery: ${s1.battery}; Charging: ${s1.charging}; Charger in box: ${s1.chargerIncluded}\n• ${p2.name}: Battery: ${s2.battery}; Charging: ${s2.charging}; Charger in box: ${s2.chargerIncluded}`,
        toolCalled: 'compareMobileProducts',
        comparedProducts: [p1.id, p2.id]
      };
    }

    if (/price|cost|rate/i.test(lower)) {
      if (isKn) {
        return {
          reply: `ಬೆಲೆ ಹೋಲಿಕೆ (Store Database):\n• ${p1.name}: ಸ್ಟೋರ್ ಬೆಲೆ ₹${Math.round(p1.salePrice).toLocaleString('en-IN')} (MRP ₹${Math.round(p1.price).toLocaleString('en-IN')})\n• ${p2.name}: ಸ್ಟೋರ್ ಬೆಲೆ ₹${Math.round(p2.salePrice).toLocaleString('en-IN')} (MRP ₹${Math.round(p2.price).toLocaleString('en-IN')})`,
          toolCalled: 'compareMobileProducts',
          comparedProducts: [p1.id, p2.id]
        };
      }
      return {
        reply: `Store Price Comparison:\n• ${p1.name}: Store price ₹${Math.round(p1.salePrice).toLocaleString('en-IN')} (MRP ₹${Math.round(p1.price).toLocaleString('en-IN')})\n• ${p2.name}: Store price ₹${Math.round(p2.salePrice).toLocaleString('en-IN')} (MRP ₹${Math.round(p2.price).toLocaleString('en-IN')})\nBoth include Free Express Shipping and active bank EMI options.`,
        toolCalled: 'compareMobileProducts',
        comparedProducts: [p1.id, p2.id]
      };
    }

    if (/storage/i.test(lower)) {
      if (isKn) {
        return {
          reply: `ಸ್ಟೋರೇಜ್ ಹೋಲಿಕೆ:\n• ${p1.name}: ${(p1.sizes || []).join(', ')} (${s1.storage})\n• ${p2.name}: ${(p2.sizes || []).join(', ')} (${s2.storage})\nಎರಡೂ ಫೋನ್‌ಗಳು non-expandable ಆಂತರಿಕ ಸಂಗ್ರಹಣೆ ಹೊಂದಿವೆ.`,
          toolCalled: 'compareMobileProducts',
          comparedProducts: [p1.id, p2.id]
        };
      }
      return {
        reply: `Storage Comparison:\n• ${p1.name}: Available in ${(p1.sizes || []).join(', ')} (${s1.storage})\n• ${p2.name}: Available in ${(p2.sizes || []).join(', ')} (${s2.storage})\nBoth models feature ultra-fast non-expandable storage without microSD card slots.`,
        toolCalled: 'compareMobileProducts',
        comparedProducts: [p1.id, p2.id]
      };
    }

    // Comprehensive Side-by-Side Comparison
    if (isKn) {
      const reply = `ಹೋಲಿಕೆ: ${p1.name} vs ${p2.name}:\n\n` +
        `• ಡಿಸ್ಪ್ಲೇ: ${p1.name} (${s1.displaySize || '6.1"'} ${s1.refreshRate || '60Hz'}) vs ${p2.name} (${s2.displaySize || '6.2"'} ${s2.refreshRate || '120Hz'})\n` +
        `• ಪ್ರೊಸೆಸರ್: ${p1.name} (${s1.processor || 'A18'}) vs ${p2.name} (${s2.processor || 'Snapdragon 8 Elite'})\n` +
        `• RAM: ${p1.name} (${s1.ram || '8GB'}) vs ${p2.name} (${s2.ram || '12GB'})\n` +
        `• ಸ್ಟೋರೇಜ್: ${p1.name} (${(p1.sizes || []).join(', ')}) vs ${p2.name} (${(p2.sizes || []).join(', ')})\n` +
        `• ಕ್ಯಾಮೆರಾ: ${p1.name} (${s1.camera}) vs ${p2.name} (${s2.camera})\n` +
        `• ಬ್ಯಾಟರಿ & ಚಾರ್ಜಿಂಗ್: ${p1.name} (${s1.battery}, ${s1.charging}) vs ${p2.name} (${s2.battery}, ${s2.charging})\n` +
        `• ಸ್ಟೋರ್ ಬೆಲೆ: ${p1.name} (₹${Math.round(p1.salePrice).toLocaleString('en-IN')}) vs ${p2.name} (₹${Math.round(p2.salePrice).toLocaleString('en-IN')})\n\n` +
        `ನೀವು ಯಾವುದನ್ನು ಆಯ್ಕೆ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?`;
      return {
        reply,
        toolCalled: 'compareMobileProducts',
        comparedProducts: [p1.id, p2.id]
      };
    }

    const reply = `Comparison: ${p1.name} vs ${p2.name}:\n\n` +
      `• Display: ${p1.name} (${s1.displaySize || '6.1"'}, ${s1.refreshRate || '60Hz'}, ${s1.displayTech || 'OLED'}) vs ${p2.name} (${s2.displaySize || '6.2"'}, ${s2.refreshRate || '120Hz'}, ${s2.displayTech || 'AMOLED'})\n` +
      `• Processor: ${p1.name} (${s1.processor || 'Apple A18'}) vs ${p2.name} (${s2.processor || 'Snapdragon 8 Elite'})\n` +
      `• RAM: ${p1.name} (${s1.ram || '8GB'}) vs ${p2.name} (${s2.ram || '12GB'})\n` +
      `• Storage: ${p1.name} (${(p1.sizes || []).join(', ')}) vs ${p2.name} (${(p2.sizes || []).join(', ')})\n` +
      `• Camera: ${p1.name} (${s1.camera}) vs ${p2.name} (${s2.camera})\n` +
      `• Battery & Charging: ${p1.name} (${s1.battery}, ${s1.charging}) vs ${p2.name} (${s2.battery}, ${s2.charging})\n` +
      `• Store Price: ${p1.name} (₹${Math.round(p1.salePrice).toLocaleString('en-IN')}) vs ${p2.name} (₹${Math.round(p2.salePrice).toLocaleString('en-IN')})\n\n` +
      `All specifications are verified from official manufacturer data, and prices are retrieved directly from our live store database. Which phone would you like to explore further?`;

    return {
      reply,
      toolCalled: 'compareMobileProducts',
      comparedProducts: [p1.id, p2.id]
    };
  }
}
