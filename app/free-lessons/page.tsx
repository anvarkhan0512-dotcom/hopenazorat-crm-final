'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

interface TeacherOpt {
  id: string;
  username: string;
  displayName: string;
}

interface StudentOpt {
  _id: string;
  name: string;
}

export default function FreeLessonsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [list, setList] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [form, setForm] = useState({
    studentName: '',
    notes: '',
    outcome: '' as '' | 'stayed' | 'left',
    reason: '',
    notifyTeacherUserId: '',
  });

  useEffect(() => {
    if (!loading && user && !isAdmin && user.role !== 'teacher') {
      router.replace('/dashboard');
    }
  }, [loading, user, isAdmin, router]);

  const load = () => {
    fetch('/api/free-lessons')
      .then((r) => r.json())
      .then(setList);
  };

  useEffect(() => {
    if (user?.role === 'teacher' || isAdmin) load();
  }, [user?.role, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/students').then((r) => r.json()).then(setStudents);
      fetch('/api/users/teachers').then((r) => r.json()).then(setTeachers);
    }
  }, [isAdmin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const r = await fetch('/api/free-lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        notifyTeacherUserId: form.notifyTeacherUserId || undefined,
      }),
    });
    if (r.ok) {
      setForm({ studentName: '', notes: '', outcome: '', reason: '', notifyTeacherUserId: '' });
      load();
    }
  };

  if (loading || !user) {
    return (
      <DashboardLayout title={t('freeLessons')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin && user.role !== 'teacher') {
    return null;
  }

  return (
    <DashboardLayout title={t('freeLessons')}>
      {isAdmin && (
        <div className="card mb-6">
          <h3 className="card-title mb-4">Ma&apos;lumotlar (qo‘shish)</h3>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="form-group md:col-span-2">
              <label className="form-label">{t('name')}</label>
              <input
                type="text"
                className="input w-full"
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                placeholder="Talaba ismi (qo'lda yozing)"
                required
              />
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label">Ma&apos;lumotlar / eslatma</label>
              <textarea
                className="input w-full min-h-[72px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Natija</label>
              <select
                className="select w-full"
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value as any })}
              >
                <option value="">—</option>
                <option value="stayed">Qoldi</option>
                <option value="left">Ketdi</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sabab (ustozga xabar)</label>
              <input
                className="input w-full"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label">Xabar beriladigan ustoz</label>
              <select
                className="select w-full"
                value={form.notifyTeacherUserId}
                onChange={(e) => setForm({ ...form, notifyTeacherUserId: e.target.value })}
              >
                <option value="">—</option>
                {teachers.map((te) => (
                  <option key={te.id} value={te.id}>
                    {te.displayName || te.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn btn-primary">
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="card-title mb-4">Ro‘yxat</h3>
        <table className="table text-sm">
          <thead>
            <tr>
              <th>Sana</th>
              <th>Talaba</th>
              <th>Ma&apos;lumot</th>
              <th>Natija</th>
              <th>Sabab</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6">
                  Bo‘sh
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row._id}>
                  <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString('uz-UZ') : ''}</td>
                  <td>{row.studentName || row.studentId?.name || '—'}</td>
                  <td>{row.notes || '—'}</td>
                  <td>{row.outcome === 'stayed' ? 'Qoldi' : row.outcome === 'left' ? 'Ketdi' : '—'}</td>
                  <td>{row.reason || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
