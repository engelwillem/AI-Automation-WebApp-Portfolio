import { describe, expect, it, beforeEach } from "vitest";
import {
  buildCommunityFeedCacheKey,
  readCommunityFeedCache,
  resolveCommunityFeedCacheScope,
  writeCommunityFeedCache,
} from "./community-feed-cache";

describe("community feed cache isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isolates cache entries per authenticated user scope during account switch", () => {
    const userAScope = resolveCommunityFeedCacheScope({
      isAuthenticated: true,
      profileId: "101",
      profileEmail: "a@example.com",
    });
    const userBScope = resolveCommunityFeedCacheScope({
      isAuthenticated: true,
      profileId: "202",
      profileEmail: "b@example.com",
    });

    const userAKey = buildCommunityFeedCacheKey(userAScope);
    const userBKey = buildCommunityFeedCacheKey(userBScope);

    writeCommunityFeedCache(userAKey, [{ id: "post-a" } as any], [{ id: "archive-a" } as any]);
    writeCommunityFeedCache(userBKey, [{ id: "post-b" } as any], [{ id: "archive-b" } as any]);

    const userAData = readCommunityFeedCache(userAKey);
    const userBData = readCommunityFeedCache(userBKey);

    expect(userAData?.posts[0]?.id).toBe("post-a");
    expect(userAData?.archivePosts[0]?.id).toBe("archive-a");
    expect(userBData?.posts[0]?.id).toBe("post-b");
    expect(userBData?.archivePosts[0]?.id).toBe("archive-b");
  });

  it("uses guest scope when unauthenticated", () => {
    const guestScope = resolveCommunityFeedCacheScope({
      isAuthenticated: false,
      profileId: null,
      profileEmail: null,
    });

    expect(guestScope).toBe("guest");
    expect(buildCommunityFeedCacheKey(guestScope)).toContain(":guest");
  });
});
