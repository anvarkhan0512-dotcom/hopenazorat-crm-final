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
  const [activeTab, setActiveTab] = useState<'attendance' | 'history'>('attendance');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [historySearch, setHistoryHistorySearch] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchStudents();
    fetchGroups();
    fetch('/api/users/teachers')
      .then((r) => r.json())
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?startDate=${dateRange.start}&endDate=${dateRange.end}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, dateRange]);

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
    const payload = Object.keys(attendance)
      .filter(id => attendance[id].status)
      .map((id) => ({
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

  const filtered = students.filter((s: any) => {
    const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !selectedGroupId || s.groupId?._id === selectedGroupId;
    return matchesSearch && matchesGroup;
  });

  const filteredHistory = history.filter((h: any) => {
    const matchesSearch = h.studentName?.toLowerCase().includes(historySearch.toLowerCase()) || 
                         h.groupName?.toLowerCase().includes(historySearch.toLowerCase());
    return matchesSearch;
  });

  return (
    <DashboardLayout title={t('attendance')}>
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
            activeTab === 'attendance' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          📋 Davomat
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
            activeTab === 'history' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          🚪 Kirish/Chiqish
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <>
          <div className="card mb-6">
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
              <div className="form-group mb-0 flex-1 min-w-[200px]">
                <label className="form-label">Guruh</label>
                <select
                  className="select w-full"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">Barcha guruhlar</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
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
              <div className="loading"><div className="spinner" /></div>
            ) : (
              filtered.map((s: any) => (
                <div key={s._id} className="card flex items-center justify-between py-4 mb-0">
                  <div className="flex flex-col">
                    <div className="font-bold text-gray-800">{s.name}</div>
                    <div className="text-[10px] text-purple-600 font-bold uppercase">{s.groupId?.name}</div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {attendance[s._id]?.status === 'present' ? (
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-green-600">KELDI</span>
                          <input 
                            type="time" 
                            className="text-[10px] border-none p-0 focus:ring-0 bg-transparent text-gray-400 text-right"
                            value={attendance[s._id]?.checkInTime}
                            onChange={(e) => handleChange(s._id, 'checkInTime', e.target.value)}
                          />
                        </div>
                        <button 
                          onClick={() => handleChange(s._id, 'status', '')}
                          className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200"
                        >✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleChange(s._id, 'status', 'present')}
                        className="btn btn-primary bg-green-600 hover:bg-green-700 border-none px-6"
                      >
                        Keldi ✓
                      </button>
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
              className="btn btn-primary px-10 font-bold shadow-lg shadow-purple-200"
            >
              {saving ? 'Saqlanmoqda...' : "Tasdiqlash va saqlash"}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Dan</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Gacha</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
              <div className="form-group mb-0 flex-1 min-w-[200px]">
                <label className="form-label text-xs">Qidiruv</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="Ism yoki guruh..."
                  value={historySearch}
                  onChange={(e) => setHistoryHistorySearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="table w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500">Talaba / Guruh</th>
                  <th className="p-4 text-xs font-bold text-gray-500 text-center">Sana</th>
                  <th className="p-4 text-xs font-bold text-gray-500 text-center">Keldi vaqti</th>
                  <th className="p-4 text-xs font-bold text-gray-500 text-center">Ketdi vaqti</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={4} className="p-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-gray-400">Ma'lumot topilmadi</td></tr>
                ) : (
                  filteredHistory.map((h: any) => (
                    <tr key={h._id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{h.studentName}</div>
                        <div className="text-[10px] text-purple-600 font-bold uppercase">{h.groupName}</div>
                      </td>
                      <td className="p-4 text-center text-sm font-medium">{h.date}</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg font-mono text-xs font-bold border border-green-100">
                          {h.checkInTime || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg font-mono text-xs font-bold border border-orange-100">
                          {h.checkOutTime || '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
