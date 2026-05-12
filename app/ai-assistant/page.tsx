'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function AIAssistantPage() {
  const { t } = useLanguage();
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [input, setInput] = useState('');

  // Load on mount:
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert string timestamps back to Date objects
        const formatted = parsed.map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        }));
        setMessages(formatted);
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
  }, []);

  // Save when messages change:
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('chat_history', JSON.stringify(messages));
      } catch (e) {
        console.error('Error saving chat history:', e);
      }
    }
  }, [messages]);

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('chat_history');
  };

  const sendMessage = async (messageText: string, files: File[] = []) => {
    const userMsg = { 
      role: 'user', 
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('message', messageText);
      formData.append('history', JSON.stringify(messages));
      files.forEach(file => formData.append('files', file));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || data.message,
        timestamp: new Date()
      }]);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace('/login');
    }
  }, [authLoading, authUser, router]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'uz-UZ';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to find Uzbek voice, fallback to default
    const voices = window.speechSynthesis.getVoices();
    const uzVoice = voices.find(v => v.lang.includes('uz'));
    if (uzVoice) utterance.voice = uzVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && !isProcessing) {
        speakText(lastMsg.content);
      }
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSend = async (e?: React.FormEvent | string, filesOverride?: File[]) => {
    if (e && typeof e !== 'string') e.preventDefault();
    
    const messageText = typeof e === 'string' ? e : input;
    const files = filesOverride || [...selectedFiles];
    
    if ((!messageText.trim() && files.length === 0) || isProcessing) return;
    
    setInput('');
    setSelectedFiles([]);
    await sendMessage(messageText, files);
  };

  useEffect(() => {
    const handleVoiceInput = (e: any) => {
      const text = e.detail.text;
      setInput(text);
      // Auto send after voice input
      setTimeout(() => handleSend(text), 500);
    };
    window.addEventListener('voiceInput', handleVoiceInput as EventListener);
    return () => window.removeEventListener('voiceInput', handleVoiceInput as EventListener);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };

  const role = authUser?.role;
  const isStudent = role === 'student' || role === 'parent';

  return (
    <DashboardLayout title="AI Assistant" subtitle={isStudent ? "O&apos;qituvchi yordamchisi" : `${centerName} aqlli menejeri bilan muloqot`}>
      <div className="flex flex-col h-[calc(100vh-220px)] bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-bottom flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl">
              {isStudent ? '👨‍🏫' : '🤖'}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{isStudent ? 'Yordamchi Ustoz' : `${centerName} AI`}</h3>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Onlayn
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
              title={voiceEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>
            <button 
              onClick={clearMessages}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Suhbatni tozalash
            </button>
          </div>
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
                  ? "Men sizga darslaringizni tushunishda va uy vazifalarida yo&apos;nalish berishda yordam beraman."
                  : "Men Hope Study aqlli menejeriman. Markazimiz haqida har qanday savolingiz bo&apos;lsa, so&apos;rashingiz mumkin."}
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
                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.files.map((file, idx) => (
                      <div key={idx} className="w-full">
                        {file.type.startsWith('image/') ? (
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="max-w-full h-auto rounded-lg mb-1 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(file.url, '_blank')}
                          />
                        ) : (
                          <div className={`flex items-center gap-3 p-3 rounded-xl border ${msg.role === 'user' ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'}`}>
                            <span className="text-2xl">
                              {file.type.includes('pdf') ? '📄' : 
                               file.type.includes('sheet') || file.type.includes('excel') ? '📊' : '📁'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>{file.name}</p>
                              <p className={`text-[10px] ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <a 
                              href={file.url} 
                              download={file.name}
                              className={`p-2 rounded-lg transition-colors ${msg.role === 'user' ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="px-4 py-2 border-t flex flex-wrap gap-2 bg-gray-50">
            {selectedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-indigo-100 rounded-lg px-3 py-1 text-xs text-indigo-700 border border-indigo-200">
                <span>
                  {file.type.startsWith('image/') ? '🖼️' : 
                   file.type.includes('pdf') ? '📄' : 
                   file.type.includes('sheet') || file.type.includes('excel') ? '📊' : '📁'}
                </span>
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button 
                  onClick={() => removeFile(file)}
                  className="text-indigo-400 hover:text-indigo-600 font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Chat Input */}
        <form onSubmit={handleSend} className="p-4 border-t bg-white">
          <div className="flex gap-2 items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              multiple 
              accept="image/*,.pdf,.xlsx,.xls,.docx,.doc,.txt" 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Fayl yuklash"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
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
              disabled={isProcessing || (!input.trim() && selectedFiles.length === 0)}
            >
              <span className="hidden sm:inline">Yuborish</span>
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
