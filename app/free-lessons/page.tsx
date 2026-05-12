'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';

interface TeacherOpt {
  id: string;
  _id?: string;
  username: string;
  displayName: string;
}

interface FreeLesson {
  _id: string;
  studentName: string;
  totalFreeLessons: number;
  attendedCount: number;
  missedCount: number;
  teacherId?: TeacherOpt;
  otherTeacher?: string;
  arrivalDate: string;
  lessonDays: string[];
  lessonTime: string;
  status: 'Qoldi' | 'Ketdi' | '-';
  leaveReason?: 'Dars' | 'Ustoz' | 'Vaqt' | 'Boshqa';
  notes: string;
  notifyTeacherId?: TeacherOpt;
  otherNotifyTeacher?: string;
  lastLessonDate?: string;
  createdAt: string;
}

const WEEKDAYS = [
  { id: 'Du', label: 'Du' },
  { id: 'Se', label: 'Se' },
  { id: 'Ch', label: 'Ch' },
  { id: 'Pa', label: 'Pa' },
  { id: 'Ju', label: 'Ju' },
  { id: 'Sh', label: 'Sh' },
  { id: 'Ya', label: 'Ya' },
];

const LEAVE_REASONS = ['Dars', 'Ustoz', 'Vaqt', 'Boshqa'];

export default function FreeLessonsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  
  const [activeTab, setActiveTab] = useState<'lessons' | 'status' | 'results'>('lessons');
  const [list, setList] = useState<FreeLesson[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<FreeLesson | null>(null);

  const [addForm, setAddForm] = useState({
    studentName: '',
    totalFreeLessons: 3,
    attendedCount: 0,
    teacherId: '',
    otherTeacher: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    lessonDays: [] as string[],
    lessonTime: '14:00',
    schoolNumber: '',
    classNumber: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: '-' as 'Qoldi' | 'Ketdi' | '-',
    leaveReason: '' as any,
    notes: '',
    notifyTeacherId: '',
    otherNotifyTeacher: '',
    lastLessonDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!loading && user && !isAdmin && user.role !== 'teacher') {
      router.replace('/dashboard');
    }
  }, [loading, user, isAdmin, router]);

  const loadData = async () => {
    try {
      const [lessonsRes, teachersRes] = await Promise.all([
        fetch('/api/free-lessons'),
        fetch('/api/users/teachers'),
      ]);
      const lessonsData = await lessonsRes.json();
      const teachersData = await teachersRes.json();
      setList(lessonsData.items || []);
      setTeachers(teachersData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/free-lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        teacherId: addForm.teacherId || undefined,
      }),
    });
    if (res.ok) {
      setIsAddModalOpen(false);
      setAddForm({
        studentName: '',
        totalFreeLessons: 3,
        attendedCount: 0,
        teacherId: '',
        otherTeacher: '',
        arrivalDate: new Date().toISOString().split('T')[0],
        lessonDays: [],
        lessonTime: '14:00',
        schoolNumber: '',
        classNumber: '',
      });
      loadData();
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson) return;
    const res = await fetch('/api/free-lessons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _id: selectedLesson._id,
        ...statusForm,
        notifyTeacherId: statusForm.notifyTeacherId || undefined,
      }),
    });
    if (res.ok) {
      setIsStatusModalOpen(false);
      setSelectedLesson(null);
      loadData();
    }
  };

  const openStatusModal = (lesson: FreeLesson) => {
    setSelectedLesson(lesson);
    setStatusForm({
      status: lesson.status,
      leaveReason: lesson.leaveReason || '',
      notes: lesson.notes || '',
      notifyTeacherId: (lesson.notifyTeacherId as any)?._id || '',
      otherNotifyTeacher: lesson.otherNotifyTeacher || '',
      lastLessonDate: lesson.lastLessonDate ? new Date(lesson.lastLessonDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setIsStatusModalOpen(true);
  };

  const stats = useMemo(() => {
    const total = (list || []).length;
    const stayed = (list || []).filter(l => l.status === 'Qoldi').length;
    const left = (list || []).filter(l => l.status === 'Ketdi').length;
    const pending = (list || []).filter(l => l.status === '-').length;
    return { total, stayed, left, pending };
  }, [list]);

  if (loading || !user) {
    return (
      <DashboardLayout title={t('freeLessons')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('freeLessons')}>
      {/* Tabs */}
      <div className="flex border-b mb-6 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex-1 py-4 px-6 text-sm font-bold transition-all ${
            activeTab === 'lessons' ? 'bg-purple-700 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Bepul darslar
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 py-4 px-6 text-sm font-bold transition-all ${
            activeTab === 'status' ? 'bg-purple-700 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Holati
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex-1 py-4 px-6 text-sm font-bold transition-all ${
            activeTab === 'results' ? 'bg-purple-700 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Natijalar
        </button>
      </div>

      {/* Tab 1: Bepul darslar */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">Talabalar ro'yxati</h3>
            {isAdmin && (
              <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary shadow-md">
                + Qo'shish
              </button>
            )}
          </div>
          <div className="card overflow-hidden">
            <table className="table w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-12 text-center">№</th>
                  <th>Ism</th>
                  <th className="text-center">Berildi</th>
                  <th className="text-center">Kirdi</th>
                  <th className="text-center">Qoldi</th>
                  <th>Ustoz</th>
                </tr>
              </thead>
              <tbody>
                {(!list || list.length === 0) ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">Ma'lumot topilmadi</td></tr>
                ) : (
                  (list || []).map((item, i) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="text-center">{i + 1}</td>
                      <td className="font-medium text-purple-700">{item.studentName}</td>
                      <td className="text-center font-bold">{item.totalFreeLessons}</td>
                      <td className="text-center text-green-600 font-bold">{item.attendedCount}</td>
                      <td className="text-center text-red-500 font-bold">{item.totalFreeLessons - item.attendedCount}</td>
                      <td className="text-sm text-gray-600">
                        {item.teacherId?.displayName || item.teacherId?.username || item.otherTeacher || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Holati */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 text-lg">Talabalar holati</h3>
          <div className="card overflow-hidden">
            <table className="table w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-12 text-center">№</th>
                  <th>Ism</th>
                  <th>Oxirgi dars</th>
                  <th className="text-center">Holat</th>
                  <th className="text-center">Amal</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, i) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="text-center">{i + 1}</td>
                    <td className="font-medium">{item.studentName}</td>
                    <td>{item.lastLessonDate ? new Date(item.lastLessonDate).toLocaleDateString('uz-UZ') : '—'}</td>
                    <td className="text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'Qoldi' ? 'bg-green-100 text-green-700' :
                        item.status === 'Ketdi' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button 
                        onClick={() => openStatusModal(item)}
                        className="btn btn-secondary btn-sm bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                      >
                        Holat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Natijalar */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 bg-purple-50 border-purple-100 flex flex-col items-center">
              <span className="text-xs text-purple-600 font-bold uppercase mb-1">Jami</span>
              <span className="text-3xl font-black text-purple-900">{stats.total}</span>
            </div>
            <div className="card p-4 bg-green-50 border-green-100 flex flex-col items-center">
              <span className="text-xs text-green-600 font-bold uppercase mb-1">Qoldi</span>
              <span className="text-3xl font-black text-green-900">{stats.stayed}</span>
            </div>
            <div className="card p-4 bg-red-50 border-red-100 flex flex-col items-center">
              <span className="text-xs text-red-600 font-bold uppercase mb-1">Ketdi</span>
              <span className="text-3xl font-black text-red-900">{stats.left}</span>
            </div>
            <div className="card p-4 bg-gray-50 border-gray-100 flex flex-col items-center">
              <span className="text-xs text-gray-600 font-bold uppercase mb-1">Jarayonda</span>
              <span className="text-3xl font-black text-gray-900">{stats.pending}</span>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="table w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th>Ism</th>
                  <th className="text-center">Darslar</th>
                  <th className="text-center">Kirdi</th>
                  <th className="text-center">Qoldi</th>
                  <th className="text-center">Holat</th>
                  <th>Sabab</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="font-medium">{item.studentName}</td>
                    <td className="text-center font-bold">{item.totalFreeLessons}</td>
                    <td className="text-center text-green-600 font-bold">{item.attendedCount}</td>
                    <td className="text-center text-red-500 font-bold">{item.totalFreeLessons - item.attendedCount}</td>
                    <td className="text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        item.status === 'Qoldi' ? 'bg-green-100 text-green-700' :
                        item.status === 'Ketdi' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {item.leaveReason ? `${item.leaveReason}: ${item.notes || ''}` : item.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yangi bepul dars qo'shish">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label font-bold">Ism-sharif</label>
            <input
              type="text"
              className="input"
              value={addForm.studentName}
              onChange={e => setAddForm({ ...addForm, studentName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label font-bold">Maktab raqami</label>
              <input
                type="text"
                className="input"
                placeholder="Masalan: 15"
                value={addForm.schoolNumber || ''}
                onChange={e => setAddForm({ ...addForm, schoolNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold">Sinf</label>
              <input
                type="text"
                className="input"
                placeholder="Masalan: 10-A"
                value={addForm.classNumber || ''}
                onChange={e => setAddForm({ ...addForm, classNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label font-bold">Bepul darslar soni</label>
              <input
                type="number"
                className="input"
                value={addForm.totalFreeLessons}
                onChange={e => setAddForm({ ...addForm, totalFreeLessons: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label font-bold">Kirdi soni</label>
              <input
                type="number"
                className="input"
                value={addForm.attendedCount}
                onChange={e => setAddForm({ ...addForm, attendedCount: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label font-bold">Ustoz</label>
            <div className="flex gap-2">
              <select
                className="select flex-1"
                value={addForm.teacherId}
                onChange={e => setAddForm({ ...addForm, teacherId: e.target.value })}
              >
                <option value="">Ustozni tanlang</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.displayName || t.username}</option>)}
                <option value="Boshqa">Boshqa</option>
              </select>
              {addForm.teacherId === 'Boshqa' && (
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Ustoz ismi"
                  value={addForm.otherTeacher}
                  onChange={e => setAddForm({ ...addForm, otherTeacher: e.target.value })}
                />
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label font-bold">Kelgan sana</label>
            <input
              type="date"
              className="input"
              value={addForm.arrivalDate}
              onChange={e => setAddForm({ ...addForm, arrivalDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label font-bold mb-2 block">Kelgan kunlar</label>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map(day => (
                <label key={day.id} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.lessonDays.includes(day.id)}
                    onChange={e => {
                      const next = e.target.checked 
                        ? [...addForm.lessonDays, day.id]
                        : addForm.lessonDays.filter(d => d !== day.id);
                      setAddForm({ ...addForm, lessonDays: next });
                    }}
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label font-bold">Dars vaqti</label>
            <input
              type="time"
              className="input"
              value={addForm.lessonTime}
              onChange={e => setAddForm({ ...addForm, lessonTime: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1 py-3 text-lg font-bold">Saqlash</button>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary px-6">Bekor qilish</button>
          </div>
        </form>
      </Modal>

      {/* Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="O'quvchi holati">
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label font-bold mb-2 block">Holati</label>
            <div className="flex gap-6">
              {['Qoldi', 'Ketdi', '-'].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={statusForm.status === s}
                    onChange={() => setStatusForm({ ...statusForm, status: s as any })}
                  />
                  <span className={`font-bold ${
                    s === 'Qoldi' ? 'text-green-600' : 
                    s === 'Ketdi' ? 'text-red-600' : 'text-gray-500'
                  }`}>{s}</span>
                </label>
              ))}
            </div>
          </div>

          {(statusForm.status === 'Ketdi' || statusForm.status === '-') && (
            <div className="form-group">
              <label className="form-label font-bold">Sabab</label>
              <select
                className="select"
                value={statusForm.leaveReason}
                onChange={e => setStatusForm({ ...statusForm, leaveReason: e.target.value as any })}
              >
                <option value="">Sabab tanlang</option>
                {LEAVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label font-bold">Izoh</label>
            <textarea
              className="input min-h-[80px]"
              value={statusForm.notes}
              onChange={e => setStatusForm({ ...statusForm, notes: e.target.value })}
              placeholder="Batafsil ma'lumot..."
            />
          </div>

          <div className="form-group">
            <label className="form-label font-bold">Ustozga xabar</label>
            <div className="flex gap-2">
              <select
                className="select flex-1"
                value={statusForm.notifyTeacherId}
                onChange={e => setStatusForm({ ...statusForm, notifyTeacherId: e.target.value })}
              >
                <option value="">Ustozni tanlang</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.displayName || t.username}</option>)}
                <option value="Boshqa">Boshqa</option>
              </select>
              {statusForm.notifyTeacherId === 'Boshqa' && (
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Ustoz ismi"
                  value={statusForm.otherNotifyTeacher}
                  onChange={e => setStatusForm({ ...statusForm, otherNotifyTeacher: e.target.value })}
                />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label font-bold">Oxirgi dars</label>
            <input
              type="date"
              className="input"
              value={statusForm.lastLessonDate}
              onChange={e => setStatusForm({ ...statusForm, lastLessonDate: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1 py-3 text-lg font-bold">Saqlash</button>
            <button type="button" onClick={() => setIsStatusModalOpen(false)} className="btn btn-secondary px-6">Bekor qilish</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
