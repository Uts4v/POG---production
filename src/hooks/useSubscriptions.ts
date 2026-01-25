import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Subscription } from "@/integrations/firebase/notes-types";

export const useSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const subsQuery = query(
          collection(db, "subscriptions"),
          where("isActive", "==", true)
        );

        const snapshot = await getDocs(subsQuery);
        const fetchedSubs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Subscription[];

        setSubscriptions(fetchedSubs);
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  return { subscriptions, loading };
};