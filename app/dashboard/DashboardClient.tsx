'use client';

import { useEffect, useMemo, memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Building } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import DashboardTabModal from '@/components/DashboardTabModal';

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
  schoolStats?: { school: string; count: number }[];
  financeSummary?: {
    totalExpected: number;
    totalDiscounts: number;
    teacherPayouts: number;
    netProfit: number;
    totalInflow: number;
  };
  paidCount?: number;
  unpaidCount?: number;
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

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US').format(amount || 0) + " so'm";
}

const IncomeBarRow = memo(function IncomeBarRow({
  label,
  income,
  max,
  variant,
  locale,
}: {
  label: string;
  income: number;
  max: number;
  variant: 'daily' | 'monthly';
  locale: string;
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
      <span className="text-sm font-semibold w-32 text-right">{formatMoney(income, locale)}</span>
    </div>
  );
});

export default function DashboardClient() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isOffice = user?.role === 'admin' || user?.role === 'manager';

  const [activeModal, setActiveModal] = useState<'students' | 'groups' | 'income' | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [tabModal, setTabModal] = useState<{
    isOpen: boolean;
    tabKey: 'attendance' | 'finances' | 'students' | 'payments' | 'reports';
    title: string;
  }>({
    isOpen: false,
    tabKey: 'students',
    title: '',
  });

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

  const { data: students } = useSWR<any[]>(activeModal === 'students' ? '/api/students' : null, fetcher);
  const { data: groups } = useSWR<any[]>(activeModal === 'groups' ? '/api/groups' : null, fetcher);
  const { data: groupStudents } = useSWR<any[]>(selectedGroup ? `/api/students?groupId=${selectedGroup._id}` : null, fetcher);

  const dashboard = data ?? empty;

  const exportToExcel = () => {
    if (!students) return;
    const ws = XLSX.utils.json_to_sheet(students.map((s, i) => ({
      '№': i + 1,
      'Ism': s.name,
      'Telefon': s.phone,
      'Guruh': s.groupId?.name || '-',
      'Oylik': s.monthlyPrice,
      'Holat': s.status === 'active' ? 'Faol' : 'Nofaol'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Talabalar');
    XLSX.writeFile(wb, 'Talabalar_royxati.xlsx');
  };

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

  const utilizationPercent = Math.min(100, Math.round((dashboard.activeStudents / 150) * 100)); // 150 - sig'im

  return (
    <DashboardLayout title={t('dashboard')}>
      {/* Utilization Widget */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 text-sm">Markaz foydalilik koeffitsiyenti</h3>
            <span className="text-purple-700 font-black">{utilizationPercent}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                utilizationPercent > 80 ? 'bg-green-500' : utilizationPercent > 50 ? 'bg-purple-500' : 'bg-orange-500'
              }`}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 italic">
            * 150 talaba sig'imi va joriy {dashboard.activeStudents} ta faol talaba asosida hisoblandi
          </p>
        </div>
        <div className="hidden md:flex ml-12 items-center gap-2 text-purple-700 font-bold bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
          <Building size={20} />
          <span>Hope Study Center</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveModal('students')}>
          <div className="stat-card-icon primary">👥</div>
          <div className="stat-label">{t('totalStudents')}</div>
          <div className="stat-value">{dashboard.totalStudents}</div>
          <div className="stat-change positive">
            {dashboard.activeStudents} {t('active')}
          </div>
        </div>
        <div className="stat-card cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveModal('groups')}>
          <div className="stat-card-icon success">📚</div>
          <div className="stat-label">{t('activeGroups')}</div>
          <div className="stat-value">{dashboard.activeGroups}</div>
          <div className="stat-change">
            {t('groups')}: {dashboard.totalGroups}
          </div>
        </div>
        <div className="stat-card cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveModal('income')}>
          <div className="stat-card-icon warning">💰</div>
          <div className="stat-label">{t('income')}</div>
          <div className="stat-value" style={{ fontSize: '26px' }}>
            {formatMoney(dashboard.paymentsThisMonth, locale)}
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

      {/* Modals */}
      {activeModal === 'students' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Barcha talabalar</h3>
              <div className="flex gap-2">
                <button onClick={exportToExcel} className="btn btn-sm btn-secondary bg-green-600 text-white hover:bg-green-700">Excel yuklab olish</button>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
                  <tr>
                    <th className="p-3 border">№</th>
                    <th className="p-3 border">Ism</th>
                    <th className="p-3 border">Telefon</th>
                    <th className="p-3 border">Guruh</th>
                    <th className="p-3 border">Oylik</th>
                    <th className="p-3 border">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {students?.map((s, i) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="p-3 border text-center">{i + 1}</td>
                      <td className="p-3 border font-medium">{s.name}</td>
                      <td className="p-3 border">{s.phone}</td>
                      <td className="p-3 border">{s.groupId?.name || '-'}</td>
                      <td className="p-3 border text-right">{formatMoney(s.monthlyPrice, locale)}</td>
                      <td className="p-3 border text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.status === 'active' ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'groups' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {selectedGroup ? `Guruh: ${selectedGroup.name}` : 'Faol guruhlar'}
              </h3>
              <div className="flex gap-2">
                {selectedGroup && (
                  <button onClick={() => setSelectedGroup(null)} className="btn btn-sm btn-secondary">Orqaga</button>
                )}
                <button onClick={() => { setActiveModal(null); setSelectedGroup(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {!selectedGroup ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups?.map((g) => (
                    <div 
                      key={g._id} 
                      onClick={() => setSelectedGroup(g)}
                      className="p-4 border rounded-xl hover:border-purple-400 cursor-pointer bg-gray-50 transition-all"
                    >
                      <h4 className="font-bold text-purple-700">{g.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">O'qituvchi: {g.teacherName}</p>
                      <p className="text-xs text-gray-500">Talabalar: {g.studentIds?.length || 0} ta</p>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="p-3 border w-12">№</th>
                      <th className="p-3 border">Ism</th>
                      <th className="p-3 border">Telefon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStudents?.map((s, i) => (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="p-3 border text-center">{i + 1}</td>
                        <td className="p-3 border font-medium">{s.name}</td>
                        <td className="p-3 border">{s.phone}</td>
                      </tr>
                    ))}
                    {groupStudents?.length === 0 && (
                      <tr><td colSpan={3} className="p-8 text-center text-gray-400">Bu guruhda talabalar yo'q</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'income' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Moliya va Daromad</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-[10px] text-blue-600 uppercase font-bold">Jami talabalar</p>
                  <p className="text-xl font-bold text-blue-800">{dashboard.totalStudents} ta</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-[10px] text-green-600 uppercase font-bold">To'lov qilganlar</p>
                  <p className="text-xl font-bold text-green-800">{dashboard.paidCount || 0} ta</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-[10px] text-red-600 uppercase font-bold">To'lov qilmaganlar</p>
                  <p className="text-xl font-bold text-red-800">{dashboard.unpaidCount || 0} ta</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-[10px] text-purple-600 uppercase font-bold">Muddati o'tganlar</p>
                  <p className="text-xl font-bold text-purple-800">{dashboard.debtorsCount} ta</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Kutilayotgan daromad:</span>
                  <span className="font-bold">{formatMoney(dashboard.financeSummary?.totalExpected || 0, locale)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Chegirmalar jami:</span>
                  <span className="font-bold text-red-500">-{formatMoney(dashboard.financeSummary?.totalDiscounts || 0, locale)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">O'qituvchi xarajatlari:</span>
                  <span className="font-bold text-orange-500">-{formatMoney(dashboard.financeSummary?.teacherPayouts || 0, locale)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t text-lg">
                  <span className="font-bold text-gray-800">Sof foyda (kutilayotgan):</span>
                  <span className="font-bold text-green-600">{formatMoney(dashboard.financeSummary?.netProfit || 0, locale)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="toolbar flex-wrap">
        <button 
          onClick={() => setTabModal({ isOpen: true, tabKey: 'attendance', title: t('attendance') })} 
          className="btn btn-primary"
        >
          {t('attendance')}
        </button>
        {isOffice && (
          <button 
            onClick={() => setTabModal({ isOpen: true, tabKey: 'finances', title: 'Moliya (ustozlar)' })} 
            className="btn btn-secondary"
          >
            Moliya (ustozlar)
          </button>
        )}
        <button 
          onClick={() => setTabModal({ isOpen: true, tabKey: 'students', title: t('students') })} 
          className="btn btn-secondary"
        >
          {t('students')}
        </button>
        <button 
          onClick={() => setTabModal({ isOpen: true, tabKey: 'payments', title: t('payments') })} 
          className="btn btn-secondary"
        >
          {t('payments')}
        </button>
        <button 
          onClick={() => setTabModal({ isOpen: true, tabKey: 'reports', title: t('reports') })} 
          className="btn btn-secondary"
        >
          {t('reports')}
        </button>
      </div>

      <DashboardTabModal 
        isOpen={tabModal.isOpen}
        tabKey={tabModal.tabKey}
        title={tabModal.title}
        onClose={() => setTabModal(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2">
          <div className="card-header cursor-pointer hover:bg-gray-50 transition-all" onClick={() => router.push('/reports?type=daily')}>
            <h3 className="card-title">
              {t('dailyReport')} — {t('income')}
            </h3>
          </div>
          <div className="space-y-3">
            {dashboard.last7DaysIncome.length === 0 ? (
              <p className="text-gray-500">{t('noData')}</p>
            ) : (
              dashboard.last7DaysIncome.map((row) => (
                <IncomeBarRow key={row.day} label={row.day} income={row.income} max={maxDaily} variant="daily" locale={locale} />
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Maktablar bo'yicha</h3>
          </div>
          <div className="space-y-4">
            {dashboard.schoolStats && dashboard.schoolStats.length > 0 ? (
              dashboard.schoolStats.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-gray-700">{item.school}-maktab</span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">{item.count} ta talaba</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 italic text-sm">
                Ma'lumotlar mavjud emas
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header cursor-pointer hover:bg-gray-50 transition-all" onClick={() => router.push('/reports?type=monthly')}>
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
                  locale={locale}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
