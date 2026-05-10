'use client';

import { useState, useEffect } from 'react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds 
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.notifications || [];
        setNotifications(list);
        setUnread(list.filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnread(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
      >
        <span className="text-2xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b bg-purple-50 flex justify-between items-center">
              <h3 className="font-bold text-purple-700 text-sm">
                🔔 Bildirishnomalar
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="text-4xl opacity-20 block mb-2">📭</span>
                  <p className="text-gray-400 text-xs">Bildirishnomalar yo&apos;q</p>
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n._id}
                    className={`p-4 border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                    onClick={() => markAsRead(n._id)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                      {new Date(n.createdAt).toLocaleString('uz-UZ', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50/50 text-center">
                <button
                  onClick={markAllRead}
                  className="text-xs text-purple-600 font-bold hover:text-purple-700 transition-colors"
                >
                  Hammasini o&apos;qildi deb belgilash
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
