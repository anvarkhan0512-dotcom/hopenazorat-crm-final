'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import NotificationBell from '@/components/NotificationBell';

interface BossStats {
  markaz: {
    todayRevenue: number;
    activeStudents: number;
  };
  parents: {
    total: number;
    connected: number;
  };
  teachers: {
    name: string;
    avatar?: string;
  }[];
  students: {
    total: number;
    active: number;
    inactive: number;
  };
}

export default function BossDashboard() {
  const [stats, setStats] = useState<BossStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'boss') {
      router.push('/dashboard');
      return;
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/boss/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch boss stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden bg-black">
      {/* TOP-LEFT: Markaz */}
      <div 
        onClick={() => router.push('/boss/markaz')}
        className="relative group cursor-pointer overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 p-8 flex flex-col justify-between transition-all duration-500 hover:scale-[0.98] border-b border-r border-white/5"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <span className="text-9xl">🏛️</span>
        </div>
        <div>
          <h2 className="text-4xl font-black text-white/90 tracking-tighter uppercase italic">Markaz</h2>
          <p className="text-purple-300 text-sm font-bold mt-1">Bugungi tushum va faoliyat</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1 border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Bugungi tushum</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.markaz.todayRevenue.toLocaleString()} <span className="text-xs">so&apos;m</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1 border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Faol talabalar</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.markaz.activeStudents} <span className="text-xs">ta</span></p>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT: Ota-onalar */}
      <div 
        onClick={() => router.push('/boss/ota-ona')}
        className="relative group cursor-pointer overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 p-8 flex flex-col justify-between transition-all duration-500 hover:scale-[0.98] border-b border-white/5"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <span className="text-9xl">👪</span>
        </div>
        <div>
          <h2 className="text-4xl font-black text-white/90 tracking-tighter uppercase italic">Ota-onalar</h2>
          <p className="text-blue-300 text-sm font-bold mt-1">Tizimdagi ota-onalar va aloqa</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1 border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Jami ota-ona</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.parents.total} <span className="text-xs">ta</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1 border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Telegram ulanish</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.parents.connected} <span className="text-xs">ta</span></p>
          </div>
        </div>
      </div>

      {/* BOTTOM-LEFT: Ustozlar */}
      <div 
        onClick={() => router.push('/boss/ustozlar')}
        className="relative group cursor-pointer overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-8 flex flex-col justify-between transition-all duration-500 hover:scale-[0.98] border-r border-white/5"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <span className="text-9xl">👨‍🏫</span>
        </div>
        <div>
          <h2 className="text-4xl font-black text-white/90 tracking-tighter uppercase italic">Ustozlar</h2>
          <p className="text-emerald-300 text-sm font-bold mt-1">Jamoa va o&apos;qituvchilar</p>
        </div>
        <div className="flex items-center gap-2 overflow-hidden py-2">
          {stats?.teachers.map((t, i) => (
            <div key={i} className="flex-shrink-0 group/item relative">
              <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-emerald-700 flex items-center justify-center text-white font-bold shadow-lg">
                {t.avatar ? (
                  <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  t.name.charAt(0)
                )}
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap z-50">
                {t.name}
              </div>
            </div>
          ))}
          {stats && stats.teachers.length === 0 && (
            <p className="text-white/30 text-sm">Hozircha ustozlar mavjud emas</p>
          )}
        </div>
      </div>

      {/* BOTTOM-RIGHT: Talabalar */}
      <div 
        onClick={() => router.push('/boss/talabalar')}
        className="relative group cursor-pointer overflow-hidden bg-gradient-to-br from-orange-900 via-orange-800 to-amber-950 p-8 flex flex-col justify-between transition-all duration-500 hover:scale-[0.98]"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <span className="text-9xl">🎓</span>
        </div>
        <div>
          <h2 className="text-4xl font-black text-white/90 tracking-tighter uppercase italic">Talabalar</h2>
          <p className="text-orange-300 text-sm font-bold mt-1">O&apos;quvchilar kontingenti</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1 border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Jami talaba</p>
            <p className="text-2xl font-black text-white mt-1">{stats?.students.total} <span className="text-xs">ta</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex-1 border border-white/10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Faol / Tark etgan</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-black text-emerald-400">{stats?.students.active}</p>
              <p className="text-xl font-bold text-white/20">/</p>
              <p className="text-lg font-bold text-orange-400/70">{stats?.students.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Center Logo Overlay / Action */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <button 
          onClick={() => router.push('/boss/centers')}
          className="w-32 h-32 bg-white rounded-full border-8 border-black/20 flex flex-col items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
        >
          <span className="text-3xl group-hover:animate-bounce">🏢</span>
          <span className="text-[10px] font-black uppercase mt-1 text-black">Markazlar</span>
        </button>
      </div>

      {/* Top right actions */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
        <NotificationBell />
        <button 
          onClick={(e) => { e.stopPropagation(); logout(); }}
          className="p-2 bg-white/5 hover:bg-white/20 rounded-full transition-colors text-white/30 hover:text-white"
          title="Chiqish"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
