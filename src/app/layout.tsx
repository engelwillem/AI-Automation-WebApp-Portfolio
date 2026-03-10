import type { Metadata } from 'next';
import React from 'react';
import { Instrument_Serif, Inter } from 'next/font/google';
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

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-serif',
});

export const metadata: Metadata = {
  title: 'TheChoosenTalks',
  description: 'Bertumbuh Dalam Iman — Ruang harian Anda untuk inspirasi dan komunitas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
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
