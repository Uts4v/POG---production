import moment from "moment-timezone";

// Mock Firebase data
const mockSubscriptions = [
  {
    id: "sub1",
    name: "Netflix",
    cost: 15.99,
    deadline_date: { toDate: () => moment().tz("Asia/Kathmandu").add(1, "days").toDate() },
  },
  {
    id: "sub2",
    name: "Spotify",
    cost: 9.99,
    deadline_date: { toDate: () => moment().tz("Asia/Kathmandu").add(3, "days").toDate() },
  },
  {
    id: "sub3",
    name: "Amazon Prime",
    cost: 14.99,
    deadline_date: { toDate: () => moment().tz("Asia/Kathmandu").add(1, "days").toDate() },
  },
];

async function testCheckSubscriptions() {
  console.log("Starting daily subscription expiration check (TEST MODE)...");

  try {
    const now = moment().tz("Asia/Kathmandu");
    const twoDaysFromNow = moment().tz("Asia/Kathmandu").add(2, "days").endOf("day");

    console.log(`Checking subscriptions expiring between ${now.format()} and ${twoDaysFromNow.format()}`);

    // Simulate query
    const expiringSubscriptions = mockSubscriptions.filter(sub => {
      const deadline = moment(sub.deadline_date.toDate()).tz("Asia/Kathmandu");
      return deadline.isBetween(now, twoDaysFromNow, null, '[]');
    }).map(sub => {
      const deadline = moment(sub.deadline_date.toDate()).tz("Asia/Kathmandu");
      const daysLeft = deadline.diff(now, "days");

      return {
        id: sub.id,
        name: sub.name,
        cost: sub.cost,
        deadline: deadline.format("MMMM Do YYYY, h:mm:ss a"),
        daysLeft: daysLeft,
      };
    });

    if (expiringSubscriptions.length === 0) {
      console.log("No expiring subscriptions found.");
      return;
    }

    // Build Markdown message
    let message = "*🚨 Subscription Expiration Alerts 🚨*\n\n";
    expiringSubscriptions.forEach((sub) => {
      message += `*${sub.name}*\n`;
      message += `📅 Expires: ${sub.deadline}\n`;
      message += `⏰ Days Left: ${sub.daysLeft}\n`;
      message += `💰 Monthly Cost: $${sub.cost}\n`;
      message += `🆔 ID: ${sub.id}\n\n`;
    });

    console.log("Generated message:");
    console.log(message);

    // Simulate sending to Telegram
    console.log(`Would send ${expiringSubscriptions.length} expiration alerts to Telegram group.`);

  } catch (error) {
    console.error("Error during subscription check:", error);
  }
}

testCheckSubscriptions();
