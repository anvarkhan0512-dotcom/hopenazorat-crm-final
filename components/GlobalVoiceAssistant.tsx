'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useWhisperFallback } from '@/hooks/useWhisperFallback';
import { speak, stopSpeaking, onSpeakingChange } from '@/lib/tts';
import SoundWave from '@/components/SoundWave';
import { useAuth } from '@/components/AuthProvider';
import { usePathname } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const GlobalVoiceAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIspeaking, setIsAIspeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const { user } = useAuth();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatKey = 'voice_assistant_history';

  // State Management
  const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

  useEffect(() => {
    return onSpeakingChange((speaking) => {
      setIsAIspeaking(speaking);
      if (speaking) setState('speaking');
      else if (state === 'speaking') setState('idle');
    });
  }, [state]);

  // Persistence
  useEffect(() => {
    const saved = sessionStorage.getItem(chatKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved).slice(-20));
      } catch (e) {
        console.error('Failed to load voice history', e);
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(chatKey, JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg].slice(-20));
    setState('processing');
    setIsProcessing(true);
    setInterimTranscript('');

    try {
      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          page: pathname
        })
      });

      const data = await res.json();
      const reply = data.text || 'Xatolik yuz berdi';
      
      const assistantMsg: Message = { role: 'assistant', content: reply, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg].slice(-20));

      if (data.action) {
        const actionMsg: Message = { 
          role: 'assistant', 
          content: `${data.action.success ? '✅' : '❌'} ${data.action.message}`, 
          timestamp: Date.now() 
        };
        setMessages(prev => [...prev, actionMsg].slice(-20));
      }
      
      if (!isMuted) {
        setState('speaking');
        speak(reply);
      } else {
        setState('idle');
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Xatolik yuz berdi', timestamp: Date.now() }]);
      setState('idle');
    } finally {
      setIsProcessing(false);
    }
  }, [messages, user, pathname, isMuted]);

  // Voice Hooks
  const speechRec = useSpeechRecognition({
    onResult: (text) => setInterimTranscript(text),
    onEnd: () => {
      if (interimTranscript) {
        handleSendMessage(interimTranscript);
      } else {
        setState('idle');
      }
    },
    onError: () => setState('idle')
  });

  const toggleMic = () => {
    if (state === 'listening') {
      speechRec.stopListening();
      setState('idle');
    } else {
      setIsOpen(true);
      setState('listening');
      speechRec.startListening();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        toggleMic();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        stopSpeaking();
        speechRec.stopListening();
        setState('idle');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state, toggleMic]);

  if (pathname === '/login' || pathname === '/register') return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Mini Chat Panel */}
      {isOpen && (
        <div className="mb-4 w-[320px] h-[480px] bg-white rounded-2xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-purple-700 p-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="font-bold text-sm">AI Yordamchi</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMuted(!isMuted)} className="p-1 hover:bg-white/10 rounded transition-colors">
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded transition-colors text-xl">
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm relative group ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 shadow-sm border rounded-tl-none'
                }`}>
                  {msg.content}
                  {msg.role === 'assistant' && (
                    <button onClick={() => speak(msg.content)} className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 p-1 text-purple-600">
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {state === 'processing' && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border text-xs text-gray-400 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  Javob tayyorlanmoqda...
                </div>
              </div>
            )}

            {state === 'listening' && (
              <div className="flex justify-end">
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-2xl rounded-tr-none text-xs text-yellow-700 animate-pulse italic">
                  {interimTranscript || 'Tinglamoqda...'}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className="p-3 border-t bg-white flex items-center gap-2">
            <button 
              onClick={toggleMic}
              className={`p-3 rounded-full transition-all duration-300 ${
                state === 'listening' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (handleSendMessage(input), setInput(''))}
              placeholder="Xabar yozing..."
              className="flex-1 text-sm border-none focus:ring-0 outline-none"
            />
            <button 
              onClick={() => { handleSendMessage(input); setInput(''); }}
              disabled={!input.trim() || isProcessing}
              className="text-purple-600 font-bold p-2 disabled:opacity-30"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 relative overflow-hidden ${
          state === 'listening' ? 'bg-red-500 scale-110' : 'bg-purple-700 hover:bg-purple-800'
        }`}
      >
        {state === 'speaking' && (
          <div className="absolute inset-0 bg-blue-400/20 animate-ping"></div>
        )}
        {state === 'processing' ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : state === 'speaking' ? (
          <SoundWave isSpeaking={true} />
        ) : (
          <span className="text-2xl">{state === 'listening' ? '🎙️' : '🤖'}</span>
        )}
      </button>
    </div>
  );
};

export default GlobalVoiceAssistant;
