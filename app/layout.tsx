import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { CenterProvider } from '@/lib/center-context';
import { AIProvider } from '@/components/AIProvider';
import { PWAProvider } from '@/lib/pwa-context';
import PWAInstallModal from '@/components/PWAInstallModal';
import PWAInitializer from '@/components/PWAInitializer';
import FloatingChat from '@/components/FloatingChat';
import GlobalVoiceAssistant from '@/components/GlobalVoiceAssistant';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-hope-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-hope-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Edu CRM',
  description: 'Online ta\'lim platformasi',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Edu CRM',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#5C139C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>
            <CenterProvider>
              <PWAProvider>
                <AIProvider>
                  <PWAInitializer />
                  {children}
                  <GlobalVoiceAssistant />
                  <PWAInstallModal />
                </AIProvider>
              </PWAProvider>
            </CenterProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}