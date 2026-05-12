'use client';

import { useEffect } from 'react';

export default function PWAInitializer() {
  useEffect(() => {
    // 1. Service Worker registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch((error) => {
            console.log('ServiceWorker registration failed: ', error);
          });
      });
    }

    // 2. Telegram Mini App initialization
    if ((window as any).Telegram && (window as any).Telegram.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.expand();
      tg.ready();
      console.log('Telegram Mini App initialized and expanded');
    }
  }, []);

  return null;
}
