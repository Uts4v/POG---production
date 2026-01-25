import { motion } from "framer-motion";
import { Coffee, Leaf, Clock, CheckCircle2 } from "lucide-react";
import type { TimerStatus } from "@/hooks/useWorkSession";

interface StatusBadgeProps {
  status: TimerStatus;
}

const statusConfig = {
  idle: {
    label: "Ready to Start",
    icon: Clock,
    className: "status-idle",
  },
  working: {
    label: "Working",
    icon: Leaf,
    className: "status-working",
  },
  break: {
    label: "On Break",
    icon: Coffee,
    className: "status-break",
  },
  completed: {
    label: "Day Complete",
    icon: CheckCircle2,
    className: "status-working",
  },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${config.className}`}
    >
      <motion.div
        animate={
          status === "working" || status === "break"
            ? { scale: [1, 1.2, 1] }
            : {}
        }
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Icon className="w-4 h-4" />
      </motion.div>
      <span>{config.label}</span>
      {(status === "working" || status === "break") && (
        <motion.span
          className="w-2 h-2 rounded-full bg-current"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};
