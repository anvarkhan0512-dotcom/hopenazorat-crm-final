'use client';

import { useState, useCallback, useRef } from 'react';

interface WhisperOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

export const useWhisperFallback = (options: WhisperOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);
        
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          
          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) throw new Error('Transcription failed');
          
          const data = await response.json();
          if (options.onTranscript) {
            options.onTranscript(data.text);
          }
        } catch (err: any) {
          setError('Ovozni matnga o\'tkazishda xatolik');
          if (options.onError) options.onError(err.message);
        } finally {
          setIsProcessing(false);
        }
        
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err: any) {
      setError('Mikrofon ruxsati berilmagan yoki topilmadi');
      if (options.onError) options.onError(err.message);
    }
  }, [options]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    error,
  };
};
