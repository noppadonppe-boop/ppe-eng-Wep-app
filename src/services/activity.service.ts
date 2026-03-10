import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FIRESTORE_PATHS } from '../config/constants';
import type { ActivityLog } from '../types/auth';

export function logActivity(
  action: ActivityLog['action'],
  uid: string,
  email: string,
  details?: string
): void {
  const ref = collection(db, FIRESTORE_PATHS.activityLogs);
  addDoc(ref, {
    action,
    uid,
    email,
    details: details || '',
    timestamp: Timestamp.now(),
  }).catch(() => {});
}
