"use client";

import { useEffect } from "react";
import { getApps } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { clearAppAccessToken, setAppAccessToken } from "@/services/app-auth-token";

export function FirebaseAuthSync() {
  useEffect(() => {
    if (getApps().length === 0) return;

    const auth = getAuth(getApps()[0]);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        clearAppAccessToken();
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/auth/firebase/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        });

        if (!response.ok) return;

        const payload = await response.json();
        const token = payload?.data?.token;
        if (typeof token === "string" && token.length > 0) {
          setAppAccessToken(token);
        }
      } catch {
        // Keep app usable even when backend sync is unreachable.
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
