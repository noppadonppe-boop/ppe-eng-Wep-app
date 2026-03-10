import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

export default function PendingPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-xl p-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
            <i className="fas fa-hourglass-half text-amber-600 text-3xl"></i>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-3">
            รอการอนุมัติ
          </h1>

          <p className="text-slate-500 mb-2">
            บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ
          </p>

          {userProfile && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl text-sm text-left space-y-1">
              <p>
                <span className="font-semibold text-slate-600">ชื่อ:</span>{' '}
                {userProfile.firstName} {userProfile.lastName}
              </p>
              <p>
                <span className="font-semibold text-slate-600">อีเมล:</span>{' '}
                {userProfile.email}
              </p>
              <p>
                <span className="font-semibold text-slate-600">ตำแหน่ง:</span>{' '}
                {userProfile.position || '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-600">สถานะ:</span>{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                  <i className="fas fa-clock text-[10px]"></i> รอการอนุมัติ
                </span>
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-6 mb-4">
            กรุณารอจนกว่าผู้ดูแลระบบจะอนุมัติบัญชีของคุณ
          </p>

          <button
            onClick={handleLogout}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm"
          >
            <i className="fas fa-right-from-bracket mr-2"></i>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
