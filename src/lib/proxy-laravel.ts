"use server";

import { NextRequest, NextResponse } from "next/server";
import { callLaravelApi } from "@/lib/laravel-api";

export async function proxyLaravel(request: NextRequest, targetPath: string): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type");
    const authorization = request.headers.get("authorization");
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

    const response = await callLaravelApi(targetPath, {
      method: request.method,
      body,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      },
    });

    const payload = await response.text();

    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Unable to reach Laravel API.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
