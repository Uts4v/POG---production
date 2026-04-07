/*
 * AttendanceCalendar.tsx
 * Professional Elegant Attendance Calendar with Live Stats
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { WorkSession } from "@/integrations/firebase/types";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

function fmtDur(sec: number): string {
  if (!sec || sec < 0) return "0h 0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface DayData {
  date: Date;
  session?: WorkSession;
  status: "present" | "absent" | "weekend" | "future" | "today-present" | "today-absent";
}

interface Props {
  userId: string;
  employeeName?: string;
}

export default function AttendanceCalendar({ userId, employeeName }: Props) {
  const [sessions, setSessions] = useState<Map<string, WorkSession>>(new Map());
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<DayData | null>(null);

  // Fetch all sessions
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users", userId, "sessions"),
        orderBy("date", "asc")
      );
      const snap = await getDocs(q);
      const map = new Map<string, WorkSession>();
      snap.docs.forEach((d) => {
        const s = { id: d.id, ...d.data() } as WorkSession;
        map.set(s.date, s);
      });
      setSessions(map);
    } catch (e) {
      console.error("AttendanceCalendar fetch error:", e);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Live Monthly Statistics
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let totalWorkSeconds = 0;

    const year = month.getFullYear();
    const mon = month.getMonth();
    const daysInMonth = new Date(year, mon + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, mon, d);
      if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

      const key = date.toISOString().split("T")[0];
      const session = sessions.get(key);

      if (session?.totalWorkDuration) {
        present++;
        totalWorkSeconds += session.totalWorkDuration;
      } else {
        absent++;
      }
    }

    const attendanceRate = present + absent > 0
      ? Math.round((present / (present + absent)) * 100)
      : 0;

    return {
      present,
      absent,
      attendanceRate,
      totalWork: totalWorkSeconds,
      totalHoursFormatted: fmtDur(totalWorkSeconds),
    };
  }, [sessions, month]);

  // Generate Calendar Days
  const days: DayData[] = useMemo(() => {
    const year = month.getFullYear();
    const mon = month.getMonth();
    const first = new Date(year, mon, 1);
    const last = new Date(year, mon + 1, 0);
    const grid: DayData[] = [];

    // Empty slots before first day
    for (let i = 0; i < first.getDay(); i++) {
      grid.push({ date: new Date(0), status: "future" });
    }

    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, mon, d);
      const key = date.toISOString().split("T")[0];
      const session = sessions.get(key);

      const isToday = date.getDate() === new Date().getDate() &&
                      date.getMonth() === new Date().getMonth() &&
                      date.getFullYear() === new Date().getFullYear();

      let status: DayData["status"] = "absent";

      if (date.getDay() === 0 || date.getDay() === 6) status = "weekend";
      else if (date > new Date() && !isToday) status = "future";
      else if (session) status = isToday ? "today-present" : "present";
      else if (isToday) status = "today-absent";

      grid.push({ date, session, status });
    }
    return grid;
  }, [month, sessions]);

  const prevMonth = () => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  return (
    <div className="space-y-8 font-['Inter',sans-serif]">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Present", value: stats.present, color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
          { label: "Absent", value: stats.absent, color: "text-rose-600 dark:text-rose-400", icon: XCircle },
          { label: "Attendance Rate", value: `${stats.attendanceRate}%`, color: "text-blue-600 dark:text-blue-400", icon: TrendingUp },
          { label: "Total Work Time", value: stats.totalHoursFormatted, color: "text-slate-700 dark:text-slate-300", icon: Clock },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Calendar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </h2>

          <button
            onClick={nextMonth}
            className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 px-8 pt-6 pb-4 text-sm font-medium text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="text-center">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-300 dark:border-zinc-700 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 mt-4">Loading attendance data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 p-8">
            {days.map((day, idx) => {
              if (day.date.getTime() === 0) return <div key={idx} className="aspect-square" />;

              const isSelected = selected && day.date.getTime() === selected.date.getTime();
              const isToday = day.status.includes("today");
              const isPresent = day.status.includes("present");
              const isAbsent = day.status.includes("absent");
              const isWeekend = day.status === "weekend";

              return (
                <motion.button
                  key={idx}
                  whileHover={!isWeekend ? { scale: 1.06 } : {}}
                  whileTap={!isWeekend ? { scale: 0.96 } : {}}
                  onClick={() => !isWeekend && setSelected(isSelected ? null : day)}
                  className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-center relative
                    border transition-all duration-200
                    ${isSelected ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30" : "hover:bg-slate-50 dark:hover:bg-zinc-800"}
                    ${isWeekend ? "bg-slate-50 dark:bg-zinc-950 text-slate-300 dark:text-zinc-700 cursor-default" : "cursor-pointer"}
                  `}
                >
                  <span className={`text-xl font-semibold
                    ${isPresent ? "text-emerald-600 dark:text-emerald-400" : ""}
                    ${isAbsent ? "text-rose-600 dark:text-rose-400" : ""}
                    ${isWeekend ? "" : "text-slate-700 dark:text-slate-200"}
                  `}>
                    {day.date.getDate()}
                  </span>

                  {isPresent && <div className="mt-2 w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
                  {isAbsent && <div className="mt-2 w-2.5 h-2.5 rounded-full bg-rose-500 dark:bg-rose-400" />}

                  {isToday && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
                      •
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Day Detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xl font-semibold text-slate-900 dark:text-white">
                  {selected.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className={`mt-1 text-sm font-medium ${selected.session ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {selected.session ? "● Present" : "● Absent"}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            {selected.session ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-zinc-800 rounded-2xl p-6">
                  <Clock className="w-6 h-6 text-slate-500 mb-3" />
                  <p className="text-3xl font-semibold text-slate-900 dark:text-white">
                    {fmtDur(selected.session.totalWorkDuration)}
                  </p>
                  <p className="text-slate-500">Work Duration</p>
                </div>
                {/* Add more details here if needed */}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">No attendance record found for this day.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}