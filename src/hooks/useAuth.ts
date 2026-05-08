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
  Timestamp,
  collection,
  getDocs
} from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";

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

type SignUpParams = {
  email: string;
  password: string;
  fullName: string;
  companyName?: string;
  inviteCode?: string;
};

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // First try to get user from global users collection to get companyId
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const companyId = userData.companyId;
          if (companyId) {
            // Then get profile from company's employees
            const profileDoc = await getDoc(doc(db, "companies", companyId, "employees", userId));
            if (profileDoc.exists()) {
              return profileDoc.data() as Profile;
            }
          }
        }

        // If user document doesn't exist or companyId is missing, try to find profile across all companies
        console.warn("User doc missing or invalid, searching across companies", { userId });
        const companiesRef = collection(db, "companies");
        const companiesSnapshot = await getDocs(companiesRef);

        for (const companyDoc of companiesSnapshot.docs) {
          const profileDoc = await getDoc(doc(db, "companies", companyDoc.id, "employees", userId));
          if (profileDoc.exists()) {
            return profileDoc.data() as Profile;
          }
        }

        console.warn("Profile not found for user", { userId });
        return null;
      } catch (error) {
        if (attempt < retries - 1) {
          console.warn(`Error fetching profile (attempt ${attempt + 1}/${retries}), retrying...`, error);
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.error("Error fetching profile after all retries:", error);
        }
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // If we already have a profile for this user, don't fetch again
        // This prevents issues with Firestore eventual consistency after signup
        if (profile && profile.userId === firebaseUser.uid) {
          setLoading(false);
          return;
        }

        const fetchedProfile = await fetchProfile(firebaseUser.uid);
        setProfile(fetchedProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile, profile]);

  const signUp = async ({
    email,
    password,
    fullName,
    companyName,
    inviteCode,
  }: SignUpParams) => {
    try {
      let userCredential: UserCredential;
      let isExistingUser = false;

      try {
        // Try to create a new user
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (createError: any) {
        // If email already exists, try to sign in instead
        if (createError.code === 'auth/email-already-in-use') {
          try {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            isExistingUser = true;
          } catch (signInError: any) {
            throw new Error("This email is already registered with a different password. Please sign in instead or reset your password.");
          }
        } else {
          throw createError;
        }
      }

      const user = userCredential.user;

      // Ensure the user is authenticated before proceeding with Firestore operations
      if (!auth.currentUser) {
        throw new Error("Authentication failed. Please try again.");
      }

      // Small delay to ensure auth state is propagated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if user already has a profile
      const existingProfileDoc = await getDoc(doc(db, "companies", "dummy", "employees", user.uid));
      let hasExistingProfile = false;

      // Try to find the user's profile across all companies
      const companiesRef = collection(db, "companies");
      const companiesSnapshot = await getDocs(companiesRef);

      for (const companyDoc of companiesSnapshot.docs) {
        const profileDoc = await getDoc(doc(db, "companies", companyDoc.id, "employees", user.uid));
        if (profileDoc.exists()) {
          hasExistingProfile = true;
          break;
        }
      }

      if (hasExistingProfile && !isExistingUser) {
        throw new Error("You are already registered. Please sign in instead.");
      }

      // Update display name if it's a new user or if it was empty
      if (!isExistingUser || !user.displayName) {
        await firebaseUpdateProfile(user, { displayName: fullName });
      }

      let companyId: string;
      let inviteRecord: { companyId: string } | null = null;

      if (inviteCode) {
        try {
          const inviteDoc = await getDoc(doc(db, "companyInvites", inviteCode.toUpperCase()));
          if (!inviteDoc.exists()) {
            throw new Error("Invalid company invite code.");
          }

          inviteRecord = inviteDoc.data() as { companyId: string };
          companyId = inviteRecord.companyId;

          const existingCompany = await getDoc(doc(db, "companies", companyId));
          if (!existingCompany.exists()) {
            throw new Error("The invited company does not exist.");
          }
        } catch (inviteError: any) {
          if (inviteError.code === 'permission-denied') {
            throw new Error("Unable to verify invite code. Please check your connection and try again.");
          }
          throw inviteError;
        }
      } else {
        const companyRef = doc(db, "companies", crypto.randomUUID());
        companyId = companyRef.id;
        const generatedInviteCode = crypto.randomUUID().slice(0, 6).toUpperCase();

        try {
          await setDoc(companyRef, {
            name: companyName,
            createdAt: serverTimestamp(),
            adminUserId: user.uid,
            inviteCode: generatedInviteCode,
          });
          console.log("Company doc created successfully", { companyId });
        } catch (companyError) {
          console.error("Failed to create company doc:", companyError);
          throw companyError;
        }

        try {
          await setDoc(doc(db, "companyInvites", generatedInviteCode), {
            companyId,
            adminUserId: user.uid,
            createdAt: serverTimestamp(),
          });
          console.log("Company invite created successfully", { generatedInviteCode, companyId });
        } catch (inviteError) {
          console.error("Failed to create company invite doc:", inviteError);
          throw inviteError;
        }
      }

      try {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          companyId,
          role: inviteCode ? "user" : "admin",
          createdAt: serverTimestamp(),
        });
        console.log("User doc created successfully", { uid: user.uid, companyId });
      } catch (userError) {
        console.error("Failed to create user doc:", userError);
        throw userError;
      }

      const employeeProfile: Profile = {
        id: user.uid,
        userId: user.uid,
        fullName,
        email,
        designation: "Employee",
        teaPoints: 0,
        role: inviteCode ? "user" : "admin",
        companyId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      try {
        await setDoc(doc(db, "companies", companyId, "employees", user.uid), employeeProfile);
        console.log("Employee profile doc created successfully", { uid: user.uid, companyId });
      } catch (employeeError) {
        console.error("Failed to create employee profile doc:", employeeError);
        throw employeeError;
      }

      setProfile(employeeProfile);

      return { data: userCredential, profile: employeeProfile, error: null };
    } catch (error) {
      console.error("Sign up failed:", error);
      return { data: null, profile: null, error };
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
    setProfile: (p: Profile | null) => setProfile(p),
  };
};
