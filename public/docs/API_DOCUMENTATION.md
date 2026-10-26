# API Documentation - TrendVibe AI Voice Sales Agent

Complete REST API specification for the store backend, ElevenLabs agent tool endpoints, telephony callbacks, and n8n webhook automations.

---

## Base URL
- **Local**: `http://localhost:3000`
- **Production / Tunnel**: `https://your-domain.com`

---

## 1. Lead Intake & Instagram Link Endpoints

### `POST /api/leads/enquire`
Receives customer submissions from the mobile enquiry page when they click "Enquire Now" or "Talk to AI" on Instagram.

#### Request Body:
```json
{
  "customerName": "Marcus Thorne",
  "phone": "+1 (555) 234-5678",
  "email": "marcus@example.com",
  "productId": "PROD-CLOTH-001",
  "productName": "TrendVibe Heavyweight Oversized Graphic Tee",
  "initialEnquiry": "Is size XL available in black? Can I pay COD?",
  "socialMediaSource": "instagram",
  "campaign": "reels_organic",
  "triggerCallImmediately": true
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Enquiry received! Our AI Shopping Assistant will call you at +15552345678 in a few moments.",
  "lead": {
    "id": "LEAD-291038-4821",
    "createdAt": "2026-09-13T12:00:00.000Z",
    "customerName": "Marcus Thorne",
    "phone": "+15552345678",
    "productName": "TrendVibe Heavyweight Oversized Graphic Tee",
    "initialEnquiry": "Is size XL available in black? Can I pay COD?",
    "leadStatus": "New Lead",
    "leadScore": "Hot",
    "scoreNumerical": 85
  },
  "call": {
    "success": true,
    "mode": "SIMULATION_SANDBOX",
    "callId": "CALL-291038-192",
    "status": "connected"
  }
}
```

---

## 2. ElevenLabs Conversational Agent Tool APIs (13 Endpoints)

These endpoints are configured as Webhook Tools in ElevenLabs Conversational AI. They accept `POST` requests and return factual inventory and policy information in natural language.

### 1. `POST /api/tools/searchProduct`
- **Parameters**: `query` (string), `category` (optional)
- **Response**:
```json
{
  "success": true,
  "count": 1,
  "products": [
    {
      "id": "PROD-CLOTH-001",
      "name": "TrendVibe Heavyweight Oversized Graphic Tee",
      "category": "clothing",
      "brand": "TrendVibe Studio",
      "salePrice": "$27.99",
      "originalPrice": "$34.99",
      "inStock": true,
      "availableColours": ["Vintage Black", "Off-White", "Sage Green"],
      "availableSizes": ["S", "M", "L", "XL", "XXL"]
    }
  ]
}
```

### 2. `POST /api/tools/getProductDetails`
- **Parameters**: `productId` or `query`
- **Response**: Full specs, pricing, warranties, delivery times, and return policies.

### 3. `POST /api/tools/checkStock`
- **Parameters**: `productId`, `query`, `size`, `colour`
- **Response when Sold Out**:
```json
{
  "success": true,
  "productId": "PROD-CLOTH-001",
  "productName": "TrendVibe Heavyweight Oversized Graphic Tee",
  "variant": "Vintage Black-XL",
  "inStock": false,
  "stockCount": 0,
  "message": "Unfortunately, the TrendVibe Heavyweight Oversized Graphic Tee in Vintage Black-XL is currently sold out. Would you like me to recommend similar products?",
  "recommendAlternatives": true
}
```
- **Response when In Stock**:
```json
{
  "success": true,
  "productId": "PROD-CLOTH-001",
  "productName": "TrendVibe Heavyweight Oversized Graphic Tee",
  "variant": "Off-White-XL",
  "inStock": true,
  "stockCount": 5,
  "message": "Yes, the TrendVibe Heavyweight Oversized Graphic Tee in Off-White-XL is in stock with 5 units available."
}
```

### 4. `POST /api/tools/getPrice`
- **Parameters**: `productId`, `query`
- **Response**:
```json
{
  "success": true,
  "regularPrice": "$34.99",
  "salePrice": "$27.99",
  "discountPercent": "20%",
  "savings": "$7.00",
  "message": "The TrendVibe Heavyweight Oversized Graphic Tee is currently on sale for $27.99, which is 20% off the original price of $34.99."
}
```

### 5. `POST /api/tools/getVariants`
- **Parameters**: `productId`, `query`
- **Response**: Available sizes, colours, and hardware variants.

### 6. `POST /api/tools/checkSize`
- **Parameters**: `productId`, `size`
- **Response**: Availability confirmation for specific size.

### 7. `POST /api/tools/checkColour`
- **Parameters**: `productId`, `colour`
- **Response**: Availability confirmation for specific colour.

### 8. `POST /api/tools/getDeliveryInformation`
- **Parameters**: `productId`, `pincode`
- **Response**: Delivery speed (e.g. `2-4 business days`), delivery charges (`$4.99`, free above `$50`).

### 9. `POST /api/tools/getReturnPolicy`
- **Parameters**: `productId`
- **Response**:
```json
{
  "success": true,
  "returnPolicy": "7-day hassle-free doorstep return policy with original tags attached.",
  "exchangePolicy": "Free instant size and colour exchange within 7 days of delivery.",
  "refundPolicy": "100% refund credited within 48 hours of item pickup."
}
```

### 10. `POST /api/tools/getPaymentOptions`
- **Parameters**: `productId`
- **Response**:
```json
{
  "success": true,
  "paymentMethods": ["Cash on Delivery (COD)", "UPI", "Credit & Debit Cards"],
  "codAvailable": true,
  "message": "Yes! We support Cash on Delivery (COD) as well as UPI, Credit and Debit Cards, and Net Banking."
}
```

### 11. `POST /api/tools/searchSimilarProducts`
- **Parameters**: `productId`, `category`
- **Response**: In-stock alternative suggestions within the same category.

### 12. `POST /api/tools/getOrderStatus`
- **Parameters**: `orderId` or `phone`
- **Response**: Current order status (`Confirmed`, `Shipped`, `Delivered`) and items.

### 13. `POST /api/tools/createOrder`
- **Parameters**: `leadId`, `productId`, `size`, `colour`, `quantity`, `paymentMethod`, `shippingAddress`
- **Response**:
```json
{
  "success": true,
  "orderId": "ORD-291038-592",
  "productName": "TrendVibe Heavyweight Oversized Graphic Tee",
  "quantity": 1,
  "totalAmount": "$27.99",
  "paymentMethod": "Cash on Delivery (COD)",
  "message": "Great! Your order for 1x TrendVibe Heavyweight Oversized Graphic Tee (Off-White, Size XL) has been confirmed. Order reference number is ORD-291038-592."
}
```

---

## 3. Post-Call Webhook & Gemini Analysis

### `POST /api/webhooks/post-call`
Triggered automatically when a voice call terminates. Sends transcript to Google Gemini for structured extraction and calculates lead score.

#### Request Body:
```json
{
  "leadId": "LEAD-291038-4821",
  "conversationId": "conv_891726a8c91",
  "durationSeconds": 127,
  "callStatus": "completed",
  "transcript": "AI: Hello Marcus! ... Customer: Is the black XL available? ... Customer: I want to buy this. Please place order for Off-White XL COD. ... AI: Confirmed!"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Post-call transcript analyzed and stored successfully.",
  "leadId": "LEAD-291038-4821",
  "analysis": {
    "customerName": "Marcus Thorne",
    "phoneNumber": "+15552345678",
    "productName": "TrendVibe Heavyweight Oversized Graphic Tee",
    "customerQuestions": ["Is the black XL available?", "Can I pay by Cash on Delivery?"],
    "requestedSpecs": { "size": "XL", "colour": "Off-White", "quantity": 1 },
    "purchaseIntent": "STRONG_BUY",
    "customerSentiment": "VERY_POSITIVE",
    "leadScore": "Hot",
    "scoreNumerical": 100,
    "summary": "Marcus Thorne called regarding the oversized tee; since black was sold out, accepted Off-White XL and confirmed Cash on Delivery order.",
    "unresolvedQuestions": [],
    "humanHandoff": false,
    "actionPriority": "IMMEDIATE_DISPATCH",
    "suggestedNextStep": "Dispatch order confirmation and track shipping."
  }
}
```

---

## 4. CRM & Google Sheets Endpoints

- `GET /api/products`: List all catalog items with filters
- `GET /api/leads`: List all leads with scores
- `GET /api/calls`: List call history
- `GET /api/conversations`: List intelligence records
- `GET /api/orders`: List placed orders
- `GET /api/followups`: List pending sales follow-ups
- `GET /api/sheets/data`: Returns full 7-section Google Sheets data snapshot
