import axios from 'axios';

const BOT_TOKEN = '8208644784:AAHMUPJ3-AUr6wetb3MavhDDHE7HJ3tRaiE';
const CHAT_ID = '-1003873673042';

async function testTelegram() {
  try {
    // Test 1: Get bot info
    console.log('1. Testing getMe...');
    const me = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    console.log('Bot info:', JSON.stringify(me.data, null, 2));

    // Test 2: Get chat info
    console.log('\n2. Testing getChat...');
    const chat = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${CHAT_ID}`);
    console.log('Chat info:', JSON.stringify(chat.data, null, 2));

    // Test 3: Send message
    console.log('\n3. Testing sendMessage...');
    const message = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: 'Test message from local Node.js script!'
    });
    console.log('Message sent:', JSON.stringify(message.data, null, 2));

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testTelegram();
