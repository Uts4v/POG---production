import { Timestamp } from "firebase/firestore";

// Firebase Auth types
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

// Profile document (stored in users/{userId})
export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  designation: string;
  avatarUrl?: string;
  teaPoints: number;
  role: "admin" | "user";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Work session document (stored in users/{userId}/sessions/{sessionId})
export interface WorkSession {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  workStartTime?: Timestamp;
  workEndTime?: Timestamp;
  totalWorkDuration: number; // in seconds
  totalBreakDuration: number; // in seconds
  status: "idle" | "working" | "break" | "completed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Break log document (stored in users/{userId}/sessions/{sessionId}/breaks/{breakId})
export interface BreakLog {
  id: string;
  sessionId: string;
  userId: string;
  breakStart: Timestamp;
  breakEnd?: Timestamp;
  createdAt: Timestamp;
}

// Timer status type
export type TimerStatus = "idle" | "working" | "break" | "completed";