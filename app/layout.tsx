import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { AIProvider } from '@/components/AIProvider';
import InstallPrompt from '@/components/InstallPrompt';

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
  description: 'Hope Study — ta’lim markazi boshqaruvi',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Hope Study',
    statusBarStyle: 'black-translucent',
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
            <AIProvider>
              {children}
              <InstallPrompt />
            </AIProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}