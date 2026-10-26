# Twilio & ElevenLabs Production Telephony Integration Guide

This guide details how to connect **Twilio Voice** with **ElevenLabs Conversational AI** and your **TrendVibe Store Backend** to make automated outbound phone calls to customers who enquire from Instagram.

---

## 1. Prerequisites
1. **Twilio Account**: Active account with a verified Voice-enabled phone number.
2. **ElevenLabs Account**: Conversational AI access (Creator or Pro tier recommended).
3. **Google Gemini API Key**: For post-call intelligence analysis.
4. **Public Server URL**: An HTTPS URL for webhooks (via `ngrok` during development, or your cloud domain).

---

## 2. Setting Up the ElevenLabs Conversational AI Agent

1. Log into your [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai).
2. Click **Create Agent** → Choose **Blank Agent**.
3. Set Agent Name: `Zyro AI - TrendVibe AI Shopping Assistant`.
4. Under **First Message**, enter:
   ```text
   Hello {{customer_name}}! This is Zyro AI, the AI shopping assistant from TrendVibe Store. I noticed you recently enquired on Instagram about our {{product_name}}. How can I assist you with that today?
   ```
5. Under **System Prompt**, copy the prompt from [`docs/ELEVENLABS_PROMPT.md`](file:///c:/Users/chand/OneDrive/Desktop/instaproject/docs/ELEVENLABS_PROMPT.md).
6. Under **Tools**, click **Add Tool** → Select **Webhook**:
   - Add all 13 tools from `config/elevenlabs-agent-spec.json`:
     - `searchProduct`: `https://YOUR_DOMAIN/api/tools/searchProduct` (POST)
     - `checkStock`: `https://YOUR_DOMAIN/api/tools/checkStock` (POST)
     - `getPrice`: `https://YOUR_DOMAIN/api/tools/getPrice` (POST)
     - `getVariants`: `https://YOUR_DOMAIN/api/tools/getVariants` (POST)
     - `checkSize`: `https://YOUR_DOMAIN/api/tools/checkSize` (POST)
     - `checkColour`: `https://YOUR_DOMAIN/api/tools/checkColour` (POST)
     - `getDeliveryInformation`: `https://YOUR_DOMAIN/api/tools/getDeliveryInformation` (POST)
     - `getReturnPolicy`: `https://YOUR_DOMAIN/api/tools/getReturnPolicy` (POST)
     - `getPaymentOptions`: `https://YOUR_DOMAIN/api/tools/getPaymentOptions` (POST)
     - `searchSimilarProducts`: `https://YOUR_DOMAIN/api/tools/searchSimilarProducts` (POST)
     - `getOrderStatus`: `https://YOUR_DOMAIN/api/tools/getOrderStatus` (POST)
     - `createOrder`: `https://YOUR_DOMAIN/api/tools/createOrder` (POST)
     - `getProductDetails`: `https://YOUR_DOMAIN/api/tools/getProductDetails` (POST)
7. Save the Agent and copy your **Agent ID**.
8. Set `ELEVENLABS_AGENT_ID=your_agent_id` in your `.env` file.

---

## 3. Configuring Twilio Outbound Calling

1. Log in to [Twilio Console](https://console.twilio.com/).
2. Copy your:
   - **Account SID**
   - **Auth Token**
   - **Twilio Phone Number** (e.g. `+15551234567`)
3. Place them in your `.env` file:
   ```env
   TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+15551234567
   ```
4. In Twilio Console → **Phone Numbers** → **Manage** → **Active Numbers** → Click your number:
   - Under **Voice Configuration**, ensure call webhooks point to your server's `/api/calls/twiml` endpoint:
     ```
     URL: https://YOUR_DOMAIN/api/calls/twiml
     HTTP Method: POST
     ```

---

## 4. Connecting Twilio Streams to ElevenLabs

When an outbound call is triggered, Twilio executes our TwiML response (`/api/calls/twiml`), streaming live bidirectional audio to ElevenLabs:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/conversation?agent_id=YOUR_ELEVENLABS_AGENT_ID">
      <Parameter name="leadId" value="LEAD-123456" />
    </Stream>
  </Connect>
</Response>
```

---

## 5. Post-Call Webhook Setup in ElevenLabs

1. In your ElevenLabs Agent settings, scroll to **Post-Call Webhook**.
2. Enable **Send webhook after conversation ends**.
3. Set Webhook URL:
   ```text
   https://YOUR_DOMAIN/api/webhooks/post-call
   ```
4. Method: `POST`.
5. When the conversation finishes, ElevenLabs automatically sends the transcript and conversation metrics to our backend.
6. The backend runs Gemini analysis, computes the lead score (Hot/Warm/Cold), and updates Google Sheets!

---

## 6. Testing Outbound Calls Locally via ngrok

To expose your local server to Twilio and ElevenLabs:

```bash
# In a separate terminal:
ngrok http 3000
```

Copy your HTTPS forwarding URL (e.g. `https://abc1234.ngrok-free.app`) and set:
```env
SERVER_BASE_URL=https://abc1234.ngrok-free.app
```
Then restart your server (`npm start`). Any enquiry submitted on the mobile page will trigger a real telephone call to the entered phone number!
