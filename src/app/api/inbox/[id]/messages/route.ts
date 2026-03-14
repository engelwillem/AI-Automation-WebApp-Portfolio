import { NextRequest } from "next/server";
    import { proxyLaravel } from "@/lib/proxy-laravel";
    
    interface RouteContext {
      params: Promise<{ id: string }>;
    }
    
    /**
     * Consolidated Inbox Messages Proxy
     * Standardized on [id] to resolve Next.js dynamic routing conflicts.
     */
    export async function GET(request: NextRequest, { params }: RouteContext) {
      const { id } = await params;
      const search = request.nextUrl.search;
      return proxyLaravel(request, `/api/v1/inbox/${id}/messages${search}`);
    }
    