import { motion } from "framer-motion";
import { Play, Pause, Square, Coffee, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimerStatus } from "@/hooks/useWorkSession";

interface ActionButtonsProps {
  status: TimerStatus;
  onClockIn: () => void;
  onClockOut: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const ActionButtons = ({
  status,
  onClockIn,
  onClockOut,
  onPause,
  onResume,
  onReset,
}: ActionButtonsProps) => {
  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  if (status === "idle") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.button
          className="tea-button-primary flex items-center gap-3 text-lg px-8 py-4"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={onClockIn}
        >
          <Play className="w-5 h-5" />
          Clock In
        </motion.button>
        <p className="text-sm text-muted-foreground">Start your work day</p>
      </motion.div>
    );
  }

  if (status === "working") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex gap-3">
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              variant="outline"
              size="lg"
              onClick={onPause}
              className="flex items-center gap-2 border-accent text-accent hover:bg-accent/10"
            >
              <Coffee className="w-4 h-4" />
              Take a Break
            </Button>
          </motion.div>
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              variant="destructive"
              size="lg"
              onClick={onClockOut}
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Clock Out
            </Button>
          </motion.div>
        </div>
        <p className="text-sm text-muted-foreground">You're doing great! 🍃</p>
      </motion.div>
    );
  }

  if (status === "break") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.button
          className="tea-button-primary flex items-center gap-3 text-lg px-8 py-4"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={onResume}
        >
          <Play className="w-5 h-5" />
          Resume Work
        </motion.button>
        <p className="text-sm text-muted-foreground">Enjoy your tea break ☕</p>
      </motion.div>
    );
  }

  // Completed state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4"
    >
      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          variant="outline"
          size="lg"
          onClick={onReset}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Start New Day
        </Button>
      </motion.div>
      <p className="text-sm text-muted-foreground">
        Great work today! View your Grind Card below.
      </p>
    </motion.div>
  );
};
