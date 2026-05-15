'use client';

let currentAudio: HTMLAudioElement | null = null;
let speakingListeners: ((isSpeaking: boolean) => void)[] = [];
let isSpeakingState = false;

function notifyListeners(isSpeaking: boolean) {
  isSpeakingState = isSpeaking;
  speakingListeners.forEach(listener => listener(isSpeaking));
}

export function onSpeakingChange(listener: (isSpeaking: boolean) => void) {
  speakingListeners.push(listener);
  return () => {
    speakingListeners = speakingListeners.filter(l => l !== listener);
  };
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  notifyListeners(false);
}

export async function speak(text: string, voiceId?: string): Promise<void> {
  stopSpeaking();
  
  if (!text) return;

  notifyListeners(true);

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId })
    });

    if (!response.ok) {
      throw new Error('TTS_API_FAILED');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    currentAudio = new Audio(url);
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      notifyListeners(false);
      currentAudio = null;
    };
    currentAudio.onerror = () => {
      URL.revokeObjectURL(url);
      notifyListeners(false);
      currentAudio = null;
      fallbackSpeak(text);
    };

    await currentAudio.play();

  } catch (error) {
    console.warn('Edge TTS failed, falling back to Web Speech API', error);
    fallbackSpeak(text);
  }
}

function fallbackSpeak(text: string) {
  if (!('speechSynthesis' in window)) {
    notifyListeners(false);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Prefer natural sounding voices if available
  const voices = window.speechSynthesis.getVoices();
  
  // Look for Russian/Uzbek female voices or high quality Google voices
  const preferredVoice = voices.find(v => 
    (v.lang.includes('ru') || v.lang.includes('uz')) && 
    (v.name.toLowerCase().includes('female') || 
     v.name.toLowerCase().includes('milena') || 
     v.name.toLowerCase().includes('alena') || 
     v.name.toLowerCase().includes('google'))
  ) || voices.find(v => v.lang.includes('ru')) || voices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  utterance.lang = 'uz-UZ';

  utterance.onstart = () => notifyListeners(true);
  utterance.onend = () => notifyListeners(false);
  utterance.onerror = () => notifyListeners(false);

  window.speechSynthesis.speak(utterance);
}

export function isSpeaking() {
  return isSpeakingState;
}
