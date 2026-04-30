'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/components/LanguageProvider';

function attendanceStatus(status: string, t: any): string {
  switch (status) {
    case 'present':
      return t('attendancePresent');
    case 'absent':
      return t('attendanceAbsent');
    case 'rescheduled':
      return t('attendanceRescheduled');
    case 'transferred':
      return t('attendanceTransferred');
    default:
      return status;
  }
}

export default function ParentHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t, locale } = useLanguage();
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
          {t('parentNotLinked')}
        </div>
      ) : (
        children.map((ch: any) => (
          <div key={ch.studentId} className="card mb-6">
            <h3 className="card-title mb-4">{ch.name}</h3>
            <p className="text-sm text-gray-600 mb-2">
              {t('group')}: {ch.group || '—'} | {t('nextPayment')}:{' '}
              {ch.nextPaymentDate
                ? new Date(ch.nextPaymentDate).toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US')
                : '—'}{' '}
              | {t('monthlyPrice')}: {(ch.monthlyPrice ?? 0).toLocaleString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US')} soʻm
            </p>

            {ch.debt?.isOverdue ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-3 py-2 text-sm mb-3">
                <strong>{t('debtReminder')}</strong> {t('overdueHint')}{' '}
                {(ch.debt.hintAmount ?? 0).toLocaleString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US')} soʻm. {t('pleasePaySoon')}
              </div>
            ) : (
              <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
                {t('noOverdue')}
              </p>
            )}

            <h4 className="font-semibold mt-3 mb-2">{t('groupSchedule')}</h4>
            {ch.groupScheduleLines?.length ? (
              <ul className="text-sm list-disc pl-5 space-y-1 mb-1">
                {ch.groupScheduleLines.map((line: string, i: number) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : ch.groupScheduleText ? (
              <p className="text-sm text-gray-700 mb-1">{ch.groupScheduleText}</p>
            ) : (
              <p className="text-sm text-gray-500 mb-1">{t('noSchedule')}</p>
            )}
            {ch.lessonCalendarWeekParityLabel ? (
              <p className="text-xs text-gray-600 mb-3">{t('weekMode')} {ch.lessonCalendarWeekParityLabel}</p>
            ) : null}

            <h4 className="font-semibold mt-4 mb-2">{t('recentAttendance')}</h4>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{t('lesson')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(ch.attendance || []).slice(0, 10).map((a: any, i: number) => (
                    <tr key={i}>
                      <td>{a.date ? new Date(a.date).toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US') : ''}</td>
                      <td>{a.lessonNumber}</td>
                      <td>{attendanceStatus(a.status, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold mt-4 mb-2">{t('rescheduledLessons')}</h4>
            {(ch.rescheduledHistory || []).length === 0 ? (
              <p className="text-gray-500 text-sm">{t('none')}</p>
            ) : (
              <ul className="text-sm space-y-1">
                {ch.rescheduledHistory.map((r: any, i: number) => (
                  <li key={i}>
                    {r.date ? new Date(r.date).toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US') : ''} — {t('lesson')} {r.lessonNumber}{' '}
                    → {t('newDate')}{' '}
                    {r.rescheduleDate
                      ? new Date(r.rescheduleDate).toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US')
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
