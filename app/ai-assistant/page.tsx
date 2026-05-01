'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAI } from '@/components/AIProvider';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function AIAssistantPage() {
  const { t } = useLanguage();
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { messages, isProcessing, sendMessage, clearMessages } = useAI();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace('/login');
    }
  }, [authLoading, authUser, router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const role = authUser?.role;
  const isStudent = role === 'student' || role === 'parent';

  return (
    <DashboardLayout title="AI Assistant" subtitle={isStudent ? "O'qituvchi yordamchisi" : "Hope Study aqlli menejeri bilan muloqot"}>
      <div className="flex flex-col h-[calc(100vh-220px)] bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-bottom flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl">
              {isStudent ? '👨‍🏫' : '🤖'}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{isStudent ? 'Yordamchi Ustoz' : 'Hope Study AI'}</h3>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Onlayn
              </p>
            </div>
          </div>
          <button 
            onClick={clearMessages}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Suhbatni tozalash
          </button>
        </div>

        {/* Chat Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8f9fa]"
        >
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">{isStudent ? '👋' : '👋'}</div>
              <h4 className="text-lg font-semibold text-gray-700">
                {isStudent ? 'Assalomu alaykum! Qaysi mavzuda yordam beray?' : 'Assalomu alaykum!'}
              </h4>
              <p className="text-gray-500 max-w-xs mx-auto">
                {isStudent 
                  ? "Men sizga darslaringizni tushunishda va uy vazifalarida yo'nalish berishda yordam beraman."
                  : "Men Hope Study aqlli menejeriman. Markazimiz haqida har qanday savolingiz bo'lsa, so'rashingiz mumkin."}
              </p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border rounded-tl-none'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <span className={`text-[10px] block mt-1 opacity-70 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-2xl px-4 py-3 rounded-tl-none shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSend} className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Xabar yozing..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
            />
            <button 
              type="submit" 
              className="btn btn-primary px-6 flex items-center gap-2"
              disabled={isProcessing || !input.trim()}
            >
              <span>Yuborish</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Mikrofondan foydalanish uchun suzuvchi ikonkani bosing
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}
