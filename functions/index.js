const functions = require("firebase-functions");
const admin = require("firebase-admin");
const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment-timezone");

// Initialize Firebase Admin
admin.initializeApp();

function getTimestampField(data) {
  if (data.deadline_date && typeof data.deadline_date.toDate === "function") return data.deadline_date;
  if (data.renewalDate && typeof data.renewalDate.toDate === "function") return data.renewalDate;
  return null;
}

// Scheduled function to run at 09:00 and 15:00 Kathmandu time
exports.checkExpiringSubscriptions = functions.pubsub
  .schedule("0 9,15 * * *") // Every day at 09:00 and 15:00 Kathmandu
  .timeZone("Asia/Kathmandu")
  .onRun(async () => {
    console.log("Starting daily subscription expiration check...");

    try {
      const botToken =
        (functions.config()?.telegram && functions.config().telegram.token) ||
        process.env.BOT_TOKEN;
      const chatId =
        (functions.config()?.telegram && functions.config().telegram.chat_id) ||
        process.env.CHAT_ID;
      if (!botToken || !chatId) {
        console.error("Missing Telegram config. Set functions config `telegram.token` and `telegram.chat_id` (or env vars BOT_TOKEN/CHAT_ID).");
        return null;
      }
      const bot = new TelegramBot(botToken);

      const db = admin.firestore();
      const now = moment().tz("Asia/Kathmandu");
      const startOfToday = now.clone().startOf("day");
      const sevenDaysFromNow = now.clone().add(7, "days").endOf("day");
      const alertThresholds = new Set([7, 2, 1, 0]); // 1 week, 2 days, 24 hrs, today

      // Query active subscriptions first; filter by deadline in code to support both field variants.
      const snapshot = await db.collection("subscriptions")
        .where("isActive", "==", true)
        .get();

      if (snapshot.empty) {
        console.log("No active subscriptions found.");
        return null;
      }

      const expiringSubscriptions = [];
      let missingDeadlineCount = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const deadlineField = getTimestampField(data);
        if (!deadlineField) {
          missingDeadlineCount += 1;
          console.warn(`Skipping ${doc.id}: no valid deadline_date/renewalDate timestamp.`);
          return;
        }

        const deadline = moment(deadlineField.toDate()).tz("Asia/Kathmandu");
        if (deadline.isBefore(startOfToday) || deadline.isAfter(sevenDaysFromNow)) {
          return;
        }
        const daysLeft = deadline.clone().startOf("day").diff(now.clone().startOf("day"), "days");
        console.log(`Subscription ${doc.id} expires ${deadline.format()} (daysLeft=${daysLeft})`);

        if (alertThresholds.has(daysLeft)) {
          expiringSubscriptions.push({
            id: doc.id,
            name: data.name,
            cost: data.cost,
            deadline: deadline.format("MMMM Do YYYY, h:mm:ss a"),
            daysLeft,
          });
        }
      });

      if (expiringSubscriptions.length === 0) {
        console.log(`No subscriptions hit alert thresholds (7, 2, 1, 0 days). Missing deadline field count: ${missingDeadlineCount}`);
        return null;
      }

      const alertLabel = (daysLeft) => {
        if (daysLeft === 7) return "1 week";
        if (daysLeft === 2) return "2 days";
        if (daysLeft === 1) return "24 hrs";
        if (daysLeft === 0) return "today";
        return `${daysLeft} days`;
      };

      let message = "Subscription Expiration Alerts\n\n";
      expiringSubscriptions.forEach((sub) => {
        message += `${sub.name}\n`;
        message += `Alert: ${alertLabel(sub.daysLeft)} before expiry\n`;
        message += `Expires: ${sub.deadline}\n`;
        message += `Days Left: ${sub.daysLeft}\n`;
        message += `Monthly Cost: $${sub.cost}\n`;
        message += `ID: ${sub.id}\n\n`;
      });

      // Send message to Telegram group
      await bot.sendMessage(chatId, message);

      console.log(`Sent ${expiringSubscriptions.length} expiration alerts to Telegram group.`);
    } catch (error) {
      console.error("Error during subscription check:", error);
    }

    return null;
  });

// HTTP function for user signup with company creation
exports.createUserWithCompany = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "OPTIONS, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).send({ error: "Method not allowed" });
  }

  const { email, password, fullName, companyName } = req.body;

  if (!email || !password || !fullName || !companyName) {
    return res.status(400).send({ error: "Missing required fields" });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      displayName: fullName,
      password,
    });

    const companyRef = admin.firestore().collection("companies").doc();
    const companyId = companyRef.id;

    await companyRef.set({
      name: companyName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      adminUserId: userRecord.uid,
    });

    await admin.firestore().collection("companies").doc(companyId).collection("employees").doc(userRecord.uid).set({
      id: userRecord.uid,
      userId: userRecord.uid,
      fullName,
      email,
      designation: "Employee",
      teaPoints: 0,
      role: "admin",
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.firestore().collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      companyId,
      role: "admin",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { companyId });

    return res.status(200).send({ uid: userRecord.uid, companyId });
  } catch (error) {
    console.error("Error creating user with company:", error);
    return res.status(500).send({ error: "Failed to create user" });
  }
});
