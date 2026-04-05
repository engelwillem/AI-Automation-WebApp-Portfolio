import { callLaravelApi, getLaravelApiBaseUrl, isExpectedLocalLoopbackBackend } from '@/lib/laravel-api';
import { FetchBoundaryError, fetchJsonObjectWithTimeout } from './fetch-json';
import type { TodaySessionApiPayloadV1 } from './today-session.contract';

export type RawTodaySessionPayload = TodaySessionApiPayloadV1;
export type FetchTodaySessionRawOptions = {
  previewDate?: string | null;
  forwardedHeaders?: HeadersInit;
};

export function isTodaySessionUsingExpectedLocalFallback(): boolean {
  return isExpectedLocalLoopbackBackend(getLaravelApiBaseUrl());
}

function normalizePreviewDate(previewDate?: string | null): string | null {
  if (!previewDate) return null;
  const trimmed = previewDate.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function resolveTodaySessionEndpoint(): string | null {
  const explicitEndpoint = process.env.TODAY_SESSION_ENDPOINT?.trim();
  if (explicitEndpoint) {
    return explicitEndpoint;
  }

  return null;
}

function hasAuthForwardingHeaders(headers?: HeadersInit): boolean {
  if (!headers) return false;

  const normalized = new Headers(headers);
  return normalized.has('authorization') || normalized.has('cookie');
}

function appendPreviewDate(endpoint: string, previewDate: string): string {
  const [base, hash] = endpoint.split('#', 2);
  const separator = base.includes('?') ? '&' : '?';
  const withQuery = `${base}${separator}previewDate=${encodeURIComponent(previewDate)}`;

  return hash ? `${withQuery}#${hash}` : withQuery;
}

function appendPreviewDateToPath(path: string, previewDate: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}previewDate=${encodeURIComponent(previewDate)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fetchTodaySessionFromLaravelPath(
  path: string,
  forwardedHeaders?: HeadersInit
): Promise<RawTodaySessionPayload> {
  let response: Response;

  try {
    response = await callLaravelApi(path, {
      method: 'GET',
      headers: forwardedHeaders,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new FetchBoundaryError('TIMEOUT', 'Request timed out while connecting to Laravel API');
    }
    throw new FetchBoundaryError('NETWORK_ERROR', 'Network request failed');
  }

  if (!response.ok) {
    throw new FetchBoundaryError('NON_200_RESPONSE', `External source responded with ${response.status}`, response.status);
  }

  const rawText = await response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new FetchBoundaryError('INVALID_JSON', 'Response body is not valid JSON');
  }

  if (!isRecord(parsed)) {
    throw new FetchBoundaryError('INVALID_PAYLOAD_SHAPE', 'Payload must be a JSON object');
  }

  return parsed as RawTodaySessionPayload;
}

export async function fetchTodaySessionRaw(
  options: FetchTodaySessionRawOptions = {}
): Promise<RawTodaySessionPayload | null> {
  const explicitEndpoint = resolveTodaySessionEndpoint();
  const timeoutMs = Number(process.env.TODAY_SESSION_TIMEOUT_MS ?? 4500);
  const revalidateSeconds = Number(process.env.TODAY_SESSION_REVALIDATE_SECONDS ?? 300);

  const previewDate = normalizePreviewDate(options.previewDate);

  if (!explicitEndpoint) {
    const path = previewDate ? appendPreviewDateToPath('/api/today/session', previewDate) : '/api/today/session';
    return fetchTodaySessionFromLaravelPath(path, options.forwardedHeaders);
  }

  const url = previewDate ? appendPreviewDate(explicitEndpoint, previewDate) : explicitEndpoint;

  const payload = await fetchJsonObjectWithTimeout(url, {
    headers: options.forwardedHeaders,
    cache: hasAuthForwardingHeaders(options.forwardedHeaders) ? 'no-store' : undefined,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 4500,
    revalidateSeconds: Number.isFinite(revalidateSeconds) ? revalidateSeconds : 300,
  });

  return payload as RawTodaySessionPayload;
}
