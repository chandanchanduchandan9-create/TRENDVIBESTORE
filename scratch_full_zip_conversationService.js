import { ProductService } from './productService.js';
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
    imageUrl: p.imageUrl,
    videoUrl: p.videoUrl,
    instagramVideoPostUrl: p.instagramVideoPostUrl,
    inStock: p.inStock,
    stockCount: p.stockCount || 15,
    colours: p.colours || [],
    sizes: p.sizes || [],
    deliveryDays: p.deliveryDays || '2-3 days',
    codAvailable: p.codAvailable ?? true,
    specs: p.specs || {},
    healthcareDetails: p.healthcareDetails || null,
    returnPolicy: p.returnPolicy || 'Please confirm the store policy.'
  };
};

/**
 * Service that handles interactive live conversational turns between the customer and AI.
 * Parses customer voice speech, calls corresponding backend tools in real time,
 * and generates concise, natural conversational responses suitable for voice synthesis.
 */
export class ConversationService {
  static async processTurn({ message, leadId, productId, history = [] }) {
    const text = (message || '').trim();
    if (!text) {
      return {
        reply: "I'm sorry, I didn't quite catch that. Could you please repeat?",
        toolCalled: null
      };
    }

    const lower = text.toLowerCase();

    // 1. Identify Default Video-Linked Product
    let product = productId ? db.getProductById(productId) : null;
    let lead = leadId ? db.getLeadById(leadId) : null;

    if (!product && lead && lead.productId) {
      product = db.getProductById(lead.productId);
    }
    if (!product) {
      // Recognize the demo balm name in both English and Kannada transliteration.
      const mentionsMenthoBalm = /mentho\s*plus|mentho|ಮೆಂತೋ|ಮೆಂಥೋ|ಬಾಮ್/i.test(text);
      product = (mentionsMenthoBalm ? db.getProductById('MED-BALM-001') : null)
        || db.findProductByQuery(text)
        || db.getAllProducts()[0];
    }

    let reply = '';
    let toolCalled = null;
    let orderData = null;
    let humanHandoff = false;
    let activeProduct = product;

    // --- INTENT ROUTING & TOOL CALLS ---

    // Healthcare product questions: only use the explicit dataset fields and never invent medical claims.
    if (product?.healthcareDetails) {
      const h = product.healthcareDetails;
      const isKannada = /[\u0C80-\u0CFF]/.test(text) || /\b(kannada|ಕನ್ನಡ)\b/i.test(text);
      let healthcareAnswer = null;
      if (isKannada && /ಬೆಲೆ|ದರ|ಎಷ್ಟು ರೂ|ರಿಯಾಯಿತಿ|ಡಿಸ್ಕೌಂಟ್|ಆಫರ್/i.test(text)) {
        healthcareAnswer = `ಡೆಮೊ ಮಾರಾಟದ ಬೆಲೆ ₹${product.salePrice}. ಮಾದರಿ ಎಂಆರ್‌ಪಿ ₹${product.price}; ಮಾದರಿ ರಿಯಾಯಿತಿ ₹${product.price - product.salePrice}.`;
      } else if (isKannada && /ಸ್ಟಾಕ್|ಲಭ್ಯ|ಎಷ್ಟು ಪೀಸ್|ಎಷ್ಟು ಯೂನಿಟ್/i.test(text)) {
        const quantity = product.stockCount ?? product.stock?.overall ?? 0;
        healthcareAnswer = quantity > 0 ? `ಡೆಮೊ ಇನ್ವೆಂಟರಿಯಲ್ಲಿ ${quantity} ಯೂನಿಟ್‌ಗಳು ಲಭ್ಯವಿವೆ.` : `ಈ ಉತ್ಪನ್ನವು ಡೆಮೊದಲ್ಲಿ ಪ್ರಸ್ತುತ ಸ್ಟಾಕ್‌ನಲ್ಲಿ ಇಲ್ಲ.`;
      } else if (isKannada && /ಡೆಲಿವರಿ|ತಲುಪಲು|ಎಷ್ಟು ದಿನ|ಮನೆಗೆ/i.test(text)) {
        healthcareAnswer = `ಡೆಮೊ ಡೆಲಿವರಿ ಅಂದಾಜು ${product.deliveryDays}. ಡೆಲಿವರಿ ಶುಲ್ಕವನ್ನು ಡೆಮೊದಲ್ಲಿ ಹೊಂದಿಸಲಾಗಿಲ್ಲ.`;
      } else if (isKannada && /ಹಿಂತಿರುಗ|ರಿಟರ್ನ್|ಎಕ್ಸ್ಚೇಂಜ್|ಬದಲಾಯಿಸ/i.test(text)) {
        healthcareAnswer = `ಹಿಂತಿರುಗಿಸುವಿಕೆ ಅಥವಾ ವಿನಿಮಯವು ಅಂಗಡಿಯ ನೀತಿ ಮತ್ತು ಅನ್ವಯಿಸುವ ಕಾನೂನಿನ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿದೆ. ಸಿಬ್ಬಂದಿಯಿಂದ ದೃಢೀಕರಿಸಿ.`;
      } else if (isKannada && /ಯುಪಿಐ|ಪಾವತಿ|ನಗದು|ಕಾರ್ಡ್/i.test(text)) {
        healthcareAnswer = `ಡೆಮೊದಲ್ಲಿ UPI, ನಗದು ಮತ್ತು ಕಾರ್ಡ್ ಪಾವತಿ ಆಯ್ಕೆಗಳು ಮಾದರಿಯಾಗಿ ಸಕ್ರಿಯವಾಗಿವೆ.`;
      } else if (/ingredient|active ingredient|contains| ಪದಾರ್ಥ|ಯಾವ ಪದಾರ್ಥ|ಮೆಂಥಾಲ್|ಕರ್ಪೂರ/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ಪದಾರ್ಥಗಳ ನಿಖರ ಪಟ್ಟಿ ಈ ಡೆಮೊದಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಜವಾದ ಉತ್ಪನ್ನದ ಪ್ಯಾಕೆಟ್ ಪರಿಶೀಲಿಸಿ.`
          : h.ingredients;
      } else if (/pregnan|breastfeed|ಗರ್ಭಿಣಿ|ಸ್ತನ್ಯಪಾನ/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ಬಳಸುವ ಮೊದಲು ಉತ್ಪನ್ನದ ಲೇಬಲ್ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಆರೋಗ್ಯ ವೃತ್ತಿಪರರನ್ನು ಸಂಪರ್ಕಿಸಿ.`
          : h.pregnancyBreastfeeding;
      } else if (/baby|babies|child|children|kid|age restriction|ಮಗು|ಮಕ್ಕಳ|ಶಿಶು/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ಮಕ್ಕಳಿಗೆ ಸೂಕ್ತವೇ ಎಂಬುದು ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ. ಪ್ಯಾಕೆಟ್‌ನ ವಯೋಮಿತಿ ನೋಡಿ ಔಷಧ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ.`
          : h.ageRestrictions;
      } else if (/broken skin|wound|cut|irritated skin|ಗಾಯ|ಕತ್ತರ|ಚರ್ಮದ ಮೇಲೆ ಗಾಯ/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ಲೇಬಲ್ ಸ್ಪಷ್ಟವಾಗಿ ಅನುಮತಿಸದಿದ್ದರೆ ಗಾಯಗೊಂಡ ಅಥವಾ ಕೆರಳಿದ ಚರ್ಮದ ಮೇಲೆ ಹಚ್ಚಬೇಡಿ.`
          : h.brokenSkin;
      } else if (/eye|eyes|forehead|face|neck|ಕಣ್ಣು|ಹಣೆ|ಮುಖ|ಕುತ್ತಿಗೆ/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ಪ್ಯಾಕೆಟ್‌ನ ಬಳಕೆ ಸೂಚನೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಕಣ್ಣಿಗೆ ತಾಗದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.`
          : h.eyeContact;
      } else if (/side effect|allerg|rash|reaction|ಅಲರ್ಜಿ|ಅಡ್ಡ ಪರಿಣಾಮ|ದದ್ದು/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ಈ ಉತ್ಪನ್ನದ ಅಡ್ಡಪರಿಣಾಮಗಳ ಮಾಹಿತಿ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ. ಬಳಕೆ ನಿಲ್ಲಿಸಿ ವೈದ್ಯಕೀಯ ಸಲಹೆ ಪಡೆಯಿರಿ; ಉಸಿರಾಟದ ತೊಂದರೆ ಅಥವಾ ಮುಖ/ಗಂಟಲು ಊತವಿದ್ದರೆ ತುರ್ತು ಸಹಾಯ ಪಡೆಯಿರಿ.`
          : `${h.sideEffects} If you develop a rash, stop using it and seek medical advice. Get emergency help for breathing difficulty or face/throat swelling.`;
      } else if (/how to use|directions|apply|use it|ಬಳಸುವುದು ಹೇಗೆ|ಹಚ್ಚುವುದು ಹೇಗೆ|ಹೇಗೆ ಬಳಸ/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ನಿಜವಾದ ಉತ್ಪನ್ನದ ಪ್ಯಾಕೆಟ್ ಮೇಲಿನ ಸೂಚನೆಗಳನ್ನು ಅನುಸರಿಸಿ. ಈ ಡೆಮೊದಲ್ಲಿ ಬಳಕೆಯ ವಿಧಾನ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ.`
          : h.directions;
      } else if (/what is it used for|used for|purpose|treat|relief|ಯಾವುದಕ್ಕೆ ಬಳಸ|ಏನಕ್ಕೆ ಬಳಸ/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ಈ ಉತ್ಪನ್ನದ ಅನುಮೋದಿತ ಬಳಕೆಗಳನ್ನು ಡೆಮೊದಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ. ಪ್ಯಾಕೆಟ್ ಮೇಲಿನ ಸೂಚನೆಗಳನ್ನು ನೋಡಿ.`
          : h.approvedUses;
      } else if (/manufacturer|made by|batch number|expiry|expiration|expiry date|ತಯಾರಕ|ಬ್ಯಾಚ್|ಅವಧಿ ಮುಗಿಯ/i.test(text)) {
        healthcareAnswer = isKannada
          ? `ತಯಾರಕ, ಬ್ಯಾಚ್ ಮತ್ತು ಅವಧಿ ವಿವರಗಳು ಡೆಮೊದಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ. ಪ್ಯಾಕೆಟ್ ಪರಿಶೀಲಿಸಿ.`
          : `Manufacturer, batch number and expiry details are not verified in this demo. Please check the actual package.`;
      }
      if (healthcareAnswer) {
        return {
          reply: healthcareAnswer,
          toolCalled: 'healthcareDatasetLookup',
          activeProduct: formatProductForClient(product),
          productData: formatProductForClient(product)
        };
      }
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

    // B. PRICE RANGE / BUDGET ENQUIRY (0 to Infinity ₹)
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
          reply = `Our most affordable item is the ${selected.name} for ${selected.salePrice}. It is in stock and ready to ship.`;
        } else if (/(most expensive|costliest|highest price)/i.test(lower)) {
          reply = `Our premium top-tier item is the ${selected.name} for ${selected.salePrice}.`;
        } else if (underMatch) {
          const sample = res.products.slice(0, 2).map(p => `${p.name} for ${p.salePrice}`).join(' and ');
          reply = `Under ₹${maxPrice.toLocaleString('en-IN')}, we have ${sample}.`;
        } else if (betweenMatch) {
          const sample = res.products.slice(0, 2).map(p => `${p.name} for ${p.salePrice}`).join(' and ');
          reply = `Between ₹${minPrice.toLocaleString('en-IN')} and ₹${maxPrice.toLocaleString('en-IN')}, we have ${sample}.`;
        } else if (aboveMatch) {
          const sample = res.products.slice(0, 2).map(p => `${p.name} for ${p.salePrice}`).join(' and ');
          reply = `Above ₹${minPrice.toLocaleString('en-IN')}, we offer ${sample}.`;
        } else {
          const sample = res.products.slice(0, 2).map(p => `${p.name} for ${p.salePrice}`).join(' and ');
          reply = `In our catalog we have ${sample}.`;
        }
      } else {
        const allItems = db.searchProductsByPriceRange(0, Infinity);
        const cheapest = allItems[0];
        activeProduct = cheapest || product;
        reply = `No products found in that exact range. Our starting item is ${cheapest.name} at ₹${Math.round(cheapest.salePrice).toLocaleString('en-IN')}.`;
      }

      return {
        reply,
        toolCalled,
        activeProduct: formatProductForClient(activeProduct),
        productData: formatProductForClient(activeProduct)
      };
    }

    // C. ENQUIRY FOR OTHER PRODUCTS IN STORE (Switching Focus)
    const otherProductCategories = ['shoe', 'shoes', 'sneaker', 'sneakers', 'phone', 'phones', 'smartphone', 'laptop', 'laptops', 'notebook', 'headphone', 'headphones', 'earphone', 'earphones', 'cosmetic', 'cosmetics', 'lipstick', 'matte', 'sunglass', 'sunglasses', 'watch', 'watches', 'jacket', 't-shirt', 'tee', 'hoodie'];
    const mentionsOtherProductIntent = 
      /(do you have|what about|show me|tell me about|any other|other products?|looking for|check|explore|switch to)\s+(?:any\s+)?([a-z0-9\s-]+)/i.test(lower);
    
    let targetQuery = null;
    if (mentionsOtherProductIntent) {
      const match = lower.match(/(?:do you have|what about|show me|tell me about|any other|other products?|looking for|check|explore|switch to)\s+(?:any\s+)?([a-z0-9\s-]+)/i);
      if (match && match[1]) {
        targetQuery = match[1].replace(/products?|available|in the store|in store|please/g, '').trim();
      }
    } else {
      for (const kw of otherProductCategories) {
        if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
          if (!product.name.toLowerCase().includes(kw) && !product.category.toLowerCase().includes(kw)) {
            targetQuery = kw;
            break;
          }
        }
      }
    }

    if (targetQuery && targetQuery.length > 2 && !/^(it|this|that|available|stock|size|colour|color|price|cost)$/i.test(targetQuery)) {
      const matched = db.findProductByQuery(targetQuery) || db.searchProducts(targetQuery)[0];
      if (matched && matched.id !== product.id) {
        activeProduct = matched;
        toolCalled = 'searchProduct';
        reply = `Yes, we have the ${matched.name} for ₹${Math.round(matched.salePrice).toLocaleString('en-IN')}. It's in stock. Would you like to check sizes or colours?`;
        return {
          reply,
          toolCalled,
          activeProduct: formatProductForClient(activeProduct),
          productData: formatProductForClient(activeProduct)
        };
      }
    }

    // D. ORDER CONFIRMATION / BUY INTENT
    if (/i want to buy|i want to order|place (the|an)? order|confirm (the|my)? order|book this|order one|order two|buy this/i.test(lower)) {
      toolCalled = 'createOrder';
      
      const sizeMatch = text.match(/\b(xl|xxl|small|medium|large|s|m|l|uk\s*\d+|30|32|34|36|38|40)\b/i);
      const size = sizeMatch ? sizeMatch[1].toUpperCase() : (product.sizes ? product.sizes[0] : '');

      const colourMatch = text.match(/\b(black|white|off-white|sage green|blue|green|gray|grey|rose|brown)\b/i);
      const colour = colourMatch ? colourMatch[1] : (product.colours ? product.colours[0] : '');

      const qtyMatch = text.match(/\b(\d+)\s*(piece|pieces|item|items|unit|units)?\b/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

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
      reply = `Order confirmed! ${qty}x ${product.name}${size ? ' (' + size + ')' : ''}. Order ID: ${orderResult.orderId}. Total: ${orderResult.totalAmount} via ${paymentMethod}. Delivery in ${product.deliveryDays}.`;
      return { 
        reply, 
        toolCalled, 
        orderData, 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // E. SIZE & COLOUR AVAILABILITY / STOCK CHECK
    if (/available|in stock|sold out|have (it|this)|do you have|size|colour|color/i.test(lower)) {
      toolCalled = 'checkStock';

      const sizeMatch = text.match(/\b(xl|xxl|small|medium|large|s|m|l|uk\s*\d+|30|32|34|36|38|40)\b/i);
      const reqSize = sizeMatch ? sizeMatch[1].toUpperCase() : null;

      const colourMatch = text.match(/\b(black|vintage black|white|off-white|sage green|blue|green|gray|grey|rose|brown|amber|cognac|mint)\b/i);
      const reqColour = colourMatch ? colourMatch[1] : null;

      const stockRes = ProductService.checkStock({
        productId: product.id,
        size: reqSize,
        colour: reqColour
      });

      if (stockRes.inStock) {
        reply = `Yes, ${product.name}${reqColour ? ' in ' + reqColour : ''}${reqSize ? ' size ' + reqSize : ''} is in stock with ${stockRes.stockCount} units available.`;
      } else {
        toolCalled = 'searchSimilarProducts';
        const similar = ProductService.searchSimilarProducts({ productId: product.id });
        const altText = similar.alternatives && similar.alternatives.length > 0
          ? ` In-stock option: ${similar.alternatives[0].name} for ${similar.alternatives[0].salePrice}.`
          : '';

        reply = `Sorry, ${product.name}${reqColour ? ' in ' + reqColour : ''}${reqSize ? ' size ' + reqSize : ''} is currently sold out.${altText}`;
      }
      return { 
        reply, 
        toolCalled, 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // F. PRICING & DISCOUNT ENQUIRY
    if (/price|cost|how much|discount|offer|sale price|deal/i.test(lower)) {
      toolCalled = 'getPrice';
      const priceRes = ProductService.getPrice({ productId: product.id });
      reply = `The ${product.name} is ${priceRes.salePrice} (${priceRes.discountPercent} off from ${priceRes.regularPrice}).`;
      return { 
        reply, 
        toolCalled, 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // G. DELIVERY & SHIPPING ENQUIRY
    if (/delivery|shipping|when will (it|i) (reach|arrive|get)|how many days|dispatch|pincode|fast shipping/i.test(lower)) {
      toolCalled = 'getDeliveryInformation';
      const delivRes = ProductService.getDeliveryInformation({ productId: product.id });
      reply = `Delivery takes ${delivRes.deliveryDays}. Delivery charge is ${delivRes.deliveryCharges}.`;
      return { 
        reply, 
        toolCalled, 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // H. CASH ON DELIVERY & PAYMENT OPTIONS
    if (/cod|cash on delivery|pay on delivery|payment method|upi|gpay|card|credit card|emi/i.test(lower)) {
      toolCalled = 'getPaymentOptions';
      const payRes = ProductService.getPaymentOptions({ productId: product.id });
      reply = payRes.codAvailable
        ? `Yes, Cash on Delivery is available. We also accept UPI and Cards.`
        : `This item requires prepaid payment via UPI or Cards.`;
      return { 
        reply, 
        toolCalled, 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // I. RETURN, EXCHANGE & REFUND POLICY
    if (/return|exchange|refund|damage|fit|replace|guarantee/i.test(lower)) {
      toolCalled = 'getReturnPolicy';
      const retRes = ProductService.getReturnPolicy({ productId: product.id });
      reply = `${retRes.returnPolicy} ${retRes.exchangePolicy}`;
      return { 
        reply, 
        toolCalled, 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // J. SPECIFICATIONS / HARDWARE / FABRIC ENQUIRY
    if (/spec|processor|ram|storage|battery|camera|screen|display|fabric|gsm|material|waterproof|warranty/i.test(lower)) {
      toolCalled = 'getProductDetails';
      const details = ProductService.getProductDetails({ productId: product.id });
      const p = details.product;
      
      let specSnippet = '';
      if (p.specs) {
        const parts = Object.entries(p.specs).slice(0, 3).map(([k, v]) => `${k.toUpperCase()}: ${v}`);
        specSnippet = parts.join(', ');
      }

      reply = `${p.name} specs: ${specSnippet}. Warranty: ${p.warranty || 'Store quality guarantee'}.`;
      return { 
        reply, 
        toolCalled, 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // K. GREETINGS OR GENERAL CHAT
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|who are you|namaste)/i.test(lower)) {
      reply = `Namaste! I'm Maya from TrendVibe Store sellers. You enquired about ${product ? product.name : 'our products'}. What would you like to check?`;
      return { 
        reply, 
        toolCalled: 'greeting', 
        activeProduct: formatProductForClient(product), 
        productData: formatProductForClient(product) 
      };
    }

    // DEFAULT FALLBACK HELPER
    reply = `The ${product.name} is in stock for ₹${Math.round(product.salePrice).toLocaleString('en-IN')}. What details would you like to know?`;
    return { 
      reply, 
      toolCalled: 'generalAssistant', 
      activeProduct: formatProductForClient(product), 
      productData: formatProductForClient(product) 
    };
  }
}
