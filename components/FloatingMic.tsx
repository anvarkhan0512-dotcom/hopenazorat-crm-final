'use client';

import { useState, useRef, useEffect } from 'react';

export default function FloatingMic() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);

  // Set initial position on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - 80, // roughly right: 24px
        y: window.innerHeight - 156 // roughly bottom: 100px
      });
    }
  }, []);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const recognitionRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      // Fallback for Android APK - show message
      console.log('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input:', transcript);
      // Send to AI chat
      window.dispatchEvent(new CustomEvent('voiceInput', { 
        detail: { text: transcript } 
      }));
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      alert('Mikrofon uchun Chrome brauzeri kerak');
      return;
    }
    if (!isRecording) {
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Speech start error:', e);
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    setDragMoved(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setDragMoved(true);
      }
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 64, posStart.current.x + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 64, posStart.current.y + dy))
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setDragMoved(true);
      }
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 64, posStart.current.x + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 64, posStart.current.y + dy))
      });
      // Don't prevent default to allow normal touch behavior if not dragging? 
      // User requested e.preventDefault() so keeping it.
      e.preventDefault();
    };

    const onTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  const handleClick = () => {
    if (dragMoved) return; // Don't trigger if dragged
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Touch start
  const onTouchStart = (e: React.TouchEvent) => {
    setDragMoved(false);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    posStart.current = { ...position };
    setIsDragging(true);
  };

  return (
    <button
      ref={buttonRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className={`w-14 h-14 rounded-full flex items-center justify-center 
        shadow-lg transition-colors select-none 
        ${isRecording 
          ? 'bg-red-500 animate-pulse' 
          : 'bg-red-500 hover:bg-red-600'
        }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" 
        className="w-7 h-7 text-white" 
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-7V4a3 3 0 016 0v7" />
      </svg>
      {isRecording && (
        <span className="absolute -top-1 -right-1 w-3 h-3 
          bg-red-300 rounded-full animate-ping"/>
      )}
    </button>
  );
}
