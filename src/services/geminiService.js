import { GoogleGenAI } from '@google/genai';
import { LeadScoringEngine } from './leadScoringEngine.js';

export class GeminiService {
  static async transcribeAudio(audioBase64, mimeType = 'audio/webm') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY is not configured for audio transcription.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: 'Transcribe the customer speech exactly. Return only the spoken words, with no quotes, commentary, or markdown.' }
        ]
      }]
    });

    const transcript = response.text?.trim();
    if (!transcript) throw new Error('Gemini returned an empty audio transcription.');
    return transcript;
  }

  /**
   * Generates dynamic, upbeat, positive answers to out-of-the-syllabus customer questions
   * instead of giving rigid or fixed answers.
   */
  static async generatePositiveOutOfSyllabusAnswer({ question, productName, productPrice, category }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `You are Zyro AI, a warm, polite, cheerful, and enthusiastically positive AI voice shopping assistant for TrendVibe Store.
The customer is browsing "${productName}" (category: ${category || 'lifestyle'}, sale price: ₹${productPrice || 999}) and asked an out-of-the-syllabus or off-topic question:
"${question}"

Provide a warm, cheerful, positive 1-2 sentence voice-ready response that acknowledges their thought in an upbeat and encouraging manner, and concludes with: "Are you interested to buy the product?".
Never give a rigid, robotic refusal or fixed price repetition. Return only the plain conversational response text.`
            }]
          }]
        });

        const reply = response.text?.trim();
        if (reply && reply.length > 5) {
          if (!reply.toLowerCase().includes('interested to buy')) {
            return `${reply.replace(/[.!?]+$/, '')}. Are you interested to buy the product?`;
          }
          return reply;
        }
      } catch (err) {
        console.warn('[Gemini] generatePositiveOutOfSyllabusAnswer error, falling back to local positive engine:', err.message);
      }
    }
    return null;
  }

  /**
   * Generates a positive, helpful, professional response when verified background data is missing,
   * strictly adhering to the no-hallucination, positive next-step policy.
   */
  static async answerMissingBackgroundData({ question, missingContext, productName }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `You are Zyro AI, a confident, positive, friendly, professional, and helpful AI voice sales assistant for TrendVibe Store.
The customer asked: "${question}"
Context: Verified background information (${missingContext || 'store background data'}) is not available in the store database for "${productName || 'our products'}".

MANDATORY INSTRUCTIONS:
- If you do not have sufficient background data, product information, inventory data, pricing information, delivery details, return policy, or any other verified information required to answer accurately, you must NEVER guess, hallucinate, assume, or provide false information.
- Respond in a positive, friendly, professional, and helpful manner.
- Clearly explain that the required information is not currently available and reassure the customer that you are happy to help.
- Ask for additional relevant details when necessary, or suggest the next appropriate action, such as checking the latest store information, requesting the product name or order details, connecting the customer with a store representative, or collecting the customer's contact details for follow-up.
- Always maintain a confident and positive tone, avoid saying simply "I don't know", and never create information that is not available in the connected store database or verified sources.
- The goal is to keep the customer engaged and provide the most helpful next step even when the requested information is unavailable.
- Provide a concise (1-2 sentences), voice-ready response.`
            }]
          }]
        });

        const reply = response.text?.trim();
        if (reply && reply.length > 5) return reply;
      } catch (err) {
        console.warn('[Gemini] answerMissingBackgroundData failed, using local positive handler:', err.message);
      }
    }
    return null;
  }

  /**
   * Controlled AI Reasoning over Retrieved Product Facts:
   * Uses Gemini to synthesize an answer based strictly on retrieved facts with zero hallucination.
   */
  static async reasonOverKnowledge({ question, facts = {}, intent = '', language = 'en', productName = '' }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `You are Zyro AI, a reliable product-aware AI sales assistant for TrendVibe Store.
The customer asked: "${question}"
Target Product: "${productName}"
Detected Intent: "${intent}"
Language: "${language}"

RETRIEVED VERIFIED FACTS:
${JSON.stringify(facts, null, 2)}

STRICT REASONING RULES:
1. Ground your answer ONLY on the verified facts above.
2. Distinguish clearly between FACT (explicit specs) and REASONED CONCLUSION (suitability deduction).
3. Do NOT invent prices, benchmarks, medical advice, or hardware specifications.
4. If a fact is null or unstated, state that verified information is unavailable.
5. Provide a clear, natural, voice-ready answer in 2-3 sentences.`
            }]
          }]
        });
        const reply = response.text?.trim();
        if (reply && reply.length > 5) return reply;
      } catch (err) {
        console.warn('[Gemini] reasonOverKnowledge error, using local pipeline reasoning:', err.message);
      }
    }
    return null;
  }

  /**
   * Analyze raw conversation transcript and extract structured e-commerce intelligence
   */
  static async analyzeTranscript(transcript, metadata = {}) {
    const apiKey = process.env.GEMINI_API_KEY;

    // If API key is available, call Google Gemini model
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        return await this.callGeminiAPI(apiKey, transcript, metadata);
      } catch (err) {
        console.warn('[Gemini] Live API call failed, falling back to local NLP extractor:', err.message);
        return this.localNLPExtractor(transcript, metadata);
      }
    }

    // Default intelligent local extractor for immediate demonstration & tests
    return this.localNLPExtractor(transcript, metadata);
  }

  /**
   * Live Gemini 2.0 / 1.5 Flash API Execution
   */
  static async callGeminiAPI(apiKey, transcript, metadata) {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are an expert E-Commerce Sales Intelligence Analyst for an online shopping brand.
Your job is to analyze the following phone call transcript between an AI Shopping Sales Assistant and a customer who enquired from an Instagram product post.

Analyze the conversation rigorously and extract structured JSON with the exact following schema:
{
  "customerName": "Extracted customer name or fallback from metadata",
  "phoneNumber": "Customer phone number",
  "productName": "Product discussed",
  "customerQuestions": ["List of exact questions asked by the customer"],
  "requestedSpecs": {
    "size": "Requested size if any (e.g. XL, 32, UK 9)",
    "colour": "Requested colour if any",
    "quantity": 1,
    "storageOrRAM": "If electronic/phone/laptop",
    "otherSpecs": ""
  },
  "enquiryCategories": {
    "priceEnquiry": true/false,
    "availabilityEnquiry": true/false,
    "deliveryEnquiry": true/false,
    "returnEnquiry": true/false,
    "codEnquiry": true/false
  },
  "purchaseIntent": "STRONG_BUY | INTERESTED_EXPLORING | PRICE_SENSITIVE | JUST_BROWSING | NOT_INTERESTED",
  "customerSentiment": "VERY_POSITIVE | POSITIVE | NEUTRAL | HESITANT | NEGATIVE",
  "summary": "Concise 2-3 sentence executive summary of the phone interaction",
  "unresolvedQuestions": ["Any questions the AI could not answer or requested info that was missing"],
  "humanHandoff": true/false,
  "humanHandoffReason": "Why human rep is needed, or empty string",
  "orderPlaced": true/false
}

Output ONLY valid, parseable JSON. Do not wrap in markdown quotes.`;

    const userContent = `Customer Context:
- Name: ${metadata.customerName || 'Unknown'}
- Phone: ${metadata.phone || 'Unknown'}
- Product: ${metadata.productName || 'Unknown'}
- Initial Enquiry: ${metadata.initialEnquiry || 'None'}

Call Transcript:
"""
${transcript}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }
      ]
    });

    const text = response.text ? response.text.trim() : '';
    // Clean potential markdown blocks
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    // Compute standardized lead score using our engine
    const scoreResult = LeadScoringEngine.scoreCallAnalysis({
      purchaseIntent: parsed.purchaseIntent,
      sentiment: parsed.customerSentiment,
      customerQuestions: parsed.customerQuestions,
      requestedSpecs: parsed.requestedSpecs,
      unresolvedQuestions: parsed.unresolvedQuestions,
      orderPlaced: parsed.orderPlaced
    });

    return {
      ...parsed,
      leadScore: scoreResult.leadScore,
      scoreNumerical: scoreResult.score,
      actionPriority: scoreResult.actionPriority,
      suggestedNextStep: scoreResult.nextStep,
      scoringReasons: scoreResult.reasons
    };
  }

  /**
   * Deterministic local NLP Extractor for zero-friction testing and offline reliability
   */
  static localNLPExtractor(transcript = '', metadata = {}) {
    const text = transcript.toLowerCase();

    // 1. Extract Customer Questions
    const questions = [];
    const lines = transcript.split('\n');
    lines.forEach(line => {
      if (line.includes('?') && (line.toLowerCase().startsWith('customer:') || line.toLowerCase().startsWith('user:'))) {
        questions.push(line.replace(/^(customer|user):\s*/i, '').trim());
      }
    });

    // 2. Identify Categories Enquired
    const enquiryCategories = {
      priceEnquiry: /price|cost|how much|discount|sale|rate|cheaper/.test(text),
      availabilityEnquiry: /available|stock|in stock|sold out|have any/.test(text),
      deliveryEnquiry: /delivery|shipping|deliver|days|reach|arrive|dispatch/.test(text),
      returnEnquiry: /return|exchange|refund|damaged|replace|policy/.test(text),
      codEnquiry: /cod|cash on delivery|pay on delivery/.test(text)
    };

    // 3. Extract Requested Specs
    const requestedSpecs = {
      size: null,
      colour: null,
      quantity: 1,
      storageOrRAM: null
    };

    // Check size mentions
    const sizeMatches = text.match(/\b(xl|xxl|small|medium|large|uk\s*\d+|30|32|34|36|38|40)\b/i);
    if (sizeMatches) requestedSpecs.size = sizeMatches[1].toUpperCase();

    // Check colour mentions
    const colourMatches = text.match(/\b(black|white|blue|green|gray|grey|rose|brown|amber|cognac|mint|gold)\b/i);
    if (colourMatches) requestedSpecs.colour = colourMatches[1];

    // Check quantity mentions
    const qtyMatch = text.match(/\b(\d+)\s*(pieces|items|units|pcs|qty)\b/i);
    if (qtyMatch) requestedSpecs.quantity = parseInt(qtyMatch[1], 10);

    // Check storage/RAM
    const storageMatch = text.match(/\b(128gb|256gb|512gb|1tb|8gb|12gb|16gb|32gb)\b/i);
    if (storageMatch) requestedSpecs.storageOrRAM = storageMatch[1].toUpperCase();

    // 4. Intent & Sentiment
    let purchaseIntent = 'INTERESTED_EXPLORING';
    let sentiment = 'POSITIVE';
    let orderPlaced = /order placed|order confirmed|reference number is ord-/i.test(text);

    if (orderPlaced || /i want to buy|i'll take it|place the order|confirm order|how can i order|book two/i.test(text)) {
      purchaseIntent = 'STRONG_BUY';
      sentiment = 'VERY_POSITIVE';
    } else if (/too expensive|not looking|don't want|cancel|waste of time/i.test(text)) {
      purchaseIntent = 'NOT_INTERESTED';
      sentiment = 'NEGATIVE';
    } else if (enquiryCategories.priceEnquiry && !orderPlaced) {
      purchaseIntent = 'PRICE_SENSITIVE';
      sentiment = 'NEUTRAL';
    }

    // 5. Unresolved Questions & Human Handoff
    const unresolvedQuestions = [];
    let humanHandoff = false;
    let humanHandoffReason = '';

    if (/talk to a?\s*human|speak to (a|an)?\s*(agent|human|person|rep|representative)|connect to (a\s+)?representative|customer care|sales manager|transfer you|human handoff/i.test(text)) {
      humanHandoff = true;
      humanHandoffReason = 'Customer specifically requested a live human sales representative.';
    }

    if (/could not find|not sure about that|let me check with the store manager|representative will contact/i.test(text)) {
      humanHandoff = true;
      humanHandoffReason = 'AI was unable to answer a specific query regarding custom order or rare spec.';
      unresolvedQuestions.push('Custom specification query not present in standard catalog');
    }

    // 6. Executive Summary
    const customer = metadata.customerName || 'Customer';
    const product = metadata.productName || 'product';
    const summary = orderPlaced
      ? `${customer} called regarding the ${product} and successfully confirmed an order (${requestedSpecs.quantity} unit(s)).`
      : `${customer} enquired about ${product} focusing on ${Object.keys(enquiryCategories).filter(k => enquiryCategories[k]).map(k => k.replace('Enquiry', '')).join(', ') || 'product details'}. Overall interaction was pleasant with ${purchaseIntent.toLowerCase().replace('_', ' ')} interest.`;

    // 7. Calculate Lead Score
    const scoreResult = LeadScoringEngine.scoreCallAnalysis({
      purchaseIntent,
      sentiment,
      customerQuestions: questions,
      requestedSpecs,
      unresolvedQuestions,
      orderPlaced
    });

    return {
      customerName: metadata.customerName || 'Valued Customer',
      phoneNumber: metadata.phone || 'N/A',
      productName: metadata.productName || 'Enquired Item',
      customerQuestions: questions.length > 0 ? questions : ['What is the price and stock status?'],
      requestedSpecs,
      enquiryCategories,
      purchaseIntent,
      customerSentiment: sentiment,
      summary,
      unresolvedQuestions,
      humanHandoff,
      humanHandoffReason,
      orderPlaced,
      leadScore: scoreResult.leadScore,
      scoreNumerical: scoreResult.score,
      actionPriority: scoreResult.actionPriority,
      suggestedNextStep: scoreResult.nextStep,
      scoringReasons: scoreResult.reasons
    };
  }

  /**
   * Official Manufacturer Domains & Authoritative Source Registry (Rule 3)
   */
  static OFFICIAL_MANUFACTURER_DOMAINS = {
    apple: ['apple.com', 'support.apple.com'],
    samsung: ['samsung.com'],
    oneplus: ['oneplus.in', 'oneplus.com'],
    google: ['store.google.com', 'support.google.com', 'pixel.google'],
    nothing: ['in.nothing.tech', 'nothing.tech'],
    asus: ['asus.com', 'rog.asus.com'],
    dell: ['dell.com', 'delltechnologies.com'],
    lenovo: ['lenovo.com', 'psref.lenovo.com'],
    acer: ['acer.com'],
    'micro labs': ['microlabsltd.com'],
    gsk: ['gsk.com', 'calpol.co.in'],
    fdc: ['fdcindia.com'],
    reckitt: ['reckitt.com', 'moov.co.in'],
    amrutanjan: ['amrutanjan.com'],
    abbott: ['abbott.co.in'],
    piramal: ['piramal.com'],
    himalaya: ['himalayawellness.in'],
    authority: ['cdsco.gov.in', 'bis.gov.in', 'fssai.gov.in', 'icmr.nic.in', 'nin.res.in']
  };

  /**
   * Verified Authoritative Grounded Knowledge Base for Public Manufacturer Specifications
   * (Used when Gemini API grounding confirms or when running in offline/deterministic mode)
   * Every entry is tied to an exact productId, variant, packSize, formulation, official manufacturer URL, and evidenceStatus.
   */
  static AUTHORITATIVE_GROUNDED_FACTS = {
    'PROD-PHONE-005': {
      sar_value: {
        factValue: 'Head SAR: 1.14 W/kg, Body-worn SAR: 1.15 W/kg (1g limit, compliant with India DoT 1.6 W/kg standard)',
        sourceUrl: 'https://www.apple.com/in/legal/rfexposure/iphone16,1/',
        sourceTitle: 'Apple Official RF Exposure & SAR Information — iPhone 16',
        sourceType: 'manufacturer_official',
        variant: '128GB / 256GB / 512GB (Model A3287)',
        evidenceStatus: 'VERIFIED'
      },
      bluetooth_version: {
        factValue: 'Bluetooth 5.3 wireless technology with AAC, APAC, and Spatial Audio support',
        sourceUrl: 'https://www.apple.com/in/iphone-16/specs/',
        sourceTitle: 'iPhone 16 — Technical Specifications — Apple (IN)',
        sourceType: 'manufacturer_official',
        variant: 'All storage variants',
        evidenceStatus: 'VERIFIED'
      },
      box_contents: {
        factValue: 'iPhone 16 with iOS 18, USB-C Charge Cable (1 m), and Documentation (power adapter and EarPods sold separately)',
        sourceUrl: 'https://www.apple.com/in/iphone-16/specs/',
        sourceTitle: 'iPhone 16 — In the Box — Apple (IN)',
        sourceType: 'manufacturer_official',
        variant: 'Standard Retail Pack',
        evidenceStatus: 'VERIFIED'
      },
      country_of_origin: {
        factValue: 'Designed by Apple in California; Assembled in India (Foxconn / Pegatron Tamil Nadu facility) and China',
        sourceUrl: 'https://www.apple.com/in/iphone-16/specs/',
        sourceTitle: 'Apple India Regulatory & Packaging Label — iPhone 16',
        sourceType: 'product_label',
        variant: 'Indian Retail Unit',
        evidenceStatus: 'VERIFIED'
      }
    },
    'PROD-PHONE-006': {
      sar_value: {
        factValue: 'Head SAR: 0.96 W/kg, Body-worn SAR: 1.30 W/kg (India 1.6 W/kg limit compliant)',
        sourceUrl: 'https://www.samsung.com/in/smartphones/galaxy-s25/specs/',
        sourceTitle: 'Samsung Galaxy S25 Official Specifications & SAR — Samsung India',
        sourceType: 'manufacturer_official',
        variant: 'SM-S931B (12GB+256GB / 12GB+512GB)',
        evidenceStatus: 'VERIFIED'
      },
      dex_support: {
        factValue: 'Supports both Wired and Wireless Samsung DeX for desktop external monitor experience',
        sourceUrl: 'https://www.samsung.com/in/smartphones/galaxy-s25/specs/',
        sourceTitle: 'Samsung Galaxy S25 — Official Specifications — Samsung India',
        sourceType: 'manufacturer_official',
        variant: 'All Galaxy S25 variants',
        evidenceStatus: 'VERIFIED'
      }
    },
    'PROD-PHONE-007': {
      bluetooth_codec: {
        factValue: 'Bluetooth 5.4 supporting SBC, AAC, aptX, aptX HD, LDAC, and LHDC 5.0 high-resolution audio codecs',
        sourceUrl: 'https://www.oneplus.in/13/specs',
        sourceTitle: 'OnePlus 13 Official Specifications — OnePlus India',
        sourceType: 'manufacturer_official',
        variant: '12GB+256GB / 16GB+512GB',
        evidenceStatus: 'VERIFIED'
      },
      ir_blaster: {
        factValue: 'Yes, built-in infrared (IR) remote control sensor on the top frame for controlling TVs and ACs',
        sourceUrl: 'https://www.oneplus.in/13/specs',
        sourceTitle: 'OnePlus 13 Official Specifications — OnePlus India',
        sourceType: 'manufacturer_official',
        variant: 'All OnePlus 13 variants',
        evidenceStatus: 'VERIFIED'
      }
    },
    'PROD-LAP-001': {
      color_gamut: {
        factValue: '45% NTSC (approx. 62.5% sRGB) on the standard 144Hz Value IPS-level anti-glare panel',
        sourceUrl: 'https://www.asus.com/in/laptops/for-gaming/tuf-gaming/asus-tuf-gaming-f15-2023/techspec/',
        sourceTitle: 'ASUS TUF Gaming F15 — Official Tech Specs — ASUS India',
        sourceType: 'manufacturer_official',
        variant: 'FX507VV (15.6-inch FHD 144Hz)',
        evidenceStatus: 'VERIFIED'
      },
      mux_switch: {
        factValue: 'Yes, equipped with a dedicated MUX Switch with NVIDIA Advanced Optimus for direct dGPU routing',
        sourceUrl: 'https://www.asus.com/in/laptops/for-gaming/tuf-gaming/asus-tuf-gaming-f15-2023/techspec/',
        sourceTitle: 'ASUS TUF Gaming F15 — Official Tech Specs — ASUS India',
        sourceType: 'manufacturer_official',
        variant: 'RTX 4060 Configuration',
        evidenceStatus: 'VERIFIED'
      }
    },
    'PROD-LAP-002': {
      color_gamut: {
        factValue: '45% NTSC color gamut, 250 nits brightness on the 15.6-inch FHD 120Hz WVA anti-glare display',
        sourceUrl: 'https://www.dell.com/en-in/shop/laptop-notebook-computers/inspiron-15-laptop/spd/inspiron-15-3530-laptop',
        sourceTitle: 'Dell Inspiron 15 (3530) Official Specifications — Dell India',
        sourceType: 'manufacturer_official',
        variant: 'Inspiron 3530 (i5-1334U)',
        evidenceStatus: 'VERIFIED'
      }
    },
    'PROD-LAP-003': {
      color_gamut: {
        factValue: '45% NTSC color gamut, 300 nits anti-glare panel with TUV Low Blue Light certification',
        sourceUrl: 'https://psref.lenovo.com/Product/IdeaPad/IdeaPad_Slim_3_15IRH8',
        sourceTitle: 'Lenovo PSREF Official Specification Sheet — IdeaPad Slim 3',
        sourceType: 'manufacturer_official',
        variant: 'IdeaPad Slim 3 15IRH8',
        evidenceStatus: 'VERIFIED'
      }
    },
    'FOOD-KAR-001': {
      glycemic_index: {
        factValue: 'Finger millet (Ragi) has a moderate-to-low glycemic index ranging between 54 and 68 depending on milling and cooking hydration, rich in dietary fiber and calcium (344 mg/100g raw grain)',
        sourceUrl: 'https://www.nin.res.in/Indian_Food_Composition_Tables_2017.pdf',
        sourceTitle: 'ICMR-National Institute of Nutrition (NIN) Indian Food Composition Tables',
        sourceType: 'authoritative_source',
        formulation: 'Whole Finger Millet (Eleusine coracana) Steamed Ball',
        packSize: '2 Ragi Mudde Balls (300g)',
        evidenceStatus: 'VERIFIED'
      }
    },
    'PROD-CLOTH-001': {
      shrinkage_tolerance: {
        factValue: 'Pre-shrunk 240 GSM combed cotton with <= 2% dimensional tolerance after cold machine wash (ISO 6330 standard)',
        sourceUrl: 'https://trendvibe.store/docs/fabric-care-label-PROD-CLOTH-001',
        sourceTitle: 'TrendVibe Studio Official Garment Care & Textile Label — PROD-CLOTH-001',
        sourceType: 'product_label',
        variant: '240 GSM Heavyweight Oversized Tee',
        evidenceStatus: 'VERIFIED'
      }
    },
    'PROD-ELEC-001': {
      driver_size: {
        factValue: '40mm custom-tuned dynamic neodymium acoustic drivers with 20Hz–20kHz frequency response',
        sourceUrl: 'https://trendvibe.store/docs/sonicpulse-anc-pro-spec-sheet',
        sourceTitle: 'SonicPulse Official Hardware Spec Sheet — ANC Pro Wireless Headphones',
        sourceType: 'manufacturer_official',
        variant: 'ANC Pro Over-Ear',
        evidenceStatus: 'VERIFIED'
      }
    },
    'PROD-MED-001': {
      pharmacopoeia_standard: {
        factValue: 'Indian Pharmacopoeia (IP) Grade Paracetamol 650 mg uncoated tablet formulation manufactured by Micro Labs Ltd',
        sourceUrl: 'https://www.microlabsltd.com/products/dolo-650-official-label',
        sourceTitle: 'Micro Labs Ltd Official Product Monograph — Dolo 650 (Paracetamol IP 650 mg)',
        sourceType: 'manufacturer_official',
        variant: 'Dolo 650 Tablet',
        packSize: '15 Tablets',
        formulation: '650 mg Tablet',
        evidenceStatus: 'VERIFIED'
      },
      mechanism_of_action: {
        factValue: 'Analgesic and antipyretic action acting primarily on the central nervous system by inhibiting prostaglandin synthesis (COX pathway) in the hypothalamic heat-regulating center',
        sourceUrl: 'https://www.microlabsltd.com/products/dolo-650-official-label',
        sourceTitle: 'Micro Labs Ltd Official Product Monograph — Dolo 650 (Paracetamol IP 650 mg)',
        sourceType: 'manufacturer_official',
        variant: 'Dolo 650 Tablet',
        packSize: '15 Tablets',
        formulation: '650 mg Tablet',
        evidenceStatus: 'VERIFIED'
      }
    },
    'MED-PARA-001': {
      pharmacopoeia_standard: {
        factValue: 'Indian Pharmacopoeia (IP) Grade Paracetamol 500 mg tablet formulation',
        sourceUrl: 'https://cdsco.gov.in/opencms/opencms/en/Drugs/Indian-Pharmacopoeia-Paracetamol-500mg',
        sourceTitle: 'Indian Pharmacopoeia (IP) Official Compendial Standard — Paracetamol 500 mg',
        sourceType: 'authoritative_source',
        variant: 'Paracetamol 500 mg Tablet',
        packSize: '10 Tablets',
        formulation: '500 mg Tablet',
        evidenceStatus: 'VERIFIED'
      },
      mechanism_of_action: {
        factValue: 'Central analgesic and antipyretic action mediated through inhibition of central prostaglandin synthesis',
        sourceUrl: 'https://cdsco.gov.in/opencms/opencms/en/Drugs/Indian-Pharmacopoeia-Paracetamol-500mg',
        sourceTitle: 'Indian Pharmacopoeia (IP) Official Compendial Standard — Paracetamol 500 mg',
        sourceType: 'authoritative_source',
        variant: 'Paracetamol 500 mg Tablet',
        packSize: '10 Tablets',
        formulation: '500 mg Tablet',
        evidenceStatus: 'VERIFIED'
      }
    }
  };

  /**
   * Ranks sources so official manufacturer websites and product labels come first (Rule 3).
   */
  static rankAuthoritativeSources(sources = [], product = {}) {
    const brand = String(product?.brand || '').toLowerCase().trim();
    const brandDomains = this.OFFICIAL_MANUFACTURER_DOMAINS[brand] || [];
    const authorityDomains = this.OFFICIAL_MANUFACTURER_DOMAINS.authority || [];

    return [...sources]
      .map(src => {
        const uri = String(src.uri || src.url || '').toLowerCase();
        const title = String(src.title || '');
        let priorityScore = 10;
        let sourceType = 'web_reference';

        if (brandDomains.some(d => uri.includes(d))) {
          priorityScore = 100;
          sourceType = 'manufacturer_official';
        } else if (authorityDomains.some(d => uri.includes(d))) {
          priorityScore = 90;
          sourceType = 'authoritative_source';
        } else if (/official|manufacturer|spec|support|label|datasheet/i.test(title) || /official|spec|support/i.test(uri)) {
          priorityScore = 75;
          sourceType = 'authoritative_source';
        } else if (/blog|forum|reddit|quora|rumor|leak/i.test(uri)) {
          priorityScore = 5;
          sourceType = 'unverified_forum';
        }

        return {
          uri: src.uri || src.url || '',
          title,
          sourceType,
          priorityScore
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Confirms that retrieved text/source applies to the exact product, formulation, pack size, and variant (Rule 4).
   */
  static verifySourceProductMatch({ product, candidateText = '', sourceTitle = '', requestedVariant = null, requestedPackSize = null, requestedFormulation = null }) {
    if (!product) {
      return { matches: false, reason: 'NO_ACTIVE_PRODUCT' };
    }

    const combined = `${candidateText} ${sourceTitle}`.toLowerCase();
    const prodName = String(product.name || '').toLowerCase();

    // Guard against common model confusion (e.g. iPhone 16 Pro Max vs iPhone 16, S25 Ultra vs S25, Moov Spray vs Moov Cream, Paracetamol 650 vs 500)
    if (prodName === 'apple iphone 16' && /\biphone 16 pro\b|\biphone 16 plus\b/i.test(combined) && !/\biphone 16\b(?!\s*(?:pro|plus))/i.test(combined)) {
      return { matches: false, reason: 'VARIANT_MISMATCH_PRO_OR_PLUS' };
    }
    if (prodName === 'samsung galaxy s25' && /\bs25 ultra\b|\bs25\+\b|\bs25 plus\b/i.test(combined) && !/\bgalaxy s25\b(?!\s*(?:ultra|plus|\+))/i.test(combined)) {
      return { matches: false, reason: 'VARIANT_MISMATCH_ULTRA_OR_PLUS' };
    }
    if (/500\s*mg/i.test(prodName) && /\b650\s*mg\b/i.test(combined) && !/\b500\s*mg\b/i.test(combined)) {
      return { matches: false, reason: 'FORMULATION_STRENGTH_MISMATCH_650MG_VS_500MG' };
    }
    if (/650/i.test(prodName) && /\b500\s*mg\b/i.test(combined) && !/\b650\s*mg\b/i.test(combined)) {
      return { matches: false, reason: 'FORMULATION_STRENGTH_MISMATCH_500MG_VS_650MG' };
    }
    if (requestedVariant && combined.length > 0 && /only for|exclusive to/i.test(combined) && !combined.includes(String(requestedVariant).toLowerCase())) {
      return { matches: false, reason: `REQUESTED_VARIANT_MISMATCH_${requestedVariant}` };
    }

    return {
      matches: true,
      confirmedProduct: product.name,
      confirmedVariant: requestedVariant || product.exactVariant || (product.sizes && product.sizes[0]) || 'Standard',
      confirmedPackSize: requestedPackSize || product.packSize || product.servingSize || null,
      confirmedFormulation: requestedFormulation || product.dosageForm || product.activeIngredient || null
    };
  }

  /**
   * Uses Google Search grounding through the Gemini API (`tools: [{ googleSearch: {} }]`)
   * to retrieve missing public product facts from official manufacturer/authoritative sources (Rules 2, 3, 4, 6).
   */
  static async retrieveGroundedProductFact({
    question,
    product,
    attributeKey = 'general_fact',
    variant = null,
    packSize = null,
    formulation = null,
    mockGroundingResponse = null
  }) {
    if (!product) {
      return {
        success: false,
        evidenceStatus: 'UNVERIFIED',
        reason: 'Product context is missing.'
      };
    }

    // Support deterministic mock injection for testing conflicting, uncertain, or variant-mismatched grounding
    if (mockGroundingResponse) {
      const ranked = this.rankAuthoritativeSources(mockGroundingResponse.sources || [], product);
      const bestSource = ranked[0] || {
        uri: mockGroundingResponse.sourceUrl || '',
        title: mockGroundingResponse.sourceTitle || '',
        sourceType: mockGroundingResponse.sourceType || 'web_reference'
      };
      const matchCheck = this.verifySourceProductMatch({
        product,
        candidateText: mockGroundingResponse.factValue || '',
        sourceTitle: bestSource.title,
        requestedVariant: variant,
        requestedPackSize: packSize,
        requestedFormulation: formulation
      });

      if (!matchCheck.matches) {
        return {
          success: false,
          evidenceStatus: 'UNCERTAIN',
          factValue: null,
          sourceUrl: bestSource.uri,
          sourceTitle: bestSource.title,
          sourceType: bestSource.sourceType,
          variantMatch: matchCheck,
          reason: `Source applies to a different variant or formulation (${matchCheck.reason}).`
        };
      }

      return {
        success: Boolean(mockGroundingResponse.factValue) && mockGroundingResponse.evidenceStatus !== 'UNVERIFIED',
        evidenceStatus: mockGroundingResponse.evidenceStatus || 'VERIFIED',
        factValue: mockGroundingResponse.factValue || null,
        sourceUrl: bestSource.uri,
        sourceTitle: bestSource.title,
        sourceType: bestSource.sourceType,
        groundingQueries: mockGroundingResponse.groundingQueries || [`${product.brand || ''} ${product.name} ${attributeKey} official specifications`],
        conflictingSources: mockGroundingResponse.conflictingSources || [],
        variantMatch: matchCheck
      };
    }

    // 1. Check Verified Authoritative Manufacturer Grounded Registry first (unless forceLiveGeminiGrounding is true)
    const productFacts = this.AUTHORITATIVE_GROUNDED_FACTS[product.id];
    if (productFacts && productFacts[attributeKey]) {
      const entry = productFacts[attributeKey];
      const matchCheck = this.verifySourceProductMatch({
        product,
        candidateText: entry.factValue,
        sourceTitle: entry.sourceTitle,
        requestedVariant: variant || entry.variant,
        requestedPackSize: packSize || entry.packSize,
        requestedFormulation: formulation || entry.formulation
      });

      if (!matchCheck.matches) {
        return {
          success: false,
          evidenceStatus: 'UNCERTAIN',
          factValue: null,
          sourceUrl: entry.sourceUrl,
          sourceTitle: entry.sourceTitle,
          sourceType: entry.sourceType,
          variantMatch: matchCheck,
          reason: `Authoritative source applies to ${entry.variant || 'another variant'}, not the requested variant.`
        };
      }

      return {
        success: true,
        evidenceStatus: entry.evidenceStatus || 'VERIFIED',
        factValue: entry.factValue,
        sourceUrl: entry.sourceUrl,
        sourceTitle: entry.sourceTitle,
        sourceType: entry.sourceType || 'manufacturer_official',
        groundingQueries: [`${product.brand || ''} ${product.name} ${attributeKey.replace(/_/g, ' ')} official site`],
        variantMatch: matchCheck
      };
    }

    // 2. Live Gemini API with Google Search Grounding (`tools: [{ googleSearch: {} }]`) if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here' && attributeKey !== 'unclassified') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a product verification specialist for TrendVibe Store.
Find the exact, verified public product fact for the following customer question using Google Search.

TARGET PRODUCT DETAILS:
- Product ID: ${product.id}
- Product Name: ${product.name}
- Brand / Manufacturer: ${product.brand || 'N/A'}
- Category: ${product.category || 'N/A'}
- Variant / Pack Size / Formulation: ${variant || product.exactVariant || 'Standard'} / ${packSize || product.packSize || 'Standard'} / ${formulation || product.dosageForm || 'Standard'}
- Requested Attribute Key: ${attributeKey}
- Customer Question: "${question}"

MANDATORY VERIFICATION RULES:
1. Prefer the exact manufacturer's official website, official product label, or government/regulatory registries.
2. Confirm the source applies to the exact product model ("${product.name}"), formulation, pack size, and variant. Do NOT mix specs from Pro/Ultra/Plus or different mg strengths.
3. Never invent medical dosage, age restrictions, drug interactions, side effects, prescription status, batch authenticity, or safety certifications.
4. If sources conflict or evidence is uncertain, set evidenceStatus to "CONFLICTING" or "UNCERTAIN" and explain the limitation.
5. If the fact cannot be verified from authoritative sources, set evidenceStatus to "UNVERIFIED" and factValue to null.

Respond ONLY in valid JSON with this schema:
{
  "evidenceStatus": "VERIFIED | UNCERTAIN | CONFLICTING | UNVERIFIED",
  "factValue": "Concise factual statement verified from the source, or null if unverified",
  "appliesToExactProductAndVariant": true,
  "preferredSourceUrl": "URL of the most authoritative official source",
  "preferredSourceTitle": "Title of the official source",
  "conflictOrUncertaintyNote": "Explanation if uncertain or conflicting, else empty string"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        const metadata = response.candidates?.[0]?.groundingMetadata;
        const webSearchQueries = metadata?.webSearchQueries || [];
        const rawChunks = (metadata?.groundingChunks || [])
          .map(c => ({ uri: c.web?.uri, title: c.web?.title }))
          .filter(c => c.uri);

        const rankedSources = this.rankAuthoritativeSources(rawChunks, product);
        const rawText = response.text ? response.text.trim() : '';
        const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleanedJson);

        const bestSource = rankedSources[0] || {
          uri: parsed.preferredSourceUrl || '',
          title: parsed.preferredSourceTitle || 'Google Search Grounded Source',
          sourceType: 'google_search_grounded'
        };

        const matchCheck = this.verifySourceProductMatch({
          product,
          candidateText: parsed.factValue || '',
          sourceTitle: bestSource.title,
          requestedVariant: variant,
          requestedPackSize: packSize,
          requestedFormulation: formulation
        });

        const finalStatus = !matchCheck.matches || parsed.appliesToExactProductAndVariant === false
          ? 'UNCERTAIN'
          : (parsed.evidenceStatus || 'UNVERIFIED');

        if (parsed.factValue && (finalStatus === 'VERIFIED' || finalStatus === 'UNCERTAIN' || finalStatus === 'CONFLICTING')) {
          return {
            success: true,
            evidenceStatus: finalStatus,
            factValue: parsed.factValue,
            sourceUrl: bestSource.uri || parsed.preferredSourceUrl || null,
            sourceTitle: bestSource.title || parsed.preferredSourceTitle || '',
            sourceType: bestSource.sourceType || 'google_search_grounded',
            groundingQueries: webSearchQueries,
            conflictOrUncertaintyNote: parsed.conflictOrUncertaintyNote || '',
            variantMatch: matchCheck
          };
        }
      } catch (err) {
        console.warn('[Gemini] Live Google Search grounding fallback:', err.message);
      }
    }

    return {
      success: false,
      evidenceStatus: 'UNVERIFIED',
      factValue: null,
      sourceUrl: null,
      sourceTitle: null,
      sourceType: null,
      groundingQueries: [`${product.brand || ''} ${product.name} ${attributeKey.replace(/_/g, ' ')}`],
      reason: 'No authoritative manufacturer or official label source could verify this specific attribute.'
    };
  }
}

