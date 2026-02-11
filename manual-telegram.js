import axios from "axios";

const botToken = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

if (!botToken || !chatId) {
  console.error("Missing BOT_TOKEN or CHAT_ID env vars.");
  process.exit(1);
}

const message =
  process.env.TEST_MESSAGE ||
  "Test: manual Telegram message from GitHub Actions.";

async function sendTestMessage() {
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
    });
    console.log("Test message sent.");
  } catch (error) {
    console.error("Failed to send test message:", error?.response?.data || error);
    process.exit(1);
  }
}

sendTestMessage();
