export function isAuthSurfacePath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password";
}

export function isLandingPath(pathname: string): boolean {
  return pathname === "/";
}

export function isTodayRitualPath(pathname: string): boolean {
  return pathname === "/today" || pathname === "/renungan";
}

export function isVersehubPath(pathname: string): boolean {
  return pathname === "/versehub" || pathname.startsWith("/versehub/");
}

export function isSanctuaryPath(pathname: string): boolean {
  return isTodayRitualPath(pathname) || isVersehubPath(pathname);
}

const TCT_APP_NAVIGATION_PREFIXES = [
  "/community",
  "/reflections",
  "/renungan",
  "/today",
  "/versehub",
  "/profile",
  "/inbox",
  "/channels",
] as const;

export function isTctAppNavigationPath(pathname: string): boolean {
  return TCT_APP_NAVIGATION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function requiresAppSession(pathname: string): boolean {
  if (isLandingPath(pathname)) return false;
  if (isAuthSurfacePath(pathname)) return false;
  if (pathname.startsWith("/legal")) return false;
  if (pathname === "/library" || pathname === "/visitors" || pathname === "/gate-updates") return false;
  return true;
}
