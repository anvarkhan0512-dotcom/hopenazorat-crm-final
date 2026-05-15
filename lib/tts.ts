'use client';

let currentAudio: HTMLAudioElement | null = null;
let isMuted = false;
let speakingListeners: ((isSpeaking: boolean) => void)[] = [];

function notifyListeners(isSpeaking: boolean) {
  speakingListeners.forEach(listener => listener(isSpeaking));
}

export function onSpeakingChange(listener: (isSpeaking: boolean) => void) {
  speakingListeners.push(listener);
  return () => {
    speakingListeners = speakingListeners.filter(l => l !== listener);
  };
}

export async function speak(text: string): Promise<void> {
  if (isMuted || !text || typeof window === 'undefined') return;
   
  stopSpeaking();
   
  try {
    notifyListeners(true);
    // Try Google TTS server route first 
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: 'uz' })
    });
     
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);
       
      await new Promise<void>((resolve) => {
        currentAudio!.onended = () => {
          URL.revokeObjectURL(url);
          notifyListeners(false);
          resolve();
        };
        currentAudio!.onerror = () => {
          notifyListeners(false);
          resolve();
        };
        currentAudio!.play().catch(() => {
          notifyListeners(false);
          resolve();
        });
      });
      return;
    }
  } catch (e) {
    console.warn('Google TTS failed, using fallback:', e);
  }
   
  // Fallback: Web Speech API 
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'uz-UZ';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => notifyListeners(true);
    utterance.onend = () => {
      notifyListeners(false);
      resolve();
    };
    utterance.onerror = () => {
      notifyListeners(false);
      resolve();
    };
    
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== 'undefined') {
    window.speechSynthesis.cancel();
  }
  notifyListeners(false);
}

export function setMuted(muted: boolean): void {
  isMuted = muted;
  if (muted) stopSpeaking();
}

export function isSpeakingNow(): boolean {
  return (currentAudio !== null && !currentAudio.paused) || 
    (typeof window !== 'undefined' && window.speechSynthesis.speaking);
}
