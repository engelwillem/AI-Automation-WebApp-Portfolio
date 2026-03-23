
import type {NextConfig} from 'next';

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

function isPrimaryProductionDeployment(): boolean {
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

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'thechoosentalks.org',
          },
        ],
        destination: `${PRIMARY_SITE_URL}/:path*`,
        permanent: true,
      },
      {
        source: '/library',
        destination: '/versehub/id',
        permanent: true,
      },
      {
        source: '/visitors',
        destination: '/community',
        permanent: true,
      },
      {
        source: '/gate-updates',
        destination: '/today',
        permanent: true,
      },
      {
        source: '/reflections/:path*',
        destination: '/community?intent=reflection',
        permanent: true,
      },
    ];
  },
  async headers() {
    if (isPrimaryProductionDeployment()) {
      return [];
    }

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
