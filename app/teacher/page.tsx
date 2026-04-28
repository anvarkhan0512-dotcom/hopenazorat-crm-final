'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';

export default function TeacherHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!loading && user && user.role !== 'teacher') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'teacher') return;
    fetch('/api/teacher/overview')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [user]);

  if (loading || !user || user.role !== 'teacher') {
    return (
      <DashboardLayout title={t('teacherHome')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  const fin = data?.finance;

  return (
    <DashboardLayout title={t('teacherHome')}>
      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-card-icon primary">📚</div>
          <div className="stat-label">Guruhlar</div>
          <div className="stat-value">{data?.groups?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success">👥</div>
          <div className="stat-label">Talabalar</div>
          <div className="stat-value">{data?.students?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon warning">%</div>
          <div className="stat-label">Ustoz ulushi (30%)</div>
          <div className="stat-value" style={{ fontSize: '26px' }}>
            {(fin?.teacherShare ?? 0).toLocaleString()} so&apos;m
          </div>
          <div className="stat-change">
            Oy: {data?.month}/{data?.year}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon danger">💰</div>
          <div className="stat-label">Tushum (oy)</div>
          <div className="stat-value" style={{ fontSize: '22px' }}>
            {(fin?.totalPayments ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="toolbar flex-wrap mb-6">
        <Link href="/teacher/homework" className="btn btn-primary">
          {t('homeworkMenu')}
        </Link>
        <Link href="/dashboard/attendance" className="btn btn-secondary">
          {t('attendance')}
        </Link>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">Talabadan tushum (30%)</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Talaba</th>
              <th>Oy tushumi</th>
              <th>Ustoz (30%)</th>
              <th>Markaz (70%)</th>
            </tr>
          </thead>
          <tbody>
            {(fin?.byStudent || []).length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6">
                  Bu oy uchun to&apos;lov yozuvi yo&apos;q
                </td>
              </tr>
            ) : (
              fin.byStudent.map((row: any) => (
                <tr key={row.studentId}>
                  <td>{row.name}</td>
                  <td>{row.amount?.toLocaleString()} so&apos;m</td>
                  <td>{row.teacherPart?.toLocaleString()}</td>
                  <td>{row.centerPart?.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
