"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { 
    Search, History, Zap, Compass, Heart, 
    MessageSquareQuote, SendHorizontal, Bookmark, Wand2, 
    StickyNote, Highlighter, Network, ArrowRight, X, Scroll,
    ChevronLeft, ChevronRight, Loader2, ArrowRightCircle, BookOpenText,
    RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Layout & UI Components
import DesktopSidebarNav from '@/components/core/DesktopSidebarNav';
import FloatingBottomNav from '@/components/core/FloatingBottomNav';

// UI Primitives
import { Badge } from '@/components/ui/badge';

// VerseHub Specific Components
import MentorPanel from '@/components/versehub/MentorPanel';
import EndOfChapterPrompt from '@/components/versehub/EndOfChapterPrompt';
import SharePanel from '@/components/versehub/SharePanel';
import { getAppAccessToken } from '@/services/app-auth-token';
import { getUiNavItems } from '@/lib/navigation';

interface Verse {
    key: string;
    verse: number;
    text: string;
    href: string;
}

interface VerseState {
    favorite: boolean;
    bookmarked: boolean;
    highlighted: boolean;
    highlightColor: 'yellow' | 'green' | 'blue';
    note: string;
}

interface Book {
    code: string;
    label: string;
    testament: 'ot' | 'nt';
}

interface VersehubReaderPageProps {
    lang: string;
    mode?: 'landing' | 'chapter';
    initialChapterRef?: string | null;
}

const ACTION_KEY = 'versehub_actions_v2';

export function VersehubReaderPage({ lang: initialLang, mode = 'landing', initialChapterRef = null }: VersehubReaderPageProps) {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const lang = (params?.lang as string) || initialLang || 'id';
    const isId = lang === 'id';
    
    // Auth & Basic State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isChapter, setIsChapter] = useState(mode === 'chapter');
    const [chapter_label, setChapterLabel] = useState('');
    const [verses, setVerses] = useState<Verse[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [activeBook, setActiveBook] = useState<string | null>(null);
    const [bookChapters, setBookChapters] = useState<number[]>([]);
    
    // Progress & Scroll
    const [progressVerse, setProgressVerse] = useState(1);
    const [progressTotal, setProgressTotal] = useState(0);
    const [scrollProgressPercent, setScrollProgressPercent] = useState(0);
    
    // Search & Suggestions
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [suggestOpen, setSuggestOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    
    // UI Mode & Theming
    const [readingMode, setReadingMode] = useState<'normal' | 'focus' | 'dark'>('normal');
    const [textSize, setTextSize] = useState<0 | 1 | 2>(1);
    
    // Overlays & Sheets
    const [pickerOpen, setPickerOpen] = useState(false);
    const [tab, setTab] = useState<'ot' | 'nt'>('nt');
    const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
    const [toolsOpen, setToolsOpen] = useState(false);
    const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);
    const [mentorOpen, setMentorOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareData, setShareData] = useState<any>({});
    const [has_reflected, setHasReflected] = useState(false);
    const [activeReflectionQuestion, setActiveReflectionQuestion] = useState('');
    
    // Actions & Persistence
    const [actions, setActions] = useState<Record<string, VerseState>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{message: string, ctaHref?: string, ctaLabel?: string} | null>(null);
    const hasBooks = books.length > 0;
    const otBooksCount = useMemo(() => books.filter((book) => book.testament === 'ot').length, [books]);
    const ntBooksCount = useMemo(() => books.filter((book) => book.testament === 'nt').length, [books]);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const suppressClickRef = useRef(false);

    const toVersehubRefHref = useCallback((ref: string) => {
        const safeRef = String(ref || '').trim().replace(/^chapter\//, '');
        if (!safeRef) return `/versehub/${lang}`;
        return `/versehub/${lang}?ref=${encodeURIComponent(safeRef)}`;
    }, [lang]);

    const normalizeVersehubHref = useCallback((href: string) => {
        const raw = String(href || '').trim();
        if (!raw) return `/versehub/${lang}`;

        const chapterFixed = raw.replace('/chapter/', '/');
        const withOrigin = chapterFixed.startsWith('http')
            ? chapterFixed
            : `https://www.thechoosentalks.org${chapterFixed.startsWith('/') ? '' : '/'}${chapterFixed}`;

        try {
            const url = new URL(withOrigin);
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts[0] === 'versehub' && parts[1]) {
                if (!parts[2]) return `/versehub/${parts[1]}`;
                return `/versehub/${parts[1]}?ref=${encodeURIComponent(parts.slice(2).join('/'))}`;
            }
            return chapterFixed;
        } catch {
            return chapterFixed;
        }
    }, [lang]);

    const fetchBooks = useCallback(async () => {
        try {
            const res = await fetch(`/api/versehub/${lang}/books`);
            if (!res.ok) throw new Error('books_fetch_failed');
            const data = await res.json();
            if (data.books) {
                setBooks(data.books);
            } else {
                setBooks([]);
            }
        } catch (e: any) { 
            console.error("VerseHub: Failed to load books", e);
            setError(e.message === 'books_fetch_failed' ? 'books_fetch_failed' : 'fetch_error');
            setBooks([]);
        }
    }, [lang]);

    const loadChapter = useCallback(async (ref: string) => {
        setLoading(true);
        setError(null);
        try {
            // Clean the ref: remove /chapter/ if it somehow leaked in
            const cleanRef = ref.replace(/^chapter\//, '');
            const res = await fetch(`/api/versehub/${lang}/chapter/${cleanRef}`);
            
            if (!res.ok) {
                if (res.status === 404) throw new Error('chapter_not_found');
                if (res.status === 503) throw new Error('backend_unavailable');
                throw new Error('server_error');
            }

            const data = await res.json();
            if (data.verses) {
                setVerses(data.verses);
                setChapterLabel(data.chapter_label);
                setProgressTotal(data.verses.length);
                if (data.reflection_question) {
                    setActiveReflectionQuestion(data.reflection_question);
                }
                if (data.has_reflected !== undefined) {
                    setHasReflected(data.has_reflected);
                }
                setIsChapter(true);
            } else {
                throw new Error('invalid_payload');
            }
        } catch (e: any) { 
            if (e.message !== 'chapter_not_found') {
                console.error("VerseHub: Load chapter error", e);
            }
            setError(e.message);
        } finally { 
            setLoading(false); 
        }
    }, [lang]);

    // Initial Load: Books & Auth
    useEffect(() => {
        setIsAuthenticated(Boolean(getAppAccessToken()));
        
        fetchBooks();

        if (mode === 'chapter' && initialChapterRef) {
            loadChapter(initialChapterRef);
        } else {
            setLoading(false);
        }
    }, [lang, mode, initialChapterRef, fetchBooks, loadChapter]);

    useEffect(() => {
        if (mode !== 'landing') return;
        const fromHook = searchParams.get('ref');
        const fromWindow = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('ref')
            : null;
        const rawRef = fromHook || fromWindow;
        if (!rawRef) return;

        const normalized = rawRef.trim().toLowerCase();
        if (!normalized) return;

        const parts = normalized.split('-');
        const chapterRef = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : normalized;

        loadChapter(chapterRef).then(() => {
            if (parts.length < 3) return;
            window.setTimeout(() => {
                const verseNumber = Number(parts[2]);
                if (Number.isNaN(verseNumber)) return;
                const el = document.getElementById(`vh-v-${verseNumber}`);
                if (!el) return;
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        });
    }, [mode, searchParams, loadChapter]);

    // Suggestion logic
    useEffect(() => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            setSuggestOpen(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`/api/versehub/${lang}/suggest?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                if (data.rich_items) {
                    setSuggestions(data.rich_items);
                    setSuggestOpen(data.rich_items.length > 0);
                }
            } catch (e) {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, lang]);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        // If there's a direct suggestion, follow it
        const direct = suggestions.find(s => s.type === 'direct' || s.type === 'chapter' || s.type === 'book');
        if (direct && direct.href) {
            router.push(normalizeVersehubHref(direct.href));
            setSuggestOpen(false);
            setQuery('');
            return;
        }

        // Fallback: search for whatever is in the query box
        if (query) {
            router.push(toVersehubRefHref(query.toLowerCase().replace(/[\s:]/g, '-')));
            setSuggestOpen(false);
            setQuery('');
        }
    };

    // Chapter Loading based on Active Book
    useEffect(() => {
        if (!activeBook) return;
        fetch(`/api/versehub/${lang}/chapters?book=${activeBook}`)
            .then(res => res.json())
            .then(data => {
                if (data.chapters) setBookChapters(data.chapters);
            });
    }, [activeBook, lang]);

    // Scroll Tracking Parity
    useEffect(() => {
        if (!isChapter || verses.length === 0) return;
        
        const onScroll = () => {
            const doc = document.documentElement;
            const maxScrollable = Math.max(doc.scrollHeight - window.innerHeight, 1);
            const percent = Math.round(Math.min(1, window.scrollY / maxScrollable) * 100);
            setScrollProgressPercent(percent);

            const centerY = window.innerHeight * 0.36;
            let best = 1;
            let bestDist = Number.POSITIVE_INFINITY;
            verses.forEach((v) => {
                const el = document.getElementById(`vh-v-${v.verse}`);
                if (!el) return;
                const rect = el.getBoundingClientRect();
                if (rect.bottom < 64 || rect.top > window.innerHeight) return;
                const dist = Math.abs((rect.top + rect.bottom) / 2 - centerY);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = v.verse;
                }
            });
            setProgressVerse(best);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [isChapter, verses]);

    const stateFor = (key: string) => actions[key] || {
        favorite: false, bookmarked: false, highlighted: false, highlightColor: 'yellow', note: ''
    };

    const updateVerseAction = async (key: string, patch: Partial<VerseState>, label?: string) => {
        if (!isAuthenticated) {
            router.push('/');
            return;
        }

        const current = stateFor(key);
        const next = { ...current, ...patch };
        setActions(prev => ({ ...prev, [key]: next }));

        // Real API Persistence
        const parts = key.split('-');
        try {
            await fetch(`/api/versehub/${lang}/actions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAppAccessToken()}`
                },
                body: JSON.stringify({
                    book: parts[0],
                    chapter: parts[1],
                    verse: parts[2],
                    ...patch
                })
            });
            if (label) {
                setToast({ 
                    message: label, 
                    ctaHref: '/profile', 
                    ctaLabel: 'View Journey →' 
                });
                setTimeout(() => setToast(null), 3000);
            }
        } catch (e) { /* ignore */ }
    };

    const openVerseTools = (key: string) => {
        setActiveVerseKey(key);
        setToolsOpen(true);
    };

    const handlePickChapter = (bookCode: string, chapter: number) => {
        setPickerOpen(false);
        router.push(toVersehubRefHref(`${bookCode}-${chapter}`));
    };

    const navItems = getUiNavItems(isAuthenticated);
    const selectedVerse = useMemo(() => verses.find(v => v.key === activeVerseKey), [verses, activeVerseKey]);
    
    const fallback_reflection_question = 'Bagaimana ayat-ayat ini menguatkan imanmu hari ini?';

    const handlePathSelect = (_path: { slug: string }) => {
        router.push('/paths');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="w-full max-w-md rounded-[32px] border border-border/50 bg-background/80 p-7 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 text-brand animate-spin" />
                        </div>
                        <div>
                            <p className="text-sm font-black tracking-tight text-foreground">Menyiapkan ruang baca</p>
                            <p className="text-xs text-muted-foreground">Memuat kitab dan titik masuk VerseHub...</p>
                        </div>
                    </div>
                    <div className="space-y-3 animate-pulse">
                        <div className="h-10 rounded-2xl bg-surface-muted/70" />
                        <div className="h-24 rounded-3xl bg-surface-muted/60" />
                        <div className="h-10 rounded-2xl bg-surface-muted/70" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500",
            readingMode === 'dark' ? "bg-background text-foreground" : "bg-background text-foreground"
        )}>
            <div className="mx-auto w-full max-w-6xl px-4 py-4 md:py-6">
                <div className="flex w-full">
                    {/* Desktop Navigation */}
                    <div className="hidden md:block w-72">
                        <DesktopSidebarNav activeId="bible" />
                    </div>

                    {/* Main Content */}
                    <div className="w-full md:flex-1 md:ml-8">
                        <div className={cn(
                            "sticky top-0 z-30 border-b backdrop-blur-xl transition-all",
                            readingMode === 'dark' ? "border-border/50 bg-background/80" : "border-border/50 bg-background/80"
                        )}>
                            <div className="flex items-center justify-between px-4 py-3.5">
                                <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-muted border border-border/50 hover:bg-surface-elevated active:scale-90 transition-all text-muted-foreground">
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <h1 className="tct-brand-gradient text-xl font-bold tracking-tight">
                                    {chapter_label || (isId ? 'Alkitab' : 'Bible')}
                                </h1>
                                <button onClick={() => setPickerOpen(true)} className="flex items-center gap-2 rounded-2xl px-4 py-2 text-[10px] font-bold border border-border/50 bg-surface-muted hover:bg-surface-elevated transition-all text-foreground shadow-sm">
                                    <BookOpenText className="h-3.5 w-3.5 text-brand" />
                                    {isId ? 'Pilih Kitab' : 'Choose Book'}
                                </button>
                            </div>
                            
                            {isChapter && (
                                <div className="px-4 pb-2 flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-brand transition-all duration-300" 
                                            style={{ width: `${scrollProgressPercent}%` }} 
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                        Verse {progressVerse} of {progressTotal}
                                    </span>
                                </div>
                            )}
                        </div>

                        <main className="mx-auto max-w-3xl px-4 py-8">
                            {error === 'books_fetch_failed' || (error === 'fetch_error' && !isChapter) ? (
                                <div className="rounded-[2.5rem] bg-rose-500/5 border border-rose-500/10 p-10 text-center">
                                    <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6 text-rose-500">
                                        <RefreshCcw size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Gagal Memuat Daftar Kitab</h3>
                                    <p className="text-slate-500 text-sm mb-8">Maaf, terjadi kesalahan saat mengambil data dari server.</p>
                                    <button 
                                        onClick={() => { setError(null); fetchBooks(); }}
                                        className="px-8 py-3 rounded-full bg-foreground text-background font-bold hover:bg-foreground/90 transition-all shadow-sm"
                                    >
                                        Coba Lagi
                                    </button>
                                </div>
                            ) : !isChapter ? (
                                <section className="space-y-10">
                                    <div className="rounded-[28px] border border-border/50 bg-background/70 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground/90">
                                            Gerbang VerseHub
                                        </p>
                                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                            Temukan ayat dengan cepat, lalu masuk ke mode baca yang tenang dan fokus.
                                        </p>
                                    </div>

                                    {/* Search Anchor */}
                                    <div className="relative group">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                                                Cari Cepat
                                            </p>
                                            <p className="text-[10px] font-semibold text-muted-foreground/80">
                                                Contoh: mazmur 23, yoh 3:16
                                            </p>
                                        </div>
                                        <form onSubmit={handleSearch} className="relative w-full">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <input 
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onFocus={() => query.length >= 2 && setSuggestOpen(true)}
                                                placeholder={isId ? "Cari kitab, pasal, atau ayat..." : "Search book, chapter, verse..."}
                                                className="h-14 w-full rounded-3xl border border-border bg-white dark:bg-white/5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-brand/10 transition-all shadow-sm"
                                            />
                                        </form>

                                        {/* Suggestions Dropdown */}
                                        <AnimatePresence>
                                            {suggestOpen && suggestions.length > 0 && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-16 inset-x-0 z-50 bg-white dark:bg-slate-900 rounded-3xl border border-border shadow-2xl overflow-hidden"
                                                >
                                                    <div className="p-2">
                                                        {suggestions.map((item, idx) => (
                                                            <button 
                                                                key={idx}
                                                                onClick={() => {
                                                                    router.push(normalizeVersehubHref(item.href));
                                                                    setSuggestOpen(false);
                                                                    setQuery('');
                                                                }}
                                                                className="group w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "h-8 w-8 rounded-full flex items-center justify-center",
                                                                        item.type === 'direct' ? "bg-brand/10 text-brand" : "bg-slate-100 dark:bg-white/10 text-slate-500"
                                                                    )}>
                                                                        {item.type === 'direct' ? <Zap size={14} /> : <BookOpenText size={14} />}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold">{item.label}</p>
                                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.type}</p>
                                                                    </div>
                                                                </div>
                                                                <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="rounded-[24px] border border-border/50 bg-background/70 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-3">
                                            Akses Cepat Reader
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            {[
                                                { label: "Mazmur 23", ref: "mzm-23" },
                                                { label: "Yohanes 3", ref: "yoh-3" },
                                                { label: "Matius 5", ref: "mat-5" },
                                            ].map((quick) => (
                                                <button
                                                    key={quick.ref}
                                                    onClick={() => router.push(toVersehubRefHref(quick.ref))}
                                                    className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-left hover:bg-surface-muted transition-colors"
                                                >
                                                    <p className="text-sm font-bold text-foreground">{quick.label}</p>
                                                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">Buka Pasal</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Content Entry — Start Reading (replaces dark hero card) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 px-1">
                                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                                Mulai Membaca
                                            </p>
                                            <div className="h-px flex-1 bg-border/50" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {setTab('ot'); setPickerOpen(true);}}
                                                className="group flex items-start gap-4 rounded-[28px] border border-border/60 bg-surface-muted/40 p-6 text-left transition-all hover:bg-surface-muted hover:border-border active:scale-[0.98]"
                                            >
                                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10">
                                                    <Scroll className="h-5 w-5 text-amber-600 group-hover:rotate-12 transition-transform" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/80 mb-1">Perjanjian Lama</p>
                                                    <p className="text-base font-bold text-foreground tracking-tight">Kejadian 1</p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">{otBooksCount > 0 ? `${otBooksCount} kitab tersedia` : 'Mulai dari awal'}</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => {setTab('nt'); setPickerOpen(true);}}
                                                className="group flex items-start gap-4 rounded-[28px] border border-border/60 bg-surface-muted/40 p-6 text-left transition-all hover:bg-surface-muted hover:border-border active:scale-[0.98]"
                                            >
                                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10">
                                                    <ArrowRightCircle className="h-5 w-5 text-sky-600 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-600/80 mb-1">Perjanjian Baru</p>
                                                    <p className="text-base font-bold text-foreground tracking-tight">Matius 1</p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">{ntBooksCount > 0 ? `${ntBooksCount} kitab tersedia` : 'Masuk Injil'}</p>
                                                </div>
                                            </button>
                                        </div>
                                        <p className="px-1 text-[10px] text-muted-foreground/70 leading-relaxed">
                                            Tip: Ketuk <span className="font-bold text-foreground/70">Pilih Kitab</span> di atas → pilih pasal → ketuk ayat untuk membuka tools refleksi dan Mentor.
                                        </p>
                                    </div>

                                    {!hasBooks && (
                                        <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                                            <p className="text-sm font-black tracking-tight text-foreground">Katalog Kitab Belum Tersedia</p>
                                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                                Daftar kitab sedang disiapkan. Anda tetap bisa memakai pencarian cepat atau muat ulang beberapa saat lagi.
                                            </p>
                                            <button
                                                onClick={() => { setError(null); fetchBooks(); }}
                                                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-5 py-2 text-xs font-black uppercase tracking-[0.12em] text-foreground hover:bg-surface-muted"
                                            >
                                                <RefreshCcw className="h-3.5 w-3.5" />
                                                Muat Ulang Kitab
                                            </button>
                                        </div>
                                    )}
                                </section>
                            ) : (
                                <div className="space-y-8">
                                    {error ? (
                                        <div className="rounded-[2.5rem] bg-rose-500/5 border border-rose-500/10 p-10 text-center">
                                            <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6 text-rose-500">
                                                <X size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">Gagal Memuat Konten</h3>
                                            <p className="text-slate-500 text-sm mb-8">Maaf, terjadi kesalahan saat mengambil data Alkitab (Status: {error}).</p>
                                            <button 
                                                onClick={() => window.location.reload()}
                                                className="px-8 py-3 rounded-full bg-foreground text-background font-bold hover:bg-foreground/90 transition-all shadow-sm"
                                            >
                                                Coba Lagi
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {verses.map(v => {
                                                const state = stateFor(v.key);
                                                return (
                                                    <div 
                                                        key={v.key} 
                                                        id={`vh-v-${v.verse}`}
                                                        className={cn(
                                                            "group rounded-2xl px-4 py-3 transition-all relative",
                                                            state.highlighted ? (state.highlightColor === 'green' ? 'bg-emerald-500/10' : state.highlightColor === 'blue' ? 'bg-sky-500/10' : 'bg-amber-500/10') : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
                                                            activeVerseKey === v.key && "ring-1 ring-brand/30 bg-brand/5 shadow-sm"
                                                        )}
                                                    >
                                                        <button 
                                                            onClick={() => openVerseTools(v.key)}
                                                            className="w-full text-left text-[17px] md:text-[19px] leading-relaxed font-serif"
                                                        >
                                                            <sup className="mr-4 text-xs font-black text-brand/40 select-none">{v.verse}</sup>
                                                            <span className={cn(
                                                                "transition-opacity duration-300",
                                                                readingMode === 'dark' ? "text-slate-100" : "text-slate-800"
                                                            )}>
                                                                {v.text}
                                                            </span>
                                                        </button>
                                                        {state.note && (
                                                            <div className="mt-3 ml-8 pl-4 border-l-2 border-brand/30 text-sm italic text-muted-foreground">
                                                                {state.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            
                                            {isChapter && !has_reflected && (
                                                <EndOfChapterPrompt 
                                                    lang={lang}
                                                    questionText={activeReflectionQuestion || fallback_reflection_question}
                                                    onReflect={() => {
                                                        const question = activeReflectionQuestion || fallback_reflection_question;
                                                        const refParam = chapter_label || 'VerseHub';
                                                        router.push(`/community?intent=reflection&ref=${encodeURIComponent(refParam)}&text=${encodeURIComponent(question)}`);
                                                    }}
                                                    onPathSelect={handlePathSelect}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            {/* Picker Modal */}
            <AnimatePresence>
                {pickerOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <button className="absolute inset-0 cursor-default" onClick={() => setPickerOpen(false)} />
                        <motion.div 
                            initial={{ y: "100%" }} 
                            animate={{ y: 0 }} 
                            exit={{ y: "100%" }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/10"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pilih Kitab</h3>
                                    <button onClick={() => setPickerOpen(false)} className="h-12 w-12 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white"><X size={24} /></button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mb-8 bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl">
                                    <button onClick={() => setTab('ot')} className={cn("py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", tab === 'ot' ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xl" : "text-slate-400")}>Old Testament</button>
                                    <button onClick={() => setTab('nt')} className={cn("py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", tab === 'nt' ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xl" : "text-slate-400")}>New Testament</button>
                                </div>

                                <div className="flex gap-8 h-[420px]">
                                    <div className="w-1/3 overflow-y-auto space-y-1 pr-2 scrollbar-hide">
                                        {books.filter(b => b.testament === tab).length > 0 ? (
                                            books.filter(b => b.testament === tab).map(b => (
                                                <button 
                                                    key={b.code} 
                                                    onClick={() => setActiveBook(b.code)} 
                                                    className={cn(
                                                        "w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all", 
                                                        activeBook === b.code ? "bg-brand text-brand-foreground shadow-lg" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                                                    )}
                                                >
                                                    {b.label}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-10">
                                                Belum ada data kitab.
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-3 content-start pb-10 scrollbar-hide">
                                        {bookChapters.length > 0 ? bookChapters.map(ch => (
                                            <button 
                                                key={ch} 
                                                onClick={() => handlePickChapter(activeBook!, ch)} 
                                                className="aspect-square bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-lg font-black text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:scale-105 active:scale-90 transition-all border border-black/5 dark:border-white/5"
                                            >
                                                {ch}
                                            </button>
                                        )) : (
                                            <div className="col-span-full flex flex-col items-center justify-center h-full text-slate-300">
                                                <Compass size={48} strokeWidth={1} className="mb-4" />
                                                <p className="text-sm font-bold uppercase tracking-widest">Pilih Kitab Dulu</p>
                                                <p className="mt-1 text-[11px] text-slate-400 text-center">Setelah kitab dipilih, daftar pasal akan muncul di sini.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Mobile Nav */}
            <div className="fixed inset-x-0 z-40 flex justify-center md:hidden" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
                <FloatingBottomNav items={navItems} activeId="bible" />
            </div>

            {/* Verse Action Sheet (Mobile) */}
            <AnimatePresence>
                {toolsOpen && selectedVerse && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm"
                    >
                        <button className="absolute inset-0 cursor-default" onClick={() => setToolsOpen(false)} />
                        <motion.div 
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 pb-12 shadow-2xl"
                        >
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />
                            <div className="mb-6">
                                <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-1">{chapter_label}:{selectedVerse.verse}</p>
                                <p className="text-sm font-medium text-slate-500 line-clamp-1 italic">"{selectedVerse.text}"</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => updateVerseAction(selectedVerse.key, { favorite: !stateFor(selectedVerse.key).favorite }, 'Disimpan di Favorites')}
                                    className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 font-bold text-sm active:scale-95 transition-all"
                                >
                                    <Heart size={18} className={cn(stateFor(selectedVerse.key).favorite && "fill-rose-500 text-rose-500")} />
                                    Favorites
                                </button>
                                <button 
                                    onClick={() => { setToolsOpen(false); setMentorOpen(true); }}
                                    className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm active:scale-95 transition-all shadow-lg shadow-amber-500/20"
                                >
                                    <Wand2 size={18} />
                                    Mentor
                                </button>
                                <button 
                                    onClick={() => updateVerseAction(selectedVerse.key, { bookmarked: !stateFor(selectedVerse.key).bookmarked }, 'Bookmark diperbarui')}
                                    className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 font-bold text-sm active:scale-95 transition-all"
                                >
                                    <Bookmark size={18} className={cn(stateFor(selectedVerse.key).bookmarked && "fill-sky-500 text-sky-500")} />
                                    Bookmark
                                </button>
                                <button 
                                    onClick={() => { setToolsOpen(false); setShareOpen(true); setShareData({ title: `${chapter_label}:${selectedVerse.verse}`, subtitle: selectedVerse.text, url: window.location.href, ogImageUrl: `/api/versehub/og/${selectedVerse.key}.png` }); }}
                                    className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 font-bold text-sm active:scale-95 transition-all"
                                >
                                    <SendHorizontal size={18} />
                                    Share
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Auxiliary Overlays */}
            {mentorOpen && selectedVerse && (
                <MentorPanel
                    verseRef={selectedVerse.key}
                    lang={lang}
                    verseText={selectedVerse.text}
                    verseLabel={`${chapter_label}:${selectedVerse.verse}`}
                    isAuthenticated={isAuthenticated}
                    onClose={() => setMentorOpen(false)}
                />
            )}
            
            {shareOpen && (
                <SharePanel 
                    {...shareData} 
                    lang={lang} 
                    isOpen={shareOpen} 
                    onClose={() => setShareOpen(false)} 
                />
            )}

            {/* Toast System */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-4"
                    >
                        <span>{toast.message}</span>
                        {toast.ctaHref && (
                            <button onClick={() => router.push(toast.ctaHref!)} className="text-brand hover:underline">{toast.ctaLabel}</button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
