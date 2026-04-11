"use client";

import React, { useState, useEffect } from 'react';
import { useAuthSession } from '@/auth/use-auth-session';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Circle, Play, ArrowRight, Info, Share2, X, Clock, BookOpen } from 'lucide-react';
import { buildAppAuthHeaders, fetchWithAppAuth } from '@/lib/app-auth-fetch';
import { cn } from '@/lib/utils';
import SharePanel from '@/components/versehub/SharePanel';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

interface Step {
    id: number;
    step_order: number;
    verse_ref: string;
    focus_question: string;
    mentor_note: string | null;
}

interface StudyPath {
    id: number;
    slug: string;
    title_id: string;
    title_en: string;
    description_id: string;
    description_en: string;
    cover_color: string;
    difficulty: string;
    estimated_minutes: number;
    steps: Step[];
}

export default function StudyPathShowPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuthSession();
    const refreshTick = useMutationRefreshTick(['/api/study-paths/', '/api/versehub/']);
    const lang = params?.lang as string || 'id';
    const slug = params?.slug as string;
    const isId = lang === 'id';

    const [path, setPath] = useState<StudyPath | null>(null);
    const [userProgress, setUserProgress] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [shareOpen, setShareOpen] = useState(false);
    const [processingStep, setProcessingStep] = useState<number | null>(null);

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            try {
                const response = await fetch(`/api/study-paths/${lang}/${slug}`, {
                    method: 'GET',
                    headers: buildAppAuthHeaders(),
                    cache: 'no-store',
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!isActive) return;
                setPath(payload.path ?? null);
                setUserProgress(Array.isArray(payload.userProgress) ? payload.userProgress : []);
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
    }, [lang, slug, refreshTick]);

    const handleCompleteStep = async (stepId: number) => {
        if (!isAuthenticated) return;

        setProcessingStep(stepId);
        try {
            const response = await fetchWithAppAuth(`/api/study-paths/${lang}/${slug}/complete/${stepId}`, {
                method: 'POST',
                headers: buildAppAuthHeaders(),
            });
            if (!response.ok) return;

            const payload = await response.json();
            const completedStepIds = payload?.progress?.completed_step_ids;
            if (Array.isArray(completedStepIds)) {
                setUserProgress(completedStepIds);
                return;
            }

            setUserProgress(prev => (prev.includes(stepId) ? prev : [...prev, stepId]));
        } catch {
            // Keep UI stable on transient failures.
        } finally {
            setProcessingStep(null);
        }
    };

    if (loading || !path) {
        return <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="h-10 w-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>;
    }

    const completedCount = userProgress.length;
    const totalSteps = Math.max(1, path.steps.length);
    const progressPercent = Math.round((completedCount / totalSteps) * 100);

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header Parity */}
            <div className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border/50">
                <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
                    <button onClick={() => router.push(`/versehub/${lang}/study`)} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-muted ring-1 ring-border/50 active:scale-95 text-foreground hover:bg-surface-elevated">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h1 className="font-bold text-lg">{isId ? path.title_id : path.title_en}</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="mx-auto max-w-3xl px-4 py-8">
                {/* Hero Header Parity */}
                <div className={cn(
                    "mb-10 overflow-hidden rounded-[40px] p-8 text-foreground shadow-soft md:p-12 relative border border-border/50",
                    path.cover_color === 'amber' && "bg-amber-500/5",
                    path.cover_color === 'sky' && "bg-sky-500/5",
                    path.cover_color === 'green' && "bg-emerald-500/5",
                    path.cover_color === 'rose' && "bg-rose-500/5",
                    !['amber', 'sky', 'green', 'rose'].includes(path.cover_color) && "bg-surface"
                )}>
                    {/* Decorative Elements */}
                    <div className={cn(
                        "absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 blur-3xl",
                        path.cover_color === 'amber' && "bg-amber-500/10",
                        path.cover_color === 'sky' && "bg-sky-500/10",
                        path.cover_color === 'green' && "bg-emerald-500/10",
                        path.cover_color === 'rose' && "bg-rose-500/10",
                        !['amber', 'sky', 'green', 'rose'].includes(path.cover_color) && "bg-brand/10"
                    )} />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="rounded-full bg-surface px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-border/50 shadow-sm text-foreground">
                                {path.difficulty}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {path.estimated_minutes} {isId ? 'menit' : 'minutes'}
                            </span>
                        </div>
                        <h2 className="text-4xl font-bold md:text-5xl mb-4 leading-tight text-foreground">
                            {isId ? path.title_id : path.title_en}
                        </h2>
                        <p className="max-w-xl text-lg text-muted-foreground leading-relaxed font-medium">
                            {isId ? path.description_id : path.description_en}
                        </p>

                        <div className="mt-10 flex flex-wrap gap-4">
                            <button
                                onClick={() => setShareOpen(true)}
                                className="inline-flex items-center gap-2.5 rounded-full bg-surface px-7 py-3.5 text-sm font-bold backdrop-blur-md transition-all hover:bg-surface-elevated border border-border/50 shadow-sm active:scale-95 text-foreground"
                            >
                                <Share2 className="h-4 w-4" />
                                {isId ? 'Bagikan Jalur' : 'Share Path'}
                            </button>
                        </div>

                        {/* Progress Bar Parity */}
                        {completedCount > 0 && (
                            <div className="mt-12 bg-surface-muted/50 p-6 rounded-[32px] backdrop-blur-sm border border-border/50">
                                <div className="flex items-baseline justify-between mb-3 text-foreground">
                                    <p className="text-sm font-bold uppercase tracking-wider">{progressPercent}% {isId ? 'Selesai' : 'Complete'}</p>
                                    <p className="text-xs font-bold text-muted-foreground">{completedCount} / {path.steps.length} {isId ? 'Langkah' : 'Steps'}</p>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface border border-border/50">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        className="h-full bg-brand shadow-[0_0_15px_rgba(var(--brand-rgb),0.5)]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Steps List */}
                <section className="space-y-8">
                    <h3 className="text-xl font-bold text-foreground px-2 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-brand" />
                        {isId ? 'Langkah Pembelajaran' : 'Learning Steps'}
                    </h3>

                    <div className="space-y-4">
                        {path.steps.map((step, index) => {
                            const completed = userProgress.includes(step.id);
                            const isNext = !completed && (index === 0 || userProgress.includes(path.steps[index-1].id));

                            return (
                                <motion.div
                                    key={step.id}
                                    layout
                                    className={cn(
                                        "group flex items-start gap-4 rounded-[32px] p-6 border transition-all duration-300",
                                        completed
                                            ? "bg-surface-muted border-border/50 opacity-80"
                                            : isNext 
                                                ? "bg-surface shadow-card border-brand/50 ring-1 ring-brand/20"
                                                : "bg-surface shadow-soft border-border/50"
                                    )}
                                >
                                    {/* Order Icon Parity */}
                                    <div className="mt-1 flex shrink-0 items-center justify-center">
                                        {completed ? (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 ring-4 ring-emerald-500/5">
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                                                isNext ? "bg-brand border-brand text-brand-foreground shadow-sm" : "border-border/50 text-muted-foreground bg-surface"
                                            )}>
                                                {index + 1}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Parity */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-4">
                                            <h4 className={cn(
                                                "font-bold uppercase tracking-[0.15em] text-[10px]",
                                                completed ? "text-muted-foreground" : "text-brand"
                                            )}>
                                                {step.verse_ref.replace(/-/g, ' ')}
                                            </h4>
                                        </div>

                                        <p className={cn(
                                            "mt-2 text-[15px] leading-relaxed font-medium",
                                            completed ? "text-muted-foreground/60 line-through decoration-muted-foreground/30" : "text-foreground"
                                        )}>
                                            {step.focus_question}
                                        </p>

                                        {step.mentor_note && !completed && (
                                            <div className="mt-5 flex items-start gap-3 rounded-[24px] bg-brand/5 p-4 text-[12px] text-foreground ring-1 ring-brand/10 leading-relaxed italic">
                                                <Info className="h-4 w-4 mt-0.5 shrink-0 text-brand" />
                                                <p>{step.mentor_note}</p>
                                            </div>
                                        )}

                                        <div className="mt-8 flex flex-wrap items-center gap-3">
                                            <button
                                                onClick={() => router.push(`/versehub/${lang}/${step.verse_ref}`)}
                                                className={cn(
                                                    "inline-flex items-center gap-2.5 rounded-full px-6 py-2.5 text-xs font-bold transition-all active:scale-95",
                                                    completed
                                                        ? "bg-surface-elevated text-muted-foreground hover:bg-border/50"
                                                        : "bg-foreground text-background shadow-md hover:bg-foreground/90 ring-4 ring-foreground/5"
                                                )}
                                            >
                                                <Play className="h-3.5 w-3.5 fill-current" />
                                                {isId ? 'Baca Ayat' : 'Read Verse'}
                                            </button>

                                            {!completed && isNext && (
                                                <button
                                                    onClick={() => handleCompleteStep(step.id)}
                                                    disabled={processingStep === step.id}
                                                    className="inline-flex items-center gap-2.5 rounded-full border border-border/50 bg-surface px-6 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-surface-elevated disabled:opacity-50 active:scale-95 shadow-sm"
                                                >
                                                    {processingStep === step.id ? (
                                                         <div className="h-3.5 w-3.5 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
                                                    ) : (
                                                         <CheckCircle2 className="h-3.5 w-3.5" />
                                                    )}
                                                    {isId ? 'Tandai Selesai' : 'Mark Complete'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* Complete State Parity */}
                {progressPercent === 100 && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-16 rounded-[40px] bg-emerald-500/5 p-10 text-center border border-emerald-500/20 shadow-soft"
                    >
                        <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            {isId ? 'Luar Biasa!' : 'Congratulations!'}
                        </h2>
                        <p className="text-base text-muted-foreground max-w-sm mx-auto mb-8 font-medium">
                            {isId
                                ? 'Anda telah menyelesaikan jalur belajar ini. Teruslah bertumbuh dalam Firman Allah.'
                                : 'You have completed this study path. Keep growing in the Word of God.'}
                        </p>
                        <button
                            onClick={() => router.push(`/versehub/${lang}/study`)}
                            className="inline-flex items-center gap-2.5 rounded-full bg-emerald-500 px-10 py-4 text-[15px] font-bold text-white shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
                        >
                            {isId ? 'Lihat Jalur Lainnya' : 'View Other Paths'}
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </motion.div>
                )}
            </div>

            <SharePanel
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                title={isId ? path.title_id : path.title_en}
                subtitle={isId ? path.description_id : path.description_en}
                url={typeof window !== 'undefined' ? window.location.href : ''}
                lang={lang}
                ogImageUrl="/og-image.png"
            />
        </div>
    );
}
