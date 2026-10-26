import assert from 'assert';
import { ConversationService } from '../src/services/conversationService.js';
import { db } from '../src/db/database.js';

async function runTest() {
  console.log('🧪 Starting Verification Test: Address, Login & AI Speech Control...');

  // 1. Negative reaction test
  console.log('\n--- 1. Testing Customer Negative Reaction ("not interested") ---');
  const negResult = await ConversationService.processTurn({
    message: "I am not interested, cancel",
    productId: "PROD-MED-015"
  });
  console.log('Tool called:', negResult.toolCalled);
  console.log('End call:', negResult.endCall);
  console.log('Stop taking input:', negResult.stopTakingInput);
  assert.strictEqual(negResult.toolCalled, 'endCallPolite');
  assert.strictEqual(negResult.endCall, true);
  assert.strictEqual(negResult.stopTakingInput, true);
  console.log('✅ PASS: Negative reaction stops conversation and triggers polite end.');

  // 2. Order confirmation test
  console.log('\n--- 2. Testing Order Confirmation ("yes please confirm order") ---');
  const orderResult = await ConversationService.processTurn({
    message: "yes please confirm the order",
    productId: "PROD-MED-015"
  });
  console.log('Tool called:', orderResult.toolCalled);
  console.log('Order ID:', orderResult.orderData?.orderId);
  console.log('End call:', orderResult.endCall);
  console.log('Order confirmed:', orderResult.orderConfirmed);
  assert.strictEqual(orderResult.toolCalled, 'createOrder');
  assert.strictEqual(orderResult.endCall, true);
  assert.strictEqual(orderResult.orderConfirmed, true);
  assert.strictEqual(orderResult.stopTakingInput, true);
  assert(orderResult.orderData && orderResult.orderData.orderId, 'Order ID must exist');
  console.log('✅ PASS: Order confirmation successfully creates order and signals AI to stop talking.');

  // 3. Customer Address & Account Creation test via server API
  console.log('\n--- 3. Testing Address Intake & Account Creation API ---');
  const testMobile = '9876543210';
  const testOrderId = orderResult.orderData.orderId;
  const addressPayload = {
    orderId: testOrderId,
    fullName: 'Ananya Sharma',
    mobile: testMobile,
    email: 'ananya@gmail.com',
    pincode: '560038',
    houseNo: 'Flat 302, Lake View',
    area: 'Indiranagar 100ft Road',
    landmark: 'Near Metro Station',
    city: 'Bengaluru',
    state: 'Karnataka',
    addressType: 'Home'
  };

  const saveRes = await fetch('http://localhost:3000/api/customer/address-and-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addressPayload)
  });
  const saveData = await saveRes.json();
  console.log('Address save response success:', saveData.success);
  console.log('Customer created/updated ID:', saveData.customer?.id);
  assert.strictEqual(saveData.success, true);
  assert.strictEqual(saveData.customer.mobile, testMobile);
  console.log('✅ PASS: Delivery address saved and customer account created.');

  // 4. Customer Login test with Mobile
  console.log('\n--- 4. Testing Customer Login via Mobile ---');
  const loginRes = await fetch('http://localhost:3000/api/customer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testMobile })
  });
  const loginData = await loginRes.json();
  console.log('Login success:', loginData.success);
  console.log('Logged-in customer name:', loginData.customer?.fullName);
  console.log('Orders found:', loginData.orders?.length);
  assert.strictEqual(loginData.success, true);
  assert.strictEqual(loginData.customer.mobile, testMobile);
  assert(loginData.orders.some(o => o.id === testOrderId), 'Order must be listed in customer account');
  console.log('✅ PASS: Customer login succeeds and displays linked order.');

  console.log('\n=======================================================');
  console.log('🎉 ALL ADDRESS, LOGIN & SPEECH TESTS PASSED!');
  console.log('=======================================================');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
