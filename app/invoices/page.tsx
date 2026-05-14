'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

import { useLanguage } from '@/components/LanguageProvider';

interface Invoice {
  _id: string;
  studentId: string;
  studentName: string;
  phone: string;
  groupName: string;
  month: number;
  year: number;
  originalPrice: number;
  totalDiscount: number;
  amount: number;
  paidAmount: number;
  debt: number;
  status: 'pending' | 'partial' | 'paid';
}

const months = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [groups, setGroups] = useState<{ _id: string; name: string }[]>([]);
  const [financeGroupId, setFinanceGroupId] = useState('');
  const [groupFinance, setGroupFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const currentDate = new Date();
  const [monthFilter, setMonthFilter] = useState((currentDate.getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(currentDate.getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState('');
  const { t, locale } = useLanguage();

  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => r.json())
      .then((g) => setGroups(Array.isArray(g.items) ? g.items : []))
      .catch(() => setGroups([]));
  }, []);

  const loadGroupFinance = async () => {
    if (!financeGroupId) return;
    const r = await fetch(`/api/groups/${financeGroupId}/finance`);
    setGroupFinance(r.ok ? await r.json() : null);
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('month', monthFilter);
      params.append('year', yearFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) throw new Error('Hisob-fakturalarni yuklashda xatolik');
      const data = await res.json();
      setInvoices(data.items || data.invoices || data || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [monthFilter, yearFilter, statusFilter]);

  useEffect(() => {
    if (monthFilter && yearFilter) {
      fetchInvoices();
    }
  }, [monthFilter, yearFilter, fetchInvoices]);

  const generateInvoices = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: parseInt(monthFilter),
          year: parseInt(yearFilter),
          regenerate: false,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        fetchInvoices();
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge badge-success">{t('paid')}</span>;
      case 'partial':
        return <span className="badge badge-warning">Qisman</span>;
      default:
        return <span className="badge badge-danger">{t('unpaid')}</span>;
    }
  };

  const summary = {
    total: (invoices || []).length,
    paid: (invoices || []).filter(i => i.status === 'paid').length,
    partial: (invoices || []).filter(i => i.status === 'partial').length,
    pending: (invoices || []).filter(i => i.status === 'pending').length,
    rawTotal: (invoices || []).reduce((sum, i) => sum + i.originalPrice, 0),
    totalDiscounts: (invoices || []).reduce((sum, i) => sum + i.totalDiscount, 0),
    totalAmount: (invoices || []).reduce((sum, i) => sum + i.amount, 0),
    totalPaid: (invoices || []).reduce((sum, i) => sum + i.paidAmount, 0),
    totalDebt: (invoices || []).reduce((sum, i) => sum + i.debt, 0),
  };

  return (
    <DashboardLayout title="To'lovlar Umumiy">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => fetchInvoices()} className="text-sm underline font-bold">Qayta urinish</button>
        </div>
      )}
      <div className="card mb-4">
        <h3 className="card-title mb-2">Guruh bo‘yicha real vaqtda hisob-kitob</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="select"
            value={financeGroupId}
            onChange={(e) => setFinanceGroupId(e.target.value)}
          >
            <option value="">Guruh tanlang</option>
            {(groups || []).map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary" onClick={loadGroupFinance}>
            Hisoblash
          </button>
        </div>
        {groupFinance && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Kutilayotgan oylik</div>
              <div className="font-semibold">
                {formatMoney(groupFinance.expectedMonthlyTuition || 0, locale)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Joriy oy tushumi</div>
              <div className="font-semibold">
                {formatMoney(groupFinance.monthInflow || 0, locale)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Ustoz ulushi</div>
              <div className="font-semibold text-amber-800">
                {formatMoney(groupFinance.teacherShareMonth || 0, locale)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Markaz</div>
              <div className="font-semibold text-emerald-800">
                {formatMoney(groupFinance.centerShareMonth || 0, locale)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Jami hisob-fakturalar</div>
          <div className="stat-value">{summary.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('paid')}</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{summary.paid}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{"Qisman to'lagan"}</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{summary.partial}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('unpaid')}</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{summary.pending}</div>
        </div>
      </div>

      <div className="toolbar">
        <select
          className="select"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          {months.map((month, i) => (
            <option key={i} value={i + 1}>{month}</option>
          ))}
        </select>
        <select
            className="select"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            {([currentYear - 1, currentYear, currentYear + 1] || []).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Barcha holatlar</option>
          <option value="pending">{t('unpaid')}</option>
          <option value="partial">Qisman</option>
          <option value="paid">{t('paid')}</option>
        </select>
        <button 
          className="btn btn-primary" 
          onClick={generateInvoices}
          disabled={generating}
        >
          {generating ? '...' : '📄 Hisob-fakturalar yarat'}
        </button>
      </div>

      {summary.total > 0 && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-4"> 
          <div className="text-center"> 
            <p className="text-sm text-gray-500">Jami oylik</p> 
            <p className="font-bold text-lg"> 
              {formatMoney(summary.rawTotal, locale)} 
            </p> 
          </div> 
          <div className="text-center"> 
            <p className="text-sm text-red-500">Chegirmalar</p> 
            <p className="font-bold text-lg text-red-500"> 
              -{formatMoney(summary.totalDiscounts, locale)} 
            </p> 
          </div> 
          <div className="text-center"> 
            <p className="text-sm text-green-600"> 
              To&apos;lash kerak 
            </p> 
            <p className="font-bold text-lg text-green-600"> 
              {formatMoney(summary.totalAmount, locale)} 
            </p> 
          </div> 
        </div> 
      )}

      {summary.total > 0 && (
        <div className="card mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500">Jami tushum (to&apos;langan)</div>
              <div className="text-xl font-bold" style={{ color: '#10b981' }}>{formatMoney(summary.totalPaid, locale)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Kutilayotgan qoldiq</div>
              <div className="text-xl font-bold" style={{ color: '#ef4444' }}>{formatMoney(summary.totalDebt, locale)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Jami talaba</div>
              <div className="text-xl font-bold">{summary.total}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('phone')}</th>
                <th>{t('group')}</th>
                <th>Oylik narx</th>
                <th>Chegirma</th>
                <th>To&apos;lash kerak</th>
                <th>{t('paid')}</th>
                <th>{t('totalDebt')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <div className="spinner"></div>
                  </td>
                </tr>
              ) : (invoices || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                (invoices || []).map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="font-bold">{invoice.studentName}</td>
                    <td>{invoice.phone}</td>
                    <td>{invoice.groupName || '-'}</td>
                    <td className="text-gray-500">{formatMoney(invoice.originalPrice, locale)}</td>
                    <td className="text-red-500">-{formatMoney(invoice.totalDiscount, locale)}</td>
                    <td className="text-emerald-600 font-bold">{formatMoney(invoice.amount, locale)}</td>
                    <td>{formatMoney(invoice.paidAmount, locale)}</td>
                    <td className={invoice.debt > 0 ? 'text-red-600 font-bold' : ''}>
                      {formatMoney(invoice.debt, locale)}
                    </td>
                    <td>{getStatusBadge(invoice.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US').format(amount) + ' so\'m';
}