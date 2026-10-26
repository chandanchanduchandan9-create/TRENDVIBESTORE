import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import aiToolsRouter from './routes/aiTools.js';
import sellerRouter from './routes/seller.js';
import { VoiceCallService } from './services/voiceCallService.js';
import { db } from './db/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// Store catalog: 31 products loaded

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

// Mount ElevenLabs Tool Endpoints (14 live tool APIs)
app.use('/api/tools', aiToolsRouter);

// Mount Seller Dashboard Endpoints
app.use('/api/seller', sellerRouter);

// Mount Core Business & Automation Endpoints
app.use('/api', apiRouter);

// Bolna AI Webhook (Receives call completion, duration, status & transcript from Bolna Studio)
app.post('/api/webhooks/bolna', async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await VoiceCallService.handleBolnaWebhook(payload);
    res.json(result);
  } catch (err) {
    console.error('[BolnaWebhook] Error handling webhook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bolna Execution Status Polling Endpoint
app.get('/api/calls/:executionId/bolna-status', async (req, res) => {
  try {
    const { executionId } = req.params;
    const status = await VoiceCallService.getExecutionStatus(executionId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy Call Status Callback (Preserved for backwards compatibility)
app.all('/api/calls/status-callback', (req, res) => {
  const { callId } = req.query;
  VoiceCallService.handleTwilioStatusCallback(req.body, callId);
  res.sendStatus(200);
});

// Legacy TwiML Route (Gracefully redirects to Bolna telephony status)
app.all('/api/calls/twiml', (req, res) => {
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>TrendVibe calling service has migrated to Bolna AI.</Say></Response>`);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TrendVibe AI Social Media Shopping Voice Agent'
  });
});

// Product & Instagram Link Redirect Route to Website
app.get('/r/:id', (req, res) => {
  const { id } = req.params;
  const product = db.getProductById(id) || db.findProductByQuery(id);
  const targetId = product ? product.id : (id || 'PROD-MED-015');
  const autoCall = req.query.autoCall === 'true' ? '&autoCall=true' : '';
  const lang = req.query.lang ? `&lang=${encodeURIComponent(req.query.lang)}` : '';
  const source = req.query.source || req.query.socialMediaSource || 'instagram';
  const campaign = req.query.campaign || 'post_redirect';
  res.redirect(`/enquire.html?productId=${encodeURIComponent(targetId)}&socialMediaSource=${encodeURIComponent(source)}&campaign=${encodeURIComponent(campaign)}${autoCall}${lang}`);
});

// Direct Talk with AI Sales Voice Assistant from any Social Media
app.get(['/talk/:id', '/call/:id', '/ai/:id'], (req, res) => {
  const { id } = req.params;
  const product = db.getProductById(id) || db.findProductByQuery(id);
  const targetId = product ? product.id : (id || 'PROD-MED-015');
  const lang = req.query.lang ? `&lang=${encodeURIComponent(req.query.lang)}` : '';
  const source = req.query.source || req.query.socialMediaSource || 'social_media';
  res.redirect(`/enquire.html?productId=${encodeURIComponent(targetId)}&autoCall=true&socialMediaSource=${encodeURIComponent(source)}&campaign=talk_ai_direct${lang}`);
});

app.get('/redirect', (req, res) => {
  const target = req.query.productId || req.query.id || req.query.post || req.query.ig || 'PROD-MED-015';
  const product = db.getProductById(target) || db.findProductByQuery(target);
  const targetId = product ? product.id : target;
  const autoCall = req.query.autoCall === 'true' ? '&autoCall=true' : '';
  res.redirect(`/enquire.html?productId=${encodeURIComponent(targetId)}&socialMediaSource=instagram&campaign=post_redirect${autoCall}`);
});

// Root redirects to demo hub
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 TrendVibe AI Shopping Sales Agent Server Running!`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📱 Instagram Experience: http://localhost:${PORT}/index.html`);
  console.log(`📝 Mobile Enquiry Page:  http://localhost:${PORT}/enquire.html`);
  console.log(`📊 Admin & Voice Console: http://localhost:${PORT}/dashboard.html`);
  console.log(`📦 Seller Dashboard:      http://localhost:${PORT}/seller.html`);
  console.log(`🛠️  14 AI Agent Tool Endpoints ready at: http://localhost:${PORT}/api/tools`);
  console.log(`=======================================================`);
});
