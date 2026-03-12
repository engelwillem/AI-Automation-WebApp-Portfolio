"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { 
    Search, Library, History, Zap, Compass, Heart, 
    MessageSquareQuote, SendHorizontal, Bookmark, Wand2, 
    StickyNote, Highlighter, Network, ArrowRight, X, Scroll 
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

// Types (derived from Reader.tsx)
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

interface VerseComment {
    id: number | string;
    author: string;
    body: string;
    created_at?: string;
}

interface Book {
    code: string;
    label: string;
    testament: 'ot' | 'nt';
    chapters: number;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

interface VersehubReaderPageProps {
    lang: string;
}

export function VersehubReaderPage({ lang: initialLang }: VersehubReaderPageProps) {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const lang = (params?.lang as string) || initialLang || 'id';
    
    // In a real migration, these would come from an API or initial props
    // For now, we'll maintain state parity with mock/empty data that can be populated
    const [isAuthenticated, setIsAuthenticated] = useState(true); // Mocking auth for visibility
    const [isChapter, setIsChapter] = useState(!!params?.id);
    const [chapter_label, setChapterLabel] = useState('');
    const [activeBook, setActiveBook] = useState<string | null>(null);
    const [verses, setVerses] = useState<Verse[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [progressVerse, setProgressVerse] = useState(1);
    const [progressTotal, setProgressTotal] = useState(0);
    const [scrollProgressPercent, setScrollProgressPercent] = useState(0);
    
    // UI State
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [readingMode, setReadingMode] = useState<'normal' | 'focus' | 'dark'>('normal');
    const [textSize, setTextSize] = useState<0 | 1 | 2>(1);
    
    const [pickerOpen, setPickerOpen] = useState(false);
    const [tab, setTab] = useState<'ot' | 'nt'>('nt');
    const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
    const [toolsOpen, setToolsOpen] = useState(false);
    const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);
    
    const [verseCommentsOpen, setVerseCommentsOpen] = useState(false);
    const [verseComments, setVerseComments] = useState<VerseComment[]>([]);
    const [verseCommentsLoading, setVerseCommentsLoading] = useState(false);
    const [verseCommentDraft, setVerseCommentDraft] = useState('');
    const [guestCommentName, setGuestCommentName] = useState('');
    
    const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    
    const [mentorOpen, setMentorOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareData, setShareData] = useState<any>({});
    const [reflectionComposerOpen, setReflectionComposerOpen] = useState(false);
    
    const [actions, setActions] = useState<Record<string, VerseState>>({});
    const [search_meta, setSearchMeta] = useState<any>({});
    const [search_recommendations, setSearchRecommendations] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [suggestOpen, setSuggestOpen] = useState(false);
    const [suggestIndex, setSuggestIndex] = useState(-1);
    const [search_error, setSearchError] = useState<string | null>(null);
    
    const [landingReady, setLandingReady] = useState(true);
    const [lastReadChip, setLastReadChip] = useState<any>(null);
    const [landingPersona, setLandingPersona] = useState<'new_believer' | 'returning_reader'>('new_believer');
    const [landingVariant, setLandingVariant] = useState<'a' | 'b'>('a');
    
    const [toast, setToast] = useState<{message: string, ctaHref?: string, ctaLabel?: string} | null>(null);
    const [shortcutHintOpen, setShortcutHintOpen] = useState(false);

    // Refs
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchWrapRef = useRef<HTMLDivElement>(null);
    const pickerPanelRef = useRef<HTMLDivElement>(null);
    const toolsMobilePanelRef = useRef<HTMLDivElement>(null);
    const toolsDesktopPanelRef = useRef<HTMLDivElement>(null);
    const noteDrawerRef = useRef<HTMLDivElement>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const longPressStartRef = useRef<{x: number, y: number} | null>(null);
    const touchIntentRef = useRef<any>({});
    const suppressClickRef = useRef(false);

    // Helper functions
    const defaultState = (): VerseState => ({
        favorite: false,
        bookmarked: false,
        highlighted: false,
        highlightColor: 'yellow',
        note: '',
    });

    const stateFor = (key: string) => actions[key] || defaultState();

    const getHighlightClass = (state: VerseState) => {
        if (!state.highlighted) return '';
        if (state.highlightColor === 'green') return 'bg-emerald-100/60 ring-1 ring-emerald-200';
        if (state.highlightColor === 'blue') return 'bg-sky-100/60 ring-1 ring-sky-200';
        return 'bg-amber-100/60 ring-1 ring-amber-200';
    };

    const showToast = (message: string, options: {ctaHref?: string, ctaLabel?: string} = {}) => {
        setToast({ message, ...options });
        setTimeout(() => setToast(null), 3000);
    };

    // Placeholder for actual data fetching
    useEffect(() => {
        // Here we would fetch books, initial verses (if any), and user states
        // Mimicking the data structure from Reader.tsx
        setBooks([
            { code: 'gen', label: 'Kejadian', testament: 'ot', chapters: 50 },
            { code: 'mat', label: 'Matius', testament: 'nt', chapters: 28 },
            { code: 'yoh', label: 'Yohanes', testament: 'nt', chapters: 21 },
            // ... more books
        ]);
        
        if (isChapter) {
            // Mocking verse data for a chapter
            setVerses([
                { key: 'yoh-3-16', verse: 16, text: 'Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.', href: '/versehub/id/yoh-3-16' },
                { key: 'yoh-3-17', verse: 17, text: 'Sebab Allah mengutus Anak-Nya ke dalam dunia bukan untuk menghakimi dunia, melainkan untuk menyelamatkannya oleh Dia.', href: '/versehub/id/yoh-3-17' },
                // ... more verses
            ]);
            setChapterLabel('Yohanes 3');
            setProgressTotal(21);
            setProgressVerse(16);
        }
    }, [isChapter]);

    // Navigation and Interaction Handlers
    const handleBack = () => router.back();

    const submitSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;
        router.push(`/versehub/${lang}?q=${encodeURIComponent(query)}`);
    };

    const onPickSuggestion = (item: any) => {
        setSuggestOpen(false);
        if (item.href) router.push(item.href);
        else if (item.value) {
            setQuery(item.value);
            submitSearch();
        }
    };

    const openVerseTools = (verseKey: string) => {
        setNoteDrawerOpen(false);
        setAdvancedToolsOpen(false);
        setActiveVerseKey(verseKey);
        setToolsOpen(true);
    };

    const handleShareVerse = (v: Verse) => {
        setToolsOpen(false);
        setShareOpen(true);
        setShareData({
            title: `${chapter_label}:${v.verse}`,
            subtitle: v.text,
            url: v.href,
            ogImageUrl: `/api/versehub/og/${v.key}.png`,
        });
    };

    const updateVerseAction = async (key: string, patch: Partial<VerseState>, toastLabel?: string) => {
        const next = { ...stateFor(key), ...patch };
        setActions(prev => ({ ...prev, [key]: next }));
        if (toastLabel) showToast(toastLabel);
        
        // Persist to API
        try {
            await fetch(`/api/versehub/${lang}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, ...patch }),
            });
        } catch (err) {
            console.error('Failed to persist action', err);
        }
    };

    const openMentorForVerse = (v: Verse) => {
        setActiveVerseKey(v.key);
        setToolsOpen(false);
        setMentorOpen(true);
    };

    const handlePickChapter = (bookCode: string, ch: number) => {
        setPickerOpen(false);
        router.push(`/versehub/${lang}/${bookCode}-${ch}`);
    };

    // Derived State
    const selectedVerse = useMemo(() => verses.find(v => v.key === activeVerseKey), [verses, activeVerseKey]);
    const selectedActions = selectedVerse ? stateFor(selectedVerse.key) : defaultState();
    const textSizeClass = textSize === 0 ? 'text-[0.98rem] leading-8' : textSize === 2 ? 'text-[1.2rem] leading-10' : 'text-base md:text-lg leading-8 md:leading-9';
    const isDarkMode = readingMode === 'dark';
    const isFocusMode = readingMode === 'focus';

    const byTab = useMemo(() => books.filter(b => b.testament === tab), [books, tab]);
    const activeBookData = useMemo(() => books.find(b => b.code === activeBook), [books, activeBook]);
    const bookChapters = useMemo(() => activeBookData ? Array.from({ length: activeBookData.chapters }, (_, i) => i + 1) : [], [activeBookData]);

    const personaCopy = useMemo(() => {
        // Simplified content logic for parity
        return {
            badge: 'NEW BELIEVER PATH',
            heroTitle: 'Mulai baca Alkitab dengan jalur yang jelas, tenang, dan konsisten.',
            heroBody: 'Mulai dari langkah kecil hari ini, lalu lanjutkan sedikit demi sedikit.',
            exploreTitle: 'Explore Scripture Paths',
            exploreBody: 'Pilih jalur OT/NT untuk orientasi awal tanpa merasa overwhelm.',
            continueButtonLabel: 'Start Journey',
        };
    }, []);

    const navItems = [
        { id: 'bible', label: 'Bible', icon: Library, href: `/versehub/${lang}` },
        { id: 'community', label: 'Community', icon: Compass, href: '/community' },
        { id: 'journey', label: 'Journey', icon: History, href: `/versehub/${lang}/my-spiritual-journey` },
        { id: 'settings', label: 'Settings', icon: Zap, href: '/profile' },
    ];

    return (
        <div className={`min-h-screen transition-all duration-500 bg-slate-950 text-white`}>
            <div className="mx-auto w-full max-w-6xl px-4 py-4 md:py-6">
                <div className="flex w-full">
                    <div className="w-full flex-1">
                        {/* Sticky Header parity */}
                        <div className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-all border-white/5 bg-slate-950/80`}>
                            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3.5">
                                <button
                                    onClick={handleBack}
                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95 border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10`}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <h1 className="tct-brand-gradient text-xl font-bold tracking-tight">{chapter_label || 'VerseHub'}</h1>
                                <button
                                    onClick={() => setPickerOpen(true)}
                                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[10px] font-bold transition-all active:scale-95 border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10`}
                                >
                                    <Library className="h-3.5 w-3.5 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                                    Library
                                </button>
                            </div>
                            
                            {isChapter && (
                                <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-3 text-[10px] uppercase tracking-[0.1em] text-white/30 font-bold">
                                    <span>Ayat {progressVerse} / {progressTotal}</span>
                                    <div className={`h-1 flex-1 overflow-hidden rounded-full bg-white/5`}>
                                        <div className={`h-full rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]`} style={{ width: `${scrollProgressPercent}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:pb-10">
                            <div className="mx-auto max-w-3xl">
                                {/* Search Logic Parity */}
                                <div ref={searchWrapRef} className="relative group">
                                    <form onSubmit={submitSearch} className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500" />
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                placeholder="Cari referensi: yoh 3:16"
                                                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-amber-500/30 focus:bg-white/10 transition-all shadow-2xl"
                                            />
                                        </div>
                                        <button type="submit" className="h-12 rounded-2xl bg-white text-slate-950 px-6 text-[11px] font-bold tracking-widest uppercase transition-all hover:bg-slate-200 active:scale-95 shadow-xl">
                                            Cari
                                        </button>
                                    </form>
                                    <p className="mt-1.5 text-[11px] text-slate-500">Tip: klik ayat untuk aksi cepat.</p>
                                </div>

                                {/* Content Switch Layout */}
                                {!isChapter ? (
                                    <div className="mt-7 space-y-4">
                                        {/* Landing State Hero */}
                                        <section className="relative overflow-hidden rounded-[3rem] p-10 text-white shadow-2xl border border-white/5 bg-slate-900">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                                            <div className="relative z-10 max-w-2xl">
                                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] backdrop-blur-md text-amber-500">
                                                    {personaCopy.badge}
                                                </div>
                                                <h2 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-[2.5rem]">{personaCopy.heroTitle}</h2>
                                                <p className="mt-4 text-base text-white/50 font-medium leading-relaxed">{personaCopy.heroBody}</p>
                                                <div className="mt-10 flex flex-wrap gap-4">
                                                    <button className="flex items-center gap-3 rounded-2xl bg-white px-7 py-4 text-xs font-bold uppercase tracking-widest text-slate-950 transition-all hover:bg-slate-200 active:scale-95 shadow-xl">
                                                        <Zap className="h-5 w-5 text-amber-500" fill="currentColor" />
                                                        {personaCopy.continueButtonLabel}
                                                    </button>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Paths Layout */}
                                        <section className="rounded-[3rem] border border-white/5 bg-white/[0.02] p-10 shadow-2xl backdrop-blur-md">
                                            <h3 className="flex items-center gap-3 text-lg font-bold text-white tracking-tight">
                                                <Compass className="h-6 w-6 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]" />
                                                {personaCopy.exploreTitle}
                                            </h3>
                                            <p className="mt-3 text-sm text-white/40 font-medium">{personaCopy.exploreBody}</p>
                                            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                                <button onClick={() => {setTab('ot'); setPickerOpen(true);}} className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-left transition-all hover:bg-white/[0.08] hover:border-amber-500/20 hover:shadow-2xl">
                                                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-500/70">Old Testament</p>
                                                    <p className="mt-2 text-base font-bold text-white/90">Mulai dari Kejadian 1</p>
                                                </button>
                                                <button onClick={() => {setTab('nt'); setPickerOpen(true);}} className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-left transition-all hover:bg-white/[0.08] hover:border-sky-500/20 hover:shadow-2xl">
                                                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-sky-400/70">New Testament</p>
                                                    <p className="mt-2 text-base font-bold text-white/90">Mulai dari Matius 1</p>
                                                </button>
                                            </div>
                                        </section>
                                    </div>
                                ) : (
                                    <div className="mt-6 space-y-6">
                                        {verses.map(v => (
                                            <div key={v.key} className={cn(
                                                "rounded-2xl px-4 py-3 leading-relaxed transition-all duration-300 border border-transparent",
                                                activeVerseKey === v.key ? "bg-white/[0.08] border-white/10 shadow-xl scale-[1.01]" : "hover:bg-white/[0.03]",
                                                getHighlightClass(stateFor(v.key))
                                            )}>
                                                <button
                                                    onClick={() => openVerseTools(v.key)}
                                                    className={`w-full text-left transition-colors font-medium text-white/90 ${textSizeClass}`}
                                                >
                                                    <sup className="mr-3 text-xs font-bold text-amber-500/50">{v.verse}</sup>
                                                    {v.text}
                                                </button>
                                                {stateFor(v.key).note && (
                                                    <p className="mt-3 text-sm italic border-l-2 pl-4 border-amber-500/50 text-white/50 leading-relaxed">
                                                        {stateFor(v.key).note}
                                                    </p>
                                                )}
                                            </div>
                                        ))}

                                        {/* End of Chapter Prompt parity */}
                                        <EndOfChapterPrompt 
                                            lang={lang}
                                            questionText="Apa yang Firman katakan pada hatimu hari ini?"
                                            onReflect={() => setReflectionComposerOpen(true)}
                                            suggestedPaths={[]}
                                        />
                                    </div>
                                )}
                            </div>
                        </main>
                    </div>
                </div>
            </div>

            {/* Overlays Parity */}
            <AnimatePresence>
                {pickerOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-md"
                    >
                        <div className="relative w-full max-h-[88vh] bg-slate-900 border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] sm:max-w-xl overflow-hidden shadow-2xl">
                            <div className="flex flex-col h-full p-6">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-bold tracking-tight text-white">Jelajahi Alkitab</h3>
                                    <button onClick={() => setPickerOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10"><X className="h-5 w-5" /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-8 bg-white/5 p-1.5 rounded-[20px] border border-white/5">
                                    <button onClick={() => setTab('ot')} className={`py-2.5 rounded-2xl text-[11px] font-bold tracking-widest uppercase transition-all ${tab === 'ot' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Old Testament</button>
                                    <button onClick={() => setTab('nt')} className={`py-2.5 rounded-2xl text-[11px] font-bold tracking-widest uppercase transition-all ${tab === 'nt' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>New Testament</button>
                                </div>
                                <div className="flex gap-8 h-[450px]">
                                    <div className="w-1/3 overflow-y-auto space-y-1.5 pr-2 scrollbar-premium">
                                        {byTab.map(b => (
                                            <button key={b.code} onClick={() => setActiveBook(b.code)} className={`w-full text-left px-5 py-3 rounded-2xl text-xs font-bold transition-all ${activeBook === b.code ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xl' : 'text-white/40 hover:bg-white/5'}`}>{b.label}</button>
                                        ))}
                                    </div>
                                    <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-3 pr-2 scrollbar-premium">
                                        {bookChapters.map(ch => (
                                            <button key={ch} onClick={() => handlePickChapter(activeBook!, ch)} className="aspect-square border border-white/5 bg-white/[0.03] rounded-2xl flex items-center justify-center font-bold text-sm hover:bg-white/10 hover:border-white/10 transition-all">{ch}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Advanced Interaction Panels */}
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

            {reflectionComposerOpen && (
                <ReflectionComposer 
                    isOpen={reflectionComposerOpen}
                    onClose={() => setReflectionComposerOpen(false)}
                    verseRef={activeVerseKey || ''}
                    questionText="Apa yang Firman katakan pada hatimu hari ini?"
                    lang={lang}
                />
            )}

            {/* Verse Context Menu */}
            {toolsOpen && selectedVerse && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setToolsOpen(false)} />
                    <div className="relative w-full sm:w-[400px] bg-slate-900 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="font-bold">{chapter_label}:{selectedVerse.verse}</p>
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">{selectedVerse.text}</p>
                            </div>
                            <button onClick={() => setToolsOpen(false)} className="text-xs text-slate-400">Close</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => updateVerseAction(selectedVerse.key, { favorite: !selectedActions.favorite }, 'Favorite updated')} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 font-semibold text-sm hover:bg-slate-100">
                                <Heart className={`h-4 w-4 ${selectedActions.favorite ? 'fill-rose-500 text-rose-500' : ''}`} /> Love
                             </button>
                             <button onClick={() => openMentorForVerse(selectedVerse)} className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 font-bold text-amber-700 text-sm hover:bg-amber-100">
                                <Wand2 className="h-4 w-4" /> Guide
                             </button>
                             <button onClick={() => handleShareVerse(selectedVerse)} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 font-semibold text-sm hover:bg-slate-100">
                                <SendHorizontal className="h-4 w-4" /> Share
                             </button>
                             <button onClick={() => setAdvancedToolsOpen(!advancedToolsOpen)} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 font-semibold text-sm hover:bg-slate-100">
                                <Plus className="h-4 w-4" /> More
                             </button>
                        </div>
                        
                        {advancedToolsOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => updateVerseAction(selectedVerse.key, { highlighted: true, highlightColor: 'yellow' })} className="h-10 rounded-lg bg-amber-100 ring-1 ring-amber-200" />
                                    <button onClick={() => updateVerseAction(selectedVerse.key, { highlighted: true, highlightColor: 'green' })} className="h-10 rounded-lg bg-emerald-100 ring-1 ring-emerald-200" />
                                    <button onClick={() => updateVerseAction(selectedVerse.key, { highlighted: true, highlightColor: 'blue' })} className="h-10 rounded-lg bg-sky-100 ring-1 ring-sky-200" />
                                </div>
                                <button onClick={() => {setToolsOpen(false); setNoteDrawerOpen(true);}} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 text-sm font-semibold">
                                    <StickyNote className="h-4 w-4" /> Add Note
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Basic lucide icon replacements if missing from props
function Plus({ className }: { className?: string }) {
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
