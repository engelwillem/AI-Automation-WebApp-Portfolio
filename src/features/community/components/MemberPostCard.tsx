"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MemberPostActionBar } from "./MemberPostActionBar";
import { QuoteCard } from "./QuoteCard";

type MemberPostCardProps = {
  className?: string;
  compact?: boolean;
  authorName?: string | null;
  authorAvatar?: string | null;
  isOfficial?: boolean;
  type?: string;
  text?: string | null;
  imgSrc?: string | null;
  mediaSrcList?: string[];
  aspectRatio?: "4:5" | "og" | "auto";
  textPosition?: "above" | "below";
  prayLabel?: string;
  prayed?: boolean;
  commentsCount: number;
  bookmarked: boolean;
  bookmarkLabel: string;
  onPray?: () => void;
  onOpenComments: () => void;
  onShare: () => void | Promise<void>;
  onBookmark: () => void;
  canModerate?: boolean;
  onAdminHide?: () => void;
  onAdminExtend24h?: () => void;
  onAdminExpireNow?: () => void;
};

export function MemberPostCard({
  className,
  compact = false,
  authorName,
  authorAvatar,
  isOfficial,
  type,
  text,
  imgSrc,
  mediaSrcList,
  aspectRatio = "auto",
  textPosition = "below",
  prayLabel,
  prayed,
  commentsCount,
  bookmarked,
  bookmarkLabel,
  onPray,
  onOpenComments,
  onShare,
  onBookmark,
  canModerate = false,
  onAdminHide,
}: MemberPostCardProps) {
  const rawText = String(text ?? "").trim();
  const normalizedText =
    rawText.replace(/^\s*[\s\S]*?\*\*[^*]+\*\*[:：]?\s*/u, "").trim() || rawText.trim();
  const hasText = normalizedText.length > 0;

  const premiumQuoteAuthors = [
    "The Shepherd",
    "Sandy Prohaska",
    "Delilah Grimes",
    "Winifred Runte",
    "Ms. Dena Rempel",
    "Darrick Luettgen",
  ];
  const isPremiumQuoteAuthor = authorName && premiumQuoteAuthors.includes(authorName);

  const media = useMemo(() => {
    const list = Array.isArray(mediaSrcList) ? mediaSrcList.filter(Boolean) : [];
    if (list.length > 0) return list;
    return imgSrc ? [imgSrc] : [];
  }, [imgSrc, mediaSrcList]);

  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const hasImage = media.length > 0;
  const isQuoteCard = (isPremiumQuoteAuthor && hasText) || (!hasImage && hasText && type === "quote");
  const isTwitterStyle = !isPremiumQuoteAuthor && !hasImage && hasText && type !== "quote" && normalizedText.length < 140;

  const moveMedia = (dir: -1 | 1) => {
    if (media.length <= 1) return;
    setActiveMediaIdx((prev) => (prev + dir + media.length) % media.length);
  };

  const actionBar = (
    <MemberPostActionBar
      postType={type}
      prayLabel={prayLabel}
      prayed={prayed}
      commentsCount={commentsCount}
      bookmarked={bookmarked}
      bookmarkLabel={bookmarkLabel}
      onPray={onPray}
      onOpenComments={onOpenComments}
      onShare={onShare}
      onBookmark={onBookmark}
    />
  );

  if (isQuoteCard) {
    return (
      <QuoteCard
        quote={normalizedText}
        authorName={authorName}
        className={className}
        actionSlot={actionBar}
        compact={compact}
      />
    );
  }

  const currentMedia = media[Math.min(activeMediaIdx, Math.max(0, media.length - 1))] ?? null;

  return (
    <Card
      className={cn(
        "rounded-[32px] bg-surface shadow-card border border-border/70 overflow-hidden transition-all duration-300 hover:shadow-premium animate-in fade-in slide-in-from-bottom-4",
        className
      )}
    >
      <CardHeader
        className={cn(
          "transition-all duration-500",
          compact ? "pb-2 px-5 pt-5 md:px-6 md:pt-6" : "pb-2 px-6 pt-6 md:px-8 md:pt-8"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 group/author cursor-pointer">
            <div className="relative h-11 w-11 shrink-0">
              {/* Avatar Glow */}
              <div className="absolute -inset-1 rounded-full bg-brand/25 opacity-0 blur transition duration-500 group-hover/author:opacity-100" />
              <div className="relative h-full w-full rounded-full bg-surface-muted flex items-center justify-center overflow-hidden border border-border/60 ring-1 ring-border/60 shadow-sm transition-transform duration-500 group-hover/author:scale-105">
                {authorAvatar ? (
                    <img src={authorAvatar} alt={authorName ?? ""} className="h-full w-full object-cover" />
                ) : (
                    <>
                        <div className="bg-brand/15 absolute inset-0" />
                        <span className="relative text-brand text-[11px] font-black uppercase tracking-widest">
                        {(authorName ?? "U")[0]}
                        </span>
                    </>
                )}
              </div>
            </div>
            <div>
              <CardTitle className="text-[16px] font-black tracking-tight text-foreground group-hover/author:text-brand transition-colors">
                {authorName ?? "Unknown"}
              </CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Baru Saja</p>
                {isOfficial && (
                  <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-brand ring-1 ring-inset ring-brand/20">
                    <div className="h-1 w-1 rounded-full bg-brand animate-pulse" />
                    Official
                  </span>
                )}
              </div>
            </div>
          </div>
          {canModerate && (
            <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
              <button
                onClick={onAdminHide}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-surface-muted text-muted-foreground hover:bg-brand/10 hover:text-brand transition-colors"
              >
                <span className="text-[10px] font-black">×</span>
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn("flex flex-col gap-4", compact ? "px-5 pb-5" : "px-6 pb-6 md:px-8 md:pb-8")}>
        {/* Text Above Layout */}
        {hasText && textPosition === "above" && !isTwitterStyle && (
          <p className="text-[16px] leading-relaxed text-foreground font-medium px-1">
            {normalizedText}
          </p>
        )}

        {/* Media Container */}
        {hasImage ? (
          <div className="relative group">
            <div
              className={cn(
                "relative overflow-hidden rounded-[24px] shadow-lg ring-1 ring-border/60 bg-surface-muted",
                aspectRatio === "4:5" ? "aspect-[4/5]" : "aspect-[1.91/1]"
              )}
            >
              {currentMedia && (
                <img
                  src={currentMedia}
                  alt="Content"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              )}

              {media.length > 1 && (
                <>
                  <button
                    onClick={() => moveMedia(-1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => moveMedia(1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* Twitter Style Text */}
        {isTwitterStyle && (
          <div className="relative py-8 px-6 rounded-[32px] bg-surface-muted/80 ring-1 ring-border/60 shadow-inner overflow-hidden">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/8 blur-3xl" />
            <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-brand/6 blur-3xl" />

            <p className="relative z-10 text-[21px] md:text-[24px] font-bold leading-relaxed tracking-tight text-foreground italic">
              {normalizedText}
            </p>
          </div>
        )}

        {/* Standard Text Below */}
        {hasText && textPosition === "below" && !isTwitterStyle && (
          <p className="text-[16px] leading-relaxed text-foreground font-medium px-1">
            {normalizedText}
          </p>
        )}

        <div className="h-px bg-border/70 mt-2" />
        {actionBar}
      </CardContent>
    </Card>
  );
}
