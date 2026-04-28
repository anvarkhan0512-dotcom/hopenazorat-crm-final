'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';

interface Reminder {
  studentId: string;
  studentName: string;
  phone: string;
  nextPaymentDate: string;
  daysUntilDue: number;
  type: 'today' | 'tomorrow' | 'overdue' | 'upcoming';
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<{
    today: Reminder[];
    tomorrow: Reminder[];
    overdue: Reminder[];
    upcoming: Reminder[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const [upcomingRes, overdueRes] = await Promise.all([
        fetch('/api/schedule?type=upcoming&days=7'),
        fetch('/api/schedule?type=overdue'),
      ]);
      const upcoming = await upcomingRes.json();
      const overdue = await overdueRes.json();

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayFormatted = today.toISOString().split('T')[0];
      const tomorrowFormatted = tomorrow.toISOString().split('T')[0];

      const filtered = {
        today: upcoming.filter((r: any) => {
          const date = r.nextPaymentDate?.split('T')[0];
          return date === todayFormatted;
        }),
        tomorrow: upcoming.filter((r: any) => {
          const date = r.nextPaymentDate?.split('T')[0];
          return date === tomorrowFormatted;
        }),
        overdue: overdue,
        upcoming: upcoming.filter((r: any) => {
          const date = r.nextPaymentDate?.split('T')[0];
          return date !== todayFormatted && date !== tomorrowFormatted;
        }),
      };

      setReminders(filtered);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (phone: string, name: string) => {
    try {
      await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'payment_reminder',
          data: { phone, studentName: name },
        }),
      });
      alert('Eslatma yuborildi!');
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const reminderCards = [
    {
      title: "Bugungi to'lovlar",
      key: 'today' as const,
      color: '#ef4444',
      icon: '🔴',
      description: "Bugun to'lov kerak",
    },
    {
      title: 'Ertangi to\'lovlar',
      key: 'tomorrow' as const,
      color: '#f59e0b',
      icon: '🟡',
      description: 'Ertaga to\'lov kerak',
    },
    {
      title: "Qarzdorlar",
      key: 'overdue' as const,
      color: '#dc2626',
      icon: '⚠️',
      description: "Muddati o'tgan",
    },
    {
      title: 'Kutilmoqda',
      key: 'upcoming' as const,
      color: '#6366f1',
      icon: '📅',
      description: 'Kelayotgan to\'lovlar',
    },
  ];

  return (
    <DashboardLayout title="Eslatmalar">
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reminderCards.map((card) => (
            <div key={card.key} className="card">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{card.icon}</span>
                  <h3 className="card-title" style={{ color: card.color }}>
                    {card.title}
                  </h3>
                </div>
                <span className="badge" style={{ background: card.color, color: 'white' }}>
                  {reminders?.[card.key]?.length || 0}
                </span>
              </div>

              {(!reminders?.[card.key] || reminders[card.key].length === 0) ? (
                <div className="empty-state py-4">
                  <div className="empty-state-title">{"Yo'q"}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders[card.key].map((reminder: Reminder) => (
                    <div
                      key={reminder.studentId}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      style={{ borderColor: card.color }}
                    >
                      <div>
                        <div className="font-medium">{reminder.studentName}</div>
                        <div className="text-sm text-gray-500">{reminder.phone}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: card.color }}>
                          {reminder.daysUntilDue > 0 
                            ? `${reminder.daysUntilDue} kun`
                            : `${Math.abs(reminder.daysUntilDue)} kun o'tgan`
                          }
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => sendReminder(reminder.phone, reminder.studentName)}
                        >
                          📤
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}