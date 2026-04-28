'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/components/LanguageProvider';

export default function ParentHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!loading && user && user.role !== 'parent') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== 'parent') return;
    fetch('/api/parent/overview')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [user]);

  if (loading || !user || user.role !== 'parent') {
    return (
      <DashboardLayout title={t('parentHome')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  const children = data?.children || [];

  return (
    <DashboardLayout title={t('parentHome')}>
      {children.length === 0 ? (
        <div className="alert alert-error">
          Farzand bog&apos;lanmagan. Administrator berilgan <strong>ota-ona ID</strong> bilan{' '}
          <a href="/register"> akkaunt yarating</a> yoki admin bilan bog&apos;laning.
        </div>
      ) : (
        children.map((ch: any) => (
          <div key={ch.studentId} className="card mb-6">
            <h3 className="card-title mb-4">{ch.name}</h3>
            <p className="text-sm text-gray-600 mb-2">
              Guruh: {ch.group || '—'} | Keyingi to&apos;lov:{' '}
              {ch.nextPaymentDate
                ? new Date(ch.nextPaymentDate).toLocaleDateString('uz-UZ')
                : '—'}{' '}
              | Oylik: {(ch.monthlyPrice ?? 0).toLocaleString()} so&apos;m
            </p>

            <h4 className="font-semibold mt-4 mb-2">So&apos;nggi davomat</h4>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Dars</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {(ch.attendance || []).slice(0, 10).map((a: any, i: number) => (
                    <tr key={i}>
                      <td>{a.date ? new Date(a.date).toLocaleDateString('uz-UZ') : ''}</td>
                      <td>{a.lessonNumber}</td>
                      <td>{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold mt-4 mb-2">Qayta ko&apos;chirilgan darslar</h4>
            {(ch.rescheduledHistory || []).length === 0 ? (
              <p className="text-gray-500 text-sm">Yo&apos;q</p>
            ) : (
              <ul className="text-sm space-y-1">
                {ch.rescheduledHistory.map((r: any, i: number) => (
                  <li key={i}>
                    {r.date ? new Date(r.date).toLocaleDateString('uz-UZ') : ''} — dars {r.lessonNumber}{' '}
                    → yangi sana:{' '}
                    {r.rescheduleDate
                      ? new Date(r.rescheduleDate).toLocaleDateString('uz-UZ')
                      : '—'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </DashboardLayout>
  );
}
