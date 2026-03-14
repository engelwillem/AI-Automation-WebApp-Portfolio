
import { NextRequest } from "next/server";
import { proxyLaravel } from "@/lib/proxy-laravel";

interface RouteContext {
  params: Promise<{ lang: string; slug: string }>;
}

/**
 * Consolidated Verse/Chapter Proxy
 * Standardized on [slug] to prevent dynamic parameter conflicts ('id' !== 'slug').
 * This handles both specific verse references (e.g., yoh-3-16) and chapter requests.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { lang, slug } = await params;
  const search = request.nextUrl.search;
  
  const segments = slug.split(/[-_.]/);
  
  // Distinguish between Chapter Reader (e.g., yoh-3) and Verse Share (e.g., yoh-3-16)
  if (segments.length < 3) {
    // If it's a chapter request, use the specialized chapter endpoint
    return proxyLaravel(request, `/api/v1/versehub/${lang}/chapter/${slug}${search}`);
  }

  // Otherwise, it's a specific verse share/detail request
  return proxyLaravel(request, `/api/v1/versehub/${lang}/${slug}${search}`);
}
