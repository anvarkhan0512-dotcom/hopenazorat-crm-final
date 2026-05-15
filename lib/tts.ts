'use client';

type TTSOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
};

let currentUtterance: SpeechSynthesisUtterance | null = null;
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

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  
  // Priority order for best natural voice
  const preferred = [
    'uz-UZ-MadinaNeural',      // Uzbek female neural (Edge browser)
    'Microsoft Madina',         // Uzbek
    'ru-RU-SvetlanaNeural',    // Russian female neural
    'Microsoft Svetlana',       // Russian female
    'ru-RU-DariyaNeural',      // Russian female alt
    'Google русский',           // Google Russian
    'Microsoft Irina',          // Russian female
  ];
  
  for (const name of preferred) {
    const found = voices.find(v =>
      v.name.includes(name) || v.name === name
    );
    if (found) return found;
  }
  
  // Fallback: any Russian female voice
  const ruFemale = voices.find(v =>
    v.lang.startsWith('ru') &&
    !v.name.toLowerCase().includes('male')
  );
  if (ruFemale) return ruFemale;
  
  // Last fallback: any voice
  return voices[0] || null;
}

export async function speak(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  if (isMuted || typeof window === 'undefined') return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Wait for voices to load if needed
  if (window.speechSynthesis.getVoices().length === 0) {
    await new Promise<void>(resolve => {
      window.speechSynthesis.onvoiceschanged = () => resolve();
      setTimeout(resolve, 1000); // timeout fallback
    });
  }
  
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;
    
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    
    utterance.lang = options.lang || 'uz-UZ';
    utterance.rate = options.rate || 0.92;
    utterance.pitch = options.pitch || 1.05;
    utterance.volume = options.volume || 1;
    
    utterance.onstart = () => notifyListeners(true);
    utterance.onend = () => {
      notifyListeners(false);
      resolve();
    };
    utterance.onerror = (e) => {
      notifyListeners(false);
      if (e.error !== 'interrupted') reject(e);
      else resolve();
    };
    
    window.speechSynthesis.speak(utterance);
    
    // Chrome bug fix: keep speech alive
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearInterval(keepAlive);
      }
    }, 10000);
    
    const originalOnEnd = utterance.onend;
    utterance.onend = (ev) => {
      clearInterval(keepAlive);
      if (originalOnEnd) originalOnEnd.call(utterance, ev);
    };
  });
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined') {
    window.speechSynthesis.cancel();
    currentUtterance = null;
    notifyListeners(false);
  }
}

export function setMuted(muted: boolean): void {
  isMuted = muted;
  if (muted) stopSpeaking();
}

export function isSpeakingNow(): boolean {
  return typeof window !== 'undefined' &&
    window.speechSynthesis.speaking;
}
