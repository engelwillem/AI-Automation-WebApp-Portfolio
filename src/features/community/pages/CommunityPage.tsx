"use client";

import {
  Suspense,
  startTransition,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CommunityService } from "@/services/community.service";
import { useAuthSession } from "@/auth/use-auth-session";
import { subscribeDataMutation } from "@/lib/mutation-sync";
import { buildWhatsAppShareUrl, copyToClipboard, getCommunityShareUrl } from "@/lib/share";
import { buildAppAuthHeaders } from "@/lib/app-auth-fetch";
import {
  COMMUNITY_ARCHIVE_CATEGORIES,
  type CommunityArchiveCategory,
  type CommunityComposerType,
} from "../categories";
import { CommentsSheet } from "../components/CommentsSheet";
import { MemberPostCard } from "../components/MemberPostCard";
import { PostComposer } from "../components/PostComposer";
import { AuthExecutionGate } from "../components/AuthExecutionGate";
import { VerseHubFeaturedCard, type FeaturedVerse } from "../components/VerseHubFeaturedCard";
import { CommunityArchiveGalleryCard } from "../components/CommunityArchiveGalleryCard";
import type { BookmarkCategory, CommunityPost, CommunityUser } from "../types";
import {
  buildCommunityFeedCacheKey,
  readCommunityFeedCache,
  resolveCommunityFeedCacheScope,
  writeCommunityFeedCache,
} from "../utils/community-feed-cache";
import { DISCUSSION_WINDOW_MS, partitionCommunityPostsByAge, sortByNewest } from "../utils/community-lifecycle";
import { isPrivateRenunganArchive } from "../utils/private-renungan-archive";

type ArchiveCategory = CommunityArchiveCategory;

const slugifyRef = (ref: string) =>
  ref
    .toLowerCase()
    .trim()
    .replace(/[:\.\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const CATEGORY_SWIPE_THRESHOLD_PX = 36;
const POST_SUBMIT_CUE_DURATION_MS = 8000;
const POST_SCROLL_TOP_OFFSET_PX = 116;

function SmartPostComposer({
  onPost,
  currentUser,
}: {
  onPost: (
    text: string,
    type: CommunityComposerType,
    images?: File[],
    metadata?: { media_aspect_ratio?: string }
  ) => Promise<boolean>;
  currentUser?: CommunityUser;
}) {
  const searchParams = useSearchParams();
  const intent = searchParams?.get("intent");
  const text = searchParams?.get("text") || "";

  const isReflection = intent === "reflection";
  const initialExpanded = isReflection || text.length > 0;

  return (
    <PostComposer
      onPost={onPost}
      currentUser={currentUser}
      initialType={isReflection ? "reflection" : "user_post"}
      initialText={text}
      initialExpanded={initialExpanded}
    />
  );
}

export function CommunityPage() {
  const router = useRouter();
  const { isAuthenticated, isRestoring, profileEmail, profileId, profileName, avatarUrl } = useAuthSession();
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
  const [archiveCategory, setArchiveCategory] = useState<ArchiveCategory>("all");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rituals, setRituals] = useState<any>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [followBusyAuthorId, setFollowBusyAuthorId] = useState<string | null>(null);
  const [repostBusyPostId, setRepostBusyPostId] = useState<string | null>(null);
  const [timelineNowMs, setTimelineNowMs] = useState(() => Date.now());
  const [lastPostedId, setLastPostedId] = useState<string | null>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authGateContent, setAuthGateContent] = useState<{ title: string; description: string }>({
    title: "Tulisanmu sudah siap.",
    description: "Daftar atau masuk untuk membagikannya. Kamu bisa lanjut menulis tanpa kehilangan draft.",
  });
  const archiveRailRef = useRef<HTMLDivElement | null>(null);
  const discussionPostRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrolledToLastPostedRef = useRef<string | null>(null);
  const archiveRailTouchRef = useRef<{ startX: number; startY: number; hasStepped: boolean } | null>(null);
  const archiveRailDragRef = useRef<{ pointerId: number; startX: number; startY: number; hasStepped: boolean } | null>(null);
  const [archiveRailHovered, setArchiveRailHovered] = useState(false);

  const deferredArchiveSearchQuery = useDeferredValue(archiveSearchQuery);
  const narrowColumnClassName = "mx-auto w-full max-w-3xl";
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
    const mergedById = new Map<string, CommunityPost>();
    // Prefer active feed payload when the same post exists in both buckets.
    [...archivePosts, ...posts].forEach((post) => {
      if (!post?.id) return;
      mergedById.set(post.id, post);
    });

    return sortByNewest(Array.from(mergedById.values()).filter((post) => !isPrivateRenunganPost(post)));
  }, [archivePosts, isPrivateRenunganPost, posts]);

  const timelineBuckets = useMemo(
    () => partitionCommunityPostsByAge(publicTimelinePosts, timelineNowMs),
    [publicTimelinePosts, timelineNowMs]
  );

  const discussionPosts = timelineBuckets.discussionPosts;
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

  const activeArchiveCategoryIndex = useMemo(
    () => Math.max(
      COMMUNITY_ARCHIVE_CATEGORIES.findIndex((item) => item.key === archiveCategory),
      0
    ),
    [archiveCategory]
  );

  const archiveRailProgress = useMemo(() => {
    if (COMMUNITY_ARCHIVE_CATEGORIES.length <= 1) return 0;
    return activeArchiveCategoryIndex / (COMMUNITY_ARCHIVE_CATEGORIES.length - 1);
  }, [activeArchiveCategoryIndex]);

  const updateArchiveRailState = useCallback(() => {
    const rail = archiveRailRef.current;
    if (!rail) {
      return;
    }
  }, []);

  const centerArchiveCategoryChip = useCallback((nextCategory: ArchiveCategory) => {
    const rail = archiveRailRef.current;
    if (!rail) return;

    const activeChip = rail.querySelector<HTMLButtonElement>(`[data-category-key="${nextCategory}"]`);
    if (!activeChip) return;

    activeChip.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, []);

  const stepArchiveCategory = useCallback((direction: "prev" | "next") => {
    const categoryCount = COMMUNITY_ARCHIVE_CATEGORIES.length;
    if (categoryCount <= 1) return;

    const nextIndex =
      direction === "next"
        ? (activeArchiveCategoryIndex + 1) % categoryCount
        : (activeArchiveCategoryIndex - 1 + categoryCount) % categoryCount;

    const nextCategory = COMMUNITY_ARCHIVE_CATEGORIES[nextIndex]?.key as ArchiveCategory | undefined;
    if (!nextCategory) return;

    setArchiveCategory(nextCategory);
    window.setTimeout(() => centerArchiveCategoryChip(nextCategory), 18);
  }, [activeArchiveCategoryIndex, centerArchiveCategoryChip]);

  const canLoopArchiveCategories = COMMUNITY_ARCHIVE_CATEGORIES.length > 1;

  const handleArchiveRailTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (archiveRailDragRef.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    archiveRailTouchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      hasStepped: false,
    };
  }, []);

  const handleArchiveRailTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (archiveRailDragRef.current) return;
      const state = archiveRailTouchRef.current;
      const touch = event.touches[0];
      if (!state || !touch || state.hasStepped) return;

      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) + 8;

      if (!isHorizontal || Math.abs(deltaX) < CATEGORY_SWIPE_THRESHOLD_PX) return;

      stepArchiveCategory(deltaX < 0 ? "next" : "prev");
      archiveRailTouchRef.current = {
        ...state,
        hasStepped: true,
      };
    },
    [stepArchiveCategory]
  );

  const handleArchiveRailTouchEnd = useCallback(() => {
    archiveRailTouchRef.current = null;
  }, []);

  const handleArchiveRailPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canLoopArchiveCategories) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    archiveRailDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      hasStepped: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [canLoopArchiveCategories]);

  const handleArchiveRailPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = archiveRailDragRef.current;
      if (!state || state.pointerId !== event.pointerId || state.hasStepped) return;

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) + 8;
      if (!isHorizontal || Math.abs(deltaX) < CATEGORY_SWIPE_THRESHOLD_PX) return;

      stepArchiveCategory(deltaX < 0 ? "next" : "prev");
      archiveRailDragRef.current = { ...state, hasStepped: true };
    },
    [stepArchiveCategory]
  );

  const handleArchiveRailPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const state = archiveRailDragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    archiveRailDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const revealArchiveRailControls = useCallback(() => {
    setArchiveRailHovered(true);
  }, []);

  useEffect(() => {
    updateArchiveRailState();

    const rail = archiveRailRef.current;
    if (!rail) return;

    const handleResize = () => updateArchiveRailState();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [activeTab, updateArchiveRailState]);

  useEffect(() => {
    const rail = archiveRailRef.current;
    if (!rail) return;

    centerArchiveCategoryChip(archiveCategory);

    const timer = window.setTimeout(() => updateArchiveRailState(), 220);
    return () => window.clearTimeout(timer);
  }, [archiveCategory, centerArchiveCategoryChip, updateArchiveRailState]);

  const handlePost = async (
    text: string,
    type: CommunityComposerType,
    images: File[] = [],
    metadata?: { media_aspect_ratio?: string }
  ) => {
    if (isRestoring) return false;
    if (!isAuthenticated) {
      openAuthGate("share");
      return false;
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
      return true;
    } catch (error) {
      console.error("Failed to create post", error);
      const rawMessage = error instanceof Error ? error.message : "";
      if (rawMessage.includes("422")) {
        const hint = rawMessage.split(" - ")[1]?.trim() || "Periksa teks, kategori, dan jumlah gambar (maks 5).";
        showToast(hint, "error");
      } else if (rawMessage.includes("401") || rawMessage.includes("403")) {
        showToast("Sesi akun berakhir. Silakan masuk lagi.", "error");
      } else {
        showToast("Gagal membagikan post. Coba lagi.", "error");
      }
      return false;
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
    const url = getCommunityShareUrl(postId);
    const shortText = text ? `${text.substring(0, 100)}...` : "Bagikan pos inspirasi ini.";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "TheChosenTalks Community",
          text: shortText,
          url,
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      const copied = await copyToClipboard(url);
      if (copied) {
        showToast("Tautan disalin ke papan klip!", "success");
      } else {
        window.open(buildWhatsAppShareUrl(`${shortText} ${url}`), "_blank", "noopener,noreferrer");
      }
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
        setTimelineNowMs(nowMs);
        setActiveTab("discussions");

        if (updatedPost) {
          setPosts((prev) => {
            const nextPosts = [updatedPost, ...prev.filter((item) => item.id !== updatedPost.id)];
            setArchivePosts((prevArchive) => {
              const nextArchive = prevArchive.filter((item) => item.id !== updatedPost.id);
              persistFeedCache(nextPosts, nextArchive);
              return nextArchive;
            });
            return nextPosts;
          });
        } else {
          // Fallback when backend responds success without full post payload.
          await fetchData();
        }

        showToast("Post berhasil diaktifkan kembali ke Diskusi.", "success");
      } catch (error) {
        console.error("Failed to repost post", error);
        const rawMessage = error instanceof Error ? error.message : "";
        if (rawMessage.includes("401") || rawMessage.includes("403")) {
          showToast("Sesi akun berakhir. Silakan masuk lagi.", "error");
        } else {
          showToast("Gagal mengaktifkan ulang post.", "error");
        }
      } finally {
        setRepostBusyPostId(null);
      }
    },
    [
      isAuthenticated,
      isRestoring,
      fetchData,
      openAuthGate,
      persistFeedCache,
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
        const response = await fetch(`/api/users/${authorId}/follow`, {
          method: "POST",
          headers: buildAppAuthHeaders({
            contentType: "application/json",
          }),
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

  const publicArchivePosts = timelineBuckets.archivePosts;

  const archiveCategoryCounts = useMemo(() => {
    return publicArchivePosts.reduce<Record<string, number>>(
      (acc, post) => {
        acc.all += 1;
        acc[post.type] = (acc[post.type] || 0) + 1;
        return acc;
      },
      { all: 0 }
    );
  }, [publicArchivePosts]);

  const filteredArchivePosts = useMemo(() => {
    const normalizedQuery = deferredArchiveSearchQuery.trim().toLowerCase();

    return publicArchivePosts.filter((post) => {
      if (archiveCategory !== "all" && post.type !== archiveCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [post.title, post.text, post.type_label, post.author?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [archiveCategory, deferredArchiveSearchQuery, publicArchivePosts]);

  const archiveResultLabel = useMemo(() => {
    if (deferredArchiveSearchQuery.trim()) {
      return `Hasil untuk "${deferredArchiveSearchQuery.trim()}"`;
    }

    const activeCategory = COMMUNITY_ARCHIVE_CATEGORIES.find((item) => item.key === archiveCategory);
    return activeCategory?.label || "Semua";
  }, [archiveCategory, deferredArchiveSearchQuery]);

  const archiveStateTone = useMemo(() => {
    if (fetchError === "Unauthorized") {
      return {
        title: "Masuk untuk melihat arsip komunitasmu.",
        description: "Beberapa konten hanya tersedia saat sesi akunmu aktif kembali.",
      };
    }

    if (fetchError === "Server Unavailable") {
      return {
        title: "Arsip sedang istirahat sejenak.",
        description: "Coba muat ulang beberapa saat lagi. Konten cached tetap kami tampilkan bila tersedia.",
      };
    }

    return {
      title: "Belum ada hasil yang cocok.",
      description: "Coba ganti kata kunci atau pilih kategori lain agar pencarian terasa lebih luas.",
    };
  }, [fetchError]);

  const archiveHasBlockingError = !isLoading && publicArchivePosts.length === 0 && fetchError !== null;
  const archiveEmptyState = !isLoading && filteredArchivePosts.length === 0;

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
                { id: "archive", label: "History" },
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
                <SmartPostComposer onPost={handlePost} currentUser={composerCurrentUser} />
              </Suspense>

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
            <div className="space-y-8">
              <section className="relative z-20">
                <div className="overflow-hidden rounded-[30px] border border-white/75 bg-white/80 p-4 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.42)] backdrop-blur-xl md:p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div className="space-y-1">
                        <h2 className="tct-serif text-[28px] leading-tight tracking-tight text-slate-900">
                          Galeri Komunitas
                        </h2>
                      </div>

                      <div className="rounded-[22px] bg-slate-950/[0.045] px-4 py-3 text-left md:min-w-[220px]">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Hasil terlihat</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{filteredArchivePosts.length}</p>
                        <p className="mt-1 text-sm text-slate-500">{archiveResultLabel}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
                      <label className="group relative flex w-full min-w-0 flex-1 items-center gap-3 rounded-[22px] border border-slate-200/85 bg-slate-50/90 px-4 py-3 shadow-inner transition-colors focus-within:border-brand/30 focus-within:bg-white">
                        <Search className="h-4 w-4 text-slate-400 transition-colors group-focus-within:text-brand" />
                        <input
                          value={archiveSearchQuery}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            startTransition(() => setArchiveSearchQuery(nextValue));
                          }}
                          placeholder="Cari judul, isi singkat, atau kategori..."
                          className="w-full bg-transparent text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
                          aria-label="Cari arsip komunitas"
                        />
                        {archiveSearchQuery ? (
                          <button
                            type="button"
                            onClick={() => startTransition(() => setArchiveSearchQuery(""))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                            aria-label="Hapus pencarian"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </label>

                      <div className="inline-flex w-fit max-w-full shrink-0 self-start items-center gap-2 rounded-full bg-slate-950/[0.045] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filter cepat
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div
                        className="relative"
                        onMouseEnter={revealArchiveRailControls}
                        onMouseMove={revealArchiveRailControls}
                        onPointerEnter={revealArchiveRailControls}
                        onPointerDown={handleArchiveRailPointerDown}
                        onPointerMove={(event) => {
                          revealArchiveRailControls();
                          handleArchiveRailPointerMove(event);
                        }}
                        onPointerUp={handleArchiveRailPointerUp}
                        onPointerCancel={handleArchiveRailPointerUp}
                        onTouchStart={(event) => {
                          revealArchiveRailControls();
                          handleArchiveRailTouchStart(event);
                        }}
                        onTouchMove={handleArchiveRailTouchMove}
                        onTouchEnd={handleArchiveRailTouchEnd}
                        onTouchCancel={handleArchiveRailTouchEnd}
                        onFocusCapture={revealArchiveRailControls}
                        onMouseLeave={() => setArchiveRailHovered(false)}
                      >
                        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white/95 via-white/70 to-transparent" />
                        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/95 via-white/70 to-transparent" />

                        <button
                          type="button"
                          onClick={() => stepArchiveCategory("prev")}
                          disabled={!canLoopArchiveCategories}
                          className={cn(
                            "absolute left-1 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-sky-200/80 bg-white/58 text-sky-600 shadow-[0_16px_34px_-18px_rgba(14,165,233,0.7)] backdrop-blur-xl transition-all duration-300 ease-out md:h-11 md:w-11 md:bg-white/44 md:text-sky-500",
                            archiveRailHovered
                              ? "opacity-100 scale-100 translate-x-0 md:opacity-100"
                              : "opacity-80 scale-[0.96] md:translate-x-1 md:opacity-0",
                            canLoopArchiveCategories ? "" : "pointer-events-none border-slate-200/70 text-slate-300 shadow-none"
                          )}
                          aria-label="Geser kategori ke kiri"
                        >
                          <ChevronLeft className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => stepArchiveCategory("next")}
                          disabled={!canLoopArchiveCategories}
                          className={cn(
                            "absolute right-1 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-sky-200/80 bg-white/58 text-sky-600 shadow-[0_16px_34px_-18px_rgba(14,165,233,0.7)] backdrop-blur-xl transition-all duration-300 ease-out md:h-11 md:w-11 md:bg-white/44 md:text-sky-500",
                            archiveRailHovered
                              ? "opacity-100 scale-100 translate-x-0 md:opacity-100"
                              : "opacity-80 scale-[0.96] md:-translate-x-1 md:opacity-0",
                            canLoopArchiveCategories ? "" : "pointer-events-none border-slate-200/70 text-slate-300 shadow-none"
                          )}
                          aria-label="Geser kategori ke kanan"
                        >
                          <ChevronRight className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                        </button>

                        <div className="-mx-4 overflow-hidden px-4 md:mx-0 md:px-0">
                          <div
                            ref={archiveRailRef}
                            style={{ touchAction: 'pan-y' }}
                            className="flex snap-x snap-mandatory items-center gap-2 overflow-x-hidden overscroll-x-contain px-10 pb-2 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                          >
                          {COMMUNITY_ARCHIVE_CATEGORIES.map((item) => {
                            const active = archiveCategory === (item.key as ArchiveCategory);
                            const count = archiveCategoryCounts[item.key] || 0;

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  const nextCategory = item.key as ArchiveCategory;
                                  setArchiveCategory(nextCategory);
                                  centerArchiveCategoryChip(nextCategory);
                                }}
                                data-category-key={item.key}
                                className={cn(
                                  "inline-flex min-h-11 shrink-0 snap-center items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[12px] font-bold tracking-wide transition-all duration-300 ease-out",
                                  active
                                    ? "bg-[#00A9D6] text-white shadow-[0_18px_40px_-22px_rgba(0,169,214,0.65)]"
                                    : "border border-slate-200/85 bg-white/92 text-slate-600 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
                                )}
                              >
                                <span>{item.label}</span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[11px]",
                                    active ? "bg-white/12 text-white/90" : "bg-slate-100 text-slate-500"
                                  )}
                                >
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                          </div>
                        </div>
                      </div>

                      <div className="px-1">
                        <div
                          className={cn(
                            "h-1.5 overflow-hidden rounded-full bg-slate-200/75 transition-all duration-500 ease-out",
                            archiveRailHovered ? "opacity-100" : "opacity-70"
                          )}
                        >
                          <div
                            className={cn(
                              "h-full rounded-full bg-[linear-gradient(90deg,rgba(14,165,233,0.98),rgba(29,78,216,0.92))] shadow-[0_8px_18px_-10px_rgba(14,165,233,0.9)] transition-[width,transform,opacity] duration-500 ease-out",
                              archiveRailHovered ? "opacity-100" : "opacity-80"
                            )}
                            style={{
                              width: `${Math.max(100 / COMMUNITY_ARCHIVE_CATEGORIES.length, 18)}%`,
                              transform: `translateX(${archiveRailProgress * (COMMUNITY_ARCHIVE_CATEGORIES.length - 1) * 100}%)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Card key={index} className="overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-5 backdrop-blur-xl">
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-40 w-full rounded-[22px]" />
                        <Skeleton className="h-6 w-4/5 rounded-full" />
                        <Skeleton className="h-4 w-full rounded-full" />
                        <Skeleton className="h-4 w-3/4 rounded-full" />
                        <div className="flex gap-2 pt-2">
                          <Skeleton className="h-10 w-16 rounded-full" />
                          <Skeleton className="h-10 w-16 rounded-full" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : archiveHasBlockingError ? (
                <Card className="overflow-hidden rounded-[32px] border border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,241,242,0.92))] shadow-[0_24px_70px_-42px_rgba(244,63,94,0.35)]">
                  <CardContent className="relative flex flex-col gap-4 p-8 sm:p-10">
                    <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-rose-200/45 blur-3xl" />
                    <div className="pointer-events-none absolute left-10 top-8 h-14 w-14 rounded-full border border-rose-200/70 bg-white/55 backdrop-blur-md" />
                    <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-rose-200/70 bg-white/75 text-rose-600 shadow-[0_18px_32px_-22px_rgba(244,63,94,0.5)]">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="relative space-y-2">
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">{archiveStateTone.title}</h3>
                      <p className="max-w-2xl text-sm leading-6 text-slate-600">{archiveStateTone.description}</p>
                    </div>
                    <div className="relative flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => fetchData()}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#00A9D6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0095BE]"
                      >
                        Muat ulang arsip
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setArchiveCategory("all");
                          startTransition(() => setArchiveSearchQuery(""));
                        }}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                      >
                        Reset filter
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ) : archiveEmptyState ? (
                <Card className="overflow-hidden rounded-[32px] border border-white/75 bg-white/84 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                  <CardContent className="relative flex flex-col gap-4 p-8 sm:p-10">
                    <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-sky-100/70 blur-3xl" />
                    <div className="pointer-events-none absolute left-6 top-6 h-16 w-16 rounded-full border border-slate-200/70 bg-white/60 backdrop-blur-md" />
                    <div className="pointer-events-none absolute left-16 top-14 h-8 w-8 rounded-full border border-sky-200/80 bg-sky-50/85" />
                    <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-slate-200/75 bg-white/78 text-sky-600 shadow-[0_18px_36px_-24px_rgba(14,165,233,0.55)]">
                      <Search className="h-5 w-5" />
                    </div>
                    <div className="relative space-y-2">
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                        {deferredArchiveSearchQuery.trim() ? "Tidak ada hasil yang cocok." : "Arsip belum tersedia."}
                      </h3>
                      {deferredArchiveSearchQuery.trim() ? (
                        <p className="max-w-2xl text-sm leading-6 text-slate-600">
                          Coba kata kunci lain, atau kembalikan filter ke Semua agar lebih banyak cerita muncul.
                        </p>
                      ) : null}
                    </div>
                    <div className="relative flex flex-wrap gap-3">
                      {archiveCategory !== "all" || deferredArchiveSearchQuery.trim() ? (
                        <button
                          type="button"
                          onClick={() => {
                            setArchiveCategory("all");
                            startTransition(() => setArchiveSearchQuery(""));
                          }}
                          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#00A9D6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0095BE]"
                        >
                          Reset pencarian
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => fetchData()}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                      >
                        Muat ulang
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-6 text-slate-600">
                      {filteredArchivePosts.length} cerita siap dibaca dengan kategori{" "}
                      <span className="font-semibold text-slate-900">{archiveResultLabel}</span>.
                    </p>
                    <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      Gallery view
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filteredArchivePosts.map((post) => (
                      <CommunityArchiveGalleryCard
                        key={post.id}
                        post={post}
                        onOpen={() => handleOpenComments(post.id)}
                        onPray={() => toggleLike(post.id)}
                        onBookmark={() => toggleBookmark(post.id)}
                        onRepost={() => handleRepostFromArchive(post)}
                        reposting={repostBusyPostId === post.id}
                        onShare={() => handleShare(post.id, post.text)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-6 outline-none">
            <div className={cn(narrowColumnClassName, "space-y-6")}>
              {bookmarkLoadError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[13px] text-amber-800">
                  {bookmarkLoadError}
                </div>
              ) : null}
              <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-4 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-500">Kategori Bookmark</p>
                  <button
                    type="button"
                    onClick={async () => {
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
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Kategori Baru
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveBookmarkCategoryId("all")}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all",
                      activeBookmarkCategoryId === "all"
                        ? "bg-[#00A9D6] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Semua ({bookmarkPosts.length})
                  </button>
                  {bookmarkCategories.map((category) => {
                    const count = bookmarkPosts.filter(
                      (post) => String(post.bookmark_category?.id || "") === String(category.id)
                    ).length;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveBookmarkCategoryId(String(category.id))}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all",
                          String(activeBookmarkCategoryId) === String(category.id)
                            ? "bg-[#00A9D6] text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {category.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredBookmarkPosts.length > 0 ? (
                filteredBookmarkPosts.map((post) => (
                  <MemberPostCard
                    key={post.id}
                    authorId={post.author.id}
                    authorName={post.author.name}
                    authorAvatar={resolveAuthorAvatar(post)}
                    isAuthenticated={isAuthenticated}
                    isFollowingAuthor={Boolean(post.author.isFollowing)}
                    isMutualFollow={Boolean(post.author.isMutualFollow)}
                    canFollowAuthor={Boolean(currentUserId) && currentUserId !== post.author.id}
                    type={post.type}
                    text={post.text}
                    metadata={post.metadata}
                    imgSrc={post.imageUrl}
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
                  />
                ))
              ) : (
                <div className="max-w-[420px] px-4 pb-24 pt-12">
                  <p className="text-[15px] leading-relaxed text-foreground/70">
                    Belum ada memori rohani di kategori ini. Simpan renunganmu agar bisa dibaca lagi saat kamu butuh dikuatkan.
                  </p>
                </div>
              )}
            </div>
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
