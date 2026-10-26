import express from 'express';
import { db } from '../db/database.js';
import { saveBase64Image } from '../services/uploadService.js';

const router = express.Router();

/**
 * 1. GET SELLER METRICS & OVERVIEW
 * Returns total queries, orders placed, revenue (₹ INR), conversion rates,
 * query breakdown by intent, inventory status, and recent activity.
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = db.getSellerMetrics();
    res.json(metrics);
  } catch (err) {
    console.error('[SellerRoute] Error fetching metrics:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. GET REAL-TIME STORE INVENTORY
 * Returns all products with stockCount, inStock flag, health status, variants,
 * and prices.
 */
router.get('/inventory', (req, res) => {
  try {
    const { category, status, search } = req.query;
    const metrics = db.getSellerMetrics();
    let inventory = metrics.inventory;

    if (category && category !== 'all') {
      inventory = inventory.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }
    if (status && status !== 'all') {
      inventory = inventory.filter(i => i.status.toLowerCase() === status.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      inventory = inventory.filter(i => i.name.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q));
    }

    res.json({
      success: true,
      count: inventory.length,
      inventory,
      summary: {
        totalStockUnits: metrics.summary.totalStockUnits,
        healthyStockCount: metrics.summary.healthyStockCount,
        lowStockCount: metrics.summary.lowStockCount,
        outOfStockCount: metrics.summary.outOfStockCount
      }
    });
  } catch (err) {
    console.error('[SellerRoute] Error fetching inventory:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. POST UPDATE STORE INVENTORY (REAL-TIME RESTOCK & ADJUSTMENT)
 * Modifies stockCount, delta, inStock flag, or pricing with instant persistence.
 */
router.post('/inventory/update', (req, res) => {
  try {
    const { productId, stockCount, inStock, delta, price, salePrice } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }

    let updated = db.updateProductStock(productId, { stockCount, inStock, delta });
    if (price !== undefined || salePrice !== undefined) {
      updated = db.updateProductPrice(productId, { price, salePrice });
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: `Product ${productId} not found` });
    }

    res.json({
      success: true,
      message: `Inventory updated successfully for ${updated.name}`,
      product: {
        id: updated.id,
        name: updated.name,
        stockCount: updated.stockCount,
        inStock: updated.inStock,
        price: updated.price,
        salePrice: updated.salePrice,
        formattedPrice: '₹' + Math.round(updated.salePrice).toLocaleString('en-IN')
      }
    });
  } catch (err) {
    console.error('[SellerRoute] Error updating inventory:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. GET USER QUERIES & INQUIRIES
 * Detailed list of all customer queries arrived from Instagram Reels and web.
 */
router.get('/queries', (req, res) => {
  try {
    const metrics = db.getSellerMetrics();
    res.json({
      success: true,
      total: metrics.summary.totalQueries,
      categories: metrics.queryCategories,
      queries: metrics.recentQueries
    });
  } catch (err) {
    console.error('[SellerRoute] Error fetching queries:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. GET ORDERS PLACED
 */
router.get('/orders', (req, res) => {
  try {
    const orders = db.getAllOrders();
    const metrics = db.getSellerMetrics();
    res.json({
      success: true,
      count: orders.length,
      totalRevenue: metrics.summary.totalRevenue,
      formattedRevenue: metrics.summary.formattedRevenue,
      orders
    });
  } catch (err) {
    console.error('[SellerRoute] Error fetching orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. POST UPDATE ORDER STATUS
 */
router.post('/orders/status', (req, res) => {
  try {
    const { orderId, orderStatus, note } = req.body;
    if (!orderId || !orderStatus) {
      return res.status(400).json({ success: false, error: 'orderId and orderStatus are required' });
    }

    const updated = db.updateOrderStatus(orderId, orderStatus, note);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Order ${orderId} not found` });
    }

    res.json({
      success: true,
      message: `Order ${orderId} updated to ${orderStatus}`,
      order: updated
    });
  } catch (err) {
    console.error('[SellerRoute] Error updating order status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. POST SELLER LOGIN
 * Authenticates store sellers with email & password.
 * Accepts: { email, password }
 * Default demo credentials:
 *   Email: seller@trendvibe.in
 *   Password: trendvibe2026
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isDemo = (cleanEmail === 'seller@trendvibe.in' && password === 'trendvibe2026');
    const isCustomSeller = cleanEmail.length >= 4 && password.length >= 4;

    if (!isDemo && !isCustomSeller) {
      return res.status(401).json({ success: false, error: 'Invalid seller credentials. Please check your email and password.' });
    }

    const token = `seller_token_${Buffer.from(cleanEmail + ':' + Date.now()).toString('base64')}`;
    const sellerUser = {
      id: 'SELLER-001',
      name: 'TrendVibe India HQ',
      storeName: 'TrendVibe Official Flagship',
      email: cleanEmail,
      role: 'Store Owner / Inventory Manager',
      warehouseLocation: 'Bengaluru Fulfillment Center, KA',
      token
    };

    res.json({
      success: true,
      message: 'Seller authenticated successfully',
      token,
      seller: sellerUser
    });
  } catch (err) {
    console.error('[SellerRoute] Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. GET SELLER SESSION VALIDATION
 */
router.get('/session', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || !token.startsWith('seller_token_')) {
    return res.status(401).json({ success: false, authenticated: false, error: 'No valid seller session found' });
  }

  res.json({
    success: true,
    authenticated: true,
    seller: {
      id: 'SELLER-001',
      name: 'TrendVibe India HQ',
      storeName: 'TrendVibe Official Flagship',
      email: 'seller@trendvibe.in',
      role: 'Store Owner / Inventory Manager'
    }
  });
});

/**
 * 9. GET TRACK ORDER
 * Returns complete real-time timeline and AWB details for an individual order.
 */
router.get('/orders/track/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: `Order ${orderId} not found` });
    }
    res.json({
      success: true,
      orderId: order.id,
      productName: order.productName,
      quantity: order.quantity,
      size: order.size,
      colour: order.colour,
      totalAmount: order.totalAmount,
      formattedAmount: '₹' + Math.round(order.totalAmount).toLocaleString('en-IN'),
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      courier: order.courier,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      timeline: order.timeline || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 10. GET SELLER ORDER ENQUIRIES
 */
router.get('/order-enquiries', (req, res) => {
  try {
    const enquiries = db.getAllOrderEnquiries();
    res.json({
      success: true,
      count: enquiries.length,
      enquiries
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 11. POST UPLOAD PHOTO
 * Handles base64 encoded photo uploads and saves them to public/uploads
 */
router.post('/upload', (req, res) => {
  try {
    const { image, photo, data, prefix = 'prod' } = req.body;
    const payload = image || photo || data;
    if (!payload) {
      return res.status(400).json({ success: false, error: 'No image data provided. Send base64 data string.' });
    }

    const savedUrl = saveBase64Image(payload, prefix);
    if (!savedUrl) {
      return res.status(400).json({ success: false, error: 'Failed to process image data.' });
    }

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      imageUrl: savedUrl
    });
  } catch (err) {
    console.error('[SellerRoute] Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 12. GET CATEGORIES
 * Returns dynamic list of all categories with active product count
 */
router.get('/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 13. POST CREATE NEW PRODUCT (WITH CATEGORY AND PHOTO UPLOAD)
 */
router.post('/products', async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      description,
      price,
      salePrice,
      stockCount,
      photo,
      image,
      imageUrl,
      colours,
      sizes,
      inStock,
      deliveryDays,
      specs,
      instagramVideoPostUrl,
      instagramPostUrl,
      instagramPostId
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, error: 'Product category is required' });
    }

    // Process photo if provided as base64
    let finalImageUrl = imageUrl;
    const rawPhoto = photo || image;
    if (rawPhoto) {
      const saved = saveBase64Image(rawPhoto, category);
      if (saved) finalImageUrl = saved;
    }
    if (!finalImageUrl) {
      finalImageUrl = '/images/products/default.jpg';
    }

    const product = await db.addProduct({
      name,
      category,
      brand,
      description,
      price,
      salePrice,
      stockCount,
      imageUrl: finalImageUrl,
      colours,
      sizes,
      inStock,
      deliveryDays,
      specs,
      instagramVideoPostUrl: instagramVideoPostUrl || instagramPostUrl,
      instagramPostUrl: instagramPostUrl || instagramVideoPostUrl,
      instagramPostId
    });

    res.status(201).json({
      success: true,
      message: `Product '${product.name}' created and synchronized with DBMS!`,
      product
    });
  } catch (err) {
    console.error('[SellerRoute] Error creating product:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 14. PUT UPDATE PRODUCT
 */
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { photo, image, imageUrl } = req.body;

    let finalImageUrl = imageUrl;
    const rawPhoto = photo || image;
    if (rawPhoto) {
      const saved = saveBase64Image(rawPhoto, 'prod_update');
      if (saved) finalImageUrl = saved;
    }

    const updates = { ...req.body };
    if (finalImageUrl) updates.imageUrl = finalImageUrl;

    const updated = await db.updateProduct(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Product ${id} not found` });
    }

    res.json({
      success: true,
      message: `Product ${id} updated successfully`,
      product: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 15. DELETE PRODUCT
 */
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: `Product ${id} not found` });
    }

    res.json({
      success: true,
      message: `Product ${id} deleted successfully from DBMS and local store`,
      id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 16. LIVE DBMS STATUS & VERIFICATION ENDPOINTS
 */
router.get('/db/status', async (req, res) => {
  try {
    const status = await db.getDbStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/db/verify', async (req, res) => {
  try {
    const verification = await db.verifyDbConnection();
    res.json({
      success: verification.healthy,
      verification
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
