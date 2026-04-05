/**
 * Laravel API Connectivity Utility
 * 
 * Centralized logic for communicating with the Laravel backend.
 * Uses environment variables to determine the target origin.
 */

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const MISSING_BASE_PLACEHOLDER = "http://missing-laravel-api-base-url.local";
const DEFAULT_PRODUCTION_API_BASE_URL = "https://api.thechoosentalks.org";
const DEFAULT_LOCAL_BASES = ["http://127.0.0.1:8000", "http://localhost:8000"];
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

function extractHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLoopbackBaseUrl(value: string): boolean {
  const hostname = extractHostname(value);
  return hostname ? LOCAL_HOSTS.has(hostname) : false;
}

function isDeveloperMachineContext(): boolean {
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const appHost = appUrl ? extractHostname(appUrl) : null;
  const hasLocalAppUrl = appHost ? LOCAL_HOSTS.has(appHost) : true;
  const isHostedEnvironment =
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV !== undefined ||
    process.env.CI === "true";

  return hasLocalAppUrl && !isHostedEnvironment;
}

export function isExpectedLocalLoopbackBackend(baseUrl: string): boolean {
  return isLoopbackBaseUrl(baseUrl) && isDeveloperMachineContext();
}

function pickConfiguredBaseUrl(): string {
  const candidates = [
    process.env.LARAVEL_API_BASE_URL,
    process.env.NEXT_PUBLIC_LARAVEL_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (candidates.length > 0) {
    return trimTrailingSlash(candidates[0]);
  }

  // Tencent Edge runtime can miss non-public env injections.
  // For production, fallback to the known Laravel API origin.
  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  return MISSING_BASE_PLACEHOLDER;
}

function buildCandidateBaseUrls(): string[] {
  const explicitCandidates = [
    process.env.LARAVEL_API_BASE_URL,
    process.env.NEXT_PUBLIC_LARAVEL_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map(trimTrailingSlash);

  if (explicitCandidates.length > 0) {
    const merged = [...explicitCandidates];
    const needsLocalLoopbackFallback = explicitCandidates.some((candidate) =>
      DEFAULT_LOCAL_BASES.some((localBase) => candidate.includes(new URL(localBase).hostname))
    );

    if (process.env.NODE_ENV !== "production" || needsLocalLoopbackFallback) {
      for (const localBase of DEFAULT_LOCAL_BASES) {
        if (!merged.includes(localBase)) {
          merged.push(localBase);
        }
      }
    }
    return merged;
  }

  if (process.env.NODE_ENV === "production") {
    return [DEFAULT_PRODUCTION_API_BASE_URL];
  }

  return [...DEFAULT_LOCAL_BASES];
}

/**
 * Safely retrieves the Laravel API base URL.
 * Does not throw during module initialization to prevent SSR crashes.
 */
export function getLaravelApiBaseUrl(): string {
  return pickConfiguredBaseUrl();
}

/**
 * Internal helper to check if the base URL is valid.
 */
export function isBaseUrlConfigured(): boolean {
  const candidates = buildCandidateBaseUrls();
  return candidates.length > 0 && !candidates[0].includes("missing-laravel-api-base-url");
}

/**
 * Standardized fetch wrapper for Laravel API calls.
 */
export async function callLaravelApi(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseCandidates = buildCandidateBaseUrls();

  let lastError: unknown = null;
  for (const baseUrl of baseCandidates) {
    const target = `${baseUrl}${normalizedPath}`;
    const targetPathname = (() => {
      try {
        return new URL(target).pathname;
      } catch {
        return normalizedPath;
      }
    })();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const fetchOptions = {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    };

    console.info("[laravel-api] request", {
      method: fetchOptions.method || "GET",
      targetPath: targetPathname,
      hasBody: Boolean(fetchOptions.body),
      baseUrl,
    });

    try {
      return await fetch(target, fetchOptions as any);
    } catch (error) {
      lastError = error;
      const isLast = baseUrl === baseCandidates[baseCandidates.length - 1];
      const logMethod = isExpectedLocalLoopbackBackend(baseUrl) ? console.info : console.warn;
      logMethod("[laravel-api] request_failed", {
        baseUrl,
        targetPath: targetPathname,
        isLastCandidate: isLast,
        expectedLocalFallback: isExpectedLocalLoopbackBackend(baseUrl),
      });
      if (isLast) {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw (lastError instanceof Error ? lastError : new Error("Laravel API unreachable"));
}
