"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, CalendarDays, BookOpen, ArrowLeft } from 'lucide-react';
import { buildAppAuthHeaders } from '@/lib/app-auth-fetch';
import { cn } from '@/lib/utils';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

type Day = {
    day_key: string;
    date: string;
    title: string;
    status: string;
};

export default function SabbathSchoolLessonPage() {
    const params = useParams();
    const router = useRouter();
    const yearParam = params?.year;
    const quarterParam = params?.quarter;
    const lessonParam = params?.lessonNumber;
    const year = Array.isArray(yearParam) ? yearParam[0] : yearParam;
    const quarter = Array.isArray(quarterParam) ? quarterParam[0] : quarterParam;
    const lessonNumber = Array.isArray(lessonParam) ? lessonParam[0] : lessonParam;
    const refreshTick = useMutationRefreshTick(['/api/sabbath-school/', '/api/channels/']);

    const [days, setDays] = useState<Day[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!year || !quarter || !lessonNumber) return;

        let isActive = true;
        const load = async () => {
            try {
                const response = await fetch(`/api/sabbath-school/${year}/${quarter}/lesson/${lessonNumber}`, {
                    method: 'GET',
                    headers: buildAppAuthHeaders(),
                    cache: 'no-store',
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!isActive) return;
                setDays(Array.isArray(payload.days) ? payload.days : []);
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
    }, [year, quarter, lessonNumber, refreshTick]);

    const formatShortDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d);
        } catch {
            return iso;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header Parity */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
                <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
                    <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-elevated active:scale-95 transition-all text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lesson {lessonNumber}</p>
                        <h1 className="font-bold text-base leading-tight text-foreground">Materi Mingguan</h1>
                    </div>
                    <div className="w-10" />
                </div>
            </div>

            <main className="mx-auto max-w-2xl px-4 py-8 space-y-4">
                <div className="grid gap-3">
                    {days.map((day) => (
                        <button
                            key={day.day_key}
                            onClick={() => router.push(`/channels/sabbath-school/${year}/${quarter}/lesson/${lessonNumber}/${day.day_key}`)}
                            className="group flex items-center justify-between p-5 rounded-[28px] bg-surface shadow-soft ring-1 ring-border/50 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-5">
                                <div className="h-12 w-12 rounded-2xl bg-surface-muted flex flex-col items-center justify-center ring-1 ring-border/50">
                                    <span className="text-[9px] font-bold uppercase text-muted-foreground">{day.day_key}</span>
                                    <span className="text-sm font-bold text-foreground">{formatShortDate(day.date)}</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-[15px] text-foreground leading-tight">{day.title}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <BookOpen className="h-3 w-3 text-brand" />
                                        <span className="text-[11px] font-bold text-muted-foreground">Baca Materi</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-brand transition-colors" />
                        </button>
                    ))}
                </div>

                <div className="pt-8 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">Sabbath School Channel</p>
                </div>
            </main>
        </div>
    );
}
