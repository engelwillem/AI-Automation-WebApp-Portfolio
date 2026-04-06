"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpenText, ChevronLeft } from "lucide-react";
import { MOOD_QUICK_STARTS } from "@/features/versehub/constants";
import { MoodQuickStart } from "@/features/versehub/components/MoodQuickStart";
import type { SanctuaryScene } from "@/features/versehub/types";

interface VersehubLandingViewProps {
    activeScene: SanctuaryScene;
    landingContentPadding: string;
    firstChapterHref: string | null;
    firstBookLabel: string;
    continueReadingHref: string | null;
    continueReadingLabel: string | null;
    onContinueReading: () => void;
    onBackToday: () => void;
    onOpenPicker: () => void;
    onOpenExplore: () => void;
    onQuickStartMood: (moodKey: string) => void;
    onStartFirstChapter: () => void;
    liveDateLabel: string;
    memberName: string | null;
    activeMood: string;
}

export function VersehubLandingView({
    activeScene,
    landingContentPadding,
    firstBookLabel,
    continueReadingHref,
    continueReadingLabel,
    onContinueReading,
    onBackToday,
    onOpenPicker,
    onQuickStartMood,
    onStartFirstChapter,
    liveDateLabel,
    memberName,
    activeMood,
}: VersehubLandingViewProps) {
    return (
        <div className="relative flex flex-1 flex-col bg-white">
            {/* Header: Fixed Height & Proper Spacing */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md pt-[env(safe-area-inset-top,16px)]">
                <div className="mx-auto flex w-full max-w-[620px] items-center justify-between gap-4 px-6 py-4">
                    <button
                        type="button"
                        onClick={onBackToday}
                        className="flex h-10 w-10 min-w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-slate-100 active:scale-95"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col text-right">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            {liveDateLabel}
                        </span>
                        <h1 className="text-[18px] font-semibold leading-tight text-slate-900 md:text-[20px]">
                            {memberName ? `${memberName}, Selamat Datang` : "Selamat Datang Kembali"}
                        </h1>
                    </div>
                </div>
            </header>

            <main
                className="relative z-10 flex flex-1 flex-col overflow-y-auto px-6"
                style={{ paddingBottom: landingContentPadding }}
            >
                <div className="mx-auto w-full max-w-[620px] pt-12">
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="pb-16 flex flex-col items-center text-center">
                            <div className="flex flex-col items-center mb-8">
                                <BookOpenText className="h-8 w-8 text-slate-800 mb-3" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                    VerseHub
                                </p>
                            </div>

                            <h2 className="tct-serif text-[32px] font-medium leading-[1.2] text-slate-900 md:text-[40px] mb-8">
                                Buka satu pasal.<br />Tinggal lebih lama di firman.
                            </h2>

                            <p className="text-[16px] leading-[1.8] text-slate-500 max-w-sm mb-4">
                                {activeScene.invitation}
                            </p>

                            <blockquote className="font-serif text-[20px] leading-[1.7] tracking-tight text-slate-700 italic border-l-2 border-slate-200 pl-4 py-1 my-8 max-w-md">
                                {activeScene.quote}
                            </blockquote>

                            <MoodQuickStart
                                options={MOOD_QUICK_STARTS}
                                activeMood={activeMood}
                                onSelect={onQuickStartMood}
                            />

                            <div className="mt-12 flex flex-col items-center gap-4 w-full max-w-[340px]">
                                <button
                                    type="button"
                                    onClick={onStartFirstChapter}
                                    className="group flex w-full items-center justify-center gap-3 rounded-full bg-slate-900 px-6 py-[16px] text-[15px] font-bold text-white shadow-2xl shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-95"
                                >
                                    <span>Mulai dari {firstBookLabel} 1</span>
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </button>

                                <button
                                    type="button"
                                    onClick={onOpenPicker}
                                    className="flex w-full items-center justify-center rounded-full bg-slate-50 px-6 py-[15px] text-[14px] font-bold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                                >
                                    Eksplorasi Kitab Lain
                                </button>
                            </div>

                            {continueReadingHref && continueReadingLabel ? (
                                <div className="mt-8 w-full max-w-[340px]">
                                    <button
                                        type="button"
                                        onClick={onContinueReading}
                                        className="inline-flex w-full items-center justify-between rounded-full bg-white px-6 py-[16px] transition-all hover:bg-slate-50 ring-1 ring-slate-200 shadow-sm"
                                    >
                                        <div className="flex flex-col text-left">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lanjutkan Terakhir</span>
                                            <span className="text-[14px] font-bold text-slate-900">{continueReadingLabel}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-slate-400" />
                                    </button>
                                </div>
                            ) : null}

                            <p className="mt-12 text-[13px] leading-relaxed text-slate-400 max-w-sm">
                                {activeScene.reflection}
                            </p>
                        </div>
                    </motion.section>
                </div>
            </main>
        </div>
    );
}
