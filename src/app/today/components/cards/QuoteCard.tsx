'use client';

import CommentsSheet, { type SheetComment } from '@/components/community/CommentsSheet';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import Link from 'next/link';
import { Bookmark, Heart, MessageCircle, Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function QuoteCard({
    payload,
}: {
    payload?: { text: string; author?: string | null; reference?: string | null; ref?: string | null; source?: string | null };
}) {
    const { user } = useUser();
    const isAuthenticated = Boolean(user);
    const officialDomain = (process.env.NEXT_PUBLIC_OFFICIAL_DOMAIN ?? '').trim();
    const shareOrigin = useMemo(() => {
        const fallback = typeof window !== 'undefined' ? window.location.origin : '';
        if (!officialDomain) return fallback;
        try {
            const normalized = /^https?:\/\//i.test(officialDomain)
                ? officialDomain
                : `https://${officialDomain}`;
            return new URL(normalized).origin;
        } catch {
            return fallback;
        }
    }, [officialDomain]);

    const requireMember = () => {
        if (isAuthenticated) return true;
        window.location.assign('/');
        return false;
    };

    const quoteText =
        payload?.text?.trim() ||
        'Setiap langkah kecil hari ini tetap berarti. Kamu tidak berjalan sendiri.';
    const pageKey = 'today-quotes';
    const reactionKey = `tct:quote:reactions:${pageKey}`;
    const commentsKey = `tct:quote:comments:${pageKey}`;

    const [liked, setLiked] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [likeBase] = useState(124);
    const [bookmarkBase] = useState(37);
    const [comments, setComments] = useState<SheetComment[]>([]);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [replyTarget, setReplyTarget] = useState<SheetComment | null>(null);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(reactionKey);
            const parsed = raw ? JSON.parse(raw) : null;
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
                    updated_at: new Date().toISOString(),
                }),
            );
        } catch {
            // ignore
        }
    }, [reactionKey, liked, bookmarked]);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(commentsKey);
            const parsed = raw ? JSON.parse(raw) : [];
            setComments(Array.isArray(parsed) ? parsed : []);
        } catch {
            setComments([]);
        }
    }, [commentsKey]);

    const persistComments = (next: SheetComment[]) => {
        setComments(next);
        try {
            window.localStorage.setItem(commentsKey, JSON.stringify(next));
        } catch {
            // ignore
        }
    };

    const shareQuote = async () => {
        const url = `${shareOrigin}/today`;
        const title = 'Quotes • Today';
        try {
            if (navigator.share) {
                await navigator.share({ title, text: quoteText, url });
                return;
            }
            const waUrl = `https://wa.me/?text=${encodeURIComponent(`${quoteText} ${url}`)}`;
            if (/iP(hone|od|ad)/.test(navigator.userAgent || '')) {
                window.location.assign(waUrl);
                return;
            }
            window.open(waUrl, '_blank', 'noopener,noreferrer');
        } catch {
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(url);
                    return;
                }
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            } catch {
                // ignore
            }
        }
    };

    const commentsCount = useMemo(() => comments.length, [comments]);

    return (
        <>
            <Card className="overflow-hidden rounded-[32px] border-0 bg-surface/80 shadow-soft ring-1 ring-border/60 backdrop-blur-xl">
                <CardContent className="px-5 pb-5 pt-5 md:px-7 md:pb-7 md:pt-7">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground ring-1 ring-border/70">
                                Quotes
                            </span>
                            <span className="text-[12px] font-medium text-muted-foreground">Today Reflection</span>
                        </div>
                        <Sparkles className="h-4 w-4 text-brand/40" />
                    </div>

                    <div className="relative overflow-hidden rounded-2xl shadow-inner ring-1 ring-slate-900/5">
                        <div className="aspect-[4/5] bg-[radial-gradient(120%_110%_at_5%_95%,rgba(15,23,42,0.95),transparent_45%),radial-gradient(80%_80%_at_82%_20%,rgba(30,58,138,0.6),transparent_55%),linear-gradient(145deg,#0f172a_0%,#1e293b_52%,#0f172a_100%)] md:aspect-[21/9]" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                            <div className="space-y-1">
                                <div className="select-none font-serif text-3xl text-white/20">"</div>
                                <p className="line-clamp-3 font-serif text-lg italic leading-relaxed text-slate-200">
                                    Satu kutipan yang menguatkan perjalananmu hari ini.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-b border-border/70 pb-4">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                className={`group tct-pressable inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                                    liked ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                                }`}
                                onClick={() => {
                                    if (!requireMember()) return;
                                    setLiked((v) => !v);
                                }}
                                aria-label="Like"
                            >
                                <Heart className="h-5 w-5 transition-transform group-hover:scale-110" fill={liked ? 'currentColor' : 'none'} />
                            </button>

                            <button
                                type="button"
                                className="group tct-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                                onClick={() => {
                                    if (!requireMember()) return;
                                    setCommentsOpen(true);
                                    setReplyTarget(null);
                                }}
                                aria-label="Comment"
                            >
                                <MessageCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
                            </button>

                            <button
                                type="button"
                                className="group tct-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                                onClick={() => {
                                    if (!requireMember()) return;
                                    void shareQuote();
                                }}
                                aria-label="Share"
                            >
                                <Send className="h-5 w-5 transition-transform group-hover:scale-110" />
                            </button>
                        </div>

                        <button
                            type="button"
                            className={`group tct-pressable inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                                bookmarked ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                            }`}
                            onClick={() => {
                                if (!requireMember()) return;
                                setBookmarked((v) => !v);
                            }}
                            aria-label="Bookmark"
                        >
                            <Bookmark className="h-5 w-5 transition-transform group-hover:scale-110" fill={bookmarked ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    <div className="mt-4 flex items-center gap-4 px-1 text-[12px] font-bold text-muted-foreground">
                        <span className={liked ? 'text-brand' : ''}>
                            {liked ? `${likeBase + 1} Suka` : `${likeBase} Suka`}
                        </span>
                        <span>{commentsCount} Komentar</span>
                        <span className={bookmarked ? 'text-brand' : ''}>
                            {bookmarked ? 'Disimpan' : `${bookmarkBase} Simpan`}
                        </span>
                    </div>

                    <div className="relative mt-5 overflow-hidden rounded-2xl bg-surface-muted/70 p-6 ring-1 ring-border/40 md:p-8">
                        <div className="absolute right-0 top-0 p-4 opacity-5">
                            <Sparkles className="h-12 w-12" />
                        </div>
                        <p className="relative font-serif text-[22px] tracking-tight leading-[1.6] text-foreground md:text-[26px]">
                            {quoteText}
                        </p>
                        <div className="mt-4 flex flex-col gap-1">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-brand">
                                {payload?.reference?.trim() ? payload.reference : 'Quote of the day'}
                            </p>
                            {payload?.ref?.trim() ? (
                                <Link
                                    href={`/versehub/id/${payload.ref}`}
                                    className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-brand"
                                >
                                    Buka dalam Alkitab <Send className="h-2 w-2" />
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <CommentsSheet
                open={commentsOpen}
                onClose={() => {
                    setCommentsOpen(false);
                    setReplyTarget(null);
                }}
                comments={comments}
                title="Comments"
                onReply={(comment) => setReplyTarget(comment)}
                replyingToAuthor={replyTarget?.author ?? null}
                onCancelReply={() => setReplyTarget(null)}
                onSubmit={(text) => {
                    if (!requireMember()) return;
                    const created: SheetComment = {
                        id: Date.now(),
                        author: 'You',
                        body: text,
                        created_at: 'just now',
                        reply_to_id: replyTarget?.id ?? null,
                        reply_to_author: replyTarget?.author ?? null,
                    };
                    persistComments([created, ...comments]);
                    setReplyTarget(null);
                }}
            />
        </>
    );
}
