import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Fallback mockup data (ใช้เมื่อไม่สามารถเชื่อมต่อ Firebase ได้)
const fallbackData = {
  service: {
    title: "PPE Engineering Service (Client Portal)",
    apps: [
      { name: "Company Profile", url: "#", icon: "fa-building", color: "bg-indigo-600", desc: "ข้อมูลประวัติบริษัท และผลงานวิศวกรรม" },
      { name: "Service Request", url: "#", icon: "fa-file-signature", color: "bg-blue-600", desc: "ฟอร์มขอใบเสนอราคา และ Request งาน" },
      { name: "Project Portfolio", url: "#", icon: "fa-images", color: "bg-sky-500", desc: "แกลเลอรีผลงานการออกแบบและก่อสร้าง" },
      { name: "Client Dashboard", url: "#", icon: "fa-chart-pie", color: "bg-cyan-600", desc: "ตรวจสอบสถานะโครงการสำหรับลูกค้า" }
    ]
  },
  process: {
    title: "PPE Work Process",
    apps: [
      { name: "Design Workflow", url: "#", icon: "fa-bezier-curve", color: "bg-emerald-600", desc: "ขั้นตอนการออกแบบทางสถาปัตยกรรมและโครงสร้าง" },
      { name: "Project Management", url: "#", icon: "fa-bars-progress", color: "bg-teal-500", desc: "กระบวนการบริหารจัดการโครงการ" },
      { name: "Construction Phase", url: "#", icon: "fa-person-digging", color: "bg-orange-500", desc: "ขั้นตอนการควบคุมงานก่อสร้างหน้างาน" },
      { name: "Handover & QA/QC", url: "#", icon: "fa-list-check", color: "bg-green-600", desc: "การตรวจรับงานและส่งมอบโครงการ" }
    ]
  },
  calc: {
    title: "Engineering Calculation App",
    apps: [
      { name: "Structural Calc", url: "#", icon: "fa-cubes", color: "bg-slate-700", desc: "โปรแกรมคำนวณโครงสร้าง (RC/Steel)" },
      { name: "Electrical Load", url: "#", icon: "fa-bolt", color: "bg-yellow-500", desc: "โปรแกรมคำนวณโหลดไฟฟ้าและขนาดสาย" },
      { name: "HVAC Sizing", url: "#", icon: "fa-fan", color: "bg-cyan-500", desc: "คำนวณระบบปรับอากาศและระบายอากาศ" },
      { name: "Cost Estimator", url: "#", icon: "fa-coins", color: "bg-amber-600", desc: "ระบบประเมินราคากลางก่อสร้าง (BOQ)" }
    ]
  },
  iso: {
    title: "ISO Standard",
    apps: [
      { name: "ISO 9001: QMS", url: "#", icon: "fa-medal", color: "bg-rose-600", desc: "ระบบบริหารงานคุณภาพองค์กร" },
      { name: "ISO 14001: EMS", url: "#", icon: "fa-leaf", color: "bg-emerald-500", desc: "ระบบการจัดการสิ่งแวดล้อม" },
      { name: "ISO 45001: OHSAS", url: "#", icon: "fa-hard-hat", color: "bg-orange-600", desc: "ระบบการจัดการอาชีวอนามัยและความปลอดภัย" },
      { name: "Audit Reports", url: "#", icon: "fa-file-contract", color: "bg-slate-600", desc: "รายงานการตรวจประเมินคุณภาพภายใน" }
    ]
  },
  law: {
    title: "กฎหมายเกี่ยวกับการขออนุญาต",
    apps: [
      { name: "Building Regulations", url: "#", icon: "fa-gavel", color: "bg-red-700", desc: "พ.ร.บ. ควบคุมอาคาร และกฎกระทรวง" },
      { name: "EIA Standards", url: "#", icon: "fa-tree-city", color: "bg-green-700", desc: "มาตรฐานและรายงานผลกระทบสิ่งแวดล้อม" },
      { name: "Permit Application", url: "#", icon: "fa-file-circle-check", color: "bg-indigo-600", desc: "ขั้นตอนการยื่นขออนุญาตก่อสร้าง/ดัดแปลงอาคาร" },
      { name: "Local Authority Setup", url: "#", icon: "fa-landmark", color: "bg-blue-700", desc: "ระเบียบข้อบังคับส่วนท้องถิ่น" }
    ]
  },
  knowledge: {
    title: "Link Knowledge Page",
    apps: [
      { name: "Engineering Library", url: "#", icon: "fa-book", color: "bg-purple-600", desc: "ห้องสมุดคู่มือ มาตรฐานวิศวกรรม" },
      { name: "Material Specs", url: "#", icon: "fa-swatchbook", color: "bg-pink-600", desc: "แคตตาล็อกวัสดุก่อสร้างและสเปกงาน" },
      { name: "Technical Blog", url: "#", icon: "fa-blog", color: "bg-fuchsia-600", desc: "บทความแชร์ประสบการณ์แก้ปัญหาหน้างาน" },
      { name: "Training & Webinars", url: "#", icon: "fa-chalkboard-user", color: "bg-violet-600", desc: "คลังวิดีโออบรมสัมมนาของบริษัท" }
    ]
  },
  hr: {
    title: "PPE Human Resource",
    apps: [
      { name: "Careers @ PPE", url: "#", icon: "fa-briefcase", color: "bg-rose-500", desc: "เปิดรับสมัครงานวิศวกรและสถาปนิก" },
      { name: "Employee Portal", url: "#", icon: "fa-id-badge", color: "bg-slate-700", desc: "ระบบลงชื่อเข้าใช้สำหรับพนักงาน (Intranet)" },
      { name: "Internship Program", url: "#", icon: "fa-user-graduate", color: "bg-sky-600", desc: "โครงการนักศึกษาฝึกงานและสหกิจศึกษา" },
      { name: "Life at PPE", url: "#", icon: "fa-face-smile", color: "bg-amber-500", desc: "กิจกรรมสวัสดิการ และความเป็นอยู่ของพนักงาน" }
    ]
  },
  doc: {
    title: "Document Control",
    apps: [
      { name: "Drawing Center", url: "#", icon: "fa-compass-drafting", color: "bg-cyan-700", desc: "ระบบจัดเก็บและควบคุมเวอร์ชันแบบก่อสร้าง" },
      { name: "Transmittal System", url: "#", icon: "fa-paper-plane", color: "bg-blue-600", desc: "ระบบนำส่งเอกสาร (Document Transmittal)" },
      { name: "Spec & Manual", url: "#", icon: "fa-file-pdf", color: "bg-red-500", desc: "ศูนย์รวมข้อกำหนดและคู่มือมาตรฐาน" },
      { name: "Archive Storage", url: "#", icon: "fa-box-archive", color: "bg-slate-600", desc: "ระบบจัดเก็บเอกสารโครงการย้อนหลัง" }
    ]
  }
};

const CATEGORIES = ['service', 'process', 'calc', 'iso', 'law', 'knowledge', 'hr', 'doc'];
let appData = {};

// โหลดข้อมูลจาก Firestore
async function loadDataFromFirestore() {
  try {
    for (const category of CATEGORIES) {
      const appsRef = collection(db, 'PPE-eng-Wep-app', 'root', category);
      const snapshot = await getDocs(appsRef);

      if (!snapshot.empty) {
        const metaDoc = snapshot.docs.find(d => d.id === '_meta');
        const apps = snapshot.docs
          .filter(d => d.id !== '_meta')
          .map(d => d.data())
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        appData[category] = {
          title: metaDoc ? metaDoc.data().title : category,
          apps: apps
        };
      }
    }

    // ถ้าไม่มีข้อมูลใน Firestore ให้ใช้ fallback
    if (Object.keys(appData).length === 0) {
      console.warn('ไม่พบข้อมูลใน Firestore ใช้ข้อมูล fallback แทน');
      appData = { ...fallbackData };
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ Firestore:', error);
    appData = { ...fallbackData };
  }
}

// สลับแท็บเมนู
function switchTab(tabKey) {
  const data = appData[tabKey];
  if (!data) return;

  const grid = document.getElementById('apps-grid');
  const title = document.getElementById('current-title');

  title.innerText = data.title;

  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${tabKey}`);
  if (activeBtn) activeBtn.classList.add('active');

  grid.innerHTML = data.apps.map(app => `
    <a href="${app.url}" target="_blank" class="app-card bg-white p-6 rounded-2xl border border-slate-200 transition-all flex flex-col items-center text-center group relative overflow-hidden">
      <div class="w-16 h-16 ${app.color} text-white rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
        <i class="fas ${app.icon}"></i>
      </div>
      <h3 class="font-bold text-slate-800 mb-2">${app.name}</h3>
      <p class="text-xs text-slate-500 mb-4 h-8 overflow-hidden">${app.desc}</p>
      <div class="mt-auto text-indigo-600 text-sm font-semibold flex items-center gap-2 group-hover:underline">
        เข้าใช้งาน <i class="fas fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
      </div>
    </a>
  `).join('');

  // ปิด Sidebar ในมือถืออัตโนมัติเมื่อกดเลือกเมนู
  if (window.innerWidth < 768) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar.classList.contains('-translate-x-full')) {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }
  }
}

// Toggle sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
}

// เริ่มต้นแอป
async function initApp() {
  const loadingEl = document.getElementById('loading-indicator');

  // ผูก event handler กับ sidebar
  window.toggleSidebar = toggleSidebar;
  window.switchTab = switchTab;

  try {
    await loadDataFromFirestore();
  } catch (e) {
    console.error('Init error:', e);
    appData = { ...fallbackData };
  }

  // ซ่อน loading
  if (loadingEl) loadingEl.style.display = 'none';

  // แสดงเนื้อหาแรก
  switchTab('service');
}

// เริ่มต้นเมื่อ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', initApp);
