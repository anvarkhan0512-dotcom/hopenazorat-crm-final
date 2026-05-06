'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { 
  Bell, History, Settings as SettingsIcon, MessageSquare, 
  Send, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [notificationType, setNotificationType] = useState<'telegram' | 'sms'>('telegram');
  
  const { data: settings, mutate: mutateSettings } = useSWR('/api/settings', fetcher);
  const { data: logs } = useSWR(`/api/notifications/logs?type=${notificationType}`, fetcher);

  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<any>(null);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSettings),
      });
      mutateSettings();
      alert('Sozlamalar saqlandi!');
    } catch (e) {
      alert('Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  if (!localSettings) return null;

  return (
    <DashboardLayout title="Xabarnomalar">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Tab Navigation */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'settings' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <SettingsIcon size={18} /> Sozlamalar
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'history' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <History size={18} /> Kuzatish (Tarix)
          </button>
        </div>

        {activeTab === 'settings' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Telegram Settings */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Telegram Xabarnoma</h3>
                    <p className="text-xs text-green-600 font-bold uppercase">Bepul xizmat</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={localSettings.telegramEnabled}
                    onChange={(e) => setLocalSettings({...localSettings, telegramEnabled: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-500 italic">Telegram xabarnomalari ota-onalarga bot orqali bepul yuboriladi.</p>
                {/* Templates could be added here */}
              </div>
            </div>

            {/* SMS Settings */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Send size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">SMS Xabarnoma</h3>
                    <p className="text-xs text-orange-600 font-bold uppercase">Pullik xizmat (200 so'm/sms)</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={localSettings.smsEnabled}
                    onChange={(e) => setLocalSettings({...localSettings, smsEnabled: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {localSettings.smsEnabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">To'lov shabloni</label>
                    <textarea 
                      className="w-full p-3 border rounded-xl text-sm outline-none focus:border-purple-400"
                      value={localSettings.smsTemplates.payment}
                      onChange={(e) => setLocalSettings({
                        ...localSettings, 
                        smsTemplates: {...localSettings.smsTemplates, payment: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Davomat shabloni</label>
                    <textarea 
                      className="w-full p-3 border rounded-xl text-sm outline-none focus:border-purple-400"
                      value={localSettings.smsTemplates.absent}
                      onChange={(e) => setLocalSettings({
                        ...localSettings, 
                        smsTemplates: {...localSettings.smsTemplates, absent: e.target.value}
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary px-12 py-3 shadow-lg shadow-purple-200"
              >
                {saving ? 'Saqlanmoqda...' : 'Tasdiqlash va Saqlash'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex gap-4">
              <button 
                onClick={() => setNotificationType('telegram')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  notificationType === 'telegram' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border'
                }`}
              >
                Telegram Tarixi
              </button>
              <button 
                onClick={() => setNotificationType('sms')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  notificationType === 'sms' ? 'bg-orange-600 text-white' : 'bg-white text-gray-500 border'
                }`}
              >
                SMS Tarixi
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Kimga</th>
                    <th className="px-6 py-4">Xabar</th>
                    <th className="px-6 py-4 text-center">Vaqti</th>
                    <th className="px-6 py-4 text-center">Holati</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs?.map((log: any) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{log.recipientName}</div>
                        <div className="text-xs text-gray-400">{log.recipientPhone || 'Telegram'}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-gray-600" title={log.message}>
                        {log.message}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString('uz-UZ')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md text-[10px]">
                            <CheckCircle2 size={12} /> YUBORILDI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded-md text-[10px]">
                            <XCircle size={12} /> XATO
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                        Hozircha xabarlar mavjud emas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
