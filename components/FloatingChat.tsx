'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAI } from './AIProvider';

export default function FloatingChat() {
  const pathname = usePathname();
  const { messages, isProcessing, sendMessage, clearMessages, isListening, toggleListening } = useAI();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hide on AI Assistant page
  if (pathname === '/ai-assistant') return null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsExpanded(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4">
      {/* Mini Chat Window */}
      {isOpen && isExpanded && (
        <div className="w-[320px] h-[480px] bg-white rounded-2xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-300 scale-100 opacity-100 origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-indigo-800 px-4 py-3 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <span className="font-bold text-sm">Hope Study AI</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsExpanded(false)}
                className="hover:bg-white/20 p-1 rounded transition-colors"
                title="Minimize"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
          >
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500">Assalomu alaykum! Savolingiz bormi?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-purple-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border rounded-tl-none'
                }`}>
                  <p className="leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-xl px-3 py-2 rounded-tl-none shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 border-t bg-white flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'text-purple-600 hover:bg-purple-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-7V4a3 3 0 016 0v7" />
              </svg>
            </button>
            <input
              type="text"
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Xabar..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      {(!isOpen || !isExpanded) && (
        <button
          onClick={toggleChat}
          className="w-16 h-16 bg-purple-700 rounded-full shadow-2xl flex items-center justify-center text-3xl hover:bg-purple-800 hover:scale-110 transition-all duration-300 animate-bounce-slow"
        >
          🤖
        </button>
      )}
    </div>
  );
}
