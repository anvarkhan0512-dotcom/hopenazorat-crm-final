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

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} />
      <div className="main-content">
        <Header 
          title={title} 
          onMenuClick={() => setSidebarOpen(true)} 
          onToggleCollapse={toggleSidebarCollapse}
          isCollapsed={sidebarCollapsed}
        />
        <main className="main-body">
          {subtitle && (
            <div className="page-header">
              <h1 className="page-title">{title}</h1>
              <p className="page-subtitle">{subtitle}</p>
            </div>
          )}
          {!subtitle && (
            <div className="page-header">
              <h1 className="page-title">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
      <FloatingMic />
    </div>
  );
}