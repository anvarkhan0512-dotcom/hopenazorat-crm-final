'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { format } from 'date-fns';
import { AlertTriangle, Bell, CheckCircle, ShieldAlert, ShieldCheck, Calendar } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function PaymentDeadlinesPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overdue' | 'warning' | 'active'>('overdue');
  const { data: students, mutate, isLoading } = useSWR('/api/students', fetcher);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState(format(new Date(), 'yyyy-MM-dd'));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = students?.filter((s: any) => s.paymentDeadline && new Date(s.paymentDeadline) < today) || [];
  
  const warning = students?.filter((s: any) => {
    if (!s.paymentDeadline) return false;
    const d = new Date(s.paymentDeadline);
    const diff = (d.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 3;
  }) || [];

  const active = students?.filter((s: any) => {
    if (!s.paymentDeadline) return false;
    const d = new Date(s.paymentDeadline);
    return d >= today && (d.getTime() - today.getTime()) / (1000 * 3600 * 24) > 3;
  }) || [];

  const handleAction = async (id: string, action: string, deadline?: string) => {
    if (action === 'block' && !window.confirm('Haqiqatdan ham bloklamoqchimisiz?')) return;
    
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, deadline })
      });
      if (res.ok) {
        mutate();
        setExtendingId(null);
      }
    } catch (err) {
      console.error('Action error:', err);
    }
  };

  const getDaysDiff = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
  };

  return (
    <DashboardLayout title={t('paymentDeadlines')}>
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'overdue' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          <AlertTriangle size={18} />
          Muddati o'tganlar ({overdue.length})
        </button>
        <button
          onClick={() => setActiveTab('warning')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'warning' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200' : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          <Bell size={18} />
          3 kun qolganlar ({warning.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'active' ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          <CheckCircle size={18} />
          Faollar ({active.length})
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-bold text-gray-600">Ism</th>
              <th className="p-4 font-bold text-gray-600">Guruh</th>
              <th className="p-4 font-bold text-gray-600">Muddat</th>
              <th className="p-4 font-bold text-gray-600">Holat</th>
              <th className="p-4 font-bold text-gray-600">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="p-12 text-center text-gray-400">Yuklanmoqda...</td></tr>
            ) : (activeTab === 'overdue' ? overdue : activeTab === 'warning' ? warning : active).length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-gray-400">Ma'lumot topilmadi</td></tr>
            ) : (
              (activeTab === 'overdue' ? overdue : activeTab === 'warning' ? warning : active).map((s: any) => (
                <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.phone}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100">
                      {s.groupId?.name || 'Guruhsiz'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className={`text-sm font-bold ${activeTab === 'overdue' ? 'text-red-500' : activeTab === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {format(new Date(s.paymentDeadline), 'dd.MM.yyyy')}
                    </div>
                    {activeTab === 'overdue' && (
                      <div className="text-[10px] text-red-400 font-bold uppercase">
                        {getDaysDiff(s.paymentDeadline)} kun o'tdi
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {s.isBlocked ? (
                      <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full border border-red-100">
                        <ShieldAlert size={14} /> BLOKLANGAN
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full border border-green-100">
                        <ShieldCheck size={14} /> FAOL
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {extendingId === s._id ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                          <input
                            type="date"
                            className="px-3 py-1 border rounded-lg text-sm outline-none focus:border-purple-500"
                            value={newDeadline}
                            onChange={(e) => setNewDeadline(e.target.value)}
                          />
                          <button
                            onClick={() => handleAction(s._id, 'extend-deadline', newDeadline)}
                            className="p-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => setExtendingId(null)}
                            className="p-1 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                          >
                            <AlertTriangle size={18} className="rotate-45" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setExtendingId(s._id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                          >
                            <Calendar size={14} /> Muddat
                          </button>
                          {!s.isBlocked ? (
                            <button
                              onClick={() => handleAction(s._id, 'block')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                            >
                              <ShieldAlert size={14} /> Bloklash
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(s._id, 'unblock')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                            >
                              <ShieldCheck size={14} /> Ochish
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
