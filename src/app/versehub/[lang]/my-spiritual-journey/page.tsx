"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useAuthSession } from '@/auth/use-auth-session';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Share2, ExternalLink, PenLine, X, Zap, Sparkles, Heart, Bookmark as BookmarkIcon, History } from 'lucide-react';
import { buildAppAuthHeaders, fetchWithAppAuth } from '@/lib/app-auth-fetch';
import { cn } from '@/lib/utils';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

type ActivityItem = {
    id: string;
    ref: string;
    book: string;
    book_label: string;
    chapter: number;
    verse: number;
    chapter_href: string;
    is_favorite: boolean;
    is_bookmark: boolean;
    note: string;
    updated_at: string | null;
    source_type: 'favorite' | 'bookmark' | 'note';
};

type ActivityGroup = {
    label: string;
    items: ActivityItem[];
};

type ActivityStats = {
    streak: number;
    total_saved: number;
    this_week: number;
    growth_percent: number;
};

type SummaryItem = {
    ref: string;
    href?: string;
    book: string;
    chapter: number;
    verse: number;
    note?: string;
    updated_at?: string | null;
};

type JourneySummaryResponse = {
    favorites?: SummaryItem[];
    bookmarks?: SummaryItem[];
    notes?: SummaryItem[];
    counts?: {
        favorites?: number;
        bookmarks?: number;
        notes?: number;
    };
    message?: string;
};

const JAKARTA_TIMEZONE = 'Asia/Jakarta';
const TIMELINE_ORDER = ['Hari Ini', 'Kemarin', 'Minggu Ini', 'Bulan Ini', 'Bulan Lalu', 'Lama'] as const;

function toTimestamp(raw: string | null | undefined): number {
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
}

function getTimelineLabel(raw: string | null | undefined): string {
    if (!raw) return 'Lama';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return 'Lama';

    const now = new Date();
    const toKey = (dt: Date) => dt.toLocaleDateString('en-CA', { timeZone: JAKARTA_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

    const rowKey = toKey(date);
    const todayKey = toKey(now);
    if (rowKey === todayKey) return 'Hari Ini';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (rowKey === toKey(yesterday)) return 'Kemarin';

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    const weekStartKey = toKey(startOfWeek);
    if (rowKey >= weekStartKey && rowKey <= todayKey) return 'Minggu Ini';

    const rowParts = { year: date.getFullYear(), month: date.getMonth() };
    const nowParts = { year: now.getFullYear(), month: now.getMonth() };
    if (rowParts.year === nowParts.year && rowParts.month === nowParts.month) return 'Bulan Ini';
    if (rowParts.year === nowParts.year && rowParts.month === nowParts.month - 1) return 'Bulan Lalu';

    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function groupByTimeline(items: ActivityItem[]): ActivityGroup[] {
    const grouped = new Map<string, ActivityItem[]>();
    items.forEach((item) => {
        const label = getTimelineLabel(item.updated_at);
        const bucket = grouped.get(label) ?? [];
        bucket.push(item);
        grouped.set(label, bucket);
    });

    const weight = new Map<string, number>();
    TIMELINE_ORDER.forEach((label, index) => weight.set(label, index));

    return Array.from(grouped.entries())
        .sort(([labelA, itemsA], [labelB, itemsB]) => {
            const wa = weight.get(labelA);
            const wb = weight.get(labelB);
            if (wa !== undefined && wb !== undefined) return wa - wb;
            if (wa !== undefined) return -1;
            if (wb !== undefined) return 1;
            const maxA = Math.max(...itemsA.map((i) => toTimestamp(i.updated_at)));
            const maxB = Math.max(...itemsB.map((i) => toTimestamp(i.updated_at)));
            return maxB - maxA;
        })
        .map(([label, groupItems]) => ({ label, items: groupItems }));
}

function formatRelativeDate(raw?: string | null) {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays <= 0) return 'Tadi baru saja';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
    return d.toLocaleDateString('id-ID', { dateStyle: 'medium' });
}

function computeStreak(items: ActivityItem[]): number {
    const uniqueDays = Array.from(
        new Set(
            items
                .map((item) => item.updated_at)
                .filter(Boolean)
                .map((date) => new Date(String(date)).toLocaleDateString('en-CA', { timeZone: JAKARTA_TIMEZONE })),
        ),
    );

    let streak = 0;
    const cursor = new Date();
    while (true) {
        const key = cursor.toLocaleDateString('en-CA', { timeZone: JAKARTA_TIMEZONE });
        if (!uniqueDays.includes(key)) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

export default function SpiritualJourneyPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated, isRestoring } = useAuthSession();
    const refreshTick = useMutationRefreshTick(['/api/versehub/']);
    const lang = params?.lang as string || 'id';
    const isId = lang === 'id';

    const [localItems, setLocalItems] = useState<ActivityItem[]>([]);
    const [stats, setStats] = useState<ActivityStats>({ streak: 0, total_saved: 0, this_week: 0, growth_percent: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [authRequired, setAuthRequired] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const toLabel = (book: string) => {
        const source = String(book || '').trim();
        if (!source) return '-';
        return source.charAt(0).toUpperCase() + source.slice(1);
    };

    const toActivityItem = (sourceType: ActivityItem['source_type'], row: SummaryItem, index: number): ActivityItem => ({
        id: `${sourceType}-${row.ref}-${row.updated_at || 'na'}-${index}`,
        ref: row.ref,
        book: row.book,
        book_label: toLabel(row.book),
        chapter: Number(row.chapter || 0),
        verse: Number(row.verse || 0),
        chapter_href: row.href || `/versehub/${lang}/${row.book}-${row.chapter}`,
        is_favorite: sourceType === 'favorite',
        is_bookmark: sourceType === 'bookmark',
        note: sourceType === 'note' ? String(row.note || '') : '',
        updated_at: row.updated_at || null,
        source_type: sourceType,
    });

    useEffect(() => {
        let active = true;

        const loadJourney = async () => {
            if (isRestoring) {
                return;
            }

            if (!isAuthenticated) {
                if (!active) return;
                setAuthRequired(true);
                setLocalItems([]);
                setLoading(false);
                return;
            }

            try {
                const response = await fetchWithAppAuth(`/api/versehub/${lang}/actions/summary?limit=200&sort=recent`, {
                    headers: buildAppAuthHeaders(),
                    cache: 'no-store',
                });

                if (!active) return;
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        setAuthRequired(true);
                        setLocalItems([]);
                        return;
                    }
                    const payload = (await response.json().catch(() => ({}))) as JourneySummaryResponse;
                    setErrorMessage(payload?.message || (isId ? 'Gagal memuat perjalanan rohani.' : 'Failed to load spiritual journey.'));
                    setLocalItems([]);
                    return;
                }

                const payload = (await response.json()) as JourneySummaryResponse;
                const favorites = Array.isArray(payload.favorites) ? payload.favorites : [];
                const bookmarks = Array.isArray(payload.bookmarks) ? payload.bookmarks : [];
                const notes = Array.isArray(payload.notes) ? payload.notes : [];

                const merged = [
                    ...favorites.map((row, index) => toActivityItem('favorite', row, index)),
                    ...bookmarks.map((row, index) => toActivityItem('bookmark', row, index)),
                    ...notes.map((row, index) => toActivityItem('note', row, index)),
                ].sort((a, b) => toTimestamp(b.updated_at) - toTimestamp(a.updated_at));

                const oneWeekAgo = Date.now() - (7 * 86_400_000);
                const thisWeek = merged.filter((item) => toTimestamp(item.updated_at) >= oneWeekAgo).length;
                const counts = payload.counts || {};
                const totalSaved = Number(counts.favorites || 0) + Number(counts.bookmarks || 0) + Number(counts.notes || 0);

                setLocalItems(merged);
                setStats({
                    streak: computeStreak(merged),
                    total_saved: totalSaved,
                    this_week: thisWeek,
                    growth_percent: 0,
                });
                setAuthRequired(false);
                setErrorMessage(null);
            } catch {
                if (!active) return;
                setErrorMessage(isId ? 'Tidak dapat terhubung ke server perjalanan rohani.' : 'Unable to connect to spiritual journey server.');
                setLocalItems([]);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadJourney();
        return () => {
            active = false;
        };
    }, [isAuthenticated, isId, isRestoring, lang, refreshTick]);

    const filteredItems = useMemo(() => {
        const byTab = localItems.filter((row) => {
            if (activeTab === 'favorites') return row.source_type === 'favorite';
            if (activeTab === 'bookmarks') return row.source_type === 'bookmark';
            if (activeTab === 'notes') return row.source_type === 'note';
            return true;
        });

        const q = searchQuery.trim().toLowerCase();
        if (!q) return byTab;
        return byTab.filter((row) =>
            row.ref.toLowerCase().includes(q) ||
            row.book_label.toLowerCase().includes(q) ||
            row.note.toLowerCase().includes(q),
        );
    }, [activeTab, localItems, searchQuery]);

    const localGroups = useMemo(() => groupByTimeline(filteredItems), [filteredItems]);

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-brand/30">
            <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border/50">
                <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-muted border border-border/50 active:scale-95 transition-all hover:bg-surface-elevated text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-base leading-none">
                            {isId ? 'Perjalanan Rohani' : 'Spiritual Journey'}
                        </h1>
                        <span className="text-[10px] font-bold text-brand uppercase tracking-widest mt-1.5 opacity-80">Activity Log</span>
                    </div>

                    <div className="h-11 w-11 flex items-center justify-center rounded-full bg-surface-muted text-muted-foreground opacity-50 border border-transparent">
                        <History className="h-4 w-4" />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-5 py-8">
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-surface rounded-[40px] p-8 shadow-card border border-border/50"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <Zap className="h-6 w-6 text-brand" fill="currentColor" />
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Streak</span>
                        </div>
                        <p className="text-5xl font-bold tracking-tighter text-foreground">
                            {stats.streak}
                            <span className="text-[14px] font-semibold text-muted-foreground/50 ml-2 tracking-normal">{isId ? 'HARI' : 'DAYS'}</span>
                        </p>
                        <p className="mt-4 text-[11px] font-bold text-brand uppercase tracking-widest">Keep growing!</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-foreground text-background rounded-[40px] p-8 shadow-xl"
                    >
                        <div className="flex items-center gap-3 mb-6 text-background/60">
                            <Sparkles className="h-6 w-6" />
                            <span className="text-[10px] font-extrabold uppercase tracking-widest">Total Saved</span>
                        </div>
                        <p className="text-5xl font-bold tracking-tighter">{stats.total_saved}</p>
                        <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-background/70">
                            {isId ? `${stats.this_week} item minggu ini` : `${stats.this_week} items this week`}
                        </p>
                    </motion.div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['all', 'favorites', 'bookmarks', 'notes'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-[11px] font-bold tracking-widest transition-all whitespace-nowrap border",
                                    activeTab === tab ? "bg-foreground text-background border-border/50 shadow-soft" : "bg-surface text-muted-foreground border-border/50 hover:bg-surface-elevated",
                                )}
                            >
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={isId ? "Cari dalam riwayat..." : "Search your history..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-13 bg-surface border border-border/50 rounded-2xl pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-border/50 focus:bg-surface-elevated outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="mt-8 space-y-8">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-surface-muted rounded-[28px] animate-pulse" />)}
                        </div>
                    ) : authRequired ? (
                        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
                            <h3 className="text-lg font-black">{isId ? 'Login diperlukan' : 'Login required'}</h3>
                            <p className="mt-2 text-sm leading-relaxed">
                                {isId
                                    ? 'Journey rohanimu tersimpan per akun. Masuk untuk melihat favorit, bookmark, dan catatan ayatmu.'
                                    : 'Your spiritual journey is stored per account. Sign in to view saved favorites, bookmarks, and notes.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push(`/login?next=${encodeURIComponent(`/versehub/${lang}/my-spiritual-journey`)}`)}
                                className="mt-5 inline-flex rounded-full bg-amber-900 px-5 py-2.5 text-xs font-bold text-amber-50 shadow-sm transition hover:bg-amber-950"
                            >
                                {isId ? 'Login' : 'Sign in'}
                            </button>
                        </div>
                    ) : errorMessage ? (
                        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
                            {errorMessage}
                        </div>
                    ) : localGroups.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground">
                                {isId ? 'Belum ada aktivitas tercatat.' : 'No activity recorded yet.'}
                            </p>
                        </div>
                    ) : (
                        localGroups.map((group) => (
                            <div key={group.label} className="space-y-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">{group.label}</h3>
                                <div className="space-y-3">
                                    {group.items.map((row) => (
                                        <motion.div
                                            key={row.id}
                                            layout
                                            className={cn(
                                                "rounded-[32px] glass-card border-0 backdrop-blur-md transition-all duration-300",
                                                expanded[row.id] ? "ring-2 ring-brand/20 bg-surface-elevated shadow-card" : "hover:bg-surface-elevated",
                                            )}
                                        >
                                            <button
                                                onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                                                className="w-full text-left p-5"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-foreground text-base tracking-tight">{row.book_label} {row.chapter}:{row.verse}</p>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1.5">{formatRelativeDate(row.updated_at)}</p>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        {row.is_favorite && <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />}
                                                        {row.is_bookmark && <BookmarkIcon className="h-3.5 w-3.5 text-brand fill-brand" />}
                                                    </div>
                                                </div>
                                                {row.note && (
                                                    <p className="mt-3 text-sm text-muted-foreground italic line-clamp-1">"{row.note}"</p>
                                                )}
                                            </button>

                                            <AnimatePresence>
                                                {expanded[row.id] && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="px-6 pb-6 pt-2 border-t border-border/50 bg-surface/50"
                                                    >
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            <a href={row.chapter_href} className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-foreground text-background text-[11px] font-bold hover:bg-foreground/90">
                                                                <ExternalLink className="h-3 w-3" /> Reader
                                                            </a>
                                                            <button className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-surface-muted border border-border/50 text-[11px] font-bold text-foreground/80 hover:bg-surface-elevated">
                                                                <PenLine className="h-3 w-3" /> Edit Note
                                                            </button>
                                                            <button className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-surface-muted border border-border/50 text-[11px] font-bold text-foreground/80 hover:bg-surface-elevated">
                                                                <Share2 className="h-3 w-3" /> Share
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
