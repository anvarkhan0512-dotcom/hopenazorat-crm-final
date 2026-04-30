'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';

/** Barcha rollar: rasm, ism, parol. */
export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((j) => {
        if (j.user?.displayName) setDisplayName(j.user.displayName);
        if (j.user?.telegramChatId) setTelegramChatId(j.user.telegramChatId);
      })
      .catch(() => {});
  }, [user]);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await fetch('/api/auth/me/avatar', { method: 'POST', body: fd });
      const j = await r.json();
      if (r.ok) window.location.reload();
      else setMsg(j.error || 'Xato');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const body: Record<string, string> = { displayName };
      if (user?.role === 'teacher') body.telegramChatId = telegramChatId;
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const r = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg('Saqlandi.');
        setCurrentPassword('');
        setNewPassword('');
      } else setMsg(j.error || 'Xato');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <DashboardLayout title="Sozlamalar">
        <div className="loading">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sozlamalar" subtitle="Profil va parol">
      <div className="card max-w-lg">
        <h3 className="card-title mb-4">Profil rasmi</h3>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="input w-full min-h-[48px] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-violet-100 file:text-violet-800"
          disabled={busy}
          onChange={uploadAvatar}
        />
      </div>

      <form className="card max-w-lg mt-6" onSubmit={saveProfile}>
        <h3 className="card-title mb-4">Login va parol</h3>
        {msg && <p className="text-sm mb-3 text-amber-800">{msg}</p>}
        {user.role === 'teacher' && (
          <div className="form-group">
            <label className="form-label">Telegram chat ID (bildirishnomalar)</label>
            <input
              className="input w-full"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Masalan: 123456789"
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Ko‘rinadigan ism</label>
          <input
            className="input w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Joriy parol (parol almashtirish uchun)</label>
          <input
            type="password"
            className="input w-full"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Yangi parol</label>
          <input
            type="password"
            className="input w-full"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? '...' : 'Saqlash'}
        </button>
      </form>
    </DashboardLayout>
  );
}
