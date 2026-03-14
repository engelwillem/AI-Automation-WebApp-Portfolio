
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { 
    Search, Library, History, Zap, Compass, Heart, 
    MessageSquareQuote, SendHorizontal, Bookmark, Wand2, 
    StickyNote, Highlighter, Network, ArrowRight, X, Scroll,
    ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Layout & UI Components
import DesktopSidebarNav from '@/components/core/DesktopSidebarNav';
import FloatingBottomNav from '@/components/core/FloatingBottomNav';

// VerseHub Specific Components
import MentorPanel from '@/components/versehub/MentorPanel';
import EndOfChapterPrompt from '@/components/versehub/EndOfChapterPrompt';
import ReflectionComposer from '@/components/versehub/ReflectionComposer';
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
    const [reflectionComposerOpen, setReflectionComposerOpen] = useState(false);
    
    // Actions & Persistence
    const [actions, setActions] = useState<Record<string, VerseState>>({});
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{message: string, ctaHref?: string, ctaLabel?: string} | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const suppressClickRef = useRef(false);

    // Initial Load: Books & Auth
    useEffect(() => {
        setIsAuthenticated(Boolean(getAppAccessToken()));
        
        const fetchBooks = async () => {
            try {
                const res = await fetch(`/api/versehub/${lang}/books`);
                const data = await res.json();
                if (data.books) setBooks(data.books);
            } catch (e) { /* ignore */ }
        };
        fetchBooks();

        if (mode === 'chapter' && initialChapterRef) {
            loadChapter(initialChapterRef);
        } else {
            setLoading(false);
        }
    }, [lang, mode, initialChapterRef]);

    const loadChapter = async (ref: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/versehub/${lang}/chapter/${ref}`);
            const data = await res.json();
            if (data.verses) {
                setVerses(data.verses);
                setChapterLabel(data.chapter_label);
                setProgressTotal(data.verses.length);
                setIsChapter(true);
            }
        } catch (e) { /* ignore */ }
        finally { setLoading(false); }
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
                    activeVerse === v.verse;
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
                    ctaHref: '/versehub/id/my-spiritual-journey', 
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
        router.push(`/versehub/${lang}/chapter/${bookCode}.${chapter}`);
    };

    const navItems = getUiNavItems(isAuthenticated);
    const selectedVerse = useMemo(() => verses.find(v => v.key === activeVerseKey), [verses, activeVerseKey]);
    const otStarter = books.find(b => b.testament === 'ot');
    const ntStarter = books.find(b => b.testament === 'nt');

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
        </div>;
    }

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500",
            readingMode === 'dark' ? "bg-slate-950 text-slate-100" : "bg-[#FAFAF8] text-slate-900"
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
                            readingMode === 'dark' ? "border-white/5 bg-slate-950/80" : "border-slate-200 bg-white/80"
                        )}>
                            <div className="flex items-center justify-between px-4 py-3.5">
                                <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-90 transition-all">
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <h1 className="tct-brand-gradient text-xl font-bold tracking-tight">
                                    {chapter_label || (isId ? 'Alkitab' : 'Bible')}
                                </h1>
                                <button onClick={() => setPickerOpen(true)} className="flex items-center gap-2 rounded-2xl px-4 py-2 text-[10px] font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                                    <Library className="h-3.5 w-3.5 text-amber-500" />
                                    {isId ? 'Perpustakaan' : 'Library'}
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
                            {!isChapter ? (
                                <section className="space-y-10">
                                    {/* Search Anchor */}
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input 
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder={isId ? "Cari kitab, pasal, atau ayat..." : "Search book, chapter, verse..."}
                                            className="h-14 w-full rounded-3xl border border-border bg-white dark:bg-white/5 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-brand/10 transition-all shadow-sm"
                                        />
                                    </div>

                                    {/* Landing Hero */}
                                    <div className="rounded-[3rem] p-10 bg-slate-900 border border-white/5 shadow-2xl relative overflow-hidden text-white">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl -mr-32 -mt-32" />
                                        <div className="relative z-10">
                                            <Badge className="bg-brand/20 text-brand border-none mb-4">Daily Rhythm</Badge>
                                            <h2 className="text-3xl font-bold mb-4 tracking-tight">Mulai baca Alkitab hari ini.</h2>
                                            <p className="text-white/50 mb-8 max-w-sm font-medium">Pilih salah satu kitab di bawah untuk memulai perjalanan rohanimu yang tenang.</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <button onClick={() => {setTab('ot'); setPickerOpen(true);}} className="p-6 rounded-3xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-all group">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Old Testament</p>
                                                        <Scroll className="h-4 w-4 text-amber-500/50 group-hover:rotate-12 transition-transform" />
                                                    </div>
                                                    <p className="font-bold text-lg">Kejadian 1</p>
                                                </button>
                                                <button onClick={() => {setTab('nt'); setPickerOpen(true);}} className="p-6 rounded-3xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-all group">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">New Testament</p>
                                                        <ArrowRightCircle className="h-4 w-4 text-sky-400/50 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                    <p className="font-bold text-lg">Matius 1</p>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            ) : (
                                <div className="space-y-8">
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
                                    
                                    {!has_reflected && (
                                        <EndOfChapterPrompt 
                                            lang={lang}
                                            questionText={activeReflectionQuestion || reflection_question}
                                            onReflect={() => setReflectionComposerOpen(true)}
                                        />
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
                            className="relative w-full max-w-2xl bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/10"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-black text-white tracking-tight">Pilih Kitab</h3>
                                    <button onClick={() => setPickerOpen(false)} className="h-12 w-12 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white"><X size={24} /></button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl">
                                    <button onClick={() => setTab('ot')} className={cn("py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", tab === 'ot' ? "bg-white text-slate-950 shadow-xl" : "text-white/30")}>Old Testament</button>
                                    <button onClick={() => setTab('nt')} className={cn("py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", tab === 'nt' ? "bg-white text-slate-950 shadow-xl" : "text-white/30")}>New Testament</button>
                                </div>

                                <div className="flex gap-8 h-[420px]">
                                    <div className="w-1/3 overflow-y-auto space-y-1 pr-2 scrollbar-hide">
                                        {books.filter(b => b.testament === tab).map(b => (
                                            <button 
                                                key={b.code} 
                                                onClick={() => setActiveBook(b.code)} 
                                                className={cn(
                                                    "w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all", 
                                                    activeBook === b.code ? "bg-brand text-brand-foreground shadow-lg" : "text-white/40 hover:bg-white/5"
                                                )}
                                            >
                                                {b.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-3 content-start pb-10 scrollbar-hide">
                                        {bookChapters.length > 0 ? bookChapters.map(ch => (
                                            <button 
                                                key={ch} 
                                                onClick={() => handlePickChapter(activeBook!, ch)} 
                                                className="aspect-square bg-white/5 rounded-2xl flex items-center justify-center text-lg font-black text-white hover:bg-white/10 hover:scale-105 active:scale-90 transition-all border border-white/5"
                                            >
                                                {ch}
                                            </button>
                                        )) : (
                                            <div className="col-span-full flex flex-col items-center justify-center h-full text-white/20">
                                                <Compass size={48} strokeWidth={1} className="mb-4" />
                                                <p className="text-sm font-bold uppercase tracking-widest">Pilih Kitab Dulu</p>
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
                                    onClick={() => openMentorForVerse(selectedVerse)}
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

            <ReflectionComposer 
                isOpen={reflectionComposerOpen} 
                onClose={() => setReflectionComposerOpen(false)} 
                verseRef={activeVerseKey || ''} 
                questionText={activeReflectionQuestion || reflection_question} 
                lang={lang} 
            />

            {/* Toast System */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-4"
                    >
                        <span>{toast.message}</span>
                        {toast.ctaHref && (
                            <Link href={toast.ctaHref} className="text-brand hover:underline">{toast.ctaLabel}</Link>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
