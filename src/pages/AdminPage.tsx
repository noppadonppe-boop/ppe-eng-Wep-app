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
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { USER_ROLES, type UserProfile, type UserRole } from '../types/auth';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';
type AdminTab = 'users' | 'permissions' | 'cards';

// ── Card Management Types & Constants ─────────────────────────────────────────
interface CardItem {
  id: string;
  name: string;
  url: string;
  icon: string;   // emoji char หรือ 'fa-xxx'
  color: string;  // tailwind bg class
  desc: string;
  active: boolean;
  order: number;
}

interface CardForm {
  name: string;
  url: string;
  icon: string;
  color: string;
  desc: string;
  active: boolean;
  category: string;
}

const CARD_COLORS = [
  'bg-indigo-600', 'bg-sky-500',    'bg-teal-500',   'bg-emerald-500',
  'bg-green-600',  'bg-lime-500',   'bg-yellow-500', 'bg-orange-500',
  'bg-red-500',    'bg-rose-500',   'bg-pink-500',   'bg-fuchsia-500',
  'bg-purple-600', 'bg-violet-600', 'bg-slate-700',  'bg-slate-400',
];

const EMOJI_SUGGESTIONS = [
  '🏢','🗞️','📊','📋','📌','📁','🖇️','🌐',
  '🔧','💡','📝','🎯','🚀','📈','💼','🔍',
  '⚙️','🛡️','📐','🏗️','🧾','📦','🖥️','📡',
];

export default function AdminPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [adminTab, setAdminTab] = useState<AdminTab>('users');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function loadPending() {
      try {
        const snap = await getDocs(collection(db, FIRESTORE_PATHS.users));
        const count = snap.docs.filter(
          (d) => (d.data() as { status: string }).status === 'pending'
        ).length;
        setPendingCount(count);
      } catch { /* silent */ }
    }
    loadPending();
  }, []);

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
        <div className="flex gap-1 mb-6 bg-slate-200 rounded-xl p-1 w-fit flex-wrap">
          <button
            onClick={() => setAdminTab('users')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              adminTab === 'users'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-users"></i>
            User Management
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
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
          <button
            onClick={() => setAdminTab('cards')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              adminTab === 'cards'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-layer-group mr-2"></i>จัดการ Cards
          </button>
        </div>

        {adminTab === 'users' ? (
          <UserManagement userProfile={userProfile} />
        ) : adminTab === 'permissions' ? (
          <PermissionManagement userProfile={userProfile} />
        ) : (
          <CardManagement userProfile={userProfile} />
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
// Tab 3: Card Management
// ══════════════════════════════════════════════
function CardManagement({ userProfile: _userProfile }: { userProfile: UserProfile | null }) {
  const [selectedCat, setSelectedCat] = useState<string>(MENU_ITEMS[0].key);
  const [allCards, setAllCards] = useState<Record<string, CardItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCard, setEditCard] = useState<CardItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CardItem | null>(null);
  const [saving, setSaving] = useState(false);

  const DEFAULT_FORM: CardForm = {
    name: '', url: '', icon: '🌐', color: 'bg-indigo-600',
    desc: '', active: false, category: MENU_ITEMS[0].key,
  };
  const [form, setForm] = useState<CardForm>(DEFAULT_FORM);

  useEffect(() => { loadAllCards(); }, []);

  async function loadAllCards() {
    setLoading(true);
    try {
      const loaded: Record<string, CardItem[]> = {};
      for (const item of MENU_ITEMS) {
        const ref = collection(db, 'PPE-eng-Wep-app', 'root', item.key);
        const snap = await getDocs(ref);
        loaded[item.key] = snap.docs
          .filter((d) => d.id !== '_meta')
          .map((d) => ({ id: d.id, ...d.data() } as CardItem))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      }
      setAllCards(loaded);
    } catch (err) {
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditCard(null);
    setForm({ ...DEFAULT_FORM, category: selectedCat });
    setShowModal(true);
  }

  function openEditModal(card: CardItem) {
    setEditCard(card);
    setForm({
      name: card.name,
      url: card.url,
      icon: card.icon,
      color: card.color,
      desc: card.desc,
      active: card.active ?? false,
      category: selectedCat,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const category = form.category;
      const urlVal = form.url.trim() || '#';
      if (editCard) {
        const ref = doc(db, 'PPE-eng-Wep-app', 'root', selectedCat, editCard.id);
        await updateDoc(ref, {
          name: form.name.trim(), url: urlVal, icon: form.icon,
          color: form.color, desc: form.desc.trim(), active: form.active,
        });
        const updated = { ...editCard, name: form.name.trim(), url: urlVal, icon: form.icon, color: form.color, desc: form.desc.trim(), active: form.active };
        setAllCards((prev) => ({
          ...prev,
          [selectedCat]: (prev[selectedCat] || []).map((c) => c.id === editCard.id ? updated : c),
        }));
      } else {
        const catCards = allCards[category] || [];
        const newDocRef = doc(collection(db, 'PPE-eng-Wep-app', 'root', category));
        const newCard: CardItem = {
          id: newDocRef.id,
          name: form.name.trim(), url: urlVal, icon: form.icon,
          color: form.color, desc: form.desc.trim(), active: form.active,
          order: catCards.length,
        };
        await setDoc(newDocRef, newCard);
        setAllCards((prev) => ({ ...prev, [category]: [...(prev[category] || []), newCard] }));
        setSelectedCat(category);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error saving card:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(card: CardItem) {
    try {
      await deleteDoc(doc(db, 'PPE-eng-Wep-app', 'root', selectedCat, card.id));
      setAllCards((prev) => ({
        ...prev,
        [selectedCat]: (prev[selectedCat] || []).filter((c) => c.id !== card.id),
      }));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  }

  async function toggleActive(card: CardItem) {
    try {
      const ref = doc(db, 'PPE-eng-Wep-app', 'root', selectedCat, card.id);
      await updateDoc(ref, { active: !card.active });
      setAllCards((prev) => ({
        ...prev,
        [selectedCat]: (prev[selectedCat] || []).map((c) =>
          c.id === card.id ? { ...c, active: !c.active } : c
        ),
      }));
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  }

  function renderIcon(icon: string, size = 'text-xl') {
    if (!icon) return <i className={`fas fa-question ${size}`}></i>;
    if (icon.startsWith('fa-')) return <i className={`fas ${icon} ${size}`}></i>;
    return <span className="leading-none text-2xl">{icon}</span>;
  }

  const currentCards = allCards[selectedCat] || [];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการ Cards</h2>
          <p className="text-sm text-slate-500 mt-1">เพิ่ม แก้ไข หรือลบ Card ในแต่ละหมวดเมนู</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md"
        >
          <i className="fas fa-plus"></i>
          เพิ่ม Card ใหม่
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-5 mt-5">
        {MENU_ITEMS.map((item) => {
          const count = (allCards[item.key] || []).length;
          const isAct = selectedCat === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setSelectedCat(item.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors border ${
                isAct
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <i className={`fas ${item.icon} text-xs ${isAct ? 'text-indigo-200' : 'text-slate-400'}`}></i>
              <span className="hidden sm:inline">{item.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isAct ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {currentCards.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <i className="fas fa-layer-group text-4xl mb-3 block"></i>
            <p className="font-semibold">ยังไม่มี Card ในหมวดนี้</p>
            <p className="text-sm mt-1">คลิก "+ เพิ่ม Card ใหม่" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentCards.map((card) => (
              <div key={card.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className={`w-12 h-12 ${card.color || 'bg-indigo-600'} rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow`}>
                  {renderIcon(card.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{card.name}</span>
                    {(!card.url || card.url === '#') && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">ยังไม่มี URL</span>
                    )}
                    {card.active ? (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-500 rounded-full">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{card.url === '#' ? '—' : card.url}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{card.desc}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(card)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                      card.active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    title={card.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                  >
                    <i className="fas fa-check"></i>
                  </button>
                  <button
                    onClick={() => openEditModal(card)}
                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center text-sm transition-colors"
                    title="แก้ไข"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(card)}
                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-sm transition-colors"
                    title="ลบ"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${form.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  {renderIcon(form.icon)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{editCard ? 'แก้ไข Card' : 'เพิ่ม Card ใหม่'}</h3>
                  <p className="text-xs text-slate-400">
                    หมวด: {MENU_ITEMS.find((m) => m.key === form.category)?.label || form.category}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Preview */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 border border-slate-100">
                <div className={`w-14 h-14 ${form.color} rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                  {renderIcon(form.icon, 'text-3xl')}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{form.name || 'ชื่อ Card'}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{form.url || 'https://...'}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{form.desc || 'คำอธิบาย...'}</p>
                </div>
              </div>

              {/* Emoji */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  EMOJI (รูปภาพ) — <span className="font-normal text-slate-400 normal-case">วาง emoji ตรงนี้</span>
                </label>
                <input
                  type="text"
                  value={form.icon.startsWith('fa-') ? '' : form.icon}
                  onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value || p.icon }))}
                  placeholder="เช่น 🏢 📊 🚀"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  maxLength={4}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EMOJI_SUGGESTIONS.map((em) => (
                    <button
                      key={em}
                      onClick={() => setForm((p) => ({ ...p, icon: em }))}
                      className={`text-xl p-1.5 rounded-lg transition-colors hover:bg-slate-100 ${form.icon === em ? 'bg-indigo-100 ring-2 ring-indigo-400' : ''}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                >
                  {MENU_ITEMS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  ชื่อ CARD <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="เช่น QC Dashboard"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                  maxLength={60}
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://example.web.app"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">ใส่ # ถ้ายังไม่มี URL</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">คำอธิบาย</label>
                <textarea
                  value={form.desc}
                  onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
                  placeholder="อธิบายระบบสั้นๆ..."
                  rows={2}
                  maxLength={80}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm resize-none"
                />
                <p className="text-xs text-slate-400 text-right">{form.desc.length}/80</p>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">สีพื้นหลัง ICON (FALLBACK)</label>
                <div className="flex flex-wrap gap-2">
                  {CARD_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm((p) => ({ ...p, color }))}
                      className={`w-8 h-8 rounded-full transition-all ${color} ${
                        form.color === color ? 'ring-4 ring-offset-1 ring-indigo-500 scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div>
                  <p className="font-semibold text-sm text-slate-700">สถานะ Card</p>
                  <p className="text-xs text-slate-400 mt-0.5">{form.active ? 'แสดงบน Dashboard' : 'ซ่อนจาก Dashboard'}</p>
                </div>
                <button
                  onClick={() => setForm((p) => ({ ...p, active: !p.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 text-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-trash"></i>
              </div>
              <h3 className="font-bold text-slate-800">ลบ Card นี้?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบ{' '}
              <span className="font-semibold text-slate-700">"{deleteTarget.name}"</span>?{' '}
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-trash"></i>ลบ
              </button>
            </div>
          </div>
        </div>
      )}
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
