'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';

interface Student {
  _id: string;
  name: string;
  phone: string;
  monthlyPrice: number;
}

interface Payment {
  _id: string;
  studentId: Student;
  amount: number;
  month: number;
  year: number;
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

  const currentDate = new Date();
  const [formData, setFormData] = useState({
    studentId: '',
    amount: 0,
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

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
        body: JSON.stringify(formData),
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
    const selectedStudent = students.find(s => s._id === formData.studentId);
    setFormData({
      studentId: '',
      amount: selectedStudent?.monthlyPrice || 0,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      description: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      studentId: '',
      amount: 0,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      description: '',
    });
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s._id === studentId);
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
                  <td>{months[payment.month - 1]} {payment.year}</td>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Oy</label>
              <select
                className="select"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
              >
                {months.map((month, i) => (
                  <option key={i + 1} value={i + 1}>{month}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Yil</label>
              <select
                className="select"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>{year}</option>
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