'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Modal from '@/components/Modal';

interface Center {
  _id: string;
  name: string;
  adminUsername: string;
  isBlocked: boolean;
  trialEndsAt: string;
  createdAt: string;
  settings: {
    logoText: string;
    primaryColor: string;
  };
}

export default function BossCentersPage() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // New center form
  const [formData, setFormData] = useState({
    name: '',
    adminUsername: '',
    adminPassword: '',
    trialDays: '7',
    logoText: '',
    primaryColor: '#7c3aed',
  });

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'boss') {
      router.push('/dashboard');
      return;
    }
    fetchCenters();
  }, [user]);

  const fetchCenters = async () => {
    try {
      const res = await fetch('/api/boss/centers');
      if (res.ok) {
        const data = await res.json();
        setCenters(data);
      }
    } catch (error) {
      console.error('Failed to fetch centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/boss/centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          adminUsername: '',
          adminPassword: '',
          trialDays: '7',
          logoText: '',
          primaryColor: '#7c3aed',
        });
        fetchCenters();
      } else {
        const data = await res.json();
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Failed to create center:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (centerId: string, currentStatus: boolean) => {
    if (!confirm(`Markazni ${currentStatus ? 'faollashtirish' : 'bloklash'}ni tasdiqlaysizmi?`)) return;
    try {
      const res = await fetch('/api/boss/centers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerId, isBlocked: !currentStatus }),
      });
      if (res.ok) fetchCenters();
    } catch (error) {
      console.error('Failed to toggle block:', error);
    }
  };

  if (loading) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">MARKAZLAR BOSHQARUVI</h1>
            <p className="text-gray-500 font-medium">CRM tizimidagi barcha o&apos;quv markazlari</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push('/boss/dashboard')}
              className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
            >
              ← Dashboard
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center gap-2"
            >
              <span>+</span> Yangi markaz qo&apos;shish
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Markaz nomi</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Admin Login</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Trial tugashi</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Holat</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {centers.map((c) => {
                const isExpired = new Date(c.trialEndsAt) < new Date();
                return (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: c.settings.primaryColor }}></div>
                        <div>
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-black">{c.settings.logoText}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-mono text-blue-600">{c.adminUsername}</td>
                    <td className="p-4">
                      <p className={`text-sm font-bold ${isExpired ? 'text-red-500' : 'text-gray-700'}`}>
                        {new Date(c.trialEndsAt).toLocaleDateString('uz-UZ')}
                      </p>
                      <p className="text-[10px] text-gray-400">{isExpired ? 'Muddati o\'tgan' : 'Kun qoldi'}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        c.isBlocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {c.isBlocked ? 'Bloklangan' : 'Faol'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => toggleBlock(c._id, c.isBlocked)}
                        className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${
                          c.isBlocked ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {c.isBlocked ? 'Faollashtirish' : 'Bloklash'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {centers.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-gray-400">Markazlar mavjud emas</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yangi markaz qo'shish">
        <form onSubmit={handleCreateCenter} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Markaz nomi</label>
              <input 
                required
                className="w-full p-3 border rounded-xl outline-none focus:border-purple-500"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Login matni (Logo)</label>
              <input 
                className="w-full p-3 border rounded-xl outline-none focus:border-purple-500"
                value={formData.logoText}
                onChange={e => setFormData({...formData, logoText: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Admin Login</label>
              <input 
                required
                className="w-full p-3 border rounded-xl outline-none focus:border-purple-500"
                value={formData.adminUsername}
                onChange={e => setFormData({...formData, adminUsername: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Admin Parol</label>
              <input 
                required
                type="password"
                className="w-full p-3 border rounded-xl outline-none focus:border-purple-500"
                value={formData.adminPassword}
                onChange={e => setFormData({...formData, adminPassword: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Trial davri (kun)</label>
              <input 
                type="number"
                className="w-full p-3 border rounded-xl outline-none focus:border-purple-500"
                value={formData.trialDays}
                onChange={e => setFormData({...formData, trialDays: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Asosiy rang</label>
              <input 
                type="color"
                className="w-full h-[46px] border rounded-xl cursor-pointer"
                value={formData.primaryColor}
                onChange={e => setFormData({...formData, primaryColor: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all disabled:opacity-50"
          >
            {saving ? 'Yaratilmoqda...' : 'Markazni yaratish'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
