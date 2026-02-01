// src/integration/firebase/index.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// ──────────────────────────────────────────────────────────────
// Firebase Configuration (from your client.ts)
// ──────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCn_5rLREJyhndTnVdDFaU74ohJ-cXeI3w",
  authDomain: "nte-clockin.firebaseapp.com",
  projectId: "nte-clockin",
  storageBucket: "nte-clockin.firebasestorage.app",
  messagingSenderId: "456923511374",
  appId: "1:456923511374:web:cff12fe332b039fa92211f",
  measurementId: "G-2P9P517P9V"
};

// ──────────────────────────────────────────────────────────────
// Initialize Firebase only once (prevents duplicate init errors)
// ──────────────────────────────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ──────────────────────────────────────────────────────────────
// Initialize services
// ──────────────────────────────────────────────────────────────
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics (optional – loads only if supported in browser)
let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});
export { analytics };

// ──────────────────────────────────────────────────────────────
// Emulator support (very useful during development)
// Uncomment the lines below when using local emulators
// ──────────────────────────────────────────────────────────────
// if (import.meta.env.DEV) {
//   connectAuthEmulator(auth, "http://127.0.0.1:9099");
//   connectFirestoreEmulator(db, "127.0.0.1", 8080);
//   connectStorageEmulator(storage, "127.0.0.1", 9199);
//   console.log("Firebase emulators connected");
// }

// ──────────────────────────────────────────────────────────────
// Optional exports for convenience / type safety
// ──────────────────────────────────────────────────────────────
export { app };

// Re-export common types (optional but helpful in TypeScript)
export type {
  User,
  UserCredential,
  AuthError,
} from "firebase/auth";

export type {
  DocumentData,
  DocumentReference,
  CollectionReference,
  Query,
  QuerySnapshot,
  Timestamp,
} from "firebase/firestore";

export type { FirebaseStorage, StorageReference } from "firebase/storage";