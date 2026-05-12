'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import BrandLogo from '@/components/BrandLogo';
import { usePWA } from '@/lib/pwa-context';

type LoginRole = 'student' | 'parent' | 'teacher' | 'center';

const roleButtons: { id: LoginRole; labelKey: string }[] = [
  { id: 'student', labelKey: 'roleStudent' },
  { id: 'parent', labelKey: 'roleParent' },
  { id: 'teacher', labelKey: 'roleTeacher' },
  { id: 'center', labelKey: 'roleCenter' },
];

const ERR_CODE_MAP: Record<string, string> = {
  USER_NOT_FOUND: 'errUserNotFound',
  WRONG_PASSWORD: 'errWrongPassword',
  ROLE_MISMATCH: 'errRoleMismatch',
  STUDENT_BLOCKED: 'studentBlocked',
  CENTER_BLOCKED: 'Markaz bloklangan',
  CENTER_EXPIRED: 'Trial muddati tugagan',
};

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState<LoginRole>('center');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [centerInfo, setCenterInfo] = useState<any>(null);
  const [centerName, setCenterName] = useState('');
  
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const centerId = searchParams.get('c');
  const { canInstall, showInstallPrompt, isIOS, isInAppBrowser } = usePWA();

  useEffect(() => {
    if (centerId) {
      fetch(`/api/centers/public?id=${centerId}`)
        .then(r => r.json())
        .then(data => {
          if (data.name) {
            setCenterName(data.name);
            setCenterInfo(data);
            // Apply custom color if needed
            if (data.settings?.primaryColor) {
              document.documentElement.style.setProperty('--primary-color', data.settings.primaryColor);
            }
          }
        })
        .catch(console.error);
    }
  }, [centerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password, loginRole);

    if (result.ok && result.user) {
      const role = result.user.role;
      if (role === 'boss') router.push('/boss/dashboard');
      else if (role === 'teacher') router.push('/teacher');
      else if (role === 'parent') router.push('/parent');
      else if (role === 'student') router.push('/student');
      else router.push('/dashboard');
    } else {
      const errKey = result.code ? ERR_CODE_MAP[result.code] : undefined;
      setError(errKey ? t(errKey) : t('loginError'));
    }
    setLoading(false);
  };

  return (
    <div className="hope-login-page relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 animate-gradient-slow">
        <div className="absolute inset-0 opacity-20 hope-particles-bg" />
      </div>

      {/* Left Image */}
      <div
        className="hidden lg:block fixed"
        style={{
          left: 0,
          top: 0,
          height: '100vh',
          width: 'calc((100vw - 500px) / 2)',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <img
          src="/images/login-left.jpg"
          alt="Talabalar"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Dark gradient overlay on right edge */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '80px',
            height: '100%',
            background: 'linear-gradient(to right, transparent, #3b0764)',
          }}
        />
      </div>

      {/* Right Image */}
      <div
        className="hidden lg:block fixed"
        style={{
          right: 0,
          top: 0,
          height: '100vh',
          width: 'calc((100vw - 500px) / 2)',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <img
          src="/images/login-right.jpg"
          alt="Ustoz"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Dark gradient overlay on left edge */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '80px',
            height: '100%',
            background: 'linear-gradient(to left, transparent, #3b0764)',
          }}
        />
      </div>

      <div
        className="relative z-10 w-full min-h-screen flex items-center justify-center p-4"
        style={{ position: 'relative', zIndex: 10 }}
      >
        <div className="hope-login-card bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden max-w-md w-full">
          <div className="hope-login-card-inner p-8">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                {centerName || 'Edu CRM'}
              </h2>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-1">
                O&apos;quv markazi CRM tizimi
              </p>
            </div>

            <div className="hope-login-role-grid grid grid-cols-2 gap-2 mb-6 mt-4" role="group" aria-label={t('loginAriaRoleGroup')}>
              {roleButtons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                    loginRole === r.id 
                      ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => setLoginRole(r.id)}
                >
                  {t(r.labelKey)}
                </button>
              ))}
            </div>

            <h1 className="text-2xl font-black text-white text-center mb-6">{t('loginTitle')}</h1>

            <div className="hope-login-lang flex justify-center gap-2 mb-8">
              {(['uz', 'ru', 'en', 'kr'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    lang === l ? 'bg-white text-purple-900' : 'text-white/50 hover:text-white'
                  }`}
                >
                  {l === 'kr' ? 'CYR' : l.toUpperCase()}
                </button>
              ))}
            </div>

            {error && <div className="p-3 mb-6 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="hope-login-form space-y-4">
              <div className="form-group">
                <label className="block text-white/60 text-xs font-bold uppercase mb-2 ml-1">{t('username')}</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500/50 transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="form-group">
                <label className="block text-white/60 text-xs font-bold uppercase mb-2 ml-1">{t('password')}</label>
                <input
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500/50 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-xl shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50" 
                disabled={loading}
              >
                {loading ? t('loading') : t('login')}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-4">
              {canInstall && (
                <button
                  onClick={showInstallPrompt}
                  className="text-white/40 hover:text-white/70 text-xs transition-all flex items-center gap-2"
                >
                  📲 Ilovani o&apos;rnatish
                </button>
              )}
              
              <a href="/hope-study.apk" download className="text-white/20 hover:text-white/40 text-[10px] underline transition-all">
                📥 Android APK
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-gradient-slow {
          background-size: 400% 400%;
          animation: gradient 15s ease infinite;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hope-particles-bg {
          background-image: radial-gradient(circle, white 1px, transparent 1px);
          background-size: 50px 50px;
          animation: particles 20s linear infinite;
        }
        @keyframes particles {
          from { background-position: 0 0; }
          to { background-position: 500px 1000px; }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-purple-900 flex items-center justify-center">
        <div className="text-white">Yuklanmoqda...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
