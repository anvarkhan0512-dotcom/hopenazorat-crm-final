'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}) => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = 'uz-UZ';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (options.onResult) {
          options.onResult(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = 'Xatolik yuz berdi';
        
        if (event.error === 'not-allowed') {
          errorMessage = 'Mikrofon ruxsati berilmagan';
        } else if (event.error === 'no-speech') {
          errorMessage = 'Ovoz eshitilmadi';
        } else if (event.error === 'network') {
          errorMessage = 'Tarmoq xatosi';
        }
        
        setError(errorMessage);
        setIsListening(false);
        if (options.onError) options.onError(errorMessage);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (options.onEnd) options.onEnd();
      };

      recognitionRef.current = recognition;
    }
  }, [options]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    isSupported,
    error,
  };
};
