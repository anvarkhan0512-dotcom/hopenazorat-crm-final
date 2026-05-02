'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import BrandLogo from '@/components/BrandLogo';

type Item = { key: string; href: string; icon: string };

const adminMenu: Item[] = [
  { key: 'dashboard', href: '/dashboard', icon: '📊' },
  { key: 'students', href: '/students', icon: '👥' },
  { key: 'staff', href: '/staff', icon: '👔' },
  { key: 'groups', href: '/groups', icon: '📚' },
  { key: 'freeLessons', href: '/free-lessons', icon: '🎁' },
  { key: 'invoices', href: '/invoices', icon: '📄' },
  { key: 'payments', href: '/payments', icon: '💰' },
  { key: 'debtors', href: '/debtors', icon: '⚠️' },
  { key: 'discounts', href: '/discounts', icon: '🎫' },
  { key: 'attendance', href: '/dashboard/attendance', icon: '✅' },
  { key: 'homeworkMenu', href: '/teacher/homework', icon: '📝' },
  { key: 'schedule', href: '/schedule', icon: '📅' },
  { key: 'reminders', href: '/reminders', icon: '🔔' },
  { key: 'reports', href: '/reports', icon: '📈' },
  { key: 'attendanceMonitoring', href: '/admin/attendance/monitoring', icon: '🕵️' },
  { key: 'faceId', href: '/admin/attendance/face-id', icon: '🤳' },
  { key: 'financeAdmin', href: '/admin/finances', icon: '🏦' },
  { key: 'credentials', href: '/credentials', icon: '🔐' },
  { key: 'aiAssistant', href: '/ai-assistant', icon: '🤖' },
];

const teacherMenu: Item[] = [
  { key: 'teacherHome', href: '/teacher', icon: '👨‍🏫' },
  { key: 'homeworkMenu', href: '/teacher/homework', icon: '📝' },
  { key: 'freeLessons', href: '/free-lessons', icon: '🎁' },
  { key: 'attendance', href: '/dashboard/attendance', icon: '✅' },
  { key: 'aiAssistant', href: '/ai-assistant', icon: '🤖' },
];

const parentMenu: Item[] = [
  { key: 'parentHome', href: '/parent', icon: '👪' },
  { key: 'homeworkParent', href: '/parent/homework', icon: '📝' },
  { key: 'aiAssistant', href: '/ai-assistant', icon: '🤖' },
];

const studentMenu: Item[] = [
  { key: 'studentHome', href: '/student', icon: '🎓' },
  { key: 'aiAssistant', href: '/ai-assistant', icon: '🤖' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
}

export default function Sidebar({ isOpen, onClose, collapsed }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();

  const role = user?.role;
  const isAdmin = role === 'admin' || role === 'manager';
  const menuItems = isAdmin
    ? adminMenu
    : role === 'teacher'
      ? teacherMenu
      : role === 'parent'
        ? parentMenu
        : role === 'student'
          ? studentMenu
          : adminMenu;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/teacher') return pathname === '/teacher';
    if (href === '/parent') return pathname === '/parent';
    if (href === '/student') return pathname === '/student' || pathname.startsWith('/student/');
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e1e2d] text-white transition-transform duration-300 ease-in-out transform 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 lg:static lg:block 
          ${collapsed ? 'lg:w-20' : 'lg:w-[280px]'}`}
      >
        <div className="sidebar-brand flex items-center justify-between overflow-hidden">
          <BrandLogo variant="sidebar" showText={!collapsed} />
          {/* Close button for mobile */}
          <button 
            onClick={onClose} 
            className="p-2 lg:hidden text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
              onClick={onClose}
              title={collapsed ? t(item.key as any) || item.key : ''}
            >
              <span className={`sidebar-link-icon ${collapsed ? 'm-0 text-xl' : ''}`}>{item.icon}</span>
              {!collapsed && (t(item.key as any) || item.key)}
            </Link>
          ))}
        </nav>

        {!collapsed && (
          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="px-4 py-3 text-sm text-gray-400">
              <p>
                {t('appVersionLabel')} 1.2.0
              </p>
              <p className="text-xs mt-1">{t('copyrightShort')}</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
