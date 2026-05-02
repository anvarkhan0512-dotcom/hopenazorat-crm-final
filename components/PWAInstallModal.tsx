'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '@/lib/pwa-context';

export default function PWAInstallModal() {
  const { 
    isInstalled, 
    isIOS, 
    isInAppBrowser, 
    canInstall, 
    showInstallPrompt 
  } = usePWA();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the modal
    const dismissed = localStorage.getItem('pwa_modal_dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // If already installed, don't show
    if (isInstalled) return;

    // Show modal after 10 seconds if installation is possible
    // canInstall is true for Android/Chrome
    // For iOS, we show instructions even if canInstall is false (since native prompt doesn't exist)
    const timer = setTimeout(() => {
      if (!isDismissed && (canInstall || isIOS || isInAppBrowser)) {
        setIsVisible(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled, isIOS, isInAppBrowser, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa_modal_dismissed', 'true');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Havola nusxalandi! Endi uni brauzerda ochishingiz mumkin.');
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500 ease-out">
        {/* Header */}
        <div className="p-6 text-center border-b bg-gray-50 relative">
          <button 
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-20 h-20 bg-purple-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <img src="/icons/icon-192.png" alt="Hope Study" className="w-16 h-16 rounded-xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Hope Study Ilovasi</h3>
          <p className="text-gray-500 text-sm mt-1">Ilovani o&apos;rnating va qulayliklardan foydalaning</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {isInAppBrowser ? (
            /* View 3: In-App Browser Warning */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <div className="text-amber-500 text-xl pt-0.5">⚠️</div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Ilovani yuklab olish uchun <strong>Chrome</strong> yoki <strong>Safari</strong> brauzerida oching.
                </p>
              </div>
              <button 
                onClick={copyToClipboard}
                className="w-full py-4 rounded-xl font-bold text-white transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                style={{ backgroundColor: '#6B21A8' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Havoladan nusxa olish
              </button>
            </div>
          ) : isIOS ? (
            /* View 2: iOS Instructions */
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <p className="text-gray-700">Brauzer pastidagi <strong>Ulashish (Share)</strong> tugmasini bosing <span className="text-xl ml-1">📤</span></p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <p className="text-gray-700">Menyudan <strong>Asosiy ekranga qo&apos;shish</strong> bandini tanlang <span className="text-xl ml-1">➕</span></p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <p className="text-gray-700">Yuqoridagi <strong>Qo&apos;shish (Add)</strong> tugmasini bosing</p>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="w-full py-4 rounded-xl font-bold text-white transition-all"
                style={{ backgroundColor: '#6B21A8' }}
              >
                Tushunarli
              </button>
            </div>
          ) : (
            /* View 1: Android/Chrome Native Prompt */
            <div className="space-y-4">
              <p className="text-center text-gray-600 mb-6">
                Hope Study ilovasini telefoningizga o&apos;rnating va tezkor xabarnomalar hamda darslaringizga oson kirish imkoniga ega bo&apos;ling.
              </p>
              <button 
                onClick={showInstallPrompt}
                className="w-full py-4 rounded-xl font-bold text-white transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                style={{ backgroundColor: '#6B21A8' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                O&apos;rnatish
              </button>
              <button 
                onClick={handleDismiss}
                className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
              >
                Keyinroq
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
