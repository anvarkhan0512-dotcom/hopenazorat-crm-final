'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  username: string;
  role: string;
  displayName: string;
  hasRevealable: boolean;
}

export default function CredentialsPage() {
  const { t } = useLanguage();
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    displayName: '',
  });

  useEffect(() => {
    if (!authLoading && (!authUser || (authUser.role !== 'admin' && authUser.role !== 'manager'))) {
      router.replace('/dashboard');
    }
  }, [authLoading, authUser, router]);

  const handleGatekeeperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/gatekeeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });
      
      if (res.ok) {
        setIsAuthorized(true);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(t(data.error) || 'Xato parol');
      }
    } catch (err) {
      setError('Server xatosi');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/user-directory');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u: UserData) => {
    setEditingUser(u);
    setEditForm({
      username: u.username,
      password: '',
      displayName: u.displayName,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editForm.username,
          password: editForm.password || undefined,
          displayName: editForm.displayName,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || !authUser) {
    return (
      <DashboardLayout title={t('credentials')}>
        <div className="loading"><div className="spinner" /></div>
      </DashboardLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <DashboardLayout title={t('credentials')}>
        <div className="flex justify-center items-center py-20">
          <div className="card w-full max-w-md">
            <h3 className="card-title text-center mb-6">{t('adminPasswordPrompt')}</h3>
            <form onSubmit={handleGatekeeperSubmit} className="space-y-4">
              <div className="form-group">
                <input
                  type="password"
                  className="input w-full text-center text-lg tracking-widest"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button type="submit" className="btn btn-primary w-full py-3">
                {t('enter')}
              </button>
            </form>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('credentials')}>
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('role')}</th>
                <th>{t('username')}</th>
                <th>{t('password')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10"><div className="spinner mx-auto" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">{t('noData')}</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="font-medium">{u.displayName || '-'}</div>
                      <div className="text-xs text-gray-500">{u.id}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${u.role === 'admin' ? 'danger' : u.role === 'teacher' ? 'primary' : 'secondary'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.username}</td>
                    <td>
                      <span className="font-mono text-gray-400">••••••••</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEditClick(u)}
                        title={t('edit')}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('edit')}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">{t('name')}</label>
            <input
              type="text"
              className="input w-full"
              value={editForm.displayName}
              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('username')}</label>
            <input
              type="text"
              className="input w-full"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('password')} ({t('optional')})</label>
            <input
              type="text"
              className="input w-full"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Yangi parol..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Bo&apos;sh qoldirilsa, parol o&apos;zgarmaydi.
            </p>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="submit" className="btn btn-primary flex-1">
              {t('save')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowEditModal(false)}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
