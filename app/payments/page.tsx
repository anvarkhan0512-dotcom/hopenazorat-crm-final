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
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [selectedPaymentForDeadline, setSelectedPaymentForDeadline] = useState<Payment | null>(null);
  const [newDeadline, setNewDeadline] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const { t, locale } = useLanguage();
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
    description: '',
    isPartial: false,
    fullPaymentDeadline: '',
    isMonthly: true,
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
    setLoading(true);
    setError(null);
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/students?status=active'),
      ]);
      
      if (!paymentsRes.ok || !studentsRes.ok) {
        throw new Error('Ma\'lumotlarni yuklashda xatolik');
      }

      const paymentsData = await paymentsRes.json();
      const studentsData = await studentsRes.json();
      setPayments(paymentsData.items || paymentsData.payments || []);
      setStudents(studentsData.items || studentsData.students || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = (payments || []).filter((payment) => {
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
          description: formData.description,
          isPartial: formData.isPartial,
          fullPaymentDeadline: formData.isPartial ? formData.fullPaymentDeadline : undefined,
          isMonthly: formData.isMonthly,
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

  const openDeadlineModal = (payment: Payment) => {
    setSelectedPaymentForDeadline(payment);
    setNewDeadline(payment.fullPaymentDeadline ? payment.fullPaymentDeadline.split('T')[0] : '');
    setShowDeadlineModal(true);
  };

  const handleUpdateDeadline = async () => {
    if (!selectedPaymentForDeadline) return;
    try {
      const res = await fetch(`/api/payments/${selectedPaymentForDeadline._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullPaymentDeadline: newDeadline }),
      });
      if (res.ok) {
        fetchData();
        setShowDeadlineModal(false);
      }
    } catch (error) {
      console.error('Error updating deadline:', error);
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
      description: '',
      isPartial: false,
      fullPaymentDeadline: '',
      isMonthly: true,
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
      description: '',
      isPartial: false,
      fullPaymentDeadline: '',
      isMonthly: true,
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
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => fetchData()} className="text-sm underline font-bold">Qayta urinish</button>
        </div>
      )}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">{t('total')} {t('payments')}</div>
          <div className="stat-value">{filteredPayments.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('totalIncome')}</div>
          <div className="stat-value">{formatMoney(totalAmount, locale)}</div>
        </div>
      </div>

      <div className="toolbar">
        <select
          className="select"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
        >
          <option value="">{t('allGroups')}</option>
          {(students || []).map((student) => (
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
              <th>Status / {t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8">{t('noData')}</td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const sId = payment.studentId as any;
                return (
                <tr key={payment._id}>
                  <td>{sId?.name || '-'}</td>
                  <td>{sId?.phone || '-'}</td>
                  <td>
                    {(() => {
                      const student = students.find(s => s._id === sId?._id);
                      const basePrice = student?.monthlyPrice || 0;
                      const finalPrice = payment.amount;
                      const hasDiscount = basePrice > finalPrice;
                      
                      return (
                        <div className="flex flex-col">
                          {hasDiscount && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatMoney(basePrice, locale)}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${hasDiscount ? 'text-green-600' : ''}`}>
                              {formatMoney(finalPrice, locale)}
                            </span>
                            {hasDiscount && (
                              <span className="text-[10px] bg-red-50 text-red-500 px-1 rounded border border-red-100">
                                -{formatMoney(basePrice - finalPrice, locale)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
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
                  </td>
                  <td>
                    <div className="flex flex-col gap-2">
                      {payment.isPartial && (
                        <div className="flex items-center gap-1 text-red-500 font-bold text-xs bg-red-50 p-1 rounded border border-red-100">
                          ⏳ {payment.fullPaymentDeadline ? payment.fullPaymentDeadline.split('T')[0] : 'Muddat belgilanmagan'}
                          <button 
                            onClick={() => openDeadlineModal(payment)}
                            className="ml-auto text-[10px] bg-white border px-1 rounded hover:bg-gray-50"
                          >
                            O'zgartirish
                          </button>
                        </div>
                      )}
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '12px', width: 'fit-content' }}
                        onClick={() => handleDelete(payment._id)}
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showDeadlineModal} onClose={() => setShowDeadlineModal(false)} title="To'liq to'lov muddatini tahrirlash">
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label font-bold">Yangi muddat</label>
            <input
              type="date"
              className="input"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpdateDeadline} className="btn btn-primary flex-1">Saqlash</button>
            <button onClick={() => setShowDeadlineModal(false)} className="btn btn-secondary">Bekor qilish</button>
          </div>
        </div>
      </Modal>

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
              {(students || []).map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} - {formatMoney(student.monthlyPrice, locale)}
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
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPartial}
                  onChange={(e) => setFormData({ ...formData, isPartial: e.target.checked })}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm font-bold text-gray-700">Qisman to'lov</span>
              </label>
            </div>
          </div>

          {formData.isPartial && (
            <div className="form-group animate-in slide-in-from-top-2 duration-200">
              <label className="form-label font-bold text-red-500">To'liq summa muddati</label>
              <input
                type="date"
                className="input border-red-200 focus:border-red-500"
                value={formData.fullPaymentDeadline}
                onChange={(e) => setFormData({ ...formData, fullPaymentDeadline: e.target.value })}
                required={formData.isPartial}
              />
            </div>
          )}

          <div className="form-group border rounded-2xl p-4 bg-gray-50 mb-4">
            <div className="flex justify-between items-center mb-3">
              <label className="form-label font-bold text-purple-700 mb-0">12 darslik / Oylik</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isMonthly}
                  onChange={(e) => setFormData({ ...formData, isMonthly: e.target.checked })}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-xs font-bold text-gray-500">Oylik</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group mb-0">
                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Boshlanish</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={formData.periodStart}
                  onChange={(e) => {
                    setPeriodEndManual(false);
                    setFormData({ ...formData, periodStart: e.target.value });
                  }}
                />
              </div>
              <div className="form-group mb-0">
                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Tugash</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={formData.periodEnd}
                  onChange={(e) => {
                    setPeriodEndManual(true);
                    setFormData({ ...formData, periodEnd: e.target.value });
                  }}
                />
              </div>
            </div>

            {!formData.isMonthly && (
              <div className="mt-3">
                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Darslar soni</label>
                <input
                  type="number"
                  min={1}
                  className="input text-sm"
                  value={formData.lessonCount}
                  onChange={(e) => {
                    setPeriodEndManual(false);
                    setFormData({ ...formData, lessonCount: parseInt(e.target.value, 10) || 12 });
                  }}
                />
              </div>
            )}
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

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US').format(amount) + ' so\'m';
}