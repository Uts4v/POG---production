// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCn_5rLREJyhndTnVdDFaU74ohJ-cXeI3w",
  authDomain: "nte-clockin.firebaseapp.com",
  projectId: "nte-clockin",
  storageBucket: "nte-clockin.firebasestorage.app",
  messagingSenderId: "456923511374",
  appId: "1:456923511374:web:cff12fe332b039fa92211f",
  measurementId: "G-2P9P517P9V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export the app for potential future use
export default app;