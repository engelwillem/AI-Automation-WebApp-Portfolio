"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ActionBar } from "./ActionBar";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type FeaturedVerse = {
  ref: string;
  href: string;
  text: string;
  reference: string;
};

function VerseQuoteRail({ text }: { text: string }) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((x) => x.trimEnd());

  return (
    <blockquote className="relative pl-10">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-0 top-0 text-muted-foreground/60"
        aria-hidden
      >
        <path d="M10 11H6V7a4 4 0 0 1 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M18 11h-4V7a4 4 0 0 1 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M10 11v6H6v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 11v6h-4v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="min-w-0 pt-0.5 pr-1">
        <div className="text-[17px] leading-8 tracking-[-0.01em] md:text-[24px] md:leading-[1.75]">
          {lines.map((line, idx) => (
            <span key={idx}>
              {line}
              {idx < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </div>
      </div>
    </blockquote>
  );
}

export function VerseHubFeaturedCard({
  verse,
  postId,
  onOpenComments,
}: {
  verse: FeaturedVerse | null | undefined;
  postId?: string;
  onOpenComments?: (id: string) => void;
}) {
  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "";
  
  const ogImageUrl = useMemo(() => {
    if (!verse?.ref) return null;
    return `/versehub/id/${verse.ref}/og.png`;
  }, [verse?.ref]);

  const verseHref = verse?.href?.trim() || (verse?.ref ? `/versehub/id/${verse.ref}` : "/versehub/id");
  
  const reactionKey = useMemo(
    () => (verse?.ref ? `tct:versehub:featured:reactions:${verse.ref}` : "tct:versehub:featured:reactions:default"),
    [verse?.ref]
  );
  
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeBase] = useState(124);
  const [bookmarkBase] = useState(37);
  const [commentsCount] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(reactionKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { liked?: boolean; bookmarked?: boolean };
      setLiked(Boolean(parsed?.liked));
      setBookmarked(Boolean(parsed?.bookmarked));
    } catch {
      // ignore
    }
  }, [reactionKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        reactionKey,
        JSON.stringify({
          liked,
          bookmarked,
        })
      );
    } catch {
      // ignore
    }
  }, [reactionKey, liked, bookmarked]);

  const onShare = async () => {
    const url = `${shareOrigin}${verseHref}`;
    const title = verse?.reference || "VerseHub";

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return;
      }
    } catch {
      // ignore and fallback
    }
  };

  if (!verse) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-3">
        <a
          href="/versehub/id"
          className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border/70 transition hover:text-foreground backdrop-blur"
          aria-label="Buka VerseHub"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
          VerseHub
        </a>

        <a href={verseHref} className="mt-1 block max-w-full" aria-label={`Buka ayat ${verse.reference}`}>
          <h2 className="text-2xl font-black text-brand hover:underline tracking-tight">{verse.reference}</h2>
        </a>
      </div>

      <Card className="rounded-[32px] bg-surface/80 p-5 shadow-card ring-1 ring-border/60 backdrop-blur-xl transition-all hover:bg-surface-elevated">
        <a href={verseHref} className="mt-1 block overflow-hidden rounded-2xl ring-1 ring-border/60" aria-label={`Buka OG ayat ${verse.reference}`}>
          <img
            src={ogImageUrl ?? `/versehub/id/${verse.ref}/og.png`}
            alt={`OG image ${verse.reference}`}
            className="aspect-[1200/630] w-full object-cover transition-transform duration-700 hover:scale-105"
            loading="lazy"
          />
        </a>
      </Card>

      <Card className="rounded-[32px] bg-surface/80 shadow-card ring-1 ring-border/60 backdrop-blur-xl">
        <CardContent className="p-7 md:p-9">
          <a href={verseHref} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label={`Buka ayat ${verse.reference}`}>
            <VerseQuoteRail text={verse.text} />
          </a>

          <div className="mt-6">
            <div className="h-px bg-border/70" aria-hidden />
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <button
                type="button"
                onClick={() => window.location.assign(verseHref)}
                className="tct-pressable inline-flex items-center justify-center rounded-2xl bg-brand px-4 py-2.5 font-bold text-brand-foreground transition-all hover:opacity-90"
              >
                Baca Alkitab hari ini
              </button>

              <ActionBar
                prayLabel={String(liked ? likeBase + 1 : likeBase)}
                prayed={liked}
                commentsCount={commentsCount}
                bookmarked={bookmarked}
                bookmarkLabel={String(bookmarked ? bookmarkBase + 1 : bookmarkBase)}
                onPray={() => setLiked((v) => !v)}
                onOpenComments={() => {
                  if (postId && onOpenComments) {
                    onOpenComments(postId);
                  } else {
                    window.location.assign(`${verseHref}#comments`);
                  }
                }}
                onShare={onShare}
                onBookmark={() => setBookmarked((v) => !v)}
                className="w-full justify-end lg:w-auto"
                splitSave
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
