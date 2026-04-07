/*
 * AttendanceCalendar.tsx — Enhanced Edition
 * Sunday = Working Day | Only Saturday = Weekend
 * Fetches sessions from Firebase and marks present/absent
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
  CalendarDays,
  Briefcase,
  X,
  RefreshCw,
} from "lucide-react";

/* ─── Helpers ─────────────────────────────────────────── */
function fmtDur(sec: number): string {
  if (!sec || sec < 0) return "0h 0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Use LOCAL date parts to avoid UTC offset shifting the date (critical for Nepal UTC+5:45)
function toKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isToday(d: Date) {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/* ─── Types ───────────────────────────────────────────── */
type DayStatus = "present" | "absent" | "weekend" | "future" | "today-present" | "today-absent" | "empty";

interface DayData {
  date: Date;
  session?: WorkSession;
  status: DayStatus;
}

interface Props {
  userId: string;
  employeeName?: string;
}

/* ─── Status Config ───────────────────────────────────── */
const statusConfig: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  present:       { dot: "bg-emerald-500",  text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50  dark:bg-emerald-950/30",  border: "border-emerald-200 dark:border-emerald-900" },
  "today-present":{ dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50  dark:bg-emerald-950/30",  border: "border-emerald-200 dark:border-emerald-900" },
  absent:        { dot: "bg-rose-500",     text: "text-rose-600 dark:text-rose-400",        bg: "bg-rose-50    dark:bg-rose-950/30",       border: "border-rose-200 dark:border-rose-900" },
  "today-absent":{ dot: "bg-rose-500",     text: "text-rose-600 dark:text-rose-400",        bg: "bg-rose-50    dark:bg-rose-950/30",       border: "border-rose-200 dark:border-rose-900" },
  weekend:       { dot: "",                text: "text-slate-300 dark:text-zinc-700",        bg: "bg-slate-50   dark:bg-zinc-950/50",       border: "border-slate-100 dark:border-zinc-900" },
  future:        { dot: "",                text: "text-slate-400 dark:text-zinc-600",        bg: "bg-transparent",                          border: "border-slate-100 dark:border-zinc-800/50" },
};

/* ─── Component ───────────────────────────────────────── */
export default function AttendanceCalendar({ userId, employeeName }: Props) {
  const [sessions, setSessions] = useState<Map<string, WorkSession>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<DayData | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch ── */
  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "users", userId, "sessions"), orderBy("date", "asc"));
      const snap = await getDocs(q);
      const map = new Map<string, WorkSession>();
      snap.docs.forEach((d) => {
        const s = { id: d.id, ...d.data() } as WorkSession;
        map.set(s.date, s);
      });
      setSessions(map);
    } catch (e) {
      console.error("Fetch error:", e);
      setError("Failed to load attendance data. Please try again.");
    }
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    let present = 0, absent = 0, totalWorkSeconds = 0;
    const year = month.getFullYear();
    const mon = month.getMonth();
    const today = new Date();

    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (let d = 1; d <= new Date(year, mon + 1, 0).getDate(); d++) {
      const date = new Date(year, mon, d);
      if (date > todayMidnight) break; // skip future (compare midnight-to-midnight)
      if (date.getDay() === 6) continue; // skip Saturday only
      const session = sessions.get(toKey(date));
      // Present = session record exists (don't require totalWorkDuration > 0)
      if (session) {
        present++;
        totalWorkSeconds += session.totalWorkDuration ?? 0;
      } else {
        absent++;
      }
    }

    const attendanceRate = present + absent > 0 ? Math.round((present / (present + absent)) * 100) : 0;
    const avgWorkSeconds = present > 0 ? Math.round(totalWorkSeconds / present) : 0;

    return { present, absent, attendanceRate, totalWorkSeconds, totalHoursFormatted: fmtDur(totalWorkSeconds), avgWorkFormatted: fmtDur(avgWorkSeconds) };
  }, [sessions, month]);

  /* ── Calendar Grid ── */
  const days: DayData[] = useMemo(() => {
    const year = month.getFullYear();
    const mon = month.getMonth();
    const first = new Date(year, mon, 1);
    const last = new Date(year, mon + 1, 0);
    const grid: DayData[] = [];
    const now = new Date();

    for (let i = 0; i < first.getDay(); i++) {
      grid.push({ date: new Date(0), status: "empty" });
    }

    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, mon, d);
      const session = sessions.get(toKey(date));
      const today = isToday(date);
      const isSaturday = date.getDay() === 6;
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isFuture = date > todayMidnight;

      let status: DayStatus;
      if (isSaturday) status = "weekend";
      else if (isFuture) status = "future";
      else if (session) status = today ? "today-present" : "present";
      else status = today ? "today-absent" : "absent";

      grid.push({ date, session, status });
    }
    return grid;
  }, [month, sessions]);

  /* ── Month helpers ── */
  const prevMonth = () => { setSelected(null); setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)); };
  const nextMonth = () => { setSelected(null); setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)); };
  const isCurrentMonth = month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear();

  /* ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0e0e12] p-4 md:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');`}</style>

      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Syne',sans-serif]">
              Attendance
            </h1>
            {employeeName && (
              <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm font-medium">{employeeName}</p>
            )}
          </div>
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300
              bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800
              rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-sm font-medium px-5 py-4 rounded-2xl"
            >
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Present Days", value: stats.present, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-950/50", span: 1 },
            { label: "Absent Days",  value: stats.absent,  icon: XCircle,      color: "text-rose-600 dark:text-rose-400",       iconBg: "bg-rose-100 dark:bg-rose-950/50",    span: 1 },
            { label: "Attendance",   value: `${stats.attendanceRate}%`, icon: TrendingUp, color: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-100 dark:bg-blue-950/50", span: 1 },
            { label: "Total Hours",  value: stats.totalHoursFormatted, icon: Clock, color: "text-violet-600 dark:text-violet-400", iconBg: "bg-violet-100 dark:bg-violet-950/50", span: 1 },
            { label: "Avg / Day",    value: stats.avgWorkFormatted, icon: Briefcase, color: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-amber-950/50", span: 1 },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-2xl ${item.iconBg} flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Attendance Bar ── */}
        {stats.present + stats.absent > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl px-6 py-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Monthly Progress</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.attendanceRate}%</span>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.attendanceRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${stats.attendanceRate >= 80 ? "bg-emerald-500" : stats.attendanceRate >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{stats.present} present</span>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{stats.absent} absent</span>
            </div>
          </div>
        )}

        {/* ── Calendar ── */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">

          {/* Month Nav */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>

            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Syne',sans-serif]">
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </h2>
              {isCurrentMonth && (
                <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">NOW</span>
              )}
            </div>

            <button
              onClick={nextMonth}
              className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-6 pt-5 pb-3">
            {DAYS_SHORT.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-bold tracking-widest uppercase
                  ${i === 6 ? "text-slate-300 dark:text-zinc-700" : "text-slate-400 dark:text-zinc-500"}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-slate-200 dark:border-zinc-700 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Loading attendance data…</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 px-4 pb-5 pt-1">
              {days.map((day, idx) => {
                if (day.status === "empty") return <div key={idx} className="aspect-square" />;

                const isSelected = selected?.date.getTime() === day.date.getTime();
                const cfg = statusConfig[day.status] ?? statusConfig.future;
                const todayDay = isToday(day.date);
                const isFuture = day.status === "future";
                const isWeekend = day.status === "weekend";

                return (
                  <motion.button
                    key={idx}
                    whileHover={!isWeekend && !isFuture ? { scale: 1.07 } : {}}
                    whileTap={!isWeekend && !isFuture ? { scale: 0.95 } : {}}
                    onClick={() => !isWeekend && !isFuture && setSelected(isSelected ? null : day)}
                    className={`
                      aspect-square rounded-2xl flex flex-col items-center justify-center relative
                      border transition-all duration-150
                      ${cfg.bg} ${cfg.border}
                      ${isSelected ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 shadow-md" : ""}
                      ${!isWeekend && !isFuture ? "cursor-pointer" : "cursor-default"}
                    `}
                  >
                    {/* Today ring */}
                    {todayDay && (
                      <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-500 pointer-events-none" />
                    )}

                    <span className={`text-sm md:text-base font-bold leading-none ${cfg.text} ${todayDay ? "!text-blue-600 dark:!text-blue-400" : ""}`}>
                      {day.date.getDate()}
                    </span>

                    {/* Status dot */}
                    {cfg.dot && (
                      <div className={`mt-1 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    )}

                    {/* Weekend label */}
                    {isWeekend && (
                      <span className="mt-0.5 text-[8px] font-bold text-slate-300 dark:text-zinc-700 uppercase tracking-wider">OFF</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            {[
              { dot: "bg-emerald-500", label: "Present" },
              { dot: "bg-rose-500",    label: "Absent" },
              { dot: "bg-slate-200 dark:bg-zinc-700", label: "Weekend (Sat)" },
              { dot: "border-2 border-blue-500", label: "Today" },
            ].map(({ dot, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Day Detail Panel ── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-lg"
            >
              {/* Header */}
              <div className={`px-8 py-5 flex items-start justify-between
                ${selected.session ? "bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/50" : "bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/50"}`}
              >
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white font-['Syne',sans-serif]">
                    {selected.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <p className={`mt-1 text-sm font-semibold flex items-center gap-1.5 ${selected.session ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    <span className={`w-2 h-2 rounded-full ${selected.session ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {selected.session ? "Present" : "Absent"}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 hover:bg-white/60 dark:hover:bg-zinc-800/60 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                </button>
              </div>

              {/* Body */}
              <div className="px-8 py-6">
                {selected.session ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-zinc-800 rounded-2xl p-5 flex flex-col gap-2">
                      <Clock className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmtDur(selected.session.totalWorkDuration)}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Work Duration</p>
                    </div>
                    {selected.session.checkIn && (
                      <div className="bg-slate-50 dark:bg-zinc-800 rounded-2xl p-5 flex flex-col gap-2">
                        <Briefcase className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{selected.session.checkIn}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Check-in Time</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-rose-600 dark:text-rose-400">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold">No attendance record</p>
                      <p className="text-sm text-slate-400 dark:text-zinc-500">This employee was absent on this day.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}