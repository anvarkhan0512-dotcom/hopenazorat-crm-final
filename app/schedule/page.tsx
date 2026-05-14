'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';

interface StudentSchedule {
  _id: string;
  name: string;
  phone: string;
  groupName: string;
  monthlyPrice: number;
  paymentCycle: string;
  lessonCount?: number;
  customPaymentDays: number[];
  paymentStartDate: string;
  nextPaymentDate: string;
  lastPaymentDate: string;
  notificationEnabled: boolean;
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  paidThisMonth: number;
  upcomingPayments: number;
  overduePayments: number;
  totalAmountDue: number;
}

const paymentCycles = [
  { value: 'monthly', label: 'Oylik' },
  { value: 'weekly', label: 'Haftalik' },
  { value: 'quarterly', label: 'Choraklik' },
  { value: 'yearly', label: 'Yillik' },
  { value: 'custom', label: 'Maxsus kunlar' },
];

export default function SchedulePage() {
  const [students, setStudents] = useState<StudentSchedule[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'upcoming' | 'overdue'>('all');
  const [filterGroup, setFilterGroup] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSchedule | null>(null);
  const [payType, setPayType] = useState('monthly');
  const [lessonCount, setLessonCount] = useState(12);
  const [saving, setSaving] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleRes, statsRes] = await Promise.all([
        fetch('/api/schedule'),
        fetch('/api/schedule?type=stats'),
      ]);
      
      if (!scheduleRes.ok || !statsRes.ok) {
        throw new Error('Jadvalni yuklashda xatolik');
      }

      const scheduleData = await scheduleRes.json();
      const statsData = await statsRes.json();
      setStudents(Array.isArray(scheduleData) ? scheduleData : []);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const openPayTypeModal = (student: StudentSchedule) => {
    setSelectedStudent(student);
    setPayType(student.paymentCycle === 'lessons' ? 'lessons' : 'monthly');
    setLessonCount(student.lessonCount || 12);
    setIsModalOpen(true);
  };

  const savePayType = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent._id,
          paymentCycle: payType,
          lessonCount: payType === 'lessons' ? lessonCount : undefined,
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving pay type:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateNextPayment = async (studentId: string, date: string) => {
    try {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          nextPaymentDate: date,
        }),
      });
      fetchData();
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const getStatusBadge = (nextPaymentDate: string) => {
    if (!nextPaymentDate) return null;
    
    const next = new Date(nextPaymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="badge badge-danger">Qarzdor ({Math.abs(diffDays)} kun)</span>;
    } else if (diffDays === 0) {
      return <span className="badge badge-warning">Bugun</span>;
    } else if (diffDays <= 3) {
      return <span className="badge badge-info">{diffDays} kunda</span>;
    } else {
      return <span className="badge badge-success"> {diffDays} kunda</span>;
    }
  };

  const cycleLabels: Record<string, string> = {
    monthly: 'Oylik',
    weekly: 'Haftalik',
    quarterly: 'Choraklik',
    yearly: 'Yillik',
    custom: 'Maxsus',
    lessons: 'Darslar soni',
  };

  const filteredStudents = students.filter(s => {
    if (!filterGroup) return true;
    return s.groupName === filterGroup;
  });

  const groups = Array.from(new Set(students.map(s => s.groupName).filter(Boolean)));

  return (
    <DashboardLayout title="To'lov jadvali">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => fetchData()} className="text-sm underline font-bold">Qayta urinish</button>
        </div>
      )}
      <div className="stats-grid mb-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-icon primary">👥</div>
          <div className="stat-label">Jami talabalar</div>
          <div className="stat-value">{stats?.totalStudents || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success">✓</div>
          <div className="stat-label">{"To'lagan"}</div>
          <div className="stat-value">{stats?.paidThisMonth || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon warning">⏰</div>
          <div className="stat-label">Kutilmoqda</div>
          <div className="stat-value">{stats?.upcomingPayments || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon danger">⚠️</div>
          <div className="stat-label">Qarzdor</div>
          <div className="stat-value">{stats?.overduePayments || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon danger">💰</div>
          <div className="stat-label">Jami qarz</div>
          <div className="stat-value">{formatMoney(stats?.totalAmountDue || 0)}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="input"
          placeholder="Qidirish..."
          onChange={(e) => {
            const query = e.target.value.toLowerCase();
            setStudents(students.filter(s => 
              s.name.toLowerCase().includes(query) ||
              s.phone.includes(query)
            ));
          }}
        />
        <select 
          className="select" 
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
        >
          <option value="">Barcha guruhlar</option>
          {(groups || []).map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <button 
          className="btn btn-secondary"
          onClick={fetchData}
        >
          Yangilash
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">{t('noData')}</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('group')}</th>
                  <th>Narx</th>
                  <th>Oylik / Hisob davri</th>
                  <th>{"Keyingi to'lov"}</th>
                  <th>Holat</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(filteredStudents || []).map((student) => (
                  <tr key={student._id}>
                    <td className="font-medium">{student.name}</td>
                    <td>{student.phone}</td>
                    <td>{student.groupName || '-'}</td>
                    <td>{formatMoney(student.monthlyPrice)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-info">
                          {student.paymentCycle === 'lessons' 
                            ? `${student.lessonCount} ta dars`
                            : (cycleLabels[student.paymentCycle] || student.paymentCycle)
                          }
                        </span>
                        <button 
                          onClick={() => openPayTypeModal(student)}
                          className="text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td>
                      {student.nextPaymentDate 
                        ? new Date(student.nextPaymentDate).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td>{getStatusBadge(student.nextPaymentDate)}</td>
                    <td>
                      <input
                        type="date"
                        className="input"
                        style={{ width: 'auto' }}
                        value={student.nextPaymentDate?.split('T')[0] || ''}
                        onChange={(e) => updateNextPayment(student._id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="To'lov turini o'zgartirish"
      >
        <div className="space-y-4"> 
          <h3 className="font-bold">To&apos;lov turini tanlang</h3> 
          
          <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-purple-50"> 
            <input 
              type="radio" 
              name="payType" 
              value="monthly" 
              checked={payType === 'monthly'} 
              onChange={() => setPayType('monthly')}
            /> 
            <span>📅 Oylik to&apos;lov</span> 
          </label> 
          
          <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-purple-50"> 
            <input 
              type="radio" 
              name="payType" 
              value="lessons" 
              checked={payType === 'lessons'} 
              onChange={() => setPayType('lessons')}
            /> 
            <span>📚 Darslar soni bo&apos;yicha</span> 
          </label> 
          
          {payType === 'lessons' && ( 
            <div className="ml-6"> 
              <input 
                type="number" 
                className="input w-32" 
                placeholder="12" 
                value={lessonCount} 
                onChange={e => setLessonCount(parseInt(e.target.value) || 0)} 
              /> 
              <span className="ml-2 text-gray-500">ta dars</span> 
            </div> 
          )}
          
          <button 
            onClick={savePayType} 
            disabled={saving}
            className="btn btn-primary w-full"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}