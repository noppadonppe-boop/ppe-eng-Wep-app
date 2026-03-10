import { Timestamp } from 'firebase/firestore';

export const USER_ROLES = [
  'Staff',
  'ppeTeam',
  'ppeLeader',
  'ppeManager',
  'Requestors',
  'Eng',
  'SenEng',
  'Arch',
  'SenArch',
  'ppeAdmin',
  'MasterAdmin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  role: UserRole[];
  status: UserStatus;
  assignedProjects: string[];
  createdAt: Timestamp;
  photoURL?: string;
  isFirstUser: boolean;
}

export interface AppMetaConfig {
  firstUserRegistered: boolean;
  totalUsers: number;
  createdAt: Timestamp;
}

export interface ActivityLog {
  action: 'REGISTER' | 'LOGIN' | 'LOGOUT' | 'APPROVE_USER' | 'REJECT_USER' | 'UPDATE_ROLE' | 'UPDATE_PERMISSIONS';
  uid: string;
  email: string;
  details?: string;
  timestamp: Timestamp;
}
