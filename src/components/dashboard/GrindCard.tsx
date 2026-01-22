import { motion } from "framer-motion";
import { Clock, Coffee, TrendingUp, Leaf, Award, Play, Pause, Square } from "lucide-react";
import { Timestamp } from "firebase/firestore";

interface WorkSession {
  id: string;
  userId: string;
  date: string;
  // Accept both camelCase and snake_case coming from different sources
  workStartTime?: Timestamp | any;
  workEndTime?: Timestamp | any;
  work_start_time?: Timestamp | any;
  work_end_time?: Timestamp | any;
  totalWorkDuration?: number | any;
  totalBreakDuration?: number | any;
  total_work_duration?: number | any;
  total_break_duration?: number | any;
  status: "idle" | "working" | "break" | "completed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface BreakLog {
  id: string;
  sessionId: string;
  userId: string;
  breakStart: Timestamp | any;
  breakEnd?: Timestamp | any;
  break_start?: Timestamp | any;
  break_end?: Timestamp | any;
  createdAt: Timestamp;
}

interface GrindCardProps {
  session: WorkSession;
  breakLogs: BreakLog[];
}

// Format duration in seconds to HH:MM:SS
const formatTimeHMS = (seconds: number | null | undefined): string => {
  if (seconds == null || isNaN(Number(seconds)) || Number(seconds) === 0) return "00:00:00";
  const s = Number(seconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format Firebase Timestamp to time of day
const formatTimeOfDay = (input: any): string => {
  if (!input) return "--:--";

  try {
    let date: Date;
    // Firebase Timestamp-like
    if (typeof input === "object" && input !== null && typeof input.toDate === "function") {
      date = input.toDate();
    } else {
      // Accept string, number, or Date
      date = new Date(input);
    }

    if (isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting time of day:", error);
    return "--:--";
  }
};

// Format date string
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Invalid Date";
    
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "Invalid Date";
  }
};

export const GrindCard = ({ session, breakLogs }: GrindCardProps) => {
  const workDuration = Number(session.totalWorkDuration ?? session.total_work_duration ?? 0);
  const breakDuration = Number(session.totalBreakDuration ?? session.total_break_duration ?? 0);
  const totalDuration = workDuration + breakDuration;
  
  const workPercentage =
    totalDuration > 0
      ? Math.round((workDuration / totalDuration) * 100)
      : 0;

  const getProductivityLevel = () => {
    if (workPercentage >= 90) return { label: "Exceptional", color: "text-primary" };
    if (workPercentage >= 80) return { label: "Excellent", color: "text-primary" };
    if (workPercentage >= 70) return { label: "Good", color: "text-accent" };
    if (workPercentage >= 60) return { label: "Fair", color: "text-muted-foreground" };
    return { label: "Needs Focus", color: "text-muted-foreground" };
  };

  const productivity = getProductivityLevel();

  // Calculate tea points
  const teaPoints = Math.floor(workDuration / 3600) * 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-tea-forest to-primary p-1">
        {/* Inner card */}
        <div className="relative bg-card rounded-[22px] p-6 space-y-6 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
            <Leaf className="w-full h-full text-foreground" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Daily Grind Card
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(session.date)}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-accent/10 px-3 py-1.5 rounded-full">
              <Leaf className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                +{teaPoints} pts
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide font-medium">
                  Work Time
                </span>
              </div>
              <p className="font-display text-2xl font-semibold text-foreground">
                {formatTimeHMS(workDuration)}
              </p>
            </div>

            <div className="bg-accent/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-accent mb-2">
                <Coffee className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide font-medium">
                  Break Time
                </span>
              </div>
              <p className="font-display text-2xl font-semibold text-foreground">
                {formatTimeHMS(breakDuration)}
              </p>
            </div>
          </div>

          {/* Productivity Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Focus Rate
                </span>
              </div>
              <span className={`text-sm font-medium ${productivity.color}`}>
                {productivity.label}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${workPercentage}%` }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {workPercentage}% focused work
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Session Timeline
            </h4>
            <div className="space-y-2">
              {(session.workStartTime || (session as any).work_start_time) && (
                <TimelineItem
                  icon={<Play className="w-4 h-4 text-primary" />}
                  label="Started Work"
                  time={formatTimeOfDay(session.workStartTime ?? (session as any).work_start_time)}
                />
              )}
              
              {breakLogs.map((log, index) => (
                <div key={log.id}>
                  <TimelineItem
                    icon={<Coffee className="w-4 h-4 text-accent" />}
                    label={`Break ${index + 1} Started`}
                    time={formatTimeOfDay(log.breakStart ?? (log as any).break_start)}
                  />
                  {(log.breakEnd || (log as any).break_end) && (
                    <TimelineItem
                      icon={<Play className="w-4 h-4 text-primary" />}
                      label="Resumed Work"
                      time={formatTimeOfDay(log.breakEnd ?? (log as any).break_end)}
                    />
                  )}
                </div>
              ))}
              
              {(session.workEndTime || (session as any).work_end_time) && (
                <TimelineItem
                  icon={<Square className="w-4 h-4 text-muted-foreground" />}
                  label="Clocked Out"
                  time={formatTimeOfDay(session.workEndTime ?? (session as any).work_end_time)}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">
                Proof Of Grind
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              TeaTime Tracker
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TimelineItem = ({
  icon,
  label,
  time,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
}) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-muted-foreground">{label}</span>
    </div>
    <span className="font-medium">{time}</span>
  </div>
);