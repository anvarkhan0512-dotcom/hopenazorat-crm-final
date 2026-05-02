'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PWAContextType {
  deferredPrompt: any;
  isInstalled: boolean;
  isIOS: boolean;
  isInAppBrowser: boolean;
  canInstall: boolean;
  showInstallPrompt: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // 1. Detect if app is already installed (standalone mode)
    const checkInstalled = () => {
      if (typeof window !== 'undefined') {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone || 
                           document.referrer.includes('android-app://');
        setIsInstalled(isStandalone);
      }
    };

    // 2. Detect iOS/Safari
    const checkIOS = () => {
      if (typeof window !== 'undefined') {
        const ua = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(ua);
        setIsIOS(isIOSDevice);
      }
    };

    // 3. Detect In-App Browsers (Telegram, Instagram, Facebook, etc.)
    const checkInAppBrowser = () => {
      if (typeof window !== 'undefined') {
        const ua = window.navigator.userAgent.toLowerCase();
        const isInApp = /telegram|instagram|fbav|fb_iab|messenger|line|viber/.test(ua);
        setIsInAppBrowser(isInApp);
      }
    };

    // 4. Listen for 'beforeinstallprompt'
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('PWA install prompt fired!');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    // 5. Listen for 'appinstalled'
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    checkInstalled();
    checkIOS();
    checkInAppBrowser();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const showInstallPrompt = async () => {
    if (!deferredPrompt) {
      console.log('The deferred prompt is not available.');
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <PWAContext.Provider value={{
      deferredPrompt,
      isInstalled,
      isIOS,
      isInAppBrowser,
      canInstall,
      showInstallPrompt
    }}>
      {children}
    </PWAContext.Provider>
  );
}

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
