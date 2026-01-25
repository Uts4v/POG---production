import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuthContext } from "@/contexts/AuthContext";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from "firebase/firestore";
import { formatTimeShort } from "@/hooks/useWorkSession";
import type { WorkSession, BreakLog } from "@/integrations/firebase/types";
import { Calendar, Clock, Coffee, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const History = () => {
  const { user, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<(WorkSession & { break_logs: BreakLog[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatTimeOfDay = (timestamp: any): string => {
    if (!timestamp) return "--:--";

    // Handle Firebase Timestamp objects
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;

      try {
        const sessionsRef = collection(db, "users", user.uid, "sessions");
        const q = query(
          sessionsRef,
          orderBy("date", "desc"),
          limit(30)
        );

        const querySnapshot = await getDocs(q);

        // Fetch break logs for each session
        const sessionsWithBreaks = await Promise.all(
          querySnapshot.docs.map(async (sessionDoc) => {
            const sessionData = { id: sessionDoc.id, ...sessionDoc.data() } as WorkSession;

            const breaksRef = collection(db, "users", user.uid, "sessions", sessionDoc.id, "breaks");
            const breaksQuery = query(breaksRef, orderBy("breakStart", "asc"));
            const breaksSnapshot = await getDocs(breaksQuery);

            const breaks = breaksSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as BreakLog[];

            return {
              ...sessionData,
              break_logs: breaks,
            };
          })
        );

        setSessions(sessionsWithBreaks);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      }
      setLoading(false);
    };

    fetchSessions();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getProductivityPercentage = (session: WorkSession) => {
    const total = session.totalWorkDuration + session.totalBreakDuration;
    if (total === 0) return 0;
    return Math.round((session.totalWorkDuration / total) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
              Session History
            </h1>
            <p className="text-muted-foreground">
              Review your past work sessions and productivity trends
            </p>
          </motion.div>

          {sessions.length === 0 ? (
            <motion.div
              className="tea-card text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No Sessions Yet
              </h3>
              <p className="text-muted-foreground">
                Complete your first work session to see it here!
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, index) => {
                const isExpanded = expandedId === session.id;
                const productivity = getProductivityPercentage(session);

                return (
                  <motion.div
                    key={session.id}
                    className="tea-card cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            {formatDate(session.date)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {formatTimeOfDay(session.workStartTime)} -{" "}
                            {formatTimeOfDay(session.workEndTime)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="font-medium text-foreground">
                            {formatTimeShort(session.totalWorkDuration)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {productivity}% focused
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-6 border-t border-border"
                      >
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Work Time
                              </p>
                              <p className="font-medium text-foreground">
                                {formatTimeShort(session.totalWorkDuration)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Coffee className="w-5 h-5 text-accent" />
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Break Time
                              </p>
                              <p className="font-medium text-foreground">
                                {formatTimeShort(session.totalBreakDuration)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Productivity bar */}
                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Focus Rate
                            </span>
                            <span className="font-medium">{productivity}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                              style={{ width: `${productivity}%` }}
                            />
                          </div>
                        </div>

                        {/* Break logs */}
                        {session.break_logs.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">
                              Break Timeline
                            </h4>
                            <div className="space-y-2">
                              {session.break_logs.map((log, i) => (
                                <div
                                  key={log.id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-muted-foreground">
                                    Break {i + 1}
                                  </span>
                                  <span>
                                    {formatTimeOfDay(log.breakStart)}
                                    {log.breakEnd && (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        → {formatTimeOfDay(log.breakEnd)}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
