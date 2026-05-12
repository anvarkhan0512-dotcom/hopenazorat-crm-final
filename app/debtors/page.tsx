'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';

interface Debtor {
  _id: string;
  invoiceId: string;
  studentId: string;
  studentName: string;
  phone: string;
  groupName: string;
  originalPrice: number;
  totalDiscount: number;
  amount: number;
  paidAmount: number;
  debt: number;
  status: string;
}

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t, locale } = useLanguage();

  useEffect(() => {
    fetchDebtors();
  }, []);

  const fetchDebtors = async () => {
    try {
      const res = await fetch('/api/debtors');
      const data = await res.json();
      setDebtors(data.items || []);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching debtors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title={t('debtors')}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('debtors')}>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-icon danger">⚠️</div>
          <div className="stat-label">{t('debtorsCount')}</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {(summary?.pending || 0) + (summary?.partial || 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{"To'lanmagan"}</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{summary?.pending || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{"Qisman to'lagan"}</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{summary?.partial || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon warning">💰</div>
          <div className="stat-label">{t('totalDebt')}</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {formatMoney(summary?.totalDebt || 0, locale)}
          </div>
        </div>
      </div>

      <div className="card">
        {(!debtors || debtors.length === 0) ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">{t('noData')}</div>
            <div className="empty-state-text">{"Hozircha qarzdorlar yo'q"}</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('group')}</th>
                  <th>Formula / {t('totalDebt')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {(debtors || []).map((debtor) => (
                  <tr key={debtor._id}>
                    <td>
                      <div className="font-bold">{debtor.studentName}</div>
                      <div className="text-[10px] text-gray-400">{debtor.phone}</div>
                    </td>
                    <td>{debtor.phone}</td>
                    <td>{debtor.groupName || '-'}</td>
                    <td>
                      <div className="flex flex-col">
                        <div className="text-[10px] text-gray-500 font-mono">
                          {formatMoney(debtor.originalPrice, locale)} (oylik) 
                          {debtor.totalDiscount > 0 && ` - ${formatMoney(debtor.totalDiscount, locale)} (chegirma)`}
                          {debtor.paidAmount > 0 && ` - ${formatMoney(debtor.paidAmount, locale)} (to'langan)`}
                        </div>
                        <div className="text-red-500 font-black text-lg">
                          = {formatMoney(debtor.debt, locale)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${debtor.status === 'pending' ? 'badge-danger' : 'badge-warning'}`}>
                        {debtor.status === 'pending' ? t('unpaid') : 'Qisman'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US').format(amount) + ' so\'m';
}