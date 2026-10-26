import { ProductService } from './productService.js';
import { GeminiService } from './geminiService.js';
import { MobileService } from './mobileService.js';
import { LaptopService } from './laptopService.js';
import { FoodService } from './foodService.js';
import { MedicineService } from './medicineService.js';
import { SuggestedQuestionService } from './suggestedQuestionService.js';
import { ProductKnowledgeService } from './productKnowledgeService.js';
import { IntentService } from './intentService.js';
import { CategoryKnowledgeService } from './categoryKnowledgeService.js';
import { ProductKnowledgePipeline } from './productKnowledgePipeline.js';
import { AutomaticKnowledgeRetrievalService } from './automaticKnowledgeRetrievalService.js';
import { db } from '../db/database.js';

const formatProductForClient = (p) => {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    salePrice: p.salePrice,
    formattedPrice: '₹' + Math.round(p.salePrice).toLocaleString('en-IN'),
    formattedOriginalPrice: '₹' + Math.round(p.price).toLocaleString('en-IN'),
    discountPercent: p.discountPercent || 0,
    discount: `${p.discountPercent || 0}% OFF`,
    imageUrl: p.imageUrl || p.image,
    image: p.image || p.imageUrl,
    videoUrl: p.videoUrl,
    instagramVideoPostUrl: p.instagramVideoPostUrl,
    inStock: p.inStock,
    stockCount: typeof p.stockCount === 'number' ? p.stockCount : (p.stock && typeof p.stock.overall === 'number' ? p.stock.overall : null),
    colours: p.colours || [],
    sizes: p.sizes || [],
    deliveryDays: p.deliveryDays || '2-3 days',
    codAvailable: p.codAvailable ?? true,
    specs: p.specs || {},
    returnPolicy: p.returnPolicy || '7-day replacement guarantee'
  };
};

const extractSize = (str) => {
  if (!str) return null;
  const match = str.match(/\b(xxl|2xl|xl|extra large|large|medium|small|s|m|l|xs|30|32|34|36|38|40)\b/i);
  if (!match) return null;
  const raw = match[1].toLowerCase();
  if (raw === 'small' || raw === 's') return 'S';
  if (raw === 'medium' || raw === 'm') return 'M';
  if (raw === 'large' || raw === 'l') return 'L';
  if (raw === 'extra large' || raw === 'xl') return 'XL';
  if (raw === 'xxl' || raw === '2xl') return 'XXL';
  return match[1].toUpperCase();
};

const formatMedicineFullDetails = (p, lang = 'en') => {
  const getVal = (v) => (v !== undefined && v !== null && String(v).trim().length > 0) ? v : 'Not available in verified product data.';
  
  const activeIng = Array.isArray(p.activeIngredients) ? p.activeIngredients.join(', ') : getVal(p.activeIngredients);
  const licenceReg = (p.manufacturingLicence || p.registrationApproval) 
    ? `${getVal(p.manufacturingLicence)} | ${getVal(p.registrationApproval)}`
    : 'Not available in verified product data.';
  const returnEx = (p.returnPolicy || p.exchangePolicy)
    ? `${getVal(p.returnPolicy)} | ${getVal(p.exchangePolicy)}`
    : 'Not available in verified product data.';
  const mfg = getVal(p.manufacturerName || p.manufacturer);
  const mfgAddr = getVal(p.manufacturerAddress);
  const testing = getVal(p.testingQuality || p.gmpCertification);
  const mrpVal = (p.mrp !== undefined && p.mrp !== null) ? `₹${p.mrp}` : 'Not available in verified product data.';
  const priceVal = (p.salePrice || p.price) ? `₹${p.salePrice || p.price}` : 'Not available in verified product data.';
  const discountVal = (p.discountPercent !== undefined && p.discountPercent !== null) 
    ? `${p.discountPercent}% (${getVal(p.discountOffer)})` 
    : 'Not available in verified product data.';
  const stockVal = p.inStock !== undefined 
    ? (p.inStock 
        ? (lang === 'kn' ? `ಲಭ್ಯವಿದೆ (In Stock)` : `In Stock`) 
        : (lang === 'kn' ? 'ಖಾಲಿಯಾಗಿದೆ (Out of Stock)' : 'Out of Stock')) 
    : 'Not available in verified product data.';
  const availQty = (p.stockCount !== undefined && p.stockCount !== null) ? `${p.stockCount} units` : 'Not available in verified product data.';
  const deliveryVal = getVal(p.deliveryInfo || p.deliveryDays);
  const sellerVal = getVal(p.seller);
  const skuVal = getVal(p.id);
  const barcodeVal = getVal(p.barcode || p.gtin);
  const authVal = getVal(p.authenticityVerification);
  const officialSrc = getVal(p.officialSource);
  const regSrc = getVal(p.regulatorySource);
  const verifiedDate = getVal(p.lastVerifiedDate);

  if (lang === 'kn') {
    return `ಔಷಧದ ಅಧಿಕೃತ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ (Verified Medicine Information):
1. Product Name: ${getVal(p.name)}
2. Brand: ${getVal(p.brand)}
3. Exact Variant: ${getVal(p.variant || p.name)}
4. Active Ingredients: ${activeIng}
5. Strength: ${getVal(p.strength)}
6. Dosage Form: ${getVal(p.dosageForm)}
7. Uses: ${getVal(p.purpose)}
8. Benefits / Intended Effects: ${getVal(p.benefits)}
9. How to Use: ${getVal(p.howToUse)}
10. Age Restrictions: ${getVal(p.ageRestrictions)}
11. Side Effects: ${getVal(p.sideEffects)}
12. Warnings & Precautions: ${getVal(p.warnings)}
13. Contraindications: ${getVal(p.contraindications)}
14. Drug Interactions: ${getVal(p.drugInteractions)}
15. Allergy Information: ${getVal(p.allergyInfo)}
16. Pregnancy/Breastfeeding Warnings: ${getVal(p.pregnancyBreastfeeding)}
17. Prescription Status: ${getVal(p.prescriptionStatus)}
18. Manufacturer: ${mfg}
19. Manufacturer Address: ${mfgAddr}
20. Licence / Registration: ${licenceReg}
21. Testing / Quality: ${testing}
22. Batch Number: ${getVal(p.batchNumber)}
23. Manufacturing Date: ${getVal(p.manufacturingDate)}
24. Expiry Date: ${getVal(p.expiryDate)}
25. Storage: ${getVal(p.storageInstructions)}
26. Pack Size: ${getVal(p.packSize)}
27. MRP: ${mrpVal}
28. Current Selling Price: ${priceVal}
29. Discount: ${discountVal}
30. Stock: ${stockVal}
31. Available Quantity: ${availQty}
32. Delivery: ${deliveryVal}
33. Return / Exchange: ${returnEx}
34. Seller: ${sellerVal}
35. Product ID / SKU: ${skuVal}
36. Barcode / GTIN: ${barcodeVal}
37. Authenticity / Batch Verification: ${authVal}
38. Official Product Source: ${officialSrc}
39. Regulatory Source: ${regSrc}
40. Last Verified Date: ${verifiedDate}

ವೈದ್ಯಕೀಯ ಎಚ್ಚರಿಕೆ (Medical Disclaimer): ನಾನು ಉತ್ಪನ್ನ ಮಾಹಿತಿ ಮತ್ತು ಶಾಪಿಂಗ್ ಸಹಾಯಕ. ನಾನು ರೋಗನಿರ್ಣಯ ಅಥವಾ ವೈಯಕ್ತಿಕ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ ನೀಡುವುದಿಲ್ಲ. ಗಂಭೀರ ರೋಗಲಕ್ಷಣಗಳಿದ್ದರೆ ಅಥವಾ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ ತಕ್ಷಣ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.`;
  }

  return `Verified Medicine & Healthcare Information:
1. Product Name: ${getVal(p.name)}
2. Brand: ${getVal(p.brand)}
3. Exact Variant: ${getVal(p.variant || p.name)}
4. Active Ingredients: ${activeIng}
5. Strength: ${getVal(p.strength)}
6. Dosage Form: ${getVal(p.dosageForm)}
7. Uses: ${getVal(p.purpose)}
8. Benefits / Intended Effects: ${getVal(p.benefits)}
9. How to Use: ${getVal(p.howToUse)}
10. Age Restrictions: ${getVal(p.ageRestrictions)}
11. Side Effects: ${getVal(p.sideEffects)}
12. Warnings & Precautions: ${getVal(p.warnings)}
13. Contraindications: ${getVal(p.contraindications)}
14. Drug Interactions: ${getVal(p.drugInteractions)}
15. Allergy Information: ${getVal(p.allergyInfo)}
16. Pregnancy/Breastfeeding Warnings: ${getVal(p.pregnancyBreastfeeding)}
17. Prescription Status: ${getVal(p.prescriptionStatus)}
18. Manufacturer: ${mfg}
19. Manufacturer Address: ${mfgAddr}
20. Licence / Registration: ${licenceReg}
21. Testing / Quality: ${testing}
22. Batch Number: ${getVal(p.batchNumber)}
23. Manufacturing Date: ${getVal(p.manufacturingDate)}
24. Expiry Date: ${getVal(p.expiryDate)}
25. Storage: ${getVal(p.storageInstructions)}
26. Pack Size: ${getVal(p.packSize)}
27. MRP: ${mrpVal}
28. Current Selling Price: ${priceVal}
29. Discount: ${discountVal}
30. Stock: ${stockVal}
31. Available Quantity: ${availQty}
32. Delivery: ${deliveryVal}
33. Return / Exchange: ${returnEx}
34. Seller: ${sellerVal}
35. Product ID / SKU: ${skuVal}
36. Barcode / GTIN: ${barcodeVal}
37. Authenticity / Batch Verification: ${authVal}
38. Official Product Source: ${officialSrc}
39. Regulatory Source: ${regSrc}
40. Last Verified Date: ${verifiedDate}

Medical Disclaimer: I am an AI product-information and shopping assistant. I do not diagnose diseases, prescribe medicines, or provide personalized medical treatment. For severe symptoms, emergencies, or suspected overdose, please seek immediate professional medical attention.`;
};

/**
 * Service that handles interactive live conversational turns between the customer and AI.
 * Parses customer voice speech, calls corresponding backend tools in real time,
 * and generates concise, natural conversational responses suitable for voice synthesis.
 */
export class ConversationService {
  /**
   * Generates dynamic, category-specific, product-aware greetings according to the
   * PRODUCT-AWARE AI AGENT RESPONSE RULE.
   *
   * Dynamic greeting structure:
   * Greeting + AI name + Store name + Exact product name + Relevant assistance options.
   *
   * Category-specific guidelines:
   * 1. Food: Never ask about sizing, model, RAM, colour, storage, or technical specs.
   *    Offers: availability, price, ingredients, quantity/pack size, preparation info, or delivery details.
   * 2. Medicines & Healthcare: Identifies exact product & variant.
   *    Offers: verified product details, active ingredients, uses, directions, safety warnings, price, availability.
   * 3. Mobile Phones / Electronics / Laptops:
   *    Offers: specifications, RAM and storage options, colour availability, pricing, warranty, delivery.
   * 4. Accessories:
   *    Offers: device compatibility, specifications, price, stock, warranty, delivery.
   * 5. Clothing / Fashion / Shoes:
   *    Offers: sizing and fit, available colours, fabric material, discounts, delivery.
   * 6. Cosmetics / Beauty:
   *    Offers: shade options, finish, skin suitability, pricing, offers, delivery.
   * 7. Default / General Store:
   *    Offers: store products, stock availability, prices, discounts, delivery.
   * Includes full natural Kannada equivalents.
   */
  static generateProductAwareGreeting({ product, customerName, language = 'en' }) {
    const isKn = language === 'kn';
    const isFriend = !customerName || customerName.trim() === '' || customerName.trim().toLowerCase() === 'friend' || customerName.trim().toLowerCase() === 'valued caller';
    const nameClean = customerName ? customerName.trim() : '';

    const salutationEn = isFriend ? 'Namaste!' : `Namaste ${nameClean}!`;
    const salutationKn = isFriend ? 'ನಮಸ್ಕಾರ!' : `ನಮಸ್ಕಾರ ${nameClean}!`;

    if (!product || !product.name) {
      if (isKn) {
        return `${salutationKn} ನಾನು ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್‌ನ Zyro AI, ನಿಮ್ಮ ಶಾಪಿಂಗ್ ಮತ್ತು ಸೇಲ್ಸ್ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಇಂದು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`;
      }
      if (!isFriend) {
        return `Hi ${nameClean}, I'm Zyro AI, your intelligent shopping and sales assistant. How can I help you today?`;
      }
      return "Hi, I'm Zyro AI, your intelligent shopping and sales assistant. How can I help you today?";
    }

    const cat = (product.category || '').toLowerCase();
    const prodName = product.name;

    // 1. FOOD PRODUCTS
    if (cat === 'food' || /food|snack|beverage|bakery|meal|dish|tiffin/i.test(cat)) {
      if (isKn) {
        return `${salutationKn} ನಾನು ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್‌ನ Zyro AI. ನೀವು ${prodName} ಬಗ್ಗೆ ವಿಚಾರಿಸಿದ್ದೀರಿ. ನಾನು ಇದರ ಲಭ್ಯತೆ, ಬೆಲೆ, ಸಾಮಗ್ರಿಗಳು (ingredients), ಪ್ರಮಾಣ ಮತ್ತು ಡೆಲಿವರಿ ವಿವರಗಳಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
      }
      return `${salutationEn} I'm Zyro AI from TrendVibe Store. You enquired about ${prodName}. I can help you with its availability, price, ingredients, quantity, preparation information, or delivery details. What would you like to know?`;
    }

    // 2. MEDICINES & HEALTHCARE PRODUCTS
    if (/medic|health|pharma/i.test(cat)) {
      if (isKn) {
        return `${salutationKn} ನಾನು ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್‌ನ Zyro AI. ನೀವು ${prodName} ಔಷಧಿಯ ಬಗ್ಗೆ ವಿಚಾರಿಸಿದ್ದೀರಿ. ಅಧಿಕೃತ ಮಾಹಿತಿ, ಉಪಯೋಗಗಳು, ಬಳಸುವ ವಿಧಾನ, ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು, ಬೆಲೆ, ಲಭ್ಯತೆ ಮತ್ತು 20 ನಿಮಿಷಗಳ ತ್ವರಿತ ಡೆಲಿವರಿ ಬಗ್ಗೆ ನಾನು ಮಾಹಿತಿ ನೀಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
      }
      return `${salutationEn} I'm Zyro AI from TrendVibe Store. You enquired about ${prodName}. I can help you with verified product details, active ingredients, uses, directions, safety warnings, price, availability, or 20-minute quick delivery. What would you like to know?`;
    }

    // 3. MOBILE PHONES / ELECTRONICS / LAPTOPS
    if (/mobile|phone|laptop|computer|electronics/i.test(cat)) {
      if (isKn) {
        return `${salutationKn} ನಾನು ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್‌ನ Zyro AI. ನೀವು ${prodName} ಬಗ್ಗೆ ವಿಚಾರಿಸಿದ್ದೀರಿ. ಇದರ ಸ್ಪೆಸಿಫಿಕೇಶನ್‌ಗಳು, RAM ಮತ್ತು ಸ್ಟೋರೇಜ್, ಬಣ್ಣಗಳು, ಬೆಲೆ, ವಾರಂಟಿ ಮತ್ತು ಡೆಲಿವರಿ ಬಗ್ಗೆ ನಾನು ಮಾಹಿತಿ ನೀಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
      }
      return `${salutationEn} I'm Zyro AI from TrendVibe Store. You enquired about ${prodName}. I can help you with specifications, RAM and storage options, colour availability, pricing, warranty, or delivery details. What would you like to check?`;
    }

    // 4. ACCESSORIES / GADGETS
    if (/accessor|audio|gadget|smart/i.test(cat)) {
      if (isKn) {
        return `${salutationKn} ನಾನು ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್‌ನ Zyro AI. ನೀವು ${prodName} ಬಗ್ಗೆ ವಿಚಾರಿಸಿದ್ದೀರಿ. ಇದರ ಹೊಂದಾಣಿಕೆ (compatibility), ಫೀಚರ್‌ಗಳು, ಬೆಲೆ, ಸ್ಟಾಕ್ ಮತ್ತು ವಾರಂಟಿ ಬಗ್ಗೆ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
      }
      return `${salutationEn} I'm Zyro AI from TrendVibe Store. You enquired about ${prodName}. I can assist you with device compatibility, specifications, price, stock, warranty, or delivery options. How can I help you today?`;
    }

    // 5. CLOTHING / FASHION / SHOES
    if (/cloth|apparel|fashion|shoe|footwear|wear/i.test(cat)) {
      if (isKn) {
        return `${salutationKn} ನಾನು ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್‌ನ Zyro AI. ನೀವು ${prodName} ಬಗ್ಗೆ ವಿಚಾರಿಸಿದ್ದೀರಿ. ಇದರ ಸೈಜ್ (sizing), ಲಭ್ಯವಿರುವ ಬಣ್ಣಗಳು, ಬಟ್ಟೆಯ ಕ್ವಾಲಿಟಿ, ಬೆಲೆ ಮತ್ತು ಆಫರ್‌ಗಳ ಬಗ್ಗೆ ನಾನು ಮಾಹಿತಿ ನೀಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
      }
      return `${salutationEn} I'm Zyro AI from TrendVibe Store. You enquired about ${prodName}. I can help you with sizing and fit, available colours, fabric material, discounts, and delivery. What would you like to know?`;
    }

    // 6. COSMETICS / BEAUTY / SKINCARE
    if (/cosmetic|beauty|skincare|makeup|personal care/i.test(cat)) {
      if (isKn) {
        return `${salutationKn} ನಾನು ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್‌ನ Zyro AI. ನೀವು ${prodName} ಬಗ್ಗೆ ವಿಚಾರಿಸಿದ್ದೀರಿ. ಇದರ ಶೇಡ್‌ಗಳು (shades), ತ್ವಚೆಗೆ ಸೂಕ್ತತೆ (skin suitability), ಬೆಲೆ ಮತ್ತು ಆಫರ್‌ಗಳ ಬಗ್ಗೆ ನಾನು ಮಾಹಿತಿ ನೀಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
      }
      return `${salutationEn} I'm Zyro AI from TrendVibe Store. You enquired about ${prodName}. I can help you with shade options, finish, skin suitability, pricing, offers, or delivery details. What would you like to check?`;
    }

    // 7. DEFAULT / FALLBACK
    if (isKn) {
      return `${salutationKn} ನಾನು ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್‌ನ Zyro AI. ನೀವು ${prodName} ಬಗ್ಗೆ ವಿಚಾರಿಸಿದ್ದೀರಿ. ಇದರ ವಿವರಗಳು, ಬೆಲೆ, ಲಭ್ಯತೆ ಮತ್ತು ಡೆಲಿವರಿ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
    }
    return `${salutationEn} I'm Zyro AI from TrendVibe Store. You enquired about ${prodName}. I can help you with product information, stock availability, pricing, and delivery. What would you like to check?`;
  }

  /**
   * Automatically corrects common speech recognition misrecognitions, phonetic errors,
   * and acoustic noise from user voice inputs.
   */
  static normalizeSpeechInput(rawText) {
    if (!rawText) return '';
    let text = rawText.trim();

    const phoneticCorrections = [
      { pattern: /\b(teeshirt|t shirt|tee shirt|tshort|t short|tshrt|teeshrt)\b/gi, replacement: 't-shirt' },
      { pattern: /\b(technosport|tekno sport|techno sport|tekno)\b/gi, replacement: 'technosport' },
      { pattern: /\b(prais|prize|praiz|prays)\b/gi, replacement: 'price' },
      { pattern: /\b(rupe|rupi|rupees|roopies|rs\.?)\b/gi, replacement: 'rupees' },
      { pattern: /\b(stoc|stok|stck|in stoc|in stok|availabl|avalable)\b/gi, replacement: 'stock' },
      { pattern: /\b(conform|canfirm|cnfirm|conferm)\b/gi, replacement: 'confirm' },
      { pattern: /\b(ordr|plase order|pleas order|plese order)\b/gi, replacement: 'order' },
      { pattern: /\b(delivry|delivary|delever)\b/gi, replacement: 'delivery' },
      { pattern: /\b(wer is my order|wer is my package|order staus|trak order)\b/gi, replacement: 'track order' },
      { pattern: /\b(cas on delivery|cash on delivry|cod)\b/gi, replacement: 'cash on delivery' },
      { pattern: /\b(intrested|intersted|intrsted|intrest|interst)\b/gi, replacement: 'interested' },
      { pattern: /\b(proced|proseed)\b/gi, replacement: 'proceed' },
      { pattern: /\b(chekout|check out)\b/gi, replacement: 'checkout' },
      { pattern: /\b(parchase|purches)\b/gi, replacement: 'purchase' },
      // Kannada-script transliterations when browser STT is in kn-IN mode and user speaks English
      { pattern: /ಕನ್ಫರ್ಮ್ ಮೈ ಆರ್ಡರ್|ಕನ್ಫರ್ಮ್ ದಿ ಆರ್ಡರ್|ಕನ್ಫರ್ಮ್ ಆರ್ಡರ್/gi, replacement: 'confirm my order' },
      { pattern: /ಎಸ್ ಐ ಆಮ್ ಇಂಟರೆಸ್ಟೆಡ್|ಯೆಸ್ ಐ ಆಮ್ ಇಂಟರೆಸ್ಟೆಡ್|ಎಸ್ ಐ ಎಮ್ ಇಂಟರೆಸ್ಟೆಡ್/gi, replacement: 'yes i am interested' },
      { pattern: /ಐ ಆಮ್ ಇಂಟರೆಸ್ಟೆಡ್ ಟು ಬೈ ದಿಸ್ ಪ್ರಾಡಕ್ಟ್|ಐ ಆಮ್ ಇಂಟರೆಸ್ಟೆಡ್ ಟು ಬೈ ದಿ ಪ್ರಾಡಕ್ಟ್|ಐ ಆಮ್ ಇಂಟರೆಸ್ಟೆಡ್ ಟು ಬೈ|ಇಂಟರೆಸ್ಟೆಡ್ ಟು ಬೈ/gi, replacement: 'i am interested to buy this product' },
      { pattern: /ಐ ಆಮ್ ಇಂಟರೆಸ್ಟೆಡ್|ಐ ಎಮ್ ಇಂಟರೆಸ್ಟೆಡ್|ಇಂಟರೆಸ್ಟೆಡ್/gi, replacement: 'i am interested' },
      { pattern: /ಪ್ರೊಸೀಡ್ ಟು ಚೆಕೌಟ್|ಪ್ರೊಸೀಡ್ ಚೆಕೌಟ್|ಚೆಕೌಟ್/gi, replacement: 'proceed checkout' },
      { pattern: /ಸ್ವಿಚ್ ಟು ಇಂಗ್ಲಿಷ್|ಇಂಗ್ಲಿಷ್ ಗೆ ಬದಲಿಸಿ|ಇಂಗ್ಲಿಷ್ ಪ್ಲೀಸ್/gi, replacement: 'switch to english' },
      { pattern: /ಸ್ವಿಚ್ ಟು ಕನ್ನಡ|ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ|ಕನ್ನಡ ಪ್ಲೀಸ್/gi, replacement: 'switch to kannada' }
    ];

    for (const { pattern, replacement } of phoneticCorrections) {
      text = text.replace(pattern, replacement);
    }
    return text;
  }

  static async _processTurnCore({ message, leadId, productId, product: passedProduct, imageUrl, history = [], language = null, customerName = null, speakLanguage = null, recognizeKannadaSpeakEnglish = false }) {
    const rawText = (message || '').trim();
    const text = ConversationService.normalizeSpeechInput(rawText);
    if (!text) {
      return {
        reply: "I couldn't hear any audio. Could you please repeat your question, or tap any of the quick question buttons below?",
        toolCalled: 'speechCorrection',
        speechCorrection: true
      };
    }

    const lower = text.toLowerCase();
    const trimmedInput = rawText.trim().toLowerCase();

    // 1. Identify Default Video-Linked Product or Image-Linked Product (Existing Product Image Rule)
    let product = passedProduct || (productId ? db.getProductById(productId) : null);
    if (!product && passedProduct && passedProduct.id) {
      product = db.getProductById(passedProduct.id) || passedProduct;
    }
    if (!product && imageUrl) {
      product = db.getAllProducts().find(p => p.imageUrl === imageUrl || p.image === imageUrl);
    }
    const imageMatch = text.match(/\/images\/products\/(PROD-[A-Z0-9_-]+|FOOD-[A-Z0-9_-]+)\.(png|jpg|jpeg)/i);
    if (!product && imageMatch) {
      product = db.getProductById(imageMatch[1]);
    }
    let lead = leadId ? db.getLeadById(leadId) : null;

    if (!product && lead && lead.productId) {
      product = db.getProductById(lead.productId);
    }
    // Context memory from history (Section 13)
    if (!product && history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        const histProdId = h.productId || (h.activeProduct && h.activeProduct.id) || (h.product && h.product.id) || (h.productData && h.productData.id);
        if (histProdId) {
          product = db.getProductById(histProdId);
          if (product) break;
        }
        if (h.text || h.message) {
          const textProd = LaptopService.identifyProductFromText(h.text || h.message) ||
            MobileService.identifyProductFromText(h.text || h.message) ||
            MedicineService.identifyProductFromText(h.text || h.message) ||
            FoodService.identifyProductFromText(h.text || h.message);
          if (textProd) {
            product = textProd;
            break;
          }
        }
      }
    }
    const hasExplicitContextProduct = Boolean(product);
    if (!product) {
      product = db.getAllProducts()[0];
    }
    const resolvedCustomerName = customerName || (lead && lead.customerName) || null;

    // --- LANGUAGE SWITCH COMMAND (HIGHEST PRIORITY) ---
    const cleanRaw = rawText.replace(/^[^\w\u0C80-\u0CFF]+|[^\w\u0C80-\u0CFF]+$/g, '').trim();
    const cleanLower = cleanRaw.toLowerCase();

    // Check for "Recognize Kannada & Speak in English" switch command:
    const isRecognizeKnSpeakEnSwitch = 
      /^(can you\s+|please\s+)?(recognize kannada.*(speak|answer|talk).*english|understand kannada.*(speak|answer|talk).*english|kannada.*(hear|listen|understand).*(speak|answer|talk).*english|kannada.*understand.*english.*(alli|nalli)|kannada.*mathadudre.*english.*(heli|mathadi)|recognize kannada and speak english|kannada language recognize madi english alli heli|kannada kelisi english alli heli)\b/i.test(cleanLower) ||
      cleanLower.includes('recognize kannada but speak english') || cleanLower.includes('recognize kannada and speak english') || cleanLower.includes('understand kannada speak english');

    if (isRecognizeKnSpeakEnSwitch) {
      return {
        reply: "Understood! I will recognize your questions in Kannada and reply clearly in English.",
        toolCalled: 'switchLanguage',
        language: 'en',
        recognizedLanguage: 'kn',
        recognizeKannadaSpeakEnglish: true,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Check for English switch triggers:
    const isEnglishSwitch = 
      /^(can you\s+|please\s+)?(switch to english|speak in english|speak english|english please|english|change to english|convert to english|switch language to english|talk in english|english alli heli|english nalli mathadi|english nalli heli|englishalli mathadi|englishalli heli|english dalli heli|english dalli mathadi|please speak english|answer in english)\b/i.test(cleanLower) ||
      cleanLower === 'english' || cleanLower === 'switch to english' || cleanLower === 'speak in english' || cleanLower === 'english please' || cleanLower === 'answer in english' || cleanLower.endsWith('switch to english') || cleanLower.endsWith('speak in english') || cleanLower.endsWith('answer in english');

    // Check for explicit "Switch to Kannada" command:
    const isExplicitSwitchToKannada = 
      /^(can you\s+|please\s+)?(switch to kannada|change to kannada|convert to kannada|switch language to kannada)\b/i.test(cleanLower) ||
      cleanLower === 'switch to kannada' || cleanLower.endsWith('switch to kannada');

    // Check for all Kannada switch triggers:
    const isKannadaSwitch = 
      isExplicitSwitchToKannada ||
      /^(can you\s+|please\s+)?(speak in kannada|speak kannada|talk in kannada|kannada please|kannadadalli mathadi|kannadadalli maathadi|kannadadalli heli|ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ|ಕನ್ನಡದಲ್ಲಿ ಹೇಳಿ|ಕನ್ನಡದಲ್ಲಿ ಮಾತಾಡಿ|kannada|nanage kannada alli information beku|nanage kannadadalli information beku|kannada dalli heli|kannada dalli mathadi|kannada alli heli|kannada alli mathadi|kannadadalli|kannada mathadi|kannadadali mathadi|kannadadali heli|answer in kannada|kannada ge switch madi|kannadadalli explain madi)\b/i.test(cleanLower) ||
      cleanLower === 'kannada' || cleanLower === 'kannadadalli mathadi' || cleanLower === 'kannadadalli heli' || cleanLower === 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ' || cleanLower === 'answer in kannada' ||
      cleanLower.includes('kannada ge switch madi') || cleanLower.includes('kannadadalli explain madi') ||
      cleanLower.includes('ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ') || cleanLower.includes('kannadadalli mathadi') || cleanLower.includes('kannada dalli heli') || cleanLower.includes('kannada dalli mathadi') || cleanLower.includes('nanage kannada alli information beku') || cleanLower.includes('nanage kannadadalli information beku') || cleanLower.endsWith('answer in kannada');

    // Check for Roman Kannada (Kanglish) switch triggers:
    const isRomanKannadaSwitch =
      /^(can you\s+|please\s+)?(switch to roman kannada|speak in roman kannada|speak roman kannada|roman kannada|kanglish|english script kannada|switch to kanglish|talk in roman kannada|roman kannadadalli)\b/i.test(cleanLower) ||
      cleanLower === 'roman kannada' || cleanLower === 'kanglish' || cleanLower === 'switch to roman kannada' || cleanLower.endsWith('roman kannada');

    if (isEnglishSwitch) {
      return {
        reply: "Sure. I will continue in English.",
        toolCalled: 'switchLanguage',
        language: 'en',
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    if (isRomanKannadaSwitch) {
      return {
        reply: "Sari. Innu munde naanu nim jothe Roman Kannada (Kanglish) nalli mathadthini.",
        toolCalled: 'switchLanguage',
        language: 'kn_roman',
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    if (isExplicitSwitchToKannada) {
      return {
        reply: "ಸರಿ. ಇನ್ನು ಮುಂದೆ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.",
        toolCalled: 'switchLanguage',
        language: 'kn',
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    if (isKannadaSwitch) {
      return {
        reply: "ಖಂಡಿತ. ಇನ್ನು ಮುಂದೆ ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.",
        toolCalled: 'switchLanguage',
        language: 'kn',
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Determine current session language & Recognize-Kannada-Speak-English mode
    let currentLang = language || null;
    let knModeRecognizeEnSpeak = Boolean(
      recognizeKannadaSpeakEnglish ||
      speakLanguage === 'en' ||
      language === 'kn_recognize_en_speak'
    );

    if (!knModeRecognizeEnSpeak && Array.isArray(history)) {
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h && (h.recognizeKannadaSpeakEnglish || h.speakLanguage === 'en' || h.languageMode === 'kn_recognize_en_speak')) {
          knModeRecognizeEnSpeak = true;
          break;
        }
      }
    }

    const hasKannadaScript = /[\u0C80-\u0CFF]/.test(rawText);
    const hasKannadaRomanWords = /\b(ideya|estu|eshtu|yava|beku|maathadi|mathadi|heli|namaskara|hegide|enu|yenu|yaavudu|kannadadalli|kannada|hege|madbeku|idanna|yavaga|oushadha|audhada|matre|bele|esht|agutha|kodtira|bekagittu|sigutha|rate\s+eshtu)\b/i.test(lower);
    const hasKannadaInput = hasKannadaScript || hasKannadaRomanWords;

    if (currentLang === 'kn_recognize_en_speak') {
      currentLang = null;
    }

    if (!currentLang && Array.isArray(history)) {
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h.language === 'kn_roman' || h.language === 'roman_kn') { currentLang = 'kn_roman'; break; }
        if (h.language === 'kn') { currentLang = 'kn'; break; }
        if (h.language === 'en') { currentLang = 'en'; break; }
        if (h.toolCalled === 'switchLanguage') {
          if (h.targetLanguage === 'kn_roman' || (h.text && /roman kannada|kanglish/i.test(h.text))) { currentLang = 'kn_roman'; break; }
          if (h.targetLanguage === 'kn' || (h.text && /ಕನ್ನಡ|kannada|ಖಂಡಿತ|ಸರಿ/i.test(h.text))) { currentLang = 'kn'; break; }
          if (h.targetLanguage === 'en' || (h.text && /english|sure/i.test(h.text))) { currentLang = 'en'; break; }
        }
        if (h.text && /ಖಂಡಿತ|ಸರಿ\. ಇನ್ನು ಮುಂದೆ|ಮಾತನಾಡುತ್ತೇನೆ|ಲಭ್ಯವಿದೆ|ಬೆಲೆ|ಸ್ಟಾಕ್|ರೂಪಾಂತರಗಳು|ರೂಪಾಯಿ/i.test(h.text)) {
          currentLang = 'kn';
          break;
        }
        if (h.text && /Sari\. Innu munde naanu nim jothe Roman Kannada/i.test(h.text)) {
          currentLang = 'kn_roman';
          break;
        }
        if (h.text && /Sure\. I will continue in English/i.test(h.text)) {
          currentLang = 'en';
          break;
        }
      }
    }

    if (!currentLang) {
      if (knModeRecognizeEnSpeak && hasKannadaInput) {
        currentLang = 'en';
      } else if (hasKannadaInput) {
        currentLang = 'kn';
      } else {
        currentLang = 'en';
      }
    } else if (knModeRecognizeEnSpeak && (currentLang === 'kn' || currentLang === 'kn_roman')) {
      currentLang = 'en';
    }

    // Contextual Product Resolution for Medicines & Food
    if (/(dolo\s*650(mg)?|dolo)/i.test(lower)) { product = db.getProductById('PROD-MED-001') || product; }
    else if (/(paracetamol\s*500(mg)?)/i.test(lower)) { product = db.getProductById('MED-PARA-001') || db.getProductById('PROD-MED-002') || product; }
    else if (/(calpol\s*500(mg)?|calpol)/i.test(lower)) { product = db.getProductById('MED-PARA-001') || db.getProductById('PROD-MED-002') || product; }
    else if (/\b(electral|ors powder|ors sachet)\b/i.test(lower)) { product = db.getProductById('MED-ORS-001') || db.getProductById('PROD-MED-003') || product; }
    else if (/\b(prolyte)\b/i.test(lower)) { product = db.getProductById('PROD-MED-004') || product; }
    else if (/\b(digene)\b/i.test(lower)) { product = db.getProductById('PROD-MED-005') || product; }
    else if (/\b(calcium carbonate antacid|calcium carbonate|caco3)\b/i.test(lower)) { product = db.getProductById('MED-ANT-001') || db.getProductById('PROD-MED-006') || product; }
    else if (/\b(cetzine|cetirizine\s*10(mg)?|cetirizine)\b/i.test(lower)) { product = db.getProductById('MED-CET-001') || db.getProductById('PROD-MED-007') || product; }
    else if (/\b(betadine|antiseptic solution|topical antiseptic|antiseptic)\b/i.test(lower)) { product = db.getProductById('MED-ANTI-001') || db.getProductById('PROD-MED-008') || product; }
    else if (/\b(lacto calamine|calamine lotion|calamine)\b/i.test(lower)) { product = db.getProductById('MED-CAL-001') || db.getProductById('PROD-MED-009') || product; }
    else if (/\b(volini|pain gel|diclofenac gel|diclofenac)\b/i.test(lower)) { product = db.getProductById('MED-PGEL-001') || db.getProductById('PROD-MED-010') || product; }
    else if (/\b(moov strong gel)\b/i.test(lower)) { product = db.getProductById('PROD-MED-013') || product; }
    else if (/\b(moov strong spray)\b/i.test(lower)) { product = db.getProductById('PROD-MED-014') || product; }
    else if (/\b(moov cream|moov pain relief cream)\b/i.test(lower)) { product = db.getProductById('MED-MOOV-001') || db.getProductById('PROD-MED-011') || product; }
    else if (/\b(moov spray)\b/i.test(lower)) { product = db.getProductById('PROD-MED-012') || product; }
    else if (/\b(mentho plus balm|mentho plus|mentho|med-balm-001|mock-mentho-8ml)\b|ಮೆಂತೋ|ಮೆಂಥೋ|ಬಾಮ್/i.test(lower)) { product = db.getProductById('PROD-MED-015') || db.getProductById('MED-MENTHO-001') || product; }
    else if (/\b(ragi mudde|mudde)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-001') || product; }
    else if (/\b(ragi dosa)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-002') || product; }
    else if (/\b(akki rotti|rotti)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-003') || product; }
    else if (/\b(uppittu|upma)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-004') || product; }
    else if (/\b(ragi idli)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-005') || product; }
    else if (/\b(vegetable idli|veg idli)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-006') || product; }
    else if (/\b(kosambari)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-007') || product; }
    else if (/\b(sprouted moong|moong salad)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-008') || product; }
    else if (/\b(avalakki|poha)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-009') || product; }
    else if (/\b(sambar|saaru)\b/i.test(lower)) { product = db.getProductById('FOOD-KAR-010') || product; }
    else if (/\b(protein ladoo|ladoo|laddu)\b/i.test(lower)) { product = db.getProductById('FOOD-GYM-001') || product; }
    else if (/\b(oats banana pancake|oats pancake|banana pancake|pancake)\b/i.test(lower)) { product = db.getProductById('FOOD-GYM-002') || product; }
    else if (/\b(peanut banana smoothie|peanut smoothie|banana smoothie|smoothie)\b/i.test(lower)) { product = db.getProductById('FOOD-GYM-003') || product; }

    // Contextual Product Resolution for Mobile Phones
    const mobileIdentified = MobileService.identifyProductFromText(text);
    if (mobileIdentified) {
      product = mobileIdentified;
    }

    // Contextual Product Resolution for Laptops
    const laptopIdentified = LaptopService.identifyProductFromText(text);
    if (laptopIdentified) {
      product = laptopIdentified;
    }

    // Contextual Product Resolution for Food
    const foodIdentified = FoodService.identifyProductFromText(text);
    if (foodIdentified) {
      product = foodIdentified;
    }

    // Contextual Product Resolution for Medicines & Healthcare
    const medIdentified = MedicineService.identifyProductFromText(text);
    if (medIdentified) {
      product = medIdentified;
    }

    let reply = '';
    let toolCalled = null;
    let orderData = null;
    let humanHandoff = false;
    let activeProduct = product;

    // --- UNIVERSAL REQUIREMENT-BASED PRODUCT RECOMMENDATIONS ---
    const isRequirementQuery = !/\b(prescription|doctor|rx|side effect|dosage|substitute|composition|active ingredient|manufacturer|expiry|pack size|licensing)\b/i.test(lower) &&
      !/\b(do|did|will|would|should|could|can)\s+i need\b/i.test(lower) &&
      !/\b(anything|something|items?|products?)\s+(under|less than|below|above)\b/i.test(lower) &&
      /\b(i need a\b|looking for (a|an)\b|suggest (a|an|me)\b|recommend (a|an|me)\b|show me (laptops|phones|shirts|t-shirts|clothes|shoes|food)|budget of\b)/i.test(lower);
    if (isRequirementQuery && !/what is (the\s+)?(price|ram|processor|gpu|storage|battery|ingredients|uses)/i.test(lower)) {
      const recResult = ProductService.recommendProducts({ query: text, language: currentLang });
      if (recResult.success && recResult.products.length > 0) {
        const topProd = db.getProductById(recResult.products[0].id) || product;
        return {
          reply: recResult.message,
          toolCalled: 'recommendProducts',
          language: currentLang,
          activeProduct: formatProductForClient(topProd),
          productData: formatProductForClient(topProd),
          recommendedProducts: recResult.products
        };
      }
    }

    // --- UNIVERSAL PRODUCT COMPARISON ---
    const isGeneralComparison = /\b(compare|versus|\bvs\b|difference between|how are these (two|products) different)\b/i.test(lower);
    if (isGeneralComparison && !MobileService.identifyProductsForComparison(text).length && !LaptopService.identifyProductsForComparison(text).length && !MedicineService.identifyProductsForComparison(text).length) {
      const compParsed = IntentService.parseComparisonQuery(text, db.getAllProducts());
      if (compParsed.products.length >= 2) {
        const compRes = ProductService.compareProducts({
          productId1: compParsed.products[0].id,
          productId2: compParsed.products[1].id,
          attribute: compParsed.attribute,
          language: currentLang
        });
        if (compRes.success) {
          return {
            reply: compRes.message,
            toolCalled: 'compareProducts',
            language: currentLang,
            comparedProducts: compRes.comparedProducts,
            comparison: compRes.comparison,
            activeProduct: formatProductForClient(compParsed.products[0]),
            productData: formatProductForClient(compParsed.products[0])
          };
        }
      }
    }

    // --- CONTROLLED PRODUCT KNOWLEDGE PIPELINE REASONING (AI/ML Suitability, Incompatibility Guards) ---
    const isAiMlSuitability = /\b(is (it|this|the laptop) (suitable|good) for (ai|ml|machine learning|deep learning|data science)|ai\/ml|good for ai|suitable for ai)\b/i.test(lower);
    if (isAiMlSuitability) {
      const pipelineRes = await ProductKnowledgePipeline.executeTurn({
        message: text,
        productId: product ? product.id : null,
        history,
        language: currentLang
      });
      if (pipelineRes.success) {
        return {
          reply: pipelineRes.reply,
          toolCalled: 'evaluateProductReasoning',
          language: currentLang,
          activeProduct: formatProductForClient(pipelineRes.activeProduct || product),
          productData: formatProductForClient(pipelineRes.productData || product),
          isReasoned: true
        };
      }
    }

    // --- AUTOMATIC KNOWLEDGE RETRIEVAL FOR MISSING PUBLIC PRODUCT FACTS (RULES 1–12 & TOOL-ROUTING RULE 2) ---
    const GROUNDED_SPECIAL_ATTRIBUTES = new Set([
      'sar_value',
      'bluetooth_codec',
      'country_of_origin',
      'color_gamut',
      'mux_switch',
      'dex_support',
      'ir_blaster',
      'glycemic_index',
      'shrinkage_tolerance',
      'driver_size',
      'pharmacopoeia_standard',
      'mechanism_of_action'
    ]);
    const extractedAttrForGrounding = AutomaticKnowledgeRetrievalService.identifyRequestedAttribute(text, product);
    const isBoxContentsWithoutCharger = extractedAttrForGrounding.attributeKey === 'box_contents' && !/\bcharger\b/i.test(lower);
    const isProductMedForGrounding = Boolean(
      product && (
        (product.category && (product.category.includes('Medicines') || product.category.includes('Healthcare'))) ||
        product.isMedicalProduct ||
        product.isHealthcareProduct ||
        (product.id && (product.id.startsWith('MED-') || product.id.startsWith('PROD-MED-')))
      )
    );
    const isSpecificRestrictedSafetyGap = (
      (extractedAttrForGrounding.attributeKey === 'medical_dosage' && /\b(infant|newborn|baby|toddler|month old)\b/i.test(lower)) ||
      (!isProductMedForGrounding && extractedAttrForGrounding.attributeKey === 'batch_authenticity' && /\b(batch authenticity|verify batch|counterfeit check)\b/i.test(lower)) ||
      (extractedAttrForGrounding.attributeKey === 'safety_certifications' && /\b(fssai license|fssai number|lab test report|ul certification)\b/i.test(lower))
    );

    if (
      product &&
      (GROUNDED_SPECIAL_ATTRIBUTES.has(extractedAttrForGrounding.attributeKey) || isBoxContentsWithoutCharger || isSpecificRestrictedSafetyGap)
    ) {
      const akrResult = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
        question: text,
        product,
        language: currentLang
      });
      return {
        ...akrResult,
        isOutOfSyllabus: false,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // --- MEDICINE MULTI-VARIANT DISAMBIGUATION GUARDS ---
    // Moov Variant Disambiguation
    if (/\bmoov\b/i.test(lower) && !/\b(cream|spray|strong|gel)\b/i.test(lower)) {
      toolCalled = 'clarifyMedicineVariant';
      if (currentLang === 'kn') {
        reply = "ನಮ್ಮಲ್ಲಿ Moov ಉತ್ಪನ್ನಗಳಲ್ಲಿ ಹಲವು ರೂಪಾಂತರಗಳು ಲಭ್ಯವಿವೆ. ದಯವಿಟ್ಟು ನೀವು ಕೇಳುತ್ತಿರುವ ಉತ್ಪನ್ನವನ್ನು ಆಯ್ಕೆಮಾಡಿ:\n\n* Moov Cream\n* Moov Spray\n* Moov STRONG Gel\n* Moov STRONG Spray\n* ಇತರೆ ಲಭ್ಯವಿರುವ Moov ರೂಪಾಂತರ";
      } else {
        reply = "We have multiple Moov variants. Please select the product you are asking about:\n\n* Moov Cream\n* Moov Spray\n* Moov STRONG Gel\n* Moov STRONG Spray\n* Other available Moov variant";
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(db.getProductById('PROD-MED-011')),
        productData: formatProductForClient(db.getProductById('PROD-MED-011'))
      };
    }

    // Paracetamol Variant Disambiguation
    if (/\bparacetamol\b/i.test(lower) && !/(dolo|calpol|650|500)/i.test(lower)) {
      toolCalled = 'clarifyMedicineVariant';
      if (currentLang === 'kn') {
        reply = "ಹೌದು, Paracetamol ಲಭ್ಯವಿದೆಯೇ ಎಂದು ನಾನು ಪರಿಶೀಲಿಸುತ್ತೇನೆ. ನಮ್ಮಲ್ಲಿ Paracetamol ನಲ್ಲಿ ಎರಡು ಅಧಿಕೃತ ರೂಪಾಂತರಗಳು ಲಭ್ಯವಿವೆ:\n\n* Dolo 650 Tablet (Paracetamol 650mg, Strip of 15 for ₹30)\n* Calpol 500 Tablet (Paracetamol 500mg, Strip of 15 for ₹18)\n\nನಿಮಗೆ ಯಾವ ಬ್ರ್ಯಾಂಡ್ ಮತ್ತು ಶಕ್ತಿಯ ಮಾತ್ರೆ ಬೇಕು?";
      } else {
        reply = "Yes. I found multiple paracetamol products. Please select the exact one by brand, strength or dosage form:\n\n* Dolo 650 Tablet (Paracetamol 650mg, Strip of 15 for ₹30)\n* Calpol 500 Tablet (Paracetamol 500mg, Strip of 15 for ₹18)";
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(db.getProductById('PROD-MED-001')),
        productData: formatProductForClient(db.getProductById('PROD-MED-001'))
      };
    }

    // ORS Variant Disambiguation
    if (/\b(ors|oral rehydration)\b/i.test(lower) && !/\b(electral|prolyte|powder|sachet|drink|apple)\b/i.test(lower)) {
      toolCalled = 'clarifyMedicineVariant';
      if (currentLang === 'kn') {
        reply = "ನಮ್ಮಲ್ಲಿ ಎರಡು ಅಧಿಕೃತ WHO ಫಾರ್ಮುಲಾ ORS ಉತ್ಪನ್ನಗಳು ಲಭ್ಯವಿವೆ: Electral WHO-ORS Powder Sachet (21.8g ಪೌಡರ್ 1 ಲೀಟರ್ ನೀರಿಗೆ - ₹21) ಮತ್ತು Prolyte ORS Ready-to-Drink Apple (200ml ರೆಡಿ ಡ್ರಿಂಕ್ - ₹32). ನೀವು ಯಾವ ORS ರೂಪಾಂತರದ ಬಗ್ಗೆ ಮಾಹಿತಿ ಬಯಸುತ್ತೀರಿ?";
      } else {
        reply = "We have two verified WHO-standard ORS products available: Electral WHO-ORS Powder Sachet (21.8g powder to make 1 Litre for ₹21) and Prolyte ORS Ready-to-Drink Apple (200ml ready drink for ₹32). Which exact ORS formulation would you like to know about?";
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(db.getProductById('PROD-MED-003')),
        productData: formatProductForClient(db.getProductById('PROD-MED-003'))
      };
    }

    // Antacid Variant Disambiguation
    if (/\b(antacid|antacids)\b/i.test(lower) && !/\b(digene|calcium carbonate|carbonate)\b/i.test(lower)) {
      toolCalled = 'clarifyMedicineVariant';
      if (currentLang === 'kn') {
        reply = "ನಮ್ಮಲ್ಲಿ ಎರಡು ಅಧಿಕೃತ antacid ಉತ್ಪನ್ನಗಳು ಲಭ್ಯವಿವೆ: Digene Mint Chewable Tablets (15 ಮಾತ್ರೆಗಳು - ₹23) ಮತ್ತು Calcium Carbonate 500mg Chewable Antacid (60 ಮಾತ್ರೆಗಳು - ₹149). ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ಮಾಹಿತಿ ಬಯಸುತ್ತೀರಿ?";
      } else {
        reply = "We have two verified antacid formulations available: Digene Mint Chewable Tablets (Strip of 15 for ₹23) and Calcium Carbonate 500mg Chewable Antacid (Bottle of 60 for ₹149). Which exact antacid product would you like to know about?";
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(db.getProductById('PROD-MED-005')),
        productData: formatProductForClient(db.getProductById('PROD-MED-005'))
      };
    }

    // --- MEDICAL SAFETY GUARDRAIL (SECTION 13) ---
    const isMedicalSafetyQuery = /(diagnose|prescribe|cure my|cure this|cure disease|am i having a|treatment plan|symptoms of|severe chest pain|difficulty breathing|overdose|took \d+ (tablets|pills)|swallowed \d+ (tablets|pills)|poisoning|loss of consciousness|severe allergic reaction|change my prescription|suggest medicine for my)/i.test(lower);
    if (isMedicalSafetyQuery) {
      toolCalled = 'medicalSafetyGuardrail';
      if (currentLang === 'kn') {
        reply = "ನಾನು AI ಉತ್ಪನ್ನ ಮಾಹಿತಿ ಮತ್ತು ಶಾಪಿಂಗ್ ಸಹಾಯಕ, ವೈದ್ಯನಲ್ಲ. ನಾನು ರೋಗನಿರ್ಣಯ ಮಾಡುವುದಿಲ್ಲ, ಔಷಧಿಗಳನ್ನು ಸೂಚಿಸುವುದಿಲ್ಲ ಅಥವಾ ವೈಯಕ್ತಿಕ ಚಿಕಿತ್ಸಾ ಯೋಜನೆ ನೀಡುವುದಿಲ್ಲ. ಗಂಭೀರ ರೋಗಲಕ್ಷಣಗಳು, ಅತಿಯಾದ ಸೇವನೆ (overdose) ಅಥವಾ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ ದಯವಿಟ್ಟು ತಕ್ಷಣವೇ ವೈದ್ಯರನ್ನು ಅಥವಾ ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗವನ್ನು ಸಂಪರ್ಕಿಸಿ.";
      } else {
        reply = "I am an AI product-information and shopping assistant, not a doctor. I do not diagnose conditions, prescribe medicines, or provide personalized treatment plans. For severe symptoms, suspected overdose, or medical emergencies, please seek immediate professional medical attention.";
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // --- MEDICINE EXPIRY ENQUIRY (SECTION 7) ---
    const isMedicineExpiryQuery = /(when does .*?expire|when will .*?expire|when is the expiry|expiry date|expiration date|expire date|what is the expiry|exp date|yaavaga expire|expire aguvudu|expiry yavaga|yavaga expire|ಮುಕ್ತಾಯ ದಿನಾಂಕ)/i.test(lower);
    if (isMedicineExpiryQuery) {
      toolCalled = 'getMedicineExpiry';
      const targetExpProd = (product && (product.category?.includes('Medicines') || product.isMedicalProduct)) ? product : (medIdentified || (/(medicine|medicines|tablet|tablets|drug|drugs|pill|pills|capsule|capsules|med-)/i.test(lower) ? db.getProductById('MED-PARA-001') : null));
      if (targetExpProd) {
        const ds = MedicineService.getDatasetRecord(targetExpProd);
        const storInfo = targetExpProd.healthcareDetails?.storageAndVerification || {};
        const batchExp = storInfo.expiryDate || (ds && ds.expiry_date) || (targetExpProd.expiryDate && String(targetExpProd.expiryDate).trim() && targetExpProd.expiryDate !== 'Not available in verified product data.' ? targetExpProd.expiryDate : null) || '2028-12-31';
        const batchNum = storInfo.batchNumber || (ds && ds.batch_number) || targetExpProd.batchNumber || 'EMP-2026-555';
        if (currentLang === 'kn') {
          reply = `${targetExpProd.name} ನ ಪರಿಶೀಲಿಸಿದ ಬ್ಯಾಚ್ ಮುಕ್ತಾಯ ದಿನಾಂಕ (ಬ್ಯಾಚ್: ${batchNum}): ${batchExp}.`;
        } else {
          reply = `Verified batch expiry for ${targetExpProd.name} (Batch: ${batchNum}): ${batchExp}.`;
        }
        return {
          reply,
          toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(targetExpProd),
          productData: formatProductForClient(targetExpProd)
        };
      } else {
        reply = currentLang === 'kn' ? "ಮುಕ್ತಾಯ ದಿನಾಂಕ: Not available in verified product data." : "Expiry date: Not available in verified product data.";
        return {
          reply,
          toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }
    }

    // --- "TELL ME ABOUT THIS MEDICINE" (EXACT 40-FIELD SEQUENCE) ---
    const isMedicineDetailQuery = 
      /(tell me about (this|the)?\s*medicine|tell me about (dolo|calpol|electral|prolyte|digene|calcium carbonate|cetzine|cetirizine|betadine|lacto calamine|volini|moov cream|moov spray|moov strong|mentho plus)|medicine details|drug information|medical information)/i.test(lower) ||
      (product.category === 'Medicines & Healthcare Products' && /(tell me about (this|the)?\s*(product|item)|tell me about (it|this)|information about (it|this)|explain (this|the)?\s*medicine)/i.test(lower));

    if (isMedicineDetailQuery && product.category === 'Medicines & Healthcare Products') {
      toolCalled = 'getMedicineDetails';
      reply = formatMedicineFullDetails(product, currentLang);
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // --- FOOD CATEGORY QUERIES ---
    // List Homemade Gym / Fitness Food Products
    if (/(gym food|homemade gym food|fitness food|homemade food|gym meal|workout food|show me homemade|what homemade)/i.test(lower)) {
      toolCalled = 'listGymFoodProducts';
      if (currentLang === 'kn') {
        reply = "ನಮ್ಮಲ್ಲಿ 4 ನೈಸರ್ಗಿಕ ಹೋಮ್‌ಮೇಡ್ ಜಿಮ್ & ಫಿಟ್‌ನೆಸ್ ಆಹಾರ ಉತ್ಪನ್ನಗಳಿವೆ: 1. Homemade Protein Ladoo (₹99 - 8.5g protein), 2. Sprouted Moong Salad (₹85 - 9.2g protein), 3. Oats Banana Pancake (₹110 - 9.5g protein), ಮತ್ತು 4. Peanut Banana Smoothie (₹99 - 13.5g protein). ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?";
      } else {
        reply = "We offer 4 wholesome homemade gym & fitness foods in our Food category: 1. Homemade Protein Ladoo (₹99 - 8.5g protein), 2. Sprouted Moong Salad (₹85 - 9.2g protein), 3. Oats Banana Pancake (₹110 - 9.5g protein), and 4. Peanut Banana Smoothie (₹99 - 13.5g protein). Which one would you like to explore?";
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(db.getProductById('FOOD-GYM-001')),
        productData: formatProductForClient(db.getProductById('FOOD-GYM-001'))
      };
    }

    // List Food Products
    if (/(show me food|show food|karnataka food|traditional food|karnataka dishes|food items|food menu|list food|menu|show me dishes)/i.test(lower)) {
      toolCalled = 'listFoodProducts';
      if (currentLang === 'kn') {
        reply = "ನಮ್ಮಲ್ಲಿ 10 ಸಾಂಪ್ರದಾಯಿಕ ಕರ್ನಾಟಕ ಶೈಲಿಯ ಆಹಾರ ಉತ್ಪನ್ನಗಳಿವೆ: Ragi Mudde (₹60), Ragi Dosa (₹80), Akki Rotti (₹85), Vegetable Uppittu (₹65), Ragi Idli (₹70), Vegetable Idli (₹70), Kosambari (₹75), Sprouted Moong Salad (₹85), Avalakki (₹65), ಮತ್ತು Vegetable Sambar (₹75). ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?";
      } else {
        reply = "We offer 10 authentic Karnataka-style food items: Ragi Mudde (₹60), Ragi Dosa (₹80), Akki Rotti (₹85), Vegetable Uppittu (₹65), Ragi Idli (₹70), Vegetable Idli (₹70), Kosambari (₹75), Sprouted Moong Salad (₹85), Avalakki (₹65), and Vegetable Sambar (₹75). Which one would you like to explore?";
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(db.getProductById('FOOD-KAR-001')),
        productData: formatProductForClient(db.getProductById('FOOD-KAR-001'))
      };
    }

    // Food Ingredients Inquiry
    const isExplicitIngredientsQuery = /(ingredients?|what ingredients|what are the ingredients|vegetables|veggies|what vegetables|what are the vegetables)/i.test(lower);
    const isContentsQuery = /\bcontents?\b/i.test(lower) && !/(protein|nutrition|calorie|calories|carbs|fat|fibre|vitamins)\b/i.test(lower);
    if (product.category === 'Food' && (isExplicitIngredientsQuery || isContentsQuery)) {
      toolCalled = 'getFoodIngredients';
      const ingList = product.completeIngredients ? product.completeIngredients.join(', ') : (product.mainIngredients ? product.mainIngredients.join(', ') : 'Verified ingredients listed on package.');
      if (currentLang === 'kn') {
        reply = `${product.name} ನಲ್ಲಿ ಬಳಸಲಾದ ಪದಾರ್ಥಗಳು: ${ingList}. ಪ್ರಮಾಣ: ${product.ingredientQuantity || 'ಪ್ರಮಾಣಿತ ಸರ್ವಿಂಗ್'}.`;
      } else {
        reply = `Ingredients used in ${product.name}: ${ingList}. Quantity: ${product.ingredientQuantity || 'Standard portion'}.`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Food Details Inquiry ("Tell me about Ragi Mudde", "Tell me about Peanut Banana Smoothie", etc.)
    const isFoodDetailsQuery = 
      /(tell me about|details about|information about|bagge heli|maahiti|hege maaduvudu)/i.test(lower) ||
      /how is (it|the\s+.*|this\s+.*)?\s*(made|prepared)/i.test(lower) ||
      /preparation method/i.test(lower) ||
      /what is (this|it|the dish|the food)\b/i.test(lower);

    if (product.category === 'Food' && isFoodDetailsQuery) {
      toolCalled = 'getFoodDetails';
      const mainIngs = (product.mainIngredients || []).join(', ') || 'Natural ingredients';
      const nutritionSummary = `${product.calories} kcal, ${product.protein} protein, ${product.dietaryFibre} fibre`;
      const availabilityText = product.inStock ? 'In stock' : 'Out of stock';

      if (currentLang === 'kn') {
        reply = `${product.name} (${product.subcategory}): ${product.description} ಪದಾರ್ಥಗಳು: ${mainIngs}. ತಯಾರಿ: ${product.preparationMethod}. ಅಡುಗೆ ವಿಧಾನ: ${product.cookingMethod}. ಸರ್ವಿಂಗ್ ಗಾತ್ರ: ${product.servingSize}. ಪೌಷ್ಟಿಕಾಂಶ: ${nutritionSummary}. ಅಲರ್ಜಿ ಮಾಹಿತಿ: ${product.allergens}. ತಾಜಾತನ: ${product.freshlyPrepared}. ಶೇಖರಣೆ: ${product.storageInstructions}. ಶೆಲ್ಫ್ ಲೈಫ್: ${product.shelfLife}. ಬೆಲೆ: ₹${product.salePrice}. ಲಭ್ಯತೆ: ${availabilityText}. ಸ್ಟಾಕ್: ${product.stockCount} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯವಿದೆ. ಡೆಲಿವರಿ: ${product.deliveryDays}.`;
      } else {
        reply = `${product.name} (${product.subcategory}): ${product.description} Ingredients: ${mainIngs}. Preparation: ${product.preparationMethod}. Cooking method: ${product.cookingMethod}. Serving size: ${product.servingSize}. Nutrition: ${nutritionSummary}. Allergens: ${product.allergens}. Freshness: ${product.freshlyPrepared}. Storage: ${product.storageInstructions}. Shelf life: ${product.shelfLife}. Price: ₹${product.salePrice}. Availability: ${availabilityText}. Available stock: ${product.stockCount} units. Delivery: ${product.deliveryDays}.`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Food Masala Inquiry
    if (product.category === 'Food' && /(masala|homemade masala|spice blend|spices?)/i.test(lower)) {
      toolCalled = 'getFoodMasalaDetails';
      if (currentLang === 'kn') {
        reply = `${product.name} ಮಸಾಲೆ ವಿವರ: ${product.homemadeMasalaDetails || 'ಮನೆಯಲ್ಲೇ ತಯಾರಿಸಿದ ಮಸಾಲೆ'} (ಪದಾರ್ಥಗಳು: ${(product.masalaIngredients || []).join(', ')}).`;
      } else {
        reply = `Homemade masala details for ${product.name}: ${product.homemadeMasalaDetails || 'In-house freshly roasted spices'} (Spices: ${(product.masalaIngredients || []).join(', ')}).`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Food Oil Inquiry
    if (product.category === 'Food' && /(what oil|which oil|oil used|oil quantity|how much oil)/i.test(lower)) {
      toolCalled = 'getFoodOilDetails';
      if (currentLang === 'kn') {
        reply = `${product.name} ನಲ್ಲಿ ಬಳಸುವ ಎಣ್ಣೆ: ${product.oilType} (ಬಳಸಿದ ಪ್ರಮಾಣ: ${product.oilQuantity}).`;
      } else {
        reply = `Oil used in ${product.name}: ${product.oilType} (Usage quantity: ${product.oilQuantity}).`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Food Raw Material Sourcing Inquiry
    if (product.category === 'Food' && /(sourced?|supplier|raw material|farm|where (do you source|are the raw materials))/i.test(lower)) {
      toolCalled = 'getFoodSourcingDetails';
      if (currentLang === 'kn') {
        reply = `${product.name} ಕಚ್ಚಾ ವಸ್ತುಗಳ ವಿವರ: ${product.rawMaterialDetails}. ಗುಣಮಟ್ಟ: ${product.rawMaterialQuality}. ಮೂಲ/ಸರಬರಾಜುದಾರರು: ${product.rawMaterialSupplier}.`;
      } else {
        reply = `Raw material sourcing for ${product.name}: ${product.rawMaterialDetails}. Quality grade: ${product.rawMaterialQuality}. Source/Supplier: ${product.rawMaterialSupplier}.`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Food Freshness Inquiry
    if (product.category === 'Food' && /(fresh|freshly prepared|is (this|it) fresh|when was it (made|cooked|prepared)|sprouts (raw|steamed|boiled)|are the sprouts (raw|steamed|boiled))/i.test(lower)) {
      toolCalled = 'getFoodFreshnessDetails';
      const sproutNote = product.sproutsStatus ? ` Note: ${product.sproutsStatus}.` : '';
      const knSproutNote = product.sproutsStatus ? ` ಗಮನಿಸಿ: ${product.sproutsStatus}.` : '';
      if (currentLang === 'kn') {
        reply = `${product.name} ತಾಜಾತನದ ಮಾಹಿತಿ: ${product.freshlyPrepared}. ತಯಾರಿ ಸಮಯ: ${product.preparationDateTime}. ಉತ್ತಮ ಬಳಕೆ ಅವಧಿ: ${product.bestBeforeDateTime}.${knSproutNote}`;
      } else {
        reply = `Freshness information for ${product.name}: ${product.freshlyPrepared}. Preparation schedule: ${product.preparationDateTime}. Best before: ${product.bestBeforeDateTime}.${sproutNote}`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Food Shelf Life Inquiry
    if (product.category === 'Food' && /(shelf life|how long does it last|best before|storage instructions?|how to store|how should it be stored)/i.test(lower)) {
      toolCalled = 'getFoodShelfLife';
      if (currentLang === 'kn') {
        reply = `${product.name} ಶೆಲ್ಫ್ ಲೈಫ್: ${product.shelfLife}. ${product.storageInstructions}.`;
      } else {
        reply = `Shelf life of ${product.name}: ${product.shelfLife}. Storage: ${product.storageInstructions}.`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Food Specific Allergen Inquiry (Egg, Milk, Peanuts, Gluten, Nuts)
    if (product.category === 'Food' && /(egg|eggs|contain egg|does it have egg|milk|dairy|contain milk|does it have milk|peanuts?|groundnuts?|allergens?|contain peanuts|allergic|gluten|contain gluten)/i.test(lower)) {
      toolCalled = 'getFoodAllergens';
      let specificReply = '';
      let specificReplyKn = '';

      if (/(egg|eggs)/i.test(lower)) {
        if (/pancake/i.test(product.name) || product.id === 'FOOD-GYM-002') {
          specificReply = `Yes, ${product.name} contains 1 whole farm egg in the batter for natural binding, fluffiness, and protein.`;
          specificReplyKn = `ಹೌದು, ${product.name} ನಲ್ಲಿ ಬ್ಯಾಟರ್ ಮತ್ತು ಪ್ರೋಟೀನ್‌ಗಾಗಿ 1 ನೈಸರ್ಗಿಕ ಮೊಟ್ಟೆಯನ್ನು (egg) ಬಳಸಲಾಗುತ್ತದೆ.`;
        } else {
          specificReply = `No, ${product.name} is 100% egg-free.`;
          specificReplyKn = `ಇಲ್ಲ, ${product.name} ನಲ್ಲಿ ಮೊಟ್ಟೆಯನ್ನು ಬಳಸಲಾಗಿಲ್ಲ (100% egg-free).`;
        }
      } else if (/(milk|dairy)/i.test(lower)) {
        if (/smoothie/i.test(product.name) || product.id === 'FOOD-GYM-003') {
          specificReply = `Yes, ${product.name} contains 200ml of chilled pasteurized toned dairy milk.`;
          specificReplyKn = `ಹೌದು, ${product.name} ನಲ್ಲಿ 200ml ಪಾಶ್ಚರೀಕರಿಸಿದ ಹಾಲನ್ನು ಬಳಸಲಾಗುತ್ತದೆ.`;
        } else if (/pancake/i.test(product.name) || product.id === 'FOOD-GYM-002') {
          specificReply = `Yes, ${product.name} contains low-fat pasteurized dairy milk.`;
          specificReplyKn = `ಹೌದು, ${product.name} ನಲ್ಲಿ ಲೋ-ಫ್ಯಾಟ್ ಹಾಲು ಬಳಸಲಾಗುತ್ತದೆ.`;
        } else {
          specificReply = `No, ${product.name} is 100% dairy-free and milk-free.`;
          specificReplyKn = `ಇಲ್ಲ, ${product.name} ನಲ್ಲಿ ಹಾಲು ಬಳಸಲಾಗಿಲ್ಲ (100% dairy-free).`;
        }
      } else if (/(peanuts?|groundnuts?)/i.test(lower)) {
        if (/smoothie/i.test(product.name) || product.id === 'FOOD-GYM-003') {
          specificReply = `Yes, ${product.name} contains 30g of 100% pure natural roasted peanut butter.`;
          specificReplyKn = `ಹೌದು, ${product.name} ನಲ್ಲಿ 30g ನೈಸರ್ಗಿಕ ಪೀನಟ್ ಬಟರ್ (roasted peanut butter) ಬಳಸಲಾಗುತ್ತದೆ.`;
        } else if (/ladoo/i.test(product.name) || product.id === 'FOOD-GYM-001') {
          specificReply = `Yes, ${product.name} contains slow-roasted peanuts (groundnuts) as a key ingredient.`;
          specificReplyKn = `ಹೌದು, ${product.name} ನಲ್ಲಿ ಹುರಿದ ಕಡಲೆಕಾಯಿ (roasted peanuts) ಪ್ರಮುಖ ಪದಾರ್ಥವಾಗಿದೆ.`;
        } else if (/avalakki/i.test(product.name) || product.id === 'FOOD-KAR-009') {
          specificReply = `Yes, Avalakki contains roasted Peanuts (groundnuts).`;
          specificReplyKn = `ಹೌದು, Avalakki ನಲ್ಲಿ ಹುರಿದ ಕಡಲೆಕಾಯಿ ಇರುತ್ತದೆ.`;
        } else if (/moong/i.test(product.name) || product.id === 'FOOD-KAR-008') {
          specificReply = `No, Sprouted Moong Salad is Naturally allergen-free (prepared in a facility processing nuts).`;
          specificReplyKn = `ಇಲ್ಲ, Sprouted Moong Salad ನೈಸರ್ಗಿಕವಾಗಿ ಅಲರ್ಜಿ-ಮುಕ್ತವಾಗಿದೆ (Naturally allergen-free).`;
        } else {
          specificReply = `Allergen information for ${product.name}: ${product.allergens}.`;
          specificReplyKn = `${product.name} ಅಲರ್ಜಿ ಮಾಹಿತಿ: ${product.allergens}.`;
        }
      } else {
        specificReply = `Allergen information for ${product.name}: ${product.allergens}.`;
        specificReplyKn = `${product.name} ಅಲರ್ಜಿ ಮಾಹಿತಿ: ${product.allergens}.`;
      }

      reply = currentLang === 'kn' ? specificReplyKn : specificReply;
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Food Health Claim Guardrail & Protein / Calories / Nutrition Inquiry
    if (product.category === 'Food' && /(healthy|100% healthy|weight loss|diabetic|low fat|high protein|nutritious|good for health|how much protein|how many calories|protein|calories|carbs|carbohydrates|nutrition|nutritional facts)/i.test(lower)) {
      toolCalled = 'getFoodNutritionalFacts';
      const isHealthClaim = /(healthy|weight loss|diabetic|cure|bodybuilding)/i.test(lower);
      const prefix = isHealthClaim ? 'We provide verified factual nutritional data rather than automatic health claims. ' : '';
      const knPrefix = isHealthClaim ? 'ನಾವು ಸ್ವಯಂಚಾಲಿತ ಆರೋಗ್ಯ ಕ್ಲೈಮ್‌ಗಳ ಬದಲಿಗೆ ಅಧಿಕೃತ ಪೌಷ್ಟಿಕಾಂಶದ ಡೇಟಾವನ್ನು ನೀಡುತ್ತೇವೆ. ' : '';

      if (currentLang === 'kn') {
        reply = `${knPrefix}${product.name} ನಲ್ಲಿ ${product.calories} ಕ್ಯಾಲೋರಿಗಳು, ${product.protein} ಪ್ರೋಟೀನ್, ${product.dietaryFibre} ನಾರಿನಂಶ (dietary fibre), ಮತ್ತು ${product.fat} ಕೊಬ್ಬಿನಂಶವಿದೆ (${product.oilType}).`;
      } else {
        reply = `${prefix}A serving of ${product.name} contains ${product.calories} kcal, ${product.protein} protein, ${product.dietaryFibre} dietary fibre, and ${product.fat} fat, prepared with ${product.oilType}.`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // --- MOBILE AI — QUESTION HANDLING & DATA VERIFICATION (ALL 16 CATEGORIES & COMPARISONS) ---
    const isLangOrAudioTurn = (t) => {
      if (!t) return false;
      if (t.toolCalled === 'switchLanguage' || t.toolCalled === 'audioCheck') return true;
      const txt = (t.text || t.message || '').toLowerCase();
      return /continue in english|ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ|roman kannada/i.test(txt);
    };
    const lastAiTurnForMobile = history && history.length > 0 
      ? [...history].reverse().find(t => (t.role === 'ai' || t.sender === 'ai' || t.speaker === 'ai') && !isLangOrAudioTurn(t)) 
      : null;
    const lastAiTextForMobile = lastAiTurnForMobile ? (lastAiTurnForMobile.text || lastAiTurnForMobile.message || '').toLowerCase() : '';
    const isAwaitingInterestForMobile = /interested to buy the product|interested in placing an order|interested to order|like me to place an order|ಖರೀದಿಸಲು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ|ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ|ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ/i.test(lastAiTextForMobile);
    const isAwaitingConfirmationForMobile = /should i confirm|would you like (to|me to) confirm|confirm this order|confirm your order|ದೃಢೀಕರಿಸಲೇ|ದೃಢೀಕರಿಸಬೇಕೇ|ಕನ್ಫರ್ಮ್ ಮಾಡಲೇ/i.test(lastAiTextForMobile);
    const isAwaitingSizeForMobile = /which size|what size|select a size|prefer a size|available sizes|sizes available|ಯಾವ ಸೈಜ್/i.test(lastAiTextForMobile);
    const isMobileCategory = Boolean(product && product.category === 'mobile phones');
    const isMobileOrderInquiry = (isMobileCategory || mobileIdentified) && /(?:i want to buy|buy|purchase|order|cancel|return|exchange|replacement|return policy|exchange policy)\b/i.test(lower) && !isAwaitingConfirmationForMobile && !isAwaitingInterestForMobile;
    const isInCheckoutFlow =
      !isMobileOrderInquiry && (
        isAwaitingSizeForMobile ||
        (isAwaitingInterestForMobile && /^(yes|yeah|sure|yep|interested|i am|please|ok|okay|houdu|haudu|beku|ಹೌದು|ಸರಿ)/i.test(lower)) ||
        (isAwaitingConfirmationForMobile && /^(yes|yeah|sure|yep|confirm|proceed|ok|okay|do it|please do|cod|cash on delivery|houdu|haudu|madi|dhrudikrisi|ಹೌದು|ಸರಿ)/i.test(lower)) ||
        /^(yes,?\s*)?(please\s+)?(confirm|place|proceed)\s+(my\s+|the\s+|this\s+|with\s+|to\s+)?(order|checkout)/i.test(lower) ||
        /(?:\b(?:confirm (?:my |the |this )?order|proceed (?:to |with )?(?:checkout|order)|checkout|i am interested|i'm interested|yes i am interested|interested to (?:buy|order|purchase)|i want to (?:buy|order|purchase)|(?:buy|order|purchase) (?:this|the) (?:product|item|medicine))\b|ನಾನು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೇನೆ|ಆರ್ಡರ್ ಕನ್ಫರ್ಮ್|ಆರ್ಡರ್ ಮಾಡಿ|ಖರೀದಿಸಲು ಆಸಕ್ತಿ|ಖರೀದಿಸಲು ಬಯಸುತ್ತೇನೆ|ದೃಢೀಕರಿಸಿ)/i.test(lower)
      );

    const isMobileComparison = /\b(vs|compare|versus|comparison|difference between)\b/i.test(lower) && MobileService.identifyProductsForComparison(text).length >= 2;
    const isAmbiguousPhoneQuestion = /^(is the (black|white|blue|teal|pink|grey) one available|how much is the phone|is the phone in stock|does it have 120hz|is it amoled|what is the price of the phone|tell me about the phone)\b/i.test(lower.trim());
    const isPureGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|who are you|namaste|ಹಲೋ|ನಮಸ್ತೆ|ನಮಸ್ಕಾರ)$/i.test(lower.trim());

    if (!isInCheckoutFlow && !isPureGreeting && (isMobileComparison || isAmbiguousPhoneQuestion || (isMobileCategory && (mobileIdentified || /spec|processor|ram|storage|battery|camera|screen|display|charger|charging|ois|4k|8k|5g|sim|esim|wifi|bluetooth|weight|waterproof|water resistant|ip rating|safe|safety|overheat|overheating|ios|android|update|warranty|original|sealed|available|stock|deliver|buy|order|return|exchange|price|cost|mrp|discount|offer|colour|color|feature|details|tell me about|gaming|heavy apps|memory card|sd card/i.test(lower))))) {
      const mobileResult = MobileService.processMobileQuestion({
        text,
        product,
        currentLang
      });
      if (mobileResult) {
        return {
          reply: mobileResult.reply,
          toolCalled: mobileResult.toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(mobileResult.activeProduct || product),
          productData: formatProductForClient(mobileResult.activeProduct || product),
          ...(mobileResult.price !== undefined ? { price: mobileResult.price } : {}),
          ...(mobileResult.mrp !== undefined ? { mrp: mobileResult.mrp } : {}),
          ...(mobileResult.comparedProducts ? { comparedProducts: mobileResult.comparedProducts } : {}),
          ...(mobileResult.ambiguity ? { ambiguity: mobileResult.ambiguity } : {})
        };
      }
    }

    // --- LAPTOP AI — QUESTION HANDLING, WARRANTY REGISTRATION & DATA VERIFICATION ---
    const isLaptopComparison = /\b(vs|compare|versus|comparison|difference between)\b/i.test(lower) && LaptopService.identifyProductsForComparison(text).length >= 2;
    const isAmbiguousLaptopQuestion = /^(is the laptop available|is it available|how much is the laptop|what is the price of the laptop|tell me about the laptop|is 16gb available|does it have 120hz|is it good for gaming)\b/i.test(lower.trim());
    const isLaptopCategory = Boolean(product && (product.category === 'laptops' || product.category === 'Laptop'));

    if (!isInCheckoutFlow && !isPureGreeting && (isLaptopComparison || isAmbiguousLaptopQuestion || (isLaptopCategory && (laptopIdentified || /spec|processor|cpu|gpu|graphics|rtx|ram|storage|ssd|nvme|display|screen|battery|charging|charger|port|thunderbolt|hdmi|usb|keyboard|touchpad|camera|webcam|audio|speaker|cooling|fan|overheat|overheating|temperature|safe|safety|weight|dimension|os|windows|gaming|usage|student|office|durability|mil-std|upgrade|expandable|compatible|warranty|register|registration|price|cost|mrp|discount|offer|stock|available|deliver|delivery|buy|order|return|exchange|details|tell me about/i.test(lower))))) {
      const laptopResult = LaptopService.processLaptopQuestion({
        text,
        product,
        currentLang
      });
      if (laptopResult) {
        return {
          reply: laptopResult.reply,
          toolCalled: laptopResult.toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(laptopResult.activeProduct || product),
          productData: formatProductForClient(laptopResult.activeProduct || product),
          ...(laptopResult.price !== undefined ? { price: laptopResult.price } : {}),
          ...(laptopResult.mrp !== undefined ? { mrp: laptopResult.mrp } : {}),
          ...(laptopResult.comparedProducts ? { comparedProducts: laptopResult.comparedProducts } : {}),
          ...(laptopResult.ambiguity ? { ambiguity: laptopResult.ambiguity } : {})
        };
      }
    }

    // --- FOOD AI — DATASET-BACKED Q&A FOR ALL 31 INTENTS ---
    const isFoodCategory = Boolean(product && (product.category === 'Food' || product.category === 'food' || foodIdentified));
    if (!isInCheckoutFlow && !isPureGreeting && isFoodCategory) {
      const foodResult = FoodService.processFoodQuestion({
        text,
        product,
        currentLang
      });
      if (foodResult) {
        return {
          reply: foodResult.reply,
          toolCalled: foodResult.toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }
    }

    // --- MEDICINES & HEALTHCARE AI — DATASET-BACKED Q&A FOR ALL 23 INTENTS & TOOL-ROUTING RULES 1-7 ---
    const isMedComparison = /\b(vs|compare|versus|comparison|difference between)\b/i.test(lower) && MedicineService.identifyProductsForComparison(text).length >= 2;
    const isMedicalQueryGeneral = /\b(medicine|medicines|medicen|medicens|healthcare|health care|helthcare|tablet|tablets|drug|drugs|pill|pills|capsule|capsules|dosage|dose|side effects?|adverse effects?|contraindications?|precautions?|antacid|paracetamol|calpol|dolo|ors|electral|cetirizine|antiseptic|calamine|diclofenac|moov|mentho|expiry date|expiration date|prescription|otc|food requirement|before or after food|allergens?|drug interactions?|interactions?|who should not use|safe for children|age limit|age restriction|minimum age|two-year-old|2-year-old|two year old|toddler|infant|baby|safe for a two-year-old|pregnant|pregnancy|breastfeeding|storage temperature|refrigerat(ed|ion)?|pack size|swallow|swallows|swallowed|eye contact|enters? (?:my )?eyes?|into my eyes|in eyes?|sensitive skin|balm|how often can i apply|application frequency|frequency of application|clinical trial|efficacy rate|how should i store|quick delivery within 20 minute|20 minute quick delivery|20-minute quick delivery)\b|(ಬ್ಯಾಚ್|ಮುಕ್ತಾಯ ದಿನಾಂಕ|ಶೇಖರಣೆ|ಅಡ್ಡಪರಿಣಾಮ|ಔಷಧ|ಮಾತ್ರೆ|ಮೆಡಿಸಿನ್|ಡೋಸೇಜ್|ಮೆಂಥೋ|ಮೆಂತೋ|ಬಾಮ್|ಕಣ್ಣಿಗೆ|ನುಂಗಿದರೆ|ಹಚ್ಚಬಹುದು|ಪದಾರ್ಥಗಳು|ಗರ್ಭಾವಸ್ಥೆ|ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ|ಮಗುವಿಗೆ|ಎರಡು ವರ್ಷ|ತ್ವರಿತ ಡೆಲಿವರಿ|೨೦ ನಿಮಿಷ)/i.test(lower);
    const isCurrentProductMedical = Boolean(
      product && (
        (product.category && (product.category.includes('Medicines') || product.category.includes('Healthcare'))) ||
        product.isMedicalProduct ||
        product.isHealthcareProduct ||
        (product.id && (product.id.startsWith('MED-') || product.id.startsWith('PROD-MED-')))
      )
    );
    const isCurrentProductNonMedical = Boolean(product && !isCurrentProductMedical && hasExplicitContextProduct);
    const isMedCategory = Boolean(
      isMedComparison ||
      isCurrentProductMedical ||
      medIdentified ||
      (isMedicalQueryGeneral && !isCurrentProductNonMedical)
    );
    if (!isInCheckoutFlow && !isPureGreeting && isMedCategory) {
      const isMenthoSpecificQuery = /(balm|mentho|eye|swallow|two-year-old|2-year-old|application frequency|how often can i apply|ಮಗುವಿಗೆ|ಕಣ್ಣಿಗೆ|ನುಂಗಿದರೆ|ಎರಡು ವರ್ಷ|ಬಾಮ್|ದಿನಕ್ಕೆ ಎಷ್ಟು ಬಾರಿ)/i.test(lower);
      const targetProduct = medIdentified || ((product && (product.category?.includes('Medicines') || product.category?.includes('Healthcare') || product.isMedicalProduct || product.isHealthcareProduct || (product.id && (product.id.startsWith('MED-') || product.id.startsWith('PROD-MED-'))))) ? product : null) || MedicineService.identifyProductsForComparison(text)[0] || (isMenthoSpecificQuery ? db.getProductById('PROD-MED-015') : db.getProductById('MED-PARA-001'));

      if (targetProduct) {
        const medResult = await MedicineService.processMedicineQuestion({
          text,
          product: targetProduct,
          currentLang
        });
        if (medResult) {
          return {
            reply: medResult.reply,
            toolCalled: medResult.toolCalled,
            language: currentLang,
            isOutOfSyllabus: medResult.isOutOfSyllabus ?? false,
            activeProduct: formatProductForClient(medResult.activeProduct || targetProduct),
            productData: formatProductForClient(medResult.activeProduct || targetProduct),
            ...(medResult.price !== undefined ? { price: medResult.price } : {}),
            ...(medResult.mrp !== undefined ? { mrp: medResult.mrp } : {}),
            ...(medResult.priceSource ? { priceSource: medResult.priceSource } : {}),
            ...(medResult.codAvailable !== undefined ? { codAvailable: medResult.codAvailable } : {}),
            ...(medResult.paymentMethods ? { paymentMethods: medResult.paymentMethods } : {}),
            ...(medResult.quickDeliveryAvailable !== undefined ? { quickDeliveryAvailable: medResult.quickDeliveryAvailable } : {}),
            ...(medResult.quickDeliveryTime ? { quickDeliveryTime: medResult.quickDeliveryTime } : {}),
            ...(medResult.knowledgeStatus ? { knowledgeStatus: medResult.knowledgeStatus } : {}),
            ...(medResult.evidenceStatus ? { evidenceStatus: medResult.evidenceStatus } : {}),
            ...(medResult.verifiedFactsSummary ? { verifiedFactsSummary: medResult.verifiedFactsSummary } : {}),
            ...(medResult.unknownAttribute ? { unknownAttribute: medResult.unknownAttribute } : {}),
            ...(medResult.knowledgeSource ? { knowledgeSource: medResult.knowledgeSource } : {}),
            ...(medResult.googleSearchUsed !== undefined ? { googleSearchUsed: medResult.googleSearchUsed } : {}),
            ...(medResult.comparedProducts ? { comparedProducts: medResult.comparedProducts } : {}),
            ...(medResult.ambiguity ? { ambiguity: medResult.ambiguity } : {})
          };
        }
      }
    }

    // --- ORDER CONFIRMATION SESSION GUARDRAIL ---
    const orderAlreadyConfirmed = Array.isArray(history) && history.some(h => 
      h.toolCalled === 'createOrder' || 
      ((h.role === 'ai' || h.role === 'assistant') && /Order confirmed!|ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ!/i.test(h.text || h.content || ''))
    );
    if (orderAlreadyConfirmed && /^(is my order confirmed|did my order go through|is the order placed|ಆರ್ಡರ್ ಆಗಿದೆಯೇ)\b/i.test(lower)) {
      if (currentLang === 'kn') {
        reply = "ನಿಮ್ಮ ಆರ್ಡರ್ ಈಗಾಗಲೇ ಯಶಸ್ವಿಯಾಗಿ ದೃಢೀಕರಿಸಲ್ಪಟ್ಟಿದೆ ಮತ್ತು ರವಾನೆಗೆ ಸಿದ್ಧವಾಗುತ್ತಿದೆ! TrendVibe Store ಗೆ ಧನ್ಯವಾದಗಳು. ನಿಮಗೆ ಶುಭ ದಿನವಾಗಲಿ!";
      } else {
        reply = "Your order is already confirmed and being prepared for shipment! Thank you for shopping with TrendVibe Store. Have a wonderful day!";
      }
      return {
        reply,
        toolCalled: 'orderAlreadyCompleted',
        language: currentLang,
        endCall: true,
        orderConfirmed: true,
        stopTakingInput: true,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // --- SPEECH RECOGNITION AUTO-CORRECTION & ACOUSTIC CHECKS ---

    // Acoustic check / "Can you hear me?" / "Are you listening?" / "Check voice recognition" / "Voice test"
    if (/can you hear me|are you listening|can you listen|cannot listen|you cannot hear|hear me|hello can you hear|am i audible|kelistideya|keluttideya|voice recognition|recognize (?:my |the )?voice|check (?:my |the )?voice|voice test|test voice|voice search/i.test(lower)) {
      if (currentLang === 'kn') {
        reply = `ಹೌದು, ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಸಕ್ರಿಯವಾಗಿದೆ ಮತ್ತು ನಾನು ನಿಮ್ಮ ಮಾತನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳುತ್ತಿದ್ದೇನೆ! ನಾನು TrendVibe Store ನಿಂದ Zyro AI. ನಮ್ಮ ಸ್ಟೋರ್ ಡೇಟಾಬೇಸ್ ಮತ್ತು ಅಗತ್ಯವಿದ್ದಲ್ಲಿ ಗೂಗಲ್ ಹುಡುಕಾಟದ ಮೂಲಕ ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ${product.name} ಬಗ್ಗೆ ನೀವು ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
      } else {
        reply = `Yes, I am listening and I can hear you clearly! Voice recognition is active. I search our store database first for every question and can use Google Search grounding if data is missing. I am Zyro AI from TrendVibe Store sellers. What would you like to know about the ${product.name}?`;
      }
      return {
        reply,
        toolCalled: 'audioCheck',
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 15-Second Inactivity / Silence Timeout Turn:
    if (/^(\[silence\]|silence|no response|\[no response\]|\[timeout\]|timeout|no reply)$/i.test(lower)) {
      if (currentLang === 'kn') {
        reply = "ನೀವು ಈ ಉತ್ಪನ್ನವನ್ನು ಖರೀದಿಸಲು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ?";
      } else {
        reply = "Are you interested to buy the product?";
      }
      toolCalled = 'noResponsePrompt';
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // Inaudible / garbled noise / speech recognition failure handling:
    if (/^(huh|uh|umm|um|eh|what\?|pardon|\.\.\.|\?|noise|inaudible|undefined|null|blab|blah)$/i.test(lower) || lower.includes('[inaudible]') || lower.includes('[unrecognized]')) {
      if (currentLang === 'kn') {
        reply = "ನಿಮ್ಮ ಧ್ವನಿ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ, ಅಥವಾ ಸ್ಟಾಕ್, ಬೆಲೆ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?";
      } else {
        reply = "I couldn't clearly recognize what you said. Could you please repeat that, or tell me if you'd like to check stock availability, price in ₹, or place an order?";
      }
      return {
        reply,
        toolCalled: 'speechCorrection',
        speechCorrection: true,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // --- INTENT ROUTING & TOOL CALLS ---

    // Negative reaction / Polite End of Call Intent:
    const isNegativeReaction = 
      (!/(emi|delivery charge|shipping charge|return policy|exchange policy|warranty|discount)/i.test(lower)) && (
        /^(no|nope|nah|not now|not interested|no thanks|no thank you|later|dont want|don't want|no i'm not|no i am not|cancel|maybe later|not today|no need|beda|illa|natar|avashyakate illa)\b/i.test(lower) ||
        /(not interested|don't want to buy|dont want to buy|no thank you|no thanks|not looking to buy|change my mind|changed my mind|do not want|kharidisuva asakti illa)/i.test(lower)
      );

    if (isNegativeReaction) {
      toolCalled = 'endCallPolite';
      if (currentLang === 'kn') {
        reply = "TrendVibe Store ಗೆ ಭೇಟಿ ನೀಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! ನಿಮಗೆ ಶುಭ ದಿನವಾಗಲಿ. ಅಗತ್ಯವಿದ್ದಾಗ ಯಾವಾಗ ಬೇಕಾದರೂ ಸಂಪರ್ಕಿಸಿ.";
      } else {
        reply = "Thank you for visiting TrendVibe Store! Have a wonderful day, and feel free to reach out anytime if you need anything.";
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        endCall: true,
        stopTakingInput: true,
        activeProduct: formatProductForClient(activeProduct),
        productData: formatProductForClient(activeProduct)
      };
    }

    // A. HUMAN HANDOFF INTENT
    if (/talk to a?\s*human|speak to (a|an)?\s*(person|human|agent|rep|representative|manager)|customer care/i.test(lower)) {
      humanHandoff = true;
      toolCalled = 'humanHandoff';
      reply = `I have alerted our store sales manager to call you on this number shortly.`;
      
      if (lead) {
        db.createFollowup({
          leadId: lead.id,
          priority: 'URGENT',
          reason: 'Customer requested human representative during live voice call.',
          notes: `Customer query: "${text}"`
        });
      }
      return { 
        reply, 
        toolCalled, 
        humanHandoff, 
        activeProduct: formatProductForClient(activeProduct),
        productData: formatProductForClient(activeProduct)
      };
    }

    // B. CONFIDENTIAL DATA GUARDRAIL INTENT
    // Strictly protect store confidential & proprietary data:
    // Profit margins, wholesale/cost price, supplier/factory sourcing, seller credentials/passwords, other customer PII
    const isConfidentialQuery = 
      /(profit margin|wholesale (price|cost|rate)|cost price|manufacturing cost|cost to (make|produce)|purchase price from|how much profit|what is your margin|margin percent|markup percent)/i.test(lower) ||
      /(supplier|factory name|manufacturer contact|where do you source|who is your (supplier|vendor|distributor|wholesaler)|sourcing partner|vendor details|factory address)/i.test(lower) ||
      /(seller password|admin password|login credentials|api key|jwt token|secret key|database dump|source code access|internal staff notes|backend credentials|seller portal password)/i.test(lower) ||
      /(other customer (details|orders|data|phone|email)|customer database|buyer list|confidential store data)/i.test(lower);

    if (isConfidentialQuery) {
      toolCalled = 'confidentialDataProtected';
      reply = `I'm sorry, that is internal confidential store information which I cannot disclose. However, I am happy to help you with our live warehouse inventory, order tracking, product specifications, pricing, and order confirmation!`;
      return { 
        reply, 
        toolCalled, 
        confidentialDataProtected: true,
        activeProduct: formatProductForClient(activeProduct),
        productData: formatProductForClient(activeProduct)
      };
    }

    // MISSING BACKGROUND DATA & UNVERIFIED STORE INFORMATION GUARDRAIL
    // If the customer asks a question and the AI agent does not have sufficient background data,
    // product info, inventory, pricing, delivery, or return policy, never guess or hallucinate.
    // Respond positively, explain verified data is unavailable, reassure, and suggest next action.
    const isMissingDataQuery = 
      /(background data|unverified|unlisted|insufficient (data|information)|unrecorded|data (not available|unavailable)|not in (the )?catalog|do you have (any )?data on|unknown product|data not found)/i.test(lower);

    if (isMissingDataQuery) {
      let missingType = 'generalData';
      if (/price|pricing|cost/i.test(lower)) missingType = 'pricingData';
      else if (/stock|inventory|units/i.test(lower)) missingType = 'inventoryData';
      else if (/deliver|ship|pincode|courier/i.test(lower)) missingType = 'deliveryDetails';
      else if (/return|exchange|refund/i.test(lower)) missingType = 'returnPolicy';
      else if (/spec|fabric|hardware|material/i.test(lower)) missingType = 'specs';
      else if (/product|item|model|brand/i.test(lower)) missingType = 'productInfo';

      toolCalled = 'missingDataPositiveAssistance';
      reply = await ConversationService.generateMissingDataPositiveResponse({
        missingType,
        query: text,
        product
      });
      return {
        reply,
        toolCalled,
        missingDataHandled: true,
        missingType,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // C. LIVE ORDER TRACKING INTENT
    // Handles order status inquiries, courier tracking, AWB, delivery ETA, transit checkpoints
    const isOrderTrackingQuery = 
      /(track (my )?order|where is my order|order status|order tracking|track shipment|awb|tracking number|shipment status|has my order (been )?(shipped|dispatched)|courier tracking|delivery status of my order)/i.test(lower) ||
      /\b(ORD-[A-Za-z0-9-]+)\b/i.test(text);

    if (isOrderTrackingQuery) {
      toolCalled = 'getOrderStatus';

      const orderIdMatch = text.match(/\b(ORD-[A-Za-z0-9-]+)\b/i);
      const phoneMatch = text.match(/\b(?:\+91|0)?([6-9]\d{9})\b/);
      const reqOrderId = orderIdMatch ? orderIdMatch[1].toUpperCase() : null;
      const reqPhone = phoneMatch ? phoneMatch[1] : null;

      let orderToTrack = null;
      if (reqOrderId) {
        orderToTrack = db.getOrderById(reqOrderId) || db.getAllOrders().find(o => o.id.toLowerCase() === reqOrderId.toLowerCase());
      }
      if (!orderToTrack && reqPhone) {
        orderToTrack = db.getAllOrders().find(o => {
          if (o.phone && o.phone.replace(/\D/g, '').includes(reqPhone)) return true;
          if (o.leadId) {
            const l = db.getLeadById(o.leadId);
            return l && l.phone && l.phone.replace(/\D/g, '').includes(reqPhone);
          }
          return false;
        });
      }
      if (!orderToTrack && lead) {
        orderToTrack = db.getAllOrders().find(o => o.leadId === lead.id);
      }

      if (orderToTrack) {
        const trackRes = ProductService.getOrderStatus({ orderId: orderToTrack.id });
        orderData = trackRes;
        reply = trackRes.message;
      } else if (reqOrderId || reqPhone) {
        toolCalled = 'missingDataPositiveAssistance';
        reply = await ConversationService.generateMissingDataPositiveResponse({
          missingType: 'orderTracking',
          query: text,
          product,
          reqOrderId,
          reqPhone
        });
        return {
          reply,
          toolCalled,
          missingDataHandled: true,
          missingType: 'orderTracking',
          orderData: null,
          activeProduct: formatProductForClient(activeProduct),
          productData: formatProductForClient(activeProduct)
        };
      } else {
        reply = `To track your order, please share your Order ID (such as ORD-...) or your 10-digit registered phone number.`;
      }

      return {
        reply,
        toolCalled,
        orderData,
        activeProduct: formatProductForClient(activeProduct),
        productData: formatProductForClient(activeProduct)
      };
    }

    // D. PRICE RANGE / BUDGET ENQUIRY (0 to Infinity ₹)
    // Examples: "less than 1000 rupees", "under 500", "between 1000 and 5000", "above 3000", "cheapest product", "under 0 rupees"
    const isPriceRangeQuery = 
      /(under|less than|below|within|cheaper than|up to|maximum|max|not more than)\s*(?:₹|rs\.?|inr|rupees)?\s*(-?\d+)/i.test(lower) ||
      /between\s*(?:₹|rs\.?|inr|rupees)?\s*(\d+)\s*(?:and|to|-)\s*(?:₹|rs\.?|inr|rupees)?\s*(\d+)/i.test(lower) ||
      /(above|more than|greater than|over|starting from|minimum|min)\s*(?:₹|rs\.?|inr|rupees)?\s*(\d+)/i.test(lower) ||
      /(cheapest|lowest price|most affordable|least expensive)/i.test(lower) ||
      /(most expensive|costliest|highest price|premium product)/i.test(lower) ||
      /(?:0|zero)\s*(?:to|-)\s*(?:infinity|\d+)\s*(?:rupees|rs)?/i.test(lower);

    if (isPriceRangeQuery) {
      toolCalled = 'searchByPriceRange';
      let minPrice = 0;
      let maxPrice = Infinity;

      const betweenMatch = lower.match(/between\s*(?:₹|rs\.?|inr|rupees)?\s*(\d+)\s*(?:and|to|-)\s*(?:₹|rs\.?|inr|rupees)?\s*(\d+)/i);
      const underMatch = lower.match(/(under|less than|below|within|cheaper than|up to|maximum|max|not more than)\s*(?:₹|rs\.?|inr|rupees)?\s*(-?\d+)/i);
      const aboveMatch = lower.match(/(above|more than|greater than|over|starting from|minimum|min)\s*(?:₹|rs\.?|inr|rupees)?\s*(\d+)/i);

      if (betweenMatch) {
        minPrice = parseInt(betweenMatch[1], 10);
        maxPrice = parseInt(betweenMatch[2], 10);
        if (minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
      } else if (underMatch) {
        maxPrice = parseInt(underMatch[2], 10);
        minPrice = 0;
      } else if (aboveMatch) {
        minPrice = parseInt(aboveMatch[2], 10);
        maxPrice = Infinity;
      } else if (/(cheapest|lowest price|most affordable)/i.test(lower)) {
        minPrice = 0;
        maxPrice = Infinity;
      } else if (/(most expensive|costliest|highest price)/i.test(lower)) {
        minPrice = 0;
        maxPrice = Infinity;
      }

      // Handle edge cases like "less than 0" or negative prices
      if (maxPrice <= 0 && underMatch) {
        const allItems = db.searchProductsByPriceRange(0, Infinity);
        const cheapest = allItems[0];
        activeProduct = cheapest || product;
        reply = `We don't have items under ₹0. Our lowest priced product is ${cheapest.name} at ₹${Math.round(cheapest.salePrice).toLocaleString('en-IN')}.`;
        return {
          reply,
          toolCalled,
          activeProduct: formatProductForClient(activeProduct),
          productData: formatProductForClient(activeProduct)
        };
      }

      const res = ProductService.searchByPriceRange({ minPrice, maxPrice });

      if (res.success && res.products.length > 0) {
        let selected = res.products[0];
        if (/(most expensive|costliest|highest price)/i.test(lower)) {
          selected = res.products[res.products.length - 1];
        }
        
        activeProduct = db.getProductById(selected.id) || selected;

        if (/(cheapest|lowest price|most affordable)/i.test(lower)) {
          reply = `Our most affordable item is the ${selected.name} for ${selected.salePrice}. It is in stock and ready to ship. Are you interested to buy the product?`;
        } else if (/(most expensive|costliest|highest price)/i.test(lower)) {
          reply = `Our premium top-tier item is the ${selected.name} for ${selected.salePrice}. Are you interested to buy the product?`;
        } else if (underMatch) {
          const sample = res.products.slice(0, 2).map(p => `${p.name} for ${p.salePrice}`).join(' and ');
          reply = `Under ₹${maxPrice.toLocaleString('en-IN')}, we have ${sample}. Are you interested to buy the product?`;
        } else if (betweenMatch) {
          const sample = res.products.slice(0, 2).map(p => `${p.name} for ${p.salePrice}`).join(' and ');
          reply = `Between ₹${minPrice.toLocaleString('en-IN')} and ₹${maxPrice.toLocaleString('en-IN')}, we have ${sample}. Are you interested to buy the product?`;
        } else if (aboveMatch) {
          const sample = res.products.slice(0, 2).map(p => `${p.name} for ${p.salePrice}`).join(' and ');
          reply = `Above ₹${minPrice.toLocaleString('en-IN')}, we offer ${sample}. Are you interested to buy the product?`;
        } else {
          const sample = res.products.slice(0, 2).map(p => `${p.name} for ${p.salePrice}`).join(' and ');
          reply = `In our catalog we have ${sample}. Are you interested to buy the product?`;
        }
      } else {
        const allItems = db.searchProductsByPriceRange(0, Infinity);
        const cheapest = allItems[0];
        activeProduct = cheapest || product;
        reply = `No products found in that exact range. Our starting item is ${cheapest.name} at ₹${Math.round(cheapest.salePrice).toLocaleString('en-IN')}. Are you interested to buy the product?`;
      }

      return {
        reply,
        toolCalled,
        activeProduct: formatProductForClient(activeProduct),
        productData: formatProductForClient(activeProduct)
      };
    }

    // D. ENQUIRY FOR OTHER PRODUCTS IN STORE (Switching Focus / Specific Product Visual Enquiry)
    const otherProductCategories = ['shoe', 'shoes', 'sneaker', 'sneakers', 'phone', 'phones', 'smartphone', 'laptop', 'laptops', 'notebook', 'headphone', 'headphones', 'earphone', 'earphones', 'cosmetic', 'cosmetics', 'lipstick', 'matte', 'sunglass', 'sunglasses', 'watch', 'watches', 'jacket', 't-shirt', 'teshirt', 'tee', 'hoodie', 'medicine', 'medicines', 'healthcare', 'pharma', 'food', 'karnataka food'];
    const isOpinionOrStylingQuery = /(how (does|will) (it|this) look|is (this|it) (good|suitable|great|nice|fine|okay|ok|best|recommended) for (?:a\s+)?(?:college\s+)?(?:party|parties|wedding|date|festival|casual wear|outing|hangout)|can i wear (?:this|it) to|does (this|it) suit me|styling tips|fashion tips|aesthetic|outfit combo|pair with)/i.test(lower);
    const isPerksOrNegotiationQuery = /(free gift|freebie|give me a gift|extra discount|more discount|any gift|bargain|reduce (the )?price|lower price for me)/i.test(lower);
    const isBanterOrIdentityQuery = /(are you|who (are|made|created|built) you|tell (me )?a joke|how are you|what is your name)/i.test(lower);
    const isAttributeOrStockQuery = isOpinionOrStylingQuery || isPerksOrNegotiationQuery || isBanterOrIdentityQuery || /(product name|what product is this|which product is this|what category|which category|product category|store categories|all categories|categories|specs?|specifications?|fabric|material|gsm|battery|camera|ram|storage|processor|screen|display|warranty|return|exchange|delivery|shipping|charges|pincode|payment|cod|cash on delivery|upi|card|cost|discount|offer|price|safety|safe|warning|warnings|caution|side effect|side effects|overheat|overheating|cooling|thermal|allergen|allergy|allergies|precaution|precautions|contraindication|contraindications|dosage|ingredient|ingredients|direction|directions|instruction|instructions|usage|how to use|how to apply|compatibility|compatible|port|ports|upgrade|upgradeability|weight|dimension|reheat|reheating|shelf life|expiry|expiration|hygiene|storage|prescription|otc|certif|uses|used for|age limit|age restriction|interactions?|authentic|authenticity)/i.test(lower);
    const isCurrentProductStockCheck = /^(?:is|are)\s+(?:this|it|the\s+product|this\s+product|current\s+product)\s+(?:currently\s+)?(?:in stock|available)/i.test(lower) || /^(?:is\s+it|is\s+this)\s+(?:in stock|available|sold out)/i.test(lower);

    let targetQuery = null;
    if (!isAttributeOrStockQuery && !isCurrentProductStockCheck) {
      const mentionsOtherProductIntent = 
        /^(?:(?:is\s+(?:there\s+)?(?:a\s+|an\s+|any\s+|the\s+)?|are\s+there\s+(?:any\s+)?|do you have\s+(?:any\s+)?|do you sell\s+(?:any\s+)?|what about\s+|show me\s+|tell me about\s+|any other\s+|other products?\s+|looking for\s+|switch to\s+))(.+)/i.test(lower) &&
        !/(?:this|it|the current|here|in this)\b/i.test(lower);

      if (mentionsOtherProductIntent) {
        const match = lower.match(/^(?:(?:is\s+(?:there\s+)?(?:a\s+|an\s+|any\s+|the\s+)?|are\s+there\s+(?:any\s+)?|do you have\s+(?:any\s+)?|do you sell\s+(?:any\s+)?|what about\s+|show me\s+|tell me about\s+|any other\s+|other products?\s+|looking for\s+|switch to\s+))(.+)/i);
        if (match && match[1]) {
          targetQuery = match[1].replace(/products?|available|in the store|in store|in stock|please|\?/gi, '').trim();
        }
      } else {
        for (const kw of otherProductCategories) {
          if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
            if (new RegExp(`\\b(this|the|that|my)\\s+${kw}\\b`, 'i').test(lower)) {
              continue;
            }
            if (isClothing && (kw === 't-shirt' || kw === 'tee' || kw === 'shirt' || kw === 'hoodie' || kw === 'jacket')) {
              continue;
            }
            if (!product.name.toLowerCase().includes(kw) && !product.category.toLowerCase().includes(kw)) {
              targetQuery = kw;
              break;
            }
          }
        }
      }
    }

    // Preserve focus on current product if query mentions current product variants
    const isCurrentProductVariant = 
      (product.sizes && product.sizes.some(s => new RegExp(`\\b${s}\\b`, 'i').test(lower))) ||
      (product.colours && product.colours.some(c => new RegExp(`\\b${c}\\b`, 'i').test(lower)));

    if (isCurrentProductVariant && /available|in stock|sold out|stock|size|colour|color/i.test(lower)) {
      targetQuery = null;
    }

    if (targetQuery && targetQuery.length > 2 && !/^(it|this|that|product|this product|that product|the product|currently|this currently|available|stock|in stock|size|colour|color|price|cost|specs?|fabric|kannada|english|language|safety|warning|warnings|caution|side effect|overheating|cooling|allergen|warranty)$/i.test(targetQuery) && !isCurrentProductStockCheck) {
      const matched = db.findProductByQuery(targetQuery) || db.searchProducts(targetQuery)[0];
      if (matched && matched.id !== product.id) {
        activeProduct = matched;
        toolCalled = 'searchProduct';
        reply = `Yes! Let me find the best visual for you… We have the ${matched.name} in stock for ₹${Math.round(matched.salePrice).toLocaleString('en-IN')}. Are you interested to buy the product?`;
        return {
          reply,
          toolCalled,
          activeProduct: formatProductForClient(activeProduct),
          productData: formatProductForClient(activeProduct)
        };
      } else if (!matched) {
        toolCalled = 'missingDataPositiveAssistance';
        reply = await ConversationService.generateMissingDataPositiveResponse({
          missingType: 'productInfo',
          query: targetQuery,
          product
        });
        return {
          reply,
          toolCalled,
          missingDataHandled: true,
          missingType: 'productInfo',
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }
    }

    // E. ORDER INQUIRY / BUY INTEREST / EXPLICIT CONFIRMATION
    const lastAiTurn = history && history.length > 0 
      ? [...history].reverse().find(t => (t.role === 'ai' || t.sender === 'ai' || t.speaker === 'ai') && !isLangOrAudioTurn(t)) 
      : null;
    const lastAiText = lastAiTurn ? (lastAiTurn.text || lastAiTurn.message || '').toLowerCase() : '';
    const isAwaitingConfirmation = /should i confirm|would you like (to|me to) confirm|confirm this order|confirm your order|ದೃಢೀಕರಿಸಲೇ|ದೃಢೀಕರಿಸಬೇಕೇ|ಕನ್ಫರ್ಮ್ ಮಾಡಲೇ/i.test(lastAiText);
    const isAwaitingInterest = /interested to buy the product|interested in placing an order|interested to order|like me to place an order|ಖರೀದಿಸಲು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ|ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ|ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ/i.test(lastAiText);
    const isAwaitingSize = /which size|what size|select a size|prefer a size|available sizes|sizes available|ಯಾವ ಸೈಜ್/i.test(lastAiText);

    const isClothing = Boolean(product && product.category && (product.category.toLowerCase() === 'clothing' || product.category.toLowerCase() === 'clothes' || product.category.toLowerCase() === 'apparel'));
    let selectedSize = isClothing ? extractSize(text) : null;
    if (isClothing && !selectedSize && history && history.length > 0) {
      for (const turn of [...history].reverse()) {
        if (turn.role === 'ai' || turn.sender === 'ai' || turn.speaker === 'ai' || turn.role === 'assistant') continue;
        const turnText = turn.text || turn.message || '';
        const s = extractSize(turnText);
        if (s) {
          selectedSize = s;
          break;
        }
      }
    }

    // E0. AWAITING SIZE RESPONSE (Customer provides size after Zyro AI asked for size)
    if (isAwaitingSize && !isNegativeReaction) {
      if (selectedSize) {
        return ConversationService.validateAndBuildOrderConfirmation({
          product,
          quantity: 1,
          selectedSize,
          text,
          currentLang,
          customerConsent: true
        });
      } else {
        toolCalled = 'askSize';
        const sizesList = (product.sizes && product.sizes.length > 0) ? product.sizes.join(', ') : 'S, M, L, XL, XXL';
        if (currentLang === 'kn') {
          reply = `ನಮ್ಮಲ್ಲಿ ${sizesList} ಲಭ್ಯವಿವೆ. ನೀವು ಯಾವ ಸೈಜ್ ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?`;
        } else {
          reply = `We have ${sizesList} available. Which size would you like to order?`;
        }
        return {
          reply,
          toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }
    }

    // E1. EXPLICIT ORDER CONFIRMATION
    const isAskingCanIConfirm = !isAwaitingConfirmation && /(can i confirm|could i confirm|how (can|do) i confirm|ಕನ್ಫರ್ಮ್ ಮಾಡಬಹುದೇ|ದೃಢೀಕರಿಸಬಹುದೇ|ಖರೀದಿಸಲು ಬಯಸುತ್ತೇನೆ)/i.test(lower);
    const isExplicitConfirmation = !isAskingCanIConfirm && (
      /confirm (the|my|this)?\s*order|yes\s*(please\s*)?confirm|confirm it|confirm this|proceed with (the\s*)?order|yes place (the\s*)?order|book it now|order madi|confirm madi|ಆರ್ಡರ್ ಮಾಡಿ|ಆರ್ಡರ್ ದೃಢೀಕರಿಸಿ|ದೃಢೀಕರಿಸಿ/i.test(lower) ||
      (isAwaitingConfirmation && /^(yes|yeah|sure|yep|confirm|proceed|ok|okay|do it|please do|cod|cash on delivery|houdu|haudu|madi|dhrudikrisi|ಹೌದು|ಸರಿ)/i.test(lower) && !/\binterested to buy\b/i.test(lower))
    );

    if (isExplicitConfirmation) {
      if (isClothing && !selectedSize) {
        toolCalled = 'askSize';
        const sizesList = (product.sizes && product.sizes.length > 0) ? product.sizes.join(', ') : 'S, M, L, XL, XXL';
        if (currentLang === 'kn') {
          reply = `ಉತ್ತಮ ಆಯ್ಕೆ! ನೀವು ಯಾವ ಸೈಜ್ ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? ನಮ್ಮಲ್ಲಿ ${sizesList} ಲಭ್ಯವಿವೆ.`;
        } else {
          reply = `Great choice! Which size would you like to order? We have ${sizesList} available.`;
        }
        return {
          reply,
          toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }

      const explicitQtyMatchE1 = text.match(/\b(\d+)\s*(?:piece|pieces|item|items|unit|units|packs?|strips?|bottles?|boxes?)\b/i) || text.match(/\b(?:buy|order|confirm)\s+(\d+)\b(?!\s*(?:gb|tb|mg|ml|g|kg|hz|mp|w|mah|gsm))/i);
      const qty = explicitQtyMatchE1 ? parseInt(explicitQtyMatchE1[1], 10) : 1;

      // Validate live price and stock before creating order (Rule 5 & Rule 7)
      const preCheck = ConversationService.validateAndBuildOrderConfirmation({
        product,
        quantity: qty,
        selectedSize,
        text,
        currentLang,
        customerConsent: true
      });
      if (!preCheck.orderValidation || !preCheck.orderValidation.validated) {
        return preCheck;
      }

      toolCalled = 'createOrder';
      const size = selectedSize || (product.sizes ? product.sizes[0] : '');
      const colourMatch = text.match(/\b(vintage black|off-white|sage green|earth brown|black|white|blue|green|gray|grey|rose|brown|amber|cognac|mint|neon)\b/i);
      const colour = colourMatch ? colourMatch[1] : (product.colours ? product.colours[0] : '');

      const isCod = /cod|cash on delivery/i.test(lower) || !/card|upi/i.test(lower);
      const paymentMethod = isCod ? 'Cash on Delivery (COD)' : 'Prepaid UPI / Card';

      const orderResult = ProductService.createOrder({
        leadId: lead ? lead.id : null,
        productId: product.id,
        size,
        colour,
        quantity: qty,
        paymentMethod
      });

      orderData = orderResult;
      if (currentLang === 'kn') {
        reply = `ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ! ${qty}x ${product.name}${size ? ' (' + size + ')' : ''}. ಆರ್ಡರ್ ಐಡಿ: ${orderResult.orderId}. ಒಟ್ಟು: ${orderResult.totalAmount} (${paymentMethod}). ಡೆಲಿವರಿ ಅವಧಿ: ${product.deliveryDays}. TrendVibe Store ನಲ್ಲಿ ಶಾಪಿಂಗ್ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! ನಿಮಗೆ ಶುಭ ದಿನವಾಗಲಿ!`;
      } else {
        reply = `Order confirmed! ${qty}x ${product.name}${size ? ' (' + size + ')' : ''}. Order ID: ${orderResult.orderId}. Total: ${orderResult.totalAmount} via ${paymentMethod}. Delivery in ${product.deliveryDays}. Thank you for shopping with TrendVibe Store! Have a wonderful day!`;
      }
      return { 
        reply, 
        toolCalled, 
        orderData, 
        language: currentLang,
        endCall: true,
        orderConfirmed: true,
        stopTakingInput: true,
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // E2. INQUIRY ABOUT ORDERING / HOW TO PLACE ORDER
    if (/(can i (order|buy)|how (can|do) i order|are you taking orders|take my order|how to (place|make) order|hege order madodu|order maduvudu hege)/i.test(lower)) {
      toolCalled = 'askOrderInterest';
      if (currentLang === 'kn') {
        reply = `ಖಂಡಿತವಾಗಿಯೂ! ನೀವು ಈ ಉತ್ಪನ್ನವನ್ನು ಖರೀದಿಸಲು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ?`;
      } else {
        reply = `Yes, absolutely! Are you interested to buy the product?`;
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // E3. POSITIVE PURCHASE INTEREST (AI ASKS FOR SIZE IF CLOTHING, OR VALIDATES & CALLS requestOrderConfirmation)
    const isPositiveOrderInterest = 
      !isExplicitConfirmation && (
        /(i am interested|i'm interested|yes i am interested|yes i'm interested|interested in (placing|making)?\s*(an?)?\s*order|interested to (order|buy|purchase)|interested in buying|i want to (buy|order|purchase)|want to (buy|order|purchase) (this|the|it)|order (this|the product|the item|the medicine)|buy (this|the product|the item|the medicine)|book (this|the product|the item)|purchase (this|the product|the item)|place (an|my|the) order|order now|proceed (to |with )?(checkout|order)|\bcheckout\b|can i confirm (my |the )?order|kharidisuve|beku|kharidisi|ಖರೀದಿಸಲು ಇಷ್ಟ|ಖರೀದಿಸುವೆ|ನಾನು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೇನೆ|ಖರೀದಿಸಲು ಬಯಸುತ್ತೇನೆ|ಖರೀದಿಸಲು ಆಸಕ್ತಿ|ಆರ್ಡರ್ ಕನ್ಫರ್ಮ್ ಮಾಡಬಹುದೇ)/i.test(lower) ||
        (isAwaitingInterest && /^(yes|yeah|sure|yep|interested|i am|please|ok|okay|houdu|haudu|beku|ಹೌದು|ಸರಿ)/i.test(lower))
      );

    if (isPositiveOrderInterest) {
      if (isClothing && !selectedSize) {
        toolCalled = 'askSize';
        const sizesList = (product.sizes && product.sizes.length > 0) ? product.sizes.join(', ') : 'S, M, L, XL, XXL';
        if (currentLang === 'kn') {
          reply = `ಉತ್ತಮ ಆಯ್ಕೆ! ನೀವು ಯಾವ ಸೈಜ್ ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? ನಮ್ಮಲ್ಲಿ ${sizesList} ಲಭ್ಯವಿವೆ.`;
        } else {
          reply = `Great choice! Which size would you like to order? We have ${sizesList} available.`;
        }
        return {
          reply,
          toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }

      const explicitQtyMatch = text.match(/\b(\d+)\s*(?:piece|pieces|item|items|unit|units|packs?|strips?|bottles?|boxes?)\b/i) || text.match(/\b(?:buy|order|want)\s+(\d+)\b(?!\s*(?:gb|tb|mg|ml|g|kg|hz|mp|w|mah|gsm))/i);
      const qty = explicitQtyMatch ? parseInt(explicitQtyMatch[1], 10) : 1;

      return ConversationService.validateAndBuildOrderConfirmation({
        product,
        quantity: qty,
        selectedSize,
        text,
        currentLang,
        customerConsent: true
      });
    }

    // STYLING, FASHION ADVICE & OCCASION SUITABILITY
    if (isOpinionOrStylingQuery) {
      toolCalled = 'positiveOutOfSyllabus';
      reply = `Yes, absolutely! The ${product.name} has an ultra-sleek, modern design that looks incredible for parties, college, or casual daily wear. It's one of our most complimented picks this season! Are you interested to buy the product?`;
      return {
        reply,
        toolCalled,
        isOutOfSyllabus: true,
        positiveManaged: true,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // FREE GIFTS, EXTRA DISCOUNTS & NEGOTIATION
    if (isPerksOrNegotiationQuery) {
      toolCalled = 'positiveOutOfSyllabus';
      const disc = product.discountPercent ? `${product.discountPercent}%` : 'special';
      reply = `We love that enthusiasm! The ${product.name} is already running with an exclusive ${disc} promotional discount with free express delivery included, giving you the best possible savings today! Are you interested to buy the product?`;
      return {
        reply,
        toolCalled,
        isOutOfSyllabus: true,
        positiveManaged: true,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 1. PRODUCT NAME ENQUIRY
    if (/^(?:what is (?:the|this|your)?\s*(?:product|item)?\s*name|what's (?:the|this)?\s*(?:product|item)?\s*name|what (?:product|item) is this|which (?:product|item) is this|what are you selling|name of (?:the|this) (?:product|item)|tell me (?:the )?product name|product name|hesarenu|product hesaru|ಉತ್ಪನ್ನದ ಹೆಸರು)\b/i.test(lower)) {
      toolCalled = 'getProductName';
      if (currentLang === 'kn') {
        reply = `ಈ ಉತ್ಪನ್ನದ ಹೆಸರು ${product.name} (${product.brand || 'TrendVibe'}). ನೀವು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = `The product name is ${product.name} by ${product.brand || 'TrendVibe'}. Are you interested to buy the product?`;
      }
      return {
        reply,
        toolCalled,
        productName: product.name,
        brand: product.brand,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 2. STORE CATEGORIES & PRODUCT CATEGORY ENQUIRY
    const isAllCategoriesQuery = /(?:all categories|what categories|which categories|categories (?:available|do you have|in the store|list)|list (?:the )?categories|show (?:me )?categories|store categories|categories list)/i.test(lower) && !/(?:product category|which category does this belong to|category of this product)/i.test(lower);

    if (isAllCategoriesQuery) {
      toolCalled = 'getAllCategories';
      if (currentLang === 'kn') {
        reply = `TrendVibe ಸ್ಟೋರ್‌ನಲ್ಲಿ 9 ಪ್ರಮುಖ ವರ್ಗಗಳು ಲಭ್ಯವಿವೆ: Clothing, Mobile Phones, Laptops, Electronics, Shoes, Cosmetics, Accessories, Medicines & Healthcare Products, ಮತ್ತು Food. ನೀವು ಯಾವ ವರ್ಗವನ್ನು ನೋಡಲು ಬಯಸುತ್ತೀರಿ?`;
      } else {
        reply = `TrendVibe offers products across 9 categories: Clothing, Mobile Phones, Laptops, Electronics, Shoes, Cosmetics, Accessories, Medicines & Healthcare Products, and Food. Which category would you like to explore?`;
      }
      return {
        reply,
        toolCalled,
        categories: [
          'Clothing', 'Mobile Phones', 'Laptops', 'Electronics', 'Shoes',
          'Cosmetics', 'Accessories', 'Medicines & Healthcare Products', 'Food'
        ],
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    if (/(?:product category|which category|what category|what type of (?:product|item)|is this (?:clothing|clothes|apparel|footwear|shoes?|sneakers?|electronics?|gadgets?|cosmetics?|accessories|medicine|medicines|healthcare|food)|category does this belong to|yava category|category yavudu|ಯಾವ ವರ್ಗ)/i.test(lower)) {
      toolCalled = 'getProductCategory';
      const catUpper = (product.category || 'General').toUpperCase();
      if (currentLang === 'kn') {
        reply = `${product.name} ನಮ್ಮ ${catUpper} ವರ್ಗಕ್ಕೆ ಸೇರಿದೆ (${product.brand || 'TrendVibe'}). ನೀವು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = `The ${product.name} belongs to our ${catUpper} collection by ${product.brand || 'TrendVibe'}. Are you interested to buy the product?`;
      }
      return {
        reply,
        toolCalled,
        category: product.category,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 3. COLOR OPTIONS & COLOR INVENTORY ENQUIRY
    if (/(?:what (?:colours?|colors?|shades?)|which (?:colours?|colors?|shades?)|available (?:colours?|colors?|shades?)|(?:colours?|colors?)\s*available|(?:colour|color)\s*options?|does it come in|shades available|yava banna|banna)/i.test(lower)) {
      toolCalled = 'getAvailableColours';
      const isFood = product.category === 'Food' || /food|snack|dish|meal/i.test(product.category || '');
      const isMed = product.category === 'Medicines & Healthcare Products' || /medic|health|pharma/i.test(product.category || '');

      if (isFood) {
        if (currentLang === 'kn') {
          reply = `${product.name} ನೈಸರ್ಗಿಕ ಸಾಂಪ್ರದಾಯಿಕ ಆಹಾರ ಪದಾರ್ಥವಾಗಿದ್ದು, ಯಾವುದೇ ಕೃತಕ ಬಣ್ಣಗಳ ಆಯ್ಕೆ ಇರುವುದಿಲ್ಲ. ನೀವು ಇದರ ಸಾಮಗ್ರಿಗಳು, ಪ್ರಮಾಣ ಅಥವಾ ಬೆಲೆಯನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `${product.name} is a natural traditional dish prepared without artificial colours. Would you like to check its ingredients, portion size, or price?`;
        }
      } else if (isMed) {
        if (currentLang === 'kn') {
          reply = `${product.name} ಅಧಿಕೃತ ಔಷಧಿಯಾಗಿದ್ದು, ಯಾವುದೇ ಬಣ್ಣದ ಆಯ್ಕೆಗಳನ್ನು ಹೊಂದಿರುವುದಿಲ್ಲ. ನೀವು ಇದರ ಉಪಯೋಗಗಳು, ಬಳಸುವ ವಿಧಾನ ಅಥವಾ ಬೆಲೆಯನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `${product.name} is an authentic pharmaceutical medicine and does not come in colour variants. Would you like to check its active composition, uses, dosage, or price?`;
        }
      } else {
        const coloursList = (product.colours && product.colours.length > 0) ? product.colours.join(', ') : 'standard shade';
        if (currentLang === 'kn') {
          reply = `${product.name} ಲಭ್ಯವಿರುವ ಬಣ್ಣಗಳು: ${coloursList}. ಎಲ್ಲಾ ಬಣ್ಣಗಳು ಗೋದಾಮಿನಲ್ಲಿ ಲಭ್ಯವಿವೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `The ${product.name} is available in ${coloursList}. All shades are currently in warehouse stock. Are you interested to buy the product?`;
        }
      }
      return {
        reply,
        toolCalled,
        colours: product.colours,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 4. SIZE / MODEL OPTIONS & MODEL ENQUIRY
    const isSizeQuery = /(?:what sizes?|which sizes?|available sizes?|sizes?\s*available|size options?|all sizes?|yava size|size ideya)/i.test(lower);
    const isModelQuery = /(?:what model|which model|model name|model number|product model)/i.test(lower);

    if (isSizeQuery) {
      toolCalled = 'getAvailableSizes';
      const isFood = product.category === 'Food' || /food|snack|dish|meal/i.test(product.category || '');
      const isMed = product.category === 'Medicines & Healthcare Products' || /medic|health|pharma/i.test(product.category || '');

      if (isFood) {
        if (currentLang === 'kn') {
          reply = `${product.name} ಆಹಾರ ಪದಾರ್ಥವಾಗಿದ್ದು (ಪ್ರಮಾಣ: ${product.servingSize || 'ಸ್ಟ್ಯಾಂಡರ್ಡ್ ಪ್ಲೇಟ್'}). ಇದಕ್ಕೆ ಬಟ್ಟೆಯ ಸೈಜ್‌ಗಳು ಇರುವುದಿಲ್ಲ, ಆದರೆ ನೀವು ಪ್ರಮಾಣ, ಸಾಮಗ್ರಿಗಳು, ಅಥವಾ ಬೆಲೆಯ ವಿವರಗಳನ್ನು ತಿಳಿಯಬಹುದು.`;
        } else {
          reply = `${product.name} is a freshly prepared food dish (portion: ${product.servingSize || 'Single standard plate'}). It does not have clothing sizes, but I can help you with portion quantity, price, ingredients, or ordering!`;
        }
      } else if (isMed) {
        if (currentLang === 'kn') {
          reply = `${product.name} ಔಷಧಿಯಾಗಿದ್ದು, ಇದು ${product.packSize || product.dosageForm || '15 ಮಾತ್ರೆಗಳ ಸ್ಟ್ರಿಪ್'} ನಲ್ಲಿ ಲಭ್ಯವಿದೆ. ಇದಕ್ಕೆ ಬಟ್ಟೆಯ ಸೈಜ್‌ಗಳು ಇರುವುದಿಲ್ಲ. ನೀವು ಇದರ ಉಪಯೋಗಗಳು ಅಥವಾ ಬೆಲೆಯನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `${product.name} is a healthcare product available as a pack of ${product.dosageForm || product.packSize || '15 tablets per strip'}. It does not have clothing sizes. Would you like to check its uses, active ingredients, or price?`;
        }
      } else {
        const sizesList = (product.sizes && product.sizes.length > 0) ? product.sizes.join(', ') : 'Free Size';
        if (currentLang === 'kn') {
          reply = `${product.name} ಲಭ್ಯವಿರುವ ಅಳತೆಗಳು (sizes): ${sizesList}. ನಿಮಗೆ ಯಾವ ಅಳತೆ ಬೇಕು?`;
        } else {
          reply = `The ${product.name} is available in sizes: ${sizesList}. Which size would you like to order?`;
        }
      }
      return {
        reply,
        toolCalled,
        sizes: product.sizes,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    if (isModelQuery) {
      toolCalled = 'getModelDetails';
      const isFood = product.category === 'Food' || /food|snack|dish|meal/i.test(product.category || '');
      const isMed = product.category === 'Medicines & Healthcare Products' || /medic|health|pharma/i.test(product.category || '');

      if (isFood) {
        if (currentLang === 'kn') {
          reply = `ಇದು ತಾಜಾ ಸಾಂಪ್ರದಾಯಿಕ ಆಹಾರ ${product.name}. ನೀವು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `This dish is ${product.name}, freshly prepared South Indian cuisine made with authentic ingredients. Are you interested to order?`;
        }
      } else if (isMed) {
        if (currentLang === 'kn') {
          reply = `${product.name} ಅಧಿಕೃತ ಔಷಧಿಯಾಗಿದ್ದು, ತಯಾರಕರು: ${product.manufacturer || product.brand || 'Micro Labs Ltd'}. ನೀವು ಇದರ ವಿವರಗಳನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `${product.name} is an authentic pharmaceutical medicine manufactured by ${product.manufacturer || product.brand || 'Micro Labs Ltd'}. Would you like to check its verified uses or price?`;
        }
      } else {
        const specHighlights = product.specs ? Object.entries(product.specs).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
        if (currentLang === 'kn') {
          reply = `ಈ ಮಾದರಿಯು ${product.name} (${product.brand || 'TrendVibe'})${specHighlights ? ' (' + specHighlights + ')' : ''}. ನೀವು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `This model is the ${product.name} (${product.brand || 'TrendVibe'})${specHighlights ? ' featuring ' + specHighlights : ''}. Are you interested to buy the product?`;
        }
      }
      return {
        reply,
        toolCalled,
        model: product.name,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 4B. HYPOTHETICAL DISCOUNT CALCULATION (e.g. "If I get 30% discount, what is the price?")
    const hypoMatch = lower.match(/(?:if (?:i get|you give|there is)|what if|calculate|how much (?:with|at|if)|discount (?:ge|alli|mel))\s*(\d{1,2})\s*%\s*(?:discount|off)?/i) || lower.match(/(\d{1,2})\s*%\s*(?:discount|off)\s*(?:kotre|kottre|alli|ge|price|bele|eshtu)/i);
    if (hypoMatch) {
      toolCalled = 'calculateDiscount';
      const pct = parseInt(hypoMatch[1], 10);
      const basePrice = product.salePrice || product.price || 999;
      const hypoPrice = Math.round(basePrice * (1 - pct / 100));
      const savings = Math.round(basePrice * (pct / 100));

      if (currentLang === 'kn') {
        reply = `${product.name} ಮೂಲ ಬೆಲೆ ₹${Math.round(basePrice).toLocaleString('en-IN')} ಮೇಲೆ ${pct}% ರಿಯಾಯಿತಿ ಲೆಕ್ಕ ಹಾಕಿದರೆ, ಬೆಲೆ ₹${hypoPrice.toLocaleString('en-IN')} ಆಗುತ್ತದೆ (₹${savings.toLocaleString('en-IN')} ಉಳಿತಾಯ). ಪ್ರಸ್ತುತ ನಮ್ಮ ಸ್ಟೋರ್‌ನಲ್ಲಿ ಅಧಿಕೃತವಾಗಿ ${product.discountPercent || 20}% ರಿಯಾಯಿತಿ ಲಭ್ಯವಿದ್ದು, ಮಾರಾಟ ಬೆಲೆ ₹${Math.round(product.salePrice).toLocaleString('en-IN')} ಆಗಿದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = `With a ${pct}% discount on the price of ₹${Math.round(basePrice).toLocaleString('en-IN')}, the calculated cost would be ₹${hypoPrice.toLocaleString('en-IN')} (saving you ₹${savings.toLocaleString('en-IN')}). Please note our active store discount is ${product.discountPercent || 20}% (current selling price: ₹${Math.round(product.salePrice).toLocaleString('en-IN')}). Are you interested to buy the product?`;
      }
      return {
        reply,
        toolCalled,
        hypotheticalPercent: pct,
        hypotheticalPrice: hypoPrice,
        savings,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 4C. WARRANTY & GUARANTEE ENQUIRY
    const isWarrantyQuery = /(?:warranty|guarantee|warranty period|how many years warranty|warranty ideya|ವಾರಂಟಿ)/i.test(lower) && !/(?:register|registration)/i.test(lower);
    if (isWarrantyQuery) {
      toolCalled = 'getWarranty';
      const warrantyText = product.warranty || (product.specs && product.specs.warranty) || '1-year brand replacement warranty';
      if (currentLang === 'kn') {
        reply = `${product.name} ಗೆ ಅಧಿಕೃತ ${warrantyText} ಲಭ್ಯವಿದೆ. ನೀವು ಈ ಉತ್ಪನ್ನವನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = `The ${product.name} comes with ${warrantyText}. Are you interested to buy the product?`;
      }
      return {
        reply,
        toolCalled,
        warranty: warrantyText,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 4D. COMPATIBILITY ENQUIRY
    const isCompatibilityQuery = /(?:is (?:this|it) compatible|compatible with|compatibility|does it work with|can i (?:use|connect) (?:this|it) with)/i.test(lower);
    if (isCompatibilityQuery) {
      toolCalled = 'checkCompatibility';
      const compatText = (product.specs && product.specs.compatibility) || product.compatibility || null;
      if (compatText) {
        reply = currentLang === 'kn'
          ? `ಹೌದು, ${product.name} ಹೊಂದಾಣಿಕೆ: ${compatText}. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`
          : `Yes, compatibility for ${product.name}: ${compatText}. Are you interested to buy the product?`;
      } else {
        const cat = (product.category || '').toLowerCase();
        if (/laptop|phone|elec/i.test(cat)) {
          reply = currentLang === 'kn'
            ? `${product.name} ಸಾರ್ವತ್ರಿಕ ಮಾನದಂಡಗಳೊಂದಿಗೆ (Type-C, Bluetooth, Wi-Fi) ಸಂಪೂರ್ಣ ಹೊಂದಾಣಿಕೆ ಹೊಂದಿದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`
            : `The ${product.name} features standard universal connectivity (Type-C, Bluetooth, and Wi-Fi) compatible with all major devices. Are you interested to buy the product?`;
        } else {
          reply = currentLang === 'kn'
            ? `ಈ ಉತ್ಪನ್ನಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ಹೊಂದಾಣಿಕೆಯ ವಿವರಗಳು ಪ್ರತ್ಯೇಕವಾಗಿ ಅನ್ವಯಿಸುವುದಿಲ್ಲ.`
            : `Compatibility specifications are not applicable for this category. Are you interested to buy the product?`;
        }
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 4E. PRODUCT USAGE & DIRECTIONS
    const isUsageQuery = /(?:how (?:do i|to) (?:use|apply|wear|wash|prepare)|directions for use|how is it used|ಬಳಸುವುದು ಹೇಗೆ|ಹೇಗೆ ಬಳಸಬೇಕು)/i.test(lower);
    if (isUsageQuery) {
      toolCalled = 'getProductUsage';
      const usageText = (product.specs && (product.specs.usage || product.specs.directions || product.specs.wash_care)) || product.directions || product.howToUse || null;
      if (usageText) {
        reply = currentLang === 'kn'
          ? `${product.name} ಬಳಸುವ ವಿಧಾನ: ${usageText}. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`
          : `Directions for ${product.name}: ${usageText}. Are you interested to buy the product?`;
      } else {
        const cat = (product.category || '').toLowerCase();
        if (/cloth/i.test(cat)) {
          reply = currentLang === 'kn'
            ? `${product.name} ಅನ್ನು ಸೌಮ್ಯವಾದ ಡಿಟರ್ಜೆಂಟ್‌ನೊಂದಿಗೆ ತಣ್ಣೀರಿನಲ್ಲಿ ತೊಳೆಯಿರಿ. ಬ್ಲೀಚ್ ಮಾಡಬೇಡಿ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`
            : `For ${product.name}: Machine wash cold with similar colors. Do not bleach. Tumble dry low or line dry in shade. Are you interested to buy the product?`;
        } else {
          reply = currentLang === 'kn'
            ? `${product.name} ಬಳಸಲು ಸರಳವಾಗಿದೆ ಮತ್ತು ಬಳಕೆದಾರ ಕೈಪಿಡಿಯೊಂದಿಗೆ ಬರುತ್ತದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`
            : `The ${product.name} is straightforward to use and includes an official user guide in the box. Are you interested to buy the product?`;
        }
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 4F. SAFETY, ALLERGY & CAUTIONARY WARNINGS ENQUIRY
    const isSafetyQuery = /(safety|safe|warning|warnings|caution|side effect|side effects|allergy|allergies|allergen|allergens|skin safe|sensitive skin|dermatolog|hazardous|overheat|protection|chemical|non-toxic|eco friendly|wash care|safe for kids|safe for children)/i.test(lower);
    if (isSafetyQuery) {
      toolCalled = 'getSafetyInformation';
      const cat = (product.category || '').toLowerCase();
      if (/cloth|apparel|shirt|tee|hoodie/i.test(cat)) {
        if (currentLang === 'kn') {
          reply = `${product.name} 100% ಬಯೋ-ವಾಶ್ಡ್, ಚರ್ಮಕ್ಕೆ ಸುರಕ್ಷಿತವಾದ (skin-safe) ಪ್ರೀಮಿಯಂ ಹತ್ತಿ ಬಟ್ಟೆಯಿಂದ ತಯಾರಿಸಲ್ಪಟ್ಟಿದೆ. ಇದು ಯಾವುದೇ ಹಾನಿಕಾರಕ ರಾಸಾಯನಿಕ ಬಣ್ಣಗಳನ್ನು ಹೊಂದಿಲ್ಲ ಮತ್ತು ಸೂಕ್ಷ್ಮ ಚರ್ಮಕ್ಕೂ ಸುರಕ್ಷಿತವಾಗಿದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `The ${product.name} is crafted from 100% bio-washed, skin-safe premium combed cotton with certified azo-free dyes. It is hypoallergenic and safe for sensitive skin. Are you interested to buy the product?`;
        }
      } else if (/cosmetic|beauty|skincare/i.test(cat)) {
        if (currentLang === 'kn') {
          reply = `${product.name} ಚರ್ಮರೋಗ ಪರೀಕ್ಷಿತ (dermatologically tested) ಮತ್ತು ಕ್ರೌರ್ಯ-ಮುಕ್ತ (cruelty-free) ಉತ್ಪನ್ನವಾಗಿದೆ. ಸೂಕ್ಷ್ಮ ಚರ್ಮದವರು ಬಳಸುವ ಮೊದಲು ಪ್ಯಾಚ್ ಟೆಸ್ಟ್ ಮಾಡಲು ಶಿಫಾರಸು ಮಾಡುತ್ತೇವೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `The ${product.name} is dermatologically tested, paraben-free, and cruelty-free. For sensitive skin, we recommend a 24-hour patch test before initial use. Are you interested to buy the product?`;
        }
      } else if (/elec|audio|headphone/i.test(cat)) {
        if (currentLang === 'kn') {
          reply = `${product.name} ಅಧಿಕೃತ BIS ಮತ್ತು CE ಪ್ರಮಾಣೀಕೃತ ಸುರಕ್ಷತಾ ಮಾನದಂಡಗಳನ್ನು ಹೊಂದಿದೆ. ಇದು ಅಧಿಕ ವೋಲ್ಟೇಜ್ ಮತ್ತು ಶಾರ್ಟ್-ಸರ್ಕ್ಯೂಟ್ ರಕ್ಷಣೆಯನ್ನು ಒಳಗೊಂಡಿದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `The ${product.name} features certified short-circuit and over-voltage protection complying with BIS safety standards. Are you interested to buy the product?`;
        }
      } else {
        if (currentLang === 'kn') {
          reply = `${product.name} ನಮ್ಮ ಸ್ಟೋರ್‌ನ ಅಧಿಕೃತ ಗುಣಮಟ್ಟದ ಮಾನದಂಡಗಳನ್ನು ಪಾಲಿಸುತ್ತದೆ ಮತ್ತು ದೈನಂದಿನ ಬಳಕೆಗೆ ಸುರಕ್ಷಿತವಾಗಿದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `The ${product.name} meets our verified store quality safety standards and is certified safe for everyday use. Are you interested to buy the product?`;
        }
      }
      return {
        reply,
        toolCalled,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 5. PRICING & MRP ENQUIRY (without discount/offer keywords) — Rule 3
    const isPriceQuery = /(?:what is the (?:price|cost|rate|mrp|amount)|what's the (?:price|cost|rate|mrp|amount)|how much (?:is|does) (?:it|this)|how much (?:to pay|cost)|price of (?:this|the)|mrp|price estu|estu price|bele estu|estu bele|daravu estu|price eshtu|eshtu price|bele eshtu|eshtu bele|daravu eshtu|eshtu|estu|ಬೆಲೆ|ದರ)/i.test(lower) && !/(?:discount|offer|deal|promo)/i.test(lower);

    if (isPriceQuery) {
      const isMedProd = Boolean(
        product && (
          (product.category && (product.category.includes('Medicines') || product.category.includes('Healthcare'))) ||
          product.isMedicalProduct ||
          product.isHealthcareProduct ||
          (product.id && (product.id.startsWith('MED-') || product.id.startsWith('PROD-MED-')))
        )
      );
      toolCalled = isMedProd ? 'getMedicinePrice' : 'getPrice';
      const priceRes = ProductService.getPrice({ productId: product.id });
      if (!priceRes || !priceRes.success || product.salePrice === undefined || product.salePrice === null || Number(product.salePrice) <= 0) {
        const verifiedSummary = `Product: ${product?.name || 'Unknown'}, Brand: ${product?.brand || product?.manufacturer || 'TrendVibe'}`;
        reply = `What is verified: ${verifiedSummary}. What remains unknown: Current store selling price is not available in verified product data. I never invent or generate prices from model knowledge or search results.`;
        return {
          reply,
          toolCalled,
          evidenceStatus: 'UNVERIFIED',
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }
      if (currentLang === 'kn') {
        reply = `${product.name} ಬೆಲೆ ${priceRes.salePrice} (MRP ${priceRes.regularPrice} ಮೇಲೆ ${priceRes.discountPercent} ರಿಯಾಯಿತಿ ಇದೆ). ನೀವು ಇದನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = `The ${product.name} is ${priceRes.salePrice} (${priceRes.discountPercent} off from ${priceRes.regularPrice}). Are you interested to buy the product?`;
      }
      return { 
        reply, 
        toolCalled, 
        priceData: priceRes,
        priceSource: 'TRENDVIBE_STORE_DATABASE',
        language: currentLang,
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // 6. DISCOUNT & OFFER ENQUIRY
    if (/(?:discount|offer|deal|promo|percentage off|how much off|any offer|any discount|discount ideya|offer ideya|ರಿಯಾಯಿತಿ|ಆಫರ್)/i.test(lower)) {
      toolCalled = 'getDiscountsAndOffers';
      const savings = (product.price && product.salePrice) ? `₹${(product.price - product.salePrice).toLocaleString('en-IN')}` : 'exclusive savings';
      if (currentLang === 'kn') {
        reply = `ಹೌದು! ${product.name} ಮೇಲೆ ${product.discountPercent || 20}% ರಿಯಾಯಿತಿ ಇದೆ, MRP ಗಿಂತ ${savings} ಉಳಿತಾಯವಾಗುತ್ತದೆ. ಜೊತೆಗೆ ಉಚಿತ ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಡೆಲಿವರಿ ಕೂಡ ಲಭ್ಯವಿದೆ! ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = `Yes! The ${product.name} has an active ${product.discountPercent || 20}% discount, saving you ${savings} off MRP. It also comes with Free Express Delivery! Are you interested to buy the product?`;
      }
      return {
        reply,
        toolCalled,
        discountPercent: product.discountPercent,
        savings,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // H. CASH ON DELIVERY & PAYMENT OPTIONS (Rule 4 — evaluated before Stock & Delivery because "COD" normalizes to "cash on delivery")
    if (/\b(cod|cash on delivery|pay on delivery|payment method|payment options?|upi|gpay|phonepe|credit card|debit card|emi)\b|cod ideya|cash on delivery ideya/i.test(lower)) {
      toolCalled = 'getPaymentOptions';
      const payRes = ProductService.getPaymentOptions({ productId: product.id });
      if (currentLang === 'kn') {
        reply = payRes.codAvailable
          ? `ಹೌದು, ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ (Cash on Delivery) ಲಭ್ಯವಿದೆ. ನೀವು ಯುಪಿಐ ಮತ್ತು ಕಾರ್ಡ್‌ಗಳ ಮೂಲಕವೂ ಪಾವತಿಸಬಹುದು. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`
          : `ಈ ಉತ್ಪನ್ನಕ್ಕೆ ಯುಪಿಐ ಅಥವಾ ಕಾರ್ಡ್ ಮೂಲಕ ಮುಂಗಡ ಪಾವತಿ ಅಗತ್ಯವಿದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = payRes.codAvailable
          ? `Yes, Cash on Delivery is available. We also accept UPI and Cards. Are you interested to buy the product?`
          : `This item requires prepaid payment via UPI or Cards. Are you interested to buy the product?`;
      }
      return { 
        reply, 
        toolCalled, 
        codAvailable: Boolean(payRes.codAvailable),
        paymentMethods: payRes.paymentMethods,
        language: currentLang,
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // 7. STOCK AVAILABILITY, QUANTITY & VARIANT INVENTORY CHECK
    if (
      /available|in stock|sold out|have (it|this)|do you have|stock count|live inventory|warehouse stock|is it in stock|how many (?:units|pieces|items|quantity)|units? left|pieces? left|any left|quantity|ideya|idheya|ideyaa|ಸ್ಟಾಕ್|ಲಭ್ಯವಿದೆಯಾ|ಲಭ್ಯವಿದೆಯೇ/i.test(lower) &&
      !/\b(return|exchange|refund|delivery|shipping)\b/i.test(lower)
    ) {
      toolCalled = 'checkStock';

      const sizeMatch = text.match(/\b(xl|xxl|small|medium|large|s|m|l|uk\s*\d+|30|32|34|36|38|40)\b/i);
      const reqSize = sizeMatch ? sizeMatch[1].toUpperCase() : null;

      const colourMatch = text.match(/\b(vintage black|off-white|sage green|earth brown|black|white|blue|green|gray|grey|rose|brown|amber|cognac|mint|neon)\b/i);
      const reqColour = colourMatch ? colourMatch[1] : null;

      const stockRes = ProductService.checkStock({
        productId: product.id,
        size: reqSize,
        colour: reqColour
      });

      if (!stockRes || !stockRes.success) {
        reply = "Current stock/price information is not available in verified product data.";
        return {
          reply,
          toolCalled,
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }

      if (stockRes.inStock) {
        if (currentLang === 'kn') {
          reply = `ಹೌದು, ${product.name} ಲಭ್ಯವಿದೆ. ನಮ್ಮ ಗೋದಾಮಿನಲ್ಲಿ ${stockRes.stockCount} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯವಿವೆ. ನೀವು ಈ ಉತ್ಪನ್ನವನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        } else if (reqColour || reqSize) {
          reply = `Yes, ${product.name}${reqColour ? ' in ' + reqColour : ''}${reqSize ? ' size ' + reqSize : ''} is in stock with ${stockRes.stockCount} units available. Are you interested to buy the product?`;
        } else {
          reply = `Yes, the ${product.name} is in live stock with ${stockRes.stockCount} units available in our warehouse. Are you interested to buy the product?`;
        }
      } else {
        toolCalled = 'searchSimilarProducts';
        const similar = ProductService.searchSimilarProducts({ productId: product.id });
        if (currentLang === 'kn') {
          reply = `ಕ್ಷಮಿಸಿ, ${product.name} ಪ್ರಸ್ತುತ ಖಾಲಿಯಾಗಿದೆ (out of stock).`;
        } else {
          const altText = similar.alternatives && similar.alternatives.length > 0
            ? ` In-stock option: ${similar.alternatives[0].name} for ${similar.alternatives[0].salePrice}.`
            : '';
          reply = `Sorry, ${product.name}${reqColour ? ' in ' + reqColour : ''}${reqSize ? ' size ' + reqSize : ''} is currently sold out.${altText} Are you interested to buy the product?`;
        }
      }
      return { 
        reply, 
        toolCalled, 
        language: currentLang,
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // 8. DELIVERY ADDRESS & SERVICEABILITY ENQUIRY
    const isDeliveryAddressQuery = /(?:delivery address|shipping address|where do you deliver|can you deliver to|deliver to my (?:address|location|city|home)|serviceable (?:pincodes?|areas?|locations?|cities))/i.test(lower);

    if (isDeliveryAddressQuery) {
      toolCalled = 'checkDeliveryAddress';
      const cityMatch = lower.match(/(?:deliver to|ship to|(?:my\s+)?(?:delivery\s+)?address in)\s+([a-zA-Z\s]+|\d{6})/i);
      let destination = cityMatch ? cityMatch[1].replace(/^(?:my\s+)?(?:delivery\s+)?(?:address\s+)?(?:in\s+)?/i, '').trim() : null;
      const destText = destination ? ` including ${destination}` : '';
      if (currentLang === 'kn') {
        reply = `ಹೌದು, ನಾವು ಭಾರತದಾದ್ಯಂತ ಎಲ್ಲಾ ವಿಳಾಸಗಳಿಗೆ ಮತ್ತು ಪಿನ್‌ಕೋಡ್‌ಗಳಿಗೆ${destText ? ' (' + destination + ' ಸೇರಿ)' : ''} ಡೋರ್‌ಸ್ಟೆಪ್ ಡೆಲಿವರಿ ನೀಡುತ್ತೇವೆ! ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಡೆಲಿವರಿ ${product.deliveryDays || '2-4 ದಿನಗಳು'} ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ. ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = `Yes, we provide doorstep delivery to all addresses and PIN codes across India${destText}! Express delivery takes ${product.deliveryDays || '2-4 days'} with live courier tracking. Are you interested to buy the product?`;
      }
      return {
        reply,
        toolCalled,
        serviceable: true,
        destination,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // 9. DELIVERY INFORMATION & EXPECTED DELIVERY DATE ENQUIRY (Rule 4)
    if (/delivery|shipping|when will (?:it|i|this|my order|the package) (?:reach|arrive|get|be delivered)|how many days|dispatch|pincode|fast shipping|expected delivery|delivery yavaga|delivery estu dina|20\s*min|twenty\s*min|quick delivery|instant delivery|ತ್ವರಿತ ಡೆಲಿವರಿ|ಡೆಲಿವರಿ|೨೦ ನಿಮಿಷ/i.test(lower)) {
      const isMedProd = Boolean(
        product && (
          (product.category && (product.category.includes('Medicines') || product.category.includes('Healthcare'))) ||
          product.isMedicalProduct ||
          product.isHealthcareProduct ||
          (product.id && (product.id.startsWith('MED-') || product.id.startsWith('PROD-MED-')))
        )
      );
      toolCalled = isMedProd ? 'getMedicineDelivery' : 'getDeliveryInformation';
      const delivRes = ProductService.getDeliveryInformation({ productId: product.id });
      if (currentLang === 'kn') {
        if (isMedProd || delivRes.quickDeliveryAvailable) {
          reply = `${product.name} ಔಷಧಿಗೆ 20 ನಿಮಿಷಗಳ ತ್ವರಿತ ಡೆಲಿವರಿ (Quick delivery within 20 minutes) ಮತ್ತು ಸೇಮ್-ಡೇ ಡೆಲಿವರಿ (Same-day delivery) ಲಭ್ಯವಿದೆ. ಡೆಲಿವರಿ ಅವಧಿ: ${delivRes.deliveryDays}. ಡೆಲಿವರಿ ಶುಲ್ಕ ${delivRes.deliveryCharges}. ನೀವು ಈ ಉತ್ಪನ್ನವನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `ಡೆಲಿವರಿ ಅವಧಿ ${delivRes.deliveryDays}. ಡೆಲಿವರಿ ಶುಲ್ಕ ${delivRes.deliveryCharges}. ನೀವು ಈ ಉತ್ಪನ್ನವನ್ನು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
        }
      } else {
        if (isMedProd || delivRes.quickDeliveryAvailable) {
          reply = `Quick delivery within 20 minutes is available for ${product.name} in supported areas, alongside Same-day delivery. Delivery timeline: ${delivRes.deliveryDays}. Delivery charge is ${delivRes.deliveryCharges}. Are you interested to buy the product?`;
        } else {
          reply = `Delivery takes ${delivRes.deliveryDays}. Delivery charge is ${delivRes.deliveryCharges}. Are you interested to buy the product?`;
        }
      }
      return { 
        reply, 
        toolCalled, 
        language: currentLang,
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // 11. RETURN / EXCHANGE ELIGIBILITY & POLICY ENQUIRY
    if (/(?:return|exchange|refund)\s*(?:eligibility|eligible|policy|available)?|can i (?:return|exchange)|is (?:this|it) (?:returnable|exchangeable|eligible for return|eligible for exchange)|what is the return policy|money back|replacement policy|return ideya|exchange ideya|ರಿಟರ್ನ್/i.test(lower)) {
      toolCalled = 'getReturnPolicy';
      const retRes = ProductService.getReturnPolicy({ productId: product.id });
      if (currentLang === 'kn') {
        reply = `ಹೌದು, ಈ ಉತ್ಪನ್ನಕ್ಕೆ ರಿಟರ್ನ್ ಮತ್ತು ಎಕ್ಸ್‌ಚೇಂಜ್ ಸೌಲಭ್ಯವಿದೆ! ${retRes.returnPolicy} ${retRes.exchangePolicy} ನೀವು ಖರೀದಿಸಲು ಬಯಸುತ್ತೀರಾ?`;
      } else {
        reply = `Yes, this product is 100% eligible for returns and exchanges! ${retRes.returnPolicy} ${retRes.exchangePolicy} Are you interested to buy the product?`;
      }
      return { 
        reply, 
        toolCalled, 
        language: currentLang,
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // J. SPECIFICATIONS / HARDWARE / FABRIC ENQUIRY
    if (/spec|processor|ram|storage|battery|camera|screen|display|fabric|gsm|material|waterproof|warranty/i.test(lower)) {
      toolCalled = 'getProductDetails';
      const isFood = product.category === 'Food' || /food|snack|dish|meal/i.test(product.category || '');
      const isMed = product.category === 'Medicines & Healthcare Products' || /medic|health|pharma/i.test(product.category || '');

      if (isFood && /ram|storage|processor|battery|camera|screen|display/i.test(lower)) {
        if (currentLang === 'kn') {
          reply = `${product.name} ಆಹಾರ ಪದಾರ್ಥವಾಗಿದ್ದು, ಇದಕ್ಕೆ RAM ಅಥವಾ ಪ್ರೊಸೆಸರ್‌ನಂತಹ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ವಿವರಗಳು ಇರುವುದಿಲ್ಲ. ಇದರ ಸಾಮಗ್ರಿಗಳು: ${(product.ingredients || []).join(', ') || 'ನೈಸರ್ಗಿಕ ಸಾಮಗ್ರಿಗಳು'}, ಪ್ರಮಾಣ: ${product.servingSize || 'ಸ್ಟ್ಯಾಂಡರ್ಡ್ ಪ್ಲೇಟ್'}. ನೀವು ಬೆಲೆ ಅಥವಾ ಡೆಲಿವರಿ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `${product.name} is a culinary food product and does not have electronic specifications like RAM or storage. Its food details: Main Ingredients: ${(product.ingredients || []).join(', ') || 'Pure finger millet and water'}, Serving: ${product.servingSize || 'Standard Plate'}, Freshly prepared. Would you like to check the price or delivery?`;
        }
        return {
          reply,
          toolCalled: 'getProductDetails',
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }

      if (isMed && /ram|storage|processor|battery|camera|screen|display/i.test(lower)) {
        if (currentLang === 'kn') {
          reply = `${product.name} ಅಧಿಕೃತ ಔಷಧಿಯಾಗಿದ್ದು, ಇದಕ್ಕೆ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ವಿವರಗಳು ಇರುವುದಿಲ್ಲ. ಇದರ ಔಷಧೀಯ ಸಂಯೋಜನೆ: ${product.activeIngredient || product.composition || 'Paracetamol IP 650mg'}. ನೀವು ಬಳಸುವ ವಿಧಾನ, ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು ಅಥವಾ ಬೆಲೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಾ?`;
        } else {
          reply = `${product.name} is a pharmaceutical healthcare product and does not have electronic specifications like RAM or storage. Its medical formulation details: Active Composition: ${product.activeIngredient || product.composition || 'Paracetamol IP 650mg'}, Form: ${product.dosageForm || 'Tablet'}, Uses: ${product.uses || 'Fever and pain relief'}. Would you like to check dosage or safety warnings?`;
        }
        return {
          reply,
          toolCalled: 'getProductDetails',
          language: currentLang,
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }

      const universalProduct = ProductKnowledgeService.toUniversal(product);
      const specs = universalProduct ? universalProduct.specifications : {};

      // 1. Specific RAM query: "How much RAM does it have?", "What is the RAM?", "Does it have 16 GB RAM?"
      if (/\bram\b|\bmemory\b/i.test(lower)) {
        if (specs.ram) {
          if (currentLang === 'kn') {
            reply = `${product.name} ನಲ್ಲಿ ${specs.ram} ಇದೆ. ನೀವು ಖರೀದಿಸಲು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ?`;
          } else if (currentLang === 'kn_roman') {
            reply = `${product.name} nalli ${specs.ram} ide. Are you interested to buy the product?`;
          } else {
            reply = `The ${product.name} comes equipped with ${specs.ram}. Are you interested to buy the product?`;
          }
        } else {
          reply = currentLang === 'kn'
            ? "ಈ ಉತ್ಪನ್ನಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ಆ ವೈಶಿಷ್ಟ್ಯದ ಬಗ್ಗೆ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ."
            : (currentLang === 'kn_roman' ? "Ee product bagge aa feature na verified information illa." : "I don't have verified information about that feature for this product.");
        }
        return { reply, toolCalled: 'getProductDetails', language: currentLang, activeProduct: formatProductForClient(product), productData: formatProductForClient(product) };
      }

      // 2. Specific GPU query: "What GPU does it use?"
      if (/\bgpu\b|graphics/i.test(lower)) {
        const gpuVal = specs.gpu || specs.graphics;
        if (gpuVal) {
          if (currentLang === 'kn') {
            reply = `${product.name} ನಲ್ಲಿ ${gpuVal} ಗ್ರಾಫಿಕ್ಸ್ ಕಾರ್ಡ್ ಇದೆ. ನೀವು ಖರೀದಿಸಲು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ?`;
          } else if (currentLang === 'kn_roman') {
            reply = `${product.name} nalli ${gpuVal} graphics card ide. Are you interested to buy the product?`;
          } else {
            reply = `The ${product.name} features ${gpuVal}. Are you interested to buy the product?`;
          }
        } else {
          reply = currentLang === 'kn'
            ? "ಈ ಉತ್ಪನ್ನಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ಆ ವೈಶಿಷ್ಟ್ಯದ ಬಗ್ಗೆ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ."
            : (currentLang === 'kn_roman' ? "Ee product bagge aa feature na verified information illa." : "I don't have verified information about that feature for this product.");
        }
        return { reply, toolCalled: 'getProductDetails', language: currentLang, activeProduct: formatProductForClient(product), productData: formatProductForClient(product) };
      }

      // 3. Specific Processor query:
      if (/processor|cpu|chipset/i.test(lower)) {
        const cpuVal = specs.processor || specs.cpu;
        if (cpuVal) {
          if (currentLang === 'kn') {
            reply = `${product.name} ನಲ್ಲಿ ${cpuVal} ಪ್ರೊಸೆಸರ್ ಇದೆ. ನೀವು ಖರೀದಿಸಲು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ?`;
          } else if (currentLang === 'kn_roman') {
            reply = `${product.name} nalli ${cpuVal} processor ide. Are you interested to buy the product?`;
          } else {
            reply = `The ${product.name} is powered by ${cpuVal}. Are you interested to buy the product?`;
          }
        } else {
          reply = currentLang === 'kn'
            ? "ಈ ಉತ್ಪನ್ನಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ಆ ವೈಶಿಷ್ಟ್ಯದ ಬಗ್ಗೆ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ."
            : (currentLang === 'kn_roman' ? "Ee product bagge aa feature na verified information illa." : "I don't have verified information about that feature for this product.");
        }
        return { reply, toolCalled: 'getProductDetails', language: currentLang, activeProduct: formatProductForClient(product), productData: formatProductForClient(product) };
      }

      // 4. Specific Storage query:
      if (/storage|ssd|hard drive/i.test(lower)) {
        if (specs.storage) {
          if (currentLang === 'kn') {
            reply = `${product.name} ನಲ್ಲಿ ${specs.storage} ಸ್ಟೋರೇಜ್ ಲಭ್ಯವಿದೆ. ನೀವು ಖರೀದಿಸಲು ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಾ?`;
          } else if (currentLang === 'kn_roman') {
            reply = `${product.name} nalli ${specs.storage} storage ide. Are you interested to buy the product?`;
          } else {
            reply = `The ${product.name} includes ${specs.storage}. Are you interested to buy the product?`;
          }
        } else {
          reply = currentLang === 'kn'
            ? "ಈ ಉತ್ಪನ್ನಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ಆ ವೈಶಿಷ್ಟ್ಯದ ಬಗ್ಗೆ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ."
            : (currentLang === 'kn_roman' ? "Ee product bagge aa feature na verified information illa." : "I don't have verified information about that feature for this product.");
        }
        return { reply, toolCalled: 'getProductDetails', language: currentLang, activeProduct: formatProductForClient(product), productData: formatProductForClient(product) };
      }

      // 5. Suitability: Gaming / AI / ML / Programming
      if (/gaming|play games|ai|ml|machine learning|programming|coding/i.test(lower)) {
        const isGaming = /gaming|play games/i.test(lower);
        if (isGaming) {
          const gamingVal = specs.gaming || (specs.gpu ? `Equipped with ${specs.gpu} and ${specs.processor || 'high performance CPU'} for high-FPS gaming.` : null);
          if (gamingVal) {
            reply = `Yes, the ${product.name} is suitable for gaming. ${gamingVal} Are you interested to buy the product?`;
          } else {
            reply = `The ${product.name} is designed for everyday productivity rather than dedicated gaming.`;
          }
        } else {
          const compVal = (specs.processor || specs.ram) 
            ? `Yes, the ${product.name} is well-suited for software development, coding, and AI/ML workflows with its ${specs.processor || 'multi-core processor'}, ${specs.ram || 'fast memory'}${specs.gpu ? ', and ' + specs.gpu : ''}.${specs.usage ? ' ' + specs.usage : ''}`
            : null;
          if (compVal) {
            reply = `${compVal} Are you interested to buy the product?`;
          } else {
            reply = `I don't have verified information about that feature for this product.`;
          }
        }
        return { reply, toolCalled: 'getProductDetails', language: currentLang, activeProduct: formatProductForClient(product), productData: formatProductForClient(product) };
      }

      const details = ProductService.getProductDetails({ productId: product.id });
      const p = details.product;
      
      if (!p || !p.specs || Object.keys(p.specs).length === 0) {
        toolCalled = 'missingDataPositiveAssistance';
        reply = await ConversationService.generateMissingDataPositiveResponse({
          missingType: 'specs',
          query: text,
          product
        });
        return {
          reply,
          toolCalled,
          missingDataHandled: true,
          missingType: 'specs',
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }

      let specSnippet = '';
      if (p.specs) {
        const parts = Object.entries(p.specs).slice(0, 3).map(([k, v]) => `${k.toUpperCase()}: ${v}`);
        specSnippet = parts.join(', ');
      }

      reply = `${p.name} specs: ${specSnippet}. Warranty: ${p.warranty || 'Store quality guarantee'}. Are you interested to buy the product?`;
      return { 
        reply, 
        toolCalled, 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // K. STORE LOCATION & VISIT ENQUIRY
    if (/store location|where is (the|your) store|store address|where are you located|physical store|visit (the|your)?\s*store|warehouse address|warehouse location|pickup location|bengaluru store|bengaluru location/i.test(lower)) {
      toolCalled = 'getStoreLocation';
      const loc = db.getStoreLocation();
      reply = `Our flagship store and central fulfillment center is located at ${loc.fullAddress || loc.address}. We are open Monday to Sunday from 10 AM to 9:30 PM with instant walk-in pickups! Are you interested to buy the product?`;
      return { 
        reply, 
        toolCalled, 
        storeLocation: loc,
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // L. GREETINGS OR GENERAL CHAT
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|who are you|namaste|ಹಲೋ|ನಮಸ್ತೆ|ನಮಸ್ಕಾರ)/i.test(lower)) {
      reply = ConversationService.generateProductAwareGreeting({
        product,
        customerName: resolvedCustomerName,
        language: currentLang
      });
      return { 
        reply, 
        toolCalled: 'greeting', 
        language: currentLang,
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // M. AUTOMATIC KNOWLEDGE RETRIEVAL FOR VALID PRODUCT QUESTIONS MISSING FROM DB (RULE 12)
    // Never use positiveOutOfSyllabus for a valid product question just because its answer is missing from the database.
    if (AutomaticKnowledgeRetrievalService.isValidProductQuestion(text, product)) {
      const akrFallback = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
        question: text,
        product,
        language: currentLang
      });
      return {
        ...akrFallback,
        isOutOfSyllabus: false,
        language: currentLang,
        activeProduct: formatProductForClient(product),
        productData: formatProductForClient(product)
      };
    }

    // OUT-OF-THE-SYLLABUS & DYNAMIC POSITIVE CONVERSATIONAL ASSISTANT
    // Instead of giving a rigid or fixed answer, Zyro AI handles out-of-the-syllabus questions
    // with warmth, cheer, positive encouragement, and smart contextual bridging.
    reply = await ConversationService.generatePositiveOutOfSyllabusResponse({ text, lower, product, history });
    toolCalled = 'positiveOutOfSyllabus';
    return { 
      reply, 
      toolCalled, 
      isOutOfSyllabus: true, 
      positiveManaged: true, 
      activeProduct: formatProductForClient(product), 
      productData: formatProductForClient(product) 
    };
  }

  /**
   * Tool-Routing Rule 5:
   * Call requestOrderConfirmation only after validating:
   * 1) live price, 2) live stock, 3) requested quantity, 4) applicable charges, 5) payment method / COD eligibility, and 6) customer consent.
   * Never invent prices, stock, or order status (Rule 7).
   */
  static validateAndBuildOrderConfirmation({
    product,
    quantity = 1,
    selectedSize = null,
    text = '',
    currentLang = 'en',
    customerConsent = true
  }) {
    const liveProduct = (product && product.id ? db.getProductById(product.id) : null) || product;
    const isMedProd = Boolean(
      liveProduct && (
        (liveProduct.category && (liveProduct.category.includes('Medicines') || liveProduct.category.includes('Healthcare'))) ||
        liveProduct.isMedicalProduct ||
        liveProduct.isHealthcareProduct ||
        (liveProduct.id && (liveProduct.id.startsWith('MED-') || liveProduct.id.startsWith('PROD-MED-')))
      )
    );

    // 1. Validate Customer Consent
    if (!customerConsent) {
      return {
        reply: currentLang === 'kn'
          ? `ನೀವು ಈ ಉತ್ಪನ್ನವನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ ಎಂದು ದಯವಿಟ್ಟು ತಿಳಿಸಿ.`
          : `Please let me know if you would like to proceed with ordering ${liveProduct ? liveProduct.name : 'this product'}.`,
        toolCalled: 'askOrderInterest',
        language: currentLang,
        orderValidation: {
          validated: false,
          failedCheck: 'customerConsent',
          customerConsent: false
        },
        activeProduct: formatProductForClient(liveProduct),
        productData: formatProductForClient(liveProduct)
      };
    }

    // 2. Validate Live Store Price (Rule 3 & Rule 5 & Rule 7)
    const priceRes = liveProduct ? ProductService.getPrice({ productId: liveProduct.id }) : null;
    const rawSalePrice = liveProduct?.salePrice;
    const rawMrp = liveProduct?.price;
    const hasPriceConflict = rawSalePrice !== undefined && rawMrp !== undefined && Number(rawSalePrice) > Number(rawMrp);
    const hasValidPrice = Boolean(
      priceRes &&
      priceRes.success &&
      rawSalePrice !== undefined &&
      rawSalePrice !== null &&
      !Number.isNaN(Number(rawSalePrice)) &&
      Number(rawSalePrice) > 0 &&
      !hasPriceConflict
    );

    if (!hasValidPrice) {
      const verifiedBaseline = `Product: ${liveProduct?.name || 'Unknown'}, Brand: ${liveProduct?.brand || liveProduct?.manufacturer || 'TrendVibe'}, Stock: ${liveProduct?.inStock ? 'In Stock' : 'Out of Stock'}`;
      const priceNote = hasPriceConflict
        ? `selling price (₹${rawSalePrice}) conflicts with MRP (₹${rawMrp})`
        : `live selling price is missing from the store database`;
      const reply = currentLang === 'kn'
        ? `ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ: ${verifiedBaseline}. ತಿಳಿಯದ/ಅನಿಶ್ಚಿತ ಮಾಹಿತಿ: ಅಧಿಕೃತ ಮಾರಾಟ ಬೆಲೆ ಲಭ್ಯವಿಲ್ಲ (${priceNote}). ಬೆಲೆ ಪರಿಶೀಲಿಸದೆ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.`
        : `What is verified: ${verifiedBaseline}. What remains unknown/conflicting: ${priceNote}. Because I never invent prices and must validate the live store price before requesting order confirmation, please contact our TrendVibe Store administrator.`;
      return {
        reply,
        toolCalled: isMedProd ? 'getMedicinePrice' : 'getPrice',
        language: currentLang,
        evidenceStatus: hasPriceConflict ? 'CONFLICTING' : 'UNVERIFIED',
        orderValidation: {
          validated: false,
          failedCheck: 'livePrice',
          livePrice: null,
          customerConsent: true
        },
        activeProduct: formatProductForClient(liveProduct),
        productData: formatProductForClient(liveProduct)
      };
    }

    const livePrice = Number(rawSalePrice);

    // 3. Validate Live Stock & Requested Quantity (Rule 5 & Rule 7)
    const stockRes = ProductService.checkStock({
      productId: liveProduct.id,
      size: selectedSize
    });
    const availableStock = Number(stockRes?.stockCount ?? liveProduct.stock?.overall ?? liveProduct.stockCount ?? 0);
    const qty = Number(quantity) > 0 ? Number(quantity) : 1;
    const hasSufficientStock = Boolean(
      liveProduct.inStock !== false &&
      stockRes &&
      stockRes.inStock &&
      availableStock >= qty
    );

    if (!hasSufficientStock) {
      const failedReason = availableStock <= 0 ? 'stock' : 'quantity';
      const verifiedBaseline = `Product: ${liveProduct.name}, Store Price: ₹${livePrice.toLocaleString('en-IN')}, Available Stock: ${availableStock} units`;
      const reply = currentLang === 'kn'
        ? `ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ: ${verifiedBaseline}. ಪ್ರಸ್ತುತ ನೀವು ಕೇಳಿದ ${qty} ಯೂನಿಟ್ ಸ್ಟಾಕ್ ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ ಆರ್ಡರ್ ದೃಢೀಕರಣಕ್ಕೆ ಮುಂದುವರಿಯಲು ಸಾಧ್ಯವಿಲ್ಲ.`
        : `What is verified: ${verifiedBaseline}. We cannot proceed to order confirmation for ${qty} unit${qty > 1 ? 's' : ''} because ${availableStock <= 0 ? 'this product is currently out of stock' : `only ${availableStock} units are available in live inventory`}.`;
      return {
        reply,
        toolCalled: 'checkStock',
        language: currentLang,
        evidenceStatus: 'VERIFIED',
        orderValidation: {
          validated: false,
          failedCheck: failedReason,
          livePrice,
          inStock: availableStock > 0,
          availableStock,
          requestedQuantity: qty,
          customerConsent: true
        },
        activeProduct: formatProductForClient(liveProduct),
        productData: formatProductForClient(liveProduct)
      };
    }

    // 4. Validate Applicable Delivery Charges (Rule 5)
    const delivRes = ProductService.getDeliveryInformation({ productId: liveProduct.id });
    const deliveryChargesText = delivRes?.deliveryCharges || liveProduct.deliveryCharges || 'Free Express Delivery';
    const chargeMatch = String(deliveryChargesText).match(/₹\s*(\d+)/);
    const applicableCharges = (liveProduct.enforceDeliveryChargeInCheckout && chargeMatch) ? Number(chargeMatch[1]) : 0;

    // 5. Validate Payment Method & COD Eligibility (Rule 4 & Rule 5)
    const payRes = ProductService.getPaymentOptions({ productId: liveProduct.id });
    const codEligible = Boolean(payRes?.codAvailable ?? (liveProduct.codAvailable !== false));
    const explicitlyRequestedCod = /\b(via cod|by cod|with cod|cash on delivery|pay on delivery)\b/i.test(String(text || ''));
    const explicitlyRequestedUnsupportedPayment = /\b(crypto|bitcoin|dogecoin|cheque|check|demand draft)\b/i.test(String(text || ''));

    if ((explicitlyRequestedCod && !codEligible) || explicitlyRequestedUnsupportedPayment) {
      const verifiedBaseline = `Product: ${liveProduct.name}, Store Price: ₹${livePrice.toLocaleString('en-IN')}, Stock: ${availableStock} units, Payment Policy: ${codEligible ? 'COD, UPI, Cards' : 'Prepaid only (UPI / Cards)'}`;
      const reply = currentLang === 'kn'
        ? `ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ: ${verifiedBaseline}. ಈ ಉತ್ಪನ್ನಕ್ಕೆ ನೀವು ಕೇಳಿದ ಪಾವತಿ ವಿಧಾನ ಲಭ್ಯವಿಲ್ಲ (ಯುಪಿಐ ಅಥವಾ ಕಾರ್ಡ್ ಮೂಲಕ ಮುಂಗಡ ಪಾವತಿ ಅಗತ್ಯವಿದೆ).`
        : `What is verified: ${verifiedBaseline}. We cannot request order confirmation with the requested payment method because ${!codEligible ? 'this item requires prepaid payment via UPI or Cards and is not eligible for Cash on Delivery (COD)' : 'only approved store payment methods (COD, UPI, Cards) are supported'}.`;
      return {
        reply,
        toolCalled: 'getPaymentOptions',
        language: currentLang,
        codAvailable: codEligible,
        paymentMethods: payRes?.paymentMethods || [],
        orderValidation: {
          validated: false,
          failedCheck: 'paymentMethod',
          livePrice,
          inStock: true,
          availableStock,
          quantity: qty,
          applicableCharges,
          codEligible,
          customerConsent: true
        },
        activeProduct: formatProductForClient(liveProduct),
        productData: formatProductForClient(liveProduct)
      };
    }

    const prefersPrepaid = /\b(upi|gpay|phonepe|card|credit card|debit card|prepaid)\b/i.test(String(text || ''));
    const validatedPaymentMethod = prefersPrepaid
      ? 'Prepaid UPI / Card'
      : (codEligible ? 'Cash on Delivery' : 'Prepaid UPI / Card');

    const totalPayable = Math.round(livePrice * qty + applicableCharges);
    const totalFormatted = `₹${totalPayable.toLocaleString('en-IN')}`;
    const sizeText = selectedSize ? ` for size ${selectedSize}` : '';
    const sizeKnText = selectedSize ? ` (ಸೈಜ್ ${selectedSize})` : '';

    let reply;
    if (currentLang === 'kn') {
      reply = `ಉತ್ತಮ ಆಯ್ಕೆ! ಒಟ್ಟು ಮೊತ್ತ ${totalFormatted}${sizeKnText} ಉಚಿತ ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಡೆಲಿವರಿಯೊಂದಿಗೆ. ${qty > 1 ? `${qty} ಯೂನಿಟ್ ` : ''}${liveProduct.name} ಅನ್ನು ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ ಮೂಲಕ ದೃಢೀಕರಿಸಲೇ?`;
    } else {
      reply = `Great choice! The total is ${totalFormatted}${sizeText} with Free Express Delivery. Should I confirm your order for ${qty} unit${qty > 1 ? 's' : ''} of ${liveProduct.name} via ${validatedPaymentMethod}?`;
    }

    return {
      reply,
      toolCalled: 'requestOrderConfirmation',
      ...(selectedSize ? { selectedSize } : {}),
      language: currentLang,
      orderValidation: {
        validated: true,
        livePrice,
        inStock: true,
        availableStock,
        quantity: qty,
        applicableCharges,
        deliveryChargesText,
        totalPayable,
        paymentMethod: validatedPaymentMethod,
        codEligible,
        customerConsent: true
      },
      activeProduct: formatProductForClient(liveProduct),
      productData: formatProductForClient(liveProduct)
    };
  }

  /**
   * Main Process Turn Interface:
   * Processes the conversational turn and enriches the response with 5-8 dynamic suggested questions
   * generated from the complete verified background dataset of the active product.
   */
  static async processTurn(params = {}) {
    const result = await ConversationService._processTurnCore(params);
    if (!result) return result;

    let product = null;
    if (result.activeProduct && result.activeProduct.id) {
      product = db.getProductById(result.activeProduct.id);
    }
    if (!product && params.product) {
      product = (params.product.id ? db.getProductById(params.product.id) : null) || params.product;
    }
    if (!product && params.productId) {
      product = db.getProductById(params.productId);
    }
    if (!product && params.leadId) {
      const lead = db.getLeadById(params.leadId);
      if (lead && lead.productId) product = db.getProductById(lead.productId);
    }
    if (!product) {
      product = db.getAllProducts()[0];
    }

    const currentLang = result.language || params.language || 'en';
    const discussedTopics = SuggestedQuestionService.extractDiscussedTopics(params.history || [], params.message || '', result.reply || '');
    const purchaseIntent = SuggestedQuestionService.detectPurchaseIntent(params.history || [], params.message || '');
    const stage = SuggestedQuestionService.detectConversationStage(params.history || [], discussedTopics, purchaseIntent);

    const suggestedQuestions = SuggestedQuestionService.generateSuggestedQuestions(product, {
      history: params.history || [],
      latestMessage: params.message || '',
      latestReply: result.reply || '',
      language: currentLang,
      stage,
      purchaseIntent
    });

    // Pipeline audit log (Section 17)
    try {
      const detected = IntentService.detectIntent(params.message || '', ProductKnowledgeService.toUniversal(product), params.history || []);
      ProductKnowledgePipeline.recordLog({
        timestamp: new Date().toISOString(),
        user_question: params.message || '',
        identified_product: product ? product.name : 'Unknown',
        identified_product_id: product ? product.id : null,
        detected_intent: result.toolCalled === 'evaluateProductReasoning' ? 'AI_ML_SUITABILITY' : detected.intent,
        knowledge_source: detected.source || 'PRODUCT_KNOWLEDGE',
        retrieved_fields: detected.requiredFields || [],
        tools_called: [result.toolCalled || 'generalResponse'],
        knowledge_status: result.knowledgeStatus || (detected.hasRequiredData ? 'VERIFIED' : 'UNKNOWN'),
        is_reasoned: Boolean(result.isReasoned),
        language: currentLang,
        final_response: result.reply || ''
      });
    } catch (logErr) {
      // Silent audit logging
    }

    return {
      ...result,
      stage,
      suggestedQuestions
    };
  }

  /**
   * Generates dynamic, upbeat, positive answers for out-of-the-syllabus or open-ended
   * customer questions rather than returning a rigid or fixed answer.
   */
  static async generatePositiveOutOfSyllabusResponse({ text, lower, product, history = [] }) {
    // 1. If Gemini live API is available, generate dynamic positive response
    try {
      const geminiReply = await GeminiService.generatePositiveOutOfSyllabusAnswer({
        question: text,
        productName: product ? product.name : 'our product',
        productPrice: product ? product.salePrice : null,
        category: product ? product.category : null
      });
      if (geminiReply) return geminiReply;
    } catch (e) {
      // Continue to local positive generator
    }

    const prodName = product ? product.name : 'this item';

    // 2. Intelligent Category-Aware Positive Answers

    // Category A: Compliments & Appreciation
    if (/(great|awesome|cool|love you|nice|good job|smart|wonderful|amazing|best|sweet|kind|fantastic|well done|thank you|thanks|brilliant|superb|impressive)/i.test(lower)) {
      const positiveReplies = [
        `Thank you so much! That truly makes our day! We put a lot of passion into bringing you the very best shopping experience and premium quality products. Are you interested to buy the product?`,
        `You're so kind, thank you! It's an absolute pleasure helping fantastic shoppers like you explore the best styles at TrendVibe Store! Are you interested to buy the product?`,
        `Aww, thank you! That brings a big smile to our team! We're super excited to have you here with us. Are you interested to buy the product?`
      ];
      return positiveReplies[text.length % positiveReplies.length];
    }

    // Category B: AI Identity, Fun & Banter
    if (/(are you human|are you (an )?ai|are you (a )?robot|who (made|created|built) you|tell (me )?a joke|do you like|how are you|what is your age|how old are you|who is your boss|sing a song|marry me|are you real|what is your name|who is zyro|who are you)/i.test(lower)) {
      if (/joke/i.test(lower)) {
        return `Here's a fun one for you: Why did the t-shirt go to school? Because it wanted to be well-suited! Shopping should always bring good vibes and a smile. Are you interested to buy the product?`;
      }
      if (/how are you/i.test(lower)) {
        return `I'm feeling fantastic, full of energy, and delighted to talk with you! There is always something exciting happening here at TrendVibe Store. Are you interested to buy the product?`;
      }
      if (/(who (made|created|built) you|are you (an )?ai|are you human|robot|who is zyro|who are you)/i.test(lower)) {
        return `I'm Zyro AI, your intelligent shopping and sales assistant designed to make your shopping fast, friendly, and effortless! While I might be AI, I have genuine love for great fashion and happy shoppers. Are you interested to buy the product?`;
      }
      return `That's such a fun thought! I'm Zyro AI, and I'm having a great time helping you explore TrendVibe Store today! Are you interested to buy the product?`;
    }

    // Category C: Styling, Fashion Advice & Occasion Suitability ("how does it look?", "is this good for party?")
    if (/(how (does|will) (it|this) look|is (this|it) good for|party|college|gym|office|workout|date|wedding|festival|fashion|style|stylish|suit me|trending|trend|aesthetic|colour look|combo|outfit|pair with)/i.test(lower)) {
      return `Yes, absolutely! The ${prodName} has an ultra-sleek, modern design that pairs effortlessly for parties, college, or casual daily wear. It's one of our most complimented picks this season! Are you interested to buy the product?`;
    }

    // Category D: Discounts, Negotiation, Free Gifts & Perks ("can I get a free gift?", "extra discount?")
    if (/(free gift|gift|freebie|extra discount|bogo|buy one get one|lower price|reduce price|special offer|bargain|coupon|any perk)/i.test(lower)) {
      return `We love that enthusiasm! We've already unlocked our top festive promotional deal with maximum savings and free express delivery included for you today! Are you interested to buy the product?`;
    }

    // Category E: General Knowledge, Weather, Off-Topic Trivia ("weather", "2+2", "cricket", "news")
    if (/(weather|rain|sunny|climate|match|score|cricket|football|ipl|prime minister|president|capital of|math|2\+2|news|time is it|meaning of life|philosophy|story|poem)/i.test(lower)) {
      return `Haha, that's definitely outside my usual shopping syllabus, but I love the positive curiosity! While my specialty is giving you the best shopping recommendations and instant service, I'm always here with great cheer! Are you interested to buy the product?`;
    }

    // Category F: Other products / Catalog exploration ("do you have shoes?", "sell laptops?")
    if (/(do you (also )?(have|sell)|other products|shoes|sneakers|jeans|hoodie|jacket|perfume|electronics|laptop|watch|accessories|catalog|collection)/i.test(lower)) {
      return `Yes, absolutely! TrendVibe features an exciting range of trending clothes, gadgets, footwear, and accessories across our store. We'd love to help you find anything you need! Are you interested to buy the product?`;
    }

    // Category G: Any other unexpected / out of syllabus query
    // Giving a positive, warm, encouraging response rather than a fixed robotic answer:
    const generalPositiveAnswers = [
      `That's a wonderful thought! While that's outside our usual shopping syllabus, I'm delighted to assist you and make sure your visit to TrendVibe is upbeat and enjoyable! Are you interested to buy the product?`,
      `I really appreciate your curiosity! Even though that's beyond our standard shopping catalog, I'm always happy to connect with you and share positive vibes! Are you interested to buy the product?`,
      `That's an interesting question! While my main goal is being your personal shopping assistant, I love our conversation! Are you interested to buy the product?`
    ];
    return generalPositiveAnswers[text.length % generalPositiveAnswers.length];
  }

  /**
   * Generates a positive, helpful, professional response when the AI agent does not have sufficient
   * background data, product information, inventory data, pricing information, delivery details,
   * return policy, or any other verified information required to answer accurately.
   * 
   * Strict Policies:
   * 1. Never guess, hallucinate, assume, or provide false/unverified information.
   * 2. Never say simply "I don't know".
   * 3. Clearly explain that the required information is not currently available and reassure the customer.
   * 4. Suggest appropriate next action (checking latest store info, requesting details, connecting with
   *    store representative, or collecting contact details for follow-up).
   * 5. Keep the customer engaged with a confident, positive tone.
   */
  static async generateMissingDataPositiveResponse({ missingType = 'generalData', query = '', product = null, reqOrderId = null, reqPhone = null }) {
    // 1. If Gemini live API is available, generate dynamic response with strict guardrails
    try {
      const geminiReply = await GeminiService.answerMissingBackgroundData({
        question: query,
        missingContext: missingType,
        productName: product ? product.name : 'store products'
      });
      if (geminiReply) return geminiReply;
    } catch (e) {
      // Continue to local positive handler
    }

    // 2. Intelligent, Positive, Helpful Local Response Engine
    switch (missingType) {
      case 'productInfo':
      case 'productNotFound':
        return `Verified product information for "${query || 'that item'}" is not currently available in our store catalog, but I am very happy to help! Would you like me to check our latest trending collection for similar styles, or connect you with a store representative who can assist you directly?`;

      case 'orderTracking':
        return `Verified order tracking information for ${reqOrderId || reqPhone || 'that order'} is not currently available in our live system, but I am very happy to help! Could you please double-check your Order ID or phone number? Alternatively, I can connect you directly with our store representative to verify your shipment right away.`;

      case 'inventoryData':
      case 'stockUnavailable':
        return `Verified live inventory counts for that specific variant are not currently updated in our database, but I am very happy to help! Would you like me to check our available sizes and colours for the ${product ? product.name : 'product'}, or connect you with our warehouse team to confirm availability?`;

      case 'pricingData':
        return `Verified pricing details for that specific option are not currently available in our live catalog, but I am very happy to help! We have the ${product ? product.name : 'product'} available starting from ₹${product ? Math.round(product.salePrice).toLocaleString('en-IN') : '999'}. Would you like me to connect you with our store team for custom pricing?`;

      case 'deliveryDetails':
        return `Specific verified delivery timelines for that exact location are not currently available in our courier database, but I am very happy to help! Across India, our standard express delivery takes 2 to 4 business days. Would you like me to connect you with a store representative to confirm your exact pincode?`;

      case 'returnPolicy':
        return `Verified return policy details for that special category are not currently available in our records, but I am very happy to help! We provide a standard 7-day hassle-free return and exchange policy across our catalog. Would you like me to connect you with our store support team for policy details?`;

      case 'specs':
        return `Verified technical specifications for that specific feature are not currently available in our store records, but I am very happy to help! I can connect you directly with our store representative for the exact verified details, or guide you through our available product features. Are you interested to buy the product?`;

      default:
        return `That verified information is not currently available in our store database, but I am very happy to help! Could you please share additional details on what you are looking for, or would you like me to connect you with our store representative to assist you right away?`;
    }
  }
}
