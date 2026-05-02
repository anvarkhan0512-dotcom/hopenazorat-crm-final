'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIContextType {
  messages: Message[];
  isListening: boolean;
  isProcessing: boolean;
  toggleListening: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  transcript: string;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'uz-UZ';

        rec.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        rec.onend = () => {
          if (isListening) rec.start();
        };

        setRecognition(rec);
      }
    }
  }, [isListening]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = { role: 'assistant', content: data.reply, timestamp: new Date() };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error('AI Chat error:', err);
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob);
    
    try {
      const res = await fetch('/api/ai-chat/transcribe', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const { text } = await res.json();
        if (text) sendMessage(text);
      }
    } catch (err) {
      console.error('Transcription error:', err);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      if (recognition) {
        recognition.stop();
      }
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const recorder = new MediaRecorder(stream);
        audioChunks.current = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.current.push(e.data);
        };
        
        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
          handleAudioUpload(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
        
        setMediaRecorder(recorder);
        recorder.start();
        
        if (recognition) {
          setTranscript('');
          recognition.start();
        }
        
        setIsListening(true);
      } catch (err) {
        console.error('Microphone error:', err);
        alert('Mikrofon xatosi. Iltimos, ruxsatni tekshiring.');
      }
    }
  };

  const clearMessages = () => setMessages([]);

  return (
    <AIContext.Provider value={{ 
      messages, 
      isListening, 
      isProcessing, 
      toggleListening, 
      sendMessage, 
      clearMessages,
      transcript
    }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) throw new Error('useAI must be used within an AIProvider');
  return context;
};
