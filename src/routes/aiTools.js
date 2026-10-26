import express from 'express';
import { ProductService } from '../services/productService.js';
import { ProductKnowledgePipeline } from '../services/productKnowledgePipeline.js';

const router = express.Router();

/**
 * Helper to extract arguments from req.body or req.query
 */
const getArgs = (req) => ({ ...req.query, ...req.body });

// 1. searchProduct
router.post('/searchProduct', (req, res) => {
  const { query, category } = getArgs(req);
  const result = ProductService.searchProduct({ query, category });
  res.json(result);
});

// 2. getProductDetails
router.post('/getProductDetails', (req, res) => {
  const { productId, query } = getArgs(req);
  const result = ProductService.getProductDetails({ productId, query });
  res.json(result);
});

// 3. checkStock
router.post('/checkStock', (req, res) => {
  const { productId, query, size, colour } = getArgs(req);
  const result = ProductService.checkStock({ productId, query, size, colour });
  res.json(result);
});

// 4. getPrice
router.post('/getPrice', (req, res) => {
  const { productId, query } = getArgs(req);
  const result = ProductService.getPrice({ productId, query });
  res.json(result);
});

// 5. getVariants
router.post('/getVariants', (req, res) => {
  const { productId, query } = getArgs(req);
  const result = ProductService.getVariants({ productId, query });
  res.json(result);
});

// 6. checkSize
router.post('/checkSize', (req, res) => {
  const { productId, query, size } = getArgs(req);
  const result = ProductService.checkSize({ productId, query, size });
  res.json(result);
});

// 7. checkColour
router.post('/checkColour', (req, res) => {
  const { productId, query, colour } = getArgs(req);
  const result = ProductService.checkColour({ productId, query, colour });
  res.json(result);
});

// 8. getDeliveryInformation
router.post('/getDeliveryInformation', (req, res) => {
  const { productId, query, pincode } = getArgs(req);
  const result = ProductService.getDeliveryInformation({ productId, query, pincode });
  res.json(result);
});

// 9. getReturnPolicy
router.post('/getReturnPolicy', (req, res) => {
  const { productId, query } = getArgs(req);
  const result = ProductService.getReturnPolicy({ productId, query });
  res.json(result);
});

// 10. getPaymentOptions
router.post('/getPaymentOptions', (req, res) => {
  const { productId, query } = getArgs(req);
  const result = ProductService.getPaymentOptions({ productId, query });
  res.json(result);
});

// 11. searchSimilarProducts
router.post('/searchSimilarProducts', (req, res) => {
  const { productId, category, query } = getArgs(req);
  const result = ProductService.searchSimilarProducts({ productId, category, query });
  res.json(result);
});

// 12. getOrderStatus
router.post('/getOrderStatus', (req, res) => {
  const { phone, orderId } = getArgs(req);
  const result = ProductService.getOrderStatus({ phone, orderId });
  res.json(result);
});

// 13. createOrder
router.post('/createOrder', (req, res) => {
  const { leadId, productId, query, size, colour, quantity, paymentMethod, shippingAddress } = getArgs(req);
  const result = ProductService.createOrder({ leadId, productId, query, size, colour, quantity, paymentMethod, shippingAddress });
  res.json(result);
});

// 14. searchByPriceRange (₹0 to Infinity)
router.post('/searchByPriceRange', (req, res) => {
  const { minPrice, maxPrice, category } = getArgs(req);
  const result = ProductService.searchByPriceRange({ minPrice, maxPrice, category });
  res.json(result);
});

// 15. compareProducts
router.post('/compareProducts', (req, res) => {
  const { productId1, productId2, productNames, attribute, query, language } = getArgs(req);
  const result = ProductService.compareProducts({ productId1, productId2, productNames, attribute, query, language });
  res.json(result);
});

// 16. recommendProducts
router.post('/recommendProducts', (req, res) => {
  const { category, maxPrice, minPrice, colour, size, useCases, query, language } = getArgs(req);
  const result = ProductService.recommendProducts({ category, maxPrice, minPrice, colour, size, useCases, query, language });
  res.json(result);
});

// 17. getProductKnowledge
router.post('/getProductKnowledge', (req, res) => {
  const { productId, query } = getArgs(req);
  const result = ProductService.getProductKnowledge({ productId, query });
  res.json(result);
});

// 18. getSupportedIntents
router.post('/getSupportedIntents', (req, res) => {
  const { productId, query } = getArgs(req);
  const result = ProductService.getSupportedIntents({ productId, query });
  res.json(result);
});

// 19. pipelineLogs (Section 17 Internal Audit Logging)
router.get('/pipelineLogs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  const logs = ProductKnowledgePipeline.getRecentLogs(limit);
  res.json({ success: true, count: logs.length, logs });
});

// Also support GET requests for quick browser inspection of tool endpoints
router.get('/:toolName', (req, res) => {
  const toolName = req.params.toolName;
  if (typeof ProductService[toolName] === 'function') {
    const result = ProductService[toolName](req.query);
    return res.json(result);
  }
  res.status(404).json({ error: `Tool ${toolName} not found.` });
});

export default router;
