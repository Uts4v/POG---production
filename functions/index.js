const functions = require("firebase-functions");
const admin = require("firebase-admin");
const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment-timezone");

// Initialize Firebase Admin
admin.initializeApp();

// Telegram Bot setup
const botToken = "8208644784:AAHMUPJ3-AUr6wetb3MavhDDHE7HJ3tRaiE";
const chatId = "-1003873673042"; // Group Chat ID
const bot = new TelegramBot(botToken);

// Scheduled function to run every 24 hours
exports.checkExpiringSubscriptions = functions.pubsub
  .schedule("0 0 * * *") // Every day at midnight UTC
  .timeZone("Asia/Kathmandu")
  .onRun(async (context) => {
    console.log("Starting daily subscription expiration check...");

    try {
      const db = admin.firestore();
      const now = moment().tz("Asia/Kathmandu");
      const sevenDaysFromNow = moment().tz("Asia/Kathmandu").add(7, "days").endOf("day");
      const alertThresholds = new Set([7, 2, 1]); // 1 week, 2 days, 24 hrs

      // Query active subscriptions expiring within 7 days
      const subscriptionsRef = db.collection("subscriptions");
      const snapshot = await subscriptionsRef
        .where("isActive", "==", true)
        .where("deadline_date", ">=", admin.firestore.Timestamp.fromDate(now.toDate()))
        .where("deadline_date", "<=", admin.firestore.Timestamp.fromDate(sevenDaysFromNow.toDate()))
        .get();

      if (snapshot.empty) {
        console.log("No expiring subscriptions found.");
        return null;
      }

      const expiringSubscriptions = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const deadline = moment(data.deadline_date.toDate()).tz("Asia/Kathmandu");
        const daysLeft = deadline.startOf("day").diff(now.startOf("day"), "days");

        if (alertThresholds.has(daysLeft)) {
          expiringSubscriptions.push({
            id: doc.id,
            name: data.name,
            cost: data.cost,
            deadline: deadline.format("MMMM Do YYYY, h:mm:ss a"),
            daysLeft: daysLeft,
          });
        }
      });

      if (expiringSubscriptions.length === 0) {
        console.log("No subscriptions hit alert thresholds (7, 2, 1 days).");
        return null;
      }

      const alertLabel = (daysLeft) => {
        if (daysLeft === 7) return "1 week";
        if (daysLeft === 2) return "2 days";
        if (daysLeft === 1) return "24 hrs";
        return `${daysLeft} days`;
      };

      // Build Markdown message
      let message = "*🚨 Subscription Expiration Alerts 🚨*\n\n";
      expiringSubscriptions.forEach((sub) => {
        message += `*${sub.name}*\n`;
        message += `Alert: ${alertLabel(sub.daysLeft)} before expiry\n`;
        message += `📅 Expires: ${sub.deadline}\n`;
        message += `⏰ Days Left: ${sub.daysLeft}\n`;
        message += `💰 Monthly Cost: $${sub.cost}\n`;
        message += `🆔 ID: ${sub.id}\n\n`;
      });

      // Send message to Telegram group
      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

      console.log(`Sent ${expiringSubscriptions.length} expiration alerts to Telegram group.`);

    } catch (error) {
      console.error("Error during subscription check:", error);
    }

    return null;
  });
