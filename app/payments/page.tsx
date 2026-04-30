'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';
import { computePeriodEndFromLessons } from '@/lib/lessonPeriod';

interface GroupRef {
  _id?: string;
  weeklySchedule?: { day: number; time: string }[];
  lessonCalendarWeekParity?: 'all' | 'odd' | 'even';
}

interface Student {
  _id: string;
  name: string;
  phone: string;
  monthlyPrice: number;
  groupId?: GroupRef | string;
}

interface Payment {
  _id: string;
  studentId: Student;
  amount: number;
  month: number;
  year: number;
  periodStart?: string;
  periodEnd?: string;
  lessonCount?: number;
  daysVariance?: number;
  description: string;
  createdAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [studentFilter, setStudentFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const { t } = useLanguage();
  const [periodEndManual, setPeriodEndManual] = useState(false);

  const currentDate = new Date();
  const [formData, setFormData] = useState({
    studentId: '',
    amount: 0,
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    periodStart: '',
    periodEnd: '',
    lessonCount: 12,
    expectedDueDate: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (periodEndManual) return;
    const st = students.find((s) => s._id === formData.studentId);
    const g = st?.groupId && typeof st.groupId === 'object' ? (st.groupId as GroupRef) : null;
    if (!formData.periodStart || !formData.studentId) return;
    const end = computePeriodEndFromLessons(
      new Date(`${formData.periodStart}T12:00:00`),
      formData.lessonCount || 12,
      g?.weeklySchedule,
      g?.lessonCalendarWeekParity || 'all'
    );
    const iso = end.toISOString().slice(0, 10);
    setFormData((prev) => (prev.periodEnd === iso ? prev : { ...prev, periodEnd: iso }));
  }, [
    formData.studentId,
    formData.periodStart,
    formData.lessonCount,
    students,
    periodEndManual,
  ]);

  const fetchData = async () => {
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/students?status=active'),
      ]);
      const paymentsData = await paymentsRes.json();
      const studentsData = await studentsRes.json();
      setPayments(paymentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesStudent = !studentFilter || payment.studentId?._id === studentFilter;
    const matchesMonth = !monthFilter || payment.month === parseInt(monthFilter);
    const matchesYear = !yearFilter || payment.year === parseInt(yearFilter);
    return matchesStudent && matchesMonth && matchesYear;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: formData.studentId,
          amount: formData.amount,
          month: formData.month,
          year: formData.year,
          periodStart: formData.periodStart || undefined,
          periodEnd: formData.periodEnd || undefined,
          lessonCount: formData.lessonCount,
          expectedDueDate: formData.expectedDueDate || undefined,
          description: formData.description,
        }),
      });

      if (res.ok) {
        fetchData();
        closeModal();
      }
    } catch (error) {
      console.error('Error creating payment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const openModal = () => {
    const selectedStudent = students.find((s) => s._id === formData.studentId);
    setPeriodEndManual(false);
    setFormData({
      studentId: '',
      amount: selectedStudent?.monthlyPrice || 0,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      periodStart: '',
      periodEnd: '',
      lessonCount: 12,
      expectedDueDate: '',
      description: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setPeriodEndManual(false);
    setFormData({
      studentId: '',
      amount: 0,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      periodStart: '',
      periodEnd: '',
      lessonCount: 12,
      expectedDueDate: '',
      description: '',
    });
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find((s) => s._id === studentId);
    setPeriodEndManual(false);
    setFormData({
      ...formData,
      studentId,
      amount: student?.monthlyPrice || 0,
    });
  };

  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];

  if (loading) {
    return (
      <DashboardLayout title={t('payments')}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout title={t('payments')}>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">{t('total')} {t('payments')}</div>
          <div className="stat-value">{filteredPayments.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('totalIncome')}</div>
          <div className="stat-value">{formatMoney(totalAmount)}</div>
        </div>
      </div>

      <div className="toolbar">
        <select
          className="select"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
        >
          <option value="">{t('allGroups')}</option>
          {students.map((student) => (
            <option key={student._id} value={student._id}>{student.name}</option>
          ))}
        </select>
        <select
          className="select"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="">{t('allGroups')}</option>
          {months.map((month, i) => (
            <option key={i + 1} value={i + 1}>{month}</option>
          ))}
        </select>
        <select
          className="select"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="">{t('allGroups')}</option>
          {[2024, 2025, 2026].map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openModal}>
          + {t('addPayment')}
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('phone')}</th>
              <th>{t('amount')}</th>
              <th>{t('date')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8">{t('noData')}</td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment._id}>
                  <td>{payment.studentId?.name || '-'}</td>
                  <td>{payment.studentId?.phone || '-'}</td>
                  <td>{formatMoney(payment.amount)}</td>
                  <td>
                    {payment.periodStart && payment.periodEnd ? (
                      <span className="text-sm">
                        {payment.periodStart.split('T')[0]} — {payment.periodEnd.split('T')[0]}
                        <span className="block text-xs text-gray-500">{payment.lessonCount ?? 12} dars</span>
                      </span>
                    ) : (
                      <span>
                        {months[payment.month - 1]} {payment.year}
                      </span>
                    )}
                    {payment.daysVariance != null && (
                      <span
                        className={`block text-xs font-medium ${
                          payment.daysVariance > 0
                            ? 'text-red-600'
                            : payment.daysVariance < 0
                              ? 'text-amber-700'
                              : 'text-green-700'
                        }`}
                      >
                        {payment.daysVariance > 0
                          ? `+${payment.daysVariance} kun kechikkan`
                          : payment.daysVariance < 0
                            ? `${payment.daysVariance} kun oldin`
                            : 'Vaqtida'}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => handleDelete(payment._id)}
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={t('addPayment')}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('selectStudent')}</label>
            <select
              className="select"
              value={formData.studentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              required
            >
              <option value="">{t('selectStudent')}</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} - {formatMoney(student.monthlyPrice)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('amount')}</label>
            <input
              type="number"
              className="input"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
              required
            />
          </div>
          <div className="form-group border rounded-lg p-3 mb-3">
            <label className="form-label">12 darslik davr (boshlanish / tugash)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="input"
                value={formData.periodStart}
                onChange={(e) => {
                  setPeriodEndManual(false);
                  setFormData({ ...formData, periodStart: e.target.value });
                }}
              />
              <input
                type="date"
                className="input"
                value={formData.periodEnd}
                onChange={(e) => {
                  setPeriodEndManual(true);
                  setFormData({ ...formData, periodEnd: e.target.value });
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tugash sanasi guruhning haftalik jadvali va (agar tanlangan boʻlsa) toq/juft hafta
              filtri boʻyicha avtomatik hisoblanadi; qoʻlda oʻzgartirsangiz, avtomatik toʻxtaydi.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Darslar soni</label>
            <input
              type="number"
              min={1}
              max={24}
              className="input"
              value={formData.lessonCount}
              onChange={(e) => {
                setPeriodEndManual(false);
                setFormData({ ...formData, lessonCount: parseInt(e.target.value, 10) || 12 });
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Kutilgan to‘lov sanasi (kechikish hisobi)</label>
            <input
              type="date"
              className="input"
              value={formData.expectedDueDate}
              onChange={(e) => setFormData({ ...formData, expectedDueDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Oy (davr yo‘q bo‘lsa)</label>
              <select
                className="select"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value, 10) })}
              >
                {months.map((month, i) => (
                  <option key={i + 1} value={i + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Yil</label>
              <select
                className="select"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
              >
                {[2024, 2025, 2026, 2027].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Izoh (ixtiyoriy)</label>
            <input
              type="text"
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {t('save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}