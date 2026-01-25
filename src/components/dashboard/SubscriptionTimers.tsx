import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, DollarSign } from "lucide-react";
import { Subscription } from "@/integrations/firebase/notes-types";

interface SubscriptionTimerProps {
  subscription: Subscription;
}

const SubscriptionTimer = ({ subscription }: SubscriptionTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Handle both old (renewalDate) and new (deadline_date) field structures
      const deadlineDate = subscription.deadline_date || subscription.renewalDate;
      if (!deadlineDate) return;

      const diffTime = deadlineDate.toDate().getTime() - now.getTime();

      if (diffTime <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.ceil(diffTime / (1000 * 60));

      if (diffDays > 1) {
        setTimeLeft(`${diffDays} days left`);
      } else if (diffHours > 1) {
        setTimeLeft(`${diffHours} hours left`);
      } else if (diffMinutes > 1) {
        setTimeLeft(`${diffMinutes} minutes left`);
      } else {
        setTimeLeft("Less than 1 minute left");
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000 * 60); // Update every minute

    return () => clearInterval(timer);
  }, [subscription.deadline_date, subscription.renewalDate]);

  const getUrgencyColor = () => {
    const now = new Date();
    // Handle both old (renewalDate) and new (deadline_date) field structures
    const deadlineDate = subscription.deadline_date || subscription.renewalDate;
    if (!deadlineDate) return "outline";

    const diffDays = Math.ceil((deadlineDate.toDate().getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "destructive";
    if (diffDays <= 1) return "destructive"; // Critical: expires within 24 hours
    if (diffDays <= 3) return "destructive"; // High priority
    if (diffDays <= 7) return "secondary"; // Medium priority
    return "outline"; // Low priority
  };

  const getUrgencyIcon = () => {
    const now = new Date();
    // Handle both old (renewalDate) and new (deadline_date) field structures
    const deadlineDate = subscription.deadline_date || subscription.renewalDate;
    if (!deadlineDate) return <Calendar className="w-4 h-4" />;

    const diffDays = Math.ceil((deadlineDate.toDate().getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return <AlertTriangle className="w-4 h-4" />;
    if (diffDays <= 1) return <AlertTriangle className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{subscription.name}</CardTitle>
          <Badge variant={getUrgencyColor()} className="flex items-center gap-1">
            {getUrgencyIcon()}
            {timeLeft}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Renewed: {subscription.renewed_date ? subscription.renewed_date.toDate().toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>${subscription.cost}/month</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Deadline: {(subscription.deadline_date || subscription.renewalDate)?.toDate().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface SubscriptionTimersProps {
  subscriptions: Subscription[];
}

export const SubscriptionTimers = ({ subscriptions }: SubscriptionTimersProps) => {
  if (subscriptions.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <h2 className="text-2xl font-semibold mb-4 text-center">Subscription Renewals</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((subscription) => (
          <SubscriptionTimer key={subscription.id} subscription={subscription} />
        ))}
      </div>
    </div>
  );
};