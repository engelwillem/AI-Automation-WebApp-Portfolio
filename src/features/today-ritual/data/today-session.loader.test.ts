import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchBoundaryError } from './fetch-json';
import { loadTodaySessionContent } from './today-session.loader';
import { fetchTodaySessionRaw } from './today-session.source';

vi.mock('./today-session.source', () => ({
  fetchTodaySessionRaw: vi.fn(),
}));

describe('today-session.loader', () => {
  const mockedFetchTodaySessionRaw = vi.mocked(fetchTodaySessionRaw);
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalCi = process.env.CI;
  const originalVercel = process.env.VERCEL;
  const originalVercelEnv = process.env.VERCEL_ENV;

  beforeEach(() => {
    mockedFetchTodaySessionRaw.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:9002';
    delete process.env.CI;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    process.env.CI = originalCi;
    process.env.VERCEL = originalVercel;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it('falls back safely on local source error and emits info diagnostics', async () => {
    mockedFetchTodaySessionRaw.mockRejectedValueOnce(
      new FetchBoundaryError('TIMEOUT', 'Request timed out after 4500ms')
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const content = await loadTodaySessionContent();

    expect(content.openingLine.length).toBeGreaterThan(0);
    expect(infoSpy).toHaveBeenCalledWith(
      '[today] content diagnostics',
      expect.objectContaining({
        sourceStatus: 'fallback_only',
      })
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(mockedFetchTodaySessionRaw).toHaveBeenCalledWith(
      expect.objectContaining({ previewDate: undefined })
    );
  });

  it('keeps warning diagnostics for hosted or parity-sensitive environments', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.thechoosentalks.org';
    process.env.CI = 'true';

    mockedFetchTodaySessionRaw.mockRejectedValueOnce(
      new FetchBoundaryError('TIMEOUT', 'Request timed out after 4500ms')
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await loadTodaySessionContent();

    expect(warnSpy).toHaveBeenCalledWith(
      '[today] content diagnostics',
      expect.objectContaining({
        sourceStatus: 'fallback_only',
      })
    );
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('emits lightweight info diagnostics when running in fallback-only mode', async () => {
    mockedFetchTodaySessionRaw.mockResolvedValueOnce(null);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await loadTodaySessionContent();

    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      '[today] content diagnostics',
      expect.objectContaining({
        sourceStatus: 'fallback_only',
      })
    );
  });

  it('passes previewDate option through to source boundary', async () => {
    mockedFetchTodaySessionRaw.mockResolvedValueOnce(null);

    await loadTodaySessionContent({ previewDate: '2026-03-22' });

    expect(mockedFetchTodaySessionRaw).toHaveBeenCalledWith(
      expect.objectContaining({ previewDate: '2026-03-22' })
    );
  });
});
