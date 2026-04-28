'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';

export default function AdminFinancesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!loading && user && user.role !== 'admin' && user.role !== 'manager') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) return;
    fetch(`/api/admin/finances?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [user, month, year]);

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
          <div className="stat-label">Markaz foydasi (70% + boshqa)</div>
          <div className="stat-value text-emerald-700" style={{ fontSize: '24px' }}>
            {(sum?.totalCenter ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {(data?.teachers || []).map((row: any) => (
        <div key={row.teacherId} className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">
              {row.displayName || row.username} — oylik ulushi:{' '}
              {row.teacherShare?.toLocaleString()} so&apos;m
            </h3>
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
                <th>Ustoz 30%</th>
                <th>Markaz 70%</th>
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
    </DashboardLayout>
  );
}
