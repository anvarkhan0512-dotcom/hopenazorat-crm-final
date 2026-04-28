'use client';

import { useEffect, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'fetch failed');
  return json;
};

interface DashboardData {
  totalStudents: number;
  activeStudents: number;
  totalGroups: number;
  activeGroups: number;
  paymentsThisMonth: number;
  debtorsCount: number;
  last7DaysIncome: { day: string; income: number }[];
  last6MonthsIncome: { month: string; income: number }[];
}

const empty: DashboardData = {
  totalStudents: 0,
  activeStudents: 0,
  totalGroups: 0,
  activeGroups: 0,
  paymentsThisMonth: 0,
  debtorsCount: 0,
  last7DaysIncome: [],
  last6MonthsIncome: [],
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount || 0) + " so'm";
}

const IncomeBarRow = memo(function IncomeBarRow({
  label,
  income,
  max,
  variant,
}: {
  label: string;
  income: number;
  max: number;
  variant: 'daily' | 'monthly';
}) {
  const pct = max > 0 ? (income / max) * 100 : 0;
  const barClass =
    variant === 'daily'
      ? 'h-full rounded-lg bg-gradient-to-r from-indigo-500 to-sky-500 transition-all'
      : 'h-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 transition-all';
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
        <div className={barClass} style={{ width: `${pct}%`, minWidth: income > 0 ? '8px' : 0 }} />
      </div>
      <span className="text-sm font-semibold w-32 text-right">{formatMoney(income)}</span>
    </div>
  );
});

export default function DashboardClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isOffice = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === 'teacher') router.replace('/teacher');
    if (user.role === 'parent') router.replace('/parent');
    if (user.role === 'student') router.replace('/student');
  }, [authLoading, user, router]);
  const { data, isLoading } = useSWR<DashboardData>('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const dashboard = data ?? empty;

  if (isLoading && data === undefined) {
    return (
      <DashboardLayout title={t('dashboard')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  const maxDaily = Math.max(1, ...dashboard.last7DaysIncome.map((d) => d.income));
  const maxMonthly = Math.max(1, ...dashboard.last6MonthsIncome.map((d) => d.income));

  return (
    <DashboardLayout title={t('dashboard')}>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon primary">👥</div>
          <div className="stat-label">{t('totalStudents')}</div>
          <div className="stat-value">{dashboard.totalStudents}</div>
          <div className="stat-change positive">
            {dashboard.activeStudents} {t('active')}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success">📚</div>
          <div className="stat-label">{t('activeGroups')}</div>
          <div className="stat-value">{dashboard.activeGroups}</div>
          <div className="stat-change">
            {t('groups')}: {dashboard.totalGroups}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon warning">💰</div>
          <div className="stat-label">{t('income')}</div>
          <div className="stat-value" style={{ fontSize: '26px' }}>
            {formatMoney(dashboard.paymentsThisMonth)}
          </div>
          <div className="stat-change">{t('payments')} — {t('monthlyReport')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon danger">⚠️</div>
          <div className="stat-label">{t('debtorsCount')}</div>
          <div className="stat-value">{dashboard.debtorsCount}</div>
          <Link
            href="/debtors"
            className="stat-change"
            style={{ textDecoration: 'none', color: 'var(--primary)' }}
          >
            {t('debtors')} →
          </Link>
        </div>
      </div>

      <div className="toolbar flex-wrap">
        <Link href="/dashboard/attendance" className="btn btn-primary">
          {t('attendance')}
        </Link>
        {isOffice && (
          <Link href="/admin/finances" className="btn btn-secondary">
            Moliya (ustozlar)
          </Link>
        )}
        <Link href="/students" className="btn btn-secondary">
          {t('students')}
        </Link>
        <Link href="/payments" className="btn btn-secondary">
          {t('payments')}
        </Link>
        <Link href="/reports" className="btn btn-secondary">
          {t('reports')}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {t('dailyReport')} — {t('income')}
            </h3>
          </div>
          <div className="space-y-3">
            {dashboard.last7DaysIncome.length === 0 ? (
              <p className="text-gray-500">{t('noData')}</p>
            ) : (
              dashboard.last7DaysIncome.map((row) => (
                <IncomeBarRow key={row.day} label={row.day} income={row.income} max={maxDaily} variant="daily" />
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {t('monthlyReport')} — {t('income')}
            </h3>
          </div>
          <div className="space-y-3">
            {dashboard.last6MonthsIncome.length === 0 ? (
              <p className="text-gray-500">{t('noData')}</p>
            ) : (
              dashboard.last6MonthsIncome.map((row) => (
                <IncomeBarRow
                  key={row.month}
                  label={row.month}
                  income={row.income}
                  max={maxMonthly}
                  variant="monthly"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
