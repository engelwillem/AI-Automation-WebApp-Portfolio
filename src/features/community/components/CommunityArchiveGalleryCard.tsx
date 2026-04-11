"use client";

import { useMemo } from "react";
import { ArrowUpRight, Bookmark, Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "../types";
import { CommunityImageCarousel } from "./CommunityImageCarousel";

const CATEGORY_STYLES: Record<string, { label: string; badgeClassName: string; accentClassName: string }> = {
  quote: {
    label: "Quotes",
    badgeClassName: "bg-sky-500/12 text-sky-700 ring-sky-500/15",
    accentClassName: "from-sky-500/14 via-sky-500/6 to-transparent",
  },
  reflection: {
    label: "Refleksi",
    badgeClassName: "bg-amber-500/12 text-amber-700 ring-amber-500/15",
    accentClassName: "from-amber-500/16 via-amber-500/7 to-transparent",
  },
  prayer_request: {
    label: "Permohonan Doa",
    badgeClassName: "bg-rose-500/12 text-rose-700 ring-rose-500/15",
    accentClassName: "from-rose-500/16 via-rose-500/7 to-transparent",
  },
  testimony: {
    label: "Kesaksian",
    badgeClassName: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/15",
    accentClassName: "from-emerald-500/16 via-emerald-500/7 to-transparent",
  },
  user_post: {
    label: "Curahan Hati",
    badgeClassName: "bg-violet-500/12 text-violet-700 ring-violet-500/15",
    accentClassName: "from-violet-500/16 via-violet-500/7 to-transparent",
  },
};

function formatArchiveDate(value?: string | null): string {
  if (!value) return "Baru saja";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Baru saja";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildCardTitle(post: CommunityPost, fallbackLabel: string): string {
  const explicitTitle = String(post.title || "").trim();
  if (explicitTitle) return explicitTitle;

  const source = String(post.text || "").replace(/\s+/g, " ").trim();
  if (!source) return fallbackLabel;

  return source.length > 72 ? `${source.slice(0, 72).trimEnd()}...` : source;
}

function buildExcerpt(post: CommunityPost): string {
  const source = String(post.text || "").replace(/\s+/g, " ").trim();
  if (!source) return "Belum ada ringkasan yang tersedia untuk konten ini.";
  return source.length > 180 ? `${source.slice(0, 180).trimEnd()}...` : source;
}

type CommunityArchiveGalleryCardProps = {
  post: CommunityPost;
  onOpen: () => void;
  onBookmark: () => void;
  onPray: () => void;
  onRepost: () => void | Promise<void>;
  reposting?: boolean;
  onShare: () => void | Promise<void>;
};

export function CommunityArchiveGalleryCard({
  post,
  onOpen,
  onBookmark,
  onPray,
  onRepost,
  reposting = false,
  onShare,
}: CommunityArchiveGalleryCardProps) {
  const categoryMeta = CATEGORY_STYLES[post.type] ?? {
    label: post.type_label || "Komunitas",
    badgeClassName: "bg-slate-500/12 text-slate-700 ring-slate-500/15",
    accentClassName: "from-slate-500/14 via-slate-500/6 to-transparent",
  };

  const title = useMemo(() => buildCardTitle(post, categoryMeta.label), [categoryMeta.label, post]);
  const excerpt = useMemo(() => buildExcerpt(post), [post]);
  const authorName = String(post.author?.name || "Chosen People");
  const mediaList = useMemo(() => {
    const list = Array.isArray(post.mediaPaths) ? post.mediaPaths.filter(Boolean) : [];
    if (list.length > 0) return list;
    return post.imageUrl ? [post.imageUrl] : [];
  }, [post.imageUrl, post.mediaPaths]);
  const hasMedia = mediaList.length > 0;

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_42px_-28px_rgba(15,23,42,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_54px_-30px_rgba(15,23,42,0.35)]">
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-10 rounded-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
        aria-label={`Buka ${title}`}
      />

      <div className="relative flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ring-1",
                categoryMeta.badgeClassName
              )}
            >
              {categoryMeta.label}
            </span>
            <span className="truncate text-[11px] font-semibold text-slate-500">{formatArchiveDate(post.createdAt)}</span>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onBookmark();
            }}
            className={cn(
              "relative z-20 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
              post.isBookmarked
                ? "border-amber-300/70 bg-amber-50 text-amber-700"
                : "border-slate-200/80 bg-white/90 text-slate-500 hover:border-slate-300 hover:text-slate-800"
            )}
            aria-label={post.isBookmarked ? "Hapus dari simpanan" : "Simpan konten"}
          >
            <Bookmark className={cn("h-4 w-4", post.isBookmarked && "fill-current")} />
          </button>
        </div>

        {hasMedia ? (
          <div className="relative z-20 mt-4 rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-1.5">
            <CommunityImageCarousel
              images={mediaList}
              altBase={authorName ? `Post arsip oleh ${authorName}` : "Gambar arsip"}
              className="w-full"
              viewportClassName="w-full"
              ratioClassName="aspect-[4/3]"
              uiVariant="archive"
              showCounter={mediaList.length > 1}
            />
          </div>
        ) : (
          <div className="mt-4 rounded-[22px] border border-dashed border-slate-200/80 bg-slate-50/70 p-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Arsip Community</p>
            <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-slate-600">{excerpt}</p>
          </div>
        )}

        <div className="mt-5 flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{authorName}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              Buka
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-[18px] font-bold leading-[1.3] tracking-tight text-slate-900">{title}</h3>
          <p className="mt-2.5 line-clamp-3 text-[14px] leading-6 text-slate-600">{excerpt}</p>
        </div>

        <div className="relative z-20 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 text-slate-500">
          <div className="flex items-center gap-1 text-[12px] font-semibold">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPray();
              }}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full px-3 transition-colors",
                post.isLiked ? "bg-rose-50 text-rose-700" : "hover:bg-slate-100/80 hover:text-slate-800"
              )}
              aria-label="Sukai konten"
            >
              <Heart className={cn("h-4 w-4", post.isLiked && "fill-current")} />
              <span>{post.counts.likes}</span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 hover:bg-slate-100/80 hover:text-slate-800"
              aria-label="Buka komentar"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.counts.comments}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void onShare();
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[12px] font-semibold hover:bg-slate-100/80 hover:text-slate-800"
              aria-label="Bagikan konten"
            >
              <Share2 className="h-4 w-4" />
              <span>Bagikan</span>
            </button>

            <button
              type="button"
              disabled={reposting}
              onClick={(event) => {
                event.stopPropagation();
                void onRepost();
              }}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[12px] font-semibold transition-colors",
                reposting ? "cursor-not-allowed bg-slate-100/80 text-slate-400" : "hover:bg-slate-100/80 hover:text-slate-800"
              )}
              aria-label="Repost ke diskusi"
            >
              <Repeat2 className="h-4 w-4" />
              <span>{reposting ? "Memposting..." : "Repost"}</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
