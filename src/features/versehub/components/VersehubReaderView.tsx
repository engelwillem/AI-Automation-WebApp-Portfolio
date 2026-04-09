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
                    "relative z-40 border-b border-slate-200/60 bg-white/80 pt-[env(safe-area-inset-top,8px)] backdrop-blur-2xl",
                    !shouldShowChrome && "pointer-events-none"
                )}
            >
                <div className="mx-auto flex max-w-4xl items-start justify-between gap-4 px-6 py-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-xl transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow active:scale-95"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="ml-auto flex flex-col text-right">
                        <span className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 md:text-[9px]">
                            {liveDateLabel}
                        </span>
                        <h1 className="text-[15px] font-semibold leading-tight tracking-tight text-slate-800 md:text-[17px]">
                            {memberName ? `${memberName}, ${sanctuaryTitle}` : sanctuaryTitle}
                        </h1>
                    </div>
                </div>
            </motion.header>

            <main ref={(node) => { scrollViewportRef.current = node; }} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
                <div className="mx-auto max-w-4xl pb-[calc(180px+env(safe-area-inset-bottom,24px))]">
                    <section className="overflow-hidden rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-8">
                        <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-10 pt-4 text-center">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Pasal Bacaan</p>
                            <h2 className="mt-3 tct-serif text-[42px] leading-[1.15] tracking-[-0.02em] text-slate-800 md:text-[54px]">{chapterLabel}</h2>
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ring-1 ring-slate-200/60">
                                    {verses.length} Ayat
                                </span>
                            </div>
                        </div>

                        <div className="mx-auto mt-8 max-w-2xl" style={{ paddingBottom: readerContentPadding }}>
                            <p className="tct-serif text-[20px] leading-[2.1] text-slate-600 md:text-[22px] md:leading-[2.2] text-justify selection:bg-sky-100">
                                {verses.map((verse) => {
                                    const userReflection = resolveReflectionContext(verse.verse);

                                    return (
                                        <span
                                            key={verse.key}
                                            onClick={() => onOpenVerseMentor(verse, userReflection)}
                                            className="group cursor-pointer inline transition-colors hover:text-slate-900"
                                            title="Ketuk untuk membuka Mentor"
                                        >
                                            <sup className="mr-1.5 inline-block font-sans font-bold text-slate-400 text-[11px] md:text-[12px] select-none group-hover:text-sky-600 transition-colors">
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
