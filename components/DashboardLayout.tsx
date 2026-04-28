'use client';

import { useState, ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
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
    </div>
  );
}