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
  });

  const posLabels: Record<Position, string> = {
    teacher: t('posTeacher'),
    admin: t('posAdmin'),
    reception: t('posReception'),
    other: t('posOther'),
  };

  function formatSalary(n: number): string {
    return (
      new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 }).format(n).replace(/,/g, ' ') + " so&apos;m"
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
    setForm({ fullName: '', position: 'teacher', specialty: '', monthlySalary: 0, phone: '' });
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
    });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `/api/staff/${editing._id}` : '/api/staff';
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      load();
      setShowModal(false);
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
          <button type="submit" className="btn btn-primary">
            {t('saveBtn')}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
