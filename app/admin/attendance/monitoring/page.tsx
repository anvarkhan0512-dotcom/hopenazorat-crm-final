'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';

interface AttendanceRecord {
  _id: string;
  studentName: string;
  groupName: string;
  date: string;
  lessonNumber: number;
  status: string;
  checkInTime?: string;
}

export default function AttendanceMonitoring() {
  const { t } = useLanguage();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedGroupId, selectedDate]);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance?date=${selectedDate}`;
      if (selectedGroupId) url += `&groupId=${selectedGroupId}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  return (
    <DashboardLayout title="Davomat Monitoringi" subtitle="Face ID va qo'lda belgilangan davomat natijalari">
      <div className="space-y-6">
        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Sana</label>
              <input
                type="date"
                className="input w-full"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Guruh</label>
              <select
                className="input w-full"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <option value="">Barcha guruhlar</option>
                {groups.map(g => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1 bg-green-50 p-2 rounded border border-green-100 text-center">
                <span className="text-xs text-green-600 font-bold block uppercase">Kelganlar</span>
                <span className="text-xl font-bold text-green-700">{presentCount}</span>
              </div>
              <div className="flex-1 bg-red-50 p-2 rounded border border-red-100 text-center">
                <span className="text-xs text-red-600 font-bold block uppercase">Kelmaganlar</span>
                <span className="text-xl font-bold text-red-700">{absentCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>O'quvchi</th>
                  <th>Guruh</th>
                  <th>Dars</th>
                  <th>Holat</th>
                  <th>Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10"><div className="spinner mx-auto" /></td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-500">Ma'lumot topilmadi</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r._id}>
                      <td className="font-medium">{r.studentName}</td>
                      <td>{r.groupName}</td>
                      <td>{r.lessonNumber}-dars</td>
                      <td>
                        <span className={`badge ${
                          r.status === 'present' ? 'badge-success' : 
                          r.status === 'absent' ? 'badge-danger' : 'badge-secondary'
                        }`}>
                          {r.status === 'present' ? 'Keldi' : 
                           r.status === 'absent' ? 'Kelmagan' : r.status}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500">{r.checkInTime || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
