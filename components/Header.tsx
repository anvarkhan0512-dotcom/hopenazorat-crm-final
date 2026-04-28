'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Language } from '@/lib/translations';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const { t, lang, setLang } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const languages: { code: Language; labelKey: string }[] = [
    { code: 'uz', labelKey: 'uzbek' },
    { code: 'ru', labelKey: 'russian' },
    { code: 'en', labelKey: 'english' },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="topbar">
      <div className="flex items-center gap-4">
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="topbar-title">{title}</h2>
      </div>
      
      <div className="topbar-actions">
        <div className="dropdown relative">
          <button
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
                onClick={() => {
                  setLang(l.code);
                  setShowLangMenu(false);
                }}
              >
                {t(l.labelKey)} ({l.code.toUpperCase()})
              </div>
            ))}
          </div>
        </div>
        
        <div className="dropdown relative">
          <button
            className="dropdown-toggle"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowLangMenu(false);
            }}
          >
            <div className="avatar avatar-sm">A</div>
            {t('admin')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`dropdown-menu ${showUserMenu ? 'show' : ''}`}>
            <div className="dropdown-item" onClick={handleLogout}>
              🚪 {t('logout')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}