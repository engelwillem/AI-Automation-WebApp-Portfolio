
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, CircleCheckBig, LayoutGrid, MoveRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getAppAccessToken } from '@/services/app-auth-token';

type Channel = {
    id: number;
    slug: string;
    title: string;
    description?: string | null;
    cover_image_url?: string | null;
    type: string;
    members_count?: number;
    is_joined?: boolean;
};

type Lesson = {
    id: number;
    lesson_number: number;
    title?: string | null;
    start_date: string;
    end_date: string;
};

type QuarterWithLessons = {
    id: number;
    year: number;
    quarter: number;
    title?: string | null;
    start_date: string;
    end_date: string;
    is_active: boolean;
    lessons: Lesson[];
};

type TodayTarget = { 
    year: number; 
    quarter: number; 
    lesson_number: number; 
    day_key: string; 
    date: string 
} | null;

export default function ChannelsPage() {
    const router = useRouter();
    
    const [channels, setChannels] = useState<Channel[]>([]);
    const [sabbathSchool, setSabbathSchool] = useState<{
        channel?: Channel | null;
        activeQuarterId?: number | null;
        activeQuarter?: any;
        quartersWithLessons?: QuarterWithLessons[];
        todayTarget?: TodayTarget;
    } | null>(null);
    
    const [seriesTab, setSeriesTab] = useState<'current' | 'past' | 'upcoming'>('current');
    const [selectedQuarterId, setSelectedQuarterId] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            try {
                const token = getAppAccessToken();
                const response = await fetch('/api/channels', {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    cache: 'no-store',
                });
                if (!response.ok) return;

                const payload = await response.json();
                if (!isActive) return;

                setChannels(Array.isArray(payload.channels) ? payload.channels : []);
                setSabbathSchool(payload.sabbathSchool ?? null);
                setSelectedQuarterId(payload.sabbathSchool?.activeQuarterId ?? 0);
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
    }, []);

    const handleMembershipToggle = async (channelSlug: string) => {
        const token = getAppAccessToken();
        if (!token) return;

        try {
            const response = await fetch(`/api/channels/${channelSlug}/membership`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) return;

            const payload = await response.json();
            setChannels(prev => prev.map(channel => {
                if (channel.slug !== channelSlug) return channel;
                return {
                    ...channel,
                    is_joined: Boolean(payload.is_joined),
                    members_count: typeof payload.members_count === 'number' ? payload.members_count : channel.members_count,
                };
            }));
        } catch {
            // Keep UI responsive
        }
    };

    const quarters = sabbathSchool?.quartersWithLessons ?? [];
    const selectedQuarter = quarters.find(q => q.id === selectedQuarterId) ?? quarters[0] ?? null;
    const lessonStates = selectedQuarter?.lessons.map(l => ({
        lesson: l,
        locked: false,
        completed: false,
        isCurrent: l.lesson_number === 1
    })) ?? [];

    const filteredLessons = lessonStates;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 transition-all">
                <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
                    <h1 className="font-bold text-lg">Channels</h1>
                    <div className="w-10" />
                </div>
            </div>

            <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
                <motion.section 
                    initial={{ opacity: 0, y: 16 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="overflow-hidden rounded-[32px] bg-white/[0.02] border border-white/5 ring-1 ring-white/5 backdrop-blur-sm"
                >
                    <div className="relative h-48 md:h-56">
                        <img
                            src={sabbathSchool?.channel?.cover_image_url ?? "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=800"}
                            alt="Sabbath School"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white ring-1 ring-white/20 backdrop-blur-sm">
                                SabbathSchool
                            </div>
                            <h2 className="mt-2 text-2xl font-bold text-white">{selectedQuarter?.title ?? 'Quarter Study'}</h2>
                            <p className="mt-1 text-xs text-white/80 font-medium">Q1 2026</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <Button 
                            className="h-14 w-full rounded-[20px] bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white shadow-lg active:scale-95 transition-all text-sm"
                            onClick={() => {
                                if (sabbathSchool?.todayTarget) {
                                    const t = sabbathSchool.todayTarget;
                                    router.push(`/channels/sabbath-school/${t.year}/q${t.quarter}/lesson/${t.lesson_number}/${t.day_key}`);
                                }
                            }}
                        >
                            Lanjutkan Pelajaran <MoveRight className="ml-2 h-4 w-4" />
                        </Button>

                        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-black/40 p-1.5 ring-1 ring-white/10 shadow-inner">
                             {(['current', 'past', 'upcoming'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setSeriesTab(tab)}
                                    className={cn(
                                        "rounded-xl py-2 text-[11px] font-bold transition-all",
                                        seriesTab === tab ? "bg-white/10 text-white shadow-sm" : "text-slate-500"
                                    )}
                                >
                                    {tab === 'current' ? 'Aktif' : tab === 'past' ? 'Lalu' : 'Mendatang'}
                                </button>
                             ))}
                        </div>

                        <div className="space-y-3 rounded-[24px] bg-black/20 p-5 ring-1 ring-white/5 shadow-inner">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-white tracking-tight">Lessons</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">0/{lessonStates.length} Completed</p>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 w-0 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                            </div>

                            <div className="grid gap-2.5 mt-4">
                                {filteredLessons.map(({ lesson, isCurrent }) => (
                                    <button
                                        key={lesson.id}
                                        onClick={() => {
                                             router.push(`/channels/sabbath-school/${selectedQuarter?.year}/q${selectedQuarter?.quarter}/lesson/${lesson.lesson_number}`);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] ring-1 ring-white/5 transition-all text-left group hover:bg-white/[0.04]",
                                            isCurrent ? "ring-cyan-500/40 bg-cyan-900/10" : ""
                                        )}
                                    >
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-cyan-400 transition-colors">Lesson {lesson.lesson_number}</p>
                                            <p className="font-bold text-sm text-white mt-1">{lesson.title}</p>
                                        </div>
                                        {isCurrent && <span className="bg-cyan-500 rounded-full px-2 py-0.5 text-[9px] font-bold text-slate-950 uppercase tracking-widest">Sekarang</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h3 className="text-lg font-bold tracking-tight">Channel Lainnya</h3>
                         <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-900/30 px-3 py-1 rounded-full ring-1 ring-cyan-500/30">
                            {channels.length} Kanal
                         </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {channels.map(channel => (
                            <button
                                key={channel.slug}
                                onClick={() => router.push(`/channels/${channel.slug}`)}
                                className="group flex flex-col overflow-hidden rounded-[32px] bg-white/[0.02] border border-white/5 ring-1 ring-white/5 transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-white/[0.04]"
                            >
                                <div className="relative h-32 w-full overflow-hidden">
                                    <img
                                        src={channel.cover_image_url ?? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800"}
                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        alt={channel.title}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                </div>
                                <div className="p-4 pt-3 flex-1 flex flex-col justify-between">
                                    <div>
                                        <p className="font-bold text-sm tracking-tight text-white line-clamp-1">{channel.title}</p>
                                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 font-medium">{channel.description}</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <div className="h-1 w-1 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-[9px] font-bold text-slate-500">{channel.members_count} anggota</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleMembershipToggle(channel.slug);
                                            }}
                                            className="text-[9px] font-bold text-slate-100 bg-white/10 px-2.5 py-1 rounded-full border border-white/5 hover:bg-white/20 transition-colors"
                                        >
                                            {channel.is_joined ? 'Leave' : 'Join'}
                                        </button>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
