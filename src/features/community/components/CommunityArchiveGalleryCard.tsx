"use client";

import { useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { Archive, Repeat2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "../types";
import { CommunityImageCarousel } from "./CommunityImageCarousel";
import { MemberPostActionBar } from "./MemberPostActionBar";
import { resolvePostPublicDate } from "../utils/community-lifecycle";

const CATEGORY_STYLES: Record<string, { label: string; badgeClassName: string }> = {
  quote: {
    label: "Quotes",
    badgeClassName: "bg-sky-500/12 text-sky-700 ring-sky-500/15",
  },
  reflection: {
    label: "Refleksi",
    badgeClassName: "bg-amber-500/12 text-amber-700 ring-amber-500/15",
  },
  prayer_request: {
    label: "Permohonan Doa",
    badgeClassName: "bg-rose-500/12 text-rose-700 ring-rose-500/15",
  },
  testimony: {
    label: "Kesaksian",
    badgeClassName: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/15",
  },
  user_post: {
    label: "Curahan Hati",
    badgeClassName: "bg-violet-500/12 text-violet-700 ring-violet-500/15",
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

function buildCardTitle(post: CommunityPost): string | null {
  const explicitTitle = String(post.title || "").trim();
  if (explicitTitle) return explicitTitle;
  return null;
}

function buildDisplayContent(post: CommunityPost, title: string | null): string | null {
  const text = String(post.text || "").replace(/\s+/g, " ").trim();

  if (title && text && title === text) {
    return null;
  }

  if (text) {
    return text.length > 200 ? `${text.slice(0, 200).trimEnd()}...` : text;
  }

  return null;
}

type CommunityArchiveGalleryCardProps = {
  post: CommunityPost;
  onOpen: () => void;
  onOpenComments: () => void;
  onBookmark: () => void;
  onPray: () => void;
  onRepost: () => void | Promise<void>;
  reposting?: boolean;
  onShare: () => void | Promise<void>;
  shareBusy?: boolean;
};

export function CommunityArchiveGalleryCard({
  post,
  onOpen,
  onOpenComments,
  onBookmark,
  onPray,
  onRepost,
  reposting = false,
  onShare,
  shareBusy = false,
}: CommunityArchiveGalleryCardProps) {
  const categoryMeta = CATEGORY_STYLES[post.type] ?? {
    label: post.type_label || "Komunitas",
    badgeClassName: "bg-slate-500/12 text-slate-700 ring-slate-500/15",
  };

  const title = useMemo(() => buildCardTitle(post), [post]);
  const displayContent = useMemo(() => buildDisplayContent(post, title), [post, title]);
  const authorName = String(post.author?.name || "Chosen People");
  const authorAvatar = post.author?.avatarUrl;
  const hasBodyCopy = Boolean(title || displayContent);

  const mediaList = useMemo(() => {
    const list = Array.isArray(post.mediaPaths) ? post.mediaPaths.filter(Boolean) : [];
    if (list.length > 0) return list;
    return post.imageUrl ? [post.imageUrl] : [];
  }, [post.imageUrl, post.mediaPaths]);
  const hasMedia = mediaList.length > 0;

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-interactive="true"]')) return;
    onOpen();
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-interactive="true"]')) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={`Buka Arsip: ${title || authorName}`}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-[32px] border-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium animate-in fade-in slide-in-from-bottom-4 md:rounded-[40px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-4 focus-visible:ring-offset-white",
        "bg-slate-50/60 ring-1 ring-border/50"
      )}
    >
      <CardContent className="relative flex min-w-0 flex-col p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface ring-1 ring-border/40 shadow-sm">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand/5 text-[14px] font-black uppercase text-brand">
                  {authorName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="max-w-[10rem] truncate leading-none text-[14px] font-black tracking-tight text-foreground/90 md:max-w-[14rem]">{authorName}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <span>{formatArchiveDate(resolvePostPublicDate(post) || post.createdAt)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Archive className="h-3 w-3" />
                  GALERY
                </span>
              </div>
            </div>
          </div>

          <span
            className={cn(
              "mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ring-1",
              categoryMeta.badgeClassName
            )}
          >
            {categoryMeta.label}
          </span>
        </div>

        {hasMedia ? (
          <div data-interactive="true" className="mb-4 overflow-hidden rounded-[24px] ring-1 ring-border/60">
            <CommunityImageCarousel
              images={mediaList}
              altBase={authorName ? `Arsip oleh ${authorName}` : "Gambar arsip"}
              uiVariant="archive"
              showCounter={mediaList.length > 1}
            />
          </div>
        ) : null}

        <div className={cn(hasBodyCopy ? "space-y-2" : "")}>
          {title ? (
            <h3 className="line-clamp-2 text-[18px] font-bold leading-[1.3] tracking-tight text-slate-900 md:text-[20px]">{title}</h3>
          ) : null}
          {displayContent ? (
            <p
              className={cn(
                "text-[15px] font-medium leading-relaxed text-foreground/80",
                !title && !hasMedia
                  ? "line-clamp-6 text-[18px] italic tracking-tight text-foreground md:text-[21px]"
                  : "line-clamp-5 md:line-clamp-4"
              )}
            >
              {displayContent}
            </p>
          ) : null}
          {!title && !displayContent && !hasMedia ? (
            <p className="text-[13px] italic text-muted-foreground/50">Konten kosong.</p>
          ) : null}
        </div>

        <div data-interactive="true" className={cn("border-t border-border/60 pt-4", hasBodyCopy || !hasMedia ? "mt-6" : "mt-4")}>
          <MemberPostActionBar
            postType={post.type}
            ariaLabelContext="archive"
            prayLabel={post.counts.likes.toString()}
            prayed={post.isLiked}
            commentsCount={post.counts.comments}
            bookmarked={post.isBookmarked}
            bookmarkLabel="Simpan"
            onPray={onPray}
            onOpenComments={onOpenComments}
            onShare={() => {
              void onShare();
            }}
            onBookmark={onBookmark}
            shareBusy={shareBusy}
          />

          <button
            type="button"
            data-interactive="true"
            onClick={(event) => {
              event.stopPropagation();
              void onRepost();
            }}
            disabled={reposting}
            aria-label={reposting ? "Memproses Repost ke Talks" : "Repost ke Talks"}
            className={cn(
              "mt-2 inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[11px] font-semibold transition-colors",
              reposting
                ? "cursor-not-allowed bg-slate-100/90 text-slate-400"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            )}
          >
            <Repeat2 className="h-3.5 w-3.5" />
            <span>{reposting ? "Memproses..." : "Repost ke Talks"}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
