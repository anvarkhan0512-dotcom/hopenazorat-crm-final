'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import BrandLogo from '@/components/BrandLogo';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.ok && result.user) {
      const role = result.user.role;
      if (role === 'teacher') router.push('/teacher');
      else if (role === 'parent') router.push('/parent');
      else if (role === 'student') router.push('/student');
      else router.push('/dashboard');
    } else {
      setError(t('loginError'));
    }
    setLoading(false);
  };

  return (
    <div className="hope-login-page">
      <div className="hope-login-stars" aria-hidden />
      <div className="hope-login-glow" aria-hidden />

      <div className="hope-login-card">
        <div className="hope-login-card-inner">
          <BrandLogo variant="hero" />
          <p className="hope-login-roles">Talaba · Ota-ona · Ustoz · Markaz</p>

          <h1 className="hope-login-title">{t('loginTitle')}</h1>

          <div className="hope-login-lang">
            {(['uz', 'ru', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`hope-lang-btn ${lang === l ? 'hope-lang-btn--active' : ''}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {error && <div className="hope-login-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="hope-login-form">
            <div className="form-group">
              <label className="hope-form-label">{t('username')}</label>
              <input
                type="text"
                className="hope-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label className="hope-form-label">{t('password')}</label>
              <input
                type="password"
                className="hope-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary hope-login-submit w-full" disabled={loading}>
              {loading ? '...' : t('login')}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
