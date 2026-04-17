"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SurfaceBridgeAction } from "@/components/core/SurfaceBridgeAction";
import { CommunityService } from "@/services/community.service";
import { useAuthSession } from "@/auth/use-auth-session";
import { subscribeDataMutation } from "@/lib/mutation-sync";
import { buildWhatsAppShareUrl, copyToClipboard, getCommunityShareUrl } from "@/lib/share";
import { ensureShareAssetReady, prepareCommunityShareAsset } from "@/lib/share-assets";
import { fetchWithAppAuth } from "@/lib/app-auth-fetch";
import { type CommunityComposerType } from "../categories";
import { CommentsSheet } from "../components/CommentsSheet";
import { MemberPostCard } from "../components/MemberPostCard";
import type { ComposerSubmitResult, PostComposerMetadata } from "../components/post-composer/types";
import { AuthExecutionGate } from "../components/AuthExecutionGate";
import { VerseHubFeaturedCard, type FeaturedVerse } from "../components/VerseHubFeaturedCard";
import { CommunityArchiveTab } from "../components/CommunityArchiveTab";
import { CommunitySmartPostComposer } from "../components/CommunitySmartPostComposer";
import { CommunityBookmarksTab } from "../components/CommunityBookmarksTab";
import type { BookmarkCategory, CommunityPost, CommunityUser } from "../types";
import {
  buildCommunityFeedCacheKey,
  readCommunityFeedCache,
  resolveCommunityFeedCacheScope,
  writeCommunityFeedCache,
} from "../utils/community-feed-cache";
import { DISCUSSION_WINDOW_MS, sortByNewest } from "../utils/community-lifecycle";
import { isPrivateRenunganArchive } from "../utils/private-renungan-archive";

const slugifyRef = (ref: string) =>
  ref
    .toLowerCase()
    .trim()
    .replace(/[:\.\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const POST_SUBMIT_CUE_DURATION_MS = 8000;
const POST_SCROLL_TOP_OFFSET_PX = 116;

export function CommunityPage() {
  const router = useRouter();
  const { status: authStatus, isAuthenticated, isRestoring, profileEmail, profileId, profileName, avatarUrl } = useAuthSession();
  const currentUserId = useMemo(() => String(profileId || "").trim(), [profileId]);
  const communityCacheScope = useMemo(
    () =>
      resolveCommunityFeedCacheScope({
        isAuthenticated,
        profileId: currentUserId,
        profileEmail,
      }),
    [currentUserId, isAuthenticated, profileEmail]
  );
  const COMMUNITY_FEED_CACHE_KEY = useMemo(
    () => buildCommunityFeedCacheKey(communityCacheScope),
    [communityCacheScope]
  );

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [archivePosts, setArchivePosts] = useState<CommunityPost[]>([]);
  const [bookmarkPosts, setBookmarkPosts] = useState<CommunityPost[]>([]);
  const [bookmarkCategories, setBookmarkCategories] = useState<BookmarkCategory[]>([]);
  const [bookmarkLoadError, setBookmarkLoadError] = useState<string | null>(null);
  const [activeBookmarkCategoryId, setActiveBookmarkCategoryId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"discussions" | "archive" | "bookmarks">("discussions");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rituals, setRituals] = useState<any>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [followBusyAuthorId, setFollowBusyAuthorId] = useState<string | null>(null);
  const [repostBusyPostId, setRepostBusyPostId] = useState<string | null>(null);
  const [shareBusyPostId, setShareBusyPostId] = useState<string | null>(null);
  const [, setTimelineNowMs] = useState(() => Date.now());
  const [lastPostedId, setLastPostedId] = useState<string | null>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authGateContent, setAuthGateContent] = useState<{ title: string; description: string }>({
    title: "Tulisanmu sudah siap.",
    description: "Daftar atau masuk untuk membagikannya. Kamu bisa lanjut menulis tanpa kehilangan draft.",
  });
  const discussionPostRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrolledToLastPostedRef = useRef<string | null>(null);
  const narrowColumnClassName = "mx-auto w-full max-w-3xl";
  const galleryColumnClassName = "mx-auto w-full max-w-6xl";
  const pageShellClassName = "mx-auto w-full max-w-7xl px-3 pb-28 md:px-6 lg:px-8";
  const composerCurrentUser = useMemo<CommunityUser | undefined>(() => {
    const id = String(profileId || "").trim();
    if (!id) return undefined;

    const name = String(profileName || profileEmail || "Member").trim() || "Member";
    return {
      id,
      name,
      avatarUrl: avatarUrl || undefined,
    };
  }, [avatarUrl, profileEmail, profileId, profileName]);

  const resolveAuthorAvatar = (post: CommunityPost): string | null => {
    const author = post.author as CommunityPost["author"] & {
      profileImage?: string | null;
      profile_image?: string | null;
    };

    return author.avatarUrl ?? author.profileImage ?? author.profile_image ?? null;
  };

  const isPrivateRenunganPost = useCallback((post: CommunityPost) => {
    const metadataMarkedPrivate = isPrivateRenunganArchive(post.metadata);
    const textMarkedPrivate = String(post.text || "").trim().toLowerCase().startsWith("renungan pribadiku");
    return metadataMarkedPrivate || textMarkedPrivate;
  }, []);

  const publicTimelinePosts = useMemo(() => {
    return sortByNewest(posts.filter((post) => !isPrivateRenunganPost(post)));
  }, [isPrivateRenunganPost, posts]);

  const publicArchivePosts = useMemo(() => {
    return sortByNewest(archivePosts.filter((post) => !isPrivateRenunganPost(post)));
  }, [archivePosts, isPrivateRenunganPost]);

  // Canonical buckets:
  // TALKS = posts (active payload from backend)
  // GALERY = archivePosts (gallery payload from backend)
  const discussionPosts = publicTimelinePosts;
  const hasLastPostedInDiscussions = useMemo(
    () => Boolean(lastPostedId && discussionPosts.some((post) => post.id === lastPostedId)),
    [discussionPosts, lastPostedId]
  );

  const filteredBookmarkPosts = useMemo(() => {
    if (activeBookmarkCategoryId === "all") return bookmarkPosts;
    return bookmarkPosts.filter(
      (post) => String(post.bookmark_category?.id || "") === String(activeBookmarkCategoryId)
    );
  }, [activeBookmarkCategoryId, bookmarkPosts]);

  const showToast = useCallback((message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const persistFeedCache = useCallback(
    (nextPosts: CommunityPost[], nextArchivePosts: CommunityPost[]) => {
      if (typeof window === "undefined") return;
      writeCommunityFeedCache(COMMUNITY_FEED_CACHE_KEY, nextPosts, nextArchivePosts);
    },
    [COMMUNITY_FEED_CACHE_KEY]
  );

  const openAuthGate = useCallback((mode: "share" | "interact") => {
    if (mode === "share") {
      setAuthGateContent({
        title: "Tulisanmu sudah siap.",
        description: "Daftar atau masuk untuk membagikannya. Kamu bisa lanjut menulis tanpa kehilangan draft.",
      });
    } else {
      setAuthGateContent({
        title: "Lanjutkan langkahmu.",
        description: "Masuk atau daftar untuk ikut berinteraksi dengan komunitas.",
      });
    }

    setAuthGateOpen(true);
  }, []);

  const handleCommentsUpdated = useCallback((postId: string, count: number) => {
    const patchComments = (list: CommunityPost[]) =>
      list.map((post) =>
        post.id === postId
          ? { ...post, counts: { ...post.counts, comments: count } }
          : post
      );

    setPosts((prev) => patchComments(prev));
    setArchivePosts((prev) => patchComments(prev));
  }, []);

  const loadBookmarkData = useCallback(async () => {
    if (isRestoring) {
      return;
    }

    if (!isAuthenticated) {
      setBookmarkPosts([]);
      setBookmarkCategories([]);
      setActiveBookmarkCategoryId("all");
      setBookmarkLoadError(null);
      return;
    }

    try {
      const [bookmarks, categoryPayload] = await Promise.all([
        CommunityService.listBookmarks(),
        CommunityService.listBookmarkCategories(),
      ]);
      setBookmarkPosts(bookmarks);
      setBookmarkCategories(categoryPayload.categories);
      setActiveBookmarkCategoryId((prev) => {
        if (prev === "all") return "all";
        const hasPrev = categoryPayload.categories.some((item) => String(item.id) === String(prev));
        return hasPrev ? prev : "all";
      });
      setBookmarkLoadError(null);
    } catch {
      setBookmarkLoadError("Bookmark belum bisa dimuat. Coba Muat ulang.");
    }
  }, [isAuthenticated, isRestoring]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);

      const fetched = await CommunityService.listPosts();
      setPosts(fetched.posts);
      setArchivePosts(fetched.archivePosts);
      persistFeedCache(fetched.posts, fetched.archivePosts);
      setTimelineNowMs(Date.now());
      await loadBookmarkData();

      const ritualRes = await fetch("/api/today");
      if (ritualRes.ok) {
        const ritualData = await ritualRes.json();
        setRituals(ritualData?.data?.rituals || null);
      }
    } catch (error: any) {
      const status = Number(error?.status || 0);
      const isExpectedAvailabilityIssue = status === 401 || status === 403 || status === 500 || status === 503;

      if (!isExpectedAvailabilityIssue) {
        console.error("Failed to fetch community data", error);
      }

      setFetchError(
        status === 401 || status === 403
          ? "Unauthorized"
          : status === 500 || status === 503
            ? "Server Unavailable"
            : "Failed to load feed"
      );

      let usedCachedFeed = false;
      if (typeof window !== "undefined") {
        const cached = readCommunityFeedCache(COMMUNITY_FEED_CACHE_KEY);
        const cachedPosts = cached?.posts ?? [];
        const cachedArchive = cached?.archivePosts ?? [];

        if (cachedPosts.length > 0 || cachedArchive.length > 0) {
          setPosts(cachedPosts);
          setArchivePosts(cachedArchive);
          usedCachedFeed = true;
        }
      }

      if (!usedCachedFeed) {
        setPosts([]);
        setArchivePosts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [COMMUNITY_FEED_CACHE_KEY, loadBookmarkData, persistFeedCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = subscribeDataMutation((detail) => {
      if (!detail.path.startsWith("/api/community/") && !detail.path.startsWith("/api/versehub/")) {
        return;
      }
      void fetchData();
      void loadBookmarkData();
    });

    return unsubscribe;
  }, [fetchData, loadBookmarkData]);

  useEffect(() => {
    void loadBookmarkData();
  }, [loadBookmarkData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimelineNowMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!lastPostedId) return;

    const timer = window.setTimeout(() => {
      setLastPostedId((prev) => (prev === lastPostedId ? null : prev));
      if (scrolledToLastPostedRef.current === lastPostedId) {
        scrolledToLastPostedRef.current = null;
      }
    }, POST_SUBMIT_CUE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [lastPostedId]);

  useEffect(() => {
    if (!lastPostedId || activeTab !== "discussions" || !hasLastPostedInDiscussions) return;
    if (scrolledToLastPostedRef.current === lastPostedId) return;

    const element = discussionPostRefs.current[lastPostedId];
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const topBoundary = POST_SCROLL_TOP_OFFSET_PX;
    const bottomBoundary = viewportHeight - 20;
    const isVisible = rect.top >= topBoundary && rect.bottom <= bottomBoundary;

    if (isVisible) {
      scrolledToLastPostedRef.current = lastPostedId;
      return;
    }

    const targetTop = Math.max(window.scrollY + rect.top - POST_SCROLL_TOP_OFFSET_PX, 0);
    window.scrollTo({ top: targetTop, behavior: "smooth" });
    scrolledToLastPostedRef.current = lastPostedId;
  }, [activeTab, hasLastPostedInDiscussions, lastPostedId]);

  const handlePost = async (
    text: string,
    type: CommunityComposerType,
    images: File[] = [],
    metadata?: PostComposerMetadata
  ): Promise<ComposerSubmitResult> => {
    const isAuthSessionReadyForSubmit = authStatus === "authenticated" && !isRestoring && Boolean(currentUserId);
    if (!isAuthSessionReadyForSubmit) {
      if (!isAuthenticated) {
        openAuthGate("share");
        return {
          ok: false,
          kind: "auth",
          message: "Masuk dulu untuk membagikan tulisanmu.",
          status: 401,
        };
      }

      return {
        ok: false,
        kind: "network",
        message: "Sesi akun belum siap. Coba lagi beberapa detik.",
      };
    }

    try {
      const newPost = await CommunityService.createPost(text, type, images, metadata);
      const nowMs = Date.now();
      const parsedCreatedAtMs = Date.parse(String(newPost.createdAt || "").trim());
      const createdAtMs = Number.isFinite(parsedCreatedAtMs) && parsedCreatedAtMs > 0 ? parsedCreatedAtMs : nowMs;
      const parsedExpiresAtMs = Date.parse(String(newPost.expiresAt || "").trim());
      const expiresAtMs =
        Number.isFinite(parsedExpiresAtMs) && parsedExpiresAtMs > nowMs
          ? parsedExpiresAtMs
          : createdAtMs + DISCUSSION_WINDOW_MS;

      const normalizedNewPost: CommunityPost = {
        ...newPost,
        createdAt: new Date(createdAtMs).toISOString(),
        expiresAt: new Date(expiresAtMs).toISOString(),
        metadata: {
          ...(newPost.metadata || {}),
          last_activated_at: new Date(createdAtMs).toISOString(),
        },
      };

      setTimelineNowMs(nowMs);
      setActiveTab("discussions");
      setLastPostedId(normalizedNewPost.id);
      scrolledToLastPostedRef.current = null;
      setPosts((prev) => {
        const nextPosts = [normalizedNewPost, ...prev.filter((post) => post.id !== normalizedNewPost.id)];
        setArchivePosts((prevArchive) => {
          const nextArchive = prevArchive.filter((post) => post.id !== normalizedNewPost.id);
          persistFeedCache(nextPosts, nextArchive);
          return nextArchive;
        });
        return nextPosts;
      });
      showToast("Berhasil membagikan!", "success");
      return { ok: true };
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error ?? "");
      const explicitStatus =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: number }).status)
          : undefined;
      const statusMatch = rawMessage.match(/:\s*(\d{3})(?:\b|[^0-9])/);
      const status = Number.isFinite(explicitStatus) && explicitStatus
        ? explicitStatus
        : statusMatch
          ? Number(statusMatch[1])
          : undefined;
      const detail = rawMessage.split(" - ")[1]?.trim() || "";

      const imageDiagnostics = {
        imageCount: images.length,
        imageSizes: images.map((f) => f.size),
        imageTypes: images.map((f) => f.type),
        textLength: text.trim().length,
        postType: type,
        status: status ?? null,
      };

      if (process.env.NODE_ENV !== "production") {
        console.error("community_post_submit_failed", {
          ...imageDiagnostics,
          message: rawMessage,
        });
      }

      if (status === 401 || status === 403) {
        return {
          ok: false,
          kind: "auth",
          message: "Sesi akun berakhir. Silakan masuk lagi.",
          status,
          diagnostics: imageDiagnostics,
        };
      }

      if (status === 422) {
        const lowerDetail = detail.toLowerCase();
        let message = detail || "Periksa teks, kategori, dan jumlah gambar (maks 5).";
        if (lowerDetail.includes("must not be greater than 5120") || lowerDetail.includes("maks") || lowerDetail.includes("size")) {
          message = "Ukuran gambar terlalu besar. Maksimal 5MB per gambar.";
        } else if (lowerDetail.includes("mimes") || lowerDetail.includes("image")) {
          message = "Format gambar tidak didukung. Gunakan PNG, JPG, atau WEBP.";
        }
        return {
          ok: false,
          kind: "validation",
          message,
          status,
          diagnostics: imageDiagnostics,
        };
      }

      if (status === 413) {
        return {
          ok: false,
          kind: "validation",
          message: "Ukuran total unggahan terlalu besar. Kurangi jumlah atau ukuran gambar.",
          status,
          diagnostics: imageDiagnostics,
        };
      }

      if (status === 408 || status === 504) {
        return {
          ok: false,
          kind: "network",
          message: "Unggahan terlalu lama. Coba lagi dengan gambar yang lebih ringan.",
          status,
          diagnostics: imageDiagnostics,
        };
      }

      if (status === 503 || status === 502) {
        return {
          ok: false,
          kind: "network",
          message: "Server belum terhubung. Coba lagi beberapa saat.",
          status,
          diagnostics: imageDiagnostics,
        };
      }

      if (status === 500 && images.length > 0) {
        return {
          ok: false,
          kind: "storage",
          message: "Penyimpanan gambar sedang bermasalah. Coba lagi beberapa saat.",
          status,
          diagnostics: imageDiagnostics,
        };
      }

      const normalizedMessage = rawMessage.toLowerCase();
      const isLikelyNetworkDrop =
        !status &&
        (
          normalizedMessage.includes("failed to fetch") ||
          normalizedMessage.includes("networkerror") ||
          normalizedMessage.includes("network request failed") ||
          normalizedMessage.includes("load failed")
        );
      if (isLikelyNetworkDrop) {
        return {
          ok: false,
          kind: "network",
          message: "Koneksi ke server upload terputus. Coba lagi.",
          diagnostics: imageDiagnostics,
        };
      }

      return {
        ok: false,
        kind: "unknown",
        message: "Gagal membagikan post. Coba lagi.",
        status,
        diagnostics: imageDiagnostics,
      };
    }
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm("Hapus konten ini?");
    if (!confirmed) return;

    try {
      await CommunityService.deletePost(postId);
      setPosts((prev) => {
        const nextPosts = prev.filter((item) => item.id !== postId);
        setArchivePosts((prevArchive) => {
          const nextArchive = prevArchive.filter((item) => item.id !== postId);
          persistFeedCache(nextPosts, nextArchive);
          return nextArchive;
        });
        return nextPosts;
      });
      showToast("Konten berhasil dihapus.", "success");
    } catch {
      showToast("Gagal menghapus konten.", "error");
    }
  };

  const mergeUpdatedPost = useCallback(
    (updatedPost: CommunityPost) => {
      setPosts((prev) => {
        const nextPosts = prev.map((post) => (post.id === updatedPost.id ? updatedPost : post));
        setArchivePosts((prevArchive) => {
          const nextArchive = prevArchive.map((post) => (post.id === updatedPost.id ? updatedPost : post));
          persistFeedCache(nextPosts, nextArchive);
          return nextArchive;
        });
        return nextPosts;
      });
    },
    [persistFeedCache]
  );

  const handleEditPostText = async (postId: string, currentText?: string | null) => {
    const initialText = String(currentText ?? "").trim();
    const nextText = window.prompt("Edit teks konten:", initialText);
    if (nextText === null) return;

    const trimmed = nextText.trim();
    if (!trimmed) {
      showToast("Teks tidak boleh kosong.", "error");
      return;
    }

    if (trimmed === initialText) return;

    try {
      const updatedPost = await CommunityService.updatePostText(postId, trimmed);
      mergeUpdatedPost(updatedPost);
      showToast("Teks berhasil diperbarui.", "success");
    } catch {
      showToast("Gagal memperbarui teks.", "error");
    }
  };

  const handleEditPostPreview = async (post: CommunityPost) => {
    const media = Array.isArray(post.mediaPaths) ? post.mediaPaths.filter(Boolean) : [];
    if (media.length === 0) {
      showToast("Post ini tidak punya gambar untuk dijadikan preview.", "error");
      return;
    }

    const currentIndex =
      Number.isInteger(post.metadata?.preview_media_index) && Number(post.metadata?.preview_media_index) >= 0
        ? Number(post.metadata?.preview_media_index)
        : 0;
    const fallbackChoice = String(currentIndex + 1);
    const optionsLabel = media.map((_, idx) => `${idx + 1}`).join(", ");
    const nextSelection = window.prompt(
      `Pilih nomor gambar untuk preview WA (${optionsLabel}):`,
      fallbackChoice
    );
    if (nextSelection === null) return;

    const parsed = Number.parseInt(nextSelection, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > media.length) {
      showToast("Nomor gambar tidak valid.", "error");
      return;
    }

    const nextIndex = parsed - 1;
    if (nextIndex === currentIndex) return;

    try {
      const updatedPost = await CommunityService.updatePostPreview(post.id, nextIndex);
      mergeUpdatedPost(updatedPost);
      showToast("Preview share berhasil diperbarui.", "success");
    } catch {
      showToast("Gagal memperbarui preview share.", "error");
    }
  };

  const handleEditBookmarkCategory = async (post: CommunityPost) => {
    if (!post.isBookmarked) {
      showToast("Konten ini belum masuk bookmarks.", "error");
      return;
    }

    const categories = bookmarkCategories;
    if (categories.length === 0) {
      showToast("Kategori bookmark belum tersedia. Coba muat ulang.", "error");
      return;
    }

    const options = categories.map((item, index) => `${index + 1}. ${item.name}`).join("\n");
    const userInput = window.prompt(
      `Pilih kategori bookmark untuk konten ini:\n${options}\n\nKetik nomor kategori, atau ketik nama kategori baru.`,
      ""
    );
    if (userInput === null) return;

    const normalizedInput = userInput.trim();
    if (!normalizedInput) return;

    let targetCategoryId: string | null = null;

    const parsedIndex = Number.parseInt(normalizedInput, 10);
    if (Number.isInteger(parsedIndex) && parsedIndex >= 1 && parsedIndex <= categories.length) {
      targetCategoryId = String(categories[parsedIndex - 1]?.id || "");
    } else {
      const existing = categories.find(
        (item) => item.name.toLowerCase() === normalizedInput.toLowerCase()
      );
      if (existing) {
        targetCategoryId = String(existing.id);
      } else {
        try {
          const created = await CommunityService.createBookmarkCategory(normalizedInput);
          setBookmarkCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          targetCategoryId = created.id;
          showToast(`Kategori "${created.name}" dibuat.`, "success");
        } catch {
          showToast("Gagal membuat kategori bookmark baru.", "error");
          return;
        }
      }
    }

    if (!targetCategoryId) {
      showToast("Kategori tidak valid.", "error");
      return;
    }

    try {
      await CommunityService.moveBookmarkToCategory(post.id, targetCategoryId);
      await loadBookmarkData();
      showToast("Bookmark dipindahkan ke kategori baru.", "success");
    } catch {
      showToast("Gagal memindahkan bookmark.", "error");
    }
  };

  const canDeletePost = useCallback(
    (post: CommunityPost) => Boolean(post.can_moderate || (currentUserId && post.author.id === currentUserId)),
    [currentUserId]
  );

  const canEditPost = useCallback(
    (post: CommunityPost) => Boolean(post.can_moderate || (currentUserId && post.author.id === currentUserId)),
    [currentUserId]
  );

  const toggleLike = async (postId: string) => {
    if (isRestoring) return;
    if (!isAuthenticated) {
      openAuthGate("interact");
      return;
    }

    const originalPosts = [...posts];
    const originalArchivePosts = [...archivePosts];

    const patchOptimistic = (list: CommunityPost[]) =>
      list.map((post) => {
        if (post.id !== postId) return post;
        const isLiked = !post.isLiked;
        return {
          ...post,
          isLiked,
          counts: {
            ...post.counts,
            likes: (post.counts.likes || 0) + (isLiked ? 1 : -1),
          },
        };
      });

    setPosts((prev) => patchOptimistic(prev));
    setArchivePosts((prev) => patchOptimistic(prev));

    try {
      const updatedPost = await CommunityService.toggleLike(postId);
      const patchServer = (list: CommunityPost[]) =>
        list.map((post) => (post.id === postId ? updatedPost : post));

      setPosts((prev) => {
        const nextPosts = patchServer(prev);
        setArchivePosts((prevArchive) => {
          const nextArchive = patchServer(prevArchive);
          persistFeedCache(nextPosts, nextArchive);
          return nextArchive;
        });
        return nextPosts;
      });
    } catch {
      setPosts(originalPosts);
      setArchivePosts(originalArchivePosts);
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (isRestoring) return;
    if (!isAuthenticated) {
      openAuthGate("interact");
      return;
    }

    const originalPosts = [...posts];
    const originalArchivePosts = [...archivePosts];

    const patchOptimistic = (list: CommunityPost[]) =>
      list.map((post) => {
        if (post.id !== postId) return post;
        const isBookmarked = !post.isBookmarked;
        return {
          ...post,
          isBookmarked,
          counts: {
            ...post.counts,
            bookmarks: (post.counts.bookmarks || 0) + (isBookmarked ? 1 : -1),
          },
        };
      });

    setPosts((prev) => patchOptimistic(prev));
    setArchivePosts((prev) => patchOptimistic(prev));

    try {
      const updatedPost = await CommunityService.toggleBookmark(postId);
      const patchServer = (list: CommunityPost[]) =>
        list.map((post) => (post.id === postId ? updatedPost : post));

      setPosts((prev) => {
        const nextPosts = patchServer(prev);
        setArchivePosts((prevArchive) => {
          const nextArchive = patchServer(prevArchive);
          persistFeedCache(nextPosts, nextArchive);
          return nextArchive;
        });
        return nextPosts;
      });

      void loadBookmarkData();
      showToast(updatedPost.isBookmarked ? "Disimpan ke Bookmarks" : "Dihapus dari Bookmarks", "success");
    } catch {
      setPosts(originalPosts);
      setArchivePosts(originalArchivePosts);
    }
  };

  const handleShare = async (postId: string, text?: string | null) => {
    if (shareBusyPostId) return;

    const shortText = text ? `${text.substring(0, 100)}...` : "Bagikan pos inspirasi ini.";

    setShareBusyPostId(postId);
    try {
      // Prepare share asset → wait for AI if needed
      let shareUrl = getCommunityShareUrl(postId);
      const prepared = await ensureShareAssetReady("community", postId);
      if (prepared?.shareUrl) {
        shareUrl = prepared.shareUrl;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: "TheChosenTalks Community",
            text: shortText,
            url: shareUrl,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name !== "AbortError") {
            console.error("Error sharing:", err);
          }
        }
      } else {
        const copied = await copyToClipboard(shareUrl);
        if (copied) {
          showToast("Tautan disalin ke papan klip!", "success");
        } else {
          window.open(buildWhatsAppShareUrl(`${shortText} ${shareUrl}`), "_blank", "noopener,noreferrer");
        }
      }
    } catch (error) {
       console.error("[community] share prepare failed", error);
       // Basic fallback
       const shareUrl = getCommunityShareUrl(postId);
       window.open(buildWhatsAppShareUrl(`${shortText} ${shareUrl}`), "_blank", "noopener,noreferrer");
    } finally {
      setShareBusyPostId(null);
    }
  };

  const handleRepostFromArchive = useCallback(
    async (post: CommunityPost) => {
      if (isRestoring) return;
      if (!isAuthenticated) {
        openAuthGate("interact");
        return;
      }
      if (repostBusyPostId) return;

      setRepostBusyPostId(post.id);
      try {
        const updatedPost = await CommunityService.repost(post.id);

        const nowMs = Date.now();
        if (updatedPost) {
          const nextTalks = sortByNewest([
            {
              ...updatedPost,
              status: "active",
            },
            ...posts.filter((item) => item.id !== updatedPost.id),
          ]);

          const nextArchive = sortByNewest(archivePosts.filter((item) => item.id !== updatedPost.id));
          const isMovedLocally =
            nextTalks.some((item) => item.id === post.id) &&
            !nextArchive.some((item) => item.id === post.id);

          if (!isMovedLocally) {
            throw new Error("Repost verification failed in local state");
          }

          setTimelineNowMs(nowMs);
          setActiveTab("discussions");
          setPosts(nextTalks);
          setArchivePosts(nextArchive);
          persistFeedCache(nextTalks, nextArchive);
          showToast("Berhasil Repost ke Talks", "success");
        } else {
          // Fallback when backend success payload is minimal: verify bucket move from fresh feed.
          const latest = await CommunityService.listPosts();
          const movedToDiscussion = latest.posts.some((item) => item.id === post.id);
          const removedFromArchive = !latest.archivePosts.some((item) => item.id === post.id);

          if (!movedToDiscussion || !removedFromArchive) {
            throw new Error("Repost acknowledged but post did not move buckets");
          }

          setTimelineNowMs(nowMs);
          setActiveTab("discussions");
          setPosts(latest.posts);
          setArchivePosts(latest.archivePosts);
          persistFeedCache(latest.posts, latest.archivePosts);
          showToast("Berhasil Repost ke Talks", "success");
        }
      } catch (error) {
        console.error("Failed to repost post", error);
        try {
          const latest = await CommunityService.listPosts();
          const movedToDiscussion = latest.posts.some((item) => item.id === post.id);
          const removedFromArchive = !latest.archivePosts.some((item) => item.id === post.id);
          if (movedToDiscussion && removedFromArchive) {
            setTimelineNowMs(Date.now());
            setActiveTab("discussions");
            setPosts(latest.posts);
            setArchivePosts(latest.archivePosts);
            persistFeedCache(latest.posts, latest.archivePosts);
            showToast("Berhasil Repost ke Talks", "success");
            return;
          }
        } catch (fallbackError) {
          console.error("Failed to verify repost fallback state", fallbackError);
        }
        const rawMessage = error instanceof Error ? error.message : "";
        if (rawMessage.includes("401") || rawMessage.includes("403")) {
          showToast("Sesi akun berakhir. Silakan masuk lagi.", "error");
        } else {
          showToast("Repost belum berpindah ke Talks. Coba muat ulang.", "error");
        }
      } finally {
        setRepostBusyPostId(null);
      }
    },
    [
      archivePosts,
      isAuthenticated,
      isRestoring,
      openAuthGate,
      persistFeedCache,
      posts,
      repostBusyPostId,
      showToast,
    ]
  );

  const handleOpenComments = useCallback(
    (postId: string) => {
      if (isRestoring) return;
      if (!isAuthenticated) {
        openAuthGate("interact");
        return;
      }
      setActiveCommentPostId(postId);
    },
    [isAuthenticated, isRestoring, openAuthGate]
  );

  const handleToggleFollowAuthor = useCallback(
    async (authorId: string) => {
      if (isRestoring) return;
      if (!isAuthenticated) {
        openAuthGate("interact");
        return;
      }

      if (!authorId) return;

      setFollowBusyAuthorId(authorId);
      try {
        const response = await fetchWithAppAuth(`/api/users/${authorId}/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok !== true) {
          showToast(payload?.message || "Gagal memperbarui follow.", "error");
          return;
        }

        const nextFollowing = Boolean(payload?.following);
        const patchPosts = (list: CommunityPost[]) =>
          list.map((post) =>
            post.author.id === authorId
              ? {
                  ...post,
                  author: {
                    ...post.author,
                    isFollowing: nextFollowing,
                    isMutualFollow: nextFollowing && Boolean(post.author.isFollowedBy),
                  },
                }
              : post
          );

        setPosts((prev) => {
          const nextPosts = patchPosts(prev);
          setArchivePosts((prevArchive) => {
            const nextArchive = patchPosts(prevArchive);
            persistFeedCache(nextPosts, nextArchive);
            return nextArchive;
          });
          return nextPosts;
        });

        showToast(nextFollowing ? "Berhasil follow member." : "Follow dilepas.", "success");
      } catch {
        showToast("Gagal memperbarui follow.", "error");
      } finally {
        setFollowBusyAuthorId(null);
      }
    },
    [isAuthenticated, isRestoring, openAuthGate, persistFeedCache, showToast]
  );

  const handleCreateBookmarkCategory = useCallback(async () => {
    const name = window.prompt("Nama kategori bookmark baru:");
    if (!name) return;
    try {
      const created = await CommunityService.createBookmarkCategory(name.trim());
      setBookmarkCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveBookmarkCategoryId(created.id);
      showToast(`Kategori ${created.name} siap dipakai.`, "success");
      await loadBookmarkData();
    } catch {
      showToast("Gagal membuat kategori bookmark.", "error");
    }
  }, [loadBookmarkData, showToast]);

  const featuredPost = useMemo(() => posts.find((post) => post.isFeatured), [posts]);

  const effectiveFeaturedVerse = useMemo<FeaturedVerse | null>(() => {
    const ritualVerse = rituals?.today_verse ?? null;
    if (ritualVerse?.quote) {
      return {
        ref: slugifyRef(ritualVerse.reference || "mzm-23-1"),
        href:
          ritualVerse.cta_href ||
          `/versehub/id?ref=${encodeURIComponent(slugifyRef(ritualVerse.reference || ""))}`,
        text: ritualVerse.text || ritualVerse.quote,
        reference: ritualVerse.reference || "Ayat Hari Ini",
        imageUrl: ritualVerse.image_url || ritualVerse.imageUrl || undefined,
      };
    }

    const meta = featuredPost?.metadata || {};
    if (meta.ref || meta.reference) {
      return {
        ref: meta.ref || slugifyRef(meta.reference || ""),
        href: `/versehub/id?ref=${encodeURIComponent(meta.ref || slugifyRef(meta.reference || ""))}`,
        text: meta.quote || featuredPost?.text || "",
        reference: meta.reference || "Featured Reflection",
        imageUrl: meta.imageUrl || featuredPost?.mediaPaths?.[0] || undefined,
      };
    }

    return null;
  }, [featuredPost, rituals]);

  return (
    <div className="flex min-h-full flex-col animate-in fade-in duration-700 md:py-6">
      <header className={cn(pageShellClassName, "pb-8 pt-0")}>
        <div className={narrowColumnClassName}>
          <p className="mb-8 mt-4 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/30 md:mb-4 md:mt-0">Community</p>
          <h1 className="tct-serif mb-2 text-[26px] leading-[1.25] tracking-tight text-foreground/90">
            Ruang berbagi dan bertumbuh bersama.
          </h1>
          <p className="text-[14px] font-medium leading-relaxed tracking-wide text-foreground/45">
            Inspirasi, doa, dan kesaksian dari komunitas.
          </p>
        </div>
      </header>

      <div className={cn(pageShellClassName, "space-y-6")}>
        {effectiveFeaturedVerse && activeTab !== "archive" ? (
          <div className={narrowColumnClassName}>
            <VerseHubFeaturedCard
              verse={effectiveFeaturedVerse}
              postId={featuredPost?.id}
              onOpenComments={setActiveCommentPostId}
            />
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
          <div className={cn(narrowColumnClassName, "sticky top-0 z-40 py-2")}>
            <TabsList className="relative flex h-[56px] w-full items-center justify-between overflow-hidden rounded-[24px] bg-background/60 p-1 text-foreground shadow-sm ring-1 ring-border/50 backdrop-blur-2xl">
              {[
                { id: "discussions", label: "Talks" },
                { id: "archive", label: "GALERY" },
                { id: "bookmarks", label: "Bookmarks" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "relative z-10 h-full flex-1 rounded-[20px] text-[12px] font-black uppercase tracking-widest transition-all duration-300",
                    "data-[state=active]:bg-[#00A9D6] data-[state=active]:text-white data-[state=active]:shadow-[0_14px_28px_-18px_rgba(0,169,214,0.75)]",
                    "data-[state=inactive]:text-muted-foreground/60 hover:text-foreground/80"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="discussions" className="mt-0 space-y-6 outline-none">
            <div className={cn(narrowColumnClassName, "space-y-8")}>
              <Suspense fallback={<div className="h-32 w-full animate-pulse rounded-[32px] bg-surface-muted" />}>
                <CommunitySmartPostComposer onPost={handlePost} currentUser={composerCurrentUser} />
              </Suspense>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/65 px-4 py-3">
                <p className="text-[12px] leading-relaxed text-slate-600">
                  Kalau mulai terasa penuh, kamu bisa lanjut dulu di ruang privat.
                </p>
                <div className="mt-2">
                  <SurfaceBridgeAction target="renungan" label="Lanjut privat di Renungan" href="/renungan?source=community&intent=regulate" />
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="space-y-6 rounded-[40px] bg-surface-muted/30 p-8">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32 rounded-full" />
                          <Skeleton className="h-3 w-20 rounded-full" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-full rounded-full" />
                      <Skeleton className="h-4 w-5/6 rounded-full" />
                      <Skeleton className="mt-4 h-48 w-full rounded-[32px]" />
                    </div>
                  ))}
                </div>
              ) : discussionPosts.length ? (
                <div className="space-y-6">
                  {hasLastPostedInDiscussions ? (
                    <p
                      role="status"
                      aria-live="polite"
                      className="rounded-2xl border border-sky-100/80 bg-sky-50/40 px-4 py-3 text-[13px] font-medium leading-relaxed text-slate-700"
                    >
                      Apa yang kamu bagikan bisa menguatkan seseorang.
                    </p>
                  ) : null}
                  {discussionPosts.map((post) => (
                    <div
                      key={post.id}
                      ref={(node) => {
                        discussionPostRefs.current[post.id] = node;
                      }}
                    >
                      {lastPostedId === post.id ? (
                        <div className="mb-3 flex items-center gap-3 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          <div className="h-px flex-1 bg-slate-200/80" />
                          <span>Baru saja dibagikan</span>
                          <div className="h-px flex-1 bg-slate-200/80" />
                        </div>
                      ) : null}
                      <MemberPostCard
                        authorId={post.author.id}
                        authorName={post.author.name}
                        authorAvatar={resolveAuthorAvatar(post)}
                        isAuthenticated={isAuthenticated}
                        isOfficial={post.author.isOfficial}
                        isFollowingAuthor={Boolean(post.author.isFollowing)}
                        isMutualFollow={Boolean(post.author.isMutualFollow)}
                        canFollowAuthor={Boolean(currentUserId) && currentUserId !== post.author.id}
                        type={post.type}
                        text={post.text}
                        metadata={post.metadata}
                        imgSrc={post.imageUrl || undefined}
                        mediaSrcList={post.mediaPaths || undefined}
                        aspectRatio={post.metadata?.media_aspect_ratio}
                        createdAt={post.createdAt}
                        prayLabel={String(post.counts.likes || 0)}
                        prayed={post.isLiked}
                        commentsCount={post.counts.comments || 0}
                        bookmarked={post.isBookmarked}
                        bookmarkLabel={String(post.counts.bookmarks || 0)}
                        onPray={() => toggleLike(post.id)}
                        onBookmark={() => toggleBookmark(post.id)}
                        onOpenComments={() => handleOpenComments(post.id)}
                        onShare={() => handleShare(post.id, post.text)}
                        onToggleFollowAuthor={() => handleToggleFollowAuthor(post.author.id)}
                        onMessageAuthor={() => router.push(`/inbox/${post.author.id}`)}
                        followBusy={followBusyAuthorId === post.author.id}
                        canDelete={canDeletePost(post)}
                        canEdit={canEditPost(post)}
                        canEditPreview={canEditPost(post) && Boolean(post.mediaPaths?.length)}
                        canEditBookmarkCategory={post.isBookmarked}
                        onEditText={() => handleEditPostText(post.id, post.text)}
                        onEditPreview={() => handleEditPostPreview(post)}
                        onEditBookmarkCategory={() => void handleEditBookmarkCategory(post)}
                        onDelete={() => handleDeletePost(post.id)}
                        isNewlyPosted={lastPostedId === post.id}
                        shareBusy={shareBusyPostId === post.id}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-w-[420px] px-4 pb-24 pt-12">
                  <p className="text-[15px] leading-relaxed text-foreground/70">Belum ada percakapan hari ini.</p>
                  <button
                    onClick={() => fetchData()}
                    className="mt-6 text-[13px] font-medium text-foreground/40 transition-colors hover:text-foreground/70"
                  >
                    Muat ulang
                  </button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="archive" className="mt-0 overflow-visible outline-none">
            <CommunityArchiveTab
              className={galleryColumnClassName}
              isLoading={isLoading}
              fetchError={fetchError}
              publicArchivePosts={publicArchivePosts}
              repostBusyPostId={repostBusyPostId}
              onRefresh={fetchData}
              onOpenComments={handleOpenComments}
              onPray={toggleLike}
              onBookmark={toggleBookmark}
              onRepost={handleRepostFromArchive}
              onShare={handleShare}
              shareBusyPostId={shareBusyPostId}
            />
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-6 outline-none">
            <CommunityBookmarksTab
              className={narrowColumnClassName}
              bookmarkLoadError={bookmarkLoadError}
              bookmarkPosts={bookmarkPosts}
              bookmarkCategories={bookmarkCategories}
              activeBookmarkCategoryId={activeBookmarkCategoryId}
              filteredBookmarkPosts={filteredBookmarkPosts}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
              followBusyAuthorId={followBusyAuthorId}
              onSetActiveCategoryId={setActiveBookmarkCategoryId}
              onCreateCategory={handleCreateBookmarkCategory}
              onPray={toggleLike}
              onBookmark={toggleBookmark}
              onOpenComments={handleOpenComments}
              onShare={handleShare}
              onToggleFollowAuthor={handleToggleFollowAuthor}
              onMessageAuthor={(authorId) => router.push(`/inbox/${authorId}`)}
              canDeletePost={canDeletePost}
              canEditPost={canEditPost}
              onEditText={handleEditPostText}
              onEditPreview={handleEditPostPreview}
              onEditBookmarkCategory={handleEditBookmarkCategory}
              onDelete={handleDeletePost}
              resolveAuthorAvatar={resolveAuthorAvatar}
              shareBusyPostId={shareBusyPostId}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CommentsSheet
        isOpen={!!activeCommentPostId}
        onOpenChange={(open) => !open && setActiveCommentPostId(null)}
        postId={activeCommentPostId}
        onCommentsUpdated={handleCommentsUpdated}
      />

      <AuthExecutionGate
        open={authGateOpen}
        onOpenChange={setAuthGateOpen}
        title={authGateContent.title}
        description={authGateContent.description}
      />

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-foreground px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-background shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-500">
          {toast.type === "error" ? <AlertTriangle size={16} className="text-red-400" /> : null}
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
