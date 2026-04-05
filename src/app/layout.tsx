import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import { AppShell } from '@/layouts/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseAuthSync } from '@/components/FirebaseAuthSync';
import { getPrimarySiteUrl, isPrimaryProductionDeployment } from '@/lib/seo';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const APP_NAME = 'The Chosen Talks';
const TAGLINE = 'The Chosen People';
const DEFAULT_TITLE = `${APP_NAME} - ${TAGLINE}`;
const DEFAULT_DESCRIPTION = 'Komunitas web app untuk Chosen People: ayat harian, komunitas iman, dan perjalanan rohani bertumbuh bersama.';
const SITE_URL = getPrimarySiteUrl();
const DEFAULT_OG_IMAGE = `${SITE_URL}/og/versehub-bg.png`;

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const indexable = isPrimaryProductionDeployment();

  return {
    title: {
      default: DEFAULT_TITLE,
      template: `%s — ${APP_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: '/',
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
          },
        }
      : {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            noarchive: true,
          },
        },
    openGraph: {
      type: 'website',
      siteName: APP_NAME,
      locale: 'id_ID',
      url: SITE_URL,
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
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
      apple: '/favicon.svg',
    },
    other: {
      'app-name': APP_NAME,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="font-sans antialiased tct-body" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
          <FirebaseClientProvider>
            <FirebaseAuthSync />
            <AppShell>
              {children}
            </AppShell>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
