"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuthSession } from '@/auth/use-auth-session';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, MoveRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { buildAppAuthHeaders, fetchWithAppAuth } from '@/lib/app-auth-fetch';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

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
    date: string;
} | null;

type SabbathPayload = {
    channel?: Channel | null;
    activeQuarterId?: number | null;
    quartersWithLessons?: QuarterWithLessons[];
    todayTarget?: TodayTarget;
};

const shortDate = (value?: string | null): string => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ChannelsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthSession();
    const refreshTick = useMutationRefreshTick(['/api/channels/', '/api/channels', '/api/sabbath-school/']);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [sabbathSchool, setSabbathSchool] = useState<SabbathPayload | null>(null);
    const [selectedQuarterId, setSelectedQuarterId] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;
        const load = async () => {
            try {
                const response = await fetch('/api/channels', {
                    method: 'GET',
                    headers: buildAppAuthHeaders(),
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
    }, [refreshTick]);

    const handleMembershipToggle = async (channelSlug: string) => {
        if (!isAuthenticated) return;

        try {
            const response = await fetchWithAppAuth(`/api/channels/${channelSlug}/membership`, {
                method: 'POST',
                headers: buildAppAuthHeaders(),
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
    const selectedQuarter = useMemo(
        () => quarters.find(item => item.id === selectedQuarterId) ?? quarters[0] ?? null,
        [quarters, selectedQuarterId],
    );

    const lessonCount = selectedQuarter?.lessons?.length ?? 0;
    const currentLessonNumber = sabbathSchool?.todayTarget?.lesson_number ?? 0;
    const completedLessons = selectedQuarter?.lessons
        ?.filter(item => item.lesson_number < currentLessonNumber)
        ?.length ?? 0;
    const progressWidth = lessonCount > 0 ? `${Math.round((completedLessons / lessonCount) * 100)}%` : '0%';

    if (loading) {
        return (
            <div className="min-h-screen bg-background px-4 py-10">
                <div className="mx-auto max-w-2xl space-y-4">
                    <div className="h-12 rounded-2xl bg-surface-muted animate-pulse border border-border/50" />
                    <div className="h-60 rounded-3xl bg-surface-muted animate-pulse border border-border/50" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-40 rounded-3xl bg-surface-muted animate-pulse border border-border/50" />
                        <div className="h-40 rounded-3xl bg-surface-muted animate-pulse border border-border/50" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
                <div className="mx-auto max-w-2xl px-4 py-4">
                    <h1 className="text-lg font-bold tracking-tight">Channels</h1>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
                <section className="rounded-[24px] border border-amber-200/70 bg-amber-50/70 p-4 shadow-soft">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Ruang Belajar</p>
                    <p className="mt-2 text-sm font-semibold text-amber-900">
                        Channels mengumpulkan kelas, pelajaran aktif, dan pintu masuk ke ritme belajar iman. Gunakan Journey untuk jalur pribadi dan Community untuk respons bersama.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-full border-amber-300 bg-white text-[11px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-100"
                            onClick={() => router.push('/journey')}
                        >
                            Lanjutkan Journey
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-full border-amber-300 bg-white text-[11px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-100"
                            onClick={() => router.push('/community')}
                        >
                            Buka Community
                        </Button>
                    </div>
                </section>

                <section className="overflow-hidden rounded-[30px] bg-surface ring-1 ring-border/50 shadow-soft">
                    <div className="relative h-48">
                        <img
                            src={sabbathSchool?.channel?.cover_image_url ?? 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=800'}
                            alt="Sabbath School"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-5">
                            <p className="inline-flex rounded-full bg-surface-elevated/50 backdrop-blur-md border border-border/50 text-foreground text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-sm">
                                Sabbath School
                            </p>
                            <h2 className="mt-2 text-2xl font-bold text-foreground">{selectedQuarter?.title ?? 'Quarter Study'}</h2>
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                                {shortDate(selectedQuarter?.start_date)} - {shortDate(selectedQuarter?.end_date)}
                            </p>
                        </div>
                    </div>

                    <div className="p-5 space-y-4">
                        <Button
                            className="h-12 w-full rounded-2xl bg-foreground hover:bg-foreground/90 text-background font-bold shadow-soft"
                            onClick={() => {
                                if (!sabbathSchool?.todayTarget) return;
                                const target = sabbathSchool.todayTarget;
                                router.push(`/channels/sabbath-school/${target.year}/q${target.quarter}/lesson/${target.lesson_number}/${target.day_key}`);
                            }}
                        >
                            Lanjutkan Pelajaran
                            <MoveRight className="ml-2 h-4 w-4" />
                        </Button>

                        {quarters.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {quarters.map(quarter => (
                                    <button
                                        key={quarter.id}
                                        type="button"
                                        onClick={() => setSelectedQuarterId(quarter.id)}
                                        className={cn(
                                            'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 transition-colors',
                                            selectedQuarterId === quarter.id
                                                ? 'bg-foreground text-background ring-foreground'
                                                : 'bg-surface text-muted-foreground ring-border/50 hover:bg-surface-elevated',
                                        )}
                                    >
                                        Q{quarter.quarter} {quarter.year}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="rounded-2xl border border-border/50 p-4 space-y-2 bg-surface-muted/50">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-foreground/80">Progress lesson quarter ini</span>
                                <span className="text-muted-foreground">{completedLessons}/{lessonCount}</span>
                            </div>
                            <div className="h-2 rounded-full bg-surface overflow-hidden border border-border/50">
                                <div className="h-full bg-brand transition-all shadow-[0_0_10px_rgba(var(--brand-rgb),0.5)]" style={{ width: progressWidth }} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            {(selectedQuarter?.lessons ?? []).slice(0, 5).map(lesson => (
                                <button
                                    key={lesson.id}
                                    type="button"
                                    onClick={() => router.push(`/channels/sabbath-school/${selectedQuarter?.year}/q${selectedQuarter?.quarter}/lesson/${lesson.lesson_number}`)}
                                    className="flex items-start justify-between rounded-2xl bg-surface-muted px-4 py-3 text-left hover:bg-surface-elevated transition-colors border border-border/50"
                                >
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Lesson {lesson.lesson_number}</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">{lesson.title ?? 'Untitled lesson'}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Channel Lainnya</h3>
                        <span className="text-[11px] font-bold text-muted-foreground">{channels.length} channels</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {channels.map(channel => (
                            <article key={channel.slug} className="rounded-[26px] bg-surface ring-1 ring-border/50 overflow-hidden shadow-soft">
                                <button
                                    type="button"
                                    onClick={() => router.push(`/channels/${channel.slug}`)}
                                    className="w-full text-left group"
                                >
                                    <div className="h-28 w-full overflow-hidden">
                                        <img
                                            src={channel.cover_image_url ?? 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800'}
                                            alt={channel.title}
                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <p className="text-sm font-bold tracking-tight text-foreground">{channel.title}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">{channel.description ?? 'Weekly devotion channel.'}</p>
                                    </div>
                                </button>
                                <div className="px-4 pb-4 flex items-center justify-between">
                                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>{channel.members_count ?? 0}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleMembershipToggle(channel.slug)}
                                        className={cn(
                                            'text-[11px] font-bold rounded-full px-3 py-1.5 transition-colors shadow-sm ring-1',
                                            channel.is_joined ? 'bg-surface-elevated text-foreground ring-border/50 hover:bg-surface-muted' : 'bg-foreground text-background hover:bg-foreground/90 ring-foreground/50',
                                        )}
                                    >
                                        {channel.is_joined ? 'Joined' : 'Join'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {channels.length === 0 && (
                    <section className="rounded-[32px] bg-surface ring-1 ring-border/50 p-8 text-center shadow-soft">
                        <div className="mx-auto bg-surface-muted border border-border/50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <CalendarDays className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Belum ada channel aktif.</p>
                        <p className="text-xs text-muted-foreground mt-1">Silakan refresh beberapa saat lagi.</p>
                    </section>
                )}
            </main>
        </div>
    );
}
