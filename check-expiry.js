import admin from "firebase-admin";
import axios from "axios";
import moment from "moment-timezone";

function getTimestampField(data) {
  if (data.deadline_date && typeof data.deadline_date.toDate === "function") return data.deadline_date;
  if (data.renewalDate && typeof data.renewalDate.toDate === "function") return data.renewalDate;
  return null;
}

function alertLabel(daysLeft) {
  if (daysLeft === 7) return "1 week";
  if (daysLeft === 2) return "2 days";
  if (daysLeft === 1) return "24 hrs";
  if (daysLeft === 0) return "today";
  return `${daysLeft} days`;
}

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

  const res = await axios.post(
    url,
    { chat_id: process.env.CHAT_ID, text },
    { validateStatus: () => true } // don't throw automatically; we handle below
  );

  console.log("Telegram status:", res.status);
  console.log("Telegram response:", JSON.stringify(res.data));

  if (res.status < 200 || res.status >= 300 || res.data?.ok !== true) {
    throw new Error(`Telegram API failed: HTTP ${res.status} - ${JSON.stringify(res.data)}`);
  }
}

async function checkSubscriptions() {
  console.log("Starting daily subscription expiration check...");

  try {
    if (!process.env.FIREBASE_CONFIG) throw new Error("Missing FIREBASE_CONFIG env var.");
    if (!process.env.BOT_TOKEN || !process.env.CHAT_ID) throw new Error("Missing BOT_TOKEN or CHAT_ID env vars.");

    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

    const db = admin.firestore();

    const tz = "Asia/Kathmandu";
    const now = moment().tz(tz);
    const todayStart = now.clone().startOf("day");
    const windowEnd = now.clone().add(7, "days").endOf("day");

    // You said: "near 7 days, 2 days, 1 day"
    // This sends for ANY subscription expiring within the next 7 days (including today).
    // You can keep the “milestone” wording for 7/2/1/0.
    const snapshot = await db.collection("subscriptions").where("isActive", "==", true).get();

    console.log(`Active subscriptions fetched: ${snapshot.size}`);
    if (snapshot.empty) {
      console.log("No active subscriptions found.");
      return;
    }

    const expiring = [];
    let missingDeadlineCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const ts = getTimestampField(data);

      if (!ts) {
        missingDeadlineCount += 1;
        console.warn(`Skipping ${doc.id}: no valid deadline_date/renewalDate timestamp.`);
        return;
      }

      const deadline = moment(ts.toDate()).tz(tz);

      // Only consider deadlines from start of today through end of day +7
      if (deadline.isBefore(todayStart) || deadline.isAfter(windowEnd)) return;

      const daysLeft = deadline.clone().startOf("day").diff(now.clone().startOf("day"), "days");
      console.log(`Subscription ${doc.id} expires ${deadline.format()} (daysLeft=${daysLeft})`);

      // ✅ "near 7 days" behavior:
      if (daysLeft >= 0 && daysLeft <= 7) {
        expiring.push({
          id: doc.id,
          name: data.name || "(no name)",
          cost: data.cost ?? "(no cost)",
          deadline: deadline.format("MMMM Do YYYY, h:mm:ss a"),
          daysLeft,
        });
      }
    });

    if (expiring.length === 0) {
      console.log(
        `No subscriptions expiring within 7 days. Missing deadline field count: ${missingDeadlineCount}`
      );
      return;
    }

    // Sort: soonest first
    expiring.sort((a, b) => a.daysLeft - b.daysLeft);

    let message = `📣 Subscription Expiration Alerts\n(Checked: ${now.format("YYYY-MM-DD HH:mm z")})\n\n`;

    expiring.forEach((sub) => {
      message += `• ${sub.name}\n`;
      message += `  Alert: ${alertLabel(sub.daysLeft)} before expiry\n`;
      message += `  Expires: ${sub.deadline}\n`;
      message += `  Days Left: ${sub.daysLeft}\n`;
      message += `  Monthly Cost: $${sub.cost}\n`;
      message += `  ID: ${sub.id}\n\n`;
    });

    await sendTelegram(message);

    console.log(`Sent ${expiring.length} expiration alerts to Telegram.`);
  } catch (error) {
    const details = error?.response?.data || error?.message || error;
    console.error("Error during subscription check:", details);
    process.exitCode = 1;
  }
}

checkSubscriptions();
