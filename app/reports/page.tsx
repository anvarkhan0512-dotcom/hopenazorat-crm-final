'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';

interface ReportData {
  totalStudents: number;
  activeStudents: number;
  totalGroups: number;
  activeGroups: number;
  paymentsThisMonth: number;
  debtorsCount: number;
  last7DaysIncome: { day: string; income: number }[];
  last6MonthsIncome: { month: string; income: number }[];
}

const defaultData: ReportData = {
  totalStudents: 0,
  activeStudents: 0,
  totalGroups: 0,
  activeGroups: 0,
  paymentsThisMonth: 0,
  debtorsCount: 0,
  last7DaysIncome: [],
  last6MonthsIncome: [],
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [error, setError] = useState('');
  const { t, lang } = useLanguage();

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Server error');
      const json = await res.json();
      setData({
        totalStudents: json?.totalStudents || 0,
        activeStudents: json?.activeStudents || 0,
        totalGroups: json?.totalGroups || 0,
        activeGroups: json?.activeGroups || 0,
        paymentsThisMonth: json?.paymentsThisMonth || 0,
        debtorsCount: json?.debtorsCount || 0,
        last7DaysIncome: json?.last7DaysIncome || [],
        last6MonthsIncome: json?.last6MonthsIncome || [],
      });
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout title={t('reports')}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title={t('reports')}>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-primary" onClick={fetchReport}>Qayta urinish</button>
      </DashboardLayout>
    );
  }

  const dailyData = data?.last7DaysIncome || [];
  const monthlyData = data?.last6MonthsIncome || [];
  
  const dailyTotal = dailyData.reduce((sum, m) => sum + (m.income || 0), 0);
  const monthlyTotal = monthlyData.reduce((sum, m) => sum + (m.income || 0), 0);

  return (
    <DashboardLayout title={t('reports')}>
      <div className="toolbar">
        <select
          className="select"
          value={reportType}
          onChange={(e) => setReportType(e.target.value as 'daily' | 'monthly')}
        >
          <option value="daily">{t('dailyReport')}</option>
          <option value="monthly">{t('monthlyReport')}</option>
        </select>
        <button className="btn btn-secondary" onClick={printReport}>
          {t('print')}
        </button>
      </div>

      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {reportType === 'daily' ? t('dailyReport') : t('monthlyReport')}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600">{t('totalStudents')}</div>
            <div className="text-2xl font-bold text-blue-900">{data?.totalStudents || 0}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600">{t('active')}</div>
            <div className="text-2xl font-bold text-green-900">{data?.activeStudents || 0}</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600">{t('activeGroups')}</div>
            <div className="text-2xl font-bold text-purple-900">{data?.activeGroups || 0}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-red-600">{t('debtorsCount')}</div>
            <div className="text-2xl font-bold text-red-900">{data?.debtorsCount || 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-semibold mb-4">{t('income')}</h4>
          <table className="table">
            <thead>
              <tr>
                <th>{reportType === 'daily' ? 'Kun' : 'Oy'}</th>
                <th>{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {(reportType === 'daily' ? dailyData : monthlyData).length === 0 ? (
                <tr><td colSpan={2} className="text-center py-4">{t('noData')}</td></tr>
              ) : (
                (reportType === 'daily' ? dailyData : monthlyData).map((item, i) => (
                  <tr key={i}>
                    <td>{reportType === 'daily' ? (item as { day: string }).day : (item as { month: string }).month}</td>
                    <td className="font-medium">{formatMoney(item.income || 0)}</td>
                  </tr>
                ))
              )}
              <tr className="font-bold bg-gray-50">
                <td>{t('total')}</td>
                <td>{formatMoney(reportType === 'daily' ? dailyTotal : monthlyTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h4 className="font-semibold mb-4">{t('analytics')}</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>{t('totalIncome')}</span>
              <span className="font-bold text-green-600">{formatMoney(monthlyTotal)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>{t('debtorsCount')}</span>
              <span className="font-bold text-red-600">{data?.debtorsCount || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>{t('activeGroups')}</span>
              <span className="font-bold">{data?.activeGroups || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>{t('totalStudents')}</span>
              <span className="font-bold">{data?.totalStudents || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount || 0) + " so'm";
}