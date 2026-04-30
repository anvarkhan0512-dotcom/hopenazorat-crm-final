'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import Modal from '@/components/Modal';

type Row = { id: string; username: string; role: string; displayName: string; hasRevealable: boolean };

export default function AdminPermissionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [revealFor, setRevealFor] = useState<Row | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!loading && user && user.role !== 'admin' && user.role !== 'manager') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) return;
    fetch('/api/admin/user-directory')
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, [user]);

  const doReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealFor) return;
    setErr('');
    setRevealed(null);
    const r = await fetch('/api/admin/reveal-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword, userId: revealFor.id }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || 'Xato');
      return;
    }
    setRevealed(j.password ?? j.message ?? '—');
  };

  if (loading || !user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <DashboardLayout title="Ruxsatlar">
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ruxsatlar va parollar" subtitle="Parollar yashirin">
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Login</th>
              <th>Rol</th>
              <th>Ism</th>
              <th>Parol</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="font-mono text-sm">{u.username}</td>
                <td>{u.role}</td>
                <td>{u.displayName || '—'}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="tracking-widest text-gray-500">••••••••</span>
                    {u.hasRevealable ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        aria-label="Ko‘rish"
                        onClick={() => {
                          setRevealFor(u);
                          setAdminPassword('');
                          setRevealed(null);
                          setErr('');
                        }}
                      >
                        👁
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!revealFor}
        onClose={() => {
          setRevealFor(null);
          setRevealed(null);
          setAdminPassword('');
          setErr('');
        }}
        title="Admin parolini tasdiqlang"
      >
        <p className="text-sm text-gray-600 mb-3">
          Foydalanuvchi: <b>{revealFor?.username}</b>
        </p>
        <form onSubmit={doReveal} className="space-y-3">
          <input
            type="password"
            className="input w-full"
            placeholder="Admin paroli"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          {revealed != null && (
            <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">
              {typeof revealed === 'string' ? revealed : JSON.stringify(revealed)}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">
              Ko‘rsatish
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRevealFor(null)}
            >
              Yopish
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
