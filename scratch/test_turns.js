import { db } from '../src/db/database.js';
import { ConversationService } from '../src/services/conversationService.js';

async function test() {
  const t1 = await ConversationService.processTurn({ 
    message: 'What is the price after the 20% discount?', 
    productId: 'PROD-CLOTH-001', 
    history: [] 
  });
  console.log('--- TURN 1 SUGGESTIONS (asked price) ---');
  t1.suggestedQuestions.forEach(q => console.log('  -', q.text, `[${q.topic}]`));

  const history1 = [
    { role: 'customer', text: 'What is the price after the 20% discount?' },
    { role: 'ai', text: t1.reply }
  ];
  const t2 = await ConversationService.processTurn({ 
    message: 'What sizes are available for this?', 
    productId: 'PROD-CLOTH-001', 
    history: history1 
  });
  console.log('\n--- TURN 2 SUGGESTIONS (asked sizes) ---');
  t2.suggestedQuestions.forEach(q => console.log('  -', q.text, `[${q.topic}]`));

  const history2 = [
    ...history1,
    { role: 'customer', text: 'What sizes are available for this?' },
    { role: 'ai', text: t2.reply }
  ];
  const t3 = await ConversationService.processTurn({ 
    message: 'I want to place an order', 
    productId: 'PROD-CLOTH-001', 
    history: history2 
  });
  console.log('\n--- TURN 3 SUGGESTIONS (order intent) ---');
  t3.suggestedQuestions.forEach(q => console.log('  -', q.text, `[${q.topic}]`));
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
