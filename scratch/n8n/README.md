# n8n Workflow Automation Guide

This folder contains production-ready n8n workflows for the **TrendVibe AI Social Media Shopping Voice Agent**.

## Workflow Architecture

The master workflow (`workflows/n8n-master-orchestration.json`) implements the complete pipeline:

```
[Instagram Lead Webhook] 
       │
       ▼
[Validate & Sanitize Lead] 
       │
       ▼
[Save to Google Sheets: Customer Leads] 
       │
       ▼
[Trigger ElevenLabs + Twilio Outbound Call]
       │
       ▼
[Respond to Customer Mobile Page]

---------------------------------------------------

[Post-Call Transcript Webhook]
       │
       ▼
[Gemini 2.0 / 1.5 Flash Analysis]
       │
       ▼
[Parse & Compute Lead Score (Hot/Warm/Cold)]
       │
       ▼
[Save to Google Sheets: Conversations & Calls]
       │
       ▼
[Branch: Hot Lead or Human Handoff Needed?]
      ├── YES ──► [Log to Follow-ups Sheet & Alert Rep via Slack/WhatsApp]
      └── NO  ──► [Complete]
```

## How to Import into n8n

1. Open your n8n instance (e.g. `http://localhost:5678` or your hosted n8n Cloud).
2. Go to **Workflows** → Click the **+ Add Workflow** or top-right `...` menu.
3. Select **Import from File...** and choose `workflows/n8n-master-orchestration.json`.
4. The complete 12-node pipeline will be rendered on your canvas.

## Credentials Configuration

In n8n, configure the following credentials:
1. **Google Sheets OAuth2 or Service Account**:
   - Create Google Cloud Service Account credentials with Sheets read/write permissions.
   - Set Sheet ID in environment variable `GOOGLE_SHEET_ID`.
2. **Gemini API Key**:
   - Provide your Google Gemini API Key in the HTTP Request node or as an environment variable `GEMINI_API_KEY`.
3. **Backend API Host**:
   - Set `SERVER_BASE_URL` to your backend URL (e.g. `https://your-ngrok-tunnel.ngrok-free.app` or `http://localhost:3000`).

## Webhook Endpoints Created

- **Lead Intake**: `POST /webhook/lead-intake`
- **Post-Call Transcript**: `POST /webhook/post-call`
