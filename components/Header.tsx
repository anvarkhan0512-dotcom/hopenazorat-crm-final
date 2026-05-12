'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { Language } from '@/lib/translations';
import { useAuth } from '@/components/AuthProvider';
import { useCenter } from '@/lib/center-context';
import { usePWA } from '@/lib/pwa-context';
import NotificationBell from '@/components/NotificationBell';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

export default function Header({ title, onMenuClick, onToggleCollapse, isCollapsed }: HeaderProps) {
  const { t, lang, setLang } = useLanguage();
  const { user } = useAuth();
  const { centerName } = useCenter();
  const { canInstall, isInstalled, showInstallPrompt } = usePWA();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [returningToBoss, setReturningToBoss] = useState(false);

  const isBossImpersonating = (user as any)?.isBossImpersonating;

  const handleReturnToBoss = async () => {
    setReturningToBoss(true);
    try {
      await fetch('/api/boss/return-to-boss', { method: 'POST' });
      window.location.href = '/boss/dashboard';
    } catch (error) {
      console.error('Return to boss error:', error);
      setReturningToBoss(false);
    }
  };

  const languages: { code: Language; labelKey: string }[] = [
    { code: 'uz', labelKey: 'uzbek' },
    { code: 'ru', labelKey: 'russian' },
    { code: 'en', labelKey: 'english' },
    { code: 'kr', labelKey: 'uzbekCyrillic' },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isOffice = user?.role === 'admin' || user?.role === 'manager';
  const initial =
    (user?.displayName?.trim()?.[0] || user?.username?.trim()?.[0] || '?').toUpperCase();

  const trialEndsAt = (user as any)?.trialEndsAt;
  let daysLeft = 0;
  if (trialEndsAt) {
    daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  return (
    <>
      {isBossImpersonating && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between z-[100]">
          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <span className="font-bold text-sm">Boshliq rejimi</span>
            <span className="text-red-200 text-xs">Siz {user?.role} sifatida kirgansiz</span>
          </div>
          <button
            onClick={handleReturnToBoss}
            disabled={returningToBoss}
            className="bg-white text-red-600 px-4 py-1 rounded-lg text-sm font-bold hover:bg-red-50 disabled:opacity-50 transition-all"
          >
            {returningToBoss ? 'Qaytish...' : 'Orqaga qaytish'}
          </button>
        </div>
      )}
      {trialEndsAt && daysLeft > 0 && isOffice && (
        <div className="bg-orange-500 text-white text-center py-2 text-sm font-medium">
          ⏰ Sinov muddati: {daysLeft} kun qoldi {daysLeft <= 3 && ' — Tez orada tugaydi!'}
        </div>
      )}
      <header className="topbar">
      <div className="flex items-center gap-4">
        <button type="button" className="mobile-menu-btn lg:hidden" onClick={onMenuClick} aria-label="Menyu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          className="hidden lg:flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Open Sidebar' : 'Collapse Sidebar'}
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="topbar-title">{title}</h2>
      </div>

      <div className="topbar-actions">
        {canInstall && !isInstalled && (
          <button
            type="button"
            onClick={showInstallPrompt}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-all shadow-md active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm font-medium">Ilovani yuklab olish</span>
          </button>
        )}
        
        <NotificationBell />

        <div className="dropdown relative">
          <button
            type="button"
            className="dropdown-toggle"
            onClick={() => {
              setShowLangMenu(!showLangMenu);
              setShowUserMenu(false);
            }}
          >
            🌐 {t('language')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`dropdown-menu ${showLangMenu ? 'show' : ''}`}>
            {languages.map((l) => (
              <div
                key={l.code}
                className="dropdown-item"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setLang(l.code);
                  setShowLangMenu(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setLang(l.code);
                    setShowLangMenu(false);
                  }
                }}
              >
                {t(l.labelKey)}
              </div>
            ))}
          </div>
        </div>

        <div className="dropdown relative">
          <button
            type="button"
            className="dropdown-toggle items-center gap-2"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowLangMenu(false);
            }}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-300 cursor-pointer">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user?.displayName || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {initial}
                </div>
              )}
            </div>
            <span className="max-w-[120px] truncate">{user?.displayName || user?.username || centerName}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`dropdown-menu ${showUserMenu ? 'show' : ''}`}>
            <Link href="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
              ⚙️ {t('settingsMenu')}
            </Link>
            {isOffice && (
              <Link
                href="/admin/permissions"
                className="dropdown-item"
                onClick={() => setShowUserMenu(false)}
              >
                🔐 {t('permissionsMenu')}
              </Link>
            )}
            <div className="dropdown-item" role="button" tabIndex={0} onClick={handleLogout}>
              🚪 {t('logout')}
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
