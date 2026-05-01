'use client';

import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
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
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-8 md:w-96">
      <div className="bg-white rounded-xl shadow-2xl border p-4 flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500">
        <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl shrink-0">
          🎓
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 text-sm">Ilovani o&apos;rnatish</h4>
          <p className="text-gray-500 text-xs mt-1">Hope Study CRM ilovasini tezroq kirish uchun o&apos;rnatib oling.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={handleInstall}
            className="btn btn-primary text-[10px] py-1.5 px-3"
          >
            O&apos;rnatish
          </button>
          <button 
            onClick={() => setShowPrompt(false)}
            className="text-[10px] text-gray-400 hover:text-gray-600 text-center"
          >
            Keyinroq
          </button>
        </div>
      </div>
    </div>
  );
}
