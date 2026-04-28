'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterParentPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [parentAccessCode, setParentAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, parentAccessCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Xatolik');
        return;
      }
      router.push('/login');
    } catch {
      setError('Server xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-xl font-bold mb-2">Ota-ona ro&apos;yxatdan o&apos;tish</h1>
        <p className="text-sm text-gray-600 mb-4">
          Administrator bergan <strong>ota-ona ID</strong> (talaba kartasidagi kod) ni kiriting.
        </p>
        {error && <div className="alert alert-error mb-4">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Ota-ona ID (kod)</label>
            <input
              className="input"
              value={parentAccessCode}
              onChange={(e) => setParentAccessCode(e.target.value.toUpperCase())}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Login</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Parol</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? '...' : 'Ro‘yxatdan o‘tish'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-indigo-600">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
