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
import { getAppAccessToken } from '@/services/app-auth-token';

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

export function VersehubReaderPage({ lang: initialLang, mode = 'landing', initialChapterRef = null }: VersehubReaderPageProps) {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const lang = (params?.lang as string) || initialLang || 'id';
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isChapter, setIsChapter] = useState(mode === 'chapter');
    const [chapter_label, setChapterLabel] = useState('');
    const [activeBook, setActiveBook] = useState<string | null>(null);
    const [verses, setVerses] = useState<Verse[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [bookChapters, setBookChapters] = useState<number[]>([]);
    const [progressVerse, setProgressVerse] = useState(1);
    const [progressTotal, setProgressTotal] = useState(0);
    const [scrollProgressPercent, setScrollProgressPercent] = useState(0);
    
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [readingMode, setReadingMode] = useState<'normal' | 'focus' | 'dark'>('normal');
    const [textSize, setTextSize] = useState<0 | 1 | 2>(1);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [tab, setTab] = useState<'ot' | 'nt'>('nt');
    const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
    const [toolsOpen, setToolsOpen] = useState(false);
    const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);
    const [mentorOpen, setMentorOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareData, setShareData] = useState<any>({});
    const [reflectionComposerOpen, setReflectionComposerOpen] = useState(false);
    const [actions, setActions] = useState<Record<string, VerseState>>({});
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{message: string} | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsAuthenticated(Boolean(getAppAccessToken()));
        
        // Fetch Books
        fetch(`/api/versehub/${lang}/books`)
            .then(res => res.json())
            .then(data => {
                if (data.books) setBooks(data.books);
            });

        if (mode === 'chapter' && initialChapterRef) {
            fetch(`/api/versehub/${lang}/chapter/${initialChapterRef}`)
                .then(res => res.json())
                .then(data => {
                    if (data.verses) {
                        setVerses(data.verses);
                        setChapterLabel(data.chapter_label);
                        setProgressTotal(data.verses.length);
                    }
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [lang, mode, initialChapterRef]);

    useEffect(() => {
        if (!activeBook) return;
        fetch(`/api/versehub/${lang}/chapters?book=${activeBook}`)
            .then(res => res.json())
            .then(data => {
                if (data.chapters) setBookChapters(data.chapters);
            });
    }, [activeBook, lang]);

    const stateFor = (key: string) => actions[key] || {
        favorite: false, bookmarked: false, highlighted: false, highlightColor: 'yellow', note: ''
    };

    const handleBack = () => router.back();
    const openVerseTools = (key: string) => {
        setActiveVerseKey(key);
        setToolsOpen(true);
    };

    const navItems = [
        { id: 'bible', label: 'Bible', icon: Library, href: `/versehub/${lang}` },
        { id: 'community', label: 'Community', icon: Compass, href: '/community' },
        { id: 'journey', label: 'Journey', icon: History, href: `/versehub/${lang}/my-spiritual-journey` },
        { id: 'settings', label: 'Settings', icon: Zap, href: '/profile' },
    ];

    const selectedVerse = useMemo(() => 
        verses.find(v => v.key === activeVerseKey), 
        [verses, activeVerseKey]
    );

    const handlePickChapter = (bookCode: string, chapter: number) => {
        setPickerOpen(false);
        router.push(`/versehub/${lang}/chapter/${bookCode}.${chapter}`);
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="h-10 w-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 md:py-6">
                <div className="flex w-full">
                    <div className="hidden md:block w-72">
                        <DesktopSidebarNav activeId="bible" />
                    </div>

                    <div className="w-full md:flex-1 md:ml-8">
                        <div className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
                            <div className="flex items-center justify-between px-4 py-3.5">
                                <button onClick={handleBack} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                                    <X className="h-4 w-4" />
                                </button>
                                <h1 className="tct-brand-gradient text-xl font-bold">{chapter_label || 'VerseHub'}</h1>
                                <button onClick={() => setPickerOpen(true)} className="flex items-center gap-2 rounded-2xl px-4 py-2 text-[10px] font-bold border border-white/10 bg-white/5">
                                    <Library className="h-3.5 w-3.5 text-amber-500" />
                                    Library
                                </button>
                            </div>
                        </div>

                        <main className="mx-auto max-w-3xl px-4 py-8">
                            {!isChapter ? (
                                <section className="space-y-6">
                                    <div className="relative group">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                                            <input 
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                placeholder="Cari referensi: yoh 3:16"
                                                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm outline-none focus:border-amber-500/30 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-[3rem] p-10 bg-slate-900 border border-white/5 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                                        <h2 className="text-3xl font-bold mb-4">Mulai baca Alkitab hari ini.</h2>
                                        <p className="text-white/50 mb-8">Pilih salah satu kitab di bawah untuk memulai perjalanan rohanimu.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button onClick={() => {setTab('ot'); setPickerOpen(true);}} className="p-6 rounded-2xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-all">
                                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Old Testament</p>
                                                <p className="mt-1 font-bold">Kejadian 1</p>
                                            </button>
                                            <button onClick={() => {setTab('nt'); setPickerOpen(true);}} className="p-6 rounded-2xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-all">
                                                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">New Testament</p>
                                                <p className="mt-1 font-bold">Matius 1</p>
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            ) : (
                                <div className="space-y-6">
                                    {verses.map(v => (
                                        <div key={v.key} className="group rounded-2xl px-4 py-2 transition-all hover:bg-white/[0.02]">
                                            <button onClick={() => openVerseTools(v.key)} className="w-full text-left text-lg leading-relaxed text-white/90">
                                                <sup className="mr-3 text-xs font-bold text-amber-500/50">{v.verse}</sup>
                                                {v.text}
                                            </button>
                                        </div>
                                    ))}
                                    <EndOfChapterPrompt 
                                        lang={lang}
                                        questionText="Apa yang Firman katakan pada hatimu hari ini?"
                                        onReflect={() => setReflectionComposerOpen(true)}
                                    />
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {pickerOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md">
                        <div className="relative w-full max-h-[80vh] bg-slate-900 rounded-t-[3rem] p-8 overflow-hidden shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-bold">Jelajahi Alkitab</h3>
                                <button onClick={() => setPickerOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-8 bg-white/5 p-1 rounded-2xl">
                                <button onClick={() => setTab('ot')} className={cn("py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", tab === 'ot' ? "bg-white text-slate-950" : "text-white/40")}>OT</button>
                                <button onClick={() => setTab('nt')} className={cn("py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", tab === 'nt' ? "bg-white text-slate-900" : "text-white/40")}>NT</button>
                            </div>
                            <div className="flex gap-8 h-[400px]">
                                <div className="w-1/3 overflow-y-auto space-y-1">
                                    {books.filter(b => b.testament === tab).map(b => (
                                        <button key={b.code} onClick={() => setActiveBook(b.code)} className={cn("w-full text-left px-4 py-3 rounded-xl text-sm transition-all", activeBook === b.code ? "bg-amber-500/10 text-amber-500" : "text-white/40 hover:bg-white/5")}>{b.label}</button>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-2">
                                    {bookChapters.map(ch => (
                                        <button key={ch} onClick={() => handlePickChapter(activeBook!, ch)} className="aspect-square bg-white/5 rounded-xl flex items-center justify-center font-bold hover:bg-white/10 transition-all">{ch}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <FloatingBottomNav items={navItems} activeId="bible" />
            
            {shareOpen && <SharePanel {...shareData} lang={lang} isOpen={shareOpen} onClose={() => setShareOpen(false)} />}
            {reflectionComposerOpen && <ReflectionComposer isOpen={reflectionComposerOpen} onClose={() => setReflectionComposerOpen(false)} verseRef={activeVerseKey || ''} questionText="Apa yang Firman katakan pada hatimu hari ini?" lang={lang} />}
            {mentorOpen && selectedVerse && <MentorPanel verseRef={selectedVerse.key} lang={lang} verseText={selectedVerse.text} verseLabel={`${chapter_label}:${selectedVerse.verse}`} isAuthenticated={isAuthenticated} onClose={() => setMentorOpen(false)} />}
        </div>
    );
}
