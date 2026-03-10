import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { fetchUserProfile } from '../services/auth.service';
import {
  isSessionExpired,
  hasSessionKey,
  setSessionExpiry,
  clearSession,
  getRemainingMinutes,
} from '../services/session.service';
import { SESSION_CHECK_INTERVAL_MS } from '../config/constants';
import type { UserProfile } from '../types/auth';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  sessionMinutesLeft: number;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState(
    getRemainingMinutes()
  );

  // Force re-fetch profile from Firestore
  // CRITICAL: uses auth.currentUser directly, NOT React state (which may be stale)
  const refreshProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await fetchUserProfile(currentUser.uid);
      setUserProfile(profile);
      setFirebaseUser(currentUser);
    } catch {
      setUserProfile(null);
    }
  }, []);

  // Listen to Firebase auth state
  useEffect(() => {
    let isSigningOut = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isSigningOut) return;

      setFirebaseUser(user);

      if (user) {
        // Session handling:
        // - Key exists + expired → sign out
        // - No key → fresh login or persisted auth → set new session
        if (hasSessionKey() && isSessionExpired()) {
          isSigningOut = true;
          clearSession();
          setUserProfile(null);
          setFirebaseUser(null);
          setLoading(false);
          await signOut(auth).catch(() => {});
          isSigningOut = false;
          return;
        }
        if (!hasSessionKey()) {
          setSessionExpiry();
        }

        // Fetch profile silently — never throw
        try {
          const profile = await fetchUserProfile(user.uid);
          setUserProfile(profile);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Session expiry check every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingMinutes();
      setSessionMinutesLeft(remaining);

      if (remaining <= 0 && auth.currentUser) {
        clearSession();
        setUserProfile(null);
        setFirebaseUser(null);
        signOut(auth).catch(() => {});
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        sessionMinutesLeft,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
