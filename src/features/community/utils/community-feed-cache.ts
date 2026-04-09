import type { CommunityPost } from "@/features/community/types";

const COMMUNITY_FEED_CACHE_VERSION = "v2";

export type CommunityFeedCachePayload = {
  posts: CommunityPost[];
  archivePosts: CommunityPost[];
  cachedAt: string;
};

type CommunityCacheScopeArgs = {
  isAuthenticated: boolean;
  profileId?: string | null;
  profileEmail?: string | null;
};

export function resolveCommunityFeedCacheScope({
  isAuthenticated,
  profileId,
  profileEmail,
}: CommunityCacheScopeArgs): string {
  if (!isAuthenticated) return "guest";

  const normalizedUserId = String(profileId || "").trim().toLowerCase();
  if (normalizedUserId) return `user:${normalizedUserId}`;

  const normalizedEmail = String(profileEmail || "").trim().toLowerCase();
  if (normalizedEmail) return `email:${normalizedEmail}`;

  return "member:unknown";
}

export function buildCommunityFeedCacheKey(scope: string): string {
  return `tct.community.feed.cache.${COMMUNITY_FEED_CACHE_VERSION}:${scope}`;
}

export function writeCommunityFeedCache(
  key: string,
  posts: CommunityPost[],
  archivePosts: CommunityPost[],
  cachedAt: Date = new Date()
): void {
  if (typeof window === "undefined") return;

  const payload: CommunityFeedCachePayload = {
    posts,
    archivePosts,
    cachedAt: cachedAt.toISOString(),
  };

  window.localStorage.setItem(key, JSON.stringify(payload));
}

export function readCommunityFeedCache(key: string): CommunityFeedCachePayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CommunityFeedCachePayload>;
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      archivePosts: Array.isArray(parsed.archivePosts) ? parsed.archivePosts : [],
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : "",
    };
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}
