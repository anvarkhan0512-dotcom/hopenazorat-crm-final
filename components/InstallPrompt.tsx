'use client';

import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if user has already closed the prompt in the last 24 hours
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
    const now = new Date().getTime();
    
    if (lastDismissed && now - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIOSDevice && !isStandalone) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('ServiceWorker registration successful');
          },
          (err) => {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS doesn't support beforeinstallprompt, instructions are already shown
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    localStorage.setItem('pwa_prompt_dismissed', new Date().getTime().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[9999] md:left-auto md:right-8 md:w-96">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-hope-primary/20 p-5 flex flex-col gap-4 animate-in slide-in-from-bottom-10 duration-500">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-hope-primary to-hope-purple-dark rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shrink-0">
            🎓
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-800 dark:text-white text-base">Hope Study ilovasini o&apos;rnatish</h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
              {isIOS 
                ? "Ilovani o'rnatish uchun [Ulashish] tugmasini bosing va [Ekraningizga qo'shish] ni tanlang."
                : "Hope Study CRM ilovasini tezroq kirish uchun asosiy ekranga qo'shib oling."}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {!isIOS && (
          <div className="flex gap-3">
            <button 
              onClick={handleInstall}
              className="flex-1 bg-hope-primary hover:bg-hope-purple-dark text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
            >
              Hozir o&apos;rnatish
            </button>
            <button 
              onClick={handleClose}
              className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              Keyinroq
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
