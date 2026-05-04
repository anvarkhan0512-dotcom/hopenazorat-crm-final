'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Hide on ai-assistant page
  if (pathname === '/ai-assistant') return null;

  // Load on mount:
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chat_history');
      if (saved) setMessages(JSON.parse(saved));
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

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { 
      role: 'user', 
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', currentInput);
      formData.append('history', JSON.stringify(messages));

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
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9998 }}
          className="w-16 h-16 bg-purple-700 rounded-full 
            flex items-center justify-center shadow-xl 
            hover:bg-purple-800 transition-all"
        >
          <span className="text-2xl">🤖</span>
        </button>
      )}

      {/* Mini Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          zIndex: 9998, width: 320, height: 480
        }}
          className="bg-white rounded-2xl shadow-2xl 
            flex flex-col overflow-hidden border border-purple-200"
        >
          {/* Header */}
          <div className="bg-purple-700 p-3 flex items-center 
            justify-between">
            <span className="text-white font-bold">🤖 Hope Study AI</span>
            <button onClick={() => setIsOpen(false)}
              className="text-white text-xl">—</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-gray-400 text-sm text-center mt-4">
                Salom! Qanday yordam kerak?
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`p-2 rounded-lg text-sm 
                ${msg.role === 'user'
                  ? 'bg-purple-100 ml-4'
                  : 'bg-gray-100 mr-4'}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="bg-gray-100 p-2 rounded-lg text-sm mr-4">
                ⏳ Javob yozilmoqda...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Xabar yozing..."
              className="flex-1 border rounded-lg px-3 py-2 
                text-sm outline-none focus:border-purple-400"
            />
            <button onClick={sendMessage}
              className="bg-purple-700 text-white px-3 py-2 
                rounded-lg text-sm hover:bg-purple-800">
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
