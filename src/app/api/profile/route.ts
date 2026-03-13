import { NextRequest } from "next/server";
import { proxyLaravel } from "@/lib/proxy-laravel";

/**
 * GET Profile Data
 */
export async function GET(request: NextRequest) {
  return proxyLaravel(request, "/api/v1/profile");
}

/**
 * POST Profile Update (Supports Multipart Avatar Upload)
 * Laravel uses POST + _method: PATCH for file uploads.
 */
export async function POST(request: NextRequest) {
  return proxyLaravel(request, "/api/v1/profile");
}

/**
 * PATCH Profile Data
 */
export async function PATCH(request: NextRequest) {
  return proxyLaravel(request, "/api/v1/profile");
}

/**
 * PUT Profile Data (Password Update)
 */
export async function PUT(request: NextRequest) {
  return proxyLaravel(request, "/api/v1/profile");
}

/**
 * DELETE Account
 */
export async function DELETE(request: NextRequest) {
  return proxyLaravel(request, "/api/v1/profile");
}
