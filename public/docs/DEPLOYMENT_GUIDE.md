# Production Deployment & Scaling Guide

This guide details how to deploy the **TrendVibe AI Social Media Shopping Voice Agent** system to cloud platforms (Render, Railway, AWS, Docker, Supabase).

---

## 1. Local Quick Start

```bash
# 1. Clone repository & enter directory
cd instaproject

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Run automated test suite
npm test

# 5. Start development server
npm start
```
Access the application at:
- Instagram Reel Simulation: `http://localhost:3000`
- Mobile Enquiry Page: `http://localhost:3000/enquire.html`
- Store CRM & Voice Console: `http://localhost:3000/dashboard.html`

---

## 2. Docker Deployment

A `Dockerfile` is provided for containerized deployment:

```dockerfile
# Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run container:
```bash
docker build -t trendvibe-voice-agent .
docker run -p 3000:3000 --env-file .env trendvibe-voice-agent
```

---

## 3. Cloud Deployment (Render / Railway / DigitalOcean)

### Deploying to Render:
1. Push your repository to GitHub or GitLab.
2. Log into [Render.com](https://render.com) → Click **New Web Service**.
3. Select your repository.
4. Set:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. In the **Environment Variables** tab, add:
   - `PORT=3000`
   - `SERVER_BASE_URL=https://your-service.onrender.com`
   - `GEMINI_API_KEY`
   - `ELEVENLABS_AGENT_ID`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
   - `GOOGLE_SHEET_ID`
6. Click **Deploy Web Service**.

---

## 4. Scaling to PostgreSQL or Supabase

To scale from the embedded sample database to thousands of products:
1. Execute the SQL schema in [`src/db/schema.sql`](file:///c:/Users/chand/OneDrive/Desktop/instaproject/src/db/schema.sql) in your PostgreSQL or Supabase database.
2. In `src/db/database.js`, replace the in-memory map reads with `pg` / `prisma` / `supabase-js` client queries:
   ```javascript
   import { createClient } from '@supabase/supabase-js';
   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
   ```
3. The table structures and JSONB spec columns will scale to hundreds of thousands of products with zero schema migrations required.

---

## 5. Security & Protection Guidelines

1. **HMAC Webhook Verification**:
   Ensure incoming webhooks from ElevenLabs or n8n contain the `x-webhook-signature` header verified against `WEBHOOK_SECRET`.
2. **Customer Data Privacy**:
   Phone numbers are sanitized to E.164 and customer PII is encrypted at rest.
3. **Rate Limiting**:
   The lead intake endpoint includes a 24-hour duplicate lead check preventing spam submissions from the same phone number for the same product.
