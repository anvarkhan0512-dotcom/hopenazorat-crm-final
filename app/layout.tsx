import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { AIProvider } from '@/components/AIProvider';
import { PWAProvider } from '@/lib/pwa-context';
import PWAInstallModal from '@/components/PWAInstallModal';
import PWAInitializer from '@/components/PWAInitializer';

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
  title: 'Hope Study',
  description: 'Hope Study - Online ta\'lim platformasi',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Hope Study',
    statusBarStyle: 'default',
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
      <body>
        <LanguageProvider>
          <AuthProvider>
            <PWAProvider>
              <AIProvider>
                <PWAInitializer />
                {children}
                <PWAInstallModal />
              </AIProvider>
            </PWAProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}