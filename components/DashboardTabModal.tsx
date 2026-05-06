'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface DashboardTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabKey: 'attendance' | 'finances' | 'students' | 'payments' | 'reports';
  title: string;
}

export default function DashboardTabModal({ isOpen, onClose, tabKey, title }: DashboardTabModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, locale } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, tabKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '';
      switch (tabKey) {
        case 'attendance':
          url = '/api/attendance';
          break;
        case 'finances':
          url = '/api/admin/finances';
          break;
        case 'students':
          url = '/api/students';
          break;
        case 'payments':
          url = '/api/payments';
          break;
        case 'reports':
          url = '/api/dashboard';
          break;
      }

      const res = await fetch(url);
      const json = await res.json();
      
      if (tabKey === 'reports') {
        // Reports summary
        setData([
          { label: t('totalStudents'), value: json.totalStudents },
          { label: t('activeStudents'), value: json.activeStudents },
          { label: t('activeGroups'), value: json.activeGroups },
          { label: t('debtorsCount'), value: json.debtorsCount },
          { label: t('paymentsThisMonth'), value: formatMoney(json.paymentsThisMonth, locale) },
        ]);
      } else {
        // Take last 10 records
        setData(Array.isArray(json) ? json.slice(0, 10) : []);
      }
    } catch (error) {
      console.error('Error fetching tab data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getFullPageHref = () => {
    switch (tabKey) {
      case 'attendance': return '/dashboard/attendance';
      case 'finances': return '/admin/finances';
      case 'students': return '/students';
      case 'payments': return '/payments';
      case 'reports': return '/reports';
      default: return '#';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 min-h-[300px] max-h-[60vh]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 py-12">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm">Yuklanmoqda...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 py-12">
              <p>{t('noData')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tabKey === 'reports' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.map((item, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">{item.label}</p>
                      <p className="text-xl font-black text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden">
                  {data.map((item, i) => (
                    <div key={item._id || i} className="p-3 hover:bg-gray-50 transition-colors flex justify-between items-center text-sm">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">
                          {tabKey === 'students' ? item.name : 
                           tabKey === 'payments' ? item.studentId?.name || 'Nomaʼlum' :
                           tabKey === 'attendance' ? item.studentName || 'Nomaʼlum' :
                           tabKey === 'finances' ? item.teacherName || item.description : 'Record'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {tabKey === 'students' ? item.phone : 
                           tabKey === 'payments' ? formatMoney(item.amount, locale) :
                           tabKey === 'attendance' ? `${item.date} | ${item.status}` :
                           tabKey === 'finances' ? formatMoney(item.amount, locale) : ''}
                        </span>
                      </div>
                      <div className="text-right text-[10px] text-gray-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50/50">
          <Link 
            href={getFullPageHref()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-md shadow-purple-200"
            onClick={onClose}
          >
            To'liq ko'rish <ArrowRight size={18} />
          </Link>
        </div>
      </div>
      
      {/* Backdrop click to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US').format(amount || 0) + " so'm";
}
