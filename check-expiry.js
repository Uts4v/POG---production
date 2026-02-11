import admin from "firebase-admin";
import axios from "axios";
import moment from "moment-timezone";

function getTimestampField(data) {
  if (data.deadline_date && typeof data.deadline_date.toDate === "function") return data.deadline_date;
  if (data.renewalDate && typeof data.renewalDate.toDate === "function") return data.renewalDate;
  return null;
}

async function checkSubscriptions() {
  console.log("Starting daily subscription expiration check...");

  try {
    if (!process.env.FIREBASE_CONFIG) {
      console.error("Missing FIREBASE_CONFIG env var.");
      return;
    }
    if (!process.env.BOT_TOKEN || !process.env.CHAT_ID) {
      console.error("Missing BOT_TOKEN or CHAT_ID env vars.");
      return;
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    if (!admin.apps.length) {
      admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
    }
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
      return;
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
          daysLeft: daysLeft,
        });
      }
    });

    if (expiringSubscriptions.length === 0) {
      console.log(`No subscriptions hit alert thresholds (7, 2, 1, 0 days). Missing deadline field count: ${missingDeadlineCount}`);
      return;
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

    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      chat_id: process.env.CHAT_ID,
      text: message,
    });

    console.log(`Sent ${expiringSubscriptions.length} expiration alerts to Telegram group.`);
  } catch (error) {
    console.error("Error during subscription check:", error);
  }
}

checkSubscriptions();
