import moment from "moment-timezone";

// Mock Firebase data
const mockSubscriptions = [
  {
    id: "sub1",
    name: "Netflix",
    cost: 15.99,
    deadline_date: { toDate: () => moment().tz("Asia/Kathmandu").add(1, "days").hour(5).minute(45).second(0).toDate() },
  },
  {
    id: "sub2",
    name: "Spotify",
    cost: 9.99,
    deadline_date: { toDate: () => moment().tz("Asia/Kathmandu").add(3, "days").hour(5).minute(45).second(0).toDate() },
  },
  {
    id: "sub3",
    name: "Amazon Prime",
    cost: 14.99,
    deadline_date: { toDate: () => moment().tz("Asia/Kathmandu").add(1, "days").hour(5).minute(45).second(0).toDate() },
  },
];

function alertLabel(daysLeft) {
  if (daysLeft === 7) return "1 week";
  if (daysLeft === 2) return "2 days";
  if (daysLeft === 1) return "24 hrs";
  if (daysLeft === 0) return "today";
  return `${daysLeft} days`;
}

async function testCheckSubscriptions() {
  console.log("Starting daily subscription expiration check (TEST MODE)...");

  try {
    const tz = "Asia/Kathmandu";
    const now = moment().tz(tz);

    const startOfToday = now.clone().startOf("day");
    const endOfWindow = now.clone().add(7, "days").endOf("day");

    // ✅ Choose ONE behavior:
    const MODE = "MILESTONES"; // "MILESTONES" or "WITHIN_7_DAYS"

    const milestoneThresholds = new Set([7, 2, 1, 0]); // exact days

    console.log(`Now: ${now.format()}`);
    console.log(`Window: ${startOfToday.format()} → ${endOfWindow.format()}`);
    console.log(`Mode: ${MODE}`);

    const expiringSubscriptions = mockSubscriptions
      .map((sub) => {
        const deadlineDate = sub.deadline_date.toDate(); // ✅ call once
        const deadline = moment(deadlineDate).tz(tz);

        const daysLeft = deadline.clone().startOf("day").diff(startOfToday, "days");

        return {
          id: sub.id,
          name: sub.name,
          cost: sub.cost,
          deadlineMoment: deadline,
          deadline: deadline.format("MMMM Do YYYY, h:mm:ss a"),
          daysLeft,
        };
      })
      .filter((sub) => {
        // only within window
        if (sub.deadlineMoment.isBefore(startOfToday) || sub.deadlineMoment.isAfter(endOfWindow)) return false;

        // mode logic
        if (MODE === "WITHIN_7_DAYS") return sub.daysLeft >= 0 && sub.daysLeft <= 7;
        return milestoneThresholds.has(sub.daysLeft);
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    if (expiringSubscriptions.length === 0) {
      console.log("No subscriptions matched alert rules.");
      return;
    }

    let message = "*🚨 Subscription Expiration Alerts 🚨*\n\n";
    expiringSubscriptions.forEach((sub) => {
      message += `*${sub.name}*\n`;
      message += `Alert: ${alertLabel(sub.daysLeft)} before expiry\n`;
      message += `📅 Expires: ${sub.deadline}\n`;
      message += `⏰ Days Left: ${sub.daysLeft}\n`;
      message += `💰 Monthly Cost: $${sub.cost}\n`;
      message += `🆔 ID: ${sub.id}\n\n`;
    });

    console.log("Generated message:\n");
    console.log(message);

    console.log(`Would send ${expiringSubscriptions.length} expiration alerts to Telegram group.`);
  } catch (error) {
    console.error("Error during subscription check:", error?.message || error);
  }
}

testCheckSubscriptions();
