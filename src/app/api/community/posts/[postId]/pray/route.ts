import { NextRequest } from "next/server";
import { proxyLaravel } from "@/lib/proxy-laravel";

interface RouteContext {
  params: { postId: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { postId } = context.params;
  return proxyLaravel(request, `/api/v1/community/posts/${postId}/pray`);
}
