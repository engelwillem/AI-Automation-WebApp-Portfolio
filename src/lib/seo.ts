const PRIMARY_HOST = 'www.thechoosentalks.org';
const PRIMARY_SITE_URL = `https://${PRIMARY_HOST}`;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function normalizeHost(value?: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return value
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .toLowerCase();
  }
}

export function getPrimarySiteUrl(): string {
  return PRIMARY_SITE_URL;
}

export function isPrimaryProductionDeployment(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  const vercelEnv = process.env.VERCEL_ENV?.toLowerCase();
  if (vercelEnv && vercelEnv !== 'production') {
    return false;
  }

  const configuredHost =
    normalizeHost(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeHost(process.env.VERCEL_URL);

  if (!configuredHost) {
    return true;
  }

  if (LOCAL_HOSTS.has(configuredHost)) {
    return true;
  }

  return configuredHost === PRIMARY_HOST;
}
