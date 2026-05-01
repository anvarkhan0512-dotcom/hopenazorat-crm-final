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
  const [activeTab, setActiveTab] = useState<'student' | 'parent' | 'teacher' | 'admin'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string | null>>({});
  
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

  const togglePasswordVisibility = async (u: UserData) => {
    if (visiblePasswords[u.id]) {
      setVisiblePasswords((prev) => ({ ...prev, [u.id]: null }));
      return;
    }

    try {
      const res = await fetch('/api/admin/reveal-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setVisiblePasswords((prev) => ({ ...prev, [u.id]: data.password || '—' }));
      } else {
        const data = await res.json();
        alert(data.error || 'Xatolik');
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
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-hope-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Ortga qaytish
          </button>
        </div>
        <div className="flex justify-center items-center py-20">
          <div className="card w-full max-w-md">
            <h3 className="card-title text-center mb-6">Xavfsizlik bo&apos;limiga kirish</h3>
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

  const filteredUsers = users.filter(u => {
    if (activeTab === 'student') return u.role === 'student';
    if (activeTab === 'parent') return u.role === 'parent';
    if (activeTab === 'teacher') return u.role === 'teacher';
    if (activeTab === 'admin') return u.role === 'admin' || u.role === 'manager';
    return false;
  });

  return (
    <DashboardLayout title={t('credentials')}>
      <div className="mb-6 flex justify-between items-center">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-hope-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Ortga qaytish
        </button>
        <div className="flex bg-white p-1 rounded-lg border shadow-sm">
          {(['student', 'parent', 'teacher', 'admin'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-hope-primary text-white' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab === 'student' ? 'Talabalar' : 
               tab === 'parent' ? 'Ota-onalar' : 
               tab === 'teacher' ? 'Ustozlar' : 'Adminlar'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('username')}</th>
                <th>{t('password')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10"><div className="spinner mx-auto" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-500">{t('noData')}</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="font-medium">{u.displayName || '-'}</div>
                      <div className="text-xs text-gray-500">{u.id}</div>
                    </td>
                    <td>{u.username}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {visiblePasswords[u.id] ? visiblePasswords[u.id] : '••••••••'}
                        </span>
                        <button
                          type="button"
                          className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
                          onClick={() => togglePasswordVisibility(u)}
                          title={visiblePasswords[u.id] ? 'Yashirish' : 'Ko‘rish'}
                        >
                          {visiblePasswords[u.id] ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
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
