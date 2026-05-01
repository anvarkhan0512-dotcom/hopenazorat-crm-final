'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAI } from './AIProvider';
import { useAuth } from './AuthProvider';

export default function FloatingMic() {
  const { isListening, toggleListening, transcript } = useAI();
  const { user } = useAuth();
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const canUseAI = user && (user.role === 'admin' || user.role === 'manager' || user.role === 'teacher' || user.role === 'student' || user.role === 'parent');

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
    }, 800);

    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
    }, 800);

    setIsDragging(true);
    const touch = e.touches[0];
    dragStartPos.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // If moving, cancel long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  }, [isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStartPos.current.x,
      y: touch.clientY - dragStartPos.current.y
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  if (!isVisible || !canUseAI) return null;

  return (
    <div 
      className="fixed z-[9999] select-none touch-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <div 
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          isListening ? 'bg-green-500 scale-110 pulse' : 'bg-red-500'
        } hover:scale-105`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => !isDragging && toggleListening()}
      >
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>

        {isListening && transcript && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
            {transcript}
          </div>
        )}
      </div>

      {showMenu && (
        <div className="absolute top-0 left-full ml-2 bg-white shadow-xl border rounded-lg overflow-hidden py-1 w-32">
          <button 
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
            onClick={() => {
              setIsVisible(false);
              setShowMenu(false);
            }}
          >
            O&apos;chirish
          </button>
          <button 
            className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left"
            onClick={() => setShowMenu(false)}
          >
            Yopish
          </button>
        </div>
      )}

      <style jsx>{`
        .pulse {
          animation: pulse-animation 2s infinite;
        }
        @keyframes pulse-animation {
          0% { box-shadow: 0 0 0 0px rgba(34, 197, 94, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0px rgba(34, 197, 94, 0); }
        }
      `}</style>
    </div>
  );
}
