import express from 'express';
import { db } from '../db/database.js';
import { ProductService } from '../services/productService.js';
import { LeadScoringEngine } from '../services/leadScoringEngine.js';
import { VoiceCallService } from '../services/voiceCallService.js';
import { GeminiService } from '../services/geminiService.js';
import { GoogleSheetsService } from '../services/googleSheetsService.js';
import { ConversationService } from '../services/conversationService.js';
import { SuggestedQuestionService } from '../services/suggestedQuestionService.js';
import { AutomaticKnowledgeRetrievalService } from '../services/automaticKnowledgeRetrievalService.js';
import { saveBase64Image } from '../services/uploadService.js';

const router = express.Router();

/**
 * 0. LIVE VOICE CONVERSATION TURN ENDPOINT
 * Receives customer voice speech from browser mic, resolves tool calls,
 * and returns voice-ready response text.
 */
router.post('/voice/chat', async (req, res) => {
  try {
    let { message, leadId, productId, imageUrl, history, language, speakLanguage, recognizeKannadaSpeakEnglish, audio, audioBase64, mimeType } = req.body;
    
    // If voice audio base64 is provided directly without text, transcribe it first
    if ((!message || !message.trim()) && (audio || audioBase64)) {
      try {
        message = await GeminiService.transcribeAudio(audio || audioBase64, mimeType || 'audio/webm');
      } catch (transcribeErr) {
        console.warn('[VoiceChat] Audio transcription note:', transcribeErr.message);
      }
    }

    const isKnRecognizeEnSpeak = Boolean(
      recognizeKannadaSpeakEnglish === true ||
      language === 'kn_recognize_en_speak'
    );
    const result = await ConversationService.processTurn({ 
      message, 
      leadId, 
      productId, 
      imageUrl, 
      history, 
      language: (language === 'kn_recognize_en_speak' || language === 'auto') ? null : language, 
      speakLanguage: isKnRecognizeEnSpeak ? 'en' : speakLanguage, 
      recognizeKannadaSpeakEnglish: isKnRecognizeEnSpeak
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[VoiceChat] Error processing turn:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/voice/transcribe', async (req, res) => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio) return res.status(400).json({ success: false, error: 'Audio content is required.' });
    const transcript = await GeminiService.transcribeAudio(audio, mimeType);
    res.json({ success: true, transcript });
  } catch (err) {
    console.error('[VoiceTranscribe] Error:', err.message);
    res.json({ 
      success: false, 
      error: err.message,
      transcript: null,
      fallbackSuggestion: "Voice recognition service unavailable. Please speak into the browser mic or type below."
    });
  }
});

/**
 * DATABASE STATUS & HEALTH ENDPOINT
 * Exposes MongoDB connection status, database name, and live collection document counts
 */
router.get('/db/status', async (req, res) => {
  try {
    const status = await db.getDbStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * LIVE DBMS VERIFICATION & HEALTH ENDPOINT
 * Performs end-to-end CRUD roundtrip test directly against DBMS (MongoDB)
 */
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

router.post('/db/sync', async (req, res) => {
  try {
    db.saveProductsFile();
    db.persist();
    if (db.mongoConnected) {
      await db.persistToMongo();
    }
    res.json({ success: true, message: 'All in-memory store synchronized to MongoDB and JSON files successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PHOTO / ASSET UPLOAD ENDPOINT
 * Accepts base64 encoded photo and persists to public/uploads
 */
router.post('/upload', (req, res) => {
  try {
    const { image, photo, data, prefix = 'product' } = req.body;
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
    console.error('[ApiRoute] Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET ALL CATEGORIES WITH PRODUCT COUNTS
 */
router.get('/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 1. GET ALL PRODUCTS
 */
router.get('/products', (req, res) => {
  const { category, search } = req.query;
  const products = db.searchProducts(search, category);
  res.json({ success: true, count: products.length, products });
});

/**
 * 1A. POST CREATE NEW PRODUCT (WITH CATEGORY AND PHOTO UPLOAD)
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
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, error: 'Product category is required.' });
    }

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
      message: `Product '${product.name}' created and saved to DBMS successfully!`,
      product
    });
  } catch (err) {
    console.error('[ApiRoute] Error creating product:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 1B. PUT UPDATE PRODUCT
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
      return res.status(404).json({ success: false, error: `Product ${id} not found.` });
    }

    res.json({
      success: true,
      message: `Product ${id} updated successfully in DBMS.`,
      product: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 1C. DELETE PRODUCT
 */
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: `Product ${id} not found.` });
    }

    res.json({
      success: true,
      message: `Product ${id} removed successfully from DBMS.`,
      id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. GET SINGLE PRODUCT
 */
router.get('/products/:id', async (req, res) => {
  const product = await db.getProductByIdAsync(req.params.id) || db.findProductByQuery(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, product });
});

/**
 * 2A. GET DYNAMIC SUGGESTED QUESTIONS FOR PRODUCT
 * Generates 5–8 natural customer questions dynamically from the verified dataset of the product.
 */
router.get('/products/:id/suggested-questions', (req, res) => {
  const product = db.getProductById(req.params.id) || db.findProductByQuery(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  const language = req.query.language || req.query.lang || 'en';
  const { stage, purchaseIntent } = req.query;
  const questions = SuggestedQuestionService.generateSuggestedQuestions(product, {
    language,
    stage: stage || null,
    purchaseIntent: purchaseIntent ? { hasPurchaseIntent: purchaseIntent === 'true' || purchaseIntent === 'high' } : null
  });
  const detectedStage = stage || SuggestedQuestionService.detectConversationStage([], new Set(), purchaseIntent ? { hasPurchaseIntent: purchaseIntent === 'true' || purchaseIntent === 'high' } : { hasPurchaseIntent: false });
  res.json({
    success: true,
    productId: product.id,
    productName: product.name,
    category: product.category,
    language,
    stage: detectedStage,
    count: questions.length,
    suggestedQuestions: questions
  });
});

/**
 * 2A-2. POST DYNAMIC SUGGESTED QUESTIONS WITH CONVERSATION CONTEXT
 * Returns dynamic suggestions given conversational history, latest message, and language.
 */
router.post('/products/:id/suggested-questions', (req, res) => {
  const product = db.getProductById(req.params.id) || db.findProductByQuery(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  const { history = [], message = '', reply = '', language = 'en', stage = null, purchaseIntent = null } = req.body;
  const questions = SuggestedQuestionService.generateSuggestedQuestions(product, {
    history,
    latestMessage: message,
    latestReply: reply,
    language,
    stage,
    purchaseIntent
  });
  const discussedTopics = SuggestedQuestionService.extractDiscussedTopics(history, message, reply);
  const pIntent = purchaseIntent || SuggestedQuestionService.detectPurchaseIntent(history, message);
  const detectedStage = stage || SuggestedQuestionService.detectConversationStage(history, discussedTopics, pIntent);
  res.json({
    success: true,
    productId: product.id,
    productName: product.name,
    category: product.category,
    language,
    stage: detectedStage,
    count: questions.length,
    suggestedQuestions: questions
  });
});

/**
 * 2B. GET STORE LOCATION & FULFILLMENT HUB DETAILS
 */
router.get('/store/location', (req, res) => {
  const store = db.getStoreLocation();
  res.json({ success: true, store });
});

/**
 * 3. LEAD INTAKE ENDPOINT (Instagram "Enquire Now" submission)
 * Customer clicks link on Instagram Reel/Post -> submits mobile enquiry form
 */
router.post('/leads/enquire', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      email,
      productId,
      initialEnquiry,
      socialMediaSource = 'instagram',
      campaign = 'reels_organic',
      triggerCallImmediately = true
    } = req.body;

    // Validation
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ success: false, error: 'Customer name is required.' });
    }

    const sanitizedPhone = VoiceCallService.sanitizePhoneNumber(phone);
    if (!sanitizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid phone number with country code (e.g. +1234567890 or 10-digit number).'
      });
    }

    // Identify product
    let product = null;
    if (productId) product = db.getProductById(productId);
    if (!product && initialEnquiry) product = db.findProductByQuery(initialEnquiry);

    const productName = product ? product.name : (req.body.productName || 'General Store Enquiry');
    const finalProductId = product ? product.id : (productId || null);

    // Check duplicate lead within 24 hours
    const duplicate = db.findDuplicateLead(sanitizedPhone, finalProductId, 24);
    if (duplicate) {
      console.log(`[LeadIntake] Existing lead found for ${sanitizedPhone} within 24h: ${duplicate.id}`);
      return res.json({
        success: true,
        isDuplicate: true,
        message: `Welcome back, ${customerName}! We already have your active enquiry for ${productName}. Our AI assistant will connect with you shortly.`,
        lead: duplicate
      });
    }

    // Compute initial lead score based on enquiry message
    const initialScoreResult = LeadScoringEngine.scoreInitialEnquiry(initialEnquiry || '');

    // Create lead in database
    const lead = db.createLead({
      customerName,
      phone: sanitizedPhone,
      email,
      socialMediaSource,
      campaign,
      productId: finalProductId,
      productName,
      initialEnquiry: initialEnquiry || 'Expressed interest from Instagram product post',
      leadStatus: 'New Lead',
      leadScore: initialScoreResult.leadScore,
      scoreNumerical: initialScoreResult.score
    });

    // Synchronize to Google Sheets
    await GoogleSheetsService.syncLead(lead);

    // Notify n8n Webhook if configured
    const n8nWebhookUrl = process.env.N8N_LEAD_WEBHOOK_URL;
    if (n8nWebhookUrl && n8nWebhookUrl !== 'http://localhost:5678/webhook/lead-intake') {
      try {
        fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'LEAD_CREATED', lead, product })
        }).catch(err => console.warn('[n8n] Async webhook delivery warning:', err.message));
      } catch (e) {
        console.warn('[n8n] Error forwarding to n8n webhook:', e.message);
      }
    }

    // Trigger AI Outbound Voice Call if requested
    let callResponse = null;
    if (triggerCallImmediately) {
      try {
        callResponse = await VoiceCallService.triggerOutboundCall({
          leadId: lead.id,
          customerName: lead.customerName,
          phone: lead.phone,
          productName: lead.productName,
          initialEnquiry: lead.initialEnquiry
        });
      } catch (callErr) {
        console.warn('[LeadIntake] Outbound call dispatch error:', callErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Enquiry received! Our AI Shopping Assistant will call you at ${sanitizedPhone} in a few moments.`,
      lead,
      call: callResponse
    });
  } catch (err) {
    console.error('[LeadIntake] Internal error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error processing enquiry' });
  }
});

/**
 * 4. TRIGGER AI OUTBOUND CALL (Bolna AI Voice Agent)
 */
router.post('/calls/trigger', async (req, res) => {
  try {
    const {
      leadId,
      phone,
      customerName,
      productName,
      initialEnquiry,
      language = 'kn',
      consent = true,
      agentId,
      apiKey,
      fromPhoneNumber,
      customGreeting
    } = req.body;

    let targetLeadId = leadId;

    if (!targetLeadId) {
      // Create quick ad-hoc lead
      const lead = db.createLead({
        customerName: customerName || 'Valued Caller',
        phone: phone || '+919876543210',
        productName: productName || 'Store Featured Collection',
        initialEnquiry: initialEnquiry || 'Manual Bolna voice call demo'
      });
      targetLeadId = lead.id;
    }

    const callResult = await VoiceCallService.triggerOutboundCall({
      leadId: targetLeadId,
      customerName,
      phone,
      productName,
      initialEnquiry,
      language,
      consent,
      agentId,
      apiKey,
      fromPhoneNumber,
      customGreeting
    });

    res.json(callResult);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4A-1. GET BOLNA AI CONFIGURATION STATUS
 */
router.get('/settings/bolna', (req, res) => {
  try {
    const config = VoiceCallService.getBolnaConfig();
    res.json({ success: true, ...config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy alias
router.get('/settings/twilio', (req, res) => {
  const config = VoiceCallService.getBolnaConfig();
  res.json({ success: true, ...config });
});

/**
 * 4A-2. POST UPDATE BOLNA AI CREDENTIALS
 */
router.post('/settings/bolna', async (req, res) => {
  try {
    const { apiKey, agentId, fromPhoneNumber, defaultCountryCode, baseUrl } = req.body;
    const result = await VoiceCallService.updateBolnaConfig({
      apiKey,
      agentId,
      fromPhoneNumber,
      defaultCountryCode,
      baseUrl
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Legacy alias
router.post('/settings/twilio', async (req, res) => {
  try {
    const { apiKey, agentId, fromPhoneNumber, defaultCountryCode, baseUrl } = req.body;
    const result = await VoiceCallService.updateBolnaConfig({
      apiKey,
      agentId,
      fromPhoneNumber,
      defaultCountryCode,
      baseUrl
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 4A-3. POST LIVE TEST BOLNA CALL
 */
router.post('/calls/test-bolna', async (req, res) => {
  try {
    const {
      phone,
      customerName = 'Store Customer',
      productName = 'TrendVibe Featured Item',
      language = 'kn',
      consent = true,
      agentId,
      apiKey,
      fromPhoneNumber
    } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Customer phone number is required to initiate call.' });
    }

    const result = await VoiceCallService.triggerOutboundCall({
      customerName,
      phone,
      productName,
      initialEnquiry: 'Testing automated phone call integration via Bolna AI',
      language,
      consent,
      agentId,
      apiKey,
      fromPhoneNumber
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy alias
router.post('/calls/test-twilio', async (req, res) => {
  try {
    const { phone, customerName = 'Store Customer', productName = 'TrendVibe Featured Item' } = req.body;
    const result = await VoiceCallService.triggerOutboundCall({
      customerName,
      phone,
      productName,
      initialEnquiry: 'Testing automated phone call integration via Bolna AI'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4A-4. GET BOLNA EXECUTION STATUS (Poll Call Outcome)
 */
router.get('/calls/:executionId/status', async (req, res) => {
  try {
    const { executionId } = req.params;
    const status = await VoiceCallService.getExecutionStatus(executionId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4B. PRODUCT-AWARE GREETING API
 * Returns dynamic, category-specific product greeting for a given product and customer.
 */
router.get('/conversation/greeting', (req, res) => {
  try {
    const { productId, customerName, language } = req.query;
    const product = productId ? db.getProductById(productId) : null;
    const greeting = ConversationService.generateProductAwareGreeting({
      product,
      customerName,
      language: language || 'en'
    });
    res.json({ success: true, greeting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. POST-CALL WEBHOOK (Receives transcript from ElevenLabs Conversational AI or Simulator)
 */
router.post('/webhooks/post-call', async (req, res) => {
  try {
    const {
      conversationId,
      callSid,
      leadId,
      transcript,
      durationSeconds,
      callStatus = 'completed'
    } = req.body;

    if (!transcript) {
      return res.status(400).json({ success: false, error: 'Transcript content is required.' });
    }

    // Find lead
    let lead = leadId ? db.getLeadById(leadId) : null;
    if (!lead && conversationId) {
      const call = db.getCallByConversationId(conversationId);
      if (call) lead = db.getLeadById(call.leadId);
    }
    if (!lead) {
      // Fallback lead
      lead = db.createLead({
        customerName: req.body.customerName || 'Voice Caller',
        phone: req.body.phone || '+15559876543',
        productName: req.body.productName || 'Instagram Enquired Product',
        initialEnquiry: 'Voice Call Enquiry'
      });
    }

    // 1. Analyze Transcript using Gemini
    const analysis = await GeminiService.analyzeTranscript(transcript, {
      customerName: lead.customerName,
      phone: lead.phone,
      productName: lead.productName,
      initialEnquiry: lead.initialEnquiry
    });

    // 2. Create Conversation Record
    const conversation = db.createConversation({
      leadId: lead.id,
      conversationId: conversationId || `conv_${Date.now()}`,
      fullTranscript: transcript,
      summary: analysis.summary,
      customerIntent: analysis.purchaseIntent,
      purchaseIntent: analysis.purchaseIntent,
      sentiment: analysis.customerSentiment,
      extractedRequirements: analysis.requestedSpecs,
      unresolvedQuestions: analysis.unresolvedQuestions,
      humanHandoff: analysis.humanHandoff,
      humanHandoffReason: analysis.humanHandoffReason,
      geminiAnalysisRaw: analysis
    });

    // 3. Update Lead Status and Score
    const leadUpdates = {
      leadStatus: analysis.orderPlaced ? 'Converted' : (analysis.humanHandoff ? 'Follow-up Needed' : 'Call Completed'),
      leadScore: analysis.leadScore,
      scoreNumerical: analysis.scoreNumerical
    };
    db.updateLead(lead.id, leadUpdates);

    // 4. Update Call Record if conversationId or callSid provided
    if (conversationId || callSid) {
      const allCalls = db.getAllCalls();
      const matchingCall = allCalls.find(c => c.conversationId === conversationId || c.callSid === callSid || c.leadId === lead.id);
      if (matchingCall) {
        db.updateCall(matchingCall.id, {
          callEnd: new Date().toISOString(),
          durationSeconds: durationSeconds || 120,
          callStatus
        });
      }
    }

    // 5. Synchronize with Google Sheets
    await GoogleSheetsService.syncConversation(conversation);

    // 6. Forward to n8n Post-Call Webhook if configured
    const n8nPostCallUrl = process.env.N8N_POST_CALL_WEBHOOK_URL;
    if (n8nPostCallUrl && n8nPostCallUrl !== 'http://localhost:5678/webhook/post-call') {
      try {
        fetch(n8nPostCallUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'CALL_COMPLETED', conversation, analysis, lead })
        }).catch(e => console.warn('[n8n] Error forwarding post-call to n8n:', e.message));
      } catch (err) {
        console.warn('[n8n] Async post-call webhook warning:', err.message);
      }
    }

    res.json({
      success: true,
      message: 'Post-call transcript analyzed and stored successfully.',
      leadId: lead.id,
      analysis,
      conversationId: conversation.id
    });
  } catch (err) {
    console.error('[PostCallWebhook] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. GET ALL LEADS
 */
router.get('/leads', (req, res) => {
  res.json({ success: true, leads: db.getAllLeads() });
});

/**
 * 7. GET ALL CALLS
 */
router.get('/calls', (req, res) => {
  res.json({ success: true, calls: db.getAllCalls() });
});

/**
 * 8. GET ALL CONVERSATIONS
 */
router.get('/conversations', (req, res) => {
  res.json({ success: true, conversations: db.getAllConversations() });
});

/**
 * 9. GET ALL ORDERS
 */
router.get('/orders', (req, res) => {
  res.json({ success: true, orders: db.getAllOrders() });
});

/**
 * 10. GET ALL FOLLOW-UPS
 */
router.get('/followups', (req, res) => {
  res.json({ success: true, followups: db.getAllFollowups() });
});

/**
 * 11. GET LIVE GOOGLE SHEETS STRUCTURE & DATA
 */
router.get('/sheets/data', (req, res) => {
  const sheets = GoogleSheetsService.exportSheetsSnapshot();
  res.json({ success: true, sheets });
});

/**
 * 12. FLIPKART / MEESHO STYLE CUSTOMER ACCOUNT & DELIVERY ADDRESS INTAKE
 * Saves full delivery address, creates or updates customer account,
 * and links with confirmed order.
 */
router.post('/customer/address-and-account', (req, res) => {
  try {
    const {
      orderId,
      fullName,
      mobile,
      email,
      pincode,
      houseNo,
      area,
      landmark,
      city,
      state,
      addressType
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    const cleanPhone = (mobile || '').toString().replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit mobile number is required.' });
    }
    const emailVal = (email && email.includes('@'))
      ? email.trim().toLowerCase()
      : `customer_${cleanPhone}@trendvibe.in`;
    const pinVal = (pincode && pincode.toString().replace(/\D/g, '').length === 6)
      ? pincode.toString().replace(/\D/g, '')
      : '560038';
    const houseNoVal = (houseNo || 'House / Flat Details').trim();
    const areaVal = (area || 'Main Area').trim();
    const cityVal = (city || 'Bengaluru').trim();
    const stateVal = (state || 'Karnataka').trim();

    const customer = db.createOrUpdateCustomer({
      fullName: fullName.trim(),
      mobile: cleanPhone,
      email: emailVal,
      pincode: pinVal,
      houseNo: houseNoVal,
      area: areaVal,
      landmark: (landmark || '').trim(),
      city: cityVal,
      state: stateVal,
      addressType: addressType || 'Home',
      orderId: orderId || null
    });

    let order = orderId ? db.getOrderById(orderId) : null;
    if (!order && orderId) {
      order = db.getAllOrders().find(o => o.id.toLowerCase() === orderId.toLowerCase());
      if (!order) {
        order = db.createOrder({
          id: orderId,
          customerId: customer.id,
          customerName: customer.fullName,
          customerMobile: cleanPhone,
          customerEmail: emailVal,
          productName: req.body.productName || 'TrendVibe Store Order',
          totalAmount: req.body.totalAmount ? (Number(req.body.totalAmount.toString().replace(/[^0-9.]/g, '')) || 0) : 0,
          paymentMethod: 'Cash on Delivery (COD)',
          shippingAddress: `${houseNoVal}, ${areaVal}, ${cityVal}, ${stateVal} - ${pinVal} (${addressType || 'Home'})`,
          shippingDetails: customer.address,
          orderStatus: 'Confirmed'
        });
      }
    }

    if (order) {
      order.customerId = customer.id;
      order.customerName = customer.fullName;
      order.customerMobile = cleanPhone;
      order.customerEmail = emailVal;
      order.shippingAddress = `${houseNoVal}, ${areaVal}, ${cityVal}, ${stateVal} - ${pinVal} (${addressType || 'Home'})`;
      order.shippingDetails = customer.address;
      if (!customer.orders.includes(order.id)) {
        customer.orders.push(order.id);
      }
      db.persist();
    }

    res.json({
      success: true,
      message: 'Customer delivery address and account saved successfully!',
      customer,
      order
    });
  } catch (err) {
    console.error('[CustomerAddress] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 13. CUSTOMER LOGIN (Via Mobile Number or Gmail)
 * Seamless Meesho/Flipkart mobile-first customer login.
 */
router.post('/customer/login', (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter your Mobile Number or Gmail address.' });
    }

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');
    const cleanPhone = trimmed.replace(/\D/g, '').slice(-10);

    let customer = null;
    if (isEmail) {
      customer = db.getCustomerByEmail(trimmed);
    } else if (cleanPhone.length >= 10) {
      customer = db.getCustomerByMobile(cleanPhone);
    }

    // Find all orders associated with this phone or email
    const allOrders = db.getAllOrders();
    const customerOrders = allOrders.filter(o => {
      const orderPhone = (o.customerMobile || o.phone || '').replace(/\D/g, '').slice(-10);
      const orderEmail = (o.customerEmail || o.email || '').toLowerCase();
      if (customer && o.customerId === customer.id) return true;
      if (customer && customer.orders && customer.orders.includes(o.id)) return true;
      if (cleanPhone && orderPhone === cleanPhone) return true;
      if (isEmail && orderEmail === trimmed.toLowerCase()) return true;
      return false;
    });

    if (!customer && customerOrders.length === 0) {
      // Create fresh customer session
      const newCust = db.createOrUpdateCustomer({
        fullName: isEmail ? trimmed.split('@')[0] : `Customer ${cleanPhone.slice(-4)}`,
        mobile: isEmail ? '' : cleanPhone,
        email: isEmail ? trimmed : `customer_${cleanPhone}@trendvibe.in`,
      });
      return res.json({
        success: true,
        message: 'Customer account created and logged in.',
        customer: newCust,
        orders: []
      });
    }

    res.json({
      success: true,
      message: 'Logged in successfully.',
      customer: customer || {
        fullName: customerOrders[0]?.customerName || 'Customer',
        mobile: cleanPhone,
        email: isEmail ? trimmed : '',
        address: customerOrders[0]?.shippingDetails || null
      },
      orders: customerOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 14. GET CUSTOMER ORDERS & LIVE SHIPMENT TRACKING
 */
router.get('/customer/orders', (req, res) => {
  try {
    const { mobile, email, customerId } = req.query;
    const cleanPhone = mobile ? mobile.replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    const orders = db.getAllOrders().filter(o => {
      const oPhone = (o.customerMobile || o.phone || '').replace(/\D/g, '').slice(-10);
      const oEmail = (o.customerEmail || o.email || '').toLowerCase();
      if (customerId && o.customerId === customerId) return true;
      if (cleanPhone && oPhone === cleanPhone) return true;
      if (cleanEmail && oEmail === cleanEmail) return true;
      return false;
    });

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 15. CUSTOMER ORDER ENQUIRY SUBMISSION
 * Lets customers enquire about a specific order directly from their account.
 */
router.post('/customer/order-enquiry', (req, res) => {
  try {
    const { orderId, customerName, mobile, email, enquiryType, message } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required to submit an order enquiry.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter your question or enquiry message.' });
    }

    const enquiry = db.createOrderEnquiry({
      orderId,
      customerName,
      mobile,
      email,
      enquiryType: enquiryType || 'Order Tracking Enquiry',
      message: message.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Your enquiry has been received! Our support team and Zyro AI will update your order timeline shortly.',
      enquiry
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 16. GET ALL ORDER ENQUIRIES (For Seller Dashboard & Customer)
 */
router.get('/customer/order-enquiries', (req, res) => {
  const { orderId } = req.query;
  const enquiries = db.getOrderEnquiries(orderId);
  res.json({ success: true, count: enquiries.length, enquiries });
});

/**
 * 17. ZYRO AI — AUTOMATIC KNOWLEDGE RETRIEVAL & REUSABLE VERIFIED FACTS ENDPOINTS
 */
router.get('/products/:id/verified-facts', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found in TrendVibe Store catalog.' });
  }
  const facts = db.getVerifiedFactsByProduct(product.id);
  res.json({
    success: true,
    productId: product.id,
    productName: product.name,
    count: facts.length,
    verifiedFacts: facts
  });
});

router.get('/knowledge/verified-facts', (req, res) => {
  const facts = db.getAllVerifiedFacts();
  res.json({
    success: true,
    count: facts.length,
    verifiedFacts: facts
  });
});

router.post('/knowledge/retrieve', async (req, res) => {
  try {
    const { question, productId, language = 'en', forceRecheck = false, maxAgeHours = 168 } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, error: 'Customer question is required.' });
    }
    const result = await AutomaticKnowledgeRetrievalService.retrieveAndAnswer({
      question,
      productId,
      language,
      forceRecheck: Boolean(forceRecheck),
      maxAgeHours: Number(maxAgeHours) || 168
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

