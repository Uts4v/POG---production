import { useEffect } from "react";
import { collection, getDocs, addDoc, Timestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export const useSubscriptionChecker = () => {
  const { user, profile } = useAuthContext();

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;

    const checkSubscriptions = async () => {
      try {
        const subsSnapshot = await getDocs(collection(db, "subscriptions"));
        const subscriptions = subsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const today = new Date();

        for (const sub of subscriptions) {
          if (!sub.isActive) continue;

          const deadlineDate = sub.deadline_date.toDate();
          const daysUntilDeadline = Math.floor(
            (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Notify 7 days before deadline
          if (daysUntilDeadline <= 7 && daysUntilDeadline >= 0) {
            const lastNotified = sub.lastNotificationSent?.toDate();
            const shouldNotify =
              !lastNotified ||
              today.getTime() - lastNotified.getTime() > 1000 * 60 * 60 * 24;

            if (shouldNotify) {
              await addDoc(collection(db, "notes"), {
                senderId: "system",
                senderName: "System",
                recipientId: "all",
                recipientName: "All Employees",
                subject: `Subscription Deadline Approaching: ${sub.name}`,
                message: `The ${sub.name} subscription deadline is in ${daysUntilDeadline} days on ${deadlineDate.toLocaleDateString()}. 

Cost: $${sub.cost}/month
Renewed: ${sub.renewed_date.toDate().toLocaleDateString()}

Please renew to continue service.`,
                priority: daysUntilDeadline <= 3 ? "high" : "normal",
                isRead: false,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });

              await updateDoc(doc(db, "subscriptions", sub.id), {
                lastNotificationSent: Timestamp.now(),
              });
            }
          }
        }
      } catch (error) {
        console.error("Error checking subscriptions:", error);
      }
    };

    checkSubscriptions();
    const interval = setInterval(checkSubscriptions, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, [user, profile]);
};