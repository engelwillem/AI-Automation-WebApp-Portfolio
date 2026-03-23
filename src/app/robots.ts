import type { MetadataRoute } from 'next';
import { getPrimarySiteUrl, isPrimaryProductionDeployment } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPrimarySiteUrl();

  if (!isPrimaryProductionDeployment()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      host: siteUrl,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/login', '/register', '/forgot-password', '/reset-password', '/profile', '/inbox'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
