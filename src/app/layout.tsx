import type { Metadata, Viewport } from 'next';
import React from 'react';
import { DM_Serif_Display, Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/layouts/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseAuthSync } from '@/components/FirebaseAuthSync';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const dmSerifDisplay = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
});

const APP_NAME = 'TheChosenTalks';
const TAGLINE = 'The Chosen People';
const DEFAULT_TITLE = `${APP_NAME} - ${TAGLINE}`;
const DEFAULT_DESCRIPTION = 'Komunitas web app untuk Chosen People: ayat harian, komunitas iman, dan perjalanan rohani bertumbuh bersama.';
const DEFAULT_OG_IMAGE = 'https://thechoosentalks.com/og/versehub-bg.png'; // Updated to full URL for parity

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${APP_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  metadataBase: new URL('https://thechoosentalks.com'),
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
      {
        url: DEFAULT_OG_IMAGE,
        width: 300,
        height: 300,
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
    icon: '/brand/favicon-premium.svg',
    shortcut: '/brand/favicon-premium.svg',
    apple: '/brand/favicon-premium.svg',
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
    <html lang="id" className={`${inter.variable} ${dmSerifDisplay.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased text-[15px] leading-[1.6] md:text-[16px]" suppressHydrationWarning>
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
