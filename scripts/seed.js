import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const appData = {
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

async function seed() {
  console.log('🔥 เริ่มอัปโหลดข้อมูล Mockup ไปยัง Firestore...');
  console.log(`📦 Project ID: ${firebaseConfig.projectId}`);

  try {
    // สร้าง root document
    const rootRef = doc(db, 'PPE-eng-Wep-app', 'root');
    await setDoc(rootRef, {
      createdAt: new Date().toISOString(),
      description: 'PPE Engineering Web App - Root Document',
      version: '1.0.0'
    });
    console.log('✅ สร้าง root document เรียบร้อย');

    // อัปโหลดข้อมูลแต่ละหมวดหมู่
    for (const [category, data] of Object.entries(appData)) {
      // สร้าง _meta document สำหรับเก็บชื่อหมวดหมู่
      const metaRef = doc(db, 'PPE-eng-Wep-app', 'root', category, '_meta');
      await setDoc(metaRef, { title: data.title });
      console.log(`  📁 หมวดหมู่: ${category} — "${data.title}"`);

      // สร้าง document สำหรับแต่ละ app
      for (let i = 0; i < data.apps.length; i++) {
        const appRef = doc(db, 'PPE-eng-Wep-app', 'root', category, `app_${i}`);
        await setDoc(appRef, {
          ...data.apps[i],
          order: i
        });
        console.log(`    ✅ ${data.apps[i].name}`);
      }
    }

    console.log('\n🎉 อัปโหลดข้อมูลทั้งหมดสำเร็จ!');
    console.log('📊 โครงสร้าง Firestore:');
    console.log('   Collection: PPE-eng-Wep-app');
    console.log('     └─ Document: root');
    for (const category of Object.keys(appData)) {
      console.log(`        └─ Subcollection: ${category}`);
      console.log(`           └─ _meta (title)`);
      console.log(`           └─ app_0, app_1, app_2, app_3`);
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
