import { NextRequest, NextResponse } from "next/server";
import { callLaravelApi } from "@/lib/laravel-api";

const APP_SESSION_COOKIE = "tct_app_session";
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

function isLikelySanctumToken(token: string): boolean {
  return /^\d+\|[A-Za-z0-9]+$/.test(token);
}

function readCookieToken(request: NextRequest): string | null {
  const raw = request.cookies.get(APP_SESSION_COOKIE)?.value?.trim();
  if (!raw || !isLikelySanctumToken(raw)) return null;
  return raw;
}

function readBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return isLikelySanctumToken(token) ? token : null;
}

function shouldPersistSession(request: NextRequest): boolean {
  const raw = request.nextUrl.searchParams.get("persistence");
  return raw === "local";
}

function clearAppSessionCookie(response: NextResponse, request: NextRequest): void {
  response.cookies.set(APP_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    secure: request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production",
  });
}

export async function GET(request: NextRequest) {
  const cookieToken = readCookieToken(request);
  const bearerToken = readBearerToken(request);
  const hasTokenMismatch = Boolean(cookieToken && bearerToken && cookieToken !== bearerToken);
  const token = bearerToken ?? cookieToken;

  if (!token) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  try {
    const upstream = await callLaravelApi("/api/v1/profile", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (upstream.status === 401 || upstream.status === 403) {
      const response = NextResponse.json({
        authenticated: false,
        user: null,
      }, { status: 200 });
      clearAppSessionCookie(response, request);
      return response;
    }

    const payload = await upstream.json().catch(() => null) as {
      data?: {
        user?: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
        };
        twoFactor?: {
          enabled?: boolean;
          recoveryCodesRemaining?: number;
        };
      };
    } | null;

    const user = payload?.data?.user;
    if (!upstream.ok || !user) {
      const response = NextResponse.json({
        authenticated: false,
        user: null,
      }, { status: 200 });

      if (hasTokenMismatch) {
        clearAppSessionCookie(response, request);
      }

      return response;
    }

    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: String(user.id ?? ""),
        name: String(user.name ?? ""),
        email: String(user.email ?? ""),
        avatarUrl: typeof user.avatar_url === "string" ? user.avatar_url : null,
      },
      twoFactor: payload?.data?.twoFactor ?? null,
    });

    if (bearerToken && (hasTokenMismatch || !cookieToken)) {
      response.cookies.set(APP_SESSION_COOKIE, bearerToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production",
        ...(shouldPersistSession(request) ? { maxAge: THIRTY_DAYS_IN_SECONDS } : {}),
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        message: error instanceof Error ? error.message : "Session introspection failed.",
      },
      { status: 503 }
    );
  }
}
