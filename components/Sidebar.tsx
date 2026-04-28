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
  { key: 'groups', href: '/groups', icon: '📚' },
  { key: 'invoices', href: '/invoices', icon: '📄' },
  { key: 'payments', href: '/payments', icon: '💰' },
  { key: 'debtors', href: '/debtors', icon: '⚠️' },
  { key: 'discounts', href: '/discounts', icon: '🎫' },
  { key: 'attendance', href: '/dashboard/attendance', icon: '✅' },
  { key: 'homeworkMenu', href: '/teacher/homework', icon: '📝' },
  { key: 'schedule', href: '/schedule', icon: '📅' },
  { key: 'reminders', href: '/reminders', icon: '🔔' },
  { key: 'reports', href: '/reports', icon: '📈' },
  { key: 'financeAdmin', href: '/admin/finances', icon: '🏦' },
];

const teacherMenu: Item[] = [
  { key: 'teacherHome', href: '/teacher', icon: '👨‍🏫' },
  { key: 'homeworkMenu', href: '/teacher/homework', icon: '📝' },
  { key: 'attendance', href: '/dashboard/attendance', icon: '✅' },
];

const parentMenu: Item[] = [
  { key: 'parentHome', href: '/parent', icon: '👪' },
  { key: 'homeworkParent', href: '/parent/homework', icon: '📝' },
];

const studentMenu: Item[] = [{ key: 'studentHome', href: '/student', icon: '🎓' }];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
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
        className={`sidebar z-50 transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="sidebar-brand">
          <BrandLogo variant="sidebar" />
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {t(item.key as any) || item.key}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="px-4 py-3 text-sm text-gray-400">
            <p>v1.2.0</p>
            <p className="text-xs mt-1">© 2026 hopenazorat</p>
          </div>
        </div>
      </aside>
    </>
  );
}
