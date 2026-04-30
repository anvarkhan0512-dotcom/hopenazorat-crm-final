'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';

type TeacherOpt = { id: string; username: string; displayName: string };

export default function DashboardAttendancePage() {
  const { t } = useLanguage();
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [attendance, setAttendance] = useState<any>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonNumber, setLessonNumber] = useState('1');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetch('/api/users/teachers')
      .then((r) => r.json())
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: string, field: string, value: any) => {
    setAttendance((prev: any) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        ...(field === 'status' && value === 'present'
          ? {
              checkInTime: new Date().toLocaleTimeString('uz-UZ', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }
          : {}),
      },
    }));
  };

  const handleSave = async () => {
    const payload = Object.keys(attendance).map((id) => ({
      studentId: id,
      date,
      lessonNumber: Number(lessonNumber) || 1,
      status: attendance[id].status,
      rescheduleDate:
        attendance[id].status === 'rescheduled' ? attendance[id].rescheduleDate : null,
      checkInTime: attendance[id].checkInTime || null,
      transferAt:
        attendance[id].status === 'transferred' ? attendance[id].transferAt || null : null,
      redirectTeacherUserId:
        attendance[id].status === 'transferred'
          ? attendance[id].redirectTeacherUserId || null
          : null,
    }));

    if (payload.length === 0) return alert("O'zgarishlar mavjud emas!");

    setSaving(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) alert("Saqlandi. Har bir yozuv uchun alohida Telegram xabari yuboriladi.");
      else alert('Saqlashda xatolik yuz berdi.');
    } catch {
      alert("Server bilan bog'lanishda xatolik!");
    } finally {
      setSaving(false);
    }
  };

  const filtered = students.filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title={t('attendance')}>
      <div className="toolbar flex-wrap">
        <Link href="/dashboard" className="btn btn-secondary btn-sm">
          ← {t('dashboard')}
        </Link>
      </div>

      <div className="card mb-6">
        <h2 className="card-title mb-4">Davomat va qayta dars belgilash</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="form-group mb-0">
            <label className="form-label">Sana</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Dars</label>
            <select
              className="select"
              value={lessonNumber}
              onChange={(e) => setLessonNumber(e.target.value)}
            >
              <option value="1">1-dars</option>
              <option value="2">2-dars (bir kunda ikkinchi dars)</option>
            </select>
          </div>
          <div className="form-group mb-0 flex-1 min-w-[200px]">
            <label className="form-label">{t('search')}</label>
            <input
              type="text"
              className="input"
              placeholder="O'quvchi ismi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-24">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : (
          filtered.map((s: any) => (
            <div
              key={s._id}
              className="card flex flex-wrap items-center justify-between gap-4 py-4 mb-0"
            >
              <div className="font-medium text-gray-800 min-w-[140px]">{s.name}</div>
              <div className="flex flex-wrap items-center gap-4">
                <select
                  className="select"
                  style={{ minWidth: '140px' }}
                  onChange={(e) => handleChange(s._id, 'status', e.target.value)}
                  value={attendance[s._id]?.status || ''}
                >
                  <option value="">Tanlang</option>
                  <option value="present">Keldi</option>
                  <option value="absent">Kelmadi</option>
                  <option value="rescheduled">Boshqa kunga</option>
                  <option value="transferred">{"Ko'chirildi"}</option>
                </select>

                {attendance[s._id]?.status === 'rescheduled' && (
                  <input
                    type="date"
                    className="input"
                    style={{ maxWidth: '160px' }}
                    onChange={(e) => handleChange(s._id, 'rescheduleDate', e.target.value)}
                  />
                )}

                {attendance[s._id]?.status === 'transferred' && (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <input
                      type="datetime-local"
                      className="input min-h-[44px]"
                      onChange={(e) => handleChange(s._id, 'transferAt', e.target.value)}
                    />
                    <select
                      className="select min-h-[44px]"
                      value={attendance[s._id]?.redirectTeacherUserId || ''}
                      onChange={(e) =>
                        handleChange(s._id, 'redirectTeacherUserId', e.target.value)
                      }
                    >
                      <option value="">Ustoz tanlang</option>
                      {teachers.map((te) => (
                        <option key={te.id} value={te.id}>
                          {te.displayName || te.username}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={!attendance[s._id]?.redirectTeacherUserId}
                      onClick={() => {
                        const tid = attendance[s._id]?.redirectTeacherUserId;
                        if (!tid) return;
                        window.open(`/teacher`, '_blank');
                      }}
                    >
                      Yangi ustozga yo‘naltirish (panel)
                    </button>
                  </div>
                )}

                {attendance[s._id]?.status === 'present' && (
                  <span className="text-sm text-green-600 font-mono">
                    {attendance[s._id]?.checkInTime}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:left-[280px] bg-white border-t p-4 flex justify-center shadow-lg z-30">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`btn btn-primary px-10 ${saving ? 'opacity-60' : ''}`}
        >
          {saving ? 'Saqlanmoqda...' : "Tasdiqlash va saqlash"}
        </button>
      </div>
    </DashboardLayout>
  );
}
