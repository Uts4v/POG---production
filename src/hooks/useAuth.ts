import { useState, useEffect, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser,
  UserCredential
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/integrations/firebase/client";

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  designation: string;
  avatarUrl?: string;
  teaPoints: number;
  role: "admin" | "user";
  companyId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // First get user from global users collection to get companyId
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data();
      const companyId = userData.companyId;

      // Then get profile from company's employees
      const profileDoc = await getDoc(doc(db, "companies", companyId, "employees", userId));
      if (profileDoc.exists()) {
        return profileDoc.data() as Profile;
      }
      return null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const profile = await fetchProfile(firebaseUser.uid);
        setProfile(profile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string, companyName: string) => {
    try {
      const createUserFunction = httpsCallable(functions, 'createUserWithCompany');
      const result = await createUserFunction({ email, password, fullName, companyName });

      // Now sign in the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      return { data: userCredential, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      return { data: userCredential, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return { error: new Error("No user logged in") };

    try {
      const updateData: Partial<Profile> = {
        ...updates,
        updatedAt: serverTimestamp() as Timestamp,
      };

      await updateDoc(doc(db, "companies", profile.companyId, "employees", user.uid), updateData);

      // Update local state
      setProfile({ ...profile, ...updates });

      return { data: { ...profile, ...updates }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  return {
    user,
    session: null, // Firebase doesn't have sessions like Supabase
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refetchProfile: () => user && fetchProfile(user.uid).then(setProfile),
  };
};
