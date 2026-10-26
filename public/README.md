# TrendVibe - AI-Powered Social Media Shopping Voice Agent

A complete, production-ready AI shopping sales assistant designed to automatically handle thousands of customer enquiries generated from Instagram product videos and reels.

When a store uploads a product video or post to Instagram, it includes an **“Enquire Now”** or **“Talk to AI”** link. When a customer clicks the link, they are redirected to a mobile-friendly product enquiry page where they view the item and enter their name, mobile number, and question. Once submitted, the system captures the lead, stores it in **Google Sheets**, triggers an **n8n orchestration workflow**, and immediately initiates an outbound AI voice call to the customer using **ElevenLabs Conversational AI** and **Twilio**.

During the call, the AI shopping assistant introduces itself, references the exact product enquired about, and answers questions about availability, pricing, sizes, colours, specifications (e.g., RAM/storage for phones, fabric/GSM for clothing), delivery timelines, Cash on Delivery (COD), and returns—**fetching live data from the product catalog via 13 real-time backend tool APIs to prevent hallucination**.

After the call, a post-call webhook dispatches the transcript to **Google Gemini**, which extracts structured customer intelligence, calculates lead scoring (**Hot / Warm / Cold**), updates Google Sheets, and triggers human sales handoffs when needed.

---

## 🏗️ System Architecture & Workflow

```
[Instagram Video/Reel] 
       │
       ▼ (Clicks "Enquire Now" or "Talk to AI")
[Mobile Product Enquiry Page] 
       │
       ▼ (Customer Enters Details & Submits)
[Backend Lead Intake / n8n Webhook] 
       │
       ├─► [Google Sheets: Customer Leads & Enquiries]
       │
       └─► [Trigger Outbound Voice Call via Twilio + ElevenLabs]
                 │
                 ▼
          [Customer Answers Phone]
                 │
                 ▼
   [AI Assistant "Zyro AI" Introduces Herself & Product]
                 │
                 ▲ Real-Time Tool Calls (13 Endpoints)
                 ▼ (Stock, Size, Price, COD, Specs)
        [Product Database / Store APIs]
                 │
                 ▼ (Customer Dialogue Ends)
         [Call Transcript Webhook]
                 │
                 ▼
        [Google Gemini 2.0 / 1.5 Flash Analysis]
                 │
                 ├─► [Structured Intelligence: Specs, Intent, Sentiment]
                 ├─► [Lead Scoring Engine: Hot (80-100), Warm (40-79), Cold (0-39)]
                 ├─► [Google Sheets Sync: Calls, Conversations, Orders, Follow-ups]
                 │
                 ▼
     [Hot Lead / Human Handoff Alert to Sales Team]
```

---

## 🌟 Key Features

1. **Instagram Video Storefront (`public/index.html`)**:
   - Realistic Instagram Reel and post feed with embedded video/media.
   - Dynamic category filter (Clothing, Mobile Phones, Laptops, Electronics, Shoes, Cosmetics, Accessories).
   - Prominent **"Enquire Now"** and **"Talk to AI"** floating call-to-action buttons.

2. **Mobile Product Enquiry Page (`public/enquire.html`)**:
   - Ultra-responsive, mobile-first design displaying high-res product imagery, live sale price, discount badge, delivery timeline, and COD availability.
   - Form fields: Customer Full Name, Mobile/WhatsApp number with international country code picker, optional Email, pre-selected Product details, and Initial Enquiry textarea with 1-click quick-suggestion chips.
   - E.164 phone formatting and duplicate lead protection within 24 hours.

3. **13 Backend Tool APIs for ElevenLabs AI Voice Agent (`src/routes/aiTools.js`)**:
   - `searchProduct`: Fast fuzzy catalog search by keyword, brand, category, or title.
   - `getProductDetails`: Complete technical specifications, prices, and store policies.
   - `checkStock`: Live inventory counts, variant-level availability (checks requested size & colour).
   - `getPrice`: Regular price, discount percentage, sale price, and free delivery thresholds.
   - `getVariants`: Lists available sizes, colours, and hardware tiers.
   - `checkSize`: Checks availability for clothing sizes, shoe sizes, or laptop configurations.
   - `checkColour`: Checks specific colourway stock.
   - `getDeliveryInformation`: Real-time delivery days, pincode shipping, and delivery fee.
   - `getReturnPolicy`: 7-day or 14-day return window, exchange policy, and refund processing.
   - `getPaymentOptions`: Cash on Delivery (COD), UPI, card, and EMI availability.
   - `searchSimilarProducts`: Recommends in-stock alternatives if requested size/colour/item is sold out.
   - `getOrderStatus`: Real-time tracking of existing customer orders by phone or Order ID.
   - `createOrder`: Places confirmed verbal orders directly during the voice call.

4. **Zero-Hallucination AI Sales Persona (`docs/ELEVENLABS_PROMPT.md`)**:
   - Polite, knowledgeable AI shopping assistant named Zyro AI.
   - Always identifies as an AI assistant.
   - Strictly verifies product data through tool calls.
   - Dynamic first message greeting:
     `"Hello {{customer_name}}! This is Zyro AI, the AI shopping assistant from TrendVibe Store. I noticed you recently enquired on Instagram about our {{product_name}}. How can I assist you today?"`

5. **Post-Call Gemini AI Intelligence & Lead Scoring (`src/services/geminiService.js`)**:
   - Analyzes raw transcript and extracts:
     - Customer questions
     - Requested parameters (`size`, `colour`, `quantity`, `ram`, `storage`, etc.)
     - Enquiry categorization (price, availability, delivery, return, COD)
     - Purchase intent (`STRONG_BUY`, `INTERESTED_EXPLORING`, `PRICE_SENSITIVE`, `JUST_BROWSING`, `NOT_INTERESTED`)
     - Customer sentiment (`VERY_POSITIVE`, `POSITIVE`, `NEUTRAL`, `HESITANT`, `NEGATIVE`)
     - Numerical score (0-100) and classification (**Hot**, **Warm**, **Cold**)
     - Unresolved questions & Human Handoff detection with reason.

6. **7-Section Transparent Google Sheets CRM Architecture (`docs/GOOGLE_SHEETS_STRUCTURE.md`)**:
   - **Customer Leads**: Lead ID, Date & Time, Customer Name, Phone, Email, Source, Campaign, Product ID, Product Name, Initial Enquiry, Lead Status, Lead Score.
   - **Products**: Full catalog reference with live stock and category specifications.
   - **Enquiries**: Individual questions asked before or during calls.
   - **Calls**: Lead ID, Conversation ID, Call SID, Start, End, Duration, Status.
   - **Conversations**: Lead ID, Full Transcript, Summary, Intent, Sentiment, Extracted Requirements, Unresolved Questions, Human Handoff.
   - **Sales / Orders**: Order ID, Product, Quantity, Size, Colour, Total, COD, Status.
   - **Follow-ups**: Actionable queue for high-priority leads and human handoff requests.

7. **Exportable n8n Master Orchestration (`n8n/workflows/n8n-master-orchestration.json`)**:
   - Pre-configured, 12-node master n8n workflow connecting webhooks, phone sanitization, Google Sheets, Twilio/ElevenLabs calling, Gemini analysis, and automated alerts.

8. **Admin CRM & Live Voice Simulator (`public/dashboard.html`)**:
   - Real-time KPI metrics (Total Leads, Hot Leads, Calls Handled, Orders Placed, Handoffs).
   - In-browser voice call testing with Web Audio speech synthesis.
   - Live Gemini extraction viewer with structured JSON output.
   - Live Google Sheets data tables with 1-click CSV export.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or v20+)
- npm or pnpm

### Installation

```bash
# 1. Clone or navigate to the repository
cd instaproject

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env

# 4. Run automated test suite (43 automated tests)
npm test

# 5. Start the server
npm start
```

Open your browser:
- **Instagram Storefront**: [http://localhost:3000](http://localhost:3000)
- **Mobile Enquiry Page**: [http://localhost:3000/enquire.html](http://localhost:3000/enquire.html)
- **Admin CRM & Voice Console**: [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html)

---

## 🧪 Testing the End-to-End Flow

### Test Scenario A: Instagram Lead Submission
1. Open `http://localhost:3000/index.html`.
2. Click **"Enquire Now"** on the *TrendVibe Heavyweight Oversized Graphic Tee*.
3. On the mobile enquiry page, enter:
   - Name: `Marcus Thorne`
   - Mobile: `9876543210`
   - Enquiry: `Is size XL available in black? Can I pay COD?`
4. Click **"Submit Enquiry & Call Me Now"**.
5. The lead is created, scored, stored in the CRM, and an outbound call is queued.

### Test Scenario B: Voice Conversation & Sold-Out Handling
1. Open the **Admin CRM & Voice Console** at `http://localhost:3000/dashboard.html`.
2. Select Scenario 1 (*Clothing: Black XL Sold Out → Recommends Off-White → COD Order*).
3. Click **"Listen Audio"** to hear the conversation spoken via speech synthesis.
4. Click **"Run Call & Process with Gemini"**.
5. Observe:
   - Tool `checkStock` reports Vintage Black XL is sold out.
   - Tool `searchSimilarProducts` recommends Off-White XL.
   - Tool `createOrder` books verbal order with Order ID `ORD-...`.
   - Gemini classifies caller as **Hot Lead (Score: 100/100)** with `STRONG_BUY` intent.
   - Google Sheets tables for Leads, Calls, Conversations, and Orders update instantly.

### Test Scenario C: Automated Verification Suite
Run the 43 automated verification tests covering all catalog categories, 13 backend tool endpoints, phone sanitization, duplicate detection, lead scoring, Gemini extraction, and Google Sheets exports:

```bash
npm test
```

---

## 📁 Repository Structure

```
instaproject/
├── config/
│   └── elevenlabs-agent-spec.json      # ElevenLabs agent spec & 13 tool declarations
├── data/
│   ├── products.json                   # 15 multi-category sample products with specs
│   └── sheets_exports/                 # Live CSV/JSON exports for 7 Google Sheets
├── docs/
│   ├── API_DOCUMENTATION.md            # Complete REST API reference
│   ├── ELEVENLABS_PROMPT.md            # Agent prompt, greeting, and tool guide
│   ├── GOOGLE_SHEETS_STRUCTURE.md      # Detailed 7-sheet schema and column types
│   ├── TWILIO_ELEVENLABS_INTEGRATION.md# Telephony setup & webhook wiring guide
│   └── DEPLOYMENT_GUIDE.md             # Production scaling, Docker, & cloud setup
├── n8n/
│   ├── README.md                       # n8n import and credentials instructions
│   └── workflows/
│       └── n8n-master-orchestration.json # Importable 12-node master n8n workflow
├── public/
│   ├── index.html                      # Instagram feed & reel shopping experience
│   ├── enquire.html                    # Mobile-friendly product enquiry page
│   └── dashboard.html                  # Store CRM, voice simulator, & Sheets view
├── src/
│   ├── db/
│   │   ├── database.js                 # In-memory & JSON-persisted CRM database
│   │   └── schema.sql                  # PostgreSQL / Supabase SQL schema
│   ├── routes/
│   │   ├── aiTools.js                  # 13 ElevenLabs tool endpoints
│   │   └── api.js                      # Lead intake, call trigger, & webhooks
│   ├── services/
│   │   ├── productService.js           # Fact retrieval & inventory check service
│   │   ├── leadScoringEngine.js        # Hot/Warm/Cold scoring rules & heuristics
│   │   ├── voiceCallService.js         # Twilio outbound calling & phone validator
│   │   ├── geminiService.js            # Gemini transcript extractor & NLP engine
│   │   └── googleSheetsService.js      # 7-section Google Sheets sync & exporter
│   └── server.js                       # Express application entry point
├── tests/
│   └── verify-system.js                # 43 automated verification tests
├── Dockerfile                          # Production container image
├── package.json                        # Node.js dependencies & scripts
├── .env.example                        # Template for environment variables
└── README.md                           # Master project documentation
```

---

## 🔒 Security & Privacy

- **Sanitization**: Phone numbers are strictly validated and formatted to E.164.
- **Spam Protection**: Automatic duplicate lead detection prevents repeated submissions within 24 hours.
- **Credential Safety**: All API keys (Twilio, ElevenLabs, Gemini, Google Sheets) are loaded via environment variables and never exposed to the client.
- **Webhook Authentication**: Webhooks support signature verification using HMAC SHA-256 (`WEBHOOK_SECRET`).

---

## 📜 License
MIT License. Built for modern social media commerce automation.
