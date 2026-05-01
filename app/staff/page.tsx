'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';

type Position = 'teacher' | 'admin' | 'reception' | 'other';

interface StaffRow {
  _id: string;
  fullName: string;
  position: Position;
  monthlySalary: number;
  phone: string;
}

export default function StaffPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [list, setList] = useState<StaffRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    position: 'teacher' as Position,
    specialty: '',
    monthlySalary: 0,
    phone: '',
    username: '',
    password: '',
  });
  const [generatedPassword, setGeneratedPassword] = useState('');

  const posLabels: Record<Position, string> = {
    teacher: t('posTeacher'),
    admin: t('posAdmin'),
    reception: t('posReception'),
    other: t('posOther'),
  };

  function formatSalary(n: number): string {
    return (
      new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 }).format(n).replace(/,/g, ' ') + " so'm"
    );
  }

  useEffect(() => {
    if (!loading && user && user.role !== 'admin' && user.role !== 'manager') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  const load = () => {
    fetch('/api/staff')
      .then((r) => r.json())
      .then(setList);
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') load();
  }, [user?.role]);

  const openNew = () => {
    setEditing(null);
    setForm({ fullName: '', position: 'teacher', specialty: '', monthlySalary: 0, phone: '', username: '', password: '' });
    setGeneratedPassword('');
    setShowModal(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      fullName: s.fullName,
      position: s.position,
      specialty: s.specialty || '',
      monthlySalary: s.monthlySalary || 0,
      phone: s.phone || '',
      username: '',
      password: '',
    });
    setGeneratedPassword('');
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let currentPassword = form.password;
    if (!editing && !currentPassword) {
      currentPassword = Math.random().toString(36).slice(-8);
      setGeneratedPassword(currentPassword);
    }

    const url = editing ? `/api/staff/${editing._id}` : '/api/staff';
    const method = editing ? 'PUT' : 'POST';

    // First create user if needed
    let userId = undefined;
    if (!editing && form.username) {
      const userRes = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: currentPassword,
          role: form.position === 'teacher' ? 'teacher' : 'manager',
          displayName: form.fullName
        }),
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userId = userData.id;
      } else {
        const err = await userRes.json();
        alert(err.error || 'User yaratishda xato');
        return;
      }
    }

    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, userId, password: currentPassword }),
    });
    if (r.ok) {
      load();
      if (!editing && currentPassword) {
        // Don't close modal immediately to show password
      } else {
        setShowModal(false);
      }
    }
  };

  const del = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    await fetch(`/api/staff/${id}`, { method: 'DELETE' });
    load();
  };

  if (loading || !user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <DashboardLayout title={t('staff')}>
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  const totalSalary = list.reduce((a, s) => a + (s.monthlySalary || 0), 0);

  return (
    <DashboardLayout title={t('staff')}>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={openNew}>
          {t('addStaff')}
        </button>
      </div>

      <div className="card mb-4">
        <p className="text-sm text-gray-600">{t('totalSalaryFund')}</p>
        <p className="text-2xl font-semibold">{formatSalary(totalSalary)}</p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('position')}</th>
              <th>{t('salary')}</th>
              <th>{t('phone')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              list.map((s) => (
                <tr key={s._id}>
                  <td>{s.fullName}</td>
                  <td>{posLabels[s.position]}</td>
                  <td className="font-medium">{formatSalary(s.monthlySalary)}</td>
                  <td>{s.phone || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm mr-1"
                      onClick={() => openEdit(s)}
                    >
                      {t('edit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => del(s._id)}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? t('edit') : t('add')}>
        <form onSubmit={save} className="space-y-3">
          <div className="form-group">
            <label className="form-label">{t('fullName')}</label>
            <input
              className="input w-full"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('position')}</label>
            <select
              className="select w-full"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value as Position })}
            >
              {(Object.keys(posLabels) as Position[]).map((k) => (
                <option key={k} value={k}>
                  {posLabels[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('specialty')}</label>
            <input
              className="input w-full"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder={form.position === 'teacher' ? 'Masalan: Matematika' : ''}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('salarySum')}</label>
            <input
              type="number"
              className="input w-full"
              value={form.monthlySalary}
              onChange={(e) => setForm({ ...form, monthlySalary: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('phone')}</label>
            <input
              className="input w-full"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {!editing && (
            <>
              <div className="form-group border-t pt-3 mt-3">
                <p className="text-xs font-bold text-hope-primary uppercase tracking-wider mb-2">Tizimga kirish (Login/Parol)</p>
                <label className="form-label">Username</label>
                <input
                  className="input w-full"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Masalan: ali_ustoz"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Parol (bo&apos;sh qolsa avto-yaratiladi)</label>
                <input
                  className="input w-full"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </>
          )}

          {generatedPassword && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-bold mb-1">Yangi xodim paroli:</p>
              <code className="text-lg bg-white px-2 py-1 rounded border border-green-300 select-all">{generatedPassword}</code>
              <p className="text-xs text-green-600 mt-2">Iltimos, ushbu parolni saqlab oling va xodimga yetkazing.</p>
              <button 
                type="button" 
                className="mt-3 w-full btn btn-success btn-sm"
                onClick={() => setShowModal(false)}
              >
                Tushunarli
              </button>
            </div>
          )}

          {!generatedPassword && (
            <div className="flex gap-2 pt-4">
              <button type="submit" className="btn btn-primary flex-1">
                {t('saveBtn')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                {t('cancel')}
              </button>
            </div>
          )}
        </form>
      </Modal>
    </DashboardLayout>
  );
}
