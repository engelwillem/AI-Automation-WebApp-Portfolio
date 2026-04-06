"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookMarked, Loader2, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersehubCompletionRitualProps {
    chapterLabel: string;
    promptText: string;
    reflectionValue: string;
    onReflectionChange: (value: string) => void;
    onSaveReflection: () => void;
    onShareInsight: () => void;
    onOpenJournal: () => void;
    isReflectionSaved: boolean;
    isSavingReflection: boolean;
    isSharingInsight: boolean;
    reflectionError: string | null;
    shareError: string | null;
}

export function VersehubCompletionRitual({
    chapterLabel,
    promptText,
    reflectionValue,
    onReflectionChange,
    onSaveReflection,
    onShareInsight,
    onOpenJournal,
    isReflectionSaved,
    isSavingReflection,
    isSharingInsight,
    reflectionError,
    shareError,
}: VersehubCompletionRitualProps) {
    const canSave = reflectionValue.trim().length >= 3 && !isReflectionSaved && !isSavingReflection;

    return (
        <motion.section
            initial={{ opacity: 0, y: 26, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,248,255,0.92))] p-6 shadow-[0_32px_80px_-48px_rgba(37,99,235,0.38)] backdrop-blur-2xl md:p-7"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.58),transparent_46%)]" />
            <motion.div
                aria-hidden="true"
                animate={{ scale: [0.96, 1.08, 0.98], opacity: [0.28, 0.55, 0.34] }}
                transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut" }}
                className="pointer-events-none absolute left-1/2 top-[-72px] h-44 w-44 -translate-x-1/2 rounded-full bg-[#dbeafe] blur-3xl"
            />

            <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7c8dbf]">
                            Completion Ritual
                        </p>
                        <h3 className="mt-2 text-[28px] font-black tracking-tight text-slate-900">
                            {chapterLabel} selesai dibaca.
                        </h3>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                            Simpan momen ini sebelum ritmenya lewat. Sedikit refleksi akan membuat bacaanmu terasa lebih utuh dan lebih mudah kembali dilanjutkan nanti.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-white/78 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700 ring-1 ring-sky-100/80">
                        <Sparkles className="h-3.5 w-3.5" />
                        Sanctuary Bloom Active
                    </div>
                </div>

                <div className="mt-6 rounded-[28px] bg-white/72 p-5 ring-1 ring-black/[0.04]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Ringkas Dalam Hatimu
                    </p>
                    <p className="mt-2 text-[16px] leading-[1.72] text-slate-800/90">
                        {promptText}
                    </p>

                    <textarea
                        value={reflectionValue}
                        onChange={(event) => onReflectionChange(event.target.value)}
                        placeholder="Apa satu hal yang paling tinggal bersamamu dari pasal ini?"
                        className="mt-4 min-h-[120px] w-full resize-none rounded-2xl bg-[#f8fafc] px-5 py-4 text-[15px] leading-[1.65] text-slate-800/85 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-100"
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={onSaveReflection}
                            disabled={!canSave}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full px-5 py-3 text-[12px] font-black uppercase tracking-[0.18em] transition",
                                canSave
                                    ? "bg-slate-900 text-white hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(14,165,233,0.78))]"
                                    : "bg-slate-100 text-slate-400"
                            )}
                        >
                            {isSavingReflection ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
                            {isReflectionSaved ? "Tersimpan ke Arsip" : "Simpan Perenungan ke Arsip"}
                        </button>

                        <button
                            type="button"
                            onClick={onShareInsight}
                            disabled={isSharingInsight}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-700 ring-1 ring-black/5 transition hover:-translate-y-[1px] hover:bg-slate-50"
                        >
                            {isSharingInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                            Share Insight to Community
                        </button>

                        <button
                            type="button"
                            onClick={onOpenJournal}
                            className="inline-flex items-center gap-2 rounded-full px-2 py-3 text-[12px] font-black uppercase tracking-[0.18em] text-sky-700 transition hover:text-sky-800"
                        >
                            Buka Arsip Refleksi
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    <AnimatePresence initial={false}>
                        {reflectionError ? (
                            <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 text-[13px] font-medium text-rose-500"
                            >
                                {reflectionError}
                            </motion.p>
                        ) : null}
                    </AnimatePresence>

                    <AnimatePresence initial={false}>
                        {shareError ? (
                            <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2 text-[13px] font-medium text-rose-500"
                            >
                                {shareError}
                            </motion.p>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
        </motion.section>
    );
}
