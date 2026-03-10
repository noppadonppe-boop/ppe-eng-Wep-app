import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/auth.service';
import { logActivity } from '../services/activity.service';
import { db } from '../config/firebase';
import { FIRESTORE_PATHS, MENU_ITEMS, type MenuKey, type RolePermissions } from '../config/constants';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { USER_ROLES, type UserProfile, type UserRole } from '../types/auth';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';
type AdminTab = 'users' | 'permissions';

export default function AdminPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [adminTab, setAdminTab] = useState<AdminTab>('users');

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sarabun">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fas fa-shield-halved text-indigo-600 text-xl"></i>
            <h1 className="text-lg font-bold text-slate-800">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <i className="fas fa-arrow-left mr-1"></i>
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Admin Tab Switcher */}
        <div className="flex gap-1 mb-6 bg-slate-200 rounded-xl p-1 w-fit">
          <button
            onClick={() => setAdminTab('users')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              adminTab === 'users'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-users mr-2"></i>จัดการผู้ใช้งาน
          </button>
          <button
            onClick={() => setAdminTab('permissions')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              adminTab === 'permissions'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-key mr-2"></i>จัดการสิทธิ์เมนู
          </button>
        </div>

        {adminTab === 'users' ? (
          <UserManagement userProfile={userProfile} />
        ) : (
          <PermissionManagement userProfile={userProfile} />
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════
// Tab 1: User Management
// ══════════════════════════════════════════════
function UserManagement({ userProfile }: { userProfile: UserProfile | null }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const ref = collection(db, FIRESTORE_PATHS.users);
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data() as UserProfile);
      setUsers(list);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserStatus(uid: string, status: 'approved' | 'rejected') {
    try {
      const ref = doc(db, FIRESTORE_PATHS.users, uid);
      await updateDoc(ref, { status });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, status } : u))
      );
      const action = status === 'approved' ? 'APPROVE_USER' : 'REJECT_USER';
      const target = users.find((u) => u.uid === uid);
      if (userProfile) {
        logActivity(action, userProfile.uid, userProfile.email, `${action} ${target?.email}`);
      }
    } catch (err) {
      console.error('Error updating user:', err);
    }
  }

  async function saveRoles(uid: string) {
    try {
      const ref = doc(db, FIRESTORE_PATHS.users, uid);
      await updateDoc(ref, { role: editRoles });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: editRoles } : u))
      );
      const target = users.find((u) => u.uid === uid);
      if (userProfile) {
        logActivity('UPDATE_ROLE', userProfile.uid, userProfile.email, `Updated roles for ${target?.email}: ${editRoles.join(', ')}`);
      }
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating roles:', err);
    }
  }

  function toggleRole(role: UserRole) {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  const filteredUsers = filter === 'all' ? users : users.filter((u) => u.status === filter);

  const counts = {
    all: users.length,
    pending: users.filter((u) => u.status === 'pending').length,
    approved: users.filter((u) => u.status === 'approved').length,
    rejected: users.filter((u) => u.status === 'rejected').length,
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">จัดการผู้ใช้งาน</h2>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as FilterTab[]).map((tab) => {
          const labels: Record<FilterTab, string> = {
            all: 'ทั้งหมด', pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ',
          };
          const colors: Record<FilterTab, string> = {
            all: 'bg-slate-600', pending: 'bg-amber-500', approved: 'bg-green-600', rejected: 'bg-red-500',
          };
          const isActive = filter === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                isActive
                  ? `${colors[tab]} text-white shadow`
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {labels[tab]}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <i className="fas fa-users text-4xl mb-3"></i>
          <p>ไม่พบผู้ใช้งาน</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ผู้ใช้</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ตำแหน่ง</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">บทบาท</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">สถานะ</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {u.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.position || '-'}</td>
                    <td className="px-4 py-3">
                      {editingUser === u.uid ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {USER_ROLES.map((role) => (
                            <button
                              key={role}
                              onClick={() => toggleRole(role)}
                              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                                editRoles.includes(role)
                                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              {role}
                            </button>
                          ))}
                          <div className="flex gap-1 mt-1 w-full">
                            <button
                              onClick={() => saveRoles(u.uid)}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <i className="fas fa-check mr-1"></i>บันทึก
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.role.map((r) => (
                            <span key={r} className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-full font-medium">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateUserStatus(u.uid, 'approved')}
                              className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              title="อนุมัติ"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              onClick={() => updateUserStatus(u.uid, 'rejected')}
                              className="px-2.5 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="ปฏิเสธ"
                            >
                              <i className="fas fa-xmark"></i>
                            </button>
                          </>
                        )}
                        {u.status === 'rejected' && (
                          <button
                            onClick={() => updateUserStatus(u.uid, 'approved')}
                            className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            title="อนุมัติ"
                          >
                            <i className="fas fa-check mr-1"></i>อนุมัติ
                          </button>
                        )}
                        {editingUser !== u.uid && (
                          <button
                            onClick={() => {
                              setEditingUser(u.uid);
                              setEditRoles([...u.role]);
                            }}
                            className="px-2.5 py-1 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                            title="แก้ไข Role"
                          >
                            <i className="fas fa-pen-to-square"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// Tab 2: Role Permission Management
// ══════════════════════════════════════════════
function PermissionManagement({ userProfile }: { userProfile: UserProfile | null }) {
  const [perms, setPerms] = useState<RolePermissions>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    loadPermissions();
  }, []);

  async function loadPermissions() {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, FIRESTORE_PATHS.rolePermissions));
      if (snap.exists()) {
        setPerms(snap.data() as RolePermissions);
      } else {
        // Initialize with all roles having all menus
        const initial: RolePermissions = {};
        const allKeys = MENU_ITEMS.map((m) => m.key) as MenuKey[];
        for (const role of USER_ROLES) {
          initial[role] = [...allKeys];
        }
        setPerms(initial);
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleMenu(role: string, menuKey: MenuKey) {
    setPerms((prev) => {
      const current = prev[role] || [];
      const updated = current.includes(menuKey)
        ? current.filter((k) => k !== menuKey)
        : [...current, menuKey];
      return { ...prev, [role]: updated };
    });
    setSaveMsg('');
  }

  function selectAll(role: string) {
    const allKeys = MENU_ITEMS.map((m) => m.key) as MenuKey[];
    setPerms((prev) => ({ ...prev, [role]: [...allKeys] }));
    setSaveMsg('');
  }

  function deselectAll(role: string) {
    setPerms((prev) => ({ ...prev, [role]: [] }));
    setSaveMsg('');
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    try {
      await setDoc(doc(db, FIRESTORE_PATHS.rolePermissions), perms);
      setSaveMsg('บันทึกสิทธิ์เรียบร้อยแล้ว');
      if (userProfile) {
        logActivity('UPDATE_PERMISSIONS', userProfile.uid, userProfile.email, 'Updated role menu permissions');
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      setSaveMsg('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Exclude MasterAdmin from the list (always has full access)
  const editableRoles = USER_ROLES.filter((r) => r !== 'MasterAdmin');

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการสิทธิ์เมนู</h2>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดว่าแต่ละ Role จะเห็นเมนูไหนบ้างใน Sidebar
            <span className="ml-2 text-xs text-amber-600 font-semibold">
              <i className="fas fa-crown mr-1"></i>MasterAdmin เห็นทุกเมนูเสมอ
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={`text-sm font-semibold ${saveMsg.includes('ผิดพลาด') ? 'text-red-600' : 'text-green-600'}`}>
              <i className={`fas ${saveMsg.includes('ผิดพลาด') ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-1`}></i>
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <i className="fas fa-floppy-disk"></i>
            )}
            บันทึก
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[160px]">
                  Role
                </th>
                {MENU_ITEMS.map((m) => (
                  <th key={m.key} className="text-center px-3 py-3 font-semibold text-slate-600 min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <i className={`fas ${m.icon} text-base text-slate-400`}></i>
                      <span className="text-xs leading-tight">{m.label}</span>
                    </div>
                  </th>
                ))}
                <th className="text-center px-3 py-3 font-semibold text-slate-600 min-w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editableRoles.map((role) => {
                const roleMenus = perms[role] || [];
                const allKeys = MENU_ITEMS.map((m) => m.key);
                const allSelected = allKeys.every((k) => roleMenus.includes(k as MenuKey));
                return (
                  <tr key={role} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                        {role}
                      </span>
                    </td>
                    {MENU_ITEMS.map((m) => {
                      const checked = roleMenus.includes(m.key as MenuKey);
                      return (
                        <td key={m.key} className="text-center px-3 py-3">
                          <button
                            onClick={() => toggleMenu(role, m.key as MenuKey)}
                            className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                              checked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-slate-300 text-transparent hover:border-indigo-300'
                            }`}
                          >
                            <i className="fas fa-check text-xs"></i>
                          </button>
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-3">
                      <button
                        onClick={() => allSelected ? deselectAll(role) : selectAll(role)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                          allSelected
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                      >
                        {allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// Shared Components
// ══════════════════════════════════════════════
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'รออนุมัติ' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'อนุมัติแล้ว' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'ปฏิเสธ' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
