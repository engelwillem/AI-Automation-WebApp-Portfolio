/**
 * share-assets.ts
 *
 * Client helpers for calling backend share-asset prepare endpoints.
 *
 * Rules:
 *  - These are called on USER INTENT (share click) — never from OG routes
 *  - Always return a usable result even on failure (graceful degradation)
 *  - Share URLs returned are versioned via ?v=<revision>
 */

export type ShareAssetResult = {
  status: 'ready' | 'pending' | 'failed';
  revision: string;
  assetId: number | null;
  shareTitle: string | null;
  shareDescription: string | null;
  shareEyebrow: string | null;
  finalOgImageUrl: string | null;
  fromCache: boolean;
  shareUrl: string;
};

export type ShareSurface = 'community' | 'renungan' | 'versehub';

type PrepareApiResponse = {
  data?: {
    status?: string;
    revision?: string;
    asset_id?: number | null;
    share_title?: string | null;
    share_description?: string | null;
    share_eyebrow?: string | null;
    final_og_image_url?: string | null;
    from_cache?: boolean;
    share_url?: string;
  };
};

function mapResponse(data: PrepareApiResponse['data'], fallbackShareUrl: string): ShareAssetResult {
  const revision = String(data?.revision ?? '');
  const shareUrl =
    data?.share_url ??
    (revision ? `${fallbackShareUrl}${fallbackShareUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(revision)}` : fallbackShareUrl);

  return {
    status:           (data?.status as ShareAssetResult['status']) ?? 'ready',
    revision,
    assetId:          data?.asset_id ?? null,
    shareTitle:       data?.share_title ?? null,
    shareDescription: data?.share_description ?? null,
    shareEyebrow:     data?.share_eyebrow ?? null,
    finalOgImageUrl:  data?.final_og_image_url ?? null,
    fromCache:        Boolean(data?.from_cache),
    shareUrl,
  };
}

/**
 * Prepare a share asset for a community post.
 * Called when user clicks share — returns versioned share URL and OG image.
 */
export async function prepareCommunityShareAsset(postId: string): Promise<ShareAssetResult | null> {
  const fallbackUrl = `/community/posts/${encodeURIComponent(postId)}/share`;

  try {
    const response = await fetch(`/api/v1/community/posts/${encodeURIComponent(postId)}/share-assets/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as PrepareApiResponse;
    if (!payload?.data) return null;

    return mapResponse(payload.data, fallbackUrl);
  } catch {
    return null;
  }
}

/**
 * Prepare a share asset for a VerseHub verse.
 */
export async function prepareVersehubShareAsset(lang: string, slug: string): Promise<ShareAssetResult | null> {
  const fallbackUrl = `/versehub/${lang}/share/${encodeURIComponent(slug)}`;

  try {
    const response = await fetch(`/api/v1/versehub/${lang}/${encodeURIComponent(slug)}/share-assets/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as PrepareApiResponse;
    if (!payload?.data) return null;

    return mapResponse(payload.data, fallbackUrl);
  } catch {
    return null;
  }
}

/**
 * Prepare a share asset for a Renungan snapshot.
 */
export async function prepareRenunganShareAsset(token: string): Promise<ShareAssetResult | null> {
  const fallbackUrl = `/renungan/share/${encodeURIComponent(token)}`;

  try {
    const response = await fetch(`/api/v1/renungan/share/${encodeURIComponent(token)}/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as PrepareApiResponse;
    if (!payload?.data) return null;

    return mapResponse(payload.data, fallbackUrl);
  } catch {
    return null;
  }
}

/**
 * Ensures a share asset is ready by polling the prepare endpoint.
 */
export async function ensureShareAssetReady(
  surface: ShareSurface,
  subjectId: string,
  config: {
    maxRetries?: number;
    delayMs?: number;
    lang?: string;
  } = {}
): Promise<ShareAssetResult | null> {
  const { maxRetries = 5, delayMs = 1500, lang = 'id' } = config;
  let attempts = 0;

  while (attempts < maxRetries) {
    let result: ShareAssetResult | null = null;

    if (surface === 'community') {
      result = await prepareCommunityShareAsset(subjectId);
    } else if (surface === 'renungan') {
      result = await prepareRenunganShareAsset(subjectId);
    } else if (surface === 'versehub') {
      result = await prepareVersehubShareAsset(lang, subjectId);
    }

    if (result && result.status === 'ready') {
      return result;
    }

    if (result && result.status === 'failed') {
      return result; // Don't retry on hard failure
    }

    attempts++;
    if (attempts < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}
