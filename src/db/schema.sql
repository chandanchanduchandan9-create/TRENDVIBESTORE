-- ====================================================================
-- AI-Powered Social Media Shopping Voice Agent Database Schema
-- Production Ready for PostgreSQL, Supabase, and SQLite
-- ====================================================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- clothing, mobile phones, laptops, electronics, shoes, cosmetics, accessories
    brand VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    sale_price NUMERIC(10, 2) NOT NULL,
    colours JSONB NOT NULL DEFAULT '[]',
    sizes JSONB NOT NULL DEFAULT '[]',
    stock JSONB NOT NULL, -- { overall: number, variants: { "Black-XL": 0, ... } }
    in_stock BOOLEAN DEFAULT TRUE,
    delivery_info TEXT,
    delivery_days VARCHAR(64),
    delivery_charges NUMERIC(10, 2) DEFAULT 0,
    free_delivery_above NUMERIC(10, 2) DEFAULT 50,
    return_policy TEXT,
    exchange_policy TEXT,
    refund_policy TEXT,
    payment_methods JSONB NOT NULL DEFAULT '[]',
    cod_available BOOLEAN DEFAULT TRUE,
    warranty TEXT,
    specs JSONB NOT NULL DEFAULT '{}', -- Category-specific dynamic specifications
    image_url TEXT,
    instagram_post_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CUSTOMER LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(64) PRIMARY KEY, -- e.g. LEAD-20260913-ABCD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    customer_name VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(128),
    social_media_source VARCHAR(64) DEFAULT 'instagram', -- instagram, facebook, whatsapp, direct
    campaign VARCHAR(128) DEFAULT 'reels_organic',
    product_id VARCHAR(64) REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    initial_enquiry TEXT,
    lead_status VARCHAR(64) DEFAULT 'New Lead', -- New Lead, Call Queued, In Progress, Qualified, Converted, Lost, Follow-up Needed
    lead_score VARCHAR(32) DEFAULT 'Warm', -- Hot, Warm, Cold
    score_numerical INTEGER DEFAULT 50
);

-- 3. ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS enquiries (
    id VARCHAR(64) PRIMARY KEY,
    lead_id VARCHAR(64) REFERENCES leads(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id),
    enquiry_channel VARCHAR(32) DEFAULT 'web_form', -- web_form, voice_call, direct_message
    enquiry_text TEXT NOT NULL,
    enquiry_type VARCHAR(64), -- availability, price, size, delivery, return, specs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. VOICE CALLS TABLE
CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(64) PRIMARY KEY,
    lead_id VARCHAR(64) REFERENCES leads(id) ON DELETE CASCADE,
    conversation_id VARCHAR(128), -- ElevenLabs conversation ID
    call_sid VARCHAR(128), -- Twilio Call SID
    call_start TIMESTAMP WITH TIME ZONE,
    call_end TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    call_status VARCHAR(64) DEFAULT 'queued', -- queued, ringing, in-progress, completed, failed, busy, no-answer
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. CONVERSATIONS & TRANSCRIPT INTELLIGENCE TABLE
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(64) PRIMARY KEY,
    lead_id VARCHAR(64) REFERENCES leads(id) ON DELETE CASCADE,
    conversation_id VARCHAR(128),
    full_transcript TEXT,
    summary TEXT,
    customer_intent VARCHAR(128), -- buy_now, compare_specs, size_check, return_inquiry, general_browse
    purchase_intent VARCHAR(32), -- STRONG_BUY, INTERESTED_EXPLORING, PRICE_SENSITIVE, JUST_BROWSING, NOT_INTERESTED
    sentiment VARCHAR(32), -- VERY_POSITIVE, POSITIVE, NEUTRAL, HESITANT, NEGATIVE
    extracted_requirements JSONB DEFAULT '{}', -- { size: "XL", colour: "Black", quantity: 2, ... }
    unresolved_questions JSONB DEFAULT '[]',
    human_handoff BOOLEAN DEFAULT FALSE,
    human_handoff_reason TEXT,
    gemini_analysis_raw JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SALES / ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    lead_id VARCHAR(64) REFERENCES leads(id),
    product_id VARCHAR(64) REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    size VARCHAR(64),
    colour VARCHAR(64),
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(64) DEFAULT 'Cash on Delivery (COD)',
    is_cod BOOLEAN DEFAULT TRUE,
    order_status VARCHAR(64) DEFAULT 'Pending Confirmation', -- Pending Confirmation, Confirmed, Shipped, Delivered, Cancelled
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. FOLLOW-UPS TABLE
CREATE TABLE IF NOT EXISTS followups (
    id VARCHAR(64) PRIMARY KEY,
    lead_id VARCHAR(64) REFERENCES leads(id) ON DELETE CASCADE,
    priority VARCHAR(32) DEFAULT 'MEDIUM', -- URGENT, HIGH, MEDIUM, LOW
    reason TEXT NOT NULL,
    assigned_to VARCHAR(128) DEFAULT 'Unassigned',
    status VARCHAR(32) DEFAULT 'PENDING', -- PENDING, CONTACTED, RESOLVED, CLOSED
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_product ON leads(product_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_calls_lead ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
