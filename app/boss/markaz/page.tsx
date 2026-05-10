'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Modal from '@/components/Modal';
import NotificationBell from '@/components/NotificationBell';

interface StaffMember {
  _id: string;
  username: string;
  role: string;
  displayName: string;
  avatarUrl?: string;
  revealablePassword?: string;
  loginCount: number;
}

interface HistoryRecord {
  _id: string;
  timestamp: string;
  userAgent: string;
  ip: string;
}

export default function BossMarkazPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  
  // Modals state
  const [historyModal, setHistoryModal] = useState<{ open: boolean; userId: string; data: HistoryRecord[] }>({ open: false, userId: '', data: [] });
  const [newsModal, setNewsModal] = useState<{ open: boolean; userId: string }>({ open: false, userId: '' });
  const [blockModal, setBlockModal] = useState<{ open: boolean; userId: string }>({ open: false, userId: '' });
  const [messageModal, setMessageModal] = useState<{ open: boolean; userId: string }>({ open: false, userId: '' });
  
  const [newsText, setNewsText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [sending, setSending] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  // ... (existing useEffects)

  const sendNews = async () => {
    if (!newsText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newsModal.userId,
          title: 'Yangi e\'lon',
          message: newsText,
          type: 'info'
        })
      });
      if (res.ok) {
        setNewsModal({ open: false, userId: '' });
        setNewsText('');
        alert('E\'lon yuborildi');
      }
    } catch (err) {
      console.error('Failed to send news:', err);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;
    setSending(true);
    try {
      // Find an admin to send the message to (or just send to all admins)
      // For now, let's assume there's a specific logic or we just send it
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newsModal.userId, // Sending back to the staff member
          title: 'Xabar (Boshliqdan)',
          message: messageText,
          type: 'message'
        })
      });
      if (res.ok) {
        setMessageModal({ open: false, userId: '' });
        setMessageText('');
        alert('Xabar yuborildi');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/boss/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (userId: string) => {
    try {
      const res = await fetch(`/api/boss/login-history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryModal({ open: true, userId, data });
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const togglePassword = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">MARKAZ BOSHQARUVI</h1>
            <p className="text-gray-500 font-medium">Xodimlar va tizim xavfsizligi</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button 
              onClick={() => router.push('/boss/dashboard')}
              className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              ← Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Profil</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Ism-sharif</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Lavozim</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Login / Parol</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center overflow-hidden">
                        {s.avatarUrl ? (
                          <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-purple-600 font-bold">{s.displayName.charAt(0)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{s.displayName}</p>
                      <p className="text-xs text-gray-400">{s.username}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        s.role === 'admin' ? 'bg-red-100 text-red-600' :
                        s.role === 'manager' ? 'bg-blue-100 text-blue-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{s.username}</code>
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          <span className="text-xs font-mono">
                            {showPassword[s._id] ? (s.revealablePassword || '********') : '••••••••'}
                          </span>
                          <button onClick={() => togglePassword(s._id)} className="text-gray-400 hover:text-gray-600">
                            {showPassword[s._id] ? '👁️‍🗨️' : '👁️'}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => fetchHistory(s._id)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all" title="Kirish tarixi">🕒</button>
                        <button onClick={() => setNewsModal({ open: true, userId: s._id })} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-yellow-50 hover:text-yellow-600 transition-all" title="Yangiliklar">🔔</button>
                        <button onClick={() => setBlockModal({ open: true, userId: s._id })} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all" title="To'xtatish">🛑</button>
                        <button onClick={() => setMessageModal({ open: true, userId: s._id })} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-purple-50 hover:text-purple-600 transition-all" title="Xabar yuborish">✉️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* History Modal */}
      <Modal isOpen={historyModal.open} onClose={() => setHistoryModal({ ...historyModal, open: false })} title="Kirish Tarixi">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b">
                <th className="p-2 text-gray-400">Sana va vaqt</th>
                <th className="p-2 text-gray-400">IP manzil</th>
                <th className="p-2 text-gray-400">Qurilma</th>
              </tr>
            </thead>
            <tbody>
              {historyModal.data.map((h) => (
                <tr key={h._id} className="border-b last:border-0">
                  <td className="p-2 font-medium">{new Date(h.timestamp).toLocaleString('uz-UZ')}</td>
                  <td className="p-2 font-mono text-blue-600">{h.ip}</td>
                  <td className="p-2 text-gray-500 truncate max-w-[150px]" title={h.userAgent}>{h.userAgent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* News Modal */}
      <Modal isOpen={newsModal.open} onClose={() => setNewsModal({ ...newsModal, open: false })} title="Yangilik yuborish">
        <div className="space-y-4">
          <textarea 
            className="w-full h-32 p-3 border rounded-2xl outline-none focus:border-purple-500 transition-all"
            placeholder="Yangilik yoki e'lon matni..."
            value={newsText}
            onChange={(e) => setNewsText(e.target.value)}
          />
          <button 
            onClick={sendNews}
            disabled={sending}
            className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50"
          >
            {sending ? 'Yuborilmoqda...' : 'Jo\'natish'}
          </button>
        </div>
      </Modal>

      {/* Block Modal */}
      <Modal isOpen={blockModal.open} onClose={() => setBlockModal({ ...blockModal, open: false })} title="Xodimni to'xtatish">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Vaqtincha to&apos;xtatish sanasi</label>
            <input 
              type="date" 
              className="w-full p-3 border rounded-xl outline-none focus:border-red-500"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
            />
          </div>
          <div className="pt-4 border-t space-y-2">
            <button className="w-full py-3 border border-red-500 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-all">
              Vaqtincha to&apos;xtatish
            </button>
            <button className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all">
              Umrbod to&apos;xtatish
            </button>
          </div>
        </div>
      </Modal>

      {/* Message Modal */}
      <Modal isOpen={messageModal.open} onClose={() => setMessageModal({ ...messageModal, open: false })} title="Xabar yuborish">
        <div className="space-y-4">
          <textarea 
            className="w-full h-32 p-3 border rounded-2xl outline-none focus:border-purple-500 transition-all"
            placeholder="Xabar matni..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <button 
            onClick={sendMessage}
            disabled={sending}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50"
          >
            {sending ? 'Yuborilmoqda...' : 'Jo\'natish'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
