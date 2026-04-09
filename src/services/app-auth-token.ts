const APP_ACCESS_TOKEN_KEY = "tct_app_access_token";
const APP_AUTH_SOURCE_KEY = "tct_app_auth_source";
const APP_AUTH_USER_KEY = "tct_app_auth_user";
const APP_AUTH_PERSISTENCE_KEY = "tct_app_auth_persistence";
const LEGACY_COMMUNITY_FEED_CACHE_KEY = "tct.community.feed.cache.v1";
const COMMUNITY_FEED_CACHE_PREFIX = "tct.community.feed.cache.";
const VERSEHUB_AUTO_OPEN_KEY = "tct:versehub:auto-open";
export const APP_AUTH_STATE_EVENT = "tct:app-auth-state-changed";

export type AppAuthSource = "firebase" | "password" | "unknown";
export type AppAuthPersistence = "session" | "local";
export type AppAuthUser = {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
};

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isLikelySanctumToken(token: string): boolean {
  // Laravel Sanctum plain text token format: "{id}|{secret}"
  return /^\d+\|[A-Za-z0-9]+$/.test(token);
}

function isLocalDevRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function getSessionStorage(): BrowserStorage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function getLocalStorage(): BrowserStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function getPersistenceOrder(): Array<{ persistence: AppAuthPersistence; storage: BrowserStorage | null }> {
  return [
    { persistence: "session", storage: getSessionStorage() },
    { persistence: "local", storage: getLocalStorage() },
  ];
}

function removeKeyFromAllStorages(key: string): void {
  for (const entry of getPersistenceOrder()) {
    entry.storage?.removeItem(key);
  }
}

function clearIdentityScopedClientCaches(): void {
  if (typeof window === "undefined") return;

  const storages: Storage[] = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    storage.removeItem(LEGACY_COMMUNITY_FEED_CACHE_KEY);
    storage.removeItem(VERSEHUB_AUTO_OPEN_KEY);

    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (!key) continue;
      if (key.startsWith(COMMUNITY_FEED_CACHE_PREFIX)) {
        storage.removeItem(key);
      }
    }
  }
}

function emitAuthStateChanged(reason: "token" | "user" | "clear"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APP_AUTH_STATE_EVENT, { detail: { reason } }));
}

function normalizePersistence(raw: string | null | undefined): AppAuthPersistence | null {
  return raw === "session" || raw === "local" ? raw : null;
}

function getPreferredPersistence(): AppAuthPersistence {
  for (const entry of getPersistenceOrder()) {
    const value = normalizePersistence(entry.storage?.getItem(APP_AUTH_PERSISTENCE_KEY));
    if (value) return value;
  }

  return "session";
}

function getStorageForPersistence(persistence: AppAuthPersistence): BrowserStorage | null {
  return persistence === "local" ? getLocalStorage() : getSessionStorage();
}

export function getAppAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const bypass = window.localStorage.getItem("e2e_bypass_token");
  if ((process.env.NODE_ENV === "test" || isLocalDevRuntime()) && bypass && bypass.trim().length > 0) {
    return bypass.trim();
  }

  for (const entry of getPersistenceOrder()) {
    const raw = entry.storage?.getItem(APP_ACCESS_TOKEN_KEY);
    if (!raw) continue;

    const token = raw.trim();
    if (!token || token === "null" || token === "undefined") {
      entry.storage?.removeItem(APP_ACCESS_TOKEN_KEY);
      continue;
    }

    if (!isLikelySanctumToken(token)) {
      entry.storage?.removeItem(APP_ACCESS_TOKEN_KEY);
      continue;
    }

    return token;
  }

  return null;
}

export function hasAppAccessToken(): boolean {
  return Boolean(getAppAccessToken());
}

export function shouldInvalidateLocalSession(status: number): boolean {
  return status === 401;
}

export function getAppAuthSource(): AppAuthSource {
  for (const entry of getPersistenceOrder()) {
    const raw = entry.storage?.getItem(APP_AUTH_SOURCE_KEY);
    if (raw === "firebase" || raw === "password") return raw;
  }
  return "unknown";
}

export function getAppAuthUser(): AppAuthUser | null {
  if (typeof window === "undefined") return null;

  for (const entry of getPersistenceOrder()) {
    const raw = entry.storage?.getItem(APP_AUTH_USER_KEY);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as AppAuthUser;
      if (!parsed || typeof parsed !== "object") {
        entry.storage?.removeItem(APP_AUTH_USER_KEY);
        continue;
      }
      return parsed;
    } catch {
      entry.storage?.removeItem(APP_AUTH_USER_KEY);
    }
  }

  return null;
}

export function hasAppAuthenticatedSession(): boolean {
  return Boolean(getAppAccessToken() || getAppAuthUser());
}

export function setAppAuthUser(user: AppAuthUser, persistence?: AppAuthPersistence): void {
  if (typeof window === "undefined") return;
  const normalized: AppAuthUser = {
    id: typeof user.id === "string" ? user.id : undefined,
    name: typeof user.name === "string" ? user.name : undefined,
    email: typeof user.email === "string" ? user.email : undefined,
    avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : null,
  };
  const targetPersistence = persistence ?? getPreferredPersistence();
  const targetStorage = getStorageForPersistence(targetPersistence);
  if (!targetStorage) return;

  removeKeyFromAllStorages(APP_AUTH_USER_KEY);
  targetStorage.setItem(APP_AUTH_USER_KEY, JSON.stringify(normalized));
  emitAuthStateChanged("user");
}

export function setAppAccessToken(
  token: string,
  source: AppAuthSource = "unknown",
  persistence: AppAuthPersistence = "session"
): void {
  if (typeof window === "undefined") return;
  const clean = token.trim();
  if (!clean) return;

  const targetStorage = getStorageForPersistence(persistence);
  if (!targetStorage) return;

  removeKeyFromAllStorages(APP_ACCESS_TOKEN_KEY);
  removeKeyFromAllStorages(APP_AUTH_SOURCE_KEY);
  removeKeyFromAllStorages(APP_AUTH_USER_KEY);
  removeKeyFromAllStorages(APP_AUTH_PERSISTENCE_KEY);
  clearIdentityScopedClientCaches();

  const sessionStorage = getSessionStorage();
  sessionStorage?.setItem(APP_ACCESS_TOKEN_KEY, clean);
  targetStorage.setItem(APP_AUTH_SOURCE_KEY, source);
  targetStorage.setItem(APP_AUTH_PERSISTENCE_KEY, persistence);
  emitAuthStateChanged("token");
}

export function clearAppAccessToken(): void {
  if (typeof window === "undefined") return;
  removeKeyFromAllStorages(APP_ACCESS_TOKEN_KEY);
  removeKeyFromAllStorages(APP_AUTH_SOURCE_KEY);
  removeKeyFromAllStorages(APP_AUTH_USER_KEY);
  removeKeyFromAllStorages(APP_AUTH_PERSISTENCE_KEY);
  clearIdentityScopedClientCaches();
  emitAuthStateChanged("clear");
}
