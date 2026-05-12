'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Modal from '@/components/Modal';
import NotificationBell from '@/components/NotificationBell';

interface StaffMember {
  _id: string;
  username: string;
  role: string;
  displayName: string;
  avatarUrl: string;
  revealablePassword: string;
  lastLogin: string | null;
  loginCount: number;
  monthlyEarnings?: number;
  paymentsReceived?: number;
  paymentsCount?: number;
  createdAt: string;
}

interface ParentMember {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  revealablePassword: string;
  children: { name: string; phone: string }[];
  lastLogin: string | null;
  createdAt: string;
}

interface StudentFull {
  _id: string;
  name: string;
  phone: string;
  groupName: string;
  status: string;
  arrivalDate: string;
  monthlyPrice: number;
  nextPaymentDate: string;
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  parentName: string;
  parentPhone: string;
  studentUsername: string;
  studentPassword: string;
  homeworkStatus: string;
  lastLogin: string | null;
  createdAt: string;
}

export default function BossDashboard() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [parents, setParents] = useState<ParentMember[]>([]);
  const [students, setStudents] = useState<StudentFull[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isNewCenterModalOpen, setIsNewCenterModalOpen] = useState(false);
  const [newCenterForm, setNewCenterForm] = useState({
    name: '',
    adminUsername: '',
    adminPassword: '',
    trialDays: '7',
    logoText: '',
    primaryColor: '#7c3aed',
  });
  const [newCenterSaving, setNewCenterSaving] = useState(false);
  const [newCenterResult, setNewCenterResult] = useState<string | null>(null);

  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'boss') {
      router.push('/dashboard');
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [staffRes, parentsRes, studentsRes, centersRes] = await Promise.all([
        fetch('/api/boss/staff'),
        fetch('/api/boss/parents'),
        fetch('/api/boss/students-full'),
        fetch('/api/boss/centers'),
      ]);

      if (staffRes.ok) setStaff(await staffRes.json());
      if (parentsRes.ok) setParents(await parentsRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (centersRes.ok) {
        const data = await centersRes.json();
        setCenters(data.centers || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockCenter = async (centerId: string, block: boolean) => {
    try {
      const res = await fetch(`/api/boss/centers/${centerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: block }),
      });
      if (res.ok) {
        setCenters((prev: any) =>
          prev.map((c: any) => (c._id === centerId ? { ...c, isBlocked: block } : c))
        );
      }
    } catch (error) {
      console.error('Toggle block error:', error);
    }
  };

  const handleImpersonate = async (targetUserId: string) => {
    setImpersonating(targetUserId);
    try {
      const res = await fetch('/api/boss/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirectTo;
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Impersonate error:', error);
      alert('Xatolik yuz berdi');
    } finally {
      setImpersonating(null);
    }
  };

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewCenterSaving(true);
    try {
      const res = await fetch('/api/boss/centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCenterForm),
      });
      const data = await res.json();
      if (res.ok && data.center?._id) {
        setNewCenterResult(`Login URL: hopestudy.uz/login?c=${data.center._id}`);
        setTimeout(() => {
          setIsNewCenterModalOpen(false);
          setNewCenterResult(null);
          setNewCenterForm({
            name: '',
            adminUsername: '',
            adminPassword: '',
            trialDays: '7',
            logoText: '',
            primaryColor: '#7c3aed',
          });
          fetchAllData();
        }, 3000);
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Create center error:', error);
      alert('Xatolik yuz berdi');
    } finally {
      setNewCenterSaving(false);
    }
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openModal = (type: string) => {
    setModalOpen(type);
  };

  const renderStaffModal = () => {
    const admins = staff.filter(s => s.role === 'admin' || s.role === 'manager');
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Admin &amp; Managerlar</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-2 text-left">Avatar</th>
                <th className="p-2 text-left">Ism</th>
                <th className="p-2 text-left">Login</th>
                <th className="p-2 text-left">Parol</th>
                <th className="p-2 text-left">Kirish</th>
                <th className="p-2 text-left">Amal</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(s => (
                <tr key={s._id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {s.avatarUrl ? (
                        <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (s.displayName || s.username).charAt(0).toUpperCase()
                      )}
                    </div>
                  </td>
                  <td className="p-2 font-medium">{s.displayName || '-'}</td>
                  <td className="p-2 font-mono text-xs">{s.username}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">
                        {showPasswords[s._id] ? s.revealablePassword || '********' : '********'}
                      </span>
                      <button onClick={() => togglePassword(s._id)} className="text-gray-400 hover:text-gray-600">
                        👁
                      </button>
                    </div>
                  </td>
                  <td className="p-2 text-xs text-gray-500">
                    {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString('uz-UZ') : 'Hech qachon'}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleImpersonate(s._id)}
                      disabled={impersonating === s._id}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {impersonating === s._id ? '...' : 'Tizimga kirish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTeachersModal = () => {
    const teachers = staff.filter(s => s.role === 'teacher');
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Ustozlar</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-2 text-left">Avatar</th>
                <th className="p-2 text-left">Ism</th>
                <th className="p-2 text-left">Login</th>
                <th className="p-2 text-left">Parol</th>
                <th className="p-2 text-left">Oylik daromad</th>
                <th className="p-2 text-left">Oldi/Olmadi</th>
                <th className="p-2 text-left">Amal</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t._id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {t.avatarUrl ? (
                        <img src={t.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (t.displayName || t.username).charAt(0).toUpperCase()
                      )}
                    </div>
                  </td>
                  <td className="p-2 font-medium">{t.displayName || '-'}</td>
                  <td className="p-2 font-mono text-xs">{t.username}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">
                        {showPasswords[t._id] ? t.revealablePassword || '********' : '********'}
                      </span>
                      <button onClick={() => togglePassword(t._id)} className="text-gray-400 hover:text-gray-600">
                        👁
                      </button>
                    </div>
                  </td>
                  <td className="p-2 font-bold text-emerald-600">
                    {t.monthlyEarnings?.toLocaleString()} so&apos;m
                  </td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      (t.paymentsCount || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.paymentsCount || 0} ta to&apos;lov
                    </span>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleImpersonate(t._id)}
                      disabled={impersonating === t._id}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {impersonating === t._id ? '...' : 'Tizimga kirish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderParentsModal = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Ota-onalar</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-2 text-left">Ism</th>
              <th className="p-2 text-left">Login</th>
              <th className="p-2 text-left">Parol</th>
              <th className="p-2 text-left">Farzand</th>
              <th className="p-2 text-left">Kirgan</th>
              <th className="p-2 text-left">Amal</th>
            </tr>
          </thead>
          <tbody>
            {parents.map(p => (
              <tr key={p._id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{p.displayName || '-'}</td>
                <td className="p-2 font-mono text-xs">{p.username}</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">
                      {showPasswords[p._id] ? p.revealablePassword || '********' : '********'}
                    </span>
                    <button onClick={() => togglePassword(p._id)} className="text-gray-400 hover:text-gray-600">
                      👁
                    </button>
                  </div>
                </td>
                <td className="p-2 text-xs">
                  {p.children.map((c, i) => (
                    <div key={i}>{c.name}</div>
                  ))}
                </td>
                <td className="p-2 text-xs text-gray-500">
                  {p.lastLogin ? new Date(p.lastLogin).toLocaleDateString('uz-UZ') : 'Hech qachon'}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleImpersonate(p._id)}
                    disabled={impersonating === p._id}
                    className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {impersonating === p._id ? '...' : 'Tizimga kirish'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStudentsModal = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Talabalar</h3>
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b">
              <th className="p-2 text-left">Ism</th>
              <th className="p-2 text-left">Guruh</th>
              <th className="p-2 text-left">To&apos;lov</th>
              <th className="p-2 text-left">Holat</th>
              <th className="p-2 text-left">Kelgan</th>
              <th className="p-2 text-left">Ota-ona</th>
              <th className="p-2 text-left">Login</th>
              <th className="p-2 text-left">Amal</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s._id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2 text-xs">{s.groupName || '-'}</td>
                <td className="p-2">
                  <div className={`text-xs ${s.overduePayments > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {s.lastPaymentDate
                      ? `${s.lastPaymentAmount.toLocaleString()} so'm (${new Date(s.lastPaymentDate).toLocaleDateString('uz-UZ')})`
                      : 'To\'lov yo\'q'}
                  </div>
                </td>
                <td className="p-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-2 text-xs text-gray-500">
                  {s.arrivalDate ? new Date(s.arrivalDate).toLocaleDateString('uz-UZ') : '-'}
                </td>
                <td className="p-2 text-xs">
                  <div>{s.parentName || '-'}</div>
                  <div className="text-gray-400">{s.parentPhone || ''}</div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">
                      {showPasswords[s._id]
                        ? `${s.studentUsername || '-'} / ${s.studentPassword || '-'}`
                        : '******** / ********'}
                    </span>
                    <button onClick={() => togglePassword(s._id)} className="text-gray-400 hover:text-gray-600">
                      👁
                    </button>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleImpersonate(s.studentUserId || s._id)}
                    disabled={impersonating === s.studentUserId || impersonating === s._id}
                    className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {impersonating === s.studentUserId || impersonating === s._id ? '...' : 'Kirish'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <div className="h-screen w-full grid grid-cols-2 grid-rows-2 relative overflow-hidden bg-black">
        <button
          onClick={() => setIsNewCenterModalOpen(true)}
          className="absolute top-4 left-4 z-20 bg-white text-purple-600 px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-purple-50 transition-all flex items-center gap-2"
        >
          <span>+</span> Yangi markaz qo&apos;shish
        </button>

        <div className="absolute top-4 right-4 z-20">
          <NotificationBell />
        </div>

        <div
          onClick={() => openModal('markaz')}
          className="cursor-pointer overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 p-8 flex flex-col justify-between transition-all duration-500 hover:scale-[0.98] border-b border-r border-white/5"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <span className="text-9xl">🏛️</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-white/90 tracking-tighter uppercase italic">Markaz</h2>
            <p className="text-purple-300 text-sm font-bold mt-1">Admin &amp; Manager boshqaruvi</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
              Jami adminlar: {staff.filter(s => s.role === 'admin' || s.role === 'manager').length} ta
            </p>
          </div>
        </div>

        <div
          onClick={() => openModal('ota-onalar')}
          className="cursor-pointer overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 p-8 flex flex-col justify-between transition-all duration-500 hover:scale-[0.98] border-b border-white/5"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <span className="text-9xl">👪</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-white/90 tracking-tighter uppercase italic">Ota-onalar</h2>
            <p className="text-blue-300 text-sm font-bold mt-1">Ota-ona akkauntlari</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
              Jami ota-onalar: {parents.length} ta
            </p>
          </div>
        </div>

        <div
          onClick={() => openModal('ustozlar')}
          className="cursor-pointer overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-8 flex flex-col justify-between transition-all duration-500 hover:scale-[0.98] border-r border-white/5"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <span className="text-9xl">👨‍🏫</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-white/90 tracking-tighter uppercase italic">Ustozlar</h2>
            <p className="text-emerald-300 text-sm font-bold mt-1">Ustozlar va oylik daromadlar</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1 border border-white/10">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Ustozlar</p>
              <p className="text-2xl font-black text-white">
                {staff.filter(s => s.role === 'teacher').length} <span className="text-xs">ta</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1 border border-white/10">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Jami oylik</p>
              <p className="text-lg font-black text-emerald-400">
                {staff
                  .filter(s => s.role === 'teacher')
                  .reduce((sum, t) => sum + (t.monthlyEarnings || 0), 0)
                  .toLocaleString()}
                <span className="text-xs"> so&apos;m</span>
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => openModal('talabalar')}
          className="cursor-pointer overflow-hidden bg-gradient-to-br from-orange-900 via-orange-800 to-amber-950 p-8 flex flex-col justify-between transition-all duration-500 hover:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <span className="text-9xl">🎓</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-white/90 tracking-tighter uppercase italic">Talabalar</h2>
            <p className="text-orange-300 text-sm font-bold mt-1">Talabalar boshqaruvi</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
              Jami talabalar: {students.length} ta
            </p>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center">
            <img src="/icons/icon-192.png" alt="Hope Study" className="w-16 h-16" />
          </div>
        </div>

        <div className="absolute top-4 right-16 z-20">
          <button
            onClick={() => logout()}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white/50 hover:text-white"
            title="Chiqish"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* CENTERS LIST */}
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            🏫 Markazlar ro&apos;yxati
          </h2>
          <button onClick={() => setIsNewCenterModalOpen(true)}
            className="bg-purple-700 text-white px-4 py-2 
              rounded-xl font-medium hover:bg-purple-800">
            + Yangi markaz
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 
          lg:grid-cols-3 gap-4">
          {centers.map((center: any) => (
            <div key={center._id}
              className={`bg-white rounded-2xl shadow-md 
                border-2 cursor-pointer hover:shadow-lg 
                transition-all p-4 
                ${center.isBlocked 
                  ? 'border-red-300' 
                  : 'border-purple-200'}`}
              onClick={() => setSelectedCenter(center)}>
              
              {/* Header */}
              <div className="flex items-center 
                justify-between mb-3">
                <h3 className="font-bold text-lg text-gray-800">
                  {center.name}
                </h3>
                <span className={`text-xs px-2 py-1 
                  rounded-full font-medium
                  ${center.isBlocked 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-green-100 text-green-600'}`}>
                  {center.isBlocked ? '🔴 Bloklangan' : 'Faol'}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg p-2 
                  text-center">
                  <p className="text-xs text-gray-500">
                    Talabalar
                  </p>
                  <p className="font-bold text-purple-700">
                    {center.studentCount || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 
                  text-center">
                  <p className="text-xs text-gray-500">
                    Trial tugashi
                  </p>
                  <p className="font-bold text-orange-600 text-xs">
                    {center.trialEndsAt 
                      ? new Date(center.trialEndsAt)
                          .toLocaleDateString('uz')
                      : 'Cheksiz'}
                  </p>
                </div>
              </div>

              {/* URL */}
              <div className="bg-purple-50 rounded-lg p-2 mb-3">
                <p className="text-xs text-gray-500 mb-1">
                  Login URL:
                </p>
                <div className="flex items-center gap-1">
                  <code className="text-xs text-purple-700 
                    flex-1 truncate">
                    hopestudy.uz/login?c={center._id}
                  </code>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(
                        `https://hopestudy.uz/login?c=${center._id}`
                      );
                      alert('Nusxa olindi!');
                    }}
                    className="text-xs bg-purple-600 
                      text-white px-2 py-1 rounded-lg 
                      hover:bg-purple-700 flex-shrink-0">
                    📋
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <a 
                  href={`https://hopestudy.uz/login?c=${center._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-center text-xs 
                    bg-blue-500 text-white py-2 rounded-lg 
                    hover:bg-blue-600">
                  🔗 Kirish
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBlockCenter(center._id, 
                      !center.isBlocked);
                  }}
                  className={`flex-1 text-xs py-2 rounded-lg
                    ${center.isBlocked 
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'}`}>
                  {center.isBlocked ? '✅ Ochish' : '🔒 Bloklash'}
                </button>
              </div>
            </div>
          ))}

          {centers.length === 0 && (
            <div className="col-span-3 text-center 
              py-12 text-gray-400">
              <p className="text-4xl mb-2">🏫</p>
              <p>Hali markaz qo&apos;shilmagan</p>
              <button 
                onClick={() => setIsNewCenterModalOpen(true)}
                className="mt-3 text-purple-600 underline text-sm">
                Yangi markaz qo&apos;shish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER DETAIL MODAL */}
      {selectedCenter && (
        <div className="fixed inset-0 bg-black/50 z-50 
          flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full 
            max-w-lg shadow-2xl">
            <div className="p-4 border-b flex justify-between">
              <h2 className="font-bold text-lg">
                🏫 {selectedCenter.name}
              </h2>
              <button onClick={() => setSelectedCenter(null)}>
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              
              {/* Login URL */}
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-sm font-medium mb-1">
                  🔗 Login URL:
                </p>
                <code className="text-sm text-blue-700 
                  break-all">
                  https://hopestudy.uz/login?c={selectedCenter._id}
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://hopestudy.uz/login?c=${selectedCenter._id}`
                    );
                    alert('Nusxa olindi!');
                  }}
                  className="mt-2 w-full bg-blue-500 
                    text-white py-2 rounded-lg text-sm">
                  📋 URL nusxa olish
                </button>
              </div>

              {/* Admin info */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-medium mb-2">
                  👤 Admin ma&apos;lumotlari:
                </p>
                <p className="text-sm">
                  Login: <strong>
                    {selectedCenter.adminUsername}
                  </strong>
                </p>
                <p className="text-sm">
                  Parol: <strong>
                    {selectedCenter.adminPassword}
                  </strong>
                </p>
              </div>

              {/* Trial info */}
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-sm font-medium mb-1">
                  ⏰ Trial muddati:
                </p>
                <p className="text-sm text-orange-700">
                  {selectedCenter.trialEndsAt 
                    ? new Date(selectedCenter.trialEndsAt)
                        .toLocaleDateString('uz')
                    : 'Cheksiz'}
                </p>
              </div>

              {/* Open center button */}
              <a 
                href={`https://hopestudy.uz/login?c=${selectedCenter._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center 
                  bg-purple-700 text-white py-3 
                  rounded-xl font-medium hover:bg-purple-800">
                🚀 Markaz tizimini ochish
              </a>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen === 'markaz'} onClose={() => setModalOpen(null)} title="Markaz Boshqaruvi">
        {renderStaffModal()}
      </Modal>

      <Modal isOpen={modalOpen === 'ustozlar'} onClose={() => setModalOpen(null)} title="Ustozlar">
        {renderTeachersModal()}
      </Modal>

      <Modal isOpen={modalOpen === 'ota-onalar'} onClose={() => setModalOpen(null)} title="Ota-onalar">
        {renderParentsModal()}
      </Modal>

      <Modal isOpen={modalOpen === 'talabalar'} onClose={() => setModalOpen(null)} title="Talabalar">
        {renderStudentsModal()}
      </Modal>

      <Modal isOpen={isNewCenterModalOpen} onClose={() => !newCenterSaving && setIsNewCenterModalOpen(false)} title="Yangi markaz qo'shish">
        <form onSubmit={handleCreateCenter} className="space-y-4">
          {newCenterResult ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-emerald-700 font-bold text-sm">{newCenterResult}</p>
              <p className="text-emerald-600 text-xs mt-1">Markaz muvaffaqiyatli yaratildi!</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Markaz nomi</label>
                <input
                  type="text"
                  value={newCenterForm.name}
                  onChange={e => setNewCenterForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Admin login</label>
                  <input
                    type="text"
                    value={newCenterForm.adminUsername}
                    onChange={e => setNewCenterForm(f => ({ ...f, adminUsername: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Admin parol</label>
                  <input
                    type="password"
                    value={newCenterForm.adminPassword}
                    onChange={e => setNewCenterForm(f => ({ ...f, adminPassword: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Trial kunlar</label>
                  <input
                    type="number"
                    value={newCenterForm.trialDays}
                    onChange={e => setNewCenterForm(f => ({ ...f, trialDays: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Boshlang&apos;ich rang</label>
                  <input
                    type="color"
                    value={newCenterForm.primaryColor}
                    onChange={e => setNewCenterForm(f => ({ ...f, primaryColor: e.target.value }))}
                    className="w-full h-10 border rounded-xl cursor-pointer"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={newCenterSaving}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50"
              >
                {newCenterSaving ? 'Yaratilmoqda...' : "Markaz yaratish"}
              </button>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
