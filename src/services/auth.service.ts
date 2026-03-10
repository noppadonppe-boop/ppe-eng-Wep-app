import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { FIRESTORE_PATHS } from '../config/constants';
import { setSessionExpiry, clearSession } from './session.service';
import { logActivity } from './activity.service';
import type { UserProfile, UserRole } from '../types/auth';

const googleProvider = new GoogleAuthProvider();

// ──────────────────────────────────────────────
// Fetch user profile from Firestore
// ──────────────────────────────────────────────
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, FIRESTORE_PATHS.users, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Create user profile with first-user detection
// ──────────────────────────────────────────────
async function createUserProfile(
  firebaseUser: FirebaseUser,
  firstName: string,
  lastName: string,
  position: string
): Promise<UserProfile> {
  const configRef = doc(db, FIRESTORE_PATHS.appMetaConfig);
  const userRef = doc(db, FIRESTORE_PATHS.users, firebaseUser.uid);

  const profile = await runTransaction(db, async (transaction) => {
    const configSnap = await transaction.get(configRef);

    let isFirst = false;
    if (!configSnap.exists() || !configSnap.data().firstUserRegistered) {
      isFirst = true;
      transaction.set(
        configRef,
        {
          firstUserRegistered: true,
          totalUsers: 1,
          createdAt: Timestamp.now(),
        },
        { merge: true }
      );
    } else {
      transaction.update(configRef, { totalUsers: increment(1) });
    }

    const roles: UserRole[] = isFirst ? ['MasterAdmin'] : ['Staff'];
    const status = isFirst ? 'approved' : 'pending';

    const newProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      firstName,
      lastName,
      position,
      role: roles,
      status,
      assignedProjects: [],
      createdAt: Timestamp.now(),
      photoURL: firebaseUser.photoURL || undefined,
      isFirstUser: isFirst,
    };

    transaction.set(userRef, newProfile);
    return newProfile;
  });

  return profile;
}

// ──────────────────────────────────────────────
// Email/Password Registration
// ──────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  position: string
): Promise<UserProfile> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // CRITICAL: set session IMMEDIATELY after sign-in, before any awaits
  setSessionExpiry();

  const profile = await createUserProfile(
    credential.user,
    firstName,
    lastName,
    position
  );

  logActivity('REGISTER', credential.user.uid, email, 'Email registration');
  return profile;
}

// ──────────────────────────────────────────────
// Email/Password Login
// ──────────────────────────────────────────────
export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserProfile | null> {
  const credential = await signInWithEmailAndPassword(auth, email, password);

  // CRITICAL: set session IMMEDIATELY
  setSessionExpiry();

  await credential.user.getIdToken(true);
  const profile = await fetchUserProfile(credential.user.uid);

  logActivity('LOGIN', credential.user.uid, email, 'Email login');
  return profile;
}

// ──────────────────────────────────────────────
// Google Sign-In (Popup)
// ──────────────────────────────────────────────
export async function loginWithGoogle(): Promise<{
  profile: UserProfile | null;
  isNewUser: boolean;
}> {
  const credential = await signInWithPopup(auth, googleProvider);

  // CRITICAL: set session IMMEDIATELY
  setSessionExpiry();

  await credential.user.getIdToken(true);

  // Check if existing user
  const existingProfile = await fetchUserProfile(credential.user.uid);
  if (existingProfile) {
    logActivity('LOGIN', credential.user.uid, credential.user.email || '', 'Google login');
    return { profile: existingProfile, isNewUser: false };
  }

  // New user → auto-create with Staff + pending
  const displayName = credential.user.displayName || '';
  const [firstName, ...lastParts] = displayName.split(' ');
  const lastName = lastParts.join(' ') || '';

  const profile = await createUserProfile(
    credential.user,
    firstName || '',
    lastName,
    ''
  );

  logActivity('REGISTER', credential.user.uid, credential.user.email || '', 'Google registration');
  return { profile, isNewUser: true };
}

// ──────────────────────────────────────────────
// Logout
// ──────────────────────────────────────────────
export async function logout(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    logActivity('LOGOUT', user.uid, user.email || '');
  }
  clearSession();
  await signOut(auth);
}

// ──────────────────────────────────────────────
// Firebase error message helper
// ──────────────────────────────────────────────
export function getAuthErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/user-not-found': 'ไม่พบบัญชีผู้ใช้นี้',
    'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
    'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
    'auth/weak-password': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    'auth/popup-closed-by-user': 'หน้าต่าง Google Sign-In ถูกปิด',
    'auth/unauthorized-domain': 'โดเมนนี้ไม่ได้รับอนุญาตใน Firebase Console',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'auth/too-many-requests': 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่',
  };
  return messages[errorCode] || `เกิดข้อผิดพลาด (${errorCode})`;
}
