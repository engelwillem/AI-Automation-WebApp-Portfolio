import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import { AppShell } from '@/layouts/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseAuthSync } from '@/components/FirebaseAuthSync';

const APP_NAME = 'TheChosenTalks';
const TAGLINE = 'The Chosen People';
const DEFAULT_TITLE = `${APP_NAME} - ${TAGLINE}`;
const DEFAULT_DESCRIPTION = 'Komunitas web app untuk Chosen People: ayat harian, komunitas iman, dan perjalanan rohani bertumbuh bersama.';
const DEFAULT_OG_IMAGE = 'https://www.thechoosentalks.org/og/versehub-bg.png';

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${APP_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  metadataBase: new URL('https://www.thechoosentalks.org'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    locale: 'id_ID',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: DEFAULT_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: [
      { url: '/brand/favicon-premium.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.png',
  },
  other: {
    'app-name': APP_NAME,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="font-sans antialiased tct-body" suppressHydrationWarning>
        <FirebaseClientProvider>
          <FirebaseAuthSync />
          <AppShell>
            {children}
          </AppShell>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
