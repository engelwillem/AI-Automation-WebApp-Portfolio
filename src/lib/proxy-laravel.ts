import { NextRequest, NextResponse } from "next/server";
import { callLaravelApi } from "@/lib/laravel-api";

/**
 * Proksi permintaan dari Next.js ke Laravel API.
 * Versi P0 (Hardened): Menjamin integritas data biner (upload) dan fleksibilitas response (JSON/HTML).
 */
export async function proxyLaravel(request: NextRequest, targetPath: string): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type");
    const authorization = request.headers.get("authorization");
    
    const hasBody = !["GET", "HEAD"].includes(request.method);
    
    let body: Uint8Array | undefined = undefined;
    if (hasBody) {
      try {
        // Menggunakan arrayBuffer() menjamin boundary multipart/form-data tidak rusak
        const buffer = await request.arrayBuffer();
        body = new Uint8Array(buffer);
      } catch (e) {
        // Body mungkin kosong atau tidak valid
      }
    }

    const response = await callLaravelApi(targetPath, {
      method: request.method,
      body,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    // Ambil sebagai text agar aman meskipun Laravel mengembalikan HTML error (500/404)
    const payload = await response.text();

    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json(
      {
        message: "Laravel API is currently unreachable.",
        detail: error instanceof Error ? error.message : "Unknown connectivity error",
      },
      { status: 503 },
    );
  }
}
