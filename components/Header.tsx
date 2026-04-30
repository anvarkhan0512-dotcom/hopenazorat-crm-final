'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { Language } from '@/lib/translations';
import { useAuth } from '@/components/AuthProvider';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const { t, lang, setLang } = useLanguage();
  const { user } = useAuth();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  return (
    <header className="topbar">
      <div className="flex items-center gap-4">
        <button type="button" className="mobile-menu-btn md:hidden" onClick={onMenuClick} aria-label="Menyu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="topbar-title">{title}</h2>
      </div>

      <div className="topbar-actions">
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
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="avatar avatar-sm">{initial}</div>
            )}
            <span className="max-w-[120px] truncate">{user?.displayName || user?.username || t('admin')}</span>
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
  );
}
