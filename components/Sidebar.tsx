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
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`sidebar z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${collapsed ? 'md:w-20' : 'md:w-[280px]'}`}
      >
        <div className="sidebar-brand overflow-hidden">
          <BrandLogo variant="sidebar" showText={!collapsed} />
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
