import type { MetadataRoute } from 'next';
import { getPrimarySiteUrl, isPrimaryProductionDeployment } from '@/lib/seo';

const INDEXABLE_ROUTES = ['/', '/today', '/versehub/id', '/community'];

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isPrimaryProductionDeployment()) {
    return [];
  }

  const siteUrl = getPrimarySiteUrl();
  const lastModified = new Date();

  return INDEXABLE_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === '/' ? 'weekly' : 'daily',
    priority: route === '/' ? 1 : 0.8,
  }));
}
