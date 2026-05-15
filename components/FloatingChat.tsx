'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCenter } from '@/lib/center-context';
import { useAuth } from '@/components/AuthProvider';

import MicButton from '@/components/MicButton';
import { speak, stopSpeaking, onSpeakingChange } from '@/lib/tts';
import SoundWave from '@/components/SoundWave';

export default function FloatingChat() {
  const { centerName } = useCenter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAIspeaking, setIsAIspeaking] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    return onSpeakingChange(setIsAIspeaking);
  }, []);

  // Isolate chat history by user
  const chatKey = user ? `chat_history_floating_${user.id}` : 'chat_history_floating_guest';

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(chatKey);
      if (saved) setMessages(JSON.parse(saved));
      else setMessages([]);
    } catch (e) {}
  }, [chatKey]);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(chatKey,
          JSON.stringify(messages));
      } catch (e) {}
    }
  }, [messages, chatKey]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('message', currentInput);
      formData.append('history',
        JSON.stringify(messages));
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      const reply = data.reply || data.message || 'Xatolik yuz berdi';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply
      }]);
      if (!isMuted) {
        speak(reply);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Ulanishda xatolik'
      }]);
    }
    setLoading(false);
  };

  const handleMicTranscript = (text: string) => {
    setInput(text);
    if (text.length > 3) {
      const timer = setTimeout(() => {
        sendMessage();
      }, 1500);
      return () => clearTimeout(timer);
    }
  };

  const toggleMute = () => {
    if (!isMuted) {
      stopSpeaking();
    }
    setIsMuted(!isMuted);
  };

  // Hide conditions - AFTER all hooks
  if (!mounted) return null;
  if (pathname === '/ai-assistant') return null;
  if (pathname === '/login') return null;
  if (pathname === '/') return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            zIndex: 9998
          }}
          className="w-16 h-16 bg-purple-700
            rounded-full flex items-center
            justify-center shadow-xl
            hover:bg-purple-800 transition-all
            active:scale-95"
        >
          <span className="text-2xl">🤖</span>
        </button>
      )}

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9998,
            width: 320,
            height: 480
          }}
          className="bg-white rounded-2xl
            shadow-2xl flex flex-col
            overflow-hidden border
            border-purple-200"
        >
          <div className="bg-purple-700 p-3
            flex items-center justify-between
            flex-shrink-0">
            <span className="text-white font-bold
              text-sm">🤖 {centerName} AI</span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                className="text-white hover:opacity-70 w-8 h-8 flex items-center justify-center transition-all"
                title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white text-lg
                  hover:opacity-70 w-8 h-8
                  flex items-center justify-center">
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto
            p-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-gray-400 text-sm
                text-center mt-8">
                👋 Salom! Qanday yordam kerak?
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i}
                className={`p-2 rounded-xl
                  text-sm leading-relaxed relative group
                  ${msg.role === 'user'
                    ? 'bg-purple-100 ml-6 text-right'
                    : 'bg-white mr-6 shadow-sm'
                  }`}>
                {msg.content}
                {msg.role === 'assistant' && (
                  <div className="flex items-center mt-1">
                    <button
                      onClick={() => speak(msg.content)}
                      className="text-[10px] text-purple-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Qayta eshitish
                    </button>
                    {isAIspeaking && i === messages.length - 1 && <SoundWave isSpeaking={isAIspeaking} />}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="bg-white p-2
                rounded-xl text-sm mr-6
                shadow-sm text-gray-400">
                ⏳ Javob yozilmoqda...
              </div>
            )}
          </div>

          <div className="p-3 border-t
            flex gap-2 flex-shrink-0 bg-white">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e =>
                e.key === 'Enter' && sendMessage()}
              placeholder="Xabar yozing..."
              className="flex-1 border border-gray-200
                rounded-xl px-3 py-2 text-sm
                outline-none focus:border-purple-400"
            />
            <MicButton 
              onTranscript={handleMicTranscript}
              className="flex-shrink-0"
            />
            <button 
              onClick={sendMessage}
              disabled={loading}
              className="bg-purple-700 text-white
                px-3 py-2 rounded-xl text-sm
                hover:bg-purple-800 disabled:opacity-50">
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
