
'use client';

import React, { useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig, hasFirebaseClientConfig } from './config';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  if (!hasFirebaseClientConfig) {
    return <>{children}</>;
  }

  const services = useMemo(() => {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);
    const auth = getAuth(app);
    return { app, db, auth };
  }, []);

  return (
    <FirebaseProvider app={services.app} db={services.db} auth={services.auth}>
      {children}
    </FirebaseProvider>
  );
}
