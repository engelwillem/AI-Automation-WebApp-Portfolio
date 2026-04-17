"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  COMMUNITY_ARCHIVE_CATEGORIES,
  type CommunityArchiveCategory,
} from "../categories";
import { CommunityArchiveGalleryCard } from "./CommunityArchiveGalleryCard";
import { CommunityArchiveDetailDialog } from "./CommunityArchiveDetailDialog";
import type { CommunityPost } from "../types";
import {
  DISCUSSION_WINDOW_MS,
  resolvePostPublicDate,
  sortByNewest,
} from "../utils/community-lifecycle";

type ArchiveCategory = CommunityArchiveCategory;
type ArchiveSort = "newest" | "popular" | "relevant";

function toMonthKey(value?: string | null): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toMonthLabel(value?: string | null): string {
  if (!value) return "Tanpa tanggal";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanpa tanggal";
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);
}

function getArchiveSortLabel(sort: ArchiveSort): string {
  if (sort === "popular") return "Terpopuler";
  if (sort === "relevant") return "Paling relevan";
  return "Terbaru";
}

type CommunityArchiveTabProps = {
  className?: string;
  isLoading: boolean;
  fetchError: string | null;
  publicArchivePosts: CommunityPost[];
  repostBusyPostId: string | null;
  onRefresh: () => void;
  onOpenComments: (postId: string) => void;
  onPray: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onRepost: (post: CommunityPost) => void | Promise<void>;
  onShare: (postId: string, text?: string | null) => void | Promise<void>;
  shareBusyPostId?: string | null;
};

export function CommunityArchiveTab({
  className,
  isLoading,
  fetchError,
  publicArchivePosts,
  repostBusyPostId,
  onRefresh,
  onOpenComments,
  onPray,
  onBookmark,
  onRepost,
  onShare,
  shareBusyPostId,
}: CommunityArchiveTabProps) {
  const [archiveCategory, setArchiveCategory] = useState<ArchiveCategory>("all");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [archiveSort, setArchiveSort] = useState<ArchiveSort>("newest");
  const [activeArchiveDetailPostId, setActiveArchiveDetailPostId] = useState<string | null>(null);
  const [archiveRailHovered, setArchiveRailHovered] = useState(false);
  const archiveRailRef = useRef<HTMLDivElement | null>(null);
  const deferredArchiveSearchQuery = useDeferredValue(archiveSearchQuery);

  const activeArchiveCategoryIndex = useMemo(
    () =>
      Math.max(
        COMMUNITY_ARCHIVE_CATEGORIES.findIndex((item) => item.key === archiveCategory),
        0,
      ),
    [archiveCategory],
  );

  const archiveRailProgress = useMemo(() => {
    if (COMMUNITY_ARCHIVE_CATEGORIES.length <= 1) return 0;
    return activeArchiveCategoryIndex / (COMMUNITY_ARCHIVE_CATEGORIES.length - 1);
  }, [activeArchiveCategoryIndex]);

  const centerArchiveCategoryChip = (nextCategory: ArchiveCategory) => {
    const rail = archiveRailRef.current;
    if (!rail) return;

    const activeChip = rail.querySelector<HTMLButtonElement>(`[data-category-key="${nextCategory}"]`);
    if (!activeChip) return;

    activeChip.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const stepArchiveCategory = (direction: "prev" | "next") => {
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
  };

  const canLoopArchiveCategories = COMMUNITY_ARCHIVE_CATEGORIES.length > 1;

  const revealArchiveRailControls = () => {
    setArchiveRailHovered(true);
  };

  useEffect(() => {
    const rail = archiveRailRef.current;
    if (!rail) return;

    centerArchiveCategoryChip(archiveCategory);
  }, [archiveCategory]);

  useEffect(() => {
    if (isLoading) {
      setActiveArchiveDetailPostId(null);
      return;
    }

    if (!activeArchiveDetailPostId) return;
    const exists = publicArchivePosts.some((post) => post.id === activeArchiveDetailPostId);
    if (!exists) {
      setActiveArchiveDetailPostId(null);
    }
  }, [activeArchiveDetailPostId, isLoading, publicArchivePosts]);

  const archiveCategoryCounts = useMemo(() => {
    return publicArchivePosts.reduce<Record<string, number>>(
      (acc, post) => {
        acc.all += 1;
        acc[post.type] = (acc[post.type] || 0) + 1;
        return acc;
      },
      { all: 0 },
    );
  }, [publicArchivePosts]);

  const filteredArchivePosts = useMemo(() => {
    const normalizedQuery = deferredArchiveSearchQuery.trim().toLowerCase();
    const filtered = publicArchivePosts.filter((post) => {
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

    const calcEngagement = (post: CommunityPost) =>
      (Number(post.counts.likes) || 0) * 2 +
      (Number(post.counts.comments) || 0) * 3 +
      (Number(post.counts.bookmarks) || 0) * 4;

    const calcRecency = (post: CommunityPost) => {
      const timestamp = new Date(resolvePostPublicDate(post) || post.createdAt).getTime();
      if (Number.isNaN(timestamp)) return 0;
      return timestamp;
    };

    const calcRelevance = (post: CommunityPost) => {
      const engagement = calcEngagement(post);
      const recencyScore = calcRecency(post) / 1000;
      const habitBoost =
        (post.isLiked ? 120 : 0) +
        (post.isBookmarked ? 180 : 0) +
        (post.author?.isFollowing ? 80 : 0);
      const queryBoost = normalizedQuery ? 150 : 60;
      return engagement + recencyScore + habitBoost + queryBoost;
    };

    return [...filtered].sort((a, b) => {
      if (archiveSort === "popular") {
        return calcEngagement(b) - calcEngagement(a) || calcRecency(b) - calcRecency(a);
      }
      if (archiveSort === "relevant") {
        return calcRelevance(b) - calcRelevance(a) || calcRecency(b) - calcRecency(a);
      }
      return calcRecency(b) - calcRecency(a);
    });
  }, [archiveCategory, archiveSort, deferredArchiveSearchQuery, publicArchivePosts]);

  const groupedArchivePosts = useMemo(() => {
    const groups = new Map<string, { monthLabel: string; posts: CommunityPost[] }>();

    filteredArchivePosts.forEach((post) => {
      const publicDate = resolvePostPublicDate(post);
      const monthKey = toMonthKey(publicDate);
      const current = groups.get(monthKey);
      if (current) {
        current.posts.push(post);
        return;
      }

      groups.set(monthKey, {
        monthLabel: toMonthLabel(publicDate),
        posts: [post],
      });
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, value]) => ({
        monthKey: key,
        monthLabel: value.monthLabel,
        posts: value.posts,
      }));
  }, [filteredArchivePosts]);

  const activeArchiveDetailPost = useMemo(
    () => publicArchivePosts.find((post) => post.id === activeArchiveDetailPostId) ?? null,
    [activeArchiveDetailPostId, publicArchivePosts],
  );

  const archiveResultLabel = useMemo(() => {
    if (deferredArchiveSearchQuery.trim()) {
      return `Hasil untuk "${deferredArchiveSearchQuery.trim()}"`;
    }

    const activeCategory = COMMUNITY_ARCHIVE_CATEGORIES.find((item) => item.key === archiveCategory);
    return activeCategory?.label || "Semua";
  }, [archiveCategory, deferredArchiveSearchQuery]);

  const archiveEmptyCopy = useMemo(() => {
    const query = deferredArchiveSearchQuery.trim();
    const hasQuery = query.length > 0;
    const activeCategory = COMMUNITY_ARCHIVE_CATEGORIES.find((item) => item.key === archiveCategory);
    const activeCategoryLabel = activeCategory?.label || "Semua";
    const activeSortLabel = getArchiveSortLabel(archiveSort);

    if (!hasQuery && archiveCategory === "all" && archiveSort === "newest") {
      return {
        title: "Arsip belum tersedia",
        description: "",
      };
    }

    if (hasQuery) {
      return {
        title: `Tidak ada hasil untuk "${query}"`,
        description:
          archiveCategory === "all"
            ? `Coba kata kunci lain atau ubah urutan dari ${activeSortLabel}.`
            : `Tidak ada hasil di kategori ${activeCategoryLabel}. Coba kata kunci lain atau ubah urutan.`,
      };
    }

    if (archiveCategory !== "all") {
      return {
        title: `Belum ada konten di ${activeCategoryLabel}`,
        description: `Kategori ini kosong untuk urutan ${activeSortLabel}.`,
      };
    }

    return {
      title: "Arsip belum tersedia",
      description: `Belum ada konten untuk urutan ${activeSortLabel}.`,
    };
  }, [archiveCategory, archiveSort, deferredArchiveSearchQuery]);

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
    <div className={cn("space-y-8", className)}>
      <section className="relative z-20">
        <div className="overflow-visible rounded-[30px] border border-white/75 bg-white/80 p-4 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.42)] backdrop-blur-xl md:p-5 lg:p-6">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(250px,320px)] xl:items-end">
              <div className="min-w-0 space-y-1">
                <h2 className="tct-serif text-[28px] leading-tight tracking-tight text-slate-900">
                  Galeri Talks Komunitas
                </h2>
                <p className="text-[13px] font-medium text-slate-500">Postingan lama Talks ada di sini</p>
              </div>

              <div className="min-w-0 rounded-[22px] bg-slate-950/[0.045] px-4 py-3 text-left">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Hasil terlihat</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{filteredArchivePosts.length}</p>
                <p className="mt-1 truncate text-sm text-slate-500">{archiveResultLabel}</p>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(250px,320px)]">
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
                  aria-label="Cari konten GALERY"
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

              <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-[18px] border border-slate-200/80 bg-white px-3.5">
                <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Urutkan
                </span>
                <select
                  value={archiveSort}
                  onChange={(event) => setArchiveSort(event.target.value as ArchiveSort)}
                  className="min-w-0 w-full bg-transparent pr-1 text-[13px] font-semibold text-slate-800 outline-none"
                  aria-label="Urutkan konten GALERY"
                >
                  <option value="newest">Terbaru</option>
                  <option value="popular">Terpopuler</option>
                  <option value="relevant">Paling relevan</option>
                </select>
              </label>
            </div>

            <div className="space-y-3">
              <div
                className="relative"
                onMouseEnter={revealArchiveRailControls}
                onMouseMove={revealArchiveRailControls}
                onPointerEnter={revealArchiveRailControls}
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
                      ? "opacity-100 scale-100 translate-x-0"
                      : "opacity-80 scale-[0.96]",
                    canLoopArchiveCategories ? "" : "pointer-events-none border-slate-200/70 text-slate-300 shadow-none",
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
                      ? "opacity-100 scale-100 translate-x-0"
                      : "opacity-80 scale-[0.96]",
                    canLoopArchiveCategories ? "" : "pointer-events-none border-slate-200/70 text-slate-300 shadow-none",
                  )}
                  aria-label="Geser kategori ke kanan"
                >
                  <ChevronRight className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                </button>

                <div className="-mx-4 overflow-hidden px-4 md:mx-0 md:px-0">
                  <div
                    ref={archiveRailRef}
                    style={{ touchAction: "pan-y" }}
                    className="flex snap-x snap-mandatory items-center gap-2 overflow-x-auto overscroll-x-contain px-10 pb-2 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
                              : "border border-slate-200/85 bg-white/92 text-slate-600 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900",
                          )}
                        >
                          <span>{item.label}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px]",
                              active ? "bg-white/12 text-white/90" : "bg-slate-100 text-slate-500",
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
                    archiveRailHovered ? "opacity-100" : "opacity-70",
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-full bg-[linear-gradient(90deg,rgba(14,165,233,0.98),rgba(29,78,216,0.92))] shadow-[0_8px_18px_-10px_rgba(14,165,233,0.9)] transition-[width,transform,opacity] duration-500 ease-out",
                      archiveRailHovered ? "opacity-100" : "opacity-80",
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
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
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
                onClick={onRefresh}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#00A9D6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0095BE]"
              >
                Refresh
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
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">{archiveEmptyCopy.title}</h3>
              {archiveEmptyCopy.description ? (
                <p className="max-w-2xl text-sm leading-6 text-slate-600">{archiveEmptyCopy.description}</p>
              ) : null}
            </div>
            <div className="relative flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setArchiveCategory("all");
                  setArchiveSort("newest");
                  startTransition(() => setArchiveSearchQuery(""));
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#00A9D6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0095BE] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={archiveCategory === "all" && !deferredArchiveSearchQuery.trim() && archiveSort === "newest"}
              >
                Reset pencarian
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Refresh
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupedArchivePosts.map((group) => (
            <section key={group.monthKey} className="space-y-3">
              <header className="flex items-center gap-3 px-1">
                <h3 className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-500">{group.monthLabel}</h3>
                <div className="h-px flex-1 bg-slate-200/80" />
              </header>
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {group.posts.map((post) => (
                  <div key={post.id} className="min-w-0">
                    <CommunityArchiveGalleryCard
                      post={post}
                      onOpen={() => setActiveArchiveDetailPostId(post.id)}
                      onOpenComments={() => onOpenComments(post.id)}
                      onPray={() => onPray(post.id)}
                      onBookmark={() => onBookmark(post.id)}
                      onRepost={() => onRepost(post)}
                      reposting={repostBusyPostId === post.id}
                      onShare={() => onShare(post.id, post.text)}
                      shareBusy={shareBusyPostId === post.id}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <CommunityArchiveDetailDialog
        open={Boolean(activeArchiveDetailPostId)}
        onOpenChange={(open) => {
          if (!open) setActiveArchiveDetailPostId(null);
        }}
        post={activeArchiveDetailPost}
        onOpenComments={() => {
          if (!activeArchiveDetailPost?.id) return;
          onOpenComments(activeArchiveDetailPost.id);
        }}
        onPray={() => {
          if (!activeArchiveDetailPost?.id) return;
          onPray(activeArchiveDetailPost.id);
        }}
        onBookmark={() => {
          if (!activeArchiveDetailPost?.id) return;
          onBookmark(activeArchiveDetailPost.id);
        }}
        onRepost={() => {
          if (!activeArchiveDetailPost) return;
          return onRepost(activeArchiveDetailPost);
        }}
        reposting={activeArchiveDetailPost ? repostBusyPostId === activeArchiveDetailPost.id : false}
        onShare={() => {
          if (!activeArchiveDetailPost?.id) return;
          return onShare(activeArchiveDetailPost.id, activeArchiveDetailPost.text);
        }}
      />
    </div>
  );
}
