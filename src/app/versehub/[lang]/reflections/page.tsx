"use client";

import React, { useState, useEffect } from 'react';
import { useAuthSession } from '@/auth/use-auth-session';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquareQuote, Lock, Globe,
    X, BookOpen, PenLine, ArrowRight,
    LayoutGrid, List
} from 'lucide-react';
import { buildAppAuthHeaders, fetchWithAppAuth } from '@/lib/app-auth-fetch';
import { cn } from '@/lib/utils';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

type Reflection = {
    id: string;
    verse_ref: string;
    question_text: string;
    answer_text: string;
    is_private: boolean;
    created_at: string;
};

type ReflectionsApiResponse = {
    data?: {
        items?: Reflection[];
        meta?: {
            current_page?: number;
            last_page?: number;
            per_page?: number;
            total?: number;
        };
    };
    message?: string;
};

export default function ReflectionsJournalPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated, isRestoring } = useAuthSession();
    const refreshTick = useMutationRefreshTick(['/api/versehub/']);
    const lang = params?.lang as string || 'id';
    const isId = lang === 'id';

    const [reflections, setReflections] = useState<Reflection[]>([]);
    const [loading, setLoading] = useState(true);
    const [authRequired, setAuthRequired] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    useEffect(() => {
        let active = true;

        const loadReflections = async () => {
            if (isRestoring) {
                return;
            }

            if (!isAuthenticated) {
                if (!active) return;
                setAuthRequired(true);
                setLoading(false);
                return;
            }

            try {
                const response = await fetchWithAppAuth(`/api/versehub/${lang}/reflections`, {
                    headers: buildAppAuthHeaders(),
                    cache: 'no-store',
                });

                if (!active) return;

                if (response.status === 401 || response.status === 403) {
                    setAuthRequired(true);
                    setReflections([]);
                    return;
                }

                if (!response.ok) {
                    const payload = (await response.json().catch(() => ({}))) as ReflectionsApiResponse;
                    setErrorMessage(payload?.message || (isId ? 'Gagal memuat jurnal refleksi.' : 'Failed to load reflection journal.'));
                    setReflections([]);
                    return;
                }

                const payload = (await response.json()) as ReflectionsApiResponse;
                const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
                setReflections(items);
                setAuthRequired(false);
            } catch {
                if (!active) return;
                setErrorMessage(isId ? 'Tidak dapat terhubung ke server refleksi.' : 'Unable to connect to reflections server.');
                setReflections([]);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadReflections();
        return () => {
            active = false;
        };
    }, [isAuthenticated, isId, isRestoring, lang, refreshTick]);

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-brand/30">
            {/* Header Sticky with Backdrop */}
            <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border/50">
                <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
                    <button 
                        onClick={() => router.back()} 
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-muted border border-border/50 active:scale-95 transition-all hover:bg-surface-elevated text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-base tracking-tight leading-none">
                            {isId ? 'Jurnal Refleksi' : 'Reflections Journal'}
                        </h1>
                        <p className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] mt-1.5 opacity-80">
                            VerseHub Archive
                        </p>
                    </div>

                    <div className="flex items-center gap-1 group">
                        <button 
                            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-muted border border-border/50 active:scale-95 transition-all hover:bg-surface-elevated text-muted-foreground"
                        >
                            {viewMode === 'list' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-5 py-10">
                {/* Hero Section */}
                <div className="mb-14 text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="inline-flex h-20 w-20 items-center justify-center rounded-[32px] bg-brand/5 text-brand border border-brand/20 mb-4 shadow-sm"
                    >
                        <MessageSquareQuote className="h-9 w-9" />
                    </motion.div>
                    <h2 className="text-4xl font-serif italic text-foreground tracking-tight leading-tight">
                        {isId ? 'Percakapan Hati' : 'Heart Conversations'}
                    </h2>
                    <p className="text-[15px] font-medium text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
                        {isId
                            ? 'Mencatat setiap teguran, janji, dan arahan Firman Tuhan dalam perjalanan rohanimu.'
                            : 'Tracking every rebuke, promise, and guidance from God’s Word in your spiritual journey.'}
                    </p>
                </div>

                {/* Content States */}
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-56 bg-surface-muted/50 rounded-[48px] animate-pulse border border-border/50" />
                            ))}
                        </motion.div>
                    ) : authRequired ? (
                        <motion.div 
                            key="auth"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center rounded-[48px] bg-surface-muted/30 py-24 text-center border border-dashed border-border/50 backdrop-blur-sm"
                        >
                            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-surface text-muted-foreground/30 border border-border/50 shadow-inner">
                                <Lock className="h-10 w-10 opacity-40 shadow-[0_0_20px_rgba(var(--brand-rgb),0.2)]" />
                            </div>
                            <h3 className="text-xl font-serif italic text-foreground mb-3">{isId ? 'Butuh Akses Masuk' : 'Login Required'}</h3>
                            <p className="max-w-[280px] text-sm font-medium text-muted-foreground leading-relaxed mb-10">
                                {isId
                                    ? 'Jurnal refleksi ini bersifat pribadi. Silakan masuk akun untuk melihat kumpulan refleksimu.'
                                    : 'This reflection journal is private. Please sign in to access your collection.'}
                            </p>
                            <button 
                                onClick={() => router.push('/login')}
                                className="px-10 h-14 bg-foreground text-background rounded-full text-xs font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all active:scale-95 shadow-lg shadow-foreground/10"
                            >
                                {isId ? 'Masuk Sekarang' : 'Login Now'}
                            </button>
                        </motion.div>
                    ) : errorMessage ? (
                        <motion.div 
                            key="error"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center rounded-[48px] bg-rose-500/[0.03] py-20 text-center border border-rose-500/10"
                        >
                            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6">
                                <X className="h-6 w-6" />
                            </div>
                            <p className="max-w-[320px] text-sm font-medium text-rose-400">
                                {errorMessage}
                            </p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="mt-8 text-xs font-bold uppercase underline tracking-widest text-muted-foreground hover:text-foreground"
                            >
                                {isId ? 'Coba Lagi' : 'Try Again'}
                            </button>
                        </motion.div>
                    ) : reflections.length === 0 ? (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center rounded-[60px] bg-surface-muted/30 py-28 text-center border border-dashed border-border/50 backdrop-blur-sm"
                        >
                            <div className="mb-10 flex h-28 w-28 items-center justify-center rounded-[40px] bg-surface text-muted-foreground/20 border border-border/50 shadow-inner">
                                <PenLine className="h-12 w-12 opacity-30 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h3 className="text-2xl font-serif italic text-foreground mb-4 leading-none">{isId ? 'Belum Ada Jejak' : 'No Footprints Yet'}</h3>
                            <p className="max-w-[280px] text-sm font-medium text-muted-foreground leading-relaxed">
                                {isId
                                    ? 'Setiap perenungan adalah langkah baru. Mari mulai membaca Alkitab di VerseHub hari ini.'
                                    : 'Every reflection is a new step. Start reading the Bible in VerseHub today.'}
                            </p>
                            <button 
                                onClick={() => router.push(`/versehub/${lang}/kej-1`)}
                                className="mt-12 px-10 h-15 bg-brand text-brand-foreground rounded-[24px] text-xs font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all active:scale-95 shadow-xl shadow-brand/20"
                            >
                                {isId ? 'Mulai Perjalanan' : 'Start Journey'}
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                                "gap-8 transition-all duration-500",
                                viewMode === 'list' ? "space-y-10" : "grid grid-cols-1 md:grid-cols-2"
                            )}
                        >
                            {reflections.map((item, idx) => (
                                <JournalEntryCard 
                                    key={item.id}
                                    item={item}
                                    index={idx}
                                    isId={isId}
                                    router={router}
                                    lang={lang}
                                    minimal={viewMode === 'grid'}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

function JournalEntryCard({ 
    item, index, isId, router, lang, minimal 
}: { 
    item: Reflection; index: number; isId: boolean; router: any; lang: string; minimal?: boolean 
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className={cn(
                "group relative overflow-hidden rounded-[48px] border border-border/50 bg-surface shadow-soft transition-all duration-500",
                "hover:shadow-card-hover hover:border-brand/20 hover:-translate-y-1",
                minimal ? "p-8" : "p-10"
            )}
        >
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand leading-none mb-1.5 px-0.5">
                            {item.verse_ref.toUpperCase().replace(/-/g, ' ')}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString(isId ? 'id-ID' : 'en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <div className={cn(
                                "flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest",
                                item.is_private ? "text-muted-foreground/60" : "text-emerald-500/80"
                            )}>
                                {item.is_private ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                {item.is_private ? (isId ? 'Privat' : 'Private') : (isId ? 'Publik' : 'Public')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={() => router.push(`/versehub/${lang}/${item.verse_ref.split('-').slice(0, 2).join('-')}`)}
                    className="h-10 w-10 flex items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground hover:bg-brand/5 hover:text-brand transition-all border border-transparent hover:border-brand/20"
                    title={isId ? 'Lihat Pasal' : 'View Chapter'}
                >
                    <BookOpen className="h-4 w-4" />
                </button>
            </div>

            <div className="mb-10 space-y-5">
                <p className="font-serif text-[26px] italic leading-[1.2] text-foreground/90 group-hover:text-foreground transition-colors overflow-hidden text-ellipsis line-clamp-2">
                    "{item.question_text}"
                </p>
                <div className="relative rounded-[32px] bg-surface-muted/30 p-8 text-[15px] leading-relaxed text-muted-foreground border border-border/30 group-hover:bg-surface-muted/60 transition-colors shadow-inner">
                    <MessageSquareQuote className="absolute -right-3 -bottom-3 h-20 w-20 text-foreground/[0.03] pointer-events-none" />
                    <p className={cn("relative z-10", minimal ? "line-clamp-3" : "line-clamp-4")}>
                        {item.answer_text}
                    </p>
                </div>
            </div>

            <button
                onClick={() => router.push(`/reflections/${item.id}?lang=${lang}`)}
                className="w-full h-15 flex items-center justify-center gap-3 rounded-[24px] bg-foreground text-background text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-foreground/5 group/btn"
            >
                {isId ? 'Detail Refleksi' : 'Entry Detail'}
                <ArrowRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
            </button>
        </motion.div>
    );
}
