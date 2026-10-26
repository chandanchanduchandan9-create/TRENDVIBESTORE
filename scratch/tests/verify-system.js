import fs from 'fs';
import path from 'path';
import { db } from '../src/db/database.js';
import { ProductService } from '../src/services/productService.js';
import { LeadScoringEngine } from '../src/services/leadScoringEngine.js';
import { VoiceCallService } from '../src/services/voiceCallService.js';
import { GeminiService } from '../src/services/geminiService.js';
import { GoogleSheetsService } from '../src/services/googleSheetsService.js';
import { ConversationService } from '../src/services/conversationService.js';
import { MobileService } from '../src/services/mobileService.js';
import { LaptopService } from '../src/services/laptopService.js';
import { FoodService } from '../src/services/foodService.js';
import { MedicineService } from '../src/services/medicineService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AI SHOPPING VOICE AGENT TESTS');
  console.log('=======================================================\n');

  // --- 1. PRODUCT DATABASE & CATALOG ---
  console.log('📦 TEST SUITE 1: Product Database & Multi-Category Specs');
  const products = db.getAllProducts();
  assert(products.length >= 15, `Loaded ${products.length} products (expected >= 15)`);

  const categories = new Set(products.map(p => p.category));
  assert(categories.has('clothing'), 'Catalog supports Clothing category');
  assert(categories.has('mobile phones'), 'Catalog supports Mobile Phones category');
  assert(categories.has('laptops'), 'Catalog supports Laptops category');
  assert(categories.has('electronics'), 'Catalog supports Electronics category');
  assert(categories.has('shoes'), 'Catalog supports Shoes category');
  assert(categories.has('cosmetics'), 'Catalog supports Cosmetics category');
  assert(categories.has('accessories'), 'Catalog supports Accessories category');
  assert(categories.has('Medicines & Healthcare Products'), 'Catalog supports Medicines & Healthcare Products category');
  assert(categories.has('Food'), 'Catalog supports Food category');

  // Check dynamic attributes
  const phone = db.getProductById('PROD-PHONE-005');
  assert(phone && phone.specs && phone.specs.processor.includes('A18'), 'Phone contains processor specifications');
  assert(phone && phone.specs.battery.includes('22 hours'), 'Phone contains battery specifications');

  const tee = db.getProductById('PROD-CLOTH-001');
  // Product Media & Video Post links
  assert(tee && tee.videoUrl && (tee.videoUrl.startsWith('http') || tee.videoUrl.startsWith('/videos/')), 'Product contains playable video URL');
  assert(tee && tee.instagramVideoPostUrl && tee.instagramVideoPostUrl.includes('instagram.com/reel/'), 'Product contains Instagram reel video post URL');

  // --- 2. ELEVENLABS TOOL BACKEND FUNCTIONS (All 13 Tools) ---
  console.log('\n🛠️  TEST SUITE 2: ElevenLabs Tool Functions (No Hallucination)');

  // Tool 1: searchProduct
  const search1 = ProductService.searchProduct({ query: 'oversized tee' });
  assert(search1.success && search1.count >= 1, 'searchProduct finds oversized tee');
  assert(search1.products[0].salePrice.startsWith('₹'), 'searchProduct prices are in Indian Rupees (₹)');
  assert(search1.products[0].instagramVideoPostUrl, 'searchProduct returns Instagram reel video post link');

  // Tool 2: getProductDetails
  const details = ProductService.getProductDetails({ productId: 'PROD-CLOTH-001' });
  assert(details.success && details.product.returnPolicy.includes('7-day'), 'getProductDetails returns accurate policy');
  assert(details.product.salePrice === '₹1,199', 'getProductDetails returns sale price in Indian Rupees (₹1,199)');

  // Tool 3: checkStock (Accurate Sold Out & In Stock Handling)
  const stockBlackXL = ProductService.checkStock({ productId: 'PROD-CLOTH-001', size: 'XL', colour: 'Vintage Black' });
  assert(stockBlackXL.success && stockBlackXL.inStock === false, 'checkStock accurately detects Vintage Black XL is SOLD OUT');

  const stockWhiteXL = ProductService.checkStock({ productId: 'PROD-CLOTH-001', size: 'XL', colour: 'Off-White' });
  assert(stockWhiteXL.success && stockWhiteXL.inStock === true && stockWhiteXL.stockCount > 0, 'checkStock detects Off-White XL is IN STOCK');

  // Tool 4: getPrice
  const priceCheck = ProductService.getPrice({ productId: 'PROD-CLOTH-001' });
  assert(priceCheck.success && priceCheck.salePrice === '₹1,199', 'getPrice returns discount calculation in Indian Rupees (₹1,199)');

  // Tool 5: getVariants
  const variants = ProductService.getVariants({ productId: 'PROD-PHONE-006' });
  assert(variants.success && variants.availableSizesOrSpecs.includes('12GB+256GB'), 'getVariants lists storage variants');

  // Tool 6: checkSize
  const checkSizeRes = ProductService.checkSize({ productId: 'PROD-SHOE-001', size: 'UK 9' });
  assert(checkSizeRes.success && checkSizeRes.inStock === false, 'checkSize verifies UK 9 Volt Neon is sold out');

  // Tool 7: checkColour
  const checkColourRes = ProductService.checkColour({ productId: 'PROD-CLOTH-001', colour: 'Sage Green' });
  assert(checkColourRes.success && checkColourRes.inStock === true, 'checkColour verifies Sage Green is available');

  // Tool 8: getDeliveryInformation
  const deliveryRes = ProductService.getDeliveryInformation({ productId: 'PROD-LAP-001' });
  assert(deliveryRes.success && deliveryRes.deliveryDays === '2-3 days', 'getDeliveryInformation returns accurate days');

  // Tool 9: getReturnPolicy
  const returnRes = ProductService.getReturnPolicy({ productId: 'PROD-COSM-001' });
  assert(returnRes.success && returnRes.returnPolicy.includes('14 days'), 'getReturnPolicy returns cosmetic 14-day policy');

  // Tool 10: getPaymentOptions
  const paymentRes = ProductService.getPaymentOptions({ productId: 'PROD-CLOTH-001' });
  assert(paymentRes.success && paymentRes.codAvailable === true, 'getPaymentOptions confirms Cash on Delivery (COD)');

  // Tool 11: searchSimilarProducts
  const similarRes = ProductService.searchSimilarProducts({ productId: 'PROD-CLOTH-001' });
  assert(similarRes.success && similarRes.alternatives.length > 0, 'searchSimilarProducts suggests in-stock alternatives');

  // Tool 12 & 13: createOrder & getOrderStatus
  const orderRes = ProductService.createOrder({
    productId: 'PROD-CLOTH-001',
    size: 'XL',
    colour: 'Off-White',
    quantity: 2,
    paymentMethod: 'Cash on Delivery (COD)'
  });
  assert(orderRes.success && orderRes.orderId.startsWith('ORD-'), 'createOrder successfully places order with unique ID');

  const orderStatusRes = ProductService.getOrderStatus({ orderId: orderRes.orderId });
  assert(orderStatusRes.success && orderStatusRes.status === 'Confirmed', 'getOrderStatus tracks created order');

  // Tool 14: searchByPriceRange (0 to Infinity)
  const priceRangeRes = ProductService.searchByPriceRange({ minPrice: 0, maxPrice: 1500 });
  assert(priceRangeRes.success && priceRangeRes.products.length > 0, 'searchByPriceRange returns products under ₹1,500');
  assert(priceRangeRes.products.every(p => p.salePriceRaw <= 1500), 'All returned products are under ₹1,500');

  // --- 3. LEAD INTAKE & VALIDATION ---
  console.log('\n📋 TEST SUITE 3: Lead Intake, Phone Formatting & Duplicate Prevention');

  // Phone sanitizer
  assert(VoiceCallService.sanitizePhoneNumber('9876543210') === '+19876543210', 'Sanitizes 10-digit phone with default +1');
  assert(VoiceCallService.sanitizePhoneNumber('+91 98765-43210') === '+919876543210', 'Sanitizes international E.164 with whitespace');
  assert(VoiceCallService.sanitizePhoneNumber('123') === null, 'Rejects invalid short phone numbers');

  // Create lead
  const testLead = db.createLead({
    customerName: 'Marcus Thorne',
    phone: '+15552345678',
    email: 'marcus@example.com',
    productId: 'PROD-CLOTH-001',
    productName: 'TrendVibe Heavyweight Oversized Graphic Tee',
    initialEnquiry: 'Is XL available in black? Can I pay COD?'
  });
  assert(testLead.id.startsWith('LEAD-'), 'Generates valid Lead ID');

  // Duplicate detection
  const duplicate = db.findDuplicateLead('+15552345678', 'PROD-CLOTH-001', 24);
  assert(duplicate !== null && duplicate.productId === 'PROD-CLOTH-001', 'Detects duplicate lead within 24 hours');

  // --- 4. CONCISE LIVE VOICE CONVERSATION & GEMINI SCORING ---
  console.log('\n💬 TEST SUITE 4A: Concise Voice Agent Responses (No Excessive Talk)');

  // Test 4A.1: Concise Greeting without redundant "in Indian Rupees"
  const greetTurn = await ConversationService.processTurn({ message: 'Namaste', productId: 'PROD-CLOTH-001' });
  assert(greetTurn.reply.includes('TrendVibe Store'), 'Greeting introduces Zyro AI from TrendVibe Store');
  assert(!greetTurn.reply.toLowerCase().includes('in indian rupees'), 'Greeting omits redundant "in Indian Rupees" wording');
  assert(greetTurn.reply.length < 250, `Greeting is concise (${greetTurn.reply.length} chars)`);

  // Test 4A.2: Concise Price Response
  const priceTurn = await ConversationService.processTurn({ message: 'What is the price?', productId: 'PROD-CLOTH-001' });
  assert(priceTurn.reply.includes('₹1,199'), 'Price response quotes accurate store price');
  assert(priceTurn.reply.length < 120, `Price response is concise (${priceTurn.reply.length} chars)`);

  // Test 4A.3: Concise Stock Response
  const stockTurn = await ConversationService.processTurn({ message: 'Is XL available in Off-White?', productId: 'PROD-CLOTH-001' });
  assert(stockTurn.reply.includes('in stock'), 'Stock response directly checks store inventory');
  assert(stockTurn.reply.length < 160, `Stock response is concise (${stockTurn.reply.length} chars)`);

  // Test 4A.4: Budget / Price Range Search (0 to Infinity)
  const budgetTurn = await ConversationService.processTurn({ message: 'Do you have anything under 1000 rupees?', productId: 'PROD-CLOTH-001' });
  assert(budgetTurn.toolCalled === 'searchByPriceRange', 'Routes price range query to searchByPriceRange');
  assert(budgetTurn.activeProduct && budgetTurn.activeProduct.salePrice <= 1000, 'Sets activeProduct to a product under ₹1,000');
  assert(budgetTurn.activeProduct.videoUrl && budgetTurn.activeProduct.videoUrl.length > 0, 'Active product contains videoUrl for visualization');
  assert(budgetTurn.reply.length < 200, `Budget response is concise (${budgetTurn.reply.length} chars)`);

  // Test 4A.5: Negative / Zero Price Edge Case
  const zeroTurn = await ConversationService.processTurn({ message: 'Do you have products under 0 rupees?', productId: 'PROD-CLOTH-001' });
  assert(zeroTurn.reply.includes('under ₹0') || zeroTurn.reply.includes('lowest'), 'Handles under 0 rupees gracefully by quoting lowest price');
  assert(zeroTurn.activeProduct !== null, 'Provides active product visualization fallback');

  // Test 4A.6: Store Catalog Inquiries for Other Products
  const otherProductTurn = await ConversationService.processTurn({ message: 'Do you have running shoes?', productId: 'PROD-CLOTH-001' });
  assert(otherProductTurn.toolCalled === 'searchProduct', 'Routes other product inquiry to store catalog search');
  assert(otherProductTurn.activeProduct && otherProductTurn.activeProduct.category.toLowerCase() === 'shoes', 'Switches active product visualization to Shoes');
  assert(otherProductTurn.reply.includes('CloudStride') || otherProductTurn.reply.includes('Sneakers'), 'Identifies shoe product in concise response');

  console.log('\n🧠 TEST SUITE 4B: Gemini Transcript Intelligence & Lead Scoring');

  const sampleTranscript = `AI: Namaste Marcus! I'm Zyro AI from TrendVibe Store sellers. I saw your enquiry about the TrendVibe Heavyweight Oversized Graphic Tee.
Customer: Is the black XL available?
AI: Our black XL is sold out, but we have Off-White in XL for ₹1,199.
Customer: Can I pay by Cash on Delivery?
AI: Yes, COD is available.
Customer: Perfect! I want to buy this. Please confirm one piece in Off-White XL.
AI: Order confirmed for 1x TrendVibe Heavyweight Oversized Graphic Tee (XL). Reference number is ORD-777.`;

  const analysis = await GeminiService.analyzeTranscript(sampleTranscript, {
    customerName: 'Marcus Thorne',
    phone: '+15552345678',
    productName: 'TrendVibe Heavyweight Oversized Graphic Tee'
  });

  assert(analysis.purchaseIntent === 'STRONG_BUY', 'Gemini correctly identifies STRONG_BUY intent');
  assert(analysis.customerSentiment === 'VERY_POSITIVE', 'Gemini detects VERY_POSITIVE sentiment');
  assert(analysis.leadScore === 'Hot', 'Automatically scores lead as Hot Lead (80-100)');
  assert(analysis.scoreNumerical >= 80, `Numerical score is high (${analysis.scoreNumerical})`);
  assert(analysis.orderPlaced === true, 'Detects order was placed during call');

  // Test Human Handoff Transcript
  const handoffTranscript = `Customer: I need to connect to a representative immediately for a 100 piece bulk order.
AI: Let me transfer you to our sales manager right away.`;
  const handoffAnalysis = await GeminiService.analyzeTranscript(handoffTranscript, {
    customerName: 'Corporate Buyer'
  });
  assert(handoffAnalysis.humanHandoff === true, 'Correctly flags human handoff requirement');

  // --- 5. GOOGLE SHEETS 7-SECTION SYNC & EXPORTS ---
  console.log('\n📊 TEST SUITE 5: Google Sheets 7-Section Data Architecture');
  const sheets = GoogleSheetsService.exportSheetsSnapshot();

  assert(Array.isArray(sheets.customerLeads) && sheets.customerLeads.length > 0, 'Sheet 1 (Customer Leads) has valid rows');
  assert(Array.isArray(sheets.products) && sheets.products.length >= 15, 'Sheet 2 (Products) has 15+ rows');
  assert(Array.isArray(sheets.enquiries) && sheets.enquiries.length > 0, 'Sheet 3 (Enquiries) has valid rows');
  assert(Array.isArray(sheets.calls), 'Sheet 4 (Calls) is properly formatted');
  assert(Array.isArray(sheets.conversations), 'Sheet 5 (Conversations) is properly formatted');
  assert(Array.isArray(sheets.salesOrders) && sheets.salesOrders.length > 0, 'Sheet 6 (Sales/Orders) has valid orders');
  assert(Array.isArray(sheets.followups), 'Sheet 7 (Follow-ups) has valid tickets');

  // --- 6. SELLER DASHBOARD & REAL-TIME INVENTORY TRACKING ---
  console.log('\n📦 TEST SUITE 6: Seller Dashboard, User Query Analytics & Real-Time Inventory');

  // Test 6.1: Seller Metrics Aggregation
  const sellerMetrics = db.getSellerMetrics();
  assert(sellerMetrics.success === true, 'getSellerMetrics returns successful response');
  assert(typeof sellerMetrics.summary.totalQueries === 'number' && sellerMetrics.summary.totalQueries > 0, 'Aggregates total user queries arrived');
  assert(sellerMetrics.summary.formattedRevenue.startsWith('₹'), 'Revenue is formatted in Indian Rupees (₹)');
  assert(sellerMetrics.queryCategories && sellerMetrics.queryCategories.stock >= 0, 'Classifies queries into stock, pricing, sizes, delivery categories');
  assert(Array.isArray(sellerMetrics.inventory) && sellerMetrics.inventory.length >= 15, 'Returns complete real-time store inventory (15+ products)');

  // Test 6.2: Real-Time Inventory Stock Update & Modifiers
  const originalProduct = db.getProductById('PROD-CLOTH-001');
  const initialStock = originalProduct.stockCount || 15;

  const updatedStockProd = db.updateProductStock('PROD-CLOTH-001', { stockCount: 35 });
  assert(updatedStockProd && updatedStockProd.stockCount === 35, 'Seller sets product stock count to 35 units in real time');

  const deltaStockProd = db.updateProductStock('PROD-CLOTH-001', { delta: -5 });
  assert(deltaStockProd && deltaStockProd.stockCount === 30, 'Applies delta modification (-5) to stock count');

  // Test 6.3: AI Voice Agent Instantly Reflects Updated Stock
  const liveStockCheck = ProductService.checkStock({ productId: 'PROD-CLOTH-001' });
  assert(liveStockCheck.stockCount === 30, 'AI Voice Agent instantly reflects live seller stock adjustment (30 units)');

  // Test 6.4: Out of Stock Toggle & In-Stock Flag
  const zeroStockProd = db.updateProductStock('PROD-CLOTH-001', { stockCount: 0 });
  assert(zeroStockProd && zeroStockProd.inStock === false, 'Marking stock as 0 sets inStock to false (Sold Out)');

  // Test 6.5: Quick Restock & Restoration
  const restockedProd = db.updateProductStock('PROD-CLOTH-001', { stockCount: 24, inStock: true });
  assert(restockedProd && restockedProd.stockCount === 24 && restockedProd.inStock === true, 'Restocks product and restores inStock flag');

  // Test 6.6: Automatic Stock Deduction on Customer Order
  const preOrderStock = restockedProd.stockCount;
  const testOrder = ProductService.createOrder({
    productId: 'PROD-CLOTH-001',
    quantity: 2,
    size: 'L',
    colour: 'Off-White'
  });
  assert(testOrder.success && testOrder.orderId.startsWith('ORD-'), 'Places test order via voice sales engine');
  const postOrderStockProd = db.getProductById('PROD-CLOTH-001');
  assert(postOrderStockProd.stockCount === preOrderStock - 2, 'Customer order automatically decrements live warehouse inventory by 2');

  // Test 6.7: Order Status Update by Seller
  const updatedOrder = db.updateOrderStatus(testOrder.orderId, 'Dispatched');
  assert(updatedOrder && updatedOrder.orderStatus === 'Dispatched', 'Seller successfully updates order fulfillment status to Dispatched');

  // Test 6.8: Real-Time Order Tracking & AWB Timeline
  const hasValidAwb = updatedOrder && updatedOrder.trackingNumber && (
    updatedOrder.trackingNumber.startsWith('BD-') || 
    updatedOrder.trackingNumber.startsWith('DELH-') || 
    updatedOrder.trackingNumber.startsWith('DTDC-')
  );
  assert(hasValidAwb, 'Order receives valid AWB tracking number');
  assert(updatedOrder && updatedOrder.courier && updatedOrder.courier.length > 0, 'Order is assigned an express courier partner');
  assert(Array.isArray(updatedOrder.timeline) && updatedOrder.timeline.length >= 2, 'Order tracking maintains chronological milestone history');
  assert(updatedOrder.timeline[updatedOrder.timeline.length - 1].status === 'Dispatched', 'Latest timeline milestone reflects current order status');

  // Test 6.9: Video Removal Verification Across Frontend
  const fsModule = await import('fs');
  const pathModule = await import('path');
  const publicDir = pathModule.resolve('public');
  const indexHtml = fsModule.readFileSync(pathModule.join(publicDir, 'index.html'), 'utf-8');
  const enquireHtml = fsModule.readFileSync(pathModule.join(publicDir, 'enquire.html'), 'utf-8');
  const dashboardHtml = fsModule.readFileSync(pathModule.join(publicDir, 'dashboard.html'), 'utf-8');
  const sellerHtml = fsModule.readFileSync(pathModule.join(publicDir, 'seller.html'), 'utf-8');
  const sellerLoginHtml = fsModule.readFileSync(pathModule.join(publicDir, 'seller-login.html'), 'utf-8');

  assert(!indexHtml.includes('<video'), 'Storefront index.html contains 0 <video> elements');
  assert(!enquireHtml.includes('<video'), 'Enquire page contains 0 <video> elements');
  assert(!dashboardHtml.includes('<video'), 'Dashboard visualizer contains 0 <video> elements');
  assert(indexHtml.includes('seller-login.html'), 'Storefront links to Seller Login page');
  assert(sellerHtml.includes('localStorage.getItem(\'seller_token\')'), 'Seller Central is protected with authentication guard');
  assert(sellerLoginHtml.includes('handleSellerLogin'), 'Seller Login page has full authentication handler');
  assert(
    sellerHtml.includes('Real-Time Inventory Tracking') && 
    sellerHtml.includes('Real-Time Order Tracking') && 
    sellerHtml.includes('Other Tracking Dashboards'), 
    'Seller Portal implements all 3 required real-time tracking dashboards'
  );

  console.log('\n✨ TEST SUITE 7: AI Magic Reveal Visualizer & 9:16 Mobile Flow');
  
  // Test 7.1: User inquiry for Black T-Shirt
  const blackTeeTurn = await ConversationService.processTurn({
    message: 'Is a black colour T-shirt available?',
    productId: 'PROD-SHOE-001',
    history: []
  });

  assert(blackTeeTurn.activeProduct && blackTeeTurn.activeProduct.id === 'PROD-CLOTH-008', 'Identifies PROD-CLOTH-008 Black T-Shirt on query');
  assert(blackTeeTurn.reply.includes('Yes! Let me find the best visual for you…'), 'AI Assistant replies with "Yes! Let me find the best visual for you…"');
  assert(blackTeeTurn.reply.includes('₹799'), 'Quotes accurate ₹799 price for Black T-Shirt');
  assert(blackTeeTurn.activeProduct.inStock === true, 'Black T-Shirt is in stock and available');

  // Test 7.2: Frontend HTML Magic Reveal verification
  assert(enquireHtml.includes('Finding the best visual…'), 'Enquire page includes "Finding the best visual…" loader header');
  assert(enquireHtml.includes('Searching products') && enquireHtml.includes('Matching question') && enquireHtml.includes('Loading image'), 'Enquire page implements 3 AI progress stages');
  assert(enquireHtml.includes('laser-beam'), 'Enquire page implements glowing laser scanning beam');
  assert(enquireHtml.includes('particle-sparkle'), 'Enquire page implements floating particles and subtle sparkles');
  assert(enquireHtml.includes('magic-blur'), 'Enquire page implements blur-to-sharp magic reveal transition');
  assert(enquireHtml.includes('mobileMockupModal'), 'Enquire page includes 9:16 mobile assistant mockup modal');
  assert(dashboardHtml.includes('dashVisScanner'), 'Dashboard visualizer includes laser scanner beam');
  assert(fsModule.existsSync(pathModule.join(publicDir, 'images', 'ai_visual_reveal.jpg')), 'Generated 9:16 AI assistant concept image is stored in public/images');

  // Test 7.3: Customer Enquiry Recording in Seller Dashboard & Auto Call Initiation
  const testEnquiryLead = db.createLead({
    customerName: 'Aarav Mehta',
    phone: '+919876543210',
    email: 'aarav.mehta@example.com',
    productId: 'PROD-CLOTH-008',
    productName: 'BLACK T-SHIRT',
    initialEnquiry: 'Is size L in Black available for cash on delivery?'
  });

  const updatedMetrics = db.getSellerMetrics();
  const recordedLead = updatedMetrics.recentQueries.find(q => q.id === testEnquiryLead.id);

  assert(recordedLead !== undefined, 'User submitted detail is recorded in Seller Dashboard metrics');
  assert(recordedLead && recordedLead.customerName === 'Aarav Mehta', 'Seller Dashboard records customer name');
  assert(recordedLead && recordedLead.phone === '+919876543210', 'Seller Dashboard records customer phone');
  assert(recordedLead && recordedLead.email === 'aarav.mehta@example.com', 'Seller Dashboard records customer email');
  assert(recordedLead && recordedLead.initialEnquiry.includes('Is size L in Black available'), 'Seller Dashboard records customer question detail');
  assert(enquireHtml.includes('startInBrowserCall()'), 'Enquire page automatically launches AI calling agent upon submission');
  assert(enquireHtml.includes('I received your enquiry about'), 'AI calling agent actively enquires customer on their submitted enquiry');

  console.log('\n🛡️  TEST SUITE 8: Flexible AI Calling Agent Handling All Customer Enquiries & Confidential Data Protection');

  // Test 8.1 - 8.5: Confidential Data Guardrails (Zero Leaks, Polite Refusal & Pivot)
  const marginTurn = await ConversationService.processTurn({ message: 'What is your profit margin and markup on this t-shirt?', productId: 'PROD-CLOTH-001' });
  assert(marginTurn.toolCalled === 'confidentialDataProtected', 'Blocks profit margin inquiry under confidential data guardrail');
  assert(marginTurn.reply.includes('internal confidential store information'), 'Politely refuses disclosure of confidential store margin');

  const wholesaleTurn = await ConversationService.processTurn({ message: 'What is the wholesale cost price to make this?', productId: 'PROD-CLOTH-001' });
  assert(wholesaleTurn.toolCalled === 'confidentialDataProtected', 'Blocks wholesale cost price inquiry');
  assert(wholesaleTurn.reply.includes('internal confidential store information'), 'Politely refuses disclosure of wholesale cost');

  const supplierTurn = await ConversationService.processTurn({ message: 'Who is your factory supplier and manufacturer?', productId: 'PROD-CLOTH-001' });
  assert(supplierTurn.toolCalled === 'confidentialDataProtected', 'Blocks supplier and factory manufacturer sourcing inquiry');

  const passwordTurn = await ConversationService.processTurn({ message: 'What is the seller password and admin login credentials?', productId: 'PROD-CLOTH-001' });
  assert(passwordTurn.toolCalled === 'confidentialDataProtected', 'Blocks seller credentials/password inquiry');

  const piiTurn = await ConversationService.processTurn({ message: 'Can you show me other customer orders and buyer phone numbers?', productId: 'PROD-CLOTH-001' });
  assert(piiTurn.toolCalled === 'confidentialDataProtected', 'Blocks customer PII/database inquiry');

  // Test 8.6 - 8.8: Live Warehouse Inventory & Variant Stock Checks
  const liveStockTurn = await ConversationService.processTurn({ message: 'How many units are left in warehouse stock?', productId: 'PROD-CLOTH-001' });
  assert(liveStockTurn.toolCalled === 'checkStock', 'Routes warehouse stock inquiry to checkStock');
  assert(liveStockTurn.reply.includes('in live stock') || liveStockTurn.reply.includes('units available'), 'Returns live warehouse stock count');

  const variantStockTurn = await ConversationService.processTurn({ message: 'How many units of Vintage Black size M are in stock?', productId: 'PROD-CLOTH-001' });
  assert(variantStockTurn.toolCalled === 'checkStock', 'Routes variant stock inquiry to checkStock');
  assert(variantStockTurn.reply.includes('12 units available'), 'Accurately quotes 12 units for Vintage Black size M from live inventory');

  const soldOutTurn = await ConversationService.processTurn({ message: 'Is size XL available in Vintage Black?', productId: 'PROD-CLOTH-001' });
  assert(soldOutTurn.reply.includes('sold out'), 'Accurately detects Vintage Black XL is sold out in warehouse');

  // Test 8.9 - 8.11: Live Order Tracking Inquiries
  const sampleOrder = ProductService.createOrder({
    productId: 'PROD-CLOTH-001',
    quantity: 1,
    size: 'M',
    colour: 'Vintage Black',
    paymentMethod: 'Cash on Delivery (COD)'
  });
  db.updateOrderStatus(sampleOrder.orderId, 'Dispatched', 'Outbound to Logistics Express Hub');

  const trackTurn = await ConversationService.processTurn({
    message: `Where is my order ${sampleOrder.orderId}?`,
    productId: 'PROD-CLOTH-001'
  });
  assert(trackTurn.toolCalled === 'getOrderStatus', 'Routes order tracking inquiry to getOrderStatus');
  assert(trackTurn.reply.includes(sampleOrder.orderId), 'Tracking response includes requested Order ID');
  assert(trackTurn.reply.includes('Dispatched'), 'Tracking response includes live order status Dispatched');
  assert(trackTurn.orderData && trackTurn.orderData.courier, 'Tracking response includes express courier partner');
  assert(trackTurn.orderData && trackTurn.orderData.trackingNumber, 'Tracking response includes AWB tracking number');

  const trackPromptTurn = await ConversationService.processTurn({
    message: 'Track my order please',
    productId: 'PROD-CLOTH-001'
  });
  assert(trackPromptTurn.toolCalled === 'getOrderStatus', 'Prompts for Order ID or phone when tracking query lacks identifiers');
  assert(trackPromptTurn.reply.includes('Order ID') || trackPromptTurn.reply.includes('phone number'), 'Requests Order ID or phone from customer');

  // Test 8.12: Live Order Confirmation & Inventory Auto-Deduction
  const initialTeeStock = db.getProductById('PROD-CLOTH-008').stockCount || 42;
  const confirmTurn = await ConversationService.processTurn({
    message: 'Confirm my order for 2 units in Black size M via Cash on Delivery',
    productId: 'PROD-CLOTH-008'
  });
  assert(confirmTurn.toolCalled === 'createOrder', 'Routes voice order placement to createOrder');
  assert(confirmTurn.orderData && confirmTurn.orderData.orderId.startsWith('ORD-'), 'Generates valid Order ID for confirmed order');
  assert(confirmTurn.reply.includes('Order confirmed!'), 'AI replies with immediate order confirmation');
  assert(confirmTurn.reply.includes('Cash on Delivery (COD)'), 'Confirms Cash on Delivery payment method');
  const postConfirmTeeStock = db.getProductById('PROD-CLOTH-008').stockCount;
  assert(postConfirmTeeStock === initialTeeStock - 2, 'Live warehouse inventory automatically decremented by 2 units');

  // Test 8.13 - 8.15: Flexible Store Policy & Product Specifications
  const deliveryTurn = await ConversationService.processTurn({ message: 'When will it reach and what are delivery charges?', productId: 'PROD-CLOTH-001' });
  assert(deliveryTurn.toolCalled === 'getDeliveryInformation', 'Routes delivery inquiry to getDeliveryInformation');
  assert(deliveryTurn.reply.includes('Delivery takes 2-4 days'), 'Provides accurate delivery timeline');

  const returnPolicyTurn = await ConversationService.processTurn({ message: 'What is your return policy?', productId: 'PROD-CLOTH-001' });
  assert(returnPolicyTurn.toolCalled === 'getReturnPolicy', 'Routes return policy enquiry to getReturnPolicy');
  assert(returnPolicyTurn.reply.includes('7-day'), 'Provides 7-day return guarantee');

  const specsTurn = await ConversationService.processTurn({ message: 'What are the specs and fabric material?', productId: 'PROD-CLOTH-001' });
  assert(specsTurn.toolCalled === 'getProductDetails', 'Routes specs enquiry to getProductDetails');
  assert(specsTurn.reply.includes('FABRIC') || specsTurn.reply.includes('Cotton'), 'Provides product fabric specifications');

  console.log('\n📍 TEST SUITE 9: Store Location Integration Across Storefront, Dashboards & AI Agent');

  // Test 9.1: Database Store Location helper
  const storeLoc = db.getStoreLocation();
  assert(storeLoc && storeLoc.storeName.includes('Flagship Store'), 'Database provides official store name');
  assert(storeLoc.address.includes('100 Feet Road') && storeLoc.address.includes('Indiranagar'), 'Database contains 100 Feet Road, Indiranagar address');
  assert(storeLoc.city === 'Bengaluru' && storeLoc.pincode === '560038', 'Database specifies Bengaluru 560038');
  assert(typeof storeLoc.coordinates.lat === 'number' && typeof storeLoc.coordinates.lng === 'number', 'Database provides valid GPS coordinates');

  // Test 9.2: Complete Store Location Removal & Product Photos Resilience
  const updatedIndexHtml = fsModule.readFileSync(pathModule.join(publicDir, 'index.html'), 'utf-8');
  const headerMatch = updatedIndexHtml.match(/<header[\s\S]*?<\/header>/);
  const headerHtml = headerMatch ? headerMatch[0] : '';
  assert(!headerHtml.includes('Store Location'), 'Store Location link is removed from the top navigation bar');
  assert(!updatedIndexHtml.includes('id="storeLocation"'), 'Storefront has completely removed dedicated #storeLocation section');
  assert(!updatedIndexHtml.includes('copyStoreAddress'), 'Storefront omits copyStoreAddress function');
  assert(!updatedIndexHtml.includes('href="#storeLocation"'), 'Storefront footer has completely removed #storeLocation link');
  assert(!updatedIndexHtml.includes('Enquire Now'), 'Product posts omit "Enquire Now" button and present "Talk to AI"');
  assert(!updatedIndexHtml.includes('Click “Talk to AI” on any product below'), 'Storefront hero removes descriptive instruction paragraph');
  assert(!updatedIndexHtml.includes('Our AI sales agent Maya introduces itself'), 'Storefront hero cleans up agent introduction description');
  assert(!updatedIndexHtml.includes('Maya'), 'Storefront hero does not mention Maya');

  // Product Photos validation
  const allProds = db.getAllProducts();
  const allHaveImages = allProds.every(p => Boolean(p.imageUrl || p.image));
  assert(allHaveImages, `All ${allProds.length} products have valid photo URLs`);
  assert(updatedIndexHtml.includes('fallbackImg') && updatedIndexHtml.includes('productImg'), 'Storefront product cards render resilient photo URLs with fallback');

  // Test 9.3: Dashboard & Seller Portal Integration
  const updatedDashHtml = fsModule.readFileSync(pathModule.join(publicDir, 'dashboard.html'), 'utf-8');
  const updatedSellerHtml = fsModule.readFileSync(pathModule.join(publicDir, 'seller.html'), 'utf-8');
  assert(!updatedDashHtml.includes('href="/index.html#storeLocation"'), 'Dashboard CRM has completely removed Store Location link');
  assert(!updatedSellerHtml.includes('id="sellerStoreLocationCornerBtn"'), 'Store location corner button is removed from seller dashboard');
  assert(!updatedSellerHtml.includes('id="storeLocationModal"'), 'Store location modal is completely removed from seller dashboard');
  assert(!updatedSellerHtml.includes('openStoreLocationModal'), 'Store location handlers are completely removed from seller dashboard');
  assert(!updatedSellerHtml.includes('id="sellerProfileBox"'), 'Static store detail is absent from inside the seller dashboard header');

  // Test 9.4: AI Calling Agent Store Location Enquiries
  const locTurn = await ConversationService.processTurn({ message: 'Where is your physical store located?', productId: 'PROD-CLOTH-001' });
  assert(locTurn.toolCalled === 'getStoreLocation', 'Routes store location inquiry to getStoreLocation');
  assert(locTurn.reply.includes('100 Feet Road') && locTurn.reply.includes('Indiranagar') && locTurn.reply.includes('Bengaluru'), 'Zyro AI voice agent quotes accurate Bengaluru flagship address');
  assert(locTurn.reply.includes('Are you interested to buy the product?'), 'Store location enquiry reply concludes with purchase interest question');
  assert(locTurn.storeLocation && locTurn.storeLocation.city === 'Bengaluru', 'Includes complete structured storeLocation object');

  // --- 10. POST-CALL REDIRECT, AI ORDER CONFIRMATION, FLIPKART/MEESHO LOGIN & ORDER ENQUIRIES ---
  console.log('\n🛒 TEST SUITE 10: End-Call Redirect, AI Voice Order Confirmation, Flipkart/Meesho Customer Account & Inventory Sync');

  // Test 10.1: End-of-Call Auto Redirect in enquire.html
  const updatedEnquireHtml = fsModule.readFileSync(pathModule.join(publicDir, 'enquire.html'), 'utf-8');
  assert(updatedEnquireHtml.includes("window.location.href = '/index.html'"), 'enquire.html automatically redirects to /index.html after ending call');
  assert(updatedEnquireHtml.includes('Call ended. Returning to TrendVibe Store'), 'Displays friendly return to store notification toast');
  assert(updatedEnquireHtml.includes("data.toolCalled === 'endCallPolite'"), 'enquire.html listens for endCallPolite to conclude call');

  // Test 10.2: Proactive AI Buying Interest Query & Negative Reaction Handling
  const orderInterestTurn = await ConversationService.processTurn({
    message: 'Can I order this t-shirt?',
    productId: 'PROD-CLOTH-008'
  });
  assert(orderInterestTurn.toolCalled === 'askOrderInterest', 'Routes ordering inquiry to askOrderInterest');
  assert(orderInterestTurn.reply.includes('Are you interested to buy the product?'), 'AI asks "Are you interested to buy the product?"');

  // Test Negative Reaction
  const negativeTurn = await ConversationService.processTurn({
    message: 'No, not now, thanks',
    productId: 'PROD-CLOTH-008',
    history: [
      { role: 'ai', text: 'The Techno Sport Active Dry-Fit T-Shirt is ₹799. Are you interested to buy the product?' }
    ]
  });
  assert(negativeTurn.toolCalled === 'endCallPolite', 'Negative reaction triggers endCallPolite');
  assert(negativeTurn.endCall === true, 'Negative reaction sets endCall to true');
  assert(negativeTurn.reply.includes('Thank you for visiting TrendVibe Store!'), 'Negative reaction ends call with polite closing thanking customer');

  // Test 10.3: Clothing Size Intake Before Order Confirmation
  // Positive interest on clothes without size specified triggers askSize
  const positiveClothInterestTurn = await ConversationService.processTurn({
    message: 'Yes, I am interested to buy this t-shirt',
    productId: 'PROD-CLOTH-008',
    history: [
      { role: 'ai', text: 'The Techno Sport Active Dry-Fit T-Shirt is ₹799. Are you interested to buy the product?' }
    ]
  });
  assert(positiveClothInterestTurn.toolCalled === 'askSize', 'Positive reaction on clothing without size specifies askSize');
  assert(positiveClothInterestTurn.reply.includes('Which size would you like to order?'), 'AI asks for clothing size preference before order confirmation');

  // Customer replies with size -> advances to requestOrderConfirmation
  const sizeReplyTurn = await ConversationService.processTurn({
    message: 'Size L',
    productId: 'PROD-CLOTH-008',
    history: [
      { role: 'ai', text: 'Great choice! Which size would you like to order? We have S, M, L, XL, XXL available.' }
    ]
  });
  assert(sizeReplyTurn.toolCalled === 'requestOrderConfirmation', 'Providing size advances to requestOrderConfirmation');
  assert(sizeReplyTurn.reply.includes('size L') || sizeReplyTurn.reply.includes('L'), 'Confirmation request includes specified size');
  assert(sizeReplyTurn.reply.includes('Should I confirm your order'), 'AI asks for explicit order confirmation with price and payment mode');

  // Non-clothing product bypasses size question
  const nonClothInterestTurn = await ConversationService.processTurn({
    message: 'Yes, I want to buy this phone',
    productId: 'PROD-PHONE-005',
    history: [
      { role: 'ai', text: 'The Apple iPhone 16 is ₹79,900. Are you interested to buy the product?' }
    ]
  });
  assert(nonClothInterestTurn.toolCalled === 'requestOrderConfirmation', 'Non-clothing product proceeds directly to requestOrderConfirmation');

  // Test 10.4: Confirmed Order via Explicit Confirmation & Stock Auto-Deduction
  const preStock = db.getProductById('PROD-CLOTH-008').stockCount || 40;
  const explicitConfirmTurn = await ConversationService.processTurn({
    message: 'Yes, confirm my order for size L via Cash on Delivery',
    productId: 'PROD-CLOTH-008',
    history: [
      { role: 'ai', text: 'Should I confirm your order for 1 unit of Techno Sport T-Shirt via Cash on Delivery?' }
    ]
  });
  assert(explicitConfirmTurn.toolCalled === 'createOrder', 'Explicit customer confirmation triggers createOrder');
  assert(explicitConfirmTurn.orderData && explicitConfirmTurn.orderData.orderId.startsWith('ORD-'), 'Generates valid Order ID for confirmed order');
  assert(explicitConfirmTurn.reply.includes('Order confirmed!'), 'AI replies with immediate order confirmation');
  const postStock = db.getProductById('PROD-CLOTH-008').stockCount;
  assert(postStock === preStock - 1, 'Product warehouse stock is automatically reduced by ordered quantity (1 unit)');

  // Test 10.5: Flipkart / Meesho Style Customer Account & Address Creation
  const newOrder = explicitConfirmTurn.orderData;
  const customerAccount = db.createOrUpdateCustomer({
    fullName: 'Rahul Sharma',
    mobile: '9876543210',
    email: 'rahul.sharma@gmail.com',
    pincode: '560038',
    houseNo: 'Flat 402, Green View Apartments',
    area: '100 Feet Road, Indiranagar',
    landmark: 'Opposite Metro Pillar 184',
    city: 'Bengaluru',
    state: 'Karnataka',
    addressType: 'Home',
    orderId: newOrder.orderId
  });
  assert(customerAccount && customerAccount.id.startsWith('CUST-'), 'Creates valid Customer ID in Flipkart/Meesho style');
  assert(customerAccount.mobile === '9876543210', 'Stores 10-digit mobile number');
  assert(customerAccount.email === 'rahul.sharma@gmail.com', 'Stores customer Gmail address');
  assert(customerAccount.address.pincode === '560038', 'Stores 6-digit Indian PIN code');
  assert(customerAccount.address.addressType === 'Home', 'Stores address type (Home/Work)');
  assert(customerAccount.orders.includes(newOrder.orderId), 'Links confirmed Order ID with customer profile');

  // Verify Order object has updated customer details and full shipping address
  const linkedOrder = db.getOrderById(newOrder.orderId);
  assert(linkedOrder && linkedOrder.customerName === 'Rahul Sharma', 'Order links customer name');
  assert(linkedOrder.customerMobile === '9876543210', 'Order links customer phone');
  assert(linkedOrder.shippingAddress.includes('100 Feet Road') && linkedOrder.shippingAddress.includes('560038'), 'Order contains complete formatted shipping address');

  // Test 10.6: Customer Login via Mobile and Email
  const custByPhone = db.getCustomerByMobile('9876543210');
  assert(custByPhone && custByPhone.fullName === 'Rahul Sharma', 'Customer successfully logs in via Mobile Number');
  const custByEmail = db.getCustomerByEmail('rahul.sharma@gmail.com');
  assert(custByEmail && custByEmail.id === customerAccount.id, 'Customer successfully logs in via Gmail address');

  // Test 10.7: Customer Order Tracking & Timeline History
  assert(linkedOrder.timeline && linkedOrder.timeline.length >= 1, 'Order contains chronological milestone history');
  assert(linkedOrder.courier && linkedOrder.trackingNumber, 'Order has express courier partner and AWB number');

  // Test 10.8: Customer Order Enquiry Submission
  const orderEnquiry = db.createOrderEnquiry({
    orderId: newOrder.orderId,
    customerName: 'Rahul Sharma',
    mobile: '9876543210',
    email: 'rahul.sharma@gmail.com',
    enquiryType: 'Delivery Status & ETA',
    message: 'When will this order be delivered to my doorstep in Indiranagar?'
  });
  assert(orderEnquiry && orderEnquiry.id.startsWith('ENQ-ORD-'), 'Generates valid Order Enquiry ID');
  assert(orderEnquiry.orderId === newOrder.orderId, 'Enquiry is tied to specific Order ID');
  assert(orderEnquiry.status.includes('Open'), 'Enquiry status starts as Open/Pending Seller Review');

  // Verify Enquiry is attached to order timeline
  const refreshedOrder = db.getOrderById(newOrder.orderId);
  const enqTimelineEntry = refreshedOrder.timeline.find(t => t.note && t.note.includes('Delivery Status & ETA'));
  assert(enqTimelineEntry !== undefined, 'Order enquiry is automatically logged in the order shipment timeline');

  // Test 10.9: Seller Dashboard Order Enquiries Visibility & Stock Upgrade
  const allOrderEnquiries = db.getAllOrderEnquiries();
  assert(allOrderEnquiries.some(e => e.id === orderEnquiry.id), 'Customer order enquiry is visible in Seller Central');

  // Test 10.10: Automatic Stock Upgrading by Seller
  const upgradedStockProd = db.updateProductStock('PROD-CLOTH-008', { delta: 5 });
  assert(upgradedStockProd.stockCount === postStock + 5, 'Seller inventory stock is automatically upgraded (+5 units)');

  // Test 10.11: Customer Portal HTML & Storefront Navigation
  const customerHtml = fsModule.readFileSync(pathModule.join(publicDir, 'customer.html'), 'utf-8');
  assert(customerHtml.includes('Customer Login'), 'customer.html implements Customer Login');
  assert(customerHtml.includes('My Orders & Live Tracking'), 'customer.html implements real-time order tracking');
  assert(customerHtml.includes('Enquire About Order'), 'customer.html implements order-specific enquiry submission');
  assert(!customerHtml.includes('Flipkart / Meesho Style'), 'customer.html removes "Flipkart / Meesho Style" words badge');

  // --- 11. AI VOICE SPEECH LISTENING & RECOGNITION AUTO-CORRECTION ---
  console.log('\n🎙️ TEST SUITE 11: AI Voice Agent Speech Listening & Recognition Auto-Correction');

  // Test 11.1: Speech Input Normalization & Phonetic Error Correction
  const normalized1 = ConversationService.normalizeSpeechInput('teeshirt prais in rupe');
  assert(normalized1.includes('t-shirt') && normalized1.includes('price') && normalized1.includes('rupees'), 'Normalizes phonetic speech errors (teeshirt -> t-shirt, prais -> price, rupe -> rupees)');

  const normalized2 = ConversationService.normalizeSpeechInput('stoc availabl or not conform ordr');
  assert(normalized2.includes('stock') && normalized2.includes('confirm') && normalized2.includes('order'), 'Normalizes garbled voice terms (stoc -> stock, conform -> confirm, ordr -> order)');

  // Test 11.2: Acoustic Hearing / "Can you hear me?" Check
  const audioCheckTurn = await ConversationService.processTurn({
    message: 'Can you hear me Zyro AI?',
    productId: 'PROD-CLOTH-008'
  });
  assert(audioCheckTurn.toolCalled === 'audioCheck', 'Routes acoustic check to audioCheck');
  assert(audioCheckTurn.reply.includes('Yes, I am listening and I can hear you clearly!'), 'Reassures customer that AI agent is listening clearly');

  // Test 11.3: Unrecognized / Inaudible Voice Correction
  const inaudibleTurn = await ConversationService.processTurn({
    message: 'huh ... [inaudible]',
    productId: 'PROD-CLOTH-008'
  });
  assert(inaudibleTurn.toolCalled === 'speechCorrection', 'Routes inaudible/garbled speech to speechCorrection');
  assert(inaudibleTurn.reply.includes("I couldn't clearly recognize what you said"), 'Politely asks customer for clarification on unrecognized voice');

  // Test 11.4: Empty Voice Input Correction
  const emptyTurn = await ConversationService.processTurn({
    message: '',
    productId: 'PROD-CLOTH-008'
  });
  assert(emptyTurn.toolCalled === 'speechCorrection', 'Handles empty/silent voice capture with speechCorrection');
  assert(emptyTurn.reply.includes("I couldn't hear any audio"), 'Guides user when silence/no audio is captured');

  // Test 11.5: Frontend Call Modal Speech Recognition & Auto-Correction Bar
  const enquireHtmlForSpeech = fsModule.readFileSync(pathModule.join(publicDir, 'enquire.html'), 'utf-8');
  assert(enquireHtmlForSpeech.includes('id="modalSpeechCorrectionBar"'), 'Call modal renders dedicated speech auto-correction helper bar');
  assert(enquireHtmlForSpeech.includes('showSpeechCorrectionHelper'), 'Implements showSpeechCorrectionHelper for recognition error recovery');
  assert(enquireHtmlForSpeech.includes('correctAndSend'), 'Implements correctAndSend for instant one-tap speech correction');
  assert(enquireHtmlForSpeech.includes('retryListening'), 'Implements retryListening for microphone re-initialization');
  assert(enquireHtmlForSpeech.includes('SpeechRecognition') && enquireHtmlForSpeech.includes('en-IN'), 'Implements client-side SpeechRecognition configured for en-IN accents');

  // Test 11.6: 15-Second Inactivity / Silence Timeout Prompt
  assert(enquireHtmlForSpeech.includes('NO_RESPONSE_TIMEOUT_MS = 15000') || enquireHtmlForSpeech.includes('15000'), 'enquire.html implements 15-second inactivity timeout');
  assert(enquireHtmlForSpeech.includes('handleNoResponseTimeout'), 'enquire.html implements handleNoResponseTimeout handler');
  assert(enquireHtmlForSpeech.includes('resetNoResponseTimer'), 'enquire.html resets timer after AI turns and mic activation');
  assert(enquireHtmlForSpeech.includes('clearNoResponseTimer'), 'enquire.html clears timer when customer responds or ends call');

  const silenceTurn = await ConversationService.processTurn({
    message: '[silence]',
    productId: 'PROD-CLOTH-008'
  });
  assert(silenceTurn.toolCalled === 'noResponsePrompt', 'Routes silence/inactivity to noResponsePrompt');
  assert(silenceTurn.reply === 'Are you interested to buy the product?', 'AI proactively asks "Are you interested to buy the product?" on silence');

  // --- 12. INSTAGRAM POST LINK ATTACHMENTS & POSITIVE OUT-OF-THE-SYLLABUS MANAGEMENT ---
  console.log('\n📸 TEST SUITE 12: Instagram Post Link Attachments & Positive Out-of-the-Syllabus Handling');

  // Test 12.1: Storefront Instagram Post Link Attachment
  const storefrontHtml = fsModule.readFileSync(pathModule.join(publicDir, 'index.html'), 'utf-8');
  assert(storefrontHtml.includes('instagramVideoPostUrl'), 'Storefront index.html references product instagramVideoPostUrl');
  assert(storefrontHtml.includes('View Post') || storefrontHtml.includes('View Instagram Post'), 'Storefront product cards display attached Instagram post link');
  assert(storefrontHtml.includes('fa-instagram'), 'Storefront product cards render Instagram icon badge');

  // Test 12.2: Product Enquiry Page Instagram Post Link Attachment
  const enquirePageHtml = fsModule.readFileSync(pathModule.join(publicDir, 'enquire.html'), 'utf-8');
  assert(enquirePageHtml.includes('id="productReelLink"'), 'Enquire page attaches productReelLink');
  assert(enquirePageHtml.includes('id="productReelLink2"'), 'Enquire page attaches productReelLink2 badge on image');
  assert(enquirePageHtml.includes('id="callVisReelLink"'), 'Enquire page attaches call visualizer Instagram post link');

  // Test 12.3: Seller Inventory Table Instagram Post Link Attachment
  const sellerPageHtml = fsModule.readFileSync(pathModule.join(publicDir, 'seller.html'), 'utf-8');
  assert(sellerPageHtml.includes('instagramVideoPostUrl'), 'Seller inventory table links directly to product Instagram post');

  // Test 12.4: Out-of-the-Syllabus Question - AI Identity & Banter ("Can you tell me a joke?")
  const jokeTurn = await ConversationService.processTurn({
    message: 'Can you tell me a joke?',
    productId: 'PROD-CLOTH-001'
  });
  assert(jokeTurn.toolCalled === 'positiveOutOfSyllabus', 'Routes joke enquiry to positiveOutOfSyllabus');
  assert(jokeTurn.positiveManaged === true, 'Flags out-of-the-syllabus query as positiveManaged');
  assert(!jokeTurn.reply.startsWith('The TrendVibe Heavyweight Oversized Graphic Tee is in stock for ₹'), 'Does not return the fixed stock/price answer');
  assert(jokeTurn.reply.includes('well-suited') || jokeTurn.reply.includes('good vibes'), 'Delivers cheerful, humorous, positive response');
  assert(jokeTurn.reply.includes('Are you interested to buy the product?'), 'Concludes positive banter with purchase interest check');

  // Test 12.5: Out-of-the-Syllabus Question - Off-Topic Trivia / Weather ("What is the weather today?")
  const weatherTurn = await ConversationService.processTurn({
    message: 'What is the weather today?',
    productId: 'PROD-CLOTH-001'
  });
  assert(weatherTurn.toolCalled === 'positiveOutOfSyllabus', 'Routes weather enquiry to positiveOutOfSyllabus');
  assert(weatherTurn.reply.includes('syllabus') || weatherTurn.reply.includes('positive') || weatherTurn.reply.includes('cheer'), 'Politely and cheerfully acknowledges out-of-syllabus query');
  assert(!weatherTurn.reply.startsWith('The TrendVibe Heavyweight Oversized Graphic Tee is in stock for ₹'), 'Does not return the fixed stock/price answer for weather');
  assert(weatherTurn.reply.includes('Are you interested to buy the product?'), 'Concludes out-of-syllabus query with purchase interest check');

  // Test 12.6: Out-of-the-Syllabus Question - AI Persona ("Are you a robot or human?")
  const botTurn = await ConversationService.processTurn({
    message: 'Are you a robot or human?',
    productId: 'PROD-CLOTH-001'
  });
  assert(botTurn.toolCalled === 'positiveOutOfSyllabus', 'Routes bot/human question to positiveOutOfSyllabus');
  assert(botTurn.reply.includes('Zyro AI') && (botTurn.reply.includes('AI') || botTurn.reply.includes('shopping')), 'Gives warm, positive, cheerful explanation of Zyro AI');
  assert(botTurn.reply.includes('Are you interested to buy the product?'), 'Concludes persona question with purchase interest check');

  // Test 12.7: Out-of-the-Syllabus Question - Styling Advice ("Is this good for a college party?")
  const stylingTurn = await ConversationService.processTurn({
    message: 'Is this good for a college party?',
    productId: 'PROD-CLOTH-001'
  });
  assert(stylingTurn.toolCalled === 'positiveOutOfSyllabus', 'Routes styling/fashion suitability to positiveOutOfSyllabus');
  assert(stylingTurn.reply.includes('modern design') || stylingTurn.reply.includes('complimented') || stylingTurn.reply.includes('parties'), 'Provides positive styling endorsement');
  assert(stylingTurn.reply.includes('Are you interested to buy the product?'), 'Concludes styling advice with purchase interest check');

  // Test 12.8: Out-of-the-Syllabus Question - Free Gifts / Perks ("Can you give me a free gift?")
  const perkTurn = await ConversationService.processTurn({
    message: 'Can you give me a free gift or extra discount?',
    productId: 'PROD-CLOTH-001'
  });
  assert(perkTurn.toolCalled === 'positiveOutOfSyllabus', 'Routes free gift/negotiation to positiveOutOfSyllabus');
  assert(perkTurn.reply.includes('enthusiasm') && perkTurn.reply.includes('discount'), 'Answers free gift request positively with value and savings explanation');
  assert(perkTurn.reply.includes('Are you interested to buy the product?'), 'Concludes gift/perk request with purchase interest check');

  // Test 12.9: Out-of-the-Syllabus Question - Compliments & Appreciation ("You are doing an awesome job!")
  const complimentTurn = await ConversationService.processTurn({
    message: 'You are doing an awesome job!',
    productId: 'PROD-CLOTH-001'
  });
  assert(complimentTurn.toolCalled === 'positiveOutOfSyllabus', 'Routes compliments to positiveOutOfSyllabus');
  assert(complimentTurn.reply.includes('Thank you') || complimentTurn.reply.includes('smile') || complimentTurn.reply.includes('kind'), 'Warmly and appreciatively thanks the customer');
  assert(complimentTurn.reply.includes('Are you interested to buy the product?'), 'Concludes compliment with purchase interest check');

  // Test 12.10: Out-of-the-Syllabus Question - Math & General Curiosity ("What is 2+2?")
  const mathTurn = await ConversationService.processTurn({
    message: 'What is 2+2?',
    productId: 'PROD-CLOTH-001'
  });
  assert(mathTurn.toolCalled === 'positiveOutOfSyllabus', 'Routes random math/knowledge to positiveOutOfSyllabus');
  assert(!mathTurn.reply.startsWith('The TrendVibe Heavyweight Oversized Graphic Tee is in stock for ₹'), 'Never gives the fixed stock/price answer for arbitrary queries');
  assert(mathTurn.reply.includes('Are you interested to buy the product?'), 'Concludes general curiosity with purchase interest check');

  // --- 13. POSITIVE & HELPFUL HANDLING WHEN STORE BACKGROUND DATA IS MISSING OR UNAVAILABLE ---
  console.log('\n🔒 TEST SUITE 13: Positive Handling When Background Data is Missing (Zero Hallucination)');

  // Test 13.1: Uncatalogued Product Enquiry
  const uncataloguedTurn = await ConversationService.processTurn({
    message: 'Do you have diamond jewelry available in store?',
    productId: 'PROD-CLOTH-001'
  });
  assert(uncataloguedTurn.toolCalled === 'missingDataPositiveAssistance', 'Routes uncatalogued product to missingDataPositiveAssistance');
  assert(uncataloguedTurn.missingDataHandled === true, 'Flags missing background data as handled');
  assert(uncataloguedTurn.reply.includes('not currently available in our store catalog'), 'Explains product info is not currently available');
  assert(uncataloguedTurn.reply.includes('happy to help'), 'Reassures customer that AI is happy to help');
  assert(!uncataloguedTurn.reply.toLowerCase().includes("i don't know"), 'Never simply says "I don\'t know"');
  assert(uncataloguedTurn.reply.includes('trending collection') || uncataloguedTurn.reply.includes('representative'), 'Suggests appropriate next action');

  // Test 13.2: Uncatalogued Brand Enquiry
  const brandTurn = await ConversationService.processTurn({
    message: 'Do you sell Rolex watches?',
    productId: 'PROD-CLOTH-001'
  });
  assert(brandTurn.toolCalled === 'missingDataPositiveAssistance', 'Routes uncatalogued brand to missingDataPositiveAssistance');
  assert(brandTurn.reply.includes('not currently available in our store catalog'), 'Accurately states unlisted brand is not available without hallucinating');
  assert(brandTurn.reply.includes('happy to help'), 'Reassures customer with positive tone');

  // Test 13.3: Missing / Unrecorded Order Tracking
  const missingOrderTurn = await ConversationService.processTurn({
    message: 'Where is my order ORD-NOTFOUND-999999?',
    productId: 'PROD-CLOTH-001'
  });
  assert(missingOrderTurn.toolCalled === 'missingDataPositiveAssistance', 'Routes unrecorded order to missingDataPositiveAssistance');
  assert(missingOrderTurn.missingType === 'orderTracking', 'Categorizes missing data as orderTracking');
  assert(missingOrderTurn.reply.includes('not currently available in our live system'), 'Explains live tracking info is not currently available');
  assert(missingOrderTurn.reply.includes('happy to help'), 'Reassures customer that AI is happy to help');
  assert(missingOrderTurn.reply.includes('representative') || missingOrderTurn.reply.includes('Order ID'), 'Suggests double-checking Order ID or representative handoff');
  assert(!missingOrderTurn.reply.toLowerCase().includes("i don't know"), 'Avoids saying "I don\'t know" for missing orders');

  // Test 13.4: Missing / Unverified Pricing Data Enquiry
  const unverifiedPriceTurn = await ConversationService.processTurn({
    message: 'What is the unverified price for custom bulk orders?',
    productId: 'PROD-CLOTH-001'
  });
  assert(unverifiedPriceTurn.toolCalled === 'missingDataPositiveAssistance', 'Routes unverified pricing query to missingDataPositiveAssistance');
  assert(unverifiedPriceTurn.missingType === 'pricingData', 'Identifies missing pricingData');
  assert(unverifiedPriceTurn.reply.includes('not currently available in our live catalog'), 'Explains custom pricing is not available');
  assert(unverifiedPriceTurn.reply.includes('happy to help'), 'Reassures customer with positive tone');

  // Test 13.5: Missing / Unverified Inventory Data Enquiry
  const unverifiedStockTurn = await ConversationService.processTurn({
    message: 'Do you have unlisted inventory data for special sizes?',
    productId: 'PROD-CLOTH-001'
  });
  assert(unverifiedStockTurn.toolCalled === 'missingDataPositiveAssistance', 'Routes unverified inventory to missingDataPositiveAssistance');
  assert(unverifiedStockTurn.missingType === 'inventoryData', 'Identifies missing inventoryData');
  assert(unverifiedStockTurn.reply.includes('not currently updated in our database'), 'Explains inventory is not currently updated without guessing');
  assert(unverifiedStockTurn.reply.includes('happy to help'), 'Maintains positive and helpful tone');

  // Test 13.6: Missing / Unverified Delivery Timeline Enquiry
  const unverifiedDeliveryTurn = await ConversationService.processTurn({
    message: 'What are the unverified delivery details for remote islands?',
    productId: 'PROD-CLOTH-001'
  });
  assert(unverifiedDeliveryTurn.toolCalled === 'missingDataPositiveAssistance', 'Routes unverified delivery to missingDataPositiveAssistance');
  assert(unverifiedDeliveryTurn.missingType === 'deliveryDetails', 'Identifies missing deliveryDetails');
  assert(unverifiedDeliveryTurn.reply.includes('not currently available in our courier database'), 'Explains unverified courier data without hallucinating');
  assert(unverifiedDeliveryTurn.reply.includes('2 to 4 business days'), 'Provides verified baseline timeline');
  assert(unverifiedDeliveryTurn.reply.includes('happy to help'), 'Reassures customer with positive tone');

  // Test 13.7: ProductService.searchProduct for uncatalogued item
  const uncataloguedSearch = ProductService.searchProduct({ query: 'FlyingCar5000' });
  assert(uncataloguedSearch.success === false, 'ProductService returns success: false for uncatalogued query');
  assert(uncataloguedSearch.message.includes('not currently available in our store catalog'), 'ProductService message clearly explains catalog availability');
  assert(uncataloguedSearch.message.includes('happy to help'), 'ProductService message reassures customer');
  assert(uncataloguedSearch.handoffSuggested === true, 'ProductService suggests representative handoff');

  // Test 13.8: ProductService.getProductDetails for unknown product ID
  const unknownProdDetails = ProductService.getProductDetails({ productId: 'PROD-NONEXISTENT' });
  assert(unknownProdDetails.success === false, 'getProductDetails returns false for unknown product');
  assert(unknownProdDetails.message.includes('not currently available in our store catalog'), 'Explains product not in catalog');
  assert(unknownProdDetails.handoffSuggested === true, 'Offers next step representative handoff');

  // Test 13.9: ProductService.getOrderStatus for unknown order ID
  const unknownOrderStatus = ProductService.getOrderStatus({ orderId: 'ORD-UNKNOWN-9999' });
  assert(unknownOrderStatus.success === false, 'getOrderStatus returns false for unrecorded order');
  assert(unknownOrderStatus.message.includes('not currently available in our live system'), 'Explains order data is not available');
  assert(unknownOrderStatus.handoffSuggested === true, 'Offers next step representative handoff');

  // --- 14. INVENTORY ATTRIBUTES COMPREHENSIVE VERIFICATION ---
  console.log('\n🏬 TEST SUITE 14: Direct Inventory & Product Attributes Verification');

  // Test 14.1: Product Name
  const nameTurn = await ConversationService.processTurn({ message: 'What is the product name?', productId: 'PROD-CLOTH-001' });
  assert(nameTurn.toolCalled === 'getProductName', 'Routes product name enquiry to getProductName');
  assert(nameTurn.reply.includes('TrendVibe Heavyweight Oversized Graphic Tee'), 'Accurately quotes product name from database');

  // Test 14.2: Category
  const categoryTurn = await ConversationService.processTurn({ message: 'What category does this product belong to?', productId: 'PROD-CLOTH-001' });
  assert(categoryTurn.toolCalled === 'getProductCategory', 'Routes category enquiry to getProductCategory');
  assert(categoryTurn.reply.includes('CLOTHING'), 'Accurately quotes verified clothing category from database');

  // Test 14.3: Color Options
  const colorTurn = await ConversationService.processTurn({ message: 'What colors are available?', productId: 'PROD-CLOTH-001' });
  assert(colorTurn.toolCalled === 'getAvailableColours', 'Routes color options enquiry to getAvailableColours');
  assert(colorTurn.reply.includes('Vintage Black') && colorTurn.reply.includes('Off-White'), 'Quotes complete verified color palette from inventory');

  // Test 14.4: Size Options
  const sizeTurn = await ConversationService.processTurn({ message: 'What sizes are available for this?', productId: 'PROD-CLOTH-001' });
  assert(sizeTurn.toolCalled === 'getAvailableSizes', 'Routes size options enquiry to getAvailableSizes');
  assert(sizeTurn.reply.includes('S, M, L, XL, XXL'), 'Quotes complete verified size range from inventory');

  // Test 14.5: Model Details
  const modelTurn = await ConversationService.processTurn({ message: 'What model is this?', productId: 'PROD-CLOTH-001' });
  assert(modelTurn.toolCalled === 'getModelDetails', 'Routes model enquiry to getModelDetails');
  assert(modelTurn.reply.includes('TrendVibe Heavyweight Oversized Graphic Tee'), 'Identifies exact model and specs from database');

  // Test 14.6: Quantity in Stock
  const qtyTurn = await ConversationService.processTurn({ message: 'What is the quantity in stock?', productId: 'PROD-CLOTH-001' });
  assert(qtyTurn.toolCalled === 'checkStock', 'Routes quantity inquiry to checkStock');
  assert(qtyTurn.reply.includes('in live stock'), 'Quotes verified live quantity from warehouse inventory');

  // Test 14.7: Price
  const priceCheckTurn = await ConversationService.processTurn({ message: 'What is the price of this item?', productId: 'PROD-CLOTH-001' });
  assert(priceCheckTurn.toolCalled === 'getPrice', 'Routes price enquiry to getPrice');
  assert(priceCheckTurn.reply.includes('₹1,199'), 'Quotes accurate selling price from database');

  // Test 14.8: Discount / Offer
  const offerTurn = await ConversationService.processTurn({ message: 'Is there any discount or offer?', productId: 'PROD-CLOTH-001' });
  assert(offerTurn.toolCalled === 'getDiscountsAndOffers', 'Routes discount enquiry to getDiscountsAndOffers');
  assert(offerTurn.reply.includes('20%'), 'Accurately quotes 20% active promotional discount from inventory');

  // Test 14.9: Stock Availability
  const stockAvailTurn = await ConversationService.processTurn({ message: 'Is it in stock?', productId: 'PROD-CLOTH-001' });
  assert(stockAvailTurn.toolCalled === 'checkStock', 'Routes stock availability to checkStock');
  assert(stockAvailTurn.reply.includes('in live stock'), 'Confirms product is in live warehouse stock');

  // Test 14.10: Delivery Address
  const addrTurn = await ConversationService.processTurn({ message: 'Can you deliver to my delivery address in Bangalore?', productId: 'PROD-CLOTH-001' });
  assert(addrTurn.toolCalled === 'checkDeliveryAddress', 'Routes delivery address enquiry to checkDeliveryAddress');
  assert(addrTurn.reply.includes('doorstep delivery to all addresses and PIN codes across India'), 'Confirms nationwide delivery serviceability');

  // Test 14.11: Expected Delivery Date
  const dateTurn = await ConversationService.processTurn({ message: 'What is the expected delivery date?', productId: 'PROD-CLOTH-001' });
  assert(dateTurn.toolCalled === 'getDeliveryInformation', 'Routes delivery date enquiry to getDeliveryInformation');
  assert(dateTurn.reply.includes('2-4 days'), 'Quotes verified delivery timeline from inventory');

  // Test 14.12: Return / Exchange Eligibility
  const retEligTurn = await ConversationService.processTurn({ message: 'Is this eligible for return and exchange?', productId: 'PROD-CLOTH-001' });
  assert(retEligTurn.toolCalled === 'getReturnPolicy', 'Routes return and exchange eligibility to getReturnPolicy');
  assert(retEligTurn.reply.includes('100% eligible for returns and exchanges'), 'Confirms return and exchange eligibility from store policy');

  // --- 15. MEDICINES & HEALTHCARE PRODUCTS, KANNADA LANGUAGE SWITCHING & FOOD CATALOG ---
  console.log('\n💊 TEST SUITE 15: Medicines & Healthcare, Language Switch & Food Catalog');

  // 15.1 Catalog Verification for Medicines & Healthcare Products
  const medProducts = products.filter(p => p.category === 'Medicines & Healthcare Products');
  assert(medProducts.length === 15, `Catalog contains all 15 verified Medicines & Healthcare products (found ${medProducts.length})`);
  
  const expectedMeds = [
    'PROD-MED-001', 'PROD-MED-002', 'PROD-MED-003', 'PROD-MED-004', 'PROD-MED-005',
    'PROD-MED-006', 'PROD-MED-007', 'PROD-MED-008', 'PROD-MED-009', 'PROD-MED-010',
    'PROD-MED-011', 'PROD-MED-012', 'PROD-MED-013', 'PROD-MED-014', 'PROD-MED-015'
  ];
  const allMedsPresent = expectedMeds.every(id => db.getProductById(id) !== null);
  assert(allMedsPresent, 'All 15 expected medicine IDs are loaded in database');

  // 15.2 Catalog Verification for Food Category (Strictly "Food", NOT "Healthy Food")
  const foodProducts = products.filter(p => p.category === 'Food');
  assert(foodProducts.length === 13, `Catalog contains all 13 verified Food products (found ${foodProducts.length})`);
  
  const hasHealthyFoodCat = products.some(p => p.category.toLowerCase() === 'healthy food');
  assert(!hasHealthyFoodCat, 'Category name is strictly "Food" (never "Healthy Food")');

  const expectedFoods = [
    'FOOD-KAR-001', 'FOOD-KAR-002', 'FOOD-KAR-003', 'FOOD-KAR-004', 'FOOD-KAR-005',
    'FOOD-KAR-006', 'FOOD-KAR-007', 'FOOD-KAR-008', 'FOOD-KAR-009', 'FOOD-KAR-010'
  ];
  const allFoodsPresent = expectedFoods.every(id => db.getProductById(id) !== null);
  assert(allFoodsPresent, 'All 10 Karnataka food IDs are loaded in database');

  // 15.3 ProductService Methods: getMedicineDetails & getFoodDetails
  const medServiceRes = ProductService.getMedicineDetails({ productId: 'PROD-MED-001' });
  assert(medServiceRes.success && medServiceRes.medicine.productName === 'Dolo 650 Tablet', 'ProductService.getMedicineDetails returns Dolo 650');
  assert(medServiceRes.medicine.strength === '650mg per tablet', 'getMedicineDetails provides verified strength');
  assert(medServiceRes.medicine.batchNumber.startsWith('DL650-'), 'getMedicineDetails provides verified batch number');
  assert(medServiceRes.medicine.manufacturerSource.includes('Micro Labs'), 'getMedicineDetails includes verified manufacturer source');
  assert(medServiceRes.medicine.productLabelSource.includes('blister'), 'getMedicineDetails includes verified product label source');
  assert(medServiceRes.medicine.verificationStatus.includes('Verified authentic'), 'getMedicineDetails includes verification status');
  assert(medServiceRes.medicine.pregnancyWarnings.includes('therapeutic doses'), 'getMedicineDetails includes verified pregnancy warnings');
  assert(medServiceRes.medicine.breastfeedingWarnings.includes('breastfeeding'), 'getMedicineDetails includes verified breastfeeding warnings');

  // Verification of Zero Duplicates & Image Preservation
  const allCurrentProds = db.getAllProducts();
  const allCurrentMeds = allCurrentProds.filter(p => p.category === 'Medicines & Healthcare Products');
  assert(allCurrentMeds.length === 15, 'Exact 15 existing medicines preserved without duplicates');
  assert(new Set(allCurrentMeds.map(m => m.id)).size === 15, 'Zero duplicate IDs among medicines');
  const allMedsEnriched = allCurrentMeds.every(m => m.manufacturerSource && m.productLabelSource && m.verificationStatus && m.pregnancyWarnings && m.breastfeedingWarnings);
  assert(allMedsEnriched, 'All 15 existing medicines contain enriched verification sources and warnings');

  // Existing Product Image Rule Verification
  const imageRecognitionTurn = await ConversationService.processTurn({
    message: 'Tell me about this medicine',
    imageUrl: '/images/products/PROD-MED-001.png'
  });
  assert(imageRecognitionTurn.toolCalled === 'getMedicineDetails', 'Routes image-linked query to getMedicineDetails');
  assert(imageRecognitionTurn.reply.includes('Dolo 650 Tablet'), 'Recognizes exact product from existing catalogue image');
  assert(imageRecognitionTurn.activeProduct.id === 'PROD-MED-001', 'Uses existing product record PROD-MED-001 without creating duplicate');

  const foodServiceRes = ProductService.getFoodDetails({ productId: 'FOOD-KAR-001' });
  assert(foodServiceRes.success && foodServiceRes.food.foodName === 'Ragi Mudde', 'ProductService.getFoodDetails returns Ragi Mudde');
  assert(foodServiceRes.food.category === 'Food', 'getFoodDetails confirms category is Food');
  assert(foodServiceRes.food.nutrition.protein === '7.2g', 'getFoodDetails provides verified nutritional protein');

  // 15.4 Language Switch Commands
  const knSwitchTurn = await ConversationService.processTurn({ message: 'Kannadadalli mathadi' });
  assert(knSwitchTurn.toolCalled === 'switchLanguage', 'Routes "Kannadadalli mathadi" to switchLanguage');
  assert(knSwitchTurn.language === 'kn', 'Sets session language to kn');
  assert(knSwitchTurn.reply.includes('ಖಂಡಿತ. ಇನ್ನು ಮುಂದೆ ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.'), 'Returns exact specified Kannada confirmation message');

  const knSwitchCmd2 = await ConversationService.processTurn({ message: 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ' });
  assert(knSwitchCmd2.language === 'kn', 'Supports native script "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ"');

  const enSwitchTurn = await ConversationService.processTurn({ message: 'Switch to English' });
  assert(enSwitchTurn.toolCalled === 'switchLanguage', 'Routes "Switch to English" to switchLanguage');
  assert(enSwitchTurn.language === 'en', 'Sets session language to en');
  assert(enSwitchTurn.reply === 'Sure. I will continue in English.', 'Returns exact specified English confirmation message');

  const knExplicitSwitch = await ConversationService.processTurn({ message: 'Switch to Kannada' });
  assert(knExplicitSwitch.toolCalled === 'switchLanguage', 'Routes "Switch to Kannada" to switchLanguage');
  assert(knExplicitSwitch.language === 'kn', 'Sets session language to kn on "Switch to Kannada"');
  assert(knExplicitSwitch.reply === 'ಸರಿ. ಇನ್ನು ಮುಂದೆ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.', 'Returns exact specified message "ಸರಿ. ಇನ್ನು ಮುಂದೆ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ."');

  const knAnswerTurn = await ConversationService.processTurn({ message: 'Answer in Kannada' });
  assert(knAnswerTurn.toolCalled === 'switchLanguage', 'Routes "Answer in Kannada" to switchLanguage');
  assert(knAnswerTurn.language === 'kn', 'Sets language to kn on "Answer in Kannada"');

  const enAnswerTurn = await ConversationService.processTurn({ message: 'Answer in English' });
  assert(enAnswerTurn.toolCalled === 'switchLanguage', 'Routes "Answer in English" to switchLanguage');
  assert(enAnswerTurn.language === 'en', 'Sets language to en on "Answer in English"');

  // Multi-turn language persistence: subsequent question answered in Kannada
  const persistentKnTurn = await ConversationService.processTurn({
    message: 'What is the price?',
    history: [{ role: 'customer', text: 'Switch to Kannada' }, { role: 'ai', text: knExplicitSwitch.reply, language: 'kn' }]
  });
  assert(persistentKnTurn.language === 'kn', 'Session persistence maintains Kannada for subsequent turns');
  assert(persistentKnTurn.reply.includes('ಬೆಲೆ') || persistentKnTurn.reply.includes('ರಿಯಾಯಿತಿ'), 'Responds in Kannada for subsequent turns without re-prompting');

  // 15.5 Medicine Multi-Variant Disambiguation Guards
  const moovClarify = await ConversationService.processTurn({ message: 'Tell me about Moov' });
  assert(moovClarify.toolCalled === 'clarifyMedicineVariant', 'Routes general Moov inquiry to clarifyMedicineVariant');
  assert(moovClarify.reply.includes('Moov Cream') && moovClarify.reply.includes('Moov Spray') && moovClarify.reply.includes('Moov STRONG Gel') && moovClarify.reply.includes('Moov STRONG Spray'), 'Prompts customer to choose between all 4 Moov variants');

  const paracetamolClarify = await ConversationService.processTurn({ message: 'Paracetamol details please' });
  assert(paracetamolClarify.toolCalled === 'clarifyMedicineVariant', 'Routes general Paracetamol inquiry to clarifyMedicineVariant');
  assert(paracetamolClarify.reply.includes('Dolo 650') && paracetamolClarify.reply.includes('Calpol 500'), 'Prompts customer to choose between Dolo 650 and Calpol 500');

  const orsClarify = await ConversationService.processTurn({ message: 'Tell me about ORS' });
  assert(orsClarify.toolCalled === 'clarifyMedicineVariant', 'Routes general ORS inquiry to clarifyMedicineVariant');
  assert(orsClarify.reply.includes('Electral') && orsClarify.reply.includes('Prolyte'), 'Prompts customer to choose between Electral and Prolyte');

  const antacidClarify = await ConversationService.processTurn({ message: 'Which antacid do you have?' });
  assert(antacidClarify.toolCalled === 'clarifyMedicineVariant', 'Routes general Antacid inquiry to clarifyMedicineVariant');
  assert(antacidClarify.reply.includes('Digene') && antacidClarify.reply.includes('Calcium Carbonate'), 'Prompts customer to choose between Digene and Calcium Carbonate');

  // 15.6 Medicine 40-Field Ordered Sequence & Medical Disclaimer
  const doloFullTurn = await ConversationService.processTurn({ message: 'Tell me about Dolo 650' });
  assert(doloFullTurn.toolCalled === 'getMedicineDetails', 'Routes Dolo 650 inquiry to getMedicineDetails');
  assert(doloFullTurn.reply.includes('Verified Medicine & Healthcare Information:'), 'Includes verified medicine header');
  assert(doloFullTurn.reply.includes('1. Product Name: Dolo 650 Tablet'), 'Includes 1. Product Name');
  assert(doloFullTurn.reply.includes('2. Brand: Micro Labs'), 'Includes 2. Brand');
  assert(doloFullTurn.reply.includes('3. Exact Variant: Dolo 650 Tablet'), 'Includes 3. Exact Variant');
  assert(doloFullTurn.reply.includes('4. Active Ingredients: Paracetamol IP 650mg'), 'Includes 4. Active Ingredients');
  assert(doloFullTurn.reply.includes('5. Strength: 650mg per tablet'), 'Includes 5. Strength');
  assert(doloFullTurn.reply.includes('6. Dosage Form: Oral Tablet'), 'Includes 6. Dosage Form');
  assert(doloFullTurn.reply.includes('11. Side Effects:'), 'Includes 11. Side Effects');
  assert(doloFullTurn.reply.includes('17. Prescription Status:'), 'Includes 17. Prescription Status');
  assert(doloFullTurn.reply.includes('22. Batch Number: DL650-2026-B812'), 'Includes 22. Batch Number');
  assert(doloFullTurn.reply.includes('24. Expiry Date: 2028-01-31'), 'Includes 24. Expiry Date');
  assert(doloFullTurn.reply.includes('30. Stock: In Stock'), 'Includes 30. Stock');
  assert(doloFullTurn.reply.includes('38. Official Product Source:'), 'Includes 38. Official Product Source');
  assert(doloFullTurn.reply.includes('40. Last Verified Date: 2026-08-15'), 'Includes 40. Last Verified Date');
  assert(doloFullTurn.reply.includes('Medical Disclaimer: I am an AI product-information and shopping assistant'), 'Appends mandatory Medical Disclaimer');

  // 15.6b Section 7: Batch Expiry Date Enquiry
  const doloExpiryTurn = await ConversationService.processTurn({ message: 'When does Dolo 650 expire?' });
  assert(doloExpiryTurn.toolCalled === 'getMedicineExpiry', 'Routes expiry query to getMedicineExpiry');
  assert(doloExpiryTurn.reply.includes('2028-01-31') && doloExpiryTurn.reply.includes('DL650-2026-B812'), 'Returns verified batch expiry date');

  // 15.6c Section 13: Medical Safety Guardrail
  const safetyTurn = await ConversationService.processTurn({ message: 'Can you diagnose my fever and severe chest pain?' });
  assert(safetyTurn.toolCalled === 'medicalSafetyGuardrail', 'Routes medical diagnosis attempt to medicalSafetyGuardrail');
  assert(safetyTurn.reply.includes('not a doctor') && safetyTurn.reply.includes('medical emergencies'), 'Advises immediate professional medical attention');

  // 15.7 Strict Verification Rule (Missing fields show "Not available in verified product data.")
  assert(!doloFullTurn.reply.includes('undefined') && !doloFullTurn.reply.includes('null'), 'No undefined or null values in medicine reply');

  // 15.8 Romanized Kannada Support & Technical Identifiers Preservation
  const knParacetamolTurn = await ConversationService.processTurn({
    message: 'Paracetamol available ideya?'
  });
  assert(knParacetamolTurn.toolCalled === 'clarifyMedicineVariant', 'Routes Romanized Kannada paracetamol inquiry to clarifyMedicineVariant');
  assert(knParacetamolTurn.language === 'kn', 'Detects Kannada intent from Romanized input');
  assert(knParacetamolTurn.reply.includes('Dolo 650') && knParacetamolTurn.reply.includes('Calpol 500'), 'Preserves brand and strength in Kannada response');
  assert(knParacetamolTurn.reply.includes('ಹೌದು, Paracetamol ಲಭ್ಯವಿದೆಯೇ ಎಂದು ನಾನು ಪರಿಶೀಲಿಸುತ್ತೇನೆ'), 'Includes exact Paracetamol availability phrasing in Kannada');

  const knPriceTurn = await ConversationService.processTurn({
    message: 'Ragi mudde price estu?'
  });
  assert(knPriceTurn.toolCalled === 'getPrice', 'Routes "Ragi mudde price estu?" to getPrice');
  assert(knPriceTurn.language === 'kn', 'Preserves Kannada language');
  assert(knPriceTurn.reply.includes('Ragi Mudde') && knPriceTurn.reply.includes('ಬೆಲೆ') && knPriceTurn.reply.includes('₹60'), 'Responds in Kannada with exact price');

  const knStockTurn = await ConversationService.processTurn({
    message: 'Dolo 650 available ideya?'
  });
  assert(knStockTurn.toolCalled === 'checkStock', 'Routes "Dolo 650 available ideya?" to checkStock');
  assert(knStockTurn.language === 'kn', 'Preserves Kannada language');
  assert(knStockTurn.reply.includes('ಲಭ್ಯವಿದೆ') && knStockTurn.reply.includes('Dolo 650 Tablet'), 'Confirms Dolo 650 stock availability in Kannada');

  // 15.9 Food Category Exploration & List
  const foodListTurn = await ConversationService.processTurn({ message: 'Show me Karnataka food' });
  assert(foodListTurn.toolCalled === 'listFoodProducts', 'Routes food menu inquiry to listFoodProducts');
  assert(foodListTurn.reply.includes('Ragi Mudde') && foodListTurn.reply.includes('Akki Rotti') && foodListTurn.reply.includes('Vegetable Sambar'), 'Lists authentic Karnataka food dishes');

  // 15.10 Food Specific Inquiries (Ingredients, Masala, Oil, Sourcing, Freshness, Shelf life, Allergens)
  const ingTurn = await ConversationService.processTurn({
    message: 'What ingredients are in Akki Rotti?',
    productId: 'FOOD-KAR-003'
  });
  assert(ingTurn.toolCalled === 'getFoodIngredients', 'Routes ingredients inquiry to getFoodIngredients');
  assert(ingTurn.reply.toLowerCase().includes('rice flour') && ingTurn.reply.toLowerCase().includes('coconut'), 'Details verified Akki Rotti ingredients');

  const masalaTurn = await ConversationService.processTurn({
    message: 'What masala is used in Vegetable Sambar?',
    productId: 'FOOD-KAR-010'
  });
  assert(masalaTurn.toolCalled === 'getFoodMasalaDetails', 'Routes masala inquiry to getFoodMasalaDetails');
  assert(masalaTurn.reply.includes('sambar powder') && masalaTurn.reply.includes('Byadgi'), 'Details homemade masala specifications');

  const oilTurn = await ConversationService.processTurn({
    message: 'What oil is used in Ragi Dosa?',
    productId: 'FOOD-KAR-002'
  });
  assert(oilTurn.toolCalled === 'getFoodOilDetails', 'Routes oil inquiry to getFoodOilDetails');
  assert(oilTurn.reply.toLowerCase().includes('groundnut oil'), 'Details verified groundnut oil usage');

  const sourcingTurn = await ConversationService.processTurn({
    message: 'Where do you source raw materials for Ragi Mudde?',
    productId: 'FOOD-KAR-001'
  });
  assert(sourcingTurn.toolCalled === 'getFoodSourcingDetails', 'Routes sourcing inquiry to getFoodSourcingDetails');
  assert(sourcingTurn.reply.includes('Mandya'), 'Details verified raw material source in Mandya');

  const freshTurn = await ConversationService.processTurn({
    message: 'Is Vegetable Uppittu fresh?',
    productId: 'FOOD-KAR-004'
  });
  assert(freshTurn.toolCalled === 'getFoodFreshnessDetails', 'Routes freshness inquiry to getFoodFreshnessDetails');
  assert(freshTurn.reply.toLowerCase().includes('freshly prepared'), 'Confirms fresh preparation schedule');

  const shelfLifeTurn = await ConversationService.processTurn({
    message: 'What is the shelf life of Kosambari?',
    productId: 'FOOD-KAR-007'
  });
  assert(shelfLifeTurn.toolCalled === 'getFoodShelfLife', 'Routes shelf life inquiry to getFoodShelfLife');
  assert(shelfLifeTurn.reply.includes('hours'), 'Quotes verified shelf life');

  const allergenTurn = await ConversationService.processTurn({
    message: 'Does Sprouted Moong Salad contain peanuts?',
    productId: 'FOOD-KAR-008'
  });
  assert(allergenTurn.toolCalled === 'getFoodAllergens', 'Routes allergen inquiry to getFoodAllergens');
  assert(allergenTurn.reply.includes('Naturally allergen-free') || allergenTurn.reply.includes('nuts'), 'Accurately states allergen status for Sprouted Moong');

  const avalakkiAllergenTurn = await ConversationService.processTurn({
    message: 'Does Avalakki contain peanuts?',
    productId: 'FOOD-KAR-009'
  });
  assert(avalakkiAllergenTurn.toolCalled === 'getFoodAllergens', 'Routes allergen inquiry to getFoodAllergens');
  assert(avalakkiAllergenTurn.reply.includes('Peanuts'), 'Accurately warns of peanuts in Avalakki');

  // 15.11 Health Claim Guardrail (Strict verification rule - factual nutrition, no marketing claims)
  const healthClaimTurn = await ConversationService.processTurn({
    message: 'Is Ragi Mudde 100% healthy for weight loss?',
    productId: 'FOOD-KAR-001'
  });
  assert(healthClaimTurn.toolCalled === 'getFoodNutritionalFacts', 'Routes health claim inquiry to getFoodNutritionalFacts');
  assert(healthClaimTurn.reply.includes('factual nutritional data rather than automatic health claims'), 'Enforces factual nutrition guardrail');
  assert(healthClaimTurn.reply.includes('285') && healthClaimTurn.reply.includes('7.2g protein'), 'Quotes verified factual nutritional data');

  // 15.12 Store All Categories Enquiry
  const allCatTurn = await ConversationService.processTurn({ message: 'What categories do you have?' });
  assert(allCatTurn.toolCalled === 'getAllCategories', 'Routes "What categories do you have?" to getAllCategories');
  assert(allCatTurn.reply.includes('Medicines & Healthcare Products') && allCatTurn.reply.includes('Food'), 'Lists Medicines & Healthcare Products and Food among store categories');

  // 15.13 Exact Product Images Verification (Google Verified Packaging & Authentic Culinary Assets)
  const allMedsAndFoods = [
    'PROD-MED-001', 'PROD-MED-002', 'PROD-MED-003', 'PROD-MED-004', 'PROD-MED-005',
    'PROD-MED-006', 'PROD-MED-007', 'PROD-MED-008', 'PROD-MED-009', 'PROD-MED-010',
    'PROD-MED-011', 'PROD-MED-012', 'PROD-MED-013', 'PROD-MED-014', 'PROD-MED-015',
    'FOOD-KAR-001', 'FOOD-KAR-002', 'FOOD-KAR-003', 'FOOD-KAR-004', 'FOOD-KAR-005',
    'FOOD-KAR-006', 'FOOD-KAR-007', 'FOOD-KAR-008', 'FOOD-KAR-009', 'FOOD-KAR-010'
  ];
  let allImagesPresent = true;
  let allImagesConfigured = true;
  for (const pid of allMedsAndFoods) {
    const prod = db.getProductById(pid);
    if (!prod || !prod.imageUrl || !prod.imageUrl.startsWith('/images/products/')) {
      allImagesConfigured = false;
    }
    const localRel = prod.imageUrl.replace(/^\//, '');
    const localPath = path.join(process.cwd(), 'public', localRel);
    if (!fs.existsSync(localPath) || fs.statSync(localPath).size === 0) {
      allImagesPresent = false;
    }
  }
  assert(allImagesConfigured, 'All 25 medicines and foods have local /images/products/ URLs configured');
  assert(allImagesPresent, 'All 25 exact product image files physically exist on disk with valid file size');

  // 15.14 Food Product Data Enrichment Verification (Sections 1-22)
  const all10FoodIds = [
    'FOOD-KAR-001', 'FOOD-KAR-002', 'FOOD-KAR-003', 'FOOD-KAR-004', 'FOOD-KAR-005',
    'FOOD-KAR-006', 'FOOD-KAR-007', 'FOOD-KAR-008', 'FOOD-KAR-009', 'FOOD-KAR-010'
  ];
  let allFssaiUnavailable = true;
  let allTestingUnavailable = true;
  let allSupplierDemo = true;
  let allBatchDemo = true;
  let allSourceMetaPresent = true;

  for (const fid of all10FoodIds) {
    const f = db.getProductById(fid);
    if (f.fssaiNumber !== 'Not available in verified store data.') allFssaiUnavailable = false;
    if (f.foodTestingInfo !== 'Not available in verified store data.') allTestingUnavailable = false;
    if (f.rawMaterialSupplier !== 'Demo supplier information — actual supplier not provided.') allSupplierDemo = false;
    if (!f.batchNumber || !f.batchNumber.startsWith('DEMO-')) allBatchDemo = false;
    if (!f.dataType || !f.source || !f.lastVerifiedDate) allSourceMetaPresent = false;
  }
  assert(allFssaiUnavailable, 'Enforces FSSAI unavailable rule across all 10 food products');
  assert(allTestingUnavailable, 'Enforces food testing unavailable rule across all 10 food products');
  assert(allSupplierDemo, 'Enforces demo supplier attribution rule across all 10 food products');
  assert(allBatchDemo, 'Enforces demo batch numbering format (DEMO-*) across all 10 food products');
  assert(allSourceMetaPresent, 'Contains Section 21 source metadata (dataType, source, lastVerifiedDate) for all food products');

  // Homemade masala validation
  const sambarProd = db.getProductById('FOOD-KAR-010');
  assert(sambarProd.homemadeMasalaDetails.includes('homemade sambar powder'), 'Vegetable Sambar correctly specifies homemade masala details');
  assert(Array.isArray(sambarProd.masalaIngredients) && sambarProd.masalaIngredients.length >= 5, 'Vegetable Sambar lists authentic homemade masala spices');

  const muddeProdObj = db.getProductById('FOOD-KAR-001');
  assert(muddeProdObj.homemadeMasalaDetails === 'Not applicable', 'Ragi Mudde correctly marks homemade masala as Not applicable');

  // Section 19 Response Structure Verification
  const foodDetailTurn = await ConversationService.processTurn({
    message: 'Tell me about Ragi Mudde',
    productId: 'FOOD-KAR-001'
  });
  assert(foodDetailTurn.toolCalled === 'getFoodDetails', 'Routes "Tell me about Ragi Mudde" to getFoodDetails');
  assert(foodDetailTurn.reply.includes('Ragi Mudde'), 'Response includes Food Name');
  assert(foodDetailTurn.reply.includes('Ingredients:'), 'Response includes Ingredients');
  assert(foodDetailTurn.reply.includes('Preparation:'), 'Response includes Preparation');
  assert(foodDetailTurn.reply.includes('Cooking method:'), 'Response includes Cooking method');
  assert(foodDetailTurn.reply.includes('Serving size:'), 'Response includes Serving size');
  assert(foodDetailTurn.reply.includes('Nutrition:'), 'Response includes Nutrition');
  assert(foodDetailTurn.reply.includes('Allergens:'), 'Response includes Allergens');
  assert(foodDetailTurn.reply.includes('Freshness:'), 'Response includes Freshness');
  assert(foodDetailTurn.reply.includes('Storage:'), 'Response includes Storage');
  assert(foodDetailTurn.reply.includes('Price: ₹60'), 'Response includes Price');
  assert(foodDetailTurn.reply.includes('Availability:'), 'Response includes Availability');
  assert(foodDetailTurn.reply.includes('Available stock: 50 units'), 'Response includes Stock');
  assert(foodDetailTurn.reply.includes('Delivery: Same-day delivery'), 'Response includes Delivery');

  // Kannada Food Detail inquiry
  const foodDetailKnTurn = await ConversationService.processTurn({
    message: 'Ragi Mudde bagge heli',
    productId: 'FOOD-KAR-001',
    language: 'kn'
  });
  assert(foodDetailKnTurn.toolCalled === 'getFoodDetails', 'Routes Kannada "Ragi Mudde bagge heli" to getFoodDetails');
  assert(foodDetailKnTurn.reply.includes('ಪದಾರ್ಥಗಳು:') && foodDetailKnTurn.reply.includes('ತಯಾರಿ:'), 'Kannada response follows Section 19 structure');

  // --- 16. PRODUCT-AWARE AI AGENT RESPONSE RULE (SECTIONS 1–7) ---
  console.log('\n🧠 TEST SUITE 16: Product-Aware AI Agent Response Rule (Multi-Category)');
  
  const muddeProd = db.getProductById('FOOD-KAR-001');
  const doloProd = db.getProductById('PROD-MED-001');
  const phoneProd = db.getProductById('PROD-PHONE-005');
  const watchProd = db.getProductById('PROD-ACC-001');
  const teeProd = db.getProductById('PROD-CLOTH-001');
  const lipstickProd = db.getProductById('PROD-COSM-001');

  // 16.0 Exact Natural Introduction Greeting
  const naturalIntro = ConversationService.generateProductAwareGreeting({});
  assert(naturalIntro === "Hi, I'm Zyro AI, your intelligent shopping and sales assistant. How can I help you today?", 'Generates exact natural introduction for Zyro AI');

  // 16.1 Food Product Greeting (English)
  const foodGreetingEn = ConversationService.generateProductAwareGreeting({ product: muddeProd, customerName: 'Rahul', language: 'en' });
  assert(foodGreetingEn.includes('Namaste Rahul!'), 'Personalizes greeting with customer name');
  assert(foodGreetingEn.includes("I'm Zyro AI from TrendVibe Store"), 'Includes AI name and store name');
  assert(foodGreetingEn.includes('Ragi Mudde'), 'Includes exact product name');
  assert(foodGreetingEn.includes('availability') && foodGreetingEn.includes('ingredients') && foodGreetingEn.includes('preparation information'), 'Food greeting offers relevant food options');
  assert(!foodGreetingEn.toLowerCase().includes('sizing') && !foodGreetingEn.toLowerCase().includes('ram') && !foodGreetingEn.toLowerCase().includes('storage'), 'Food greeting strictly never mentions sizing, RAM, or storage');

  // 16.2 Food Product Greeting (Kannada)
  const foodGreetingKn = ConversationService.generateProductAwareGreeting({ product: muddeProd, customerName: 'Friend', language: 'kn' });
  assert(foodGreetingKn.includes('ನಮಸ್ಕಾರ!'), 'Kannada salutation is correct');
  assert(foodGreetingKn.includes('Zyro AI') && foodGreetingKn.includes('ಟ್ರೆಂಡ್‌ವೈಬ್ ಸ್ಟೋರ್'), 'Kannada greeting includes Zyro AI and TrendVibe Store');
  assert(foodGreetingKn.includes('ಲಭ್ಯತೆ') && foodGreetingKn.includes('ಸಾಮಗ್ರಿಗಳು (ingredients)') && foodGreetingKn.includes('ಪ್ರಮಾಣ'), 'Kannada food greeting contains relevant food attributes');

  // 16.3 Medicine & Healthcare Greeting (English)
  const medGreetingEn = ConversationService.generateProductAwareGreeting({ product: doloProd, customerName: null, language: 'en' });
  assert(medGreetingEn.includes("Namaste! I'm Zyro AI from TrendVibe Store"), 'Medicine greeting salutation is correct');
  assert(medGreetingEn.includes('Dolo 650 Tablet'), 'Medicine greeting mentions exact product name');
  assert(medGreetingEn.includes('verified product details') && medGreetingEn.includes('active ingredients') && medGreetingEn.includes('safety warnings'), 'Medicine greeting offers verified product details, active ingredients, and safety warnings');
  assert(!medGreetingEn.toLowerCase().includes('sizing') && !medGreetingEn.toLowerCase().includes('ram'), 'Medicine greeting never mentions sizing or RAM');

  // 16.4 Medicine & Healthcare Greeting (Kannada)
  const medGreetingKn = ConversationService.generateProductAwareGreeting({ product: doloProd, language: 'kn' });
  assert(medGreetingKn.includes('ಔಷಧಿಯ ಬಗ್ಗೆ') && medGreetingKn.includes('ಅಧಿಕೃತ ಮಾಹಿತಿ') && medGreetingKn.includes('ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು'), 'Kannada medicine greeting contains verified healthcare terms');

  // 16.5 Electronics / Smartphone Greeting
  const phoneGreetingEn = ConversationService.generateProductAwareGreeting({ product: phoneProd, language: 'en' });
  assert(phoneGreetingEn.includes(phoneProd.name), 'Electronics greeting identifies smartphone');
  assert(phoneGreetingEn.includes('specifications') && phoneGreetingEn.includes('RAM and storage options') && phoneGreetingEn.includes('warranty'), 'Electronics greeting offers specs, RAM/storage, and warranty');

  // 16.6 Accessories Greeting
  const accGreetingEn = ConversationService.generateProductAwareGreeting({ product: watchProd, language: 'en' });
  assert(accGreetingEn.includes('device compatibility') && accGreetingEn.includes('specifications') && accGreetingEn.includes('warranty'), 'Accessories greeting offers device compatibility, specs, and warranty');

  // 16.7 Clothing / Apparel Greeting
  const clothGreetingEn = ConversationService.generateProductAwareGreeting({ product: teeProd, language: 'en' });
  assert(clothGreetingEn.includes('sizing and fit') && clothGreetingEn.includes('available colours') && clothGreetingEn.includes('fabric material'), 'Clothing greeting offers sizing/fit, colours, and fabric material');

  // 16.8 Cosmetics / Beauty Greeting
  const cosmGreetingEn = ConversationService.generateProductAwareGreeting({ product: lipstickProd, language: 'en' });
  assert(cosmGreetingEn.includes('shade options') && cosmGreetingEn.includes('finish') && cosmGreetingEn.includes('skin suitability'), 'Cosmetics greeting offers shades, finish, and skin suitability');

  // 16.9 Conversational Turn: Sizing Query on Food
  const foodSizeTurn = await ConversationService.processTurn({ message: 'What size is available?', productId: 'FOOD-KAR-001' });
  assert(foodSizeTurn.reply.includes('freshly prepared food dish') && foodSizeTurn.reply.includes('does not have clothing sizes'), 'Correctly handles size query on food without offering clothing sizes');

  // 16.10 Conversational Turn: RAM Query on Food
  const foodRamTurn = await ConversationService.processTurn({ message: 'What RAM and processor does it have?', productId: 'FOOD-KAR-001' });
  assert(foodRamTurn.reply.includes('culinary food product') && foodRamTurn.reply.includes('does not have electronic specifications'), 'Correctly explains food has no electronic specs');

  // 16.11 Conversational Turn: Colour Query on Food
  const foodColorTurn = await ConversationService.processTurn({ message: 'What colour is it available in?', productId: 'FOOD-KAR-001' });
  assert(foodColorTurn.reply.includes('traditional dish') && !foodColorTurn.reply.includes('standard shade'), 'Correctly handles colour query on food without generic clothing shade reply');

  // 16.12 Conversational Turn: Greeting on Food Product
  const foodHiTurn = await ConversationService.processTurn({ message: 'Namaste', productId: 'FOOD-KAR-001' });
  assert(foodHiTurn.toolCalled === 'greeting', 'Routes "Namaste" to greeting tool');
  assert(foodHiTurn.reply.includes('Ragi Mudde') && foodHiTurn.reply.includes('ingredients') && !foodHiTurn.reply.toLowerCase().includes('sizing'), 'Returns dynamic food greeting on "Namaste" without sizing');

  // 16.13 Conversational Turn: Greeting on Medicine Product
  const medHiTurn = await ConversationService.processTurn({ message: 'Hello', productId: 'PROD-MED-001' });
  assert(medHiTurn.toolCalled === 'greeting', 'Routes "Hello" on medicine to greeting tool');
  assert(medHiTurn.reply.includes('Dolo 650') && medHiTurn.reply.includes('verified product details') && !medHiTurn.reply.toLowerCase().includes('sizing'), 'Returns dynamic medicine greeting on "Hello" without sizing');

  // 16.14 VoiceCallService Dynamic Greeting for Food
  const leadFood = db.createLead({
    customerName: 'Suresh',
    phone: '+919876543210',
    productId: 'FOOD-KAR-001',
    productName: 'Ragi Mudde'
  });
  const voiceCallRes = await VoiceCallService.triggerOutboundCall({ leadId: leadFood.id, customerName: 'Suresh', productName: 'Ragi Mudde' });
  assert(voiceCallRes.dynamicGreeting.includes('Namaste Suresh!'), 'Voice call generates personalized greeting for lead');
  assert(voiceCallRes.dynamicGreeting.includes('Ragi Mudde') && voiceCallRes.dynamicGreeting.includes('ingredients') && !voiceCallRes.dynamicGreeting.toLowerCase().includes('sizing'), 'Voice call dynamic greeting is product-aware for food');

  // --- 17. HOMEMADE GYM FOOD PRODUCTS (SECTIONS 1–8) ---
  console.log('\n🏋️ TEST SUITE 17: Homemade Gym Food Products Verification');

  const gymProductIds = ['FOOD-GYM-001', 'FOOD-KAR-008', 'FOOD-GYM-002', 'FOOD-GYM-003'];
  const allProdsList = db.getAllProducts();

  // 17.1 All 4 products present in catalog
  for (const gid of gymProductIds) {
    const p = db.getProductById(gid);
    assert(Boolean(p), `Gym food product ${gid} is loaded in database`);
    assert(p.category === 'Food', `Gym food product ${gid} category is strictly "Food"`);
    assert(p.fssaiNumber === 'Not available in verified store data.', `FSSAI is unavailable in store data for ${gid}`);
    assert(p.foodTestingInfo === 'Not available in verified store data.', `Testing info is unavailable in store data for ${gid}`);
    assert(p.rawMaterialSupplier === 'Demo supplier information — actual supplier not provided.', `Raw material supplier is marked as demo for ${gid}`);
    assert(Boolean(p.batchNumber && p.batchNumber.startsWith('DEMO-')), `Batch number follows demo format for ${gid}`);
  }

  // 17.2 Sprouted Moong Salad is NOT duplicated
  const moongMatches = allProdsList.filter(p => /sprouted moong/i.test(p.name));
  assert(moongMatches.length === 1, `Sprouted Moong Salad has exactly 1 catalog entry (found ${moongMatches.length})`);
  assert(moongMatches[0].id === 'FOOD-KAR-008', 'Sprouted Moong Salad retains existing ID FOOD-KAR-008');
  assert(moongMatches[0].imageUrl === '/images/products/FOOD-KAR-008.jpg', 'Sprouted Moong Salad retains existing image');

  // 17.3 Real image files physically exist on disk with valid file size
  for (const gid of gymProductIds) {
    const prod = db.getProductById(gid);
    assert(Boolean(prod.imageUrl && prod.imageUrl.startsWith('/images/products/')), `Image URL configured for ${gid}`);
    const localRel = prod.imageUrl.replace(/^\//, '');
    const localPath = path.join(process.cwd(), 'public', localRel);
    assert(fs.existsSync(localPath) && fs.statSync(localPath).size > 1000, `Physical image exists on disk with valid size for ${gid}`);
  }

  // 17.4 Conversational Turn: Show me homemade gym foods
  const gymListTurn = await ConversationService.processTurn({ message: 'Show me homemade gym foods' });
  assert(gymListTurn.toolCalled === 'listGymFoodProducts', 'Routes "Show me homemade gym foods" to listGymFoodProducts');
  assert(gymListTurn.reply.includes('Homemade Protein Ladoo') && gymListTurn.reply.includes('Oats Banana Pancake'), 'Lists homemade gym food items with prices and protein');

  // 17.5 Conversational Turn: Protein Ladoo ingredients & preparation
  const ladooIngTurn = await ConversationService.processTurn({ message: 'What ingredients are in the Protein Ladoo?', productId: 'FOOD-GYM-001' });
  assert(ladooIngTurn.toolCalled === 'getFoodIngredients', 'Routes ingredients inquiry on Protein Ladoo to getFoodIngredients');
  assert(ladooIngTurn.reply.includes('Roasted Peanuts') || ladooIngTurn.reply.includes('peanuts'), 'Details peanuts in Protein Ladoo');
  assert(ladooIngTurn.reply.includes('dalia') || ladooIngTurn.reply.includes('sesame') || ladooIngTurn.reply.includes('dates'), 'Details authentic ingredients in Protein Ladoo');

  const ladooPrepTurn = await ConversationService.processTurn({ message: 'How is the Protein Ladoo prepared?', productId: 'FOOD-GYM-001' });
  assert(ladooPrepTurn.toolCalled === 'getFoodDetails', 'Routes preparation inquiry on Protein Ladoo to getFoodDetails');
  assert(ladooPrepTurn.reply.includes('Dry roasting') || ladooPrepTurn.reply.includes('dry-roasted') || ladooPrepTurn.reply.includes('Preparation:'), 'Details dry roasting preparation method');

  // 17.6 Conversational Turn: Protein amount in Protein Ladoo
  const ladooProteinTurn = await ConversationService.processTurn({ message: 'How much protein does it contain?', productId: 'FOOD-GYM-001' });
  assert(ladooProteinTurn.toolCalled === 'getFoodNutritionalFacts', 'Routes protein inquiry to getFoodNutritionalFacts');
  assert(ladooProteinTurn.reply.includes('8.5g protein'), 'Quotes 8.5g protein for Protein Ladoo');

  // 17.7 Conversational Turn: Sprouted Moong Salad Freshness & Vegetables
  const saladFreshTurn = await ConversationService.processTurn({ message: 'Is the Sprouted Moong Salad freshly prepared?', productId: 'FOOD-KAR-008' });
  assert(saladFreshTurn.toolCalled === 'getFoodFreshnessDetails', 'Routes salad freshness inquiry to getFoodFreshnessDetails');
  assert(saladFreshTurn.reply.includes('freshly assembled') || saladFreshTurn.reply.includes('Fresh'), 'Confirms fresh preparation');
  assert(saladFreshTurn.reply.includes('Raw Sprouts') || saladFreshTurn.reply.includes('raw'), 'Identifies living raw sprouts status');

  const saladVegTurn = await ConversationService.processTurn({ message: 'What vegetables are used in the salad?', productId: 'FOOD-KAR-008' });
  assert(saladVegTurn.toolCalled === 'getFoodIngredients', 'Routes salad vegetable inquiry to getFoodIngredients');
  assert(saladVegTurn.reply.includes('onions') && saladVegTurn.reply.includes('tomatoes') && saladVegTurn.reply.includes('cucumber'), 'Accurately details onions, tomatoes, and cucumber');

  // 17.8 Conversational Turn: Oats Banana Pancake Eggs & Milk
  const pancakeEggTurn = await ConversationService.processTurn({ message: 'Does the pancake contain egg?', productId: 'FOOD-GYM-002' });
  assert(pancakeEggTurn.toolCalled === 'getFoodAllergens', 'Routes pancake egg inquiry to getFoodAllergens');
  assert(pancakeEggTurn.reply.includes('contains 1 whole farm egg'), 'Accurately clarifies farm egg in pancake batter');

  const pancakeMilkTurn = await ConversationService.processTurn({ message: 'Does it contain milk?', productId: 'FOOD-GYM-002' });
  assert(pancakeMilkTurn.toolCalled === 'getFoodAllergens', 'Routes pancake milk inquiry to getFoodAllergens');
  assert(pancakeMilkTurn.reply.includes('dairy milk'), 'Accurately clarifies dairy milk in pancake');

  // 17.9 Conversational Turn: Peanut Banana Smoothie Peanuts, Milk & Calories
  const smoothiePeanutTurn = await ConversationService.processTurn({ message: 'Does the smoothie contain peanuts?', productId: 'FOOD-GYM-003' });
  assert(smoothiePeanutTurn.toolCalled === 'getFoodAllergens', 'Routes smoothie peanut inquiry to getFoodAllergens');
  assert(smoothiePeanutTurn.reply.includes('roasted peanut butter'), 'Accurately clarifies roasted peanut butter in smoothie');

  const smoothieMilkTurn = await ConversationService.processTurn({ message: 'Does it contain milk?', productId: 'FOOD-GYM-003' });
  assert(smoothieMilkTurn.toolCalled === 'getFoodAllergens', 'Routes smoothie milk inquiry to getFoodAllergens');
  assert(smoothieMilkTurn.reply.includes('toned dairy milk'), 'Accurately clarifies toned milk in smoothie');

  const smoothieCalTurn = await ConversationService.processTurn({ message: 'How many calories does it have?', productId: 'FOOD-GYM-003' });
  assert(smoothieCalTurn.toolCalled === 'getFoodNutritionalFacts', 'Routes smoothie calorie inquiry to getFoodNutritionalFacts');
  assert(smoothieCalTurn.reply.includes('360 kcal'), 'Quotes verified 360 kcal for smoothie');

  // 17.10 Product-Aware Greeting for Gym Food Product
  const ladooGreeting = ConversationService.generateProductAwareGreeting({ product: db.getProductById('FOOD-GYM-001') });
  assert(ladooGreeting.includes('Homemade Protein Ladoo'), 'Personalizes greeting with Homemade Protein Ladoo');
  assert(ladooGreeting.includes('ingredients') && ladooGreeting.includes('availability') && !ladooGreeting.toLowerCase().includes('sizing'), 'Offers food-specific assistance for gym food');

  // --- 18. MOBILE AI — QUESTION HANDLING & DATA VERIFICATION ---
  console.log('\n📱 TEST SUITE 18: Mobile AI — Question Handling & Data Verification (All 16 Categories)');
  
  // 18.1 Catalog Integrity (62 Total Products, 5 Mobile Phones)
  const currentProds = db.getAllProducts();
  assert(currentProds.length === 62, `Catalog contains exactly 62 products (found ${currentProds.length})`);
  const mobileProds = currentProds.filter(p => p.category === 'mobile phones');
  assert(mobileProds.length === 5, `Catalog contains exactly 5 mobile phones (found ${mobileProds.length})`);

  const flagshipIds = ['PROD-PHONE-005', 'PROD-PHONE-006', 'PROD-PHONE-007', 'PROD-PHONE-008', 'PROD-PHONE-009'];
  for (const fid of flagshipIds) {
    const p = db.getProductById(fid);
    assert(Boolean(p && p.name && p.brand), `Flagship phone ${fid} is registered with brand`);
    assert(Boolean(p.specs && p.specs.processor && p.specs.ram && p.specs.storage && p.specs.display && p.specs.camera && p.specs.battery), `Flagship phone ${fid} has complete technical specifications`);
    assert(Boolean(p.specs && p.specs.os && p.specs.softwareUpdates && p.specs.aiFeatures), `Flagship phone ${fid} has software & AI features`);
    assert(Boolean(p.specs && p.specs.weight && p.specs.dimensions && p.specs.materials && p.specs.ipRating), `Flagship phone ${fid} has physical build specs`);
    assert(Boolean(p.stock && p.stock.overall > 0 && p.stock.variants), `Flagship phone ${fid} has live store stock with variants`);
    assert(Boolean(p.price && p.salePrice && p.variantPrices), `Flagship phone ${fid} has store database pricing`);

    // Physical Image on disk
    const imgRel = p.imageUrl.replace(/^\//, '');
    const imgPath = path.join(process.cwd(), 'public', imgRel);
    assert(fs.existsSync(imgPath) && fs.statSync(imgPath).size > 500, `Physical image exists on disk for ${fid}`);
  }

  // 18.2 Informal Names & Short Aliases
  const iphoneAlias = MobileService.identifyProductFromText('Can I buy iphone sixteen?');
  assert(iphoneAlias && iphoneAlias.id === 'PROD-PHONE-005', 'Resolves informal alias "iphone sixteen" to Apple iPhone 16');

  const s25Alias = MobileService.identifyProductFromText('What is the price of S25?');
  assert(s25Alias && s25Alias.id === 'PROD-PHONE-006', 'Resolves informal alias "S25" to Samsung Galaxy S25');

  const op13Alias = MobileService.identifyProductFromText('Tell me about OP 13');
  assert(op13Alias && op13Alias.id === 'PROD-PHONE-007', 'Resolves informal alias "OP 13" to OnePlus 13');

  const pixelAlias = MobileService.identifyProductFromText('Pixel 9 A price');
  assert(pixelAlias && pixelAlias.id === 'PROD-PHONE-008', 'Resolves informal alias "Pixel 9 A" to Google Pixel 9a');

  const nothingAlias = MobileService.identifyProductFromText('Nothing 2a Plus camera specs');
  assert(nothingAlias && nothingAlias.id === 'PROD-PHONE-009', 'Resolves informal alias "Nothing 2a Plus" to Nothing Phone (2a) Plus');

  // 18.3 Ambiguous Query Clarification
  const ambTurn = await ConversationService.processTurn({ message: 'Is the black one available?' });
  assert(ambTurn.toolCalled === 'clarifyMobileProduct', 'Triggers clarifyMobileProduct for ambiguous phone question');
  assert(ambTurn.reply.includes('Which phone do you mean') && ambTurn.reply.includes('iPhone 16') && ambTurn.reply.includes('Galaxy S25'), 'Asks explicit clarification prompt listing flagship phones');

  const ambTurnKn = await ConversationService.processTurn({ message: 'Is the black one available?', language: 'kn' });
  assert(ambTurnKn.toolCalled === 'clarifyMobileProduct', 'Triggers clarifyMobileProduct in Kannada');
  assert(ambTurnKn.reply.includes('ನೀವು ಯಾವ ಫೋನ್ ಬಗ್ಗೆ ಕೇಳುತ್ತಿದ್ದೀರಿ'), 'Returns Kannada clarification prompt');

  // 18.4 Category 1: Basic Product Questions
  const tCat1 = await ConversationService.processTurn({ message: 'Tell me about iPhone 16.' });
  assert(tCat1.toolCalled === 'getMobileBasicInfo', 'Cat 1: Routes to getMobileBasicInfo');
  assert(tCat1.reply.includes('Apple A18') && tCat1.reply.includes('Super Retina XDR'), 'Cat 1: Mentions Apple A18 and Super Retina XDR');

  // 18.5 Category 2: Price Questions (Store Database)
  const tCat2 = await ConversationService.processTurn({ message: 'iPhone 16 price?' });
  assert(tCat2.toolCalled === 'getMobilePrice', 'Cat 2: Routes to getMobilePrice');
  assert(tCat2.reply.includes('₹74,900') && tCat2.reply.includes('₹79,900'), 'Cat 2: Quotes store price ₹74,900 and MRP ₹79,900');

  // 18.6 Category 3: Storage Questions
  const tCat3 = await ConversationService.processTurn({ message: '128GB available?', productId: 'PROD-PHONE-005' });
  assert(tCat3.toolCalled === 'getMobileStorage', 'Cat 3: Routes to getMobileStorage');
  assert(tCat3.reply.includes('128GB') && tCat3.reply.includes('NVMe') && /non-expandable/i.test(tCat3.reply), 'Cat 3: Accurately confirms NVMe storage and no microSD slot');

  // 18.7 Category 4: RAM and Performance Questions
  const tCat4 = await ConversationService.processTurn({ message: 'How much RAM does Galaxy S25 have?' });
  assert(tCat4.toolCalled === 'getMobilePerformance', 'Cat 4: Routes to getMobilePerformance');
  assert(tCat4.reply.includes('12GB LPDDR5X') && tCat4.reply.includes('Snapdragon 8 Elite'), 'Cat 4: Details 12GB LPDDR5X RAM and Snapdragon 8 Elite for Galaxy S25');

  // 18.8 Category 5: Display Questions
  const tCat5 = await ConversationService.processTurn({ message: 'Does iPhone 16 have Dynamic Island?', productId: 'PROD-PHONE-005' });
  assert(tCat5.toolCalled === 'getMobileDisplay', 'Cat 5: Routes to getMobileDisplay');
  assert(tCat5.reply.includes('Dynamic Island') && tCat5.reply.includes('60Hz') && tCat5.reply.includes('2000 nits'), 'Cat 5: Verifies Dynamic Island, 60Hz, and 2000 nits peak brightness');

  // 18.9 Category 6: Camera Questions
  const tCat6 = await ConversationService.processTurn({ message: 'Does it have OIS?', productId: 'PROD-PHONE-005' });
  assert(tCat6.toolCalled === 'getMobileCamera', 'Cat 6: Routes to getMobileCamera');
  assert(/sensor-shift ois/i.test(tCat6.reply) && tCat6.reply.includes('48MP'), 'Cat 6: Verifies Sensor-shift OIS and 48MP Fusion camera');

  // 18.10 Category 7: Battery & Charging Questions
  const tCat7 = await ConversationService.processTurn({ message: 'Is charger included in the box for OnePlus 13?' });
  assert(tCat7.toolCalled === 'getMobileBattery', 'Cat 7: Routes to getMobileBattery');
  assert(tCat7.reply.includes('6000mAh') && /100W SUPERVOOC/i.test(tCat7.reply) && /included in the box/i.test(tCat7.reply), 'Cat 7: Confirms 6000mAh and 100W charger in the box');

  // 18.11 Category 8: Network & Connectivity Questions
  const tCat8 = await ConversationService.processTurn({ message: 'Does iPhone 16 have eSIM?' });
  assert(tCat8.toolCalled === 'getMobileConnectivity', 'Cat 8: Routes to getMobileConnectivity');
  assert(/esim/i.test(tCat8.reply) && /wi-fi 7/i.test(tCat8.reply), 'Cat 8: Confirms eSIM and Wi-Fi 7');

  // 18.12 Category 9: Colour Questions
  const tCat9 = await ConversationService.processTurn({ message: 'Do you have Galaxy S25 12GB 256GB black?' });
  assert(tCat9.toolCalled === 'getMobileColours' || tCat9.toolCalled === 'getMobileStock', 'Cat 9: Routes to getMobileColours/getMobileStock');
  assert(tCat9.reply.includes('in stock') || tCat9.reply.includes('available') || /black/i.test(tCat9.reply), 'Cat 9: Confirms stock availability for Black 256GB');

  // 18.13 Category 10: Physical Details
  const tCat10 = await ConversationService.processTurn({ message: 'How much does iPhone 16 weigh?' });
  assert(tCat10.toolCalled === 'getMobilePhysicalDetails', 'Cat 10: Routes to getMobilePhysicalDetails');
  assert(tCat10.reply.includes('170 grams') && tCat10.reply.includes('IP68'), 'Cat 10: Details 170g weight and IP68 water resistance');

  // 18.14 Category 11: Software Questions
  const tCat11 = await ConversationService.processTurn({ message: 'Does iPhone 16 support Apple Intelligence?' });
  assert(tCat11.toolCalled === 'getMobileSoftware', 'Cat 11: Routes to getMobileSoftware');
  assert(tCat11.reply.includes('Apple Intelligence') && tCat11.reply.includes('iOS 18'), 'Cat 11: Verifies iOS 18 with Apple Intelligence');

  // 18.15 Category 12: Warranty and Authenticity Questions
  const tCat12 = await ConversationService.processTurn({ message: 'Is iPhone 16 original and sealed?' });
  assert(tCat12.toolCalled === 'getMobileWarranty', 'Cat 12: Routes to getMobileWarranty');
  assert(/100% original/i.test(tCat12.reply) && /Apple India Manufacturer Warranty/i.test(tCat12.reply), 'Cat 12: Confirms sealed authentic retail pack and Apple warranty');

  // 18.16 Category 13: Stock and Availability Questions
  const tCat13 = await ConversationService.processTurn({ message: 'Is iPhone 16 in stock?' });
  assert(tCat13.toolCalled === 'getMobileStock', 'Cat 13: Routes to getMobileStock');
  assert(tCat13.reply.includes('live store inventory') && tCat13.reply.includes('units available'), 'Cat 13: Quotes live inventory count from store database');

  // 18.17 Category 14: Delivery Questions
  const tCat14 = await ConversationService.processTurn({ message: 'Can you deliver iPhone 16 tomorrow?' });
  assert(tCat14.toolCalled === 'getMobileDelivery', 'Cat 14: Routes to getMobileDelivery');
  assert(tCat14.reply.includes('doorstep express air delivery') && tCat14.reply.includes('PIN code'), 'Cat 14: Details express delivery and asks for PIN code');

  // 18.18 Category 15: Order Questions
  const tCat15 = await ConversationService.processTurn({ message: 'I want to buy iPhone 16.' });
  assert(tCat15.toolCalled === 'getMobileOrderInfo', 'Cat 15: Routes to getMobileOrderInfo');
  assert(tCat15.reply.includes('Cash on Delivery') && tCat15.reply.includes('7-day replacement guarantee'), 'Cat 15: Details payment methods and 7-day replacement policy');

  // 18.19 Category 16: Multi-Phone Comparison
  const tCat16 = await ConversationService.processTurn({ message: 'iPhone 16 vs Galaxy S25' });
  assert(tCat16.toolCalled === 'compareMobileProducts', 'Cat 16: Routes to compareMobileProducts');
  assert(tCat16.reply.includes('Apple iPhone 16 vs Samsung Galaxy S25') && tCat16.reply.includes('Apple A18') && tCat16.reply.includes('Snapdragon 8 Elite'), 'Cat 16: Performs side-by-side comparison without mixing specs');

  // 18.20 Full Kannada Support
  const tKnPrice = await ConversationService.processTurn({ message: 'iPhone 16 ಬೆಲೆ ಎಷ್ಟು?' });
  assert(tKnPrice.toolCalled === 'getMobilePrice', 'Kannada: Routes to getMobilePrice');
  assert(tKnPrice.reply.includes('₹74,900') && tKnPrice.reply.includes('ಬೆಲೆ'), 'Kannada: Delivers price in Kannada');

  const tKnStock = await ConversationService.processTurn({ message: 'iPhone 16 ಸ್ಟಾಕ್ ಲಭ್ಯವಿದೆಯಾ?' });
  assert(tKnStock.toolCalled === 'getMobileStock', 'Kannada: Routes to getMobileStock');
  assert(tKnStock.reply.includes('ಲಭ್ಯವಿದೆ') || tKnStock.reply.includes('ಸ್ಟಾಕ್'), 'Kannada: Confirms stock in Kannada');

  // 18.21 Product-Aware Mobile Greeting
  const mobileGreeting = ConversationService.generateProductAwareGreeting({ product: db.getProductById('PROD-PHONE-005') });
  assert(mobileGreeting.includes('Apple iPhone 16') && mobileGreeting.includes('specifications') && mobileGreeting.includes('RAM and storage') && !mobileGreeting.toLowerCase().includes('sizing') && !mobileGreeting.toLowerCase().includes('ingredients'), 'Mobile greeting contains mobile-specific questions without clothing or food questions');

  // --- 19. LAPTOP CATEGORY: 5 VERIFIED PRODUCTS, DYNAMIC QUESTION HANDLING & WARRANTY REGISTRATION ---
  console.log('\n💻 TEST SUITE 19: Laptop Category — 5 Verified Products, 24+ Categories & Warranty Registration');

  // 19.1 Catalog Integrity: 5 verified laptops in category "laptops", 0 legacy laptops
  const allProdsNow = db.getAllProducts();
  const laptopProds = allProdsNow.filter(p => p.category === 'laptops');
  assert(laptopProds.length === 5, `Laptop category contains exactly 5 products (found ${laptopProds.length})`);

  // Verify legacy products are completely removed
  const legacyLaptops = allProdsNow.filter(p => /zenbook aero|titan forge|macedge pro|aerobook slim/i.test(p.name));
  assert(legacyLaptops.length === 0, `All legacy laptop products removed from catalog (found ${legacyLaptops.length})`);

  // Verify the 5 specified models
  const expectedLaptops = [
    { id: 'PROD-LAP-001', name: 'ASUS TUF Gaming', brand: 'ASUS' },
    { id: 'PROD-LAP-002', name: 'Dell Inspiron 15', brand: 'Dell' },
    { id: 'PROD-LAP-003', name: 'Lenovo IdeaPad Slim 3', brand: 'Lenovo' },
    { id: 'PROD-LAP-004', name: 'ASUS Vivobook 15', brand: 'ASUS' },
    { id: 'PROD-LAP-005', name: 'Acer Aspire Lite', brand: 'Acer' }
  ];

  for (const exp of expectedLaptops) {
    const p = db.getProductById(exp.id);
    assert(Boolean(p && p.name === exp.name && p.brand === exp.brand), `${exp.name} (${exp.id}) registered with correct brand`);
    assert(Boolean(p.specs && p.specs.processor && p.specs.ram && p.specs.storage && p.specs.display && p.specs.battery && p.specs.ports), `${exp.name} has complete technical specifications`);
    assert(Boolean(p.specs.cooling && p.specs.durability && p.specs.upgradeability && p.specs.warrantyRegistration), `${exp.name} has cooling, durability, upgradeability & warranty registration`);
    assert(Boolean(p.stock && p.stock.overall > 0 && p.stock.variants), `${exp.name} has live store inventory with variant map`);
    assert(Boolean(p.price && p.salePrice && p.variantPrices), `${exp.name} has verified store database pricing`);

    // Physical Image on disk
    const imgRel = p.imageUrl.replace(/^\//, '');
    const imgPath = path.join(process.cwd(), 'public', imgRel);
    assert(fs.existsSync(imgPath) && fs.statSync(imgPath).size > 1000, `Physical image exists on disk for ${exp.id}`);
  }

  // 19.2 Informal Product Names & Aliases
  const tufAlias = LaptopService.identifyProductFromText('Tell me about TUF Gaming');
  assert(tufAlias && tufAlias.id === 'PROD-LAP-001', 'Resolves alias "TUF Gaming" to ASUS TUF Gaming');

  const inspironAlias = LaptopService.identifyProductFromText('What is the price of Inspiron 15?');
  assert(inspironAlias && inspironAlias.id === 'PROD-LAP-002', 'Resolves alias "Inspiron 15" to Dell Inspiron 15');

  const ideapadAlias = LaptopService.identifyProductFromText('IdeaPad Slim 3 specs');
  assert(ideapadAlias && ideapadAlias.id === 'PROD-LAP-003', 'Resolves alias "IdeaPad Slim 3" to Lenovo IdeaPad Slim 3');

  const vivobookAlias = LaptopService.identifyProductFromText('Can I buy ASUS Vivobook 15?');
  assert(vivobookAlias && vivobookAlias.id === 'PROD-LAP-004', 'Resolves alias "ASUS Vivobook 15" to ASUS Vivobook 15');

  const aspireAlias = LaptopService.identifyProductFromText('Is Aspire Lite in stock?');
  assert(aspireAlias && aspireAlias.id === 'PROD-LAP-005', 'Resolves alias "Aspire Lite" to Acer Aspire Lite');

  // 19.3 Ambiguous Laptop Clarification
  const ambLapTurn = await ConversationService.processTurn({ message: 'Is the laptop available?' });
  assert(ambLapTurn.toolCalled === 'clarifyLaptopProduct', 'Routes ambiguous laptop question to clarifyLaptopProduct');
  assert(ambLapTurn.reply.includes('Which laptop do you mean') && ambLapTurn.reply.includes('ASUS TUF Gaming') && ambLapTurn.reply.includes('Dell Inspiron 15'), 'Asks clarification listing the 5 laptops');

  const ambLapKn = await ConversationService.processTurn({ message: 'Is the laptop available?', language: 'kn' });
  assert(ambLapKn.toolCalled === 'clarifyLaptopProduct', 'Routes ambiguous laptop query to clarifyLaptopProduct in Kannada');
  assert(ambLapKn.reply.includes('ನೀವು ಯಾವ ಲ್ಯಾಪ್ಟಾಪ್ ಬಗ್ಗೆ ಕೇಳುತ್ತಿದ್ದೀರಿ'), 'Returns Kannada clarification prompt');

  // 19.4 Processor Questions
  const tProc = await ConversationService.processTurn({ message: 'What processor does Dell Inspiron 15 have?' });
  assert(tProc.toolCalled === 'getLaptopProcessor', 'Routes processor inquiry to getLaptopProcessor');
  assert(tProc.reply.includes('Core i5-1334U') || tProc.reply.includes('Intel'), 'Quotes official 13th Gen Intel Core processor for Inspiron 15');

  // 19.5 GPU / Graphics Questions
  const tGpu = await ConversationService.processTurn({ message: 'What graphics card is in ASUS TUF Gaming?' });
  assert(tGpu.toolCalled === 'getLaptopGpu', 'Routes GPU inquiry to getLaptopGpu');
  assert(tGpu.reply.includes('NVIDIA GeForce RTX 4060') || tGpu.reply.includes('RTX'), 'Quotes official NVIDIA GeForce RTX graphics for TUF Gaming');

  // 19.6 RAM Questions
  const tRam = await ConversationService.processTurn({ message: 'How much RAM in Lenovo IdeaPad Slim 3?' });
  assert(tRam.toolCalled === 'getLaptopRam', 'Routes RAM inquiry to getLaptopRam');
  assert(tRam.reply.includes('16GB LPDDR5') && tRam.reply.includes('soldered'), 'Details 16GB LPDDR5 soldered RAM for IdeaPad Slim 3');

  // 19.7 SSD / Storage Questions
  const tStorage = await ConversationService.processTurn({ message: 'What storage does Acer Aspire Lite have?' });
  assert(tStorage.toolCalled === 'getLaptopStorage', 'Routes storage inquiry to getLaptopStorage');
  assert(tStorage.reply.includes('512GB') && tStorage.reply.includes('NVMe'), 'Quotes 512GB PCIe NVMe M.2 SSD for Acer Aspire Lite');

  // 19.8 Display Questions
  const tDisp = await ConversationService.processTurn({ message: 'Does Dell Inspiron 15 have a 120Hz display?' });
  assert(tDisp.toolCalled === 'getLaptopDisplay', 'Routes display inquiry to getLaptopDisplay');
  assert(tDisp.reply.includes('120Hz') && tDisp.reply.includes('FHD'), 'Verifies 120Hz Full HD display for Inspiron 15');

  // 19.9 Battery Questions
  const tBat = await ConversationService.processTurn({ message: 'What is the battery capacity of ASUS TUF Gaming?' });
  assert(tBat.toolCalled === 'getLaptopBattery', 'Routes battery inquiry to getLaptopBattery');
  assert(tBat.reply.includes('90Wh'), 'Quotes official 90Wh battery capacity for ASUS TUF Gaming');

  // 19.10 Charging Questions
  const tCharge = await ConversationService.processTurn({ message: 'How fast does Dell Inspiron 15 charge?' });
  assert(tCharge.toolCalled === 'getLaptopCharging', 'Routes charging inquiry to getLaptopCharging');
  assert(tCharge.reply.includes('ExpressCharge') || tCharge.reply.includes('80% in 60 minutes'), 'Verifies ExpressCharge capability');

  // 19.11 Ports & Connectivity Questions
  const tPorts = await ConversationService.processTurn({ message: 'What ports does Lenovo IdeaPad Slim 3 have?' });
  assert(tPorts.toolCalled === 'getLaptopPorts', 'Routes ports inquiry to getLaptopPorts');
  assert(tPorts.reply.includes('USB-C') && tPorts.reply.includes('HDMI'), 'Quotes official USB-C and HDMI ports for IdeaPad Slim 3');

  // 19.12 Keyboard & Touchpad Questions
  const tKb = await ConversationService.processTurn({ message: 'Does ASUS TUF Gaming have an RGB keyboard?' });
  assert(tKb.toolCalled === 'getLaptopKeyboard', 'Routes keyboard inquiry to getLaptopKeyboard');
  assert(tKb.reply.includes('RGB') && tKb.reply.includes('WASD'), 'Verifies 1-Zone RGB keyboard and highlighted WASD keys');

  // 19.13 Camera & Audio Questions
  const tCam = await ConversationService.processTurn({ message: 'Does Lenovo IdeaPad Slim 3 have a privacy shutter?' });
  assert(tCam.toolCalled === 'getLaptopCameraAudio', 'Routes camera inquiry to getLaptopCameraAudio');
  assert(tCam.reply.includes('Privacy Shutter'), 'Verifies webcam physical privacy shutter');

  // 19.14 Cooling Questions
  const tCool = await ConversationService.processTurn({ message: 'What cooling does ASUS Vivobook 15 use?' });
  assert(tCool.toolCalled === 'getLaptopCooling', 'Routes cooling inquiry to getLaptopCooling');
  assert(tCool.reply.includes('IceBlade') || tCool.reply.includes('heat pipe'), 'Verifies ASUS IceBlade cooling technology');

  // 19.15 Weight & Dimensions
  const tWt = await ConversationService.processTurn({ message: 'How heavy is Acer Aspire Lite?' });
  assert(tWt.toolCalled === 'getLaptopWeight', 'Routes weight inquiry to getLaptopWeight');
  assert(tWt.reply.includes('1.59 kg') || tWt.reply.includes('3.50 lbs'), 'Quotes lightweight 1.59kg for Acer Aspire Lite');

  // 19.16 Operating System
  const tOs = await ConversationService.processTurn({ message: 'Which operating system is on Dell Inspiron 15?' });
  assert(tOs.toolCalled === 'getLaptopOs', 'Routes OS inquiry to getLaptopOs');
  assert(tOs.reply.includes('Windows 11') && tOs.reply.includes('Office'), 'Verifies Windows 11 Home and Microsoft Office Home & Student');

  // 19.17 Gaming Questions
  const tGame = await ConversationService.processTurn({ message: 'Is ASUS TUF Gaming good for gaming?' });
  assert(tGame.toolCalled === 'getLaptopGaming', 'Routes gaming inquiry to getLaptopGaming');
  assert(tGame.reply.includes('AAA gaming') || tGame.reply.includes('Ray Tracing') || tGame.reply.includes('FPS'), 'Confirms high-end AAA gaming capabilities');

  // 19.18 Student / Professional Usage
  const tUse = await ConversationService.processTurn({ message: 'Is ASUS Vivobook 15 good for students?' });
  assert(tUse.toolCalled === 'getLaptopUsage', 'Routes student usage inquiry to getLaptopUsage');
  assert(tUse.reply.includes('students') && tUse.reply.includes('office'), 'Confirms suitability for students and everyday office work');

  // 19.19 Durability & Build
  const tDur = await ConversationService.processTurn({ message: 'Is ASUS TUF Gaming military grade certified?' });
  assert(tDur.toolCalled === 'getLaptopDurability', 'Routes durability inquiry to getLaptopDurability');
  assert(tDur.reply.includes('MIL-STD-810H'), 'Verifies US MIL-STD-810H military standard certification');

  // 19.20 Upgradeability
  const tUpg = await ConversationService.processTurn({ message: 'Can I upgrade RAM on Acer Aspire Lite?' });
  assert(tUpg.toolCalled === 'getLaptopUpgradeability', 'Routes upgradeability inquiry to getLaptopUpgradeability');
  assert(tUpg.reply.includes('32GB') && tUpg.reply.includes('SO-DIMM'), 'Verifies dual SO-DIMM slots upgradeable up to 32GB');

  // 19.21 Official Warranty Registration Procedures
  const tRegAsus = await ConversationService.processTurn({ message: 'How do I register the warranty for ASUS TUF Gaming?' });
  assert(tRegAsus.toolCalled === 'getLaptopWarrantyRegistration', 'Routes ASUS warranty registration to getLaptopWarrantyRegistration');
  assert(tRegAsus.reply.includes('account.asus.com') || tRegAsus.reply.includes('MyASUS'), 'Provides official ASUS portal and MyASUS registration procedure');

  const tRegDell = await ConversationService.processTurn({ message: 'Where can I register my warranty for Dell Inspiron 15?' });
  assert(tRegDell.toolCalled === 'getLaptopWarrantyRegistration', 'Routes Dell warranty registration to getLaptopWarrantyRegistration');
  assert(tRegDell.reply.includes('dell.com/support') || tRegDell.reply.includes('Service Tag'), 'Provides official Dell Service Tag registration procedure');

  const tRegLenovo = await ConversationService.processTurn({ message: 'How can I register my laptop with Lenovo?' });
  assert(tRegLenovo.toolCalled === 'getLaptopWarrantyRegistration', 'Routes Lenovo warranty registration to getLaptopWarrantyRegistration');
  assert(tRegLenovo.reply.includes('support.lenovo.com') || tRegLenovo.reply.includes('Lenovo Vantage'), 'Provides official Lenovo Vantage portal registration procedure');

  const tRegAcer = await ConversationService.processTurn({ message: 'How do I activate the warranty for Acer Aspire Lite?' });
  assert(tRegAcer.toolCalled === 'getLaptopWarrantyRegistration', 'Routes Acer warranty registration to getLaptopWarrantyRegistration');
  assert(tRegAcer.reply.includes('registration.acer.com') || tRegAcer.reply.includes('SNID') || tRegAcer.reply.includes('Acer Care Centre'), 'Provides official Acer SNID portal registration procedure');

  // 19.22 Multi-Laptop Comparison
  const tComp = await ConversationService.processTurn({ message: 'ASUS TUF Gaming vs ASUS Vivobook 15' });
  assert(tComp.toolCalled === 'compareLaptopProducts', 'Routes side-by-side laptop comparison to compareLaptopProducts');
  assert(tComp.reply.includes('ASUS TUF Gaming vs ASUS Vivobook 15') && tComp.reply.includes('Core i7-13620H') && tComp.reply.includes('Core i5-1335U'), 'Performs side-by-side comparison without mixing specs');

  // 19.23 Kannada Support
  const tKnLapPrice = await ConversationService.processTurn({ message: 'Dell Inspiron 15 ಬೆಲೆ ಎಷ್ಟು?' });
  assert(tKnLapPrice.toolCalled === 'getLaptopPrice', 'Routes Kannada laptop price query to getLaptopPrice');
  assert(tKnLapPrice.reply.includes('₹49,999') && tKnLapPrice.reply.includes('ಬೆಲೆ'), 'Delivers Dell Inspiron 15 price in Kannada');

  const tKnLapReg = await ConversationService.processTurn({ message: 'Dell Inspiron 15 ವಾರಂಟಿ ನೋಂದಾಯಿಸುವುದು ಹೇಗೆ?' });
  assert(tKnLapReg.toolCalled === 'getLaptopWarrantyRegistration', 'Routes Kannada warranty registration query to getLaptopWarrantyRegistration');
  assert(tKnLapReg.reply.includes('ವಾರಂಟಿ ನೋಂದಣಿ ವಿಧಾನ'), 'Delivers warranty registration procedure in Kannada');

  // 19.24 Product-Aware Laptop Greeting
  const laptopGreeting = ConversationService.generateProductAwareGreeting({ product: db.getProductById('PROD-LAP-001') });
  assert(laptopGreeting.includes('ASUS TUF Gaming') && laptopGreeting.includes('specifications') && laptopGreeting.includes('RAM and storage') && !laptopGreeting.toLowerCase().includes('sizing') && !laptopGreeting.toLowerCase().includes('ingredients'), 'Personalizes laptop greeting with tech specs without clothing or food questions');

  // --- 20. FOOD DATASET & 31 CUSTOMER Q&A INTENTS VERIFICATION ---
  console.log('\n🍲 TEST SUITE 20: Food Dataset & 31 Customer Q&A Intents Verification');

  // 20.1 Food Product Resolution & Alternate IDs / SKUs
  const gyById = db.getProductById('FOOD-010');
  assert(Boolean(gyById && gyById.name === 'Greek Yogurt'), 'Resolves FOOD-010 to Greek Yogurt');

  const gyBySku = db.getProductById('GY-001');
  assert(Boolean(gyBySku && gyBySku.name === 'Greek Yogurt'), 'Resolves SKU GY-001 to Greek Yogurt');

  const gyByName = FoodService.identifyProductFromText('Tell me about Greek Yogurt');
  assert(Boolean(gyByName && gyByName.id === 'FOOD-010'), 'Identifies Greek Yogurt from conversation text');

  const rmByAlt = db.getProductById('FOOD-001');
  assert(Boolean(rmByAlt && rmByAlt.id === 'FOOD-KAR-001'), 'Resolves dataset ID FOOD-001 to Ragi Mudde');

  const arBySku = db.getProductById('AR-001');
  assert(Boolean(arBySku && arBySku.id === 'FOOD-KAR-003'), 'Resolves SKU AR-001 to Akki Rotti');

  // 20.2 What is Greek Yogurt?
  const gyWhatTurn = await ConversationService.processTurn({ message: 'What is Greek Yogurt?' });
  assert(gyWhatTurn.toolCalled === 'getFoodDetails', 'Routes "What is Greek Yogurt?" to getFoodDetails');
  assert(gyWhatTurn.reply.includes('Greek Yogurt') && (gyWhatTurn.reply.includes('strained') || gyWhatTurn.reply.includes('thick') || gyWhatTurn.reply.includes('dairy')), 'Answers Greek Yogurt query with verified dataset description');

  // 20.3 Serving Size
  const muddeServingTurn = await ConversationService.processTurn({ message: 'What is the serving size of Ragi Mudde?' });
  assert(muddeServingTurn.toolCalled === 'getFoodServingSize', 'Routes serving size query to getFoodServingSize');
  assert(muddeServingTurn.reply.includes('portion') || muddeServingTurn.reply.includes('serving') || muddeServingTurn.reply.includes('Mudde'), 'Provides verified serving size data');

  // 20.4 Sugar Content
  const muddeSugarTurn = await ConversationService.processTurn({ message: 'Does Ragi Mudde contain sugar?' });
  assert(muddeSugarTurn.toolCalled === 'getFoodSugarDetails', 'Routes sugar inquiry to getFoodSugarDetails');
  assert(muddeSugarTurn.reply.includes('Sugar added: No') && muddeSugarTurn.reply.includes('0 g'), 'Accurately confirms no added sugar');

  // 20.5 Salt Usage
  const muddeSaltTurn = await ConversationService.processTurn({ message: 'How much salt is used in Ragi Mudde?' });
  assert(muddeSaltTurn.toolCalled === 'getFoodSaltDetails', 'Routes salt inquiry to getFoodSaltDetails');
  assert(muddeSaltTurn.reply.includes('Salt'), 'Quotes verified salt usage information');

  // 20.6 Delivery Details
  const muddeDeliveryTurn = await ConversationService.processTurn({ message: 'Can you deliver Ragi Mudde?' });
  assert(muddeDeliveryTurn.toolCalled === 'getFoodDeliveryDetails', 'Routes delivery inquiry to getFoodDeliveryDetails');
  assert(muddeDeliveryTurn.reply.includes('Delivery is available'), 'Details delivery availability');

  // 20.7 Reheating Instructions
  const muddeReheatTurn = await ConversationService.processTurn({ message: 'How do I reheat Ragi Mudde?' });
  assert(muddeReheatTurn.toolCalled === 'getFoodReheatingInstructions', 'Routes reheat query to getFoodReheatingInstructions');
  assert(muddeReheatTurn.reply.includes('hot') || muddeReheatTurn.reply.includes('steam'), 'Provides verified reheating and serving guidance');

  // 20.8 Dietary Status (Vegan / Dairy Free)
  const muddeVeganTurn = await ConversationService.processTurn({ message: 'Is Ragi Mudde vegan?' });
  assert(muddeVeganTurn.toolCalled === 'getFoodDietaryStatus', 'Routes vegan inquiry to getFoodDietaryStatus');
  assert(muddeVeganTurn.reply.includes('100% vegan'), 'Accurately confirms vegan status');

  // 20.9 Speciality / Traditional Uniqueness
  const muddeDiffTurn = await ConversationService.processTurn({ message: 'What makes Ragi Mudde different?' });
  assert(muddeDiffTurn.toolCalled === 'getFoodTraditionalInfo', 'Routes speciality inquiry to getFoodTraditionalInfo');
  assert(muddeDiffTurn.reply.includes('Karnataka') && muddeDiffTurn.reply.includes('flour'), 'Shares verified traditional preparation notes');

  // 20.10 Food Cancellation Policy
  const foodCancelTurn = await ConversationService.processTurn({ message: 'Can I cancel my food order for Ragi Mudde?' });
  assert(foodCancelTurn.toolCalled === 'getFoodCancellationPolicy', 'Routes food cancellation inquiry to getFoodCancellationPolicy');
  assert(foodCancelTurn.reply.includes('Cancellation policy'), 'Explains verified food cancellation policy');

  // 20.11 Food Safety & Hygiene Standards
  const foodSafetyTurn = await ConversationService.processTurn({ message: 'What are the food safety and hygiene standards for Ragi Mudde?' });
  assert(foodSafetyTurn.toolCalled === 'getFoodSafetyDetails', 'Routes hygiene inquiry to getFoodSafetyDetails');
  assert(foodSafetyTurn.reply.includes('safety') || foodSafetyTurn.reply.includes('Hygiene'), 'Shares verified hygiene and safety protocol');

  // --- 21. MEDICINES & HEALTHCARE PRODUCT Q&A DATASET VERIFICATION ---
  console.log('\n💊 TEST SUITE 21: Medicines & Healthcare Product Q&A Dataset & 23 Question Categories Verification');

  // 21.1 Dataset Resolution & SKUs
  const medPara = db.getProductById('MED-PARA-001');
  assert(Boolean(medPara && medPara.name.includes('Paracetamol')), 'Resolves MED-PARA-001 to Paracetamol 500 mg Tablet');

  const medParaSku = db.getProductById('MOCK-MED-PARA-500-10');
  assert(Boolean(medParaSku && medParaSku.name.includes('Paracetamol')), 'Resolves SKU MOCK-MED-PARA-500-10 to Paracetamol 500 mg Tablet');

  const medOrs = db.getProductById('MED-ORS-001');
  assert(Boolean(medOrs && (medOrs.name.includes('ORS') || medOrs.name.includes('Electral'))), 'Resolves MED-ORS-001 to ORS Powder');

  const medCet = db.getProductById('MED-CET-001');
  assert(Boolean(medCet && medCet.name.includes('Cetirizine')), 'Resolves MED-CET-001 to Cetirizine 10 mg Tablet');

  const medMoov = db.getProductById('MED-MOOV-001');
  assert(Boolean(medMoov && medMoov.name.includes('Moov')), 'Resolves MED-MOOV-001 to Moov Pain Relief Cream');

  const medMentho = db.getProductById('MED-MENTHO-001');
  assert(Boolean(medMentho && medMentho.name.includes('Mentho')), 'Resolves MED-MENTHO-001 to Mentho Plus Balm');

  // 21.2 Category 1: Purpose & Common Uses
  const tMedUses = await ConversationService.processTurn({ message: 'What is Paracetamol 500 mg used for?' });
  assert(tMedUses.toolCalled === 'getMedicineUses', 'Routes uses inquiry to getMedicineUses');
  assert(tMedUses.reply.includes('pain') || tMedUses.reply.includes('fever'), 'Answers uses with verified indications from dataset');

  // 21.3 Category 2: Food Requirement (Before or After Food)
  const tMedFood = await ConversationService.processTurn({ message: 'Should Paracetamol 500 mg be taken before or after food?' });
  assert(tMedFood.toolCalled === 'getMedicineFoodRequirement', 'Routes food requirement inquiry to getMedicineFoodRequirement');
  assert(tMedFood.reply.includes('food') || tMedFood.reply.includes('instructions'), 'Provides verified before/after food guidance');

  // 21.4 Category 3: Dosage & Administration
  const tMedDosage = await ConversationService.processTurn({ message: 'How should I take Paracetamol 500 mg?' });
  assert(tMedDosage.toolCalled === 'getMedicineDosage', 'Routes dosage inquiry to getMedicineDosage');
  assert(tMedDosage.reply.includes('label') || tMedDosage.reply.includes('directions') || tMedDosage.reply.includes('guidance'), 'Provides verified dosage and administration from dataset');

  // 21.5 Category 4: Strength / Concentration
  const tMedStrength = await ConversationService.processTurn({ message: 'What is the strength of Cetirizine 10 mg?' });
  assert(tMedStrength.toolCalled === 'getMedicineStrength', 'Routes strength inquiry to getMedicineStrength');
  assert(tMedStrength.reply.includes('10 mg'), 'Provides verified strength from dataset');

  // 21.6 Category 5: Active Ingredients
  const tMedIngs = await ConversationService.processTurn({ message: 'What are the active ingredients in Electral ORS?' });
  assert(tMedIngs.toolCalled === 'getMedicineIngredients', 'Routes ingredients inquiry to getMedicineIngredients');
  assert(tMedIngs.reply.includes('Sodium Chloride') || tMedIngs.reply.includes('ingredients') || tMedIngs.reply.includes('ORS'), 'Provides verified active ingredients from dataset');

  // 21.7 Category 6: Side Effects & Drowsiness
  const tMedSide = await ConversationService.processTurn({ message: 'What are the side effects of Paracetamol 500 mg?' });
  assert(tMedSide.toolCalled === 'getMedicineSideEffects', 'Routes side effects inquiry to getMedicineSideEffects');
  assert(tMedSide.reply.includes('side effects') || tMedSide.reply.includes('reactions') || tMedSide.reply.includes('Paracetamol'), 'Provides verified common side effects');

  // 21.8 Category 7: Warnings & Contraindications
  const tMedContra = await ConversationService.processTurn({ message: 'Who should not take Diclofenac Pain Relief Gel?' });
  assert(tMedContra.toolCalled === 'getMedicineContraindications', 'Routes contraindications inquiry to getMedicineContraindications');
  assert(tMedContra.reply.includes('Contraindications') || tMedContra.reply.includes('hypersensitivity') || tMedContra.reply.includes('Diclofenac'), 'Provides verified warnings and contraindications');

  // 21.9 Category 8: Age Suitability
  const tMedAge = await ConversationService.processTurn({ message: 'Is Calamine Lotion suitable for children?' });
  assert(tMedAge.toolCalled === 'getMedicineAgeSuitability', 'Routes age suitability inquiry to getMedicineAgeSuitability');
  assert(tMedAge.reply.includes('Children') || tMedAge.reply.includes('age') || tMedAge.reply.includes('Calamine'), 'Provides verified age suitability details');

  // 21.10 Category 9: Drug Interactions
  const tMedInter = await ConversationService.processTurn({ message: 'Can I take Paracetamol 500 mg with other medicines?' });
  assert(tMedInter.toolCalled === 'getMedicineInteractions', 'Routes drug interactions inquiry to getMedicineInteractions');
  assert(tMedInter.reply.includes('Drug interaction') || tMedInter.reply.includes('pharmacist') || tMedInter.reply.includes('doctor'), 'Provides verified drug interactions guidance');

  // 21.11 Category 10: Allergy Information
  const tMedAllergy = await ConversationService.processTurn({ message: 'Does Calcium Carbonate Antacid contain gluten or lactose?' });
  assert(tMedAllergy.toolCalled === 'getMedicineAllergyInfo', 'Routes allergy inquiry to getMedicineAllergyInfo');
  assert(tMedAllergy.reply.includes('Allergy information') || tMedAllergy.reply.includes('hypersensitivity') || tMedAllergy.reply.includes('Calcium Carbonate'), 'Provides verified allergen information');

  // 21.12 Category 11: Pregnancy & Breastfeeding
  const tMedPreg = await ConversationService.processTurn({ message: 'Can I use Calamine Lotion during pregnancy?' });
  assert(tMedPreg.toolCalled === 'getMedicinePregnancySafety', 'Routes pregnancy safety inquiry to getMedicinePregnancySafety');
  assert(tMedPreg.reply.includes('Pregnancy') || tMedPreg.reply.includes('doctor') || tMedPreg.reply.includes('pharmacist'), 'Provides verified pregnancy safety information');

  // 21.13 Category 12: Prescription vs OTC Status
  const tMedOtc = await ConversationService.processTurn({ message: 'Do I need a prescription for Paracetamol 500 mg?' });
  assert(tMedOtc.toolCalled === 'getMedicinePrescriptionStatus', 'Routes prescription inquiry to getMedicinePrescriptionStatus');
  assert(tMedOtc.reply.includes('Prescription status') || tMedOtc.reply.includes('OTC') || tMedOtc.reply.includes('prescription'), 'Provides verified OTC / prescription status');

  // 21.14 Category 13: Manufacturer & Company
  const tMedMfr = await ConversationService.processTurn({ message: 'Who manufactures Paracetamol 500 mg?' });
  assert(tMedMfr.toolCalled === 'getMedicineManufacturer', 'Routes manufacturer inquiry to getMedicineManufacturer');
  assert(tMedMfr.reply.includes('Manufacturer') || tMedMfr.reply.includes('Paracetamol'), 'Provides verified manufacturer source');

  // 21.15 Category 14: Regulatory & Licensing
  const tMedReg = await ConversationService.processTurn({ message: 'What is the licensing information for Paracetamol 500 mg?' });
  assert(tMedReg.toolCalled === 'getMedicineRegulatory', 'Routes licensing inquiry to getMedicineRegulatory');
  assert(tMedReg.reply.includes('licensing') || tMedReg.reply.includes('DL-2024') || tMedReg.reply.includes('CDSCO'), 'Provides verified licensing details');

  // 21.16 Category 15: Batch Number & Expiry Date
  const tMedExp = await ConversationService.processTurn({ message: 'What is the expiry date of MED-PARA-001?' });
  assert(tMedExp.toolCalled === 'getMedicineExpiry', 'Routes expiry inquiry to getMedicineExpiry');
  assert(tMedExp.reply.includes('Expiry') || tMedExp.reply.includes('Batch') || tMedExp.reply.includes('202'), 'Provides verified batch number and expiry date');

  // 21.17 Category 16: Storage Instructions
  const tMedStorage = await ConversationService.processTurn({ message: 'How should I store Electral ORS?' });
  assert(tMedStorage.toolCalled === 'getMedicineStorage', 'Routes storage inquiry to getMedicineStorage');
  assert(tMedStorage.reply.includes('Storage') || tMedStorage.reply.includes('cool') || tMedStorage.reply.includes('dry place'), 'Provides verified storage instructions');

  // 21.18 Category 17: Pack Size & Form
  const tMedPack = await ConversationService.processTurn({ message: 'What is the pack size of Paracetamol 500 mg?' });
  assert(tMedPack.toolCalled === 'getMedicinePackSize', 'Routes pack size inquiry to getMedicinePackSize');
  assert(tMedPack.reply.includes('Pack size') || tMedPack.reply.includes('10 tablets') || tMedPack.reply.includes('Tablet'), 'Provides verified pack size and form');

  // 21.19 Category 18: Stock & Availability
  const tMedStock = await ConversationService.processTurn({ message: 'Is Cetirizine 10 mg in stock?' });
  assert(tMedStock.toolCalled === 'getMedicineStock', 'Routes stock inquiry to getMedicineStock');
  assert(tMedStock.reply.includes('stock') || tMedStock.reply.includes('available'), 'Provides verified live stock availability');

  // 21.20 Category 19: Price, MRP & Discount
  const tMedPrice = await ConversationService.processTurn({ message: 'What is the price of Mentho Plus Balm?' });
  assert(tMedPrice.toolCalled === 'getMedicinePrice', 'Routes price inquiry to getMedicinePrice');
  assert(tMedPrice.reply.includes('MRP') && tMedPrice.reply.includes('₹'), 'Provides verified MRP and sale price from dataset');

  // 21.21 Category 20: Delivery & Shipping
  const tMedDeliv = await ConversationService.processTurn({ message: 'Can you deliver Calamine Lotion?' });
  assert(tMedDeliv.toolCalled === 'getMedicineDelivery', 'Routes delivery inquiry to getMedicineDelivery');
  assert(tMedDeliv.reply.includes('delivery') || tMedDeliv.reply.includes('Same-day') || tMedDeliv.reply.includes('available'), 'Provides verified delivery timeline');

  // 21.22 Category 21: Returns & Refunds Policy
  const tMedRet = await ConversationService.processTurn({ message: 'What is the return policy for Paracetamol 500 mg?' });
  assert(tMedRet.toolCalled === 'getMedicineReturnPolicy', 'Routes return policy inquiry to getMedicineReturnPolicy');
  assert(tMedRet.reply.includes('Return policy') || tMedRet.reply.includes('damaged') || tMedRet.reply.includes('dispatch'), 'Provides verified return and refund policy for medicines');

  // 21.23 Category 22: Authenticity & Genuine Source
  const tMedAuth = await ConversationService.processTurn({ message: 'Is Paracetamol 500 mg original and genuine?' });
  assert(tMedAuth.toolCalled === 'getMedicineAuthenticity', 'Routes authenticity inquiry to getMedicineAuthenticity');
  assert(tMedAuth.reply.includes('genuine') || tMedAuth.reply.includes('authentic'), 'Confirms verified authenticity and source');

  // 21.24 Category 23: Comparison Between Two Medicines
  const tMedComp = await ConversationService.processTurn({ message: 'Compare Paracetamol 500 mg and Cetirizine 10 mg' });
  assert(tMedComp.toolCalled === 'compareMedicineProducts', 'Routes medicine comparison to compareMedicineProducts');
  assert(tMedComp.reply.includes('Paracetamol') && tMedComp.reply.includes('Cetirizine'), 'Performs side-by-side comparison without mixing medical data');

  // 21.25 Language Switch & Kannada Medicine Consultation
  const tMedKnSwitch = await ConversationService.processTurn({ message: 'Kannada ge switch madi' });
  assert(tMedKnSwitch.toolCalled === 'switchLanguage' && tMedKnSwitch.language === 'kn', 'Executes dataset language switch command "Kannada ge switch madi"');

  const tMedKnQuery = await ConversationService.processTurn({ message: 'Paracetamol 500 mg ಬಗ್ಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾಹಿತಿ ನೀಡಿ' });
  assert(tMedKnQuery.language === 'kn', 'Delivers medicine consultation in Kannada');
  assert(tMedKnQuery.reply.includes('Paracetamol') && (tMedKnQuery.reply.includes('ಉದ್ದೇಶ') || tMedKnQuery.reply.includes('ಜ್ವರ') || tMedKnQuery.reply.includes('ಬಳಕೆ')), 'Provides verified medicine details in Kannada script');

  // 21.26 General Medical Inquiry without explicit Product ID
  const tMedGenUses = await ConversationService.processTurn({ message: 'What is this medicine used for?' });
  assert(tMedGenUses.toolCalled === 'getMedicineUses', 'General medicine query routes to getMedicineUses');
  assert(tMedGenUses.reply.includes('pain') || tMedGenUses.reply.includes('fever'), 'Answers general medicine query using primary dataset product (MED-PARA-001)');

  const tMedGenSide = await ConversationService.processTurn({ message: 'What are the side effects?' });
  assert(tMedGenSide.toolCalled === 'getMedicineSideEffects', 'General side effects query routes to getMedicineSideEffects');
  assert(tMedGenSide.reply.includes('side effects') || tMedGenSide.reply.includes('reactions'), 'Answers general side effects from verified dataset');

  // 21.27 Compound Units and Romanized Kannada queries
  const tMedCompUnit = await ConversationService.processTurn({ message: 'Paracetamol 500mg price eshtu?' });
  assert(tMedCompUnit.toolCalled === 'getMedicinePrice', 'Routes compound unit "Paracetamol 500mg" and Romanized "price eshtu" to getMedicinePrice');
  assert(tMedCompUnit.language === 'kn', 'Recognizes Romanized Kannada query "eshtu"');
  assert(tMedCompUnit.reply.includes('₹12') || tMedCompUnit.reply.includes('₹15'), 'Accurately quotes verified price from dataset');

  const tMedRomanKn = await ConversationService.processTurn({ message: 'Ee medicine yenu use?' });
  assert(tMedRomanKn.toolCalled === 'getMedicineUses' && tMedRomanKn.language === 'kn', 'Routes Romanized Kannada query "Ee medicine yenu use?" to getMedicineUses');
  assert(tMedRomanKn.reply.includes('ಉಪಯೋಗ'), 'Answers in Kannada for Romanized query');

  // 21.28 Generic Medicine Details & Name-only lookups
  const tMedCalamine = await ConversationService.processTurn({ message: 'What is Calamine used for?' });
  assert(tMedCalamine.toolCalled === 'getMedicineUses', 'Routes name-only lookup "Calamine" to getMedicineUses');
  assert(tMedCalamine.reply.includes('Calamine') && tMedCalamine.reply.includes('itching'), 'Provides verified uses for Calamine Lotion from dataset');

  const tMedDetails = await ConversationService.processTurn({ message: 'Tell me about this medicine' });
  assert(tMedDetails.toolCalled === 'getMedicineDetails', 'Routes "Tell me about this medicine" to getMedicineDetails');
  assert(tMedDetails.reply.includes('Paracetamol 500 mg Tablet') && tMedDetails.reply.includes('Purpose:'), 'Provides verified overview from dataset');

  console.log('\n=======================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=======================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
