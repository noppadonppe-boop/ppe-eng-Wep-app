export const APP_NAME = 'PPE-eng-Wep-app';
export const APP_PREFIX = 'ppe_eng';

export const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 1 year (session อยู่ได้นานที่สุด)
export const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds
export const SESSION_KEY = `${APP_PREFIX}_session_expires`;

export const FIRESTORE_PATHS = {
  root: `${APP_NAME}/root`,
  users: `${APP_NAME}/root/users`,
  appMeta: `${APP_NAME}/root/appMeta`,
  appMetaConfig: `${APP_NAME}/root/appMeta/config`,
  rolePermissions: `${APP_NAME}/root/appMeta/rolePermissions`,
  customMenus: `${APP_NAME}/root/customMenus`,
  activityLogs: `${APP_NAME}/root/activityLogs`,
} as const;

export const MENU_ITEMS = [
  { key: 'service', icon: 'fa-handshake-angle', label: 'PPE Engineering Service' },
  { key: 'process', icon: 'fa-network-wired', label: 'PPE Work Process' },
  { key: 'calc', icon: 'fa-calculator', label: 'Engineering Calculation App' },
  { key: 'iso', icon: 'fa-certificate', label: 'ISO Standard' },
  { key: 'law', icon: 'fa-scale-balanced', label: 'กฏหมายและการขออนุญาต' },
  { key: 'knowledge', icon: 'fa-lightbulb', label: 'Link Knowledge Page' },
  { key: 'hr', icon: 'fa-users-viewfinder', label: 'PPE Human Resource' },
  { key: 'doc', icon: 'fa-folder-tree', label: 'Document Control' },
] as const;

export interface MenuItem {
  key: string;
  icon: string;
  label: string;
  color?: string;
  order?: number;
}

export type MenuKey = string;

export type RolePermissions = Record<string, MenuKey[]>;
