// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCtztRa_6d6q1uhdylsnZgcYMeYzXYrFIY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "proof-of-grind.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "proof-of-grind",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "proof-of-grind.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "367030230553",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:367030230553:web:86492bec143627ee151488",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5SBZMJZKQP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Export the app for potential future use
export default app;