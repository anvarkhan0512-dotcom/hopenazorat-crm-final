'use client';

import { useState, ReactNode, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FloatingMic from '@/components/FloatingMic';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header 
          title={title} 
          onMenuClick={() => setSidebarOpen(true)} 
          onToggleCollapse={toggleSidebarCollapse}
          isCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {subtitle && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
              <p className="text-gray-500 mt-1">{subtitle}</p>
            </div>
          )}
          {!subtitle && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
      <FloatingMic />
    </div>
  );
}