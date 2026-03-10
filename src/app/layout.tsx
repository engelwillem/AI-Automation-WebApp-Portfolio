
import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { AppShell } from '@/layouts/AppShell';

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
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
