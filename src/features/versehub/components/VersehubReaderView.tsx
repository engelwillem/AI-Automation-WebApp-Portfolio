"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { VersehubCompletionRitual } from "@/features/versehub/components/VersehubCompletionRitual";
import type { Verse } from "@/features/versehub/types";

interface VersehubReaderViewProps {
    chapterLabel: string;
    sanctuaryTitle: string;
    memberName: string | null;
    liveDateLabel: string;
    verses: Verse[];
    shouldShowChrome: boolean;
    readerContentPadding: string;
    activeMood: string;
    chapterReflectionQuestion: string;
    chapterCompletionReflection: string;
    chapterCompletionSaved: boolean;
    isSavingChapterReflection: boolean;
    isSharingInsight: boolean;
    reflectionError: string | null;
    shareInsightError: string | null;
    hasReachedChapterEnd: boolean;
    scrollViewportRef: React.MutableRefObject<HTMLElement | null>;
    reflectionDrafts: Record<string, string>;
    completedReflections: Record<string, boolean>;
    onBack: () => void;
    onOpenPicker: () => void;
    onOpenExplore: () => void;
    onOpenReflectionsJournal: () => void;
    onOpenVerseMentor: (verse: Verse, userReflection?: string | null) => void;
    onReflectionChange: (key: string, value: string) => void;
    onReflectionComplete: (key: string) => void;
    onCompletionReflectionChange: (value: string) => void;
    onSaveChapterReflection: () => void;
    onShareInsight: () => void;
    onReachedChapterEnd: () => void;
}

export function VersehubReaderView({
    chapterLabel,
    sanctuaryTitle,
    memberName,
    liveDateLabel,
    verses,
    shouldShowChrome,
    readerContentPadding,
    activeMood,
    chapterReflectionQuestion,
    chapterCompletionReflection,
    chapterCompletionSaved,
    isSavingChapterReflection,
    isSharingInsight,
    reflectionError,
    shareInsightError,
    hasReachedChapterEnd,
    scrollViewportRef,
    reflectionDrafts,
    completedReflections,
    onBack,
    onOpenPicker,
    onOpenExplore,
    onOpenReflectionsJournal,
    onOpenVerseMentor,
    onReflectionChange,
    onReflectionComplete,
    onCompletionReflectionChange,
    onSaveChapterReflection,
    onShareInsight,
    onReachedChapterEnd,
}: VersehubReaderViewProps) {
    const completionSentinelRef = React.useRef<HTMLDivElement | null>(null);

    const resolveReflectionContext = React.useCallback((verseNumber: number) => {
        // Fallback for resolving context since inline breaks are removed, 
        // we can still return any completed reflections if they somehow exist in state 
        // (e.g. from previously saved state), though normally this will now be null.
        const key = `reflection-${verseNumber}`;
        if (!completedReflections[key]) return null;
        return reflectionDrafts[key]?.trim() || null;
    }, [completedReflections, reflectionDrafts]);

    React.useEffect(() => {
        const rootNode = scrollViewportRef.current;
        const sentinelNode = completionSentinelRef.current;
        if (!rootNode || !sentinelNode) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    onReachedChapterEnd();
                }
            },
            {
                root: rootNode,
                threshold: 0.7,
            }
        );

        observer.observe(sentinelNode);
        return () => observer.disconnect();
    }, [onReachedChapterEnd, scrollViewportRef, verses.length]);

    return (
        <>
            <motion.header
                initial={false}
                animate={shouldShowChrome ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                    "relative z-40 border-b border-white/5 bg-[var(--vh-bg)]/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-2xl",
                    !shouldShowChrome && "pointer-events-none"
                )}
            >
                <div className="mx-auto flex max-w-4xl items-start justify-between gap-4 px-6 py-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--vh-surface)]/60 text-[var(--vh-accent)] ring-1 ring-[var(--vh-border)] shadow-[0_18px_36px_-26px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:bg-[var(--vh-surface)]/80 active:scale-95"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="ml-auto flex flex-col text-right">
                        <span className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--vh-text-muted)] md:text-[9px]">
                            {liveDateLabel}
                        </span>
                        <h1 className="text-[15px] font-semibold leading-tight tracking-tight text-[var(--vh-text-primary)] md:text-[17px]">
                            {memberName ? `${memberName}, ${sanctuaryTitle}` : sanctuaryTitle}
                        </h1>
                    </div>
                </div>
            </motion.header>

            <main ref={(node) => { scrollViewportRef.current = node; }} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
                <div className="mx-auto max-w-4xl pb-[calc(180px+env(safe-area-inset-bottom,24px))]">
                    <section className="overflow-hidden rounded-[34px] bg-[var(--vh-surface)]/40 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-2xl md:p-7">
                        <div className="flex flex-col items-center justify-center border-b border-white/5 pb-10 pt-4 text-center">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--vh-text-muted)]">Pasal Bacaan</p>
                            <h2 className="mt-3 font-serif text-[42px] italic leading-[1.1] tracking-[-0.03em] text-white md:text-[54px]">{chapterLabel}</h2>
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--vh-text-secondary)] ring-1 ring-white/10">
                                    {verses.length} Ayat
                                </span>
                                <span className="inline-flex items-center rounded-full bg-[var(--vh-accent)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--vh-accent)] ring-1 ring-[var(--vh-accent)]/20">
                                    Mood: {activeMood}
                                </span>
                            </div>
                        </div>

                        <div className="mx-auto mt-8 max-w-3xl" style={{ paddingBottom: readerContentPadding }}>
                            <p className="text-[17px] leading-[2.1] text-[var(--vh-text-secondary)] md:text-[20px] md:leading-[2.2] text-justify selection:bg-[var(--vh-accent)]/30">
                                {verses.map((verse) => {
                                    const userReflection = resolveReflectionContext(verse.verse);

                                    return (
                                        <span
                                            key={verse.key}
                                            onClick={() => onOpenVerseMentor(verse, userReflection)}
                                            className="group cursor-pointer inline transition-colors hover:text-[var(--vh-text-primary)]"
                                            title="Ketuk untuk membuka Mentor"
                                        >
                                            <sup className="mr-1.5 inline-block font-sans font-bold text-[var(--vh-text-muted)] text-[11px] md:text-[12px] select-none group-hover:text-[var(--vh-accent)] transition-colors">
                                                {verse.verse}
                                            </sup>
                                            <span className="mr-2">{verse.text}</span>
                                        </span>
                                    );
                                })}
                            </p>

                            <div ref={completionSentinelRef} className="h-6 w-full" aria-hidden="true" />

                            {hasReachedChapterEnd ? (
                                <VersehubCompletionRitual
                                    chapterLabel={chapterLabel}
                                    promptText={chapterReflectionQuestion}
                                    reflectionValue={chapterCompletionReflection}
                                    onReflectionChange={onCompletionReflectionChange}
                                    onSaveReflection={onSaveChapterReflection}
                                    onShareInsight={onShareInsight}
                                    onOpenJournal={onOpenReflectionsJournal}
                                    isReflectionSaved={chapterCompletionSaved}
                                    isSavingReflection={isSavingChapterReflection}
                                    isSharingInsight={isSharingInsight}
                                    reflectionError={reflectionError}
                                    shareError={shareInsightError}
                                />
                            ) : null}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
