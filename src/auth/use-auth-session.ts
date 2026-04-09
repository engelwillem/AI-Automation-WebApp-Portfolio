"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/firebase/auth/use-user";
import {
  APP_AUTH_STATE_EVENT,
  clearAppAccessToken,
  getAppAuthUser,
  hasAppAccessToken,
  setAppAuthUser,
} from "@/services/app-auth-token";
import { buildAppAuthHeaders } from "@/lib/app-auth-fetch";

export type AuthSessionStatus = "restoring" | "guest" | "authenticated";

type ServerSessionState = {
  status: "loading" | "ready";
  authenticated: boolean;
  user: {
    id?: string;
    name?: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
};

function buildInitial(name: string | null | undefined, fallback: string): string {
  const trimmed = String(name || "").trim();
  if (!trimmed) return fallback;
  const firstLetter = trimmed.match(/\p{L}/u)?.[0];
  return firstLetter ? firstLetter.toUpperCase() : fallback;
}

function deriveDisplayName(name: string | null, email: string | null): string | null {
  if (name) return name;
  const emailLocalPart = String(email || "").split("@")[0]?.trim() || "";
  return emailLocalPart || null;
}

export function useAuthSession() {
  const { user, status: firebaseStatus } = useUser();
  const [authStorageVersion, setAuthStorageVersion] = useState(0);
  const hasToken = hasAppAccessToken();
  const authUser = getAppAuthUser();
  const hasAuthenticatedFirebaseUser = firebaseStatus === "authenticated" && !user?.isAnonymous;
  const isAwaitingFirebaseToken = hasAuthenticatedFirebaseUser && !hasToken;
  const [serverSession, setServerSession] = useState<ServerSessionState>({
    status: "loading",
    authenticated: false,
    user: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const notify = () => setAuthStorageVersion((prev) => prev + 1);
    window.addEventListener("storage", notify);
    window.addEventListener(APP_AUTH_STATE_EVENT, notify as EventListener);

    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener(APP_AUTH_STATE_EVENT, notify as EventListener);
    };
  }, []);

  useEffect(() => {
    if (firebaseStatus === "restoring") return;

    let isActive = true;
    const controller = new AbortController();

    const hydrateSession = async () => {
      setServerSession((prev) => ({ ...prev, status: "loading" }));

      try {
        const persistence = typeof window !== "undefined"
          ? window.localStorage.getItem("tct_app_auth_persistence") || window.sessionStorage.getItem("tct_app_auth_persistence") || "session"
          : "session";

        const response = await fetch(`/api/auth/session?persistence=${encodeURIComponent(persistence)}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: buildAppAuthHeaders({
            includeBearerFallback: true,
          }),
        });

        const payload = await response.json().catch(() => null) as {
          authenticated?: boolean;
          user?: {
            id?: string;
            name?: string;
            email?: string;
            avatarUrl?: string | null;
          } | null;
        } | null;

        if (!isActive) return;

        if (!response.ok) {
          setServerSession({
            status: "ready",
            authenticated: false,
            user: null,
          });
          return;
        }

        if (payload?.authenticated && payload.user) {
          setAppAuthUser({
            id: payload.user.id,
            name: payload.user.name,
            email: payload.user.email,
            avatarUrl: payload.user.avatarUrl ?? null,
          });
          setServerSession({
            status: "ready",
            authenticated: true,
            user: payload.user,
          });
          return;
        }

        if (response.status === 200) {
          clearAppAccessToken();
        }
        setServerSession({
          status: "ready",
          authenticated: false,
          user: null,
        });
      } catch {
        if (!isActive) return;
        setServerSession({
          status: "ready",
          authenticated: false,
          user: null,
        });
      }
    };

    void hydrateSession();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [authStorageVersion, firebaseStatus, hasAuthenticatedFirebaseUser, hasToken]);

  const status: AuthSessionStatus = useMemo(() => {
    if (firebaseStatus === "restoring") return "restoring";
    if (serverSession.status === "loading") return "restoring";
    if (isAwaitingFirebaseToken) return "restoring";
    if (hasAuthenticatedFirebaseUser) return "authenticated";
    return serverSession.authenticated ? "authenticated" : "guest";
  }, [firebaseStatus, hasAuthenticatedFirebaseUser, isAwaitingFirebaseToken, serverSession.authenticated, serverSession.status]);

  const profileName = user?.displayName?.trim() || serverSession.user?.name?.trim() || authUser?.name?.trim() || null;
  const profileEmail = user?.email?.trim() || serverSession.user?.email?.trim() || authUser?.email?.trim() || null;
  const profileId = serverSession.user?.id?.trim() || authUser?.id?.trim() || null;
  const avatarUrl = user?.photoURL?.trim() || serverSession.user?.avatarUrl?.trim() || authUser?.avatarUrl?.trim() || null;
  const displayName = deriveDisplayName(profileName, profileEmail);

  const identity = useMemo(() => {
    if (status === "authenticated") {
      const name = displayName || "Member";
      return {
        name,
        email: profileEmail || "",
        avatarUrl,
        initial: buildInitial(name, "M"),
        isGuest: false,
      } as const;
    }

    return {
      name: "Guest",
      email: "",
      avatarUrl: null,
      initial: "G",
      isGuest: true,
    } as const;
  }, [status, displayName, profileEmail, avatarUrl]);

  return {
    status,
    isRestoring: status === "restoring",
    isGuest: status === "guest",
    isAuthenticated: status === "authenticated",
    user,
    profileName,
    profileEmail,
    profileId,
    avatarUrl,
    identity,
  } as const;
}
