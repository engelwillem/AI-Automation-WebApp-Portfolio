const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function getLaravelApiBaseUrl(): string {
  const base = process.env.LARAVEL_API_BASE_URL || process.env.NEXT_PUBLIC_LARAVEL_API_BASE_URL;
  if (!base) {
    throw new Error("Missing Laravel API base URL. Set LARAVEL_API_BASE_URL or NEXT_PUBLIC_LARAVEL_API_BASE_URL.");
  }

  return trimTrailingSlash(base);
}

export async function callLaravelApi(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const target = `${getLaravelApiBaseUrl()}${normalizedPath}`;

  return fetch(target, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
