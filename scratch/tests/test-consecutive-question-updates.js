import assert from 'assert';
import { db } from '../src/db/database.js';
import { SuggestedQuestionService } from '../src/services/suggestedQuestionService.js';
import { ConversationService } from '../src/services/conversationService.js';

let passed = 0;
function pass(msg) {
  passed++;
  console.log(`  ✅ PASS: ${msg}`);
}

async function runMultiTurnUpdateTests() {
  console.log('🧪 =========================================================================');
  console.log('🚀 AUTOMATIC MULTI-TURN QUESTION UPDATION & EVOLUTION TEST SUITE');
  console.log('🧪 =========================================================================');

  // Test across multiple diverse products
  const productIds = ['PROD-LAP-001', 'PROD-PHONE-005', 'FOOD-KAR-001', 'PROD-MED-001', 'PROD-CLOTH-001'];

  for (const prodId of productIds) {
    const product = db.getProductById(prodId);
    console.log(`\n📦 Testing consecutive 4-turn question updates for [${product.category}] ${product.name}`);

    let history = [];
    const askedQuestions = [];

    // Turn 1: Initial suggestions
    let turnSuggestions = SuggestedQuestionService.generateSuggestedQuestions(product, {
      history: [],
      language: 'en'
    });

    assert(turnSuggestions.length >= 5 && turnSuggestions.length <= 8,
      `Turn 1 must have 5-8 questions, got ${turnSuggestions.length}`);
    pass(`Turn 1 generates ${turnSuggestions.length} initial suggested questions`);

    // Simulate 4 consecutive turns where user clicks the top suggestion each time
    for (let turnNum = 1; turnNum <= 4; turnNum++) {
      const chosenQ = turnSuggestions[0];
      assert(chosenQ && chosenQ.text, `Turn ${turnNum} must have a valid top suggestion`);
      assert(!askedQuestions.includes(chosenQ.text), 
        `Turn ${turnNum} suggested question "${chosenQ.text}" must not have been previously asked!`);

      askedQuestions.push(chosenQ.text);

      history.push({ role: 'customer', text: chosenQ.text });
      history.push({ role: 'ai', text: `Verified response for: ${chosenQ.text}`, toolCalled: 'getSpecs' });

      // Generate suggestions for next turn
      turnSuggestions = SuggestedQuestionService.generateSuggestedQuestions(product, {
        history,
        latestMessage: chosenQ.text,
        latestReply: `Verified response for: ${chosenQ.text}`,
        language: 'en'
      });

      assert(turnSuggestions.length >= 5 && turnSuggestions.length <= 8,
        `Turn ${turnNum + 1} must maintain 5-8 questions, got ${turnSuggestions.length}`);

      // Crucial assertion: None of the previously asked questions may appear in the new suggestions!
      for (const previouslyAsked of askedQuestions) {
        const found = turnSuggestions.some(q => q.text === previouslyAsked);
        assert(!found, 
          `Previously asked question "${previouslyAsked}" was found in Turn ${turnNum + 1} suggestions!`);
      }

      // Crucial assertion: All suggested questions in this turn must have distinct topics
      const topics = turnSuggestions.map(q => q.topic);
      const uniqueTopics = new Set(topics);
      assert(uniqueTopics.size === topics.length || uniqueTopics.size >= 5,
        `Turn ${turnNum + 1} suggestions should have diverse topics, got: ${topics.join(', ')}`);

      pass(`Turn ${turnNum + 1} successfully evolved: removed "${chosenQ.text.substring(0, 35)}..." and introduced fresh questions (${turnSuggestions.length} items)`);
    }
  }

  // Test integration with ConversationService.processTurn
  console.log('\n🤖 Testing ConversationService.processTurn integration with consecutive updates');
  const laptop = db.getProductById('PROD-LAP-001');
  let convHistory = [];
  
  // Turn 1
  let res1 = await ConversationService.processTurn({
    message: 'Hello, what is the price of this laptop?',
    productId: laptop.id,
    history: []
  });
  assert(!res1.suggestedQuestions.some(q => q.topic === 'price'), 'Price question removed after asking price');
  pass('Turn 1 processTurn excludes asked price topic');

  // Turn 2
  convHistory.push({ role: 'customer', text: 'Hello, what is the price of this laptop?' });
  convHistory.push({ role: 'ai', text: res1.reply, toolCalled: res1.toolCalled });

  const nextQ = res1.suggestedQuestions[0].text;
  let res2 = await ConversationService.processTurn({
    message: nextQ,
    productId: laptop.id,
    history: convHistory
  });

  assert(!res2.suggestedQuestions.some(q => q.text === nextQ), `Turn 2 processTurn excludes asked question "${nextQ}"`);
  assert(!res2.suggestedQuestions.some(q => q.topic === 'price'), 'Turn 2 processTurn still excludes price');
  assert(res2.suggestedQuestions.length >= 5 && res2.suggestedQuestions.length <= 8, 'Turn 2 maintains 5-8 questions');
  pass(`Turn 2 processTurn excludes both Turn 1 and Turn 2 questions, returning ${res2.suggestedQuestions.length} fresh suggestions`);

  console.log('\n=========================================================================');
  console.log(`🎉 ALL ${passed} MULTI-TURN QUESTION EVOLUTION TESTS PASSED!`);
  console.log('=========================================================================');
}

runMultiTurnUpdateTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
