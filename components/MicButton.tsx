'use client';

import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useWhisperFallback } from '@/hooks/useWhisperFallback';

interface MicButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

const MicButton: React.FC<MicButtonProps> = ({ onTranscript, className }) => {
  const [useWhisper, setUseWhisper] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const speechRec = useSpeechRecognition({
    onResult: (text) => {
      onTranscript(text);
    },
    onError: (err) => {
      console.warn('SpeechRecognition error, falling back to Whisper:', err);
      setUseWhisper(true);
    }
  });

  const whisper = useWhisperFallback({
    onTranscript: (text) => {
      onTranscript(text);
    },
    onError: (err) => {
      setInternalError(err);
    }
  });

  useEffect(() => {
    if (!speechRec.isSupported) {
      setUseWhisper(true);
    }
  }, [speechRec.isSupported]);

  const isListening = useWhisper ? whisper.isListening : speechRec.isListening;
  const isProcessing = whisper.isProcessing;
  const error = internalError || speechRec.error;

  const toggleListening = () => {
    if (isListening) {
      if (useWhisper) {
        whisper.stopListening();
      } else {
        speechRec.stopListening();
      }
    } else {
      setInternalError(null);
      if (useWhisper) {
        whisper.startListening();
      } else {
        speechRec.startListening();
      }
    }
  };

  if (process.env.NEXT_PUBLIC_ENABLE_MIC !== 'true') return null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={isProcessing}
        className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : isProcessing
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={error || (isListening ? 'Eshityapman...' : isProcessing ? 'Ishlov berilmoqda...' : 'Ovozli qidiruv')}
      >
        {isProcessing ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : error ? (
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      
      {error && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default MicButton;
