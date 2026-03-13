
"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Send, Bookmark, X, ChevronLeft, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VersehubReaderPage } from "@/features/versehub/pages/VersehubReaderPage";

type VerseData = {
    ref: string;
    reference: string;
    text: string;
    translation_name: string | null;
    provider: string | null;
    og_image_url: string;
    canonical_url: string;
};

export default function UnifiedVerseHubPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
    const { lang, slug } = use(params);
    const router = useRouter();
    
    // Intelligent Route Differentiation:
    const segments = slug ? slug.split(/[-_.]/) : [];
    const isVerse = segments.length >= 3;
    const isChapter = !isVerse && slug && (
        segments.length === 2 || 
        /^[a-z]+\d+$/i.test(slug)
    );

    const [verse, setVerse] = useState<VerseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(124);
    const [bookmarked, setBookmarked] = useState(false);
    const [bookmarkCount, setBookmarkCount] = useState(37);
    const [ogOpen, setOgOpen] = useState(false);

    useEffect(() => {
        if (!slug || isChapter) return;

        const timer = setTimeout(() => {
            setVerse({
                ref: slug,
                reference: slug.toUpperCase().replace(/-/g, ' '),
                text: "Sebab demikianlah besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.",
                translation_name: "TB",
                provider: "alkitab.mobi",
                og_image_url: `/api/versehub/og/${slug}.png`,
                canonical_url: `https://thechoosentalks.com/versehub/id/${slug}`
            });
            setLoading(false);
        }, 600);
        return () => clearTimeout(timer);
    }, [slug, isChapter]);

    const handleLike = () => {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
    };

    const handleBookmark = () => {
        setBookmarked(!bookmarked);
        setBookmarkCount(prev => bookmarked ? prev - 1 : prev + 1);
    };

    if (isChapter) {
        return <VersehubReaderPage lang={lang} mode="chapter" initialChapterRef={slug} />;
    }

    if (loading || !verse) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    const isId = lang === 'id';

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl opacity-50"></div>
                <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-400/5 blur-3xl opacity-50"></div>
            </div>

            <main className="relative mx-auto max-w-3xl px-4 py-6 md:py-10">
                <div className="space-y-8">
                    <header className="space-y-3">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => router.push(`/versehub/${lang}`)}
                                className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/50 border border-white/10 transition hover:text-white hover:bg-white/10 active:scale-95"
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" aria-hidden></span>
                                VerseHub
                            </button>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => router.push(`/versehub/${lang}`)}
                                    className="text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    {isId ? 'Kembali ke Alkitab' : 'Back to Bible'}
                                </button>
                                <div className="h-3 w-px bg-white/10" />
                                <button className="text-xs font-bold text-amber-600">
                                    {isId ? 'EN' : 'ID'}
                                </button>
                            </div>
                        </div>

                        <h1 className="tct-brand-gradient text-4xl font-bold tracking-tight">
                            {verse.reference}
                        </h1>
                    </header>

                    <section className="group relative overflow-hidden rounded-[40px] bg-white/[0.02] p-4 shadow-2xl border border-white/5 backdrop-blur-md">
                        <div className="overflow-hidden rounded-[28px] border border-white/10">
                            <img
                                src={verse.og_image_url}
                                alt="Shared Verse"
                                className="aspect-[1200/630] w-full cursor-zoom-in object-cover transition-transform duration-700 group-hover:scale-105"
                                onClick={() => setOgOpen(true)}
                                loading="lazy"
                            />
                        </div>
                    </section>

                    <section className="rounded-[40px] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden">
                        <div className="p-8 md:p-14">
                            <blockquote className="relative">
                                <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 text-white/5" aria-hidden>
                                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 11H6V7a4 4 0 0 1 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                        <path d="M18 11h-4V7a4 4 0 0 1 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                        <path d="M10 11v6H6v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M18 11v6h-4v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>

                                <div className="pl-6 md:pl-10">
                                    <div className="text-xl leading-relaxed text-white/90 font-medium md:text-3xl md:leading-relaxed font-serif italic">
                                        {verse.text}
                                    </div>

                                    <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-white/30">
                                        <span className="uppercase tracking-[0.2em]">{verse.provider ?? 'versehub'}</span>
                                        {verse.translation_name && (
                                            <>
                                                <span className="opacity-20">•</span>
                                                <span className="tracking-widest">{verse.translation_name}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </blockquote>

                            <div className="mt-10 border-t border-white/5 pt-6 flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleLike}
                                        className={cn(
                                            "flex h-11 items-center gap-2.5 rounded-full px-5 transition-all active:scale-90",
                                            liked ? "bg-rose-500/10 text-rose-500" : "text-slate-500 hover:bg-white/5"
                                        )}
                                    >
                                        <Heart className={cn("h-5 w-5", liked ? "fill-current" : "")} />
                                        <span className="text-sm font-bold tabular-nums">{liked ? `You + ${likeCount - 1}` : likeCount}</span>
                                    </button>

                                    <button
                                        className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-white/5 active:scale-95 transition-all"
                                    >
                                        <MessageSquare className="h-5 w-5" />
                                    </button>

                                    <button
                                        className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-white/5 active:scale-95 transition-all"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </div>

                                <button
                                    onClick={handleBookmark}
                                    className={cn(
                                        "flex h-11 items-center gap-2.5 rounded-full px-5 transition-all active:scale-95",
                                        bookmarked ? "bg-sky-500/10 text-sky-500" : "text-slate-500 hover:bg-white/5"
                                    )}
                                >
                                    <Bookmark className={cn("h-5 w-5", bookmarked ? "fill-current" : "")} />
                                    <span className="text-sm font-bold tabular-nums">{bookmarked ? `You + ${bookmarkCount - 1}` : bookmarkCount}</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    <footer className="text-center py-10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">thechoosentalks.org</p>
                    </footer>
                </div>
            </main>

            <AnimatePresence>
                {ogOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
                    >
                        <button 
                            onClick={() => setOgOpen(false)}
                            className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={verse.og_image_url}
                            className="max-h-[85vh] w-full max-w-5xl rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
