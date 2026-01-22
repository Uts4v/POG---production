import { motion } from "framer-motion";
import { formatTime, TimerStatus } from "@/hooks/useWorkSession";

interface TimerDisplayProps {
  time: number;
  breakTime: number;
  status: TimerStatus;
}

export const TimerDisplay = ({ time, breakTime, status }: TimerDisplayProps) => {
  const isActive = status === "working" || status === "break";

  const displayTime = status === "break" ? breakTime : time;
  const label = status === "break" ? "Break Time" : "Time Worked";

  return (
    <div className="relative">
      {/* Main Timer */}
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        {/* Decorative ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-64 h-64 rounded-full border-4 border-primary/20"
            animate={isActive ? { rotate: 360 } : {}}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute w-56 h-56 rounded-full border-2 border-accent/30"
            animate={isActive ? { rotate: -360 } : {}}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Timer value */}
        <motion.div
          className="relative z-10 flex flex-col items-center justify-center w-64 h-64 rounded-full bg-card"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <motion.span
            className="font-display text-6xl font-semibold text-foreground tracking-tight"
            key={displayTime}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
          >
            {formatTime(displayTime)}
          </motion.span>
          <span className="text-sm text-muted-foreground mt-2">
            {label}
            {status === "idle" && "Ready"}
            {status === "completed" && "Total Time"}
          </span>

          {/* Steam effect for break */}
          {status === "break" && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-8 rounded-full bg-accent/40"
                  animate={{
                    y: [-20, -40],
                    opacity: [0.5, 0],
                    scaleY: [1, 1.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Break time indicator */}
      {breakTime > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-center justify-center gap-2 text-muted-foreground"
        >
          <span className="text-sm">Break Time:</span>
          <span className="font-medium text-accent">{formatTime(breakTime)}</span>
        </motion.div>
      )}
    </div>
  );
};
