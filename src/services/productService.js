import { db } from '../db/database.js';
import { ProductKnowledgeService } from './productKnowledgeService.js';
import { IntentService } from './intentService.js';

const formatINR = (amount) => '₹' + Math.round(amount).toLocaleString('en-IN');

export class ProductService {
  /**
   * 1. Search products by keyword, name, brand, or category
   */
  static searchProduct({ query, category }) {
    if (!query && !category) {
      return {
        success: false,
        message: "Please provide a product name, keyword, or category to search.",
        results: []
      };
    }

    const matches = db.searchProducts(query, category);
    if (!matches || matches.length === 0) {
      return {
        success: false,
        message: `Verified product information matching "${query || category}" is not currently available in our store catalog, but I am very happy to help! Would you like to check our latest trending collection or connect with a store representative?`,
        handoffSuggested: true,
        results: []
      };
    }

    const formatted = matches.slice(0, 5).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      salePrice: formatINR(p.salePrice),
      originalPrice: formatINR(p.price),
      currency: "INR",
      inStock: p.inStock,
      availableColours: p.colours,
      availableSizes: p.sizes,
      videoUrl: p.videoUrl,
      instagramVideoPostUrl: p.instagramVideoPostUrl
    }));

    return {
      success: true,
      count: formatted.length,
      products: formatted
    };
  }

  /**
   * Search products within a price range (supports ₹0 to Infinity)
   */
  static searchByPriceRange({ minPrice = 0, maxPrice = Infinity, category }) {
    const min = (minPrice !== null && minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice)))
      ? Math.max(0, Number(minPrice))
      : 0;
    const max = (maxPrice !== null && maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice)))
      ? Number(maxPrice)
      : Infinity;

    const matches = db.searchProductsByPriceRange(min, max, category);
    if (!matches || matches.length === 0) {
      return {
        success: false,
        message: `No products found between ${formatINR(min)} and ${max === Infinity ? 'any amount' : formatINR(max)}.`,
        results: [],
        products: []
      };
    }

    const formatted = matches.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      salePrice: formatINR(p.salePrice),
      salePriceRaw: p.salePrice,
      originalPrice: formatINR(p.price),
      discount: `${p.discountPercent}% OFF`,
      inStock: p.inStock,
      availableColours: p.colours,
      availableSizes: p.sizes,
      videoUrl: p.videoUrl,
      imageUrl: p.imageUrl,
      instagramVideoPostUrl: p.instagramVideoPostUrl
    }));

    return {
      success: true,
      count: formatted.length,
      priceRange: { min: formatINR(min), max: max === Infinity ? 'Infinity' : formatINR(max) },
      products: formatted
    };
  }

  /**
   * 2. Get complete product details by ID or Name
   */
  static getProductDetails({ productId, query }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return {
        success: false,
        message: "Verified product information is not currently available in our store catalog, but I am very happy to help! Would you like to check our latest collection or connect with a store representative?",
        handoffSuggested: true
      };
    }

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        brand: product.brand,
        description: product.description,
        price: formatINR(product.price),
        salePrice: formatINR(product.salePrice),
        discount: `${product.discountPercent}% OFF`,
        colours: product.colours,
        sizes: product.sizes,
        inStock: product.inStock,
        codAvailable: product.codAvailable,
        deliveryDays: product.deliveryDays,
        warranty: product.warranty,
        specs: product.specs,
        returnPolicy: product.returnPolicy,
        exchangePolicy: product.exchangePolicy,
        healthcareDetails: product.healthcareDetails || null
      }
    };
  }

  /**
   * 3. Check live stock for a product, optionally by size and colour
   */
  static checkStock({ productId, query, product: directProduct, size, colour }) {
    let product = directProduct || null;
    if (!product && productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return {
        success: false,
        message: "Could not find the product to check inventory.",
        inStock: false,
        stockCount: null
      };
    }

    // Check specific variant if both or either size/colour are specified
    if (size || colour) {
      const variants = product.stock.variants || {};
      let matchingVariantKey = null;
      let variantStock = 0;

      // Find best variant match
      const reqSize = (size || '').toLowerCase().trim();
      const reqColour = (colour || '').toLowerCase().trim();

      for (const [key, qty] of Object.entries(variants)) {
        const lowerKey = key.toLowerCase();
        const sizeMatch = !reqSize || lowerKey.includes(reqSize);
        const colourMatch = !reqColour || lowerKey.includes(reqColour);

        if (sizeMatch && colourMatch) {
          matchingVariantKey = key;
          variantStock = qty;
          break;
        }
      }

      if (matchingVariantKey) {
        const isAvailable = variantStock > 0;
        return {
          success: true,
          productId: product.id,
          productName: product.name,
          variant: matchingVariantKey,
          inStock: isAvailable,
          stockCount: variantStock,
          message: isAvailable
            ? `Yes, the ${product.name} in ${matchingVariantKey} is in stock with ${variantStock} units available.`
            : `Unfortunately, the ${product.name} in ${matchingVariantKey} is currently sold out. Would you like me to recommend similar products?`,
          recommendAlternatives: !isAvailable
        };
      }

      // If variant was not explicitly defined in variants table
      const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
      const hasColours = Array.isArray(product.colours) && product.colours.length > 0;
      const sizeAvailable = !size || !hasSizes || product.sizes.some(s => String(s).toLowerCase() === reqSize);
      const colourAvailable = !colour || !hasColours || product.colours.some(c => String(c).toLowerCase().includes(reqColour));

      if (!sizeAvailable || !colourAvailable) {
        const coloursText = hasColours ? product.colours.join(', ') : 'Standard';
        const sizesText = hasSizes ? product.sizes.join(', ') : 'Standard';
        return {
          success: false,
          productId: product.id,
          productName: product.name,
          inStock: false,
          message: `We do not currently carry that exact size or colour for ${product.name}. Available colours: ${coloursText}. Available sizes: ${sizesText}.`,
          recommendAlternatives: true
        };
      }
    }

    const count = typeof product.stockCount === 'number' 
      ? product.stockCount 
      : (product.stock && typeof product.stock.overall === 'number' ? product.stock.overall : null);

    const isInStock = product.inStock !== undefined
      ? Boolean(product.inStock)
      : (count !== null ? count > 0 : false);

    let message = '';
    if (isInStock && (count === null || count > 0)) {
      message = count !== null
        ? `The ${product.name} is in stock with ${count} units available.`
        : `The ${product.name} is verified in stock, but the exact unit quantity is currently not specified in live inventory.`;
    } else {
      message = `The ${product.name} is currently out of stock.`;
    }

    return {
      success: true,
      productId: product.id,
      productName: product.name,
      inStock: isInStock && (count === null || count > 0),
      stockCount: count,
      message
    };
  }

  /**
   * 4. Get exact pricing, discount, and sale price
   */
  static getPrice({ productId, query }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return { success: false, message: "Product not found to determine price." };
    }

    const freeShippingNote = product.salePrice >= product.freeDeliveryAbove
      ? "This product qualifies for FREE standard delivery across India!"
      : `Delivery charge is ${formatINR(product.deliveryCharges)} (Free delivery on orders over ${formatINR(product.freeDeliveryAbove)}).`;

    return {
      success: true,
      productId: product.id,
      productName: product.name,
      regularPrice: formatINR(product.price),
      salePrice: formatINR(product.salePrice),
      discountPercent: `${product.discountPercent}%`,
      savings: formatINR(product.price - product.salePrice),
      shippingNote: freeShippingNote,
      message: `The ${product.name} is currently on sale for ${formatINR(product.salePrice)}, which is ${product.discountPercent}% off the original price of ${formatINR(product.price)}. ${freeShippingNote}`
    };
  }

  /**
   * 5. Get available product variants (sizes, colours, configs)
   */
  static getVariants({ productId, query }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return { success: false, message: "Product not found." };
    }

    return {
      success: true,
      productId: product.id,
      productName: product.name,
      category: product.category,
      availableColours: product.colours,
      availableSizesOrSpecs: product.sizes,
      message: `Available colours: ${product.colours.join(', ')}. Available sizes/configurations: ${product.sizes.join(', ')}.`
    };
  }

  /**
   * 6. Check size availability specifically
   */
  static checkSize({ productId, query, size }) {
    if (!size) {
      return { success: false, message: "Please state the size you are looking for." };
    }

    return this.checkStock({ productId, query, size });
  }

  /**
   * 7. Check colour availability specifically
   */
  static checkColour({ productId, query, colour }) {
    if (!colour) {
      return { success: false, message: "Please state the colour you are looking for." };
    }

    return this.checkStock({ productId, query, colour });
  }

  /**
   * 8. Get delivery and shipping information
   */
  static getDeliveryInformation({ productId, query, pincode }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return {
        success: true,
        deliveryTime: "2-4 business days across India",
        charges: "₹99 standard, free for orders above ₹999",
        message: "Standard delivery takes 2-4 business days across India. Shipping is free for orders over ₹999."
      };
    }

    return {
      success: true,
      productId: product.id,
      productName: product.name,
      deliveryDays: product.deliveryDays,
      deliveryInfo: product.deliveryInfo,
      quickDeliveryAvailable: Boolean(product.quickDeliveryAvailable),
      quickDeliveryTime: product.quickDeliveryTime || null,
      deliveryCharges: product.deliveryCharges === 0 ? "FREE" : formatINR(product.deliveryCharges),
      freeDeliveryAbove: formatINR(product.freeDeliveryAbove),
      message: product.quickDeliveryAvailable
        ? `For ${product.name}, quick delivery is available within 20 minutes (Instant Express) or standard delivery in ${product.deliveryDays}. ${product.deliveryInfo}`
        : `For the ${product.name}, standard delivery takes ${product.deliveryDays}. ${product.deliveryInfo}`
    };
  }

  /**
   * 9. Get Return, Exchange, and Refund Policy
   */
  static getReturnPolicy({ productId, query }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return {
        success: true,
        returnPolicy: "7-day doorstep return policy.",
        exchangePolicy: "Free size and colour exchange within 7 days.",
        refundPolicy: "100% refund processed within 48 hours of return pickup."
      };
    }

    return {
      success: true,
      productId: product.id,
      productName: product.name,
      returnPolicy: product.returnPolicy,
      exchangePolicy: product.exchangePolicy,
      refundPolicy: product.refundPolicy,
      message: `We offer a ${product.returnPolicy} You can also request an exchange: ${product.exchangePolicy} Refunds are processed as follows: ${product.refundPolicy}`
    };
  }

  /**
   * 10. Get Payment Options and Cash on Delivery (COD)
   */
  static getPaymentOptions({ productId, query }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    const methods = (product && Array.isArray(product.paymentMethods) && product.paymentMethods.length > 0)
      ? product.paymentMethods
      : ["Cash on Delivery", "UPI", "Credit/Debit Cards"];
    const cod = (product && product.codAvailable !== undefined) ? Boolean(product.codAvailable) : true;

    return {
      success: true,
      paymentMethods: methods,
      codAvailable: cod,
      message: cod
        ? `Yes! We support Cash on Delivery (COD) as well as UPI, Credit and Debit Cards, and Net Banking.`
        : `This high-value item requires prepaid payment (Cards, UPI, or Net Banking) or a small partial deposit for Cash on Delivery.`
    };
  }

  /**
   * 11. Search Similar or Alternative Products when an item or size is unavailable
   */
  static searchSimilarProducts({ productId, category, query }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    const targetCategory = product ? product.category : category;
    const currentId = product ? product.id : null;

    // Look up similar IDs if defined
    let candidates = [];
    if (product && product.similarProductIds && product.similarProductIds.length > 0) {
      candidates = product.similarProductIds
        .map(id => db.getProductById(id))
        .filter(p => p && p.inStock);
    }

    // If none found, match same category
    if (candidates.length === 0 && targetCategory) {
      candidates = db.getAllProducts()
        .filter(p => p.id !== currentId && p.category.toLowerCase() === targetCategory.toLowerCase() && p.inStock);
    }

    if (candidates.length === 0) {
      return {
        success: false,
        message: "No direct alternative products currently available in this category.",
        alternatives: []
      };
    }

    const alternatives = candidates.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      salePrice: formatINR(p.salePrice),
      colours: p.colours,
      sizes: p.sizes,
      description: p.description
    }));

    return {
      success: true,
      count: alternatives.length,
      alternatives,
      message: `Here are popular in-stock alternatives: ${alternatives.map(a => `${a.name} for ${a.salePrice}`).join(', ')}.`
    };
  }

  /**
   * 12. Check Order Status
   */
  static getOrderStatus({ phone, orderId }) {
    if (!phone && !orderId) {
      return { success: false, message: "Please provide your phone number or Order ID to track your order." };
    }

    const allOrders = db.getAllOrders();
    let order = null;

    if (orderId) {
      order = allOrders.find(o => o.id.toLowerCase() === orderId.toLowerCase());
    }

    if (!order && phone) {
      const clean = phone.replace(/\D/g, '');
      const lead = db.getLeadByPhone(clean);
      if (lead) {
        order = allOrders.find(o => o.leadId === lead.id);
      }
      if (!order) {
        order = allOrders.find(o => o.phone && o.phone.replace(/\D/g, '') === clean);
      }
    }

    if (!order) {
      return {
        success: false,
        message: "Verified order tracking information is not currently available in our live system, but I am very happy to help! Could you please double-check your Order ID or phone number? Alternatively, I can connect you with a store representative to look into this right away for you.",
        handoffSuggested: true
      };
    }

    const latestTimeline = Array.isArray(order.timeline) && order.timeline.length > 0 
      ? order.timeline[order.timeline.length - 1] 
      : null;
    const currentLocation = latestTimeline?.location || 'TrendVibe Central Fulfillment Center, Bengaluru';
    const courierStr = order.courier ? `via ${order.courier}` : 'via Express Logistics';
    const awbStr = order.trackingNumber ? `(AWB: ${order.trackingNumber})` : '';
    const deliveryStr = order.estimatedDelivery ? `Expected delivery in ${order.estimatedDelivery}.` : 'Expected delivery in 2-3 business days.';

    return {
      success: true,
      orderId: order.id,
      productName: order.productName,
      status: order.orderStatus,
      orderStatus: order.orderStatus,
      courier: order.courier || 'BlueDart Express',
      trackingNumber: order.trackingNumber || 'BD-100000-IN',
      estimatedDelivery: order.estimatedDelivery || '2-3 Business Days',
      currentLocation,
      timeline: order.timeline || [],
      totalAmount: formatINR(order.totalAmount),
      paymentMethod: order.paymentMethod,
      orderDate: order.createdAt,
      message: `Your order ${order.id} for ${order.productName} is currently ${order.orderStatus}. It is shipping ${courierStr} ${awbStr}. Current location: ${currentLocation}. ${deliveryStr}`.replace(/\s+/g, ' ').trim()
    };
  }

  /**
   * 13. Create or Confirm Order during Voice Call
   */
  static createOrder({ leadId, productId, query, size, colour, quantity = 1, paymentMethod = 'Cash on Delivery (COD)', shippingAddress = '' }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return { success: false, message: "Cannot place order: product could not be identified." };
    }

    const qty = parseInt(quantity, 10) || 1;
    const total = product.salePrice * qty;

    const order = db.createOrder({
      leadId,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      size: size || (product.sizes && product.sizes[0]) || '',
      colour: colour || (product.colours && product.colours[0]) || '',
      totalAmount: total,
      paymentMethod,
      isCod: paymentMethod.toLowerCase().includes('cod') || paymentMethod.toLowerCase().includes('cash'),
      shippingAddress,
      orderStatus: 'Confirmed',
      deductStock: true
    });

    return {
      success: true,
      orderId: order.id,
      productName: product.name,
      quantity: qty,
      totalAmount: formatINR(total),
      paymentMethod: order.paymentMethod,
      message: `Great! Your order for ${qty}x ${product.name} (${order.colour ? order.colour + ', ' : ''}${order.size ? 'Size ' + order.size : ''}) has been confirmed. Order reference number is ${order.id}. Total amount is ${formatINR(total)} with ${order.paymentMethod}.`
    };
  }

  /**
   * 15. Get verified medicine details with strict 28-field ordering
   */
  static getMedicineDetails({ productId, query }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return {
        success: false,
        message: "Verified medicine data is not available in our catalog.",
        handoffSuggested: true
      };
    }

    const getVal = (v) => (v !== undefined && v !== null && String(v).trim().length > 0) ? v : 'Not available in verified product data.';

    return {
      success: true,
      medicine: {
        productName: getVal(product.name),
        brand: getVal(product.brand),
        variant: getVal(product.variant || product.name),
        category: getVal(product.category),
        dosageForm: getVal(product.dosageForm),
        activeIngredients: Array.isArray(product.activeIngredients) ? product.activeIngredients.join(', ') : getVal(product.activeIngredients),
        inactiveIngredients: Array.isArray(product.inactiveIngredients) ? product.inactiveIngredients.join(', ') : getVal(product.inactiveIngredients),
        strength: getVal(product.strength),
        purpose: getVal(product.purpose),
        benefits: getVal(product.benefits),
        howToUse: getVal(product.howToUse),
        ageRestrictions: getVal(product.ageRestrictions),
        warnings: getVal(product.warnings),
        contraindications: getVal(product.contraindications),
        sideEffects: getVal(product.sideEffects),
        drugInteractions: getVal(product.drugInteractions),
        allergyInfo: getVal(product.allergyInfo),
        pregnancyBreastfeeding: getVal(product.pregnancyBreastfeeding),
        pregnancyWarnings: getVal(product.pregnancyWarnings || product.pregnancyBreastfeeding),
        breastfeedingWarnings: getVal(product.breastfeedingWarnings || product.pregnancyBreastfeeding),
        prescriptionStatus: getVal(product.prescriptionStatus),
        manufacturerName: getVal(product.manufacturerName || product.manufacturer),
        manufacturerAddress: getVal(product.manufacturerAddress),
        manufacturingLicence: getVal(product.manufacturingLicence),
        registrationApproval: getVal(product.registrationApproval),
        testingQuality: getVal(product.testingQuality),
        gmpCertification: getVal(product.gmpCertification),
        countryOfOrigin: getVal(product.countryOfOrigin),
        batchNumber: getVal(product.batchNumber),
        manufacturingDate: getVal(product.manufacturingDate),
        expiryDate: getVal(product.expiryDate),
        storageInstructions: getVal(product.storageInstructions),
        packSize: getVal(product.packSize),
        mrp: product.mrp !== undefined ? formatINR(product.mrp) : 'Not available in verified product data.',
        sellingPrice: formatINR(product.salePrice || product.price),
        discount: `${getVal(product.discountPercent)}% (${getVal(product.discountOffer)})`,
        stockAvailability: product.inStock ? 'In Stock' : 'Out of Stock',
        availableQuantity: product.stockCount || 0,
        deliveryInformation: getVal(product.deliveryInfo || product.deliveryDays),
        returnExchangePolicy: `${getVal(product.returnPolicy)} | ${getVal(product.exchangePolicy)}`,
        sellerInformation: getVal(product.seller),
        productIdSku: getVal(product.id),
        barcodeGtin: getVal(product.gtin || product.barcode),
        productAuthenticity: getVal(product.authenticityVerification),
        officialSource: getVal(product.officialSource),
        manufacturerSource: getVal(product.manufacturerSource),
        regulatorySource: getVal(product.regulatorySource),
        productLabelSource: getVal(product.productLabelSource),
        lastVerifiedDate: getVal(product.lastVerifiedDate),
        verificationStatus: getVal(product.verificationStatus)
      }
    };
  }

  /**
   * 16. Get verified food details
   */
  static getFoodDetails({ productId, query }) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return {
        success: false,
        message: "Food product not found in catalog.",
        handoffSuggested: true
      };
    }

    const getVal = (v) => (v !== undefined && v !== null && String(v).trim().length > 0) ? v : 'Not available in verified product data.';

    return {
      success: true,
      food: {
        id: product.id,
        foodName: getVal(product.foodName || product.name),
        category: "Food",
        subcategory: getVal(product.subcategory),
        foodType: getVal(product.foodType),
        description: getVal(product.description),
        mainIngredients: product.mainIngredients || [],
        completeIngredients: product.completeIngredients || [],
        ingredientQuantity: getVal(product.ingredientQuantity),
        homemadeMasalaDetails: getVal(product.homemadeMasalaDetails),
        masalaIngredients: product.masalaIngredients || [],
        rawMaterialDetails: getVal(product.rawMaterialDetails),
        rawMaterialQuality: getVal(product.rawMaterialQuality),
        rawMaterialSupplier: getVal(product.rawMaterialSupplier),
        preparationMethod: getVal(product.preparationMethod),
        cookingMethod: getVal(product.cookingMethod),
        preparationTime: getVal(product.preparationTime),
        cookingTime: getVal(product.cookingTime),
        oilType: getVal(product.oilType),
        oilQuantity: getVal(product.oilQuantity),
        saltUsage: getVal(product.saltUsage),
        sugarUsage: getVal(product.sugarUsage),
        preservatives: getVal(product.preservatives),
        freshlyPrepared: getVal(product.freshlyPrepared),
        preparationDateTime: getVal(product.preparationDateTime),
        bestBeforeDateTime: getVal(product.bestBeforeDateTime),
        shelfLife: getVal(product.shelfLife),
        storageInstructions: getVal(product.storageInstructions),
        servingSize: getVal(product.servingSize),
        netQuantity: getVal(product.netQuantity),
        nutrition: {
          calories: product.calories,
          protein: getVal(product.protein),
          carbohydrates: getVal(product.carbohydrates),
          fat: getVal(product.fat),
          dietaryFibre: getVal(product.dietaryFibre),
          sodium: getVal(product.sodium),
          calcium: getVal(product.calcium),
          iron: getVal(product.iron)
        },
        allergens: getVal(product.allergens),
        vegNonVeg: getVal(product.vegNonVeg),
        veganStatus: getVal(product.veganStatus),
        fssaiNumber: getVal(product.fssaiNumber),
        foodSafetyHygiene: getVal(product.foodSafetyHygiene),
        foodTestingInfo: getVal(product.foodTestingInfo),
        manufacturer: getVal(product.manufacturer),
        brand: getVal(product.brand),
        packagingType: getVal(product.packagingType),
        packagingMaterial: getVal(product.packagingMaterial),
        mrp: formatINR(product.mrp || product.price),
        salePrice: formatINR(product.salePrice || product.price),
        discountPercent: `${product.discountPercent}%`,
        inStock: product.inStock,
        stockCount: product.stockCount,
        batchNumber: getVal(product.batchNumber),
        restockDate: getVal(product.restockDate),
        deliveryAvailability: getVal(product.deliveryAvailability),
        deliveryDays: getVal(product.deliveryDays),
        deliveryCharges: formatINR(product.deliveryCharges || 0),
        minOrderQty: product.minOrderQty,
        maxOrderQty: product.maxOrderQty,
        cancellationPolicy: getVal(product.cancellationPolicy),
        returnPolicy: getVal(product.returnPolicy),
        dataType: getVal(product.dataType),
        source: getVal(product.source),
        lastVerifiedDate: getVal(product.lastVerifiedDate)
      }
    };
  }

  /**
   * 17. Universal Product Comparison Tool:
   * Compares 2 or more products based on actual verified database fields.
   * Never invents specifications or benchmarks.
   */
  static compareProducts({ productId1, productId2, productNames = [], attribute = null, query = '', language = 'en' } = {}) {
    const allProducts = db.getAllProducts();
    let p1 = null;
    let p2 = null;

    if (productId1) p1 = db.getProductById(productId1) || db.findProductByQuery(productId1);
    if (productId2) p2 = db.getProductById(productId2) || db.findProductByQuery(productId2);

    if ((!p1 || !p2) && Array.isArray(productNames) && productNames.length >= 2) {
      if (!p1) p1 = db.findProductByQuery(productNames[0]);
      if (!p2) p2 = db.findProductByQuery(productNames[1]);
    }

    if ((!p1 || !p2) && query) {
      const parsed = IntentService.parseComparisonQuery(query, allProducts);
      if (p1 && !p2 && parsed.products.length >= 1) {
        p2 = parsed.products.find(p => p.id !== p1.id) || parsed.products[0];
      } else if (!p1 && p2 && parsed.products.length >= 1) {
        p1 = parsed.products.find(p => p.id !== p2.id) || parsed.products[0];
      } else if (parsed.products.length >= 2) {
        if (!p1) p1 = parsed.products[0];
        if (!p2) p2 = parsed.products[1];
      }
      if (!attribute && parsed.attribute) {
        attribute = parsed.attribute;
      }
    }

    if (!p1 || !p2) {
      const isKn = language === 'kn';
      const isRoman = language === 'kn_roman';
      let msg = "Please specify two valid products to compare (e.g. 'Compare ASUS TUF and Lenovo IdeaPad').";
      if (isKn) msg = "ದಯವಿಟ್ಟು ಹೋಲಿಕೆ ಮಾಡಲು ಎರಡು ಮಾನ್ಯ ಉತ್ಪನ್ನಗಳನ್ನು ತಿಳಿಸಿ (ಉದಾ: 'ASUS TUF ಮತ್ತು Lenovo IdeaPad ಹೋಲಿಕೆ ಮಾಡಿ').";
      if (isRoman) msg = "Dayavittu compare madoke eradu valid products thilisi (e.g. 'Compare ASUS TUF and Lenovo IdeaPad').";
      return {
        success: false,
        message: msg,
        comparedProducts: []
      };
    }

    const u1 = ProductKnowledgeService.toUniversal(p1);
    const u2 = ProductKnowledgeService.toUniversal(p2);

    const isKn = language === 'kn';
    const isRoman = language === 'kn_roman';

    // Specific attribute comparison (e.g. RAM, GPU, storage, price, processor)
    if (attribute) {
      const attrKey = attribute.toLowerCase();
      let val1 = u1.specifications[attrKey] || u1.pricing[attrKey] || u1.identity[attrKey] || null;
      let val2 = u2.specifications[attrKey] || u2.pricing[attrKey] || u2.identity[attrKey] || null;

      if (attrKey === 'price') {
        val1 = formatINR(u1.pricing.selling_price);
        val2 = formatINR(u2.pricing.selling_price);
      } else if (attrKey === 'ram' && !val1) {
        val1 = u1.specifications.ram || 'Not specified';
        val2 = u2.specifications.ram || 'Not specified';
      }

      let compMsg = '';
      if (isKn) {
        compMsg = `${attrKey.toUpperCase()} ಹೋಲಿಕೆ: ${u1.identity.name} ನಲ್ಲಿ ${val1 || 'ಲಭ್ಯವಿಲ್ಲ'} ಇದೆ, ಹಾಗೂ ${u2.identity.name} ನಲ್ಲಿ ${val2 || 'ಲಭ್ಯವಿಲ್ಲ'} ಇದೆ.`;
      } else if (isRoman) {
        compMsg = `${attrKey.toUpperCase()} comparison: ${u1.identity.name} nalli ${val1 || 'available illa'}, mathu ${u2.identity.name} nalli ${val2 || 'available illa'} ide.`;
      } else {
        compMsg = `${attrKey.toUpperCase()} Comparison: ${u1.identity.name} features ${val1 || 'Not specified in verified record'}, while ${u2.identity.name} features ${val2 || 'Not specified in verified record'}.`;
      }

      return {
        success: true,
        comparedProducts: [u1.product_id, u2.product_id],
        attribute: attrKey,
        product1: { id: u1.product_id, name: u1.identity.name, [attrKey]: val1 },
        product2: { id: u2.product_id, name: u2.identity.name, [attrKey]: val2 },
        message: compMsg
      };
    }

    // Comprehensive side-by-side comparison across key specs & pricing
    const commonAttrs = u1.ai_knowledge.comparison_attributes.filter(a => 
      u1.specifications[a] || u2.specifications[a] || a === 'price'
    );

    const comparisonTable = {};
    commonAttrs.forEach(a => {
      comparisonTable[a] = {
        [u1.identity.name]: a === 'price' ? formatINR(u1.pricing.selling_price) : (u1.specifications[a] || 'N/A'),
        [u2.identity.name]: a === 'price' ? formatINR(u2.pricing.selling_price) : (u2.specifications[a] || 'N/A')
      };
    });

    let generalMsg = '';
    if (isKn) {
      generalMsg = `${u1.identity.name} (ಬೆಲೆ: ${formatINR(u1.pricing.selling_price)}) ಮತ್ತು ${u2.identity.name} (ಬೆಲೆ: ${formatINR(u2.pricing.selling_price)}) ನಡುವಿನ ಮುಖ್ಯ ವ್ಯತ್ಯಾಸಗಳು: ${u1.identity.name}: ${u1.description.short}. ${u2.identity.name}: ${u2.description.short}.`;
    } else if (isRoman) {
      generalMsg = `${u1.identity.name} (Price: ${formatINR(u1.pricing.selling_price)}) mathu ${u2.identity.name} (Price: ${formatINR(u2.pricing.selling_price)}) comparison: ${u1.identity.name}: ${u1.description.short}. ${u2.identity.name}: ${u2.description.short}.`;
    } else {
      generalMsg = `Comparison between ${u1.identity.name} (${formatINR(u1.pricing.selling_price)}) and ${u2.identity.name} (${formatINR(u2.pricing.selling_price)}): ${u1.identity.name} offers ${u1.description.short}, whereas ${u2.identity.name} offers ${u2.description.short}.`;
    }

    return {
      success: true,
      comparedProducts: [u1.product_id, u2.product_id],
      product1: {
        id: u1.product_id,
        name: u1.identity.name,
        price: formatINR(u1.pricing.selling_price),
        specs: u1.specifications
      },
      product2: {
        id: u2.product_id,
        name: u2.identity.name,
        price: formatINR(u2.pricing.selling_price),
        specs: u2.specifications
      },
      comparison: comparisonTable,
      message: generalMsg
    };
  }

  /**
   * 18. Requirement-Based Product Search & Recommendation Tool:
   * Parses natural language customer requirements (budget, use cases, size, colour, category)
   * and recommends actual verified products satisfying database criteria.
   */
  static recommendProducts({ category = null, maxPrice = null, minPrice = null, colour = null, size = null, useCases = [], query = '', language = 'en' } = {}) {
    let effectiveFilters = { category, maxPrice, minPrice, colour, size, useCases: Array.isArray(useCases) ? [...useCases] : [] };

    if (query) {
      const parsed = IntentService.parseRequirementFilters(query);
      if (parsed.category && !effectiveFilters.category) effectiveFilters.category = parsed.category;
      if (parsed.maxPrice !== null && effectiveFilters.maxPrice === null) effectiveFilters.maxPrice = parsed.maxPrice;
      if (parsed.minPrice !== null && effectiveFilters.minPrice === null) effectiveFilters.minPrice = parsed.minPrice;
      if (parsed.colour && !effectiveFilters.colour) effectiveFilters.colour = parsed.colour;
      if (parsed.size && !effectiveFilters.size) effectiveFilters.size = parsed.size;
      if (parsed.useCases.length > 0) {
        effectiveFilters.useCases = Array.from(new Set([...effectiveFilters.useCases, ...parsed.useCases]));
      }
    }

    const allProducts = db.getAllProducts();
    let candidates = allProducts.map(p => ProductKnowledgeService.toUniversal(p));

    // 1. Filter by category if specified
    if (effectiveFilters.category) {
      const targetCat = effectiveFilters.category.toLowerCase();
      candidates = candidates.filter(u => u.identity.category.toLowerCase().includes(targetCat) || targetCat.includes(u.identity.category.toLowerCase()));
    }

    // 2. Filter by max price
    if (typeof effectiveFilters.maxPrice === 'number' && !isNaN(effectiveFilters.maxPrice)) {
      candidates = candidates.filter(u => u.pricing.selling_price !== null && u.pricing.selling_price <= effectiveFilters.maxPrice);
    }

    // 3. Filter by min price
    if (typeof effectiveFilters.minPrice === 'number' && !isNaN(effectiveFilters.minPrice)) {
      candidates = candidates.filter(u => u.pricing.selling_price !== null && u.pricing.selling_price >= effectiveFilters.minPrice);
    }

    // 4. Filter by colour
    if (effectiveFilters.colour) {
      const reqCol = effectiveFilters.colour.toLowerCase();
      candidates = candidates.filter(u => {
        const colours = u.specifications.colours || [];
        return colours.some(c => c.toLowerCase().includes(reqCol));
      });
    }

    // 5. Filter by size
    if (effectiveFilters.size) {
      const reqSize = effectiveFilters.size.toLowerCase();
      candidates = candidates.filter(u => {
        const sizes = u.specifications.sizes || [];
        return sizes.some(s => s.toLowerCase().includes(reqSize));
      });
    }

    // 6. Score & Sort by use cases match and price
    if (effectiveFilters.useCases.length > 0) {
      candidates.sort((a, b) => {
        const scoreA = effectiveFilters.useCases.filter(uc => 
          a.usage.use_cases.some(u => u.toLowerCase().includes(uc.toLowerCase())) ||
          a.ai_knowledge.recommendation_attributes.includes(uc.toLowerCase()) ||
          JSON.stringify(a.specifications).toLowerCase().includes(uc.toLowerCase())
        ).length;

        const scoreB = effectiveFilters.useCases.filter(uc => 
          b.usage.use_cases.some(u => u.toLowerCase().includes(uc.toLowerCase())) ||
          b.ai_knowledge.recommendation_attributes.includes(uc.toLowerCase()) ||
          JSON.stringify(b.specifications).toLowerCase().includes(uc.toLowerCase())
        ).length;

        return scoreB - scoreA;
      });
    }

    const isKn = language === 'kn';
    const isRoman = language === 'kn_roman';

    if (candidates.length === 0) {
      let noMatchMsg = "I couldn't find any products in our verified store catalog matching all those criteria. Would you like to adjust your budget or explore related categories?";
      if (isKn) noMatchMsg = "ನಿಮ್ಮ ಮಾನದಂಡಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಯಾವುದೇ ಉತ್ಪನ್ನಗಳು ನಮ್ಮ ಕ್ಯಾಟಲಾಗ್‌ನಲ್ಲಿ ಕಂಡುಬಂದಿಲ್ಲ. ಬಜೆಟ್ ಅಥವಾ ಮಾನದಂಡಗಳನ್ನು ಬದಲಾಯಿಸಿ ನೋಡಲು ಬಯಸುವಿರಾ?";
      if (isRoman) noMatchMsg = "Nimma criteria ge match aago yavude product catalog nalli illa. Budget athava criteria adjust madi check madtheera?";
      return {
        success: false,
        count: 0,
        filtersApplied: effectiveFilters,
        products: [],
        message: noMatchMsg
      };
    }

    const topRecommendations = candidates.slice(0, 3).map(u => ({
      id: u.product_id,
      name: u.identity.name,
      category: u.identity.category,
      brand: u.identity.brand,
      price: formatINR(u.pricing.selling_price),
      rawPrice: u.pricing.selling_price,
      discount: `${u.pricing.discount_percent}% OFF`,
      inStock: u.inventory.in_stock,
      imageUrl: u.media.image_url,
      useCases: u.usage.use_cases,
      keySpecs: Object.entries(u.specifications).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')
    }));

    let summaryMsg = '';
    const namesWithPrices = topRecommendations.map(r => `${r.name} (${r.price})`).join(', ');
    if (isKn) {
      summaryMsg = `ನಿಮ್ಮ ಮಾನದಂಡಗಳಿಗೆ ಸೂಕ್ತವಾದ ${topRecommendations.length} ಉತ್ಪನ್ನಗಳು ಲಭ್ಯವಿವೆ: ${namesWithPrices}. ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ವಿವರವಾಗಿ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`;
    } else if (isRoman) {
      summaryMsg = `Nimma criteria ge match aagiro ${topRecommendations.length} products: ${namesWithPrices}. Yavudhara bagge details beku?`;
    } else {
      summaryMsg = `Found ${topRecommendations.length} verified products matching your requirements: ${namesWithPrices}. Which one would you like to explore?`;
    }

    return {
      success: true,
      count: topRecommendations.length,
      filtersApplied: effectiveFilters,
      products: topRecommendations,
      message: summaryMsg
    };
  }

  /**
   * 19. Get Product Knowledge Record Tool:
   * Returns the Universal Product Knowledge Structure for any product.
   */
  static getProductKnowledge({ productId, query } = {}) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return { success: false, message: 'Product not found in verified database.' };
    }

    const universal = ProductKnowledgeService.toUniversal(product);
    return {
      success: true,
      productId: universal.product_id,
      knowledge: universal
    };
  }

  /**
   * 20. Get Supported Intents Tool:
   * Returns verifiable supported intents based on actual populated fields.
   */
  static getSupportedIntents({ productId, query } = {}) {
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && query) product = db.findProductByQuery(query);

    if (!product) {
      return { success: false, message: 'Product not found.' };
    }

    const universal = ProductKnowledgeService.toUniversal(product);
    return {
      success: true,
      productId: universal.product_id,
      productName: universal.identity.name,
      supportedIntents: universal.ai_knowledge.supported_intents
    };
  }
}

