'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  LayoutDashboard, Bell, Settings as SettingsIcon, Building, 
  TrendingUp, Wallet, CreditCard, Banknote, Users
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FinancePage() {
  const { t, locale } = useLanguage();
  const [range, setRange] = useState('month');
  const { data, isLoading } = useSWR(`/api/finance/stats?range=${range}`, fetcher);
  const { data: dashboardData } = useSWR('/api/dashboard', fetcher);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : 'ru-RU').format(amount || 0) + " so'm";
  };

  const COLORS = ['#10B981', '#3B82F6', '#6366F1'];

  return (
    <DashboardLayout title="Moliya va Hisobotlar">
      <div className="space-y-6">
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl text-green-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Jami tushum</p>
              <h3 className="text-xl font-black text-gray-800">{formatMoney(dashboardData?.paymentsThisMonth)}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Kutilayotgan</p>
              <h3 className="text-xl font-black text-gray-800">{formatMoney(dashboardData?.financeSummary?.totalExpected)}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl text-red-600">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Qarzdorlik</p>
              <h3 className="text-xl font-black text-gray-800">{formatMoney(dashboardData?.financeSummary?.totalExpected - dashboardData?.paymentsThisMonth)}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Talabalar</p>
              <h3 className="text-xl font-black text-gray-800">{dashboardData?.totalStudents} ta</h3>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800">Tushumlar grafigi</h3>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['day', 'week', 'month', 'year'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      range === r ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {r === 'day' ? 'Bugun' : r === 'week' ? 'Hafta' : r === 'month' ? 'Oy' : 'Yil'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Bar dataKey="cash" name="Naqd" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="card" name="Karta" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="transfer" name="O'tkazma" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Type Breakdown */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6">To'lov turlari</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Naqd', value: data?.totalsByType?.cash || 0 },
                      { name: 'Karta', value: data?.totalsByType?.card || 0 },
                      { name: 'O\'tkazma', value: data?.totalsByType?.transfer || 0 },
                    ].filter(i => i.value > 0)}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {COLORS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-gray-500"><Banknote size={16} className="text-green-500" /> Naqd:</span>
                <span className="font-bold">{formatMoney(data?.totalsByType?.cash)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-gray-500"><CreditCard size={16} className="text-blue-500" /> Karta:</span>
                <span className="font-bold">{formatMoney(data?.totalsByType?.card)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-gray-500"><TrendingUp size={16} className="text-indigo-500" /> O'tkazma:</span>
                <span className="font-bold">{formatMoney(data?.totalsByType?.transfer)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
