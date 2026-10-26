# Google Sheets Structure & CRM Architecture

This document defines the 7 distinct Google Sheets sections designed for complete transparency, allowing store managers, inventory supervisors, and sales reps to track leads, calls, conversations, and orders in real time.

---

## Sheet 1: Customer Leads
Tracks every potential buyer who submitted an enquiry via the Instagram link.

| Column | Header Name | Type | Example Value | Description |
|---|---|---|---|---|
| A | **Lead ID** | String | `LEAD-382910-4821` | Unique lead identifier |
| B | **Date and Time** | Timestamp | `2026-09-13 14:32:00` | When form was submitted |
| C | **Customer Name** | String | `Alexander Hayes` | Name entered by customer |
| D | **Phone** | String | `+1 (555) 234-5678` | Validated E.164 phone number |
| E | **Email** | String | `alex.hayes@example.com` | Optional email |
| F | **Social Media Source** | String | `Instagram` | Source platform (Reels/Bio) |
| G | **Campaign** | String | `Summer_Drops_Reel_04` | Campaign identifier |
| H | **Product ID** | String | `PROD-CLOTH-001` | Featured product ID |
| I | **Product Name** | String | `TrendVibe Heavyweight Oversized Tee` | Product title |
| J | **Initial Enquiry** | Text | `Is size XL available in black? COD?` | Customer's initial question |
| K | **Lead Status** | String | `Call Completed` | New Lead / Calling / Converted / Follow-up Needed |
| L | **Lead Score** | String | `Hot` | **Hot** / **Warm** / **Cold** |

---

## Sheet 2: Products
Store product catalog with real-time stock and dynamic specifications.

| Column | Header Name | Type | Example Value | Description |
|---|---|---|---|---|
| A | **Product ID** | String | `PROD-PHONE-005` | Unique product SKU |
| B | **Product Name** | String | `Apple iPhone 16` | Product name |
| C | **Category** | String | `Mobile Phones` | Clothing, Phones, Laptops, etc. |
| D | **Brand** | String | `Apple` | Brand manufacturer |
| E | **Price** | Currency | `$899.00` | Regular retail price |
| F | **Discount %** | Percentage | `11%` | Active discount rate |
| G | **Sale Price** | Currency | `$799.00` | Final customer price |
| H | **Colours** | List | `Titanium Silver, Deep Blue` | Available shades |
| I | **Sizes / Configs** | List | `12GB+256GB, 16GB+512GB` | Sizes or hardware variants |
| J | **Stock Overall** | Integer | `24` | Total units on hand |
| K | **Delivery Info** | Text | `1-3 days free air delivery` | Shipping duration & fees |
| L | **Return Policy** | Text | `7 days replacement` | Return window & terms |
| M | **Exchange Policy** | Text | `Device trade-in bonus $150` | Exchange policy |
| N | **COD Available** | Boolean | `YES` | Cash on delivery eligible |
| O | **Warranty** | Text | `1 Year Brand Warranty` | Manufacturer guarantee |

---

## Sheet 3: Enquiries
Granular log of specific questions asked through web forms or voice calls.

| Column | Header Name | Type | Example Value | Description |
|---|---|---|---|---|
| A | **Enquiry ID** | String | `ENQ-819201-192` | Unique enquiry record |
| B | **Lead ID** | String | `LEAD-382910-4821` | Linked customer lead |
| C | **Product ID** | String | `PROD-CLOTH-001` | Linked product |
| D | **Channel** | String | `web_form` | web_form or voice_call |
| E | **Enquiry Text** | Text | `Can I get Cash on Delivery to Texas?` | Exact question asked |
| F | **Created At** | Timestamp | `2026-09-13 14:32:00` | Timestamp |

---

## Sheet 4: Calls
Logs telephone sessions initiated via Twilio and ElevenLabs.

| Column | Header Name | Type | Example Value | Description |
|---|---|---|---|---|
| A | **Call Record ID** | String | `CALL-920194-481` | Unique internal call ID |
| B | **Lead ID** | String | `LEAD-382910-4821` | Linked lead |
| C | **ElevenLabs Conv ID** | String | `conv_891726a8c91` | ElevenLabs session ID |
| D | **Twilio Call SID** | String | `CA1829374619482` | Twilio telephony identifier |
| E | **Call Start** | Timestamp | `2026-09-13 14:32:45` | Call initiation timestamp |
| F | **Call End** | Timestamp | `2026-09-13 14:34:52` | Call termination timestamp |
| G | **Duration (Seconds)** | Integer | `127` | Total billable seconds |
| H | **Call Status** | String | `completed` | ringing, completed, busy, failed |

---

## Sheet 5: Conversations
Post-call Gemini AI intelligence extraction and analysis.

| Column | Header Name | Type | Example Value | Description |
|---|---|---|---|---|
| A | **Lead ID** | String | `LEAD-382910-4821` | Linked lead |
| B | **Conversation ID** | String | `conv_891726a8c91` | Call conversation identifier |
| C | **Executive Summary** | Text | `Customer enquired about XL size; since Black was out, suggested Off-White.` | 2-3 sentence overview |
| D | **Customer Intent** | String | `BUY_NOW` | Core intent category |
| E | **Purchase Intent** | String | `STRONG_BUY` | STRONG_BUY / INTERESTED / BROWSING |
| F | **Customer Sentiment** | String | `VERY_POSITIVE` | VERY_POSITIVE / NEUTRAL / NEGATIVE |
| G | **Extracted Specs** | JSON / Text | `{"size": "XL", "colour": "Off-White", "qty": 1}` | Customer preferred specifications |
| H | **Unresolved Questions**| JSON / Text | `[]` | Any questions AI couldn't answer |
| I | **Human Handoff** | Boolean | `NO` | Did caller ask for human / need help? |
| J | **Handoff Reason** | Text | `N/A` | Rationale if handoff requested |

---

## Sheet 6: Sales / Orders
Verbal orders placed during the AI call or completed via instant checkout links.

| Column | Header Name | Type | Example Value | Description |
|---|---|---|---|---|
| A | **Order ID** | String | `ORD-918237-582` | Unique order confirmation ID |
| B | **Lead ID** | String | `LEAD-382910-4821` | Linked lead |
| C | **Product ID** | String | `PROD-CLOTH-001` | Product ordered |
| D | **Product Name** | String | `TrendVibe Heavyweight Oversized Tee` | Item title |
| E | **Quantity** | Integer | `1` | Number of items |
| F | **Size** | String | `XL` | Selected size |
| G | **Colour** | String | `Off-White` | Selected colour |
| H | **Total Amount** | Currency | `$27.99` | Total purchase amount |
| I | **Payment Method** | String | `Cash on Delivery (COD)` | Payment mode |
| J | **Order Status** | String | `Confirmed` | Confirmed / Shipped / Delivered |
| K | **Created At** | Timestamp | `2026-09-13 14:34:50` | Timestamp |

---

## Sheet 7: Follow-ups
Actionable priority queue for the human sales team.

| Column | Header Name | Type | Example Value | Description |
|---|---|---|---|---|
| A | **Followup ID** | String | `FOL-817293-192` | Follow-up ticket ID |
| B | **Lead ID** | String | `LEAD-382910-4821` | Linked lead |
| C | **Priority** | String | `URGENT` | URGENT (Hot lead / Handoff) / HIGH / MEDIUM |
| D | **Reason** | Text | `Customer wants custom bulk discount on 10 units.` | Reason human rep is needed |
| E | **Assigned To** | String | `Marcus Vance (VIP Sales)` | Assigned sales agent |
| F | **Status** | String | `PENDING` | PENDING / CONTACTED / CLOSED |
| G | **Notes** | Text | `Customer prefers WhatsApp contact before 5 PM.` | Internal agent notes |
| H | **Created At** | Timestamp | `2026-09-13 14:35:00` | Creation timestamp |
