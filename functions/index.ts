// src/integration/firebase/index.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// ──────────────────────────────────────────────────────────────
// Firebase Configuration
// Best: Load from environment variables in production
// ──────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCn_5rLREJyhndTnVdDFaU74ohJ-cXeI3w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nte-clockin.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nte-clockin",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nte-clockin.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "456923511374",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:456923511374:web:cff12fe332b039fa92211f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2P9P517P9V",
};

// ──────────────────────────────────────────────────────────────
// Initialize Firebase (singleton pattern)
// ──────────────────────────────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ──────────────────────────────────────────────────────────────
// Services
// ──────────────────────────────────────────────────────────────
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics (lazy-loaded, only if supported)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// ──────────────────────────────────────────────────────────────
// Local Emulator Support (uncomment when running emulators)
// ──────────────────────────────────────────────────────────────
// if (import.meta.env.DEV) {
//   connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
//   connectFirestoreEmulator(db, "127.0.0.1", 8080);
//   connectStorageEmulator(storage, "127.0.0.1", 9199);
//   console.log("[Firebase] Connected to local emulators");
// }

// ──────────────────────────────────────────────────────────────
// Exports for convenience / type safety
// ──────────────────────────────────────────────────────────────
export { app };

// Re-export common types (optional but very helpful)
export type {
  User,
  UserCredential,
  AuthError,
  IdTokenResult,
} from "firebase/auth";

export type {
  DocumentData,
  DocumentReference,
  CollectionReference,
  Query,
  QuerySnapshot,
  Timestamp,
  FirestoreError,
} from "firebase/firestore";

export type { FirebaseStorage, StorageReference, UploadTask } from "firebase/storage";