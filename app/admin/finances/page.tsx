'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import Modal from '@/components/Modal';
import { Pencil } from 'lucide-react';

export default function AdminFinancesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);
  const [staffCost, setStaffCost] = useState(0);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [overrideForm, setOverrideOverrideForm] = useState({
    salaryOverride: 0,
    overrideVisible: true
  });
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const fetchFinances = () => {
    fetch(`/api/admin/finances?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  };

  useEffect(() => {
    if (!loading && user && user.role !== 'admin' && user.role !== 'manager') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) return;
    fetchFinances();
    fetch('/api/staff')
      .then((r) => r.json())
      .then((rows: { monthlySalary?: number }[]) => {
        const s = Array.isArray(rows) ? rows.reduce((a, x) => a + (x.monthlySalary || 0), 0) : 0;
        setStaffCost(s);
      })
      .catch(() => setStaffCost(0));
  }, [user, month, year]);

  const openOverrideModal = (teacher: any) => {
    setEditingTeacher(teacher);
    setOverrideOverrideForm({
      salaryOverride: teacher.salaryOverride || teacher.teacherShare,
      overrideVisible: teacher.overrideVisible ?? true
    });
    setShowOverrideModal(true);
  };

  const handleOverrideSubmit = async () => {
    if (!editingTeacher) return;
    
    // We need to find the staffId for this teacher
    const staffRes = await fetch('/api/staff');
    const staffList = await staffRes.json();
    const staff = staffList.find((s: any) => s.userId === editingTeacher.teacherId);
    
    if (!staff) {
      alert('Bu ustoz uchun xodim ma\'lumotlari topilmadi');
      return;
    }

    try {
      const res = await fetch(`/api/staff/${staff._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...staff,
          salaryOverride: overrideForm.salaryOverride,
          overrideVisible: overrideForm.overrideVisible
        }),
      });

      if (res.ok) {
        fetchFinances();
        setShowOverrideModal(false);
      }
    } catch (error) {
      console.error('Error overriding salary:', error);
    }
  };

  if (loading || !user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <DashboardLayout title="Moliya">
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  const sum = data?.summary;
  const netProfit =
    (sum?.totalInflow ?? 0) - (sum?.totalTeacherPayouts ?? 0) - (staffCost || 0);

  return (
    <DashboardLayout title="Markaz va ustozlar moliyasi">
      <div className="toolbar flex-wrap gap-4 mb-6">
        <label className="flex items-center gap-2">
          Oy
          <input
            type="number"
            min={1}
            max={12}
            className="input"
            style={{ width: 80 }}
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)}
          />
        </label>
        <label className="flex items-center gap-2">
          Yil
          <input
            type="number"
            className="input"
            style={{ width: 100 }}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || 2026)}
          />
        </label>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-label">Jami tushum (biriktirilgan guruhlar)</div>
          <div className="stat-value" style={{ fontSize: '24px' }}>
            {(sum?.totalInflow ?? 0).toLocaleString()} so&apos;m
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ustozlarga (30%)</div>
          <div className="stat-value text-amber-700" style={{ fontSize: '24px' }}>
            {(sum?.totalTeacherPayouts ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Markaz ulushi (tushum − ustoz)</div>
          <div className="stat-value text-emerald-700" style={{ fontSize: '24px' }}>
            {(sum?.totalCenter ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Hodimlar oyliklari (oylik fond)</div>
          <div className="stat-value text-gray-800" style={{ fontSize: '24px' }}>
            {(staffCost ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="card mb-8 border-2 border-emerald-600/40 bg-emerald-50/50">
        <div className="p-4 text-center">
          <div className="text-sm text-gray-600 mb-1">Sof foyda (tushum − ustozlar − hodimlar)</div>
          <div className="text-3xl font-bold text-emerald-700">
            {netProfit.toLocaleString()} so&apos;m
          </div>
        </div>
      </div>

      {(data?.teachers || []).map((row: any) => (
        <div key={row.teacherId} className="card mb-6">
          <div className="card-header flex justify-between items-center">
            <h3 className="card-title">
              {row.displayName || row.username} — oylik ulushi:{' '}
              <span className={row.salaryOverride ? 'text-purple-600' : ''}>
                {(row.salaryOverride || row.teacherShare)?.toLocaleString()} so&apos;m
              </span>
              {row.salaryOverride && (
                <span className="text-[10px] ml-2 text-gray-400 line-through">
                  ({row.teacherShare?.toLocaleString()})
                </span>
              )}
            </h3>
            <button 
              onClick={() => openOverrideModal(row)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-purple-600"
            >
              <Pencil size={16} />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Jami tushum: {row.totalPayments?.toLocaleString()} | Markaz:{' '}
            {row.centerShare?.toLocaleString()}
          </p>
          <table className="table text-sm">
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Tushum</th>
                <th>Ustoz ulushi</th>
                <th>Markaz</th>
              </tr>
            </thead>
            <tbody>
              {(row.byStudent || []).map((s: any) => (
                <tr key={s.studentId}>
                  <td>{s.name}</td>
                  <td>{s.amount?.toLocaleString()}</td>
                  <td>{s.teacherPart?.toLocaleString()}</td>
                  <td>{s.centerPart?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <Modal 
        isOpen={showOverrideModal} 
        onClose={() => setShowOverrideModal(false)} 
        title={`${editingTeacher?.displayName || 'Ustoz'} oyligini tahrirlash`}
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label font-bold">Belgilangan oylik miqdori</label>
            <input
              type="number"
              className="input"
              value={overrideForm.salaryOverride}
              onChange={(e) => setOverrideOverrideForm({ ...overrideForm, salaryOverride: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-gray-400 mt-1 italic">
              * Tizim tomonidan hisoblangan: {editingTeacher?.teacherShare?.toLocaleString()} so'm
            </p>
          </div>

          <div className="form-group">
            <label className="form-label font-bold block mb-2">Ko'rinish turi</label>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setOverrideOverrideForm({ ...overrideForm, overrideVisible: true })}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${overrideForm.overrideVisible ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
              >
                Bildirish
              </button>
              <button
                onClick={() => setOverrideOverrideForm({ ...overrideForm, overrideVisible: false })}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${!overrideForm.overrideVisible ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
              >
                Bildirmaslik
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              {overrideForm.overrideVisible 
                ? "* Ustoz tahrirlangan miqdorni va o'zgarishni ko'radi" 
                : "* Ustoz faqat yakuniy sonni ko'radi, tahrirlanganini bilmaydi"}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <button onClick={handleOverrideSubmit} className="btn btn-primary flex-1">Saqlash</button>
            <button onClick={() => setShowOverrideModal(false)} className="btn btn-secondary">Bekor qilish</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
