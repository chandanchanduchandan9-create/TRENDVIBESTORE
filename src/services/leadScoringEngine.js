/**
 * Lead Scoring Engine
 * Analyzes initial enquiry text and post-call conversation signals
 * to classify leads into Hot, Warm, or Cold with clear rationale.
 */
export class LeadScoringEngine {
  /**
   * Score signals based on initial text enquiry
   */
  static scoreInitialEnquiry(text = '') {
    const lower = text.toLowerCase();
    let score = 50; // default baseline for an enquiry
    const signals = [];

    // Strong buy intent triggers (+30)
    const strongBuyKeywords = [
      'buy', 'order', 'purchase', 'want to buy', 'how to order', 'how can i order',
      'i want this', 'book this', 'cod', 'cash on delivery', 'payment link',
      'two pieces', '2 pieces', '3 pieces', 'deliver to', 'deliver today'
    ];

    // High interest triggers (+15)
    const highInterestKeywords = [
      'available', 'stock', 'price', 'discount', 'offer', 'size', 'xl', 'large',
      'medium', 'small', 'colour', 'color', 'warranty', 'fast shipping'
    ];

    // Low intent triggers (-20)
    const lowIntentKeywords = [
      'just looking', 'not interested', 'too expensive', 'waste', 'fake',
      'checking only', 'random', 'cancel'
    ];

    strongBuyKeywords.forEach(k => {
      if (lower.includes(k)) {
        score += 25;
        signals.push(`Explicit purchase intent: "${k}"`);
      }
    });

    highInterestKeywords.forEach(k => {
      if (lower.includes(k)) {
        score += 10;
        signals.push(`Specific product parameter inquiry: "${k}"`);
      }
    });

    lowIntentKeywords.forEach(k => {
      if (lower.includes(k)) {
        score -= 30;
        signals.push(`Low interest / friction signal: "${k}"`);
      }
    });

    // Clamp score 0 - 100
    score = Math.max(10, Math.min(100, score));

    let leadScore = 'Warm';
    if (score >= 75) leadScore = 'Hot';
    else if (score < 40) leadScore = 'Cold';

    return {
      score,
      leadScore,
      signals
    };
  }

  /**
   * Comprehensive scoring incorporating post-call Gemini analysis
   */
  static scoreCallAnalysis({
    purchaseIntent = 'INTERESTED_EXPLORING',
    sentiment = 'NEUTRAL',
    customerQuestions = [],
    requestedSpecs = {},
    unresolvedQuestions = [],
    orderPlaced = false
  }) {
    let score = 50;
    const reasons = [];

    // 1. Order Placed on Call
    if (orderPlaced) {
      return {
        score: 100,
        leadScore: 'Hot',
        actionPriority: 'IMMEDIATE_DISPATCH',
        nextStep: 'Dispatch order confirmation and track shipping.',
        reasons: ['Customer confirmed verbal order during voice call']
      };
    }

    // 2. Purchase Intent Evaluation
    switch (purchaseIntent) {
      case 'STRONG_BUY':
        score += 35;
        reasons.push('High conversion purchase intent identified');
        break;
      case 'INTERESTED_EXPLORING':
        score += 15;
        reasons.push('Customer actively exploring specific details');
        break;
      case 'PRICE_SENSITIVE':
        score += 5;
        reasons.push('Customer interested but evaluating price/discount');
        break;
      case 'JUST_BROWSING':
        score -= 20;
        reasons.push('Casual browsing with no immediate intent');
        break;
      case 'NOT_INTERESTED':
        score -= 40;
        reasons.push('Explicit disinterest expressed');
        break;
      default:
        break;
    }

    // 3. Sentiment Impact
    switch (sentiment) {
      case 'VERY_POSITIVE':
        score += 15;
        reasons.push('Very positive caller sentiment');
        break;
      case 'POSITIVE':
        score += 10;
        reasons.push('Positive caller sentiment');
        break;
      case 'NEUTRAL':
        break;
      case 'HESITANT':
        score -= 10;
        reasons.push('Customer expressed hesitation');
        break;
      case 'NEGATIVE':
        score -= 25;
        reasons.push('Negative sentiment detected');
        break;
      default:
        break;
    }

    // 4. Specific Parameters Requested (Size, Colour, Storage, etc.)
    const specKeys = Object.keys(requestedSpecs).filter(k => requestedSpecs[k]);
    if (specKeys.length > 0) {
      score += 10;
      reasons.push(`Specific parameters requested (${specKeys.join(', ')})`);
    }

    // 5. Engagement depth
    if (customerQuestions.length >= 3) {
      score += 10;
      reasons.push(`High engagement: ${customerQuestions.length} questions asked`);
    }

    // 6. Unresolved questions penalty or handoff trigger
    if (unresolvedQuestions.length > 0) {
      reasons.push(`${unresolvedQuestions.length} questions require human follow-up`);
    }

    score = Math.max(5, Math.min(100, score));

    let leadScore = 'Warm';
    let actionPriority = 'NORMAL';
    let nextStep = 'Send follow-up product brochure via WhatsApp within 24 hours.';

    if (score >= 80) {
      leadScore = 'Hot';
      actionPriority = 'URGENT';
      nextStep = 'Sales representative call within 15 minutes with instant checkout link & offer.';
    } else if (score >= 40) {
      leadScore = 'Warm';
      actionPriority = 'HIGH';
      nextStep = 'Send tailored WhatsApp message with requested variant availability and 10% coupon.';
    } else {
      leadScore = 'Cold';
      actionPriority = 'LOW';
      nextStep = 'Add to weekly automated social promotional broadcast.';
    }

    return {
      score,
      leadScore,
      actionPriority,
      nextStep,
      reasons
    };
  }
}
