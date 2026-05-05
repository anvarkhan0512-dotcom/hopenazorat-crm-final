'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminTelegramUsersPage() {
  const { t } = useLanguage();
  const { data: users, isLoading } = useSWR('/api/telegram/users', fetcher);

  return (
    <DashboardLayout title="Telegram Ma'lumotlar">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Telegram ulangan foydalanuvchilar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Ism</th>
                <th>Role</th>
                <th>Telegram ID</th>
                <th>Username</th>
                <th>Holat</th>
                <th>Ulangan sana</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-4">Yuklanmoqda...</td></tr>
              ) : users?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4">Foydalanuvchilar topilmadi</td></tr>
              ) : (
                users?.map((user: any) => (
                  <tr key={user._id}>
                    <td className="font-bold">{user.displayName}</td>
                    <td>
                      <span className={`badge ${
                        user.role === 'admin' ? 'badge-danger' : 
                        user.role === 'teacher' ? 'badge-primary' : 'badge-success'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{user.telegramChatId || '—'}</td>
                    <td>{user.telegramUsername ? `@${user.telegramUsername}` : '—'}</td>
                    <td className="text-center">
                      {user.telegramChatId ? (
                        <span className="text-green-500 font-bold">✅</span>
                      ) : (
                        <span className="text-orange-500 font-bold">⏳ (Kod olingan)</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-500">
                      {user.telegramChatId ? new Date(user.updatedAt).toLocaleString('uz-UZ') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
