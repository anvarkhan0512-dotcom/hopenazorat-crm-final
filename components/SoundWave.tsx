'use client';

import React from 'react';

const SoundWave: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  if (!isSpeaking) return null;

  return (
    <div className="flex items-center gap-[2px] h-4 ml-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full animate-soundwave"
          style={{
            animationDelay: `${i * 0.1}s`,
            height: '100%',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes soundwave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .animate-soundwave {
          animation: soundwave 1s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>
    </div>
  );
};

export default SoundWave;
