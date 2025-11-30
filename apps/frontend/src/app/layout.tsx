import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { logger } from '@/lib/logger';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GS Stream Digest',
  description: 'Email digest system for Grand Shooting stream events',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Log startup information (only on server side)
  if (typeof window === 'undefined') {
    logger.logStartup();
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#18181b',
                color: '#fafafa',
                border: '1px solid #27272a',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}