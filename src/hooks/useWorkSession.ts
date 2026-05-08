import { useState, useEffect, useCallback, useRef } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { TimerStatus, WorkSession, BreakLog } from "@/integrations/firebase/types";
import { toast } from "sonner";
import { useLocationCapture } from "@/hooks/useLocation";  // new hook for geolocation

export const useWorkSession = () => {
  const { user, profile } = useAuthContext();
  const [session, setSession] = useState<WorkSession | null>(null);
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([]);
  const [displayTime, setDisplayTime] = useState(0);
  const [breakDisplayTime, setBreakDisplayTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isBreakAlertPlaying, setIsBreakAlertPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playBreakAlert = useCallback(() => {
    const playBeep = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz beep
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5); // 0.5 second beep
    };

    // Play beep every second
    beepIntervalRef.current = setInterval(playBeep, 1000);
  }, []);

  const stopBreakAlert = useCallback(() => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  }, []);

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone

  // Fetch today's session
  const fetchTodaySession = useCallback(async () => {
    if (!user || !profile) {
      console.warn("fetchTodaySession skipped because user or profile is missing", { user, profile });
      setLoading(false);
      return;
    }

    try {
      // Query for today's session
      // Use company-scoped sessions for reads (admin panel also uses this path).
      // This avoids relying on the global `sessions` rules for reads.
      const sessionsRef = collection(db, "companies", profile.companyId, "sessions");
      const q = query(
        sessionsRef,
        where("date", "==", today),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const sessionDoc = querySnapshot.docs[0];
        const sessionData = { id: sessionDoc.id, ...sessionDoc.data() } as WorkSession;
        setSession(sessionData);

        // Break logs live under the company-scoped session
        try {
          const breaksRef = collection(db, "companies", profile.companyId, "sessions", sessionDoc.id, "breaks");
          const breaksQuery = query(breaksRef, orderBy("breakStart", "asc"));
          const breaksSnapshot = await getDocs(breaksQuery);

          const breaks = breaksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as BreakLog[];

          setBreakLogs(breaks);
        } catch (breakErr) {
          console.error("Error fetching break logs:", breakErr);
          setBreakLogs([]);
        }
      } else {
        setSession(null);
        setBreakLogs([]);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
    setLoading(false);
  }, [user, profile, today]);

  useEffect(() => {
    fetchTodaySession();
  }, [fetchTodaySession]);

  // Calculate elapsed times
  const calculateElapsedTime = useCallback(() => {
    if (!session || !session.workStartTime) return { work: 0, break: 0 };

    const now = new Date();
    let totalBreakTime = 0;

    // Filter breaks started after current workStartTime
    const currentBreaks = breakLogs.filter(log => log.breakStart.toDate() > session.workStartTime.toDate());

    // Add completed breaks in current segment
    totalBreakTime += currentBreaks.filter(log => log.breakEnd).reduce((acc, log) => {
      return acc + Math.floor((log.breakEnd!.toDate().getTime() - log.breakStart.toDate().getTime()) / 1000);
    }, 0);

    // Add time from current break if on break
    const currentBreak = breakLogs.find((log) => log.breakEnd === undefined);
    if (currentBreak) {
      totalBreakTime += Math.floor(
        (now.getTime() - currentBreak.breakStart.toDate().getTime()) / 1000
      );
    }

    // Calculate total work time
    const endTime = session.workEndTime ? session.workEndTime.toDate() : now;
    const totalElapsed = Math.floor(
      (endTime.getTime() - session.workStartTime.toDate().getTime()) / 1000
    );
    const workTime = totalElapsed - totalBreakTime;

    return { work: Math.max(0, workTime), break: totalBreakTime };
  }, [session, breakLogs]);

  // Update display times
  useEffect(() => {
    const updateDisplay = () => {
      const times = calculateElapsedTime();
      setDisplayTime(times.work);
      setBreakDisplayTime(times.break);

      // Break alert: if on break and break time >= 45 minutes (2700 seconds)
      if (session?.status === "break" && times.break >= 4 && !isBreakAlertPlaying) {
        playBreakAlert();
        setIsBreakAlertPlaying(true);
      } else if (session?.status !== "break" && isBreakAlertPlaying) {
        stopBreakAlert();
        setIsBreakAlertPlaying(false);
      }
    };

    updateDisplay();

    const status = session?.status;
    if (status === "working" || status === "break") {
      intervalRef.current = setInterval(updateDisplay, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopBreakAlert();
    };
  }, [session?.status, calculateElapsedTime, playBreakAlert, stopBreakAlert, isBreakAlertPlaying]);

  const { captureLocation } = useLocationCapture();

  const clockIn = async () => {
    if (!user) {
      toast.error("Please sign in before clocking in.");
      return;
    }

    if (!profile) {
      toast.error("Your profile has not loaded yet. Please wait a moment and try again.");
      console.warn("clockIn aborted because profile is missing", { user });
      return;
    }

    try {
      // Try to get location data; if it fails, continue without it
      let locationData;
      try {
        console.log("Attempting to capture location...");
        locationData = await captureLocation();
        console.log("Location captured successfully:", locationData);
      } catch (locErr: any) {
        // Location capture failed, but don't block clock-in
        console.warn("Location capture failed, continuing without location:", locErr?.message);
        toast.warning("Location not available. Clocking in without location data.");
      }

      const sessionData: Partial<WorkSession> = {
        userId: user.uid,
        date: today,
        workStartTime: Timestamp.now(),
        totalWorkDuration: 0,
        totalBreakDuration: 0,
        status: "working" as const,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (locationData) {
        sessionData.clockInLocation = locationData as any;
      }

      if (session) {
        // Update existing session
        const updatePayload: any = {
          workStartTime: Timestamp.now(),
          status: "working",
          workEndTime: null,
          updatedAt: Timestamp.now(),
        };
        if (locationData) updatePayload.clockInLocation = locationData;

        await updateDoc(doc(db, "companies", profile.companyId, "sessions", session.id), updatePayload);
        await updateDoc(doc(db, "sessions", session.id), updatePayload);
        setSession({ ...session, workStartTime: Timestamp.now(), status: "working", workEndTime: null, ...(locationData ? { clockInLocation: locationData } : {}) });
      } else {
        // Create new session
        const sessionDataWithCompany = {
          ...sessionData,
          companyId: profile.companyId,
        };

        const docRef = await addDoc(collection(db, "companies", profile.companyId, "sessions"), sessionData);
        await setDoc(doc(db, "sessions", docRef.id), sessionDataWithCompany);
        setSession({ id: docRef.id, ...sessionData } as WorkSession);
      }

      setBreakLogs([]);
      toast.success("Successfully clocked in!");
    } catch (error) {
      console.error("Error clocking in:", error);
      toast.error("Failed to clock in. Please try again.");
    }
  };

  const clockOut = async () => {
    if (!session) {
      toast.error("No active session to clock out from.");
      return;
    }
    if (!user) {
      toast.error("Please sign in before clocking out.");
      return;
    }
    if (!profile) {
      toast.error("Your profile has not loaded yet. Please wait a moment and try again.");
      return;
    }

    try {
      const times = calculateElapsedTime();

      // End any current break first
      const currentBreak = breakLogs.find((log) => log.breakEnd === undefined);
      if (currentBreak) {
        try {
          await updateDoc(
            doc(db, "companies", profile.companyId, "sessions", session.id, "breaks", currentBreak.id),
            { breakEnd: Timestamp.now() }
          );
        } catch (breakUpdateErr) {
          console.error("Error ending current break (continuing clock-out):", breakUpdateErr);
        }
      }

      // Update session
      await updateDoc(doc(db, "companies", profile.companyId, "sessions", session.id), {
        workEndTime: Timestamp.now(),
        totalWorkDuration: times.work,
        totalBreakDuration: times.break,
        status: "completed",
        updatedAt: Timestamp.now(),
      });

      await updateDoc(doc(db, "sessions", session.id), {
        workEndTime: Timestamp.now(),
        totalWorkDuration: times.work,
        totalBreakDuration: times.break,
        status: "completed",
        updatedAt: Timestamp.now(),
      });

      // Update tea points in profile
      const teaPointsEarned = Math.floor(times.work / 3600) * 10;
      if (teaPointsEarned > 0) {
        const profileRef = doc(db, "companies", profile.companyId, "employees", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const currentPoints = profileSnap.data().teaPoints || 0;
          await updateDoc(profileRef, {
            teaPoints: currentPoints + teaPointsEarned,
            updatedAt: Timestamp.now(),
          });
        }
      }

      setSession({
        ...session,
        workEndTime: Timestamp.now(),
        totalWorkDuration: times.work,
        totalBreakDuration: times.break,
        status: "completed"
      });

      await fetchTodaySession();
      stopBreakAlert();
      setIsBreakAlertPlaying(false);
    } catch (error) {
      console.error("Error clocking out:", error);
    }
  };

  const pauseWork = async () => {
    if (!session) {
      toast.error("No active session to pause.");
      return;
    }
    if (!user) {
      toast.error("Please sign in before taking a break.");
      return;
    }
    if (!profile) {
      toast.error("Your profile has not loaded yet. Please wait a moment and try again.");
      return;
    }

    try {
      const breakData = {
        sessionId: session.id,
        userId: user.uid,
        breakStart: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, "companies", profile.companyId, "sessions", session.id, "breaks"),
        breakData
      );

      await updateDoc(doc(db, "companies", profile.companyId, "sessions", session.id), {
        status: "break",
        updatedAt: Timestamp.now(),
      });

      await updateDoc(doc(db, "sessions", session.id), {
        status: "break",
        updatedAt: Timestamp.now(),
      });

      const newBreak = { id: docRef.id, ...breakData };
      setBreakLogs([...breakLogs, newBreak]);
      setSession({ ...session, status: "break" });
    } catch (error) {
      console.error("Error starting break:", error);
    }
  };

  const resumeWork = async () => {
    if (!session) {
      toast.error("No session available to resume.");
      return;
    }
    if (!user) {
      toast.error("Please sign in before resuming work.");
      return;
    }
    if (!profile) {
      toast.error("Your profile has not loaded yet. Please wait a moment and try again.");
      return;
    }

    try {
      const currentBreak = breakLogs.find((log) => log.breakEnd === undefined);
      if (currentBreak) {
        await updateDoc(
          doc(db, "companies", profile.companyId, "sessions", session.id, "breaks", currentBreak.id),
          { breakEnd: Timestamp.now() }
        );

        // Calculate total break duration
        const updatedBreaks = breakLogs.map((log) =>
          log.id === currentBreak.id
            ? { ...log, breakEnd: Timestamp.now() }
            : log
        );
        setBreakLogs(updatedBreaks);

        const totalBreak = updatedBreaks.reduce((acc, log) => {
          if (log.breakEnd) {
            return (
              acc +
              Math.floor(
                (log.breakEnd.toDate().getTime() - log.breakStart.toDate().getTime()) / 1000
              )
            );
          }
          return acc;
        }, 0);

        await updateDoc(doc(db, "companies", profile.companyId, "sessions", session.id), {
          status: "working",
          totalBreakDuration: totalBreak,
          updatedAt: Timestamp.now(),
        });

        await updateDoc(doc(db, "sessions", session.id), {
          status: "working",
          totalBreakDuration: totalBreak,
          updatedAt: Timestamp.now(),
        });

        setSession({ ...session, status: "working", totalBreakDuration: totalBreak });
        stopBreakAlert();
        setIsBreakAlertPlaying(false);
      }
    } catch (error) {
      console.error("Error resuming work:", error);
    }
  };

  const resetSession = async () => {
    if (!user) {
      toast.error("Please sign in before resetting your session.");
      return;
    }

    try {
      // If there's an active session that isn't completed, end it first so the record is preserved.
      if (session && session.status !== "completed") {
        await clockOut();
      }

      // Do NOT delete or zero out the stored session/break logs in Firestore.
      // Preserve history for the History page. Just clear local state so the UI can start a fresh day.
      setSession(null);
      setBreakLogs([]);
      setDisplayTime(0);
      setBreakDisplayTime(0);
    } catch (error) {
      console.error("Error resetting session:", error);
    }
  };

  const status: TimerStatus = session?.status || "idle";

  return {
    session,
    breakLogs,
    status,
    displayTime,
    breakDisplayTime,
    loading,
    clockIn,
    clockOut,
    pauseWork,
    resumeWork,
    resetSession,
    refetch: fetchTodaySession,
  };
};

export const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const formatTimeShort = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};
