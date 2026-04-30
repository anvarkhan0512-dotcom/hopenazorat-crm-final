'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';

interface Invoice {
  _id: string;
  studentId: string;
  studentName: string;
  phone: string;
  groupName: string;
  month: number;
  year: number;
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
  const [generating, setGenerating] = useState(false);
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { t } = useLanguage();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    setMonthFilter(currentMonth.toString());
    setYearFilter(currentYear.toString());
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => r.json())
      .then((g) => setGroups(Array.isArray(g) ? g : []))
      .catch(() => setGroups([]));
  }, []);

  const loadGroupFinance = async () => {
    if (!financeGroupId) return;
    const r = await fetch(`/api/groups/${financeGroupId}/finance`);
    setGroupFinance(r.ok ? await r.json() : null);
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('month', monthFilter);
      params.append('year', yearFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    partial: invoices.filter(i => i.status === 'partial').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.amount, 0),
    totalPaid: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
    totalDebt: invoices.reduce((sum, i) => sum + i.debt, 0),
  };

  return (
    <DashboardLayout title={t('payments')}>
      <div className="card mb-4">
        <h3 className="card-title mb-2">Guruh bo‘yicha real vaqtda hisob-kitob</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="select"
            value={financeGroupId}
            onChange={(e) => setFinanceGroupId(e.target.value)}
          >
            <option value="">Guruh tanlang</option>
            {groups.map((g) => (
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
                {groupFinance.expectedMonthlyTuition?.toLocaleString()} so&apos;m
              </div>
            </div>
            <div>
              <div className="text-gray-500">Joriy oy tushumi</div>
              <div className="font-semibold">
                {groupFinance.monthInflow?.toLocaleString()} so&apos;m
              </div>
            </div>
            <div>
              <div className="text-gray-500">Ustoz ulushi</div>
              <div className="font-semibold text-amber-800">
                {groupFinance.teacherShareMonth?.toLocaleString()} so&apos;m
              </div>
            </div>
            <div>
              <div className="text-gray-500">Markaz</div>
              <div className="font-semibold text-emerald-800">
                {groupFinance.centerShareMonth?.toLocaleString()} so&apos;m
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
          {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
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
        <div className="card mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500">Jami summa</div>
              <div className="text-xl font-bold">{formatMoney(summary.totalAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{t('paid')}</div>
              <div className="text-xl font-bold" style={{ color: '#10b981' }}>{formatMoney(summary.totalPaid)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{t('totalDebt')}</div>
              <div className="text-xl font-bold" style={{ color: '#ef4444' }}>{formatMoney(summary.totalDebt)}</div>
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
                <th>{t('amount')}</th>
                <th>{t('paid')}</th>
                <th>{t('totalDebt')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="spinner"></div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="font-bold">{invoice.studentName}</td>
                    <td>{invoice.phone}</td>
                    <td>{invoice.groupName || '-'}</td>
                    <td>{formatMoney(invoice.amount)}</td>
                    <td>{formatMoney(invoice.paidAmount)}</td>
                    <td className={invoice.debt > 0 ? 'text-red-600 font-bold' : ''}>
                      {formatMoney(invoice.debt)}
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

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}