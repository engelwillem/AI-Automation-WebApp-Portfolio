"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bookmark, 
    ChevronLeft, 
    ChevronRight, 
    Heart, 
    MessageCircle, 
    Send, 
    X,
    Share2,
    BookOpen,
    ArrowLeft
} from 'lucide-react';
import { buildAppAuthHeaders } from '@/lib/app-auth-fetch';
import { sanitizeRichHtml } from '@/lib/safe-rich-text';
import { cn } from '@/lib/utils';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

type Day = {
    day_key: string;
    date: string;
    title: string;
    content: string;
    cover_image_url: string;
    media_links?: any[];
};

export default function SabbathSchoolDayPage() {
    const params = useParams();
    const router = useRouter();
    const yearParam = params?.year;
    const quarterParam = params?.quarter;
    const lessonParam = params?.lessonNumber;
    const dayKeyParam = params?.dayKey;
    const year = Array.isArray(yearParam) ? yearParam[0] : yearParam;
    const quarter = Array.isArray(quarterParam) ? quarterParam[0] : quarterParam;
    const lessonNumber = Array.isArray(lessonParam) ? lessonParam[0] : lessonParam;
    const dayKey = Array.isArray(dayKeyParam) ? dayKeyParam[0] : dayKeyParam;
    const refreshTick = useMutationRefreshTick(['/api/sabbath-school/', '/api/channels/']);

    const [day, setDay] = useState<Day | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [commentOpen, setCommentOpen] = useState(false);
    const sanitizedContent = useMemo(() => sanitizeRichHtml(day?.content), [day?.content]);

    useEffect(() => {
        if (!year || !quarter || !lessonNumber || !dayKey) return;

        let isActive = true;
        const load = async () => {
            try {
                const response = await fetch(`/api/sabbath-school/${year}/${quarter}/lesson/${lessonNumber}/${dayKey}`, {
                    method: 'GET',
                    headers: buildAppAuthHeaders(),
                    cache: 'no-store',
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!isActive) return;
                if (payload.day) {
                    setDay(payload.day);
                }
            } catch {
                // Keep UI stable when API is unreachable.
            } finally {
                if (isActive) setLoading(false);
            }
        };
        load();
        return () => {
            isActive = false;
        };
    }, [year, quarter, lessonNumber, dayKey, refreshTick]);

    if (loading || !day) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            {/* Header Parity */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-3">
                <div className="mx-auto max-w-3xl flex items-center justify-between">
                    <button 
                        onClick={() => router.back()}
                        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-elevated transition-all active:scale-95 text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lesson {lessonNumber}</p>
                        <p className="text-xs font-bold text-foreground truncate max-w-[200px]">{day.title}</p>
                    </div>
                    <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-elevated transition-all active:scale-95 text-muted-foreground hover:text-foreground">
                        <Share2 className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-3xl">
                {/* Hero Parity */}
                <div className="relative aspect-video w-full overflow-hidden md:rounded-b-[40px]">
                    <img 
                        src={day.cover_image_url} 
                        className="h-full w-full object-cover" 
                        alt={day.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-8">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white ring-1 ring-white/20 backdrop-blur-sm">
                            Senin, 11 Maret
                        </div>
                        <h1 className="mt-4 text-3xl font-bold text-white tracking-tight leading-realsed">
                            {day.title}
                        </h1>
                    </div>
                </div>

                {/* Reader Content Parity */}
                <article className="px-6 py-10 md:px-12 max-w-none">
                    <div 
                        dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
                        className="reader-prose text-[17px] leading-relaxed text-foreground/80 space-y-6 selection:bg-brand/20"
                    />
                </article>

                {/* Action Bar Parity */}
                <div className="fixed bottom-0 inset-x-0 bg-background/90 backdrop-blur-md border-t border-border/50 p-4 pb-8 z-40">
                    <div className="mx-auto max-w-3xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => setLiked(!liked)}
                                className={cn(
                                    "flex h-12 px-5 items-center gap-2.5 rounded-full transition-all active:scale-90 border shadow-sm",
                                    liked ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-surface text-muted-foreground hover:bg-surface-elevated border-border/50"
                                )}
                             >
                                <Heart className={cn("h-5 w-5", liked ? "fill-current" : "")} />
                                <span className="text-sm font-bold">124</span>
                             </button>
                             <button className="h-12 w-12 flex items-center justify-center rounded-full bg-surface text-muted-foreground active:scale-90 border border-border/50 shadow-sm hover:bg-surface-elevated transition-colors">
                                <MessageCircle className="h-5 w-5" />
                             </button>
                        </div>

                        <div className="flex items-center gap-2">
                             <button className="h-12 w-12 flex items-center justify-center rounded-full bg-surface text-muted-foreground active:scale-90 border border-border/50 shadow-sm hover:bg-surface-elevated transition-colors">
                                <BookOpen className="h-5 w-5" />
                             </button>
                             <button 
                                onClick={() => setBookmarked(!bookmarked)}
                                className={cn(
                                    "h-12 w-12 flex items-center justify-center rounded-full transition-all active:scale-90 border shadow-sm",
                                    bookmarked ? "bg-brand/10 text-brand border-brand/20" : "bg-surface text-muted-foreground hover:bg-surface-elevated border-border/50"
                                )}
                             >
                                <Bookmark className={cn("h-5 w-5", bookmarked ? "fill-current" : "")} />
                             </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
