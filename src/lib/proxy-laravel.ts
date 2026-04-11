import { NextRequest, NextResponse } from "next/server";
import { callLaravelApi, isBaseUrlConfigured } from "@/lib/laravel-api";

const APP_SESSION_COOKIE = "tct_app_session";
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

type ProxyLaravelOptions = {
  sessionCookieAction?: "set-from-token" | "clear" | "none";
};

function isLikelySanctumToken(token: string): boolean {
  return /^\d+\|[A-Za-z0-9]+$/.test(token);
}

function readSessionTokenFromCookie(request: NextRequest): string | null {
  const raw = request.cookies.get(APP_SESSION_COOKIE)?.value?.trim();
  if (!raw || !isLikelySanctumToken(raw)) return null;
  return raw;
}

function decodeRequestJson(body?: ArrayBuffer, contentType?: string | null): Record<string, unknown> | null {
  if (!body || !contentType?.includes("application/json")) return null;

  try {
    const text = Buffer.from(body).toString("utf8");
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function extractResponseToken(responseBody: ArrayBuffer | null, contentType?: string | null): string | null {
  if (!responseBody || !contentType?.includes("application/json")) return null;

  try {
    const text = Buffer.from(responseBody).toString("utf8");
    const parsed = JSON.parse(text) as { data?: { token?: unknown } } | null;
    const token = typeof parsed?.data?.token === "string" ? parsed.data.token.trim() : "";
    return isLikelySanctumToken(token) ? token : null;
  } catch {
    return null;
  }
}

function shouldPersistSession(requestBodyJson: Record<string, unknown> | null): boolean {
  if (!requestBodyJson) return false;
  if (requestBodyJson.remember === true) return true;
  return requestBodyJson.persistence === "local";
}

function applySessionCookies(
  response: NextResponse,
  token: string,
  persistent: boolean,
  secure: boolean
): void {
  const baseCookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    ...(persistent ? { maxAge: THIRTY_DAYS_IN_SECONDS } : {}),
  };

  response.cookies.set(APP_SESSION_COOKIE, token, baseCookie);
}

function clearSessionCookies(response: NextResponse, secure: boolean): void {
  const clearCookie = {
    expires: new Date(0),
    maxAge: 0,
    sameSite: "lax" as const,
    path: "/",
    secure,
  };

  response.cookies.set(APP_SESSION_COOKIE, "", { ...clearCookie, httpOnly: true });
}

/**
 * Hardened Binary-Safe Proxy: Forwards requests from Next.js to Laravel API.
 * Ensures data integrity for file uploads and handles
 * unreachable backend states gracefully without throwing 500 errors.
 */
export async function proxyLaravel(
  request: NextRequest,
  targetPath: string,
  options: ProxyLaravelOptions = {}
): Promise<NextResponse> {
  // 1. Guard against missing configuration
  if (!isBaseUrlConfigured()) {
    console.warn("Proxy Warning: LARAVEL_API_BASE_URL is not configured.");
    return NextResponse.json(
      { 
        message: "Backend configuration missing.",
        detail: "Set LARAVEL_API_BASE_URL in your environment variables." 
      },
      { status: 503 }
    );
  }

  try {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const requestUrl = new URL(request.url);
    const targetPathname = targetPath.split("?")[0] || targetPath;
    const secureCookies = requestUrl.protocol === "https:" || process.env.NODE_ENV === "production";

    const contentType = request.headers.get("content-type");
    const authorization = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    const upstreamRequestId = request.headers.get("x-request-id");
    const sessionCookieToken = !authorization ? readSessionTokenFromCookie(request) : null;
    const xsrfToken = request.headers.get("x-xsrf-token") || request.headers.get("X-XSRF-TOKEN");
    const accept = request.headers.get("accept");

    console.info("[proxy-laravel] request", {
      requestId,
      method: request.method,
      sourcePath: requestUrl.pathname,
      targetPath: targetPathname,
      hasAuth: Boolean(authorization),
      hasSessionCookieAuth: Boolean(sessionCookieToken),
      hasCookie: Boolean(cookie),
      hasXsrf: Boolean(xsrfToken),
    });
    
    // We only read the body for methods that typically have one
    const hasBody = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    
    let body: ArrayBuffer | undefined = undefined;
    if (hasBody) {
      try {
        body = await request.arrayBuffer();
      } catch (e) {
        // Body might be empty or unreadable
      }
    }
    const requestBodyJson = decodeRequestJson(body, contentType);

    // Append query strings from the original Next.js request if they exist
    const url = new URL(request.url);
    const queryString = url.search;
    let finalPath = targetPath;
    if (queryString) {
      finalPath = targetPath.includes("?") 
        ? `${targetPath}&${queryString.substring(1)}` 
        : `${targetPath}${queryString}`;
    }

    // 2. Forward request to Laravel
    const response = await callLaravelApi(finalPath, {
      method: request.method,
      body,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
        ...(!authorization && sessionCookieToken ? { Authorization: `Bearer ${sessionCookieToken}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(upstreamRequestId ? { "X-Request-Id": upstreamRequestId } : {}),
        ...(xsrfToken ? { "X-XSRF-TOKEN": xsrfToken } : {}),
        ...(accept ? { Accept: accept } : { Accept: "application/json" }),
      },
    });

    console.info("[proxy-laravel] response", {
      requestId,
      method: request.method,
      targetPath: targetPathname,
      status: response.status,
    });

    // 3. Clone headers for the proxy response
    const responseHeaders = new Headers();
    const headersToForward = [
      "content-type",
      "x-auth",
      "cache-control",
      "content-disposition",
      "x-request-id",
      "x-renungan-request-id",
      "x-renungan-pipeline-version",
    ];
    
    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) responseHeaders.set(header, value);
    });

    // Handle multiple Set-Cookie headers properly using getSetCookie()
    if (typeof response.headers.getSetCookie === "function") {
      const cookies = response.headers.getSetCookie();
      cookies.forEach(c => responseHeaders.append("set-cookie", c));
    } else {
      const cookieValue = response.headers.get("set-cookie");
      if (cookieValue) responseHeaders.set("set-cookie", cookieValue);
    }

    const isBodylessStatus = [204, 205, 304].includes(response.status);

    // Ensure we always have a content-type for body-carrying responses only.
    if (!isBodylessStatus && !responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "application/json");
    }

    // Buffer the upstream payload before returning it.
    // Some edge runtimes are brittle when piping the original ReadableStream directly.
    const responseBody =
      request.method === "HEAD" || isBodylessStatus ? null : await response.arrayBuffer();

    const nextResponse = new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });

    if (response.status === 401 && sessionCookieToken && !authorization) {
      clearSessionCookies(nextResponse, secureCookies);
    }

    if (options.sessionCookieAction === "clear") {
      clearSessionCookies(nextResponse, secureCookies);
    }

    if (options.sessionCookieAction === "set-from-token") {
      const responseToken = extractResponseToken(responseBody, responseHeaders.get("content-type"));
      if (responseToken) {
        applySessionCookies(nextResponse, responseToken, shouldPersistSession(requestBodyJson), secureCookies);
      }
    }

    return nextResponse;

  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const requestId = request.headers.get("x-request-id") || "unknown";
    console.error("[proxy-laravel] error", {
      requestId,
      method: request.method,
      targetPath: targetPath.split("?")[0] || targetPath,
      type: isAbort ? "timeout" : "proxy_error",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    
    return NextResponse.json(
      {
        message: "Laravel API is currently unreachable or timed out.",
        detail: error instanceof Error ? error.message : "Unknown connectivity error",
      },
      { status: 503 }
    );
  }
}
