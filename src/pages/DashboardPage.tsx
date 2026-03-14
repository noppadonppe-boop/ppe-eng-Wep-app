import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/auth.service';
import { MENU_ITEMS, FIRESTORE_PATHS, type RolePermissions } from '../config/constants';

// ──────────────────────────────────────────────
// Fallback data (เหมือนเดิม)
// ──────────────────────────────────────────────
const fallbackData: Record<string, { title: string; apps: AppItem[] }> = {
  service: {
    title: 'PPE Engineering Service (Client Portal)',
    apps: [
      { name: 'Company Profile', url: '#', icon: 'fa-building', color: 'bg-indigo-600', desc: 'ข้อมูลประวัติบริษัท และผลงานวิศวกรรม' },
      { name: 'Service Request', url: '#', icon: 'fa-file-signature', color: 'bg-blue-600', desc: 'ฟอร์มขอใบเสนอราคา และ Request งาน' },
      { name: 'Project Portfolio', url: '#', icon: 'fa-images', color: 'bg-sky-500', desc: 'แกลเลอรีผลงานการออกแบบและก่อสร้าง' },
      { name: 'Client Dashboard', url: '#', icon: 'fa-chart-pie', color: 'bg-cyan-600', desc: 'ตรวจสอบสถานะโครงการสำหรับลูกค้า' },
    ],
  },
  process: {
    title: 'PPE Work Process',
    apps: [
      { name: 'Design Workflow', url: '#', icon: 'fa-bezier-curve', color: 'bg-emerald-600', desc: 'ขั้นตอนการออกแบบทางสถาปัตยกรรมและโครงสร้าง' },
      { name: 'Project Management', url: '#', icon: 'fa-bars-progress', color: 'bg-teal-500', desc: 'กระบวนการบริหารจัดการโครงการ' },
      { name: 'Construction Phase', url: '#', icon: 'fa-person-digging', color: 'bg-orange-500', desc: 'ขั้นตอนการควบคุมงานก่อสร้างหน้างาน' },
      { name: 'Handover & QA/QC', url: '#', icon: 'fa-list-check', color: 'bg-green-600', desc: 'การตรวจรับงานและส่งมอบโครงการ' },
    ],
  },
  calc: {
    title: 'Engineering Calculation App',
    apps: [
      { name: 'Structural Calc', url: '#', icon: 'fa-cubes', color: 'bg-slate-700', desc: 'โปรแกรมคำนวณโครงสร้าง (RC/Steel)' },
      { name: 'Electrical Load', url: '#', icon: 'fa-bolt', color: 'bg-yellow-500', desc: 'โปรแกรมคำนวณโหลดไฟฟ้าและขนาดสาย' },
      { name: 'HVAC Sizing', url: '#', icon: 'fa-fan', color: 'bg-cyan-500', desc: 'คำนวณระบบปรับอากาศและระบายอากาศ' },
      { name: 'Cost Estimator', url: '#', icon: 'fa-coins', color: 'bg-amber-600', desc: 'ระบบประเมินราคากลางก่อสร้าง (BOQ)' },
    ],
  },
  iso: {
    title: 'ISO Standard',
    apps: [
      { name: 'ISO 9001: QMS', url: '#', icon: 'fa-medal', color: 'bg-rose-600', desc: 'ระบบบริหารงานคุณภาพองค์กร' },
      { name: 'ISO 14001: EMS', url: '#', icon: 'fa-leaf', color: 'bg-emerald-500', desc: 'ระบบการจัดการสิ่งแวดล้อม' },
      { name: 'ISO 45001: OHSAS', url: '#', icon: 'fa-hard-hat', color: 'bg-orange-600', desc: 'ระบบการจัดการอาชีวอนามัยและความปลอดภัย' },
      { name: 'Audit Reports', url: '#', icon: 'fa-file-contract', color: 'bg-slate-600', desc: 'รายงานการตรวจประเมินคุณภาพภายใน' },
    ],
  },
  law: {
    title: 'กฎหมายเกี่ยวกับการขออนุญาต',
    apps: [
      { name: 'Building Regulations', url: '#', icon: 'fa-gavel', color: 'bg-red-700', desc: 'พ.ร.บ. ควบคุมอาคาร และกฎกระทรวง' },
      { name: 'EIA Standards', url: '#', icon: 'fa-tree-city', color: 'bg-green-700', desc: 'มาตรฐานและรายงานผลกระทบสิ่งแวดล้อม' },
      { name: 'Permit Application', url: '#', icon: 'fa-file-circle-check', color: 'bg-indigo-600', desc: 'ขั้นตอนการยื่นขออนุญาตก่อสร้าง/ดัดแปลงอาคาร' },
      { name: 'Local Authority Setup', url: '#', icon: 'fa-landmark', color: 'bg-blue-700', desc: 'ระเบียบข้อบังคับส่วนท้องถิ่น' },
    ],
  },
  knowledge: {
    title: 'Link Knowledge Page',
    apps: [
      { name: 'Engineering Library', url: '#', icon: 'fa-book', color: 'bg-purple-600', desc: 'ห้องสมุดคู่มือ มาตรฐานวิศวกรรม' },
      { name: 'Material Specs', url: '#', icon: 'fa-swatchbook', color: 'bg-pink-600', desc: 'แคตตาล็อกวัสดุก่อสร้างและสเปกงาน' },
      { name: 'Technical Blog', url: '#', icon: 'fa-blog', color: 'bg-fuchsia-600', desc: 'บทความแชร์ประสบการณ์แก้ปัญหาหน้างาน' },
      { name: 'Training & Webinars', url: '#', icon: 'fa-chalkboard-user', color: 'bg-violet-600', desc: 'คลังวิดีโออบรมสัมมนาของบริษัท' },
    ],
  },
  hr: {
    title: 'PPE Human Resource',
    apps: [
      { name: 'Careers @ PPE', url: '#', icon: 'fa-briefcase', color: 'bg-rose-500', desc: 'เปิดรับสมัครงานวิศวกรและสถาปนิก' },
      { name: 'Employee Portal', url: '#', icon: 'fa-id-badge', color: 'bg-slate-700', desc: 'ระบบลงชื่อเข้าใช้สำหรับพนักงาน (Intranet)' },
      { name: 'Internship Program', url: '#', icon: 'fa-user-graduate', color: 'bg-sky-600', desc: 'โครงการนักศึกษาฝึกงานและสหกิจศึกษา' },
      { name: 'Life at PPE', url: '#', icon: 'fa-face-smile', color: 'bg-amber-500', desc: 'กิจกรรมสวัสดิการ และความเป็นอยู่ของพนักงาน' },
    ],
  },
  doc: {
    title: 'Document Control',
    apps: [
      { name: 'Drawing Center', url: '#', icon: 'fa-compass-drafting', color: 'bg-cyan-700', desc: 'ระบบจัดเก็บและควบคุมเวอร์ชันแบบก่อสร้าง' },
      { name: 'Transmittal System', url: '#', icon: 'fa-paper-plane', color: 'bg-blue-600', desc: 'ระบบนำส่งเอกสาร (Document Transmittal)' },
      { name: 'Spec & Manual', url: '#', icon: 'fa-file-pdf', color: 'bg-red-500', desc: 'ศูนย์รวมข้อกำหนดและคู่มือมาตรฐาน' },
      { name: 'Archive Storage', url: '#', icon: 'fa-box-archive', color: 'bg-slate-600', desc: 'ระบบจัดเก็บเอกสารโครงการย้อนหลัง' },
    ],
  },
};

interface AppItem {
  name: string;
  url: string;
  icon: string;
  color: string;
  desc: string;
  order?: number;
  active?: boolean;
}

// ──────────────────────────────────────────────
// Dashboard Page
// ──────────────────────────────────────────────
export default function DashboardPage() {
  const { userProfile, sessionMinutesLeft } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('');
  const [appData, setAppData] = useState(fallbackData);
  const [dataLoading, setDataLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [rolePerms, setRolePerms] = useState<RolePermissions | null>(null);

  const isAdmin = userProfile?.role.some((r) =>
    ['MasterAdmin', 'ppeAdmin'].includes(r)
  );

  // Filter menu items based on user's roles and role permissions
  const visibleMenuItems = useMemo(() => {
    if (!userProfile) return [];
    // MasterAdmin sees everything
    if (userProfile.role.includes('MasterAdmin')) return [...MENU_ITEMS];
    // No permissions doc loaded yet → show all (fallback)
    if (!rolePerms) return [...MENU_ITEMS];

    const allowedKeys = new Set<string>();
    for (const role of userProfile.role) {
      const menus = rolePerms[role];
      if (menus) menus.forEach((k) => allowedKeys.add(k));
    }
    // If no permissions configured for any of the user's roles, show all
    if (allowedKeys.size === 0) return [...MENU_ITEMS];
    return MENU_ITEMS.filter((m) => allowedKeys.has(m.key));
  }, [userProfile, rolePerms]);

  // Load Firestore data + pending count + role permissions
  useEffect(() => {
    if (!userProfile) return;
    let cancelled = false;

    async function loadAll() {
      setDataLoading(true);
      try {
        // 1) Load app data from Firestore
        const loaded: typeof fallbackData = {};
        const categories = MENU_ITEMS.map((m) => m.key);

        for (const category of categories) {
          const appsRef = collection(db, 'PPE-eng-Wep-app', 'root', category);
          const snapshot = await getDocs(appsRef);
          if (!snapshot.empty) {
            const metaDoc = snapshot.docs.find((d) => d.id === '_meta');
            const apps = snapshot.docs
              .filter((d) => d.id !== '_meta')
              .map((d) => d.data() as AppItem)
              .filter((app) => app.active !== false)
              .sort((a, b) => (a.order || 0) - (b.order || 0));
            loaded[category] = {
              title: metaDoc ? (metaDoc.data().title as string) : category,
              apps,
            };
          }
        }
        if (!cancelled && Object.keys(loaded).length > 0) {
          setAppData(loaded);
        }

        // 2) Load pending user count (for admin badge)
        if (userProfile?.role.some((r) => ['MasterAdmin', 'ppeAdmin'].includes(r))) {
          try {
            const usersSnap = await getDocs(collection(db, FIRESTORE_PATHS.users));
            const pending = usersSnap.docs.filter(
              (d) => (d.data() as { status: string }).status === 'pending'
            ).length;
            if (!cancelled) setPendingCount(pending);
          } catch { /* silent */ }
        }

        // 3) Load role permissions
        try {
          const permSnap = await getDoc(doc(db, FIRESTORE_PATHS.rolePermissions));
          if (permSnap.exists() && !cancelled) {
            setRolePerms(permSnap.data() as RolePermissions);
          }
        } catch { /* silent */ }
      } catch (err) {
        console.error('Firestore load error:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [userProfile]);

  // Set default active tab when visible menus are ready
  useEffect(() => {
    if (visibleMenuItems.length > 0 && !activeTab) {
      setActiveTab(visibleMenuItems[0].key);
    }
  }, [visibleMenuItems, activeTab]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  function handleTabClick(key: string) {
    setActiveTab(key);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  if (!userProfile) return null;

  const currentData = appData[activeTab];

  return (
    <div className="flex min-h-screen relative overflow-x-hidden font-sarabun">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* ═══════════ Sidebar ═══════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:inset-auto md:flex`}
      >
        {/* Logo */}
        <div className="p-6 text-xl font-bold text-white flex items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <i className="fas fa-compass-drafting text-indigo-400 text-2xl"></i>
            <div className="flex flex-col">
              <span className="leading-tight">PPE Web Eng App</span>
              <span className="text-xs text-indigo-300 font-normal">Engineering &amp; Design</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 mt-2 overflow-y-auto pb-4">
          {visibleMenuItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                className={`w-full flex items-center px-6 py-4 transition-colors hover:bg-slate-800 ${
                  isActive
                    ? 'bg-indigo-900 text-white border-r-4 border-amber-400'
                    : ''
                }`}
              >
                <i className={`fas ${item.icon} w-8 text-lg`}></i>
                <span className="text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ═══ Admin section at bottom ═══ */}
        {isAdmin && (
          <div className="border-t border-slate-800">
            <Link
              to="/admin"
              className="w-full flex items-center px-6 py-4 transition-colors hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <i className="fas fa-shield-halved w-8 text-lg text-amber-400"></i>
              <span className="text-left flex-1">Admin Panel</span>
              {pendingCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-xs text-center text-slate-500">
          &copy; 2026 PPE Engineering Group
        </div>
      </aside>

      {/* ═══════════ Main Content ═══════════ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 transition-all duration-300">
        {/* Top Header */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h2 className="text-xl font-semibold text-slate-800 truncate">
              {currentData?.title || ''}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="ค้นหาบริการ..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 transition-all w-64 outline-none"
              />
              <i className="fas fa-search absolute left-3 top-2.5 text-slate-400"></i>
            </div>

            {/* Session timer */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <i className="fas fa-clock"></i>
              <span>{sessionMinutesLeft >= 60 * 24 ? 'ไม่มีกำหนด' : `${sessionMinutesLeft} นาที`}</span>
            </div>

            {/* User badge */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {userProfile.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-sm">
                <p className="font-semibold text-slate-700 leading-tight">
                  {userProfile.firstName} {userProfile.lastName}
                </p>
                <p className="text-xs text-slate-400">{userProfile.role.join(', ')}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="ออกจากระบบ"
            >
              <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 scroll-smooth">
          {dataLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 text-sm">กำลังโหลดข้อมูลจาก Database...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
              {currentData?.apps.map((app, idx) => (
                <a
                  key={idx}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-card bg-white p-6 rounded-2xl border border-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col items-center text-center group relative overflow-hidden"
                >
                  {/* Active checkmark badge */}
                  {app.active === true && (
                    <div className="absolute top-3 left-3 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center shadow-md z-10">
                      <i className="fas fa-check text-xs"></i>
                    </div>
                  )}
                  {/* External link icon */}
                  <div className="absolute top-3 right-3 text-slate-300 group-hover:text-indigo-400 transition-colors">
                    <i className="fas fa-arrow-up-right-from-square text-xs"></i>
                  </div>
                  <div
                    className={`w-16 h-16 ${app.color} text-white rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                  >
                    {app.icon && !app.icon.startsWith('fa-') ? (
                      <span className="text-3xl leading-none">{app.icon}</span>
                    ) : (
                      <i className={`fas ${app.icon || 'fa-link'}`}></i>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2">{app.name}</h3>
                  <p className="text-xs text-slate-500 mb-4 h-8 overflow-hidden">{app.desc}</p>
                  <div className="mt-auto text-indigo-600 text-sm font-semibold flex items-center gap-2 group-hover:underline">
                    เข้าใช้งาน{' '}
                    <i className="fas fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
