import admin from "firebase-admin";
import axios from "axios";
import moment from "moment-timezone";

// Initialize with a Service Account
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkSubscriptions() {
  console.log("Starting daily subscription expiration check...");

  try {
    const now = moment().tz("Asia/Kathmandu");
    const twoDaysFromNow = moment().tz("Asia/Kathmandu").add(2, "days").endOf("day");

    // Query active subscriptions expiring within 2 days or today
    const snapshot = await db.collection("subscriptions")
      .where("isActive", "==", true)
      .where("deadline_date", ">=", admin.firestore.Timestamp.fromDate(now.toDate()))
      .where("deadline_date", "<=", admin.firestore.Timestamp.fromDate(twoDaysFromNow.toDate()))
      .get();

    if (snapshot.empty) {
      console.log("No expiring subscriptions found.");
      return;
    }

    const expiringSubscriptions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const deadline = moment(data.deadline_date.toDate()).tz("Asia/Kathmandu");
      const daysLeft = deadline.diff(now, "days");

      expiringSubscriptions.push({
        id: doc.id,
        name: data.name,
        cost: data.cost,
        deadline: deadline.format("MMMM Do YYYY, h:mm:ss a"),
        daysLeft: daysLeft,
      });
    });

    // Build Markdown message
    let message = "*🚨 Subscription Expiration Alerts 🚨*\n\n";
    expiringSubscriptions.forEach((sub) => {
      message += `*${sub.name}*\n`;
      message += `📅 Expires: ${sub.deadline}\n`;
      message += `⏰ Days Left: ${sub.daysLeft}\n`;
      message += `💰 Monthly Cost: $${sub.cost}\n`;
      message += `🆔 ID: ${sub.id}\n\n`;
    });

    // Send message to Telegram group
    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      chat_id: process.env.CHAT_ID,
      text: message,
      parse_mode: "Markdown"
    });

    console.log(`Sent ${expiringSubscriptions.length} expiration alerts to Telegram group.`);

  } catch (error) {
    console.error("Error during subscription check:", error);
  }
}

checkSubscriptions();
