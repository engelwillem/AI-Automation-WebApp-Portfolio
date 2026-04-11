"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Heart, Loader2, MessageSquare, MessageSquareText, Reply, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerseData } from "@/features/versehub/types";
import { buildAppAuthHeaders, fetchWithAppAuth } from "@/lib/app-auth-fetch";
import { useMutationRefreshTick } from "@/hooks/use-mutation-refresh-tick";

interface VerseFocusCardProps {
  bookmarked: boolean;
  bookmarkCount: number;
  chapterRouteFromVerse: string;
  lang: string;
  liked: boolean;
  likeCount: number;
  onBackToReader: () => void;
  onBookmark: () => void;
  onLike: () => void;
  onOpenImage: () => void;
  onShare: () => void;
  verseData: VerseData;
}

type VerseComment = {
  id: string;
  text: string;
  createdAt?: string | null;
  replyToId?: string | null;
  replyToAuthor?: string | null;
  author: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isOfficial?: boolean;
  };
};

export function VerseFocusCard({
  bookmarked,
  bookmarkCount,
  chapterRouteFromVerse,
  lang,
  liked,
  likeCount,
  onBackToReader,
  onBookmark,
  onLike,
  onOpenImage,
  onShare,
  verseData,
}: VerseFocusCardProps) {
  const refreshTick = useMutationRefreshTick([`/api/versehub/${lang}/`]);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const [ogImageSrc, setOgImageSrc] = useState<string>(verseData.og_image_url || "/og/today-share.png");
  const [comments, setComments] = useState<VerseComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const commentsCount = comments.length;

  const commentEndpoint = useMemo(
    () => `/api/versehub/${lang}/${verseData.ref}/comments`,
    [lang, verseData.ref]
  );

  useEffect(() => {
    setOgImageSrc(verseData.og_image_url || "/og/today-share.png");
  }, [verseData.og_image_url]);

  useEffect(() => {
    let cancelled = false;

    const loadComments = async () => {
      setLoadingComments(true);
      setCommentError(null);

      try {
        const response = await fetch(commentEndpoint, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });
        const payload = await response.json().catch(() => ({}));
        const list = Array.isArray(payload?.data?.comments) ? payload.data.comments : [];
        if (cancelled) return;
        setComments(list);
      } catch {
        if (cancelled) return;
        setCommentError("Komentar belum dapat dimuat.");
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    };

    void loadComments();
    return () => {
      cancelled = true;
    };
  }, [commentEndpoint, refreshTick]);

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingComment) return;
    const body = commentText.trim();
    if (!body) return;

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const response = await fetchWithAppAuth(commentEndpoint, {
        method: "POST",
        headers: buildAppAuthHeaders({
          contentType: "application/json",
        }),
        body: JSON.stringify({
          body,
          reply_to_id: replyTo?.id ? Number(replyTo.id) : null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Masuk dulu untuk ikut komentar.");
        }
        throw new Error(payload?.message || "Komentar gagal dikirim.");
      }

      const added = payload?.data?.comment as VerseComment | undefined;
      if (added) {
        setComments((prev) => [...prev, added]);
      }
      setCommentText("");
      setReplyTo(null);
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "Komentar gagal dikirim.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleOpenComments = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-8">
      <section className="flex justify-end">
        <button
          type="button"
          onClick={onBackToReader}
          className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60 transition hover:bg-foreground/10 dark:bg-white/10"
          aria-label={`Kembali ke reader ${chapterRouteFromVerse}`}
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Reader
        </button>
      </section>

      <section className="glass-panel group overflow-hidden rounded-[40px] p-4 md:p-5">
        <div className="overflow-hidden rounded-[24px] ring-1 ring-black/[0.04] md:rounded-[32px]">
          <img
            src={ogImageSrc}
            alt="Shared Verse"
            className="aspect-[1200/630] w-full cursor-zoom-in object-cover transition-transform duration-700 group-hover:scale-105"
            onClick={onOpenImage}
            loading="lazy"
            onError={() => setOgImageSrc("/og/today-share.png")}
          />
        </div>
      </section>

      <section className="glass-panel overflow-hidden rounded-[40px]">
        <div className="p-5 md:p-7">
          <blockquote className="relative">
            <div className="absolute left-1 top-1 text-slate-400/10" aria-hidden>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 11H6V7a4 4 0 0 1 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 11h-4V7a4 4 0 0 1 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 11v6H6v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 11v6h-4v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="pl-8 pr-1 md:pl-12">
              <div className="text-[20px] italic leading-[1.9] text-slate-800/95 md:text-[23px] md:leading-[1.95]">
                {verseData.text}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-400/80">
                <span className="uppercase tracking-[0.2em]">{verseData.provider ?? "versehub"}</span>
                {verseData.translation_name && (
                  <>
                    <span className="opacity-40">|</span>
                    <span className="tracking-widest">{verseData.translation_name}</span>
                  </>
                )}
              </div>
            </div>
          </blockquote>

          <div className="mt-10 flex items-center justify-between border-t border-black/5 pt-6">
            <div className="flex items-center gap-1">
              <button
                onClick={onLike}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-full px-5 transition-all active:scale-90",
                  liked ? "bg-rose-500/10 text-rose-500" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <Heart className={cn("h-5 w-5", liked ? "fill-current" : "")} />
                <span className="text-sm font-bold tabular-nums">{liked ? `You + ${likeCount - 1}` : likeCount}</span>
              </button>

              <button
                onClick={handleOpenComments}
                className="flex h-11 items-center justify-center gap-2 rounded-full px-4 text-slate-500 transition-all hover:bg-slate-100 active:scale-95"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-sm font-bold tabular-nums">{commentsCount}</span>
              </button>

              <button
                onClick={onShare}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 active:scale-95"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={onBookmark}
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-full px-5 transition-all active:scale-95",
                bookmarked ? "bg-[#2A67FF]/10 text-[#2A67FF]" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <Bookmark className={cn("h-5 w-5", bookmarked ? "fill-current" : "")} />
              <span className="text-sm font-bold tabular-nums">{bookmarked ? `You + ${bookmarkCount - 1}` : bookmarkCount}</span>
            </button>
          </div>
        </div>
      </section>

      <section ref={commentsSectionRef} className="glass-panel overflow-hidden rounded-[34px] p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-[#91A0C7]">Komentar</h3>
          <p className="text-xs font-bold text-foreground/55">{commentsCount} diskusi</p>
        </div>

        <div className="mt-4 max-h-[340px] space-y-3 overflow-y-auto pr-1">
          {loadingComments ? (
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat komentar...
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-foreground/55">Belum ada komentar. Jadi yang pertama menulis.</p>
          ) : (
            comments.map((comment) => (
              <article key={comment.id} className="rounded-2xl bg-white/70 p-3 ring-1 ring-black/[0.05]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#2A67FF]/10 text-[11px] font-black text-[#2A67FF]">
                      {comment.author.avatarUrl ? (
                        <img src={comment.author.avatarUrl} alt={comment.author.name} className="h-full w-full object-cover" />
                      ) : (
                        <span>{comment.author.name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <p className="text-xs font-black text-foreground/80">
                      {comment.author.name}
                      {comment.author.isOfficial ? " Official" : ""}
                    </p>
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
                    {comment.createdAt || "baru saja"}
                  </p>
                </div>
                {comment.replyToAuthor ? (
                  <p className="mt-1 text-[11px] font-semibold text-foreground/45">
                    Membalas {comment.replyToAuthor}
                  </p>
                ) : null}
                <p className="mt-1 text-sm leading-relaxed text-foreground/85">{comment.text}</p>
                <button
                  type="button"
                  onClick={() => setReplyTo({ id: comment.id, name: comment.author.name })}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#2A67FF]"
                >
                  <Reply className="h-3 w-3" />
                  Balas
                </button>
              </article>
            ))
          )}
        </div>

        <div className="mt-4">
          {replyTo ? (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-[#2A67FF]/8 px-3 py-2 text-xs font-semibold text-[#2A67FF]">
              <span>Membalas {replyTo.name}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="font-black uppercase tracking-wide">
                Batal
              </button>
            </div>
          ) : null}

          <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Tulis komentar seperti di Instagram..."
              className="h-11 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none focus:border-[#2A67FF]/40"
            />
            <button
              type="submit"
              disabled={submittingComment || commentText.trim().length === 0}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-bold text-white transition-all",
                submittingComment || commentText.trim().length === 0
                  ? "bg-slate-300"
                  : "bg-[#2A67FF] hover:bg-[#1f57df]"
              )}
            >
              {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          {commentError ? <p className="mt-2 text-xs font-semibold text-rose-500">{commentError}</p> : null}
        </div>
      </section>
    </div>
  );
}
