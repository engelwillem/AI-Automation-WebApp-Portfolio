"use client";

import { Card, CardContent } from '@/components/ui/card';
import ActionBar from '@/components/ActionBar';
import { useUser } from '@/firebase/auth/use-user';
import { useEffect, useMemo, useState } from 'react';

export type FeaturedVerse = {
    ref: string;
    href: string;
    text: string;
    reference: string;
};

function VerseQuoteRail({ text }: { text: string }) {
    const lines = String(text ?? '').split(/\r?\n/).map((x) => x.trimEnd());

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

export default function VerseHubFeaturedCard({
    verse,
    postId,
    onOpenComments,
}: {
    verse: FeaturedVerse | null | undefined;
    postId?: number;
    onOpenComments?: (id: number) => void;
}) {
    const { user } = useUser();

    // In Next/Firebase version, we'll use window.location.origin as default share origin
    const shareOrigin = typeof window !== 'undefined' ? window.location.origin : '';

    const ogImageUrl = useMemo(() => {
        if (!verse?.ref) return null;
        return `/versehub/id/${verse.ref}/og.png`;
    }, [verse?.ref]);

    const verseHref = verse?.href?.trim() || (verse?.ref ? `/versehub/id/${verse.ref}` : '/versehub/id');
    const reactionKey = useMemo(
        () => (verse?.ref ? `tct:versehub:featured:reactions:${verse.ref}` : 'tct:versehub:featured:reactions:default'),
        [verse?.ref],
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
        } catch { /* ignore */ }
    }, [reactionKey]);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                reactionKey,
                JSON.stringify({
                    liked,
                    bookmarked,
                }),
            );
        } catch { /* ignore */ }
    }, [reactionKey, liked, bookmarked]);

    const onShare = async () => {
        const url = `${shareOrigin}${verseHref}`;
        const title = verse?.reference || 'VerseHub';

        try {
            if (navigator.share) {
                await navigator.share({ title, url });
                return;
            }
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
                return;
            }
        } catch { /* ignore */ }

        const wa = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
        window.open(wa, '_blank', 'noopener,noreferrer');
    };

    if (!verse) return null;

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <a
                    href="/versehub/id"
                    className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground shadow-soft ring-1 ring-black/5 transition hover:text-foreground dark:ring-white/10"
                    aria-label="Buka VerseHub"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                    VerseHub
                </a>

                <a href={verseHref} className="mt-1 block max-w-full" aria-label={`Buka ayat ${verse.reference}`}>
                    <h2 className="text-xl md:text-2xl font-black hover:underline">{verse.reference}</h2>
                </a>
            </div>

            {/* Decorative Verse Image Thumbnail Fallback */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-brand/5 to-rose-500/10 p-5 shadow-soft ring-1 ring-black/5 dark:ring-white/10 backdrop-blur">
                <a href={verseHref} className="block overflow-hidden rounded-2xl ring-1 ring-white/10 relative" aria-label={`Buka OG ayat ${verse.reference}`}>
                    <div className="aspect-[1200/630] w-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-8 text-center relative z-0">
                        <span className="text-3xl font-bold opacity-30 tracking-widest uppercase">{verse.reference}</span>
                        <img
                            src={ogImageUrl ?? `/versehub/id/${verse.ref}/og.png`}
                            alt={`OG image ${verse.reference}`}
                            className="absolute inset-0 h-full w-full object-cover z-10 transition-opacity duration-300"
                            loading="lazy"
                            onError={(e) => {
                                // Hide broken image on error so fallback displays
                                (e.target as HTMLImageElement).style.opacity = '0';
                            }}
                        />
                    </div>
                </a>
            </div>

            <Card className="rounded-3xl bg-surface shadow-card ring-1 ring-black/5 dark:ring-white/10 backdrop-blur">
                <CardContent className="p-7 md:p-9">
                    <a href={verseHref} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50" aria-label={`Buka ayat ${verse.reference}`}>
                        <VerseQuoteRail text={verse.text} />
                    </a>

                    <div className="mt-6">
                        <div className="h-px bg-border/60" aria-hidden />
                        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <button
                                type="button"
                                onClick={() => window.location.assign(verseHref)}
                                className="tct-pressable inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 font-semibold text-brand"
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
