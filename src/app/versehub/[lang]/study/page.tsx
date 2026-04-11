"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BookOpen, Clock, ChevronRight, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

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
}

export default function StudyPathsIndexPage() {
    const params = useParams();
    const router = useRouter();
    const lang = params?.lang as string || 'id';
    const isId = lang === 'id';
    const refreshTick = useMutationRefreshTick(['/api/study-paths/', '/api/versehub/']);

    const [paths, setPaths] = useState<StudyPath[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            try {
                const response = await fetch(`/api/study-paths/${lang}`, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!isActive) return;
                setPaths(Array.isArray(payload.paths) ? payload.paths : []);
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
    }, [lang, refreshTick]);

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            {/* Header parity */}
            <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 transition-all">
                <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
                    <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10 active:scale-95">
                        <X className="h-4 w-4" />
                    </button>
                    <h1 className="font-bold text-lg">{isId ? 'Jalur Belajar' : 'Study Paths'}</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="relative mx-auto max-w-4xl px-4 py-12">
                <header className="mb-12 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200 shadow-sm border border-amber-100">
                        <Sparkles className="h-3.5 w-3.5" />
                        Scripture Guide
                    </div>
                    <h2 className="tct-brand-gradient text-4xl font-bold tracking-tight mb-4">
                        {isId ? 'Jalur Belajar' : 'Study Paths'}
                    </h2>
                    <p className="mt-3 text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
                        {isId
                            ? 'Ikuti kurikulum ayat-ayat Alkitab yang dikurasi untuk pertumbuhanmu.'
                            : 'Follow curated Bible verse paths designed for your growth.'}
                    </p>
                </header>

                {loading ? (
                    <div className="grid gap-6 sm:grid-cols-2">
                        {[1, 2].map(i => <div key={i} className="h-48 bg-slate-200/50 rounded-[32px] animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2">
                        {paths.map((path) => (
                            <button
                                key={path.id}
                                onClick={() => router.push(`/versehub/${lang}/study/${path.slug}`)}
                                className="group relative flex flex-col overflow-hidden rounded-[32px] bg-slate-800/60 p-7 text-left ring-1 ring-white/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-amber-400/30"
                            >
                                {/* Accent Background Parity */}
                                <div className={cn(
                                    "absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-25",
                                    path.cover_color === 'amber' && "bg-amber-500",
                                    path.cover_color === 'sky' && "bg-sky-500",
                                    path.cover_color === 'green' && "bg-emerald-500",
                                    path.cover_color === 'rose' && "bg-rose-500"
                                )} />

                                <div className="flex flex-1 flex-col relative z-10">
                                    <div className="mb-6 flex items-center justify-between">
                                        <span className={cn(
                                            "rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest ring-1",
                                            path.cover_color === 'amber' && "bg-amber-50 text-amber-700 ring-amber-200/50",
                                            path.cover_color === 'sky' && "bg-sky-50 text-sky-700 ring-sky-200/50",
                                            path.cover_color === 'green' && "bg-emerald-50 text-emerald-700 ring-emerald-200/50",
                                            path.cover_color === 'rose' && "bg-rose-50 text-rose-700 ring-rose-200/50"
                                        )}>
                                            {path.difficulty}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            {path.estimated_minutes}m
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                                        {isId ? path.title_id : path.title_en}
                                    </h3>
                                    <p className="mt-3 line-clamp-2 text-sm text-slate-500 leading-relaxed">
                                        {isId ? path.description_id : path.description_en}
                                    </p>

                                    <div className="mt-8 flex items-center justify-between pt-5 border-t border-white/5">
                                        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400">
                                            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-amber-500/20">
                                                <BookOpen className="h-4 w-4 group-hover:text-amber-500" />
                                            </div>
                                            {isId ? 'Mulai Belajar' : 'Start Learning'}
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-amber-500" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {!loading && paths.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 rounded-full bg-white/5 p-6 text-slate-500">
                            <BookOpen className="h-10 w-10" />
                        </div>
                        <p className="text-slate-500">
                            {isId ? 'Belum ada jalur belajar tersedia.' : 'No study paths available yet.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
