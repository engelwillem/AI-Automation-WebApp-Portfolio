"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    BookHeart,
    BookOpenText,
    Bookmark,
    ChevronLeft,
    Heart,
    Loader2,
    Plus,
    MessageSquare,
    MessageSquareText,
    Send,
    Sparkles,
    X,
} from "lucide-react";
import { useAuthSession } from "@/auth/use-auth-session";
import AmbienceController from "@/components/versehub/AmbienceController";
import MentorPanel from "@/components/versehub/MentorPanel";
import { cn } from "@/lib/utils";
import { getAppAccessToken } from "@/services/app-auth-token";
import { getVerseShareUrl } from "@/lib/share";

type Book = {
    code: string;
    label: string;
    testament: "ot" | "nt";
};

type Verse = {
    key: string;
    verse: number;
    text: string;
};

type ChapterPayload = {
    selected_book?: string | null;
    selected_chapter?: number | null;
    chapters?: number[];
    chapter_label?: string;
    verses?: Verse[];
};

type VerseData = {
    ref: string;
    reference: string;
    text: string;
    translation_name: string | null;
    provider: string | null;
    og_image_url: string;
    canonical_url: string;
};

interface VersehubReaderPageProps {
    lang: string;
    mode?: "landing" | "chapter" | "verse";
    initialChapterRef?: string | null;
    initialVerseRef?: string | null;
}

type OverlayType = "explore" | "picker" | "mentor" | "audio" | null;

type SanctuaryScene = {
    eyebrow: string;
    quote: string;
    invitation: string;
    reflection: string;
};

const SANCTUARY_SCENES: SanctuaryScene[] = [
    {
        eyebrow: "VerseHub",
        quote: "\"Janganlah kita jemu-jemu berbuat baik...\"",
        invitation: "Masuk sebentar, tenangkan hati, lalu buka firman dengan ritme yang lebih pelan.",
        reflection: "Hari ini bukan tentang buru-buru menyelesaikan bacaan, tetapi tentang memberi ruang bagi firman untuk berbicara.",
    },
    {
        eyebrow: "Daily Mana",
        quote: "\"Firman-Mu itu pelita bagi kakiku...\"",
        invitation: "Mulai dari satu langkah kecil. Explore akan membawa Anda masuk ke kitab dan pasal yang ingin dibaca.",
        reflection: "VerseHub dirancang seperti ruang doa digital: satu layar untuk menerima, lalu satu jalur untuk masuk lebih dalam.",
    },
    {
        eyebrow: "Ruang Doa Digital",
        quote: "\"Tinggallah di dalam Aku...\"",
        invitation: "Pilih jalur baca, nyalakan ambience, dan biarkan scripture guide menemani saat Anda masuk ke ayat.",
        reflection: "Koleksi kitab, ambience Lagusion, dan mentor internal bekerja sebagai satu pengalaman, bukan panel-panel yang terpisah.",
    },
];

const landingContentPadding = "calc(180px + env(safe-area-inset-bottom, 24px))";
const readerContentPadding = "calc(180px + env(safe-area-inset-bottom, 24px))";

function buildTodayDateLabel(): string {
    try {
        return new Intl.DateTimeFormat("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Jakarta",
        }).format(new Date()).toUpperCase();
    } catch {
        return "HARI INI";
    }
}

const fetchJsonWithTimeout = async (input: string, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(input, {
            cache: "no-store",
            signal: controller.signal,
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`http_${response.status}`);
        }

        return response.json();
    } finally {
        window.clearTimeout(timeoutId);
    }
};

export function VersehubReaderPage({
    lang: initialLang,
    mode = "landing",
    initialChapterRef = null,
    initialVerseRef = null,
}: VersehubReaderPageProps) {
    const params = useParams<{ lang: string }>();
    const router = useRouter();
    const { identity, status: authStatus, isAuthenticated: isSessionAuthenticated } = useAuthSession();
    const lang = params?.lang || initialLang || "id";
    const accessToken = typeof window !== "undefined" ? getAppAccessToken() : null;
    const isAuthenticated = Boolean(accessToken);
    const isLandingMode = mode === "landing";
    const isChapterMode = mode === "chapter";
    const isVerseMode = mode === "verse";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [overlay, setOverlay] = useState<OverlayType>(null);
    const [activeMood, setActiveMood] = useState<string>(isLandingMode ? "hopeful" : "daily");
    const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
    const [tab, setTab] = useState<"ot" | "nt">("ot");
    const [books, setBooks] = useState<Book[]>([]);
    const [activeBook, setActiveBook] = useState<string | null>(null);
    const [chapters, setChapters] = useState<number[]>([]);
    const [chapterLabel, setChapterLabel] = useState("VerseHub");
    const [verses, setVerses] = useState<Verse[]>([]);
    const [verseData, setVerseData] = useState<VerseData | null>(null);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(124);
    const [bookmarked, setBookmarked] = useState(false);
    const [bookmarkCount, setBookmarkCount] = useState(37);
    const [ogOpen, setOgOpen] = useState(false);
    const [controlCenterOpen, setControlCenterOpen] = useState(false);
    const [audioMenuOpen, setAudioMenuOpen] = useState(false);
    const [isChromeVisible, setIsChromeVisible] = useState(true);
    const scrollViewportRef = React.useRef<HTMLElement | null>(null);
    const lastScrollTopRef = React.useRef(0);
    const scrollIdleTimerRef = React.useRef<number | null>(null);

    const activeScene = useMemo(() => {
        const index = new Date().getDay() % SANCTUARY_SCENES.length;
        return SANCTUARY_SCENES[index];
    }, []);

    const verseSegments = useMemo(
        () => (initialVerseRef ? initialVerseRef.split(/[-_.]/) : []),
        [initialVerseRef]
    );

    const verseBookCode = verseSegments[0] ?? null;
    const verseChapterNumber = verseSegments[1] ? Number(verseSegments[1]) : null;
    const chapterRouteFromVerse = verseBookCode && verseChapterNumber
        ? `/versehub/${lang}/${verseBookCode}-${verseChapterNumber}`
        : `/versehub/${lang}`;

    const activeBookLabel = useMemo(
        () => books.find((book) => book.code === activeBook)?.label ?? null,
        [activeBook, books]
    );

    const firstBookCode = books[0]?.code ?? null;
    const firstBookLabel = books[0]?.label ?? "kitab pertama";
    const firstChapterHref = firstBookCode ? `/versehub/${lang}/${firstBookCode}-1` : null;
    const mentorPreviewVerse = selectedVerse ?? verses[0] ?? null;
    const mentorPreviewLabel = (isChapterMode || isVerseMode) && mentorPreviewVerse
        ? `${chapterLabel}:${mentorPreviewVerse.verse}`
        : null;
    const mentorMood = useMemo(() => activeMood, [activeMood]);
    const memberName = authStatus === "authenticated" && !identity.isGuest ? identity.name : null;
    const liveDateLabel = useMemo(() => buildTodayDateLabel(), []);
    const sanctuaryTitle = isLandingMode ? "VerseHub" : isVerseMode ? verseData?.reference ?? chapterLabel : chapterLabel;
    const shouldShowChrome = isLandingMode || isChromeVisible || overlay !== null || controlCenterOpen || audioMenuOpen;
    const floatingMenuItems = useMemo(() => {
        const items = [
            {
                key: "explore",
                label: "Explore",
                onClick: () => {
                    setAudioMenuOpen(false);
                    setOverlay("explore");
                    setControlCenterOpen(false);
                },
            },
            {
                key: "kitab",
                label: "Kitab",
                onClick: () => {
                    setAudioMenuOpen(false);
                    setOverlay("picker");
                    setControlCenterOpen(false);
                },
            },
            {
                key: "audio",
                label: "Audio",
                onClick: () => {
                    setOverlay(null);
                    setAudioMenuOpen(true);
                    setControlCenterOpen(false);
                },
            },
        ];

        if (mentorPreviewVerse && mentorPreviewLabel) {
            items.unshift({
                key: "mentor",
                label: "Mentor",
                onClick: () => {
                    setSelectedVerse(mentorPreviewVerse);
                    setOverlay("mentor");
                    setAudioMenuOpen(false);
                    setControlCenterOpen(false);
                },
            });
        }

        return items;
    }, [mentorPreviewLabel, mentorPreviewVerse]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const booksPayload = await fetchJsonWithTimeout(`/api/versehub/${lang}/books`);
                if (cancelled) return;

                const nextBooks = Array.isArray(booksPayload?.books) ? booksPayload.books : [];
                setBooks(nextBooks);

                if (isChapterMode && initialChapterRef) {
                    const chapterPayload = (await fetchJsonWithTimeout(
                        `/api/versehub/${lang}/chapter/${initialChapterRef}`
                    )) as ChapterPayload;

                    if (cancelled) return;

                    const nextBook = chapterPayload.selected_book ?? initialChapterRef.split("-")[0] ?? null;
                    const nextVerses = Array.isArray(chapterPayload.verses) ? chapterPayload.verses : [];
                    const nextChapters = Array.isArray(chapterPayload.chapters) ? chapterPayload.chapters : [];
                    const nextLabel = chapterPayload.chapter_label ?? initialChapterRef;

                    setActiveBook(nextBook);
                    setChapters(nextChapters);
                    setVerses(nextVerses);
                    setChapterLabel(nextLabel);
                    setSelectedVerse(nextVerses[0] ?? null);
                    setVerseData(null);

                    const matchedBook = nextBooks.find((book: Book) => book.code === nextBook);
                    setTab(matchedBook?.testament === "nt" ? "nt" : "ot");
                } else if (isVerseMode && initialVerseRef) {
                    const [versePayload, chapterPayload] = await Promise.all([
                        fetchJsonWithTimeout(`/api/versehub/${lang}/${initialVerseRef}`),
                        verseBookCode && verseChapterNumber
                            ? fetchJsonWithTimeout(`/api/versehub/${lang}/chapter/${verseBookCode}-${verseChapterNumber}`)
                            : Promise.resolve(null),
                    ]);

                    if (cancelled) return;

                    const nextVerseData = versePayload as VerseData;
                    const chapterData = chapterPayload as ChapterPayload | null;
                    const nextVerses = Array.isArray(chapterData?.verses) ? chapterData.verses : [];
                    const nextChapters = Array.isArray(chapterData?.chapters) ? chapterData.chapters : [];
                    const nextBook = chapterData?.selected_book ?? verseBookCode;
                    const nextLabel = chapterData?.chapter_label
                        ?? (verseBookCode && verseChapterNumber ? `${verseBookCode.toUpperCase()} ${verseChapterNumber}` : "VerseHub");
                    const nextSelectedVerse = nextVerses.find((item) => item.key === initialVerseRef)
                        ?? nextVerses.find((item) => item.verse === Number(verseSegments[2]))
                        ?? null;

                    setVerseData(nextVerseData);
                    setActiveBook(nextBook ?? null);
                    setChapters(nextChapters);
                    setVerses(nextVerses);
                    setChapterLabel(nextLabel);
                    setSelectedVerse(nextSelectedVerse);

                    const matchedBook = nextBooks.find((book: Book) => book.code === nextBook);
                    setTab(matchedBook?.testament === "nt" ? "nt" : "ot");
                } else {
                    setChapterLabel("VerseHub");
                    setVerses([]);
                    setChapters([]);
                    setSelectedVerse(null);
                    setVerseData(null);
                }
            } catch {
                if (!cancelled) {
                    setError(
                        isVerseMode
                            ? "verse_not_found"
                            : isChapterMode
                                ? "chapter_not_found"
                                : "books_unavailable"
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [
        initialChapterRef,
        initialVerseRef,
        isChapterMode,
        isVerseMode,
        lang,
        verseBookCode,
        verseChapterNumber,
        verseSegments,
    ]);

    useEffect(() => {
        if (!isAuthenticated || !isVerseMode || !initialVerseRef || !accessToken || !verseBookCode || !verseChapterNumber) {
            return;
        }

        fetch(`/api/versehub/${lang}/actions?book=${verseBookCode}&chapter=${verseChapterNumber}`, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        })
            .then((response) => {
                if (response.status === 401 || response.status === 403) return null;
                return response.ok ? response.json() : null;
            })
            .then((json) => {
                const verseActions = json?.actions?.[initialVerseRef];
                if (verseActions) {
                    setLiked(Boolean(verseActions.favorite));
                    setBookmarked(Boolean(verseActions.bookmarked));
                }
            })
            .catch(() => undefined);
    }, [accessToken, initialVerseRef, isAuthenticated, isVerseMode, lang, verseBookCode, verseChapterNumber]);

    useEffect(() => {
        if (!isLandingMode || typeof window === "undefined") return;

        const autoOpen = window.sessionStorage.getItem("tct:versehub:auto-open");
        if (autoOpen === "explore") {
            window.sessionStorage.removeItem("tct:versehub:auto-open");
            const timerId = window.setTimeout(() => {
                setOverlay("explore");
            }, 240);
            return () => window.clearTimeout(timerId);
        }
    }, [isLandingMode]);

    useEffect(() => {
        if (isLandingMode) return;

        const viewport = scrollViewportRef.current;
        if (!viewport) return;

        const handleScroll = () => {
            const nextScrollTop = viewport.scrollTop;
            const delta = nextScrollTop - lastScrollTopRef.current;
            lastScrollTopRef.current = nextScrollTop;

            if (scrollIdleTimerRef.current) {
                window.clearTimeout(scrollIdleTimerRef.current);
            }

            if (Math.abs(delta) > 6) {
                setIsChromeVisible(delta < 0 || nextScrollTop < 24);
            }

            scrollIdleTimerRef.current = window.setTimeout(() => {
                setIsChromeVisible(true);
            }, 220);
        };

        viewport.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            viewport.removeEventListener("scroll", handleScroll);
            if (scrollIdleTimerRef.current) {
                window.clearTimeout(scrollIdleTimerRef.current);
            }
        };
    }, [isLandingMode]);

    useEffect(() => {
        if (overlay !== null || audioMenuOpen) {
            setControlCenterOpen(false);
        }
    }, [overlay, audioMenuOpen]);

    const loadBookChapters = async (bookCode: string) => {
        setActiveBook(bookCode);
        try {
            const payload = await fetchJsonWithTimeout(`/api/versehub/${lang}/chapters?book=${encodeURIComponent(bookCode)}`);
            setChapters(Array.isArray(payload?.chapters) ? payload.chapters : []);
        } catch {
            setChapters([]);
        }
    };

    const openMentorForVerse = (verse: Verse | null) => {
        if (!verse) return;
        setSelectedVerse(verse);
        setOverlay("mentor");
    };

    const handleLike = async () => {
        if (!isVerseMode || !initialVerseRef || !verseBookCode || !verseChapterNumber) return;
        if (!isAuthenticated) {
            router.push("/");
            return;
        }

        const token = getAppAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        const nextLiked = !liked;
        const previousLiked = liked;
        setLiked(nextLiked);
        setLikeCount((prev) => (nextLiked ? prev + 1 : prev - 1));

        try {
            const response = await fetch(`/api/versehub/${lang}/actions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    book: verseBookCode,
                    chapter: verseChapterNumber,
                    verse: verseSegments[2],
                    favorite: nextLiked,
                }),
            });

            if (!response.ok) throw new Error("Action failed");
        } catch {
            setLiked(previousLiked);
            setLikeCount((prev) => (previousLiked ? prev + 1 : prev - 1));
        }
    };

    const handleBookmark = async () => {
        if (!isVerseMode || !initialVerseRef || !verseBookCode || !verseChapterNumber) return;
        if (!isAuthenticated) {
            router.push("/");
            return;
        }

        const token = getAppAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        const nextBookmarked = !bookmarked;
        const previousBookmarked = bookmarked;
        setBookmarked(nextBookmarked);
        setBookmarkCount((prev) => (nextBookmarked ? prev + 1 : prev - 1));

        try {
            const response = await fetch(`/api/versehub/${lang}/actions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    book: verseBookCode,
                    chapter: verseChapterNumber,
                    verse: verseSegments[2],
                    bookmarked: nextBookmarked,
                }),
            });

            if (!response.ok) throw new Error("Action failed");
        } catch {
            setBookmarked(previousBookmarked);
            setBookmarkCount((prev) => (previousBookmarked ? prev + 1 : prev - 1));
        }
    };

    const handleShare = async () => {
        if (!verseData || !initialVerseRef) return;

        const shareData = {
            title: verseData.reference,
            text: `${verseData.reference}\n\n"${verseData.text}"\n\nBuka di VerseHub:`,
            url: getVerseShareUrl(lang, initialVerseRef),
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                alert("Teks ayat disalin!");
            }
        } catch {
            // Ignore cancelled shares.
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#F6F2EA]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">Menyiapkan Ruang Doa...</p>
                </div>
            </div>
        );
    }

    if (error && isChapterMode) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#F6F2EA] px-6 py-16 text-center text-slate-900">
                <div className="mx-auto max-w-md rounded-[32px] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] ring-1 ring-black/5 backdrop-blur-xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Pasal tidak ditemukan</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                        Data pasal belum berhasil dimuat. Kembali ke landing VerseHub untuk memilih kitab lain.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push(`/versehub/${lang}`)}
                        className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                    >
                        Kembali ke VerseHub
                    </button>
                </div>
            </div>
        );
    }

    if (error && isVerseMode) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[#F6F2EA] px-6 py-16 text-center text-slate-900">
                <div className="mx-auto max-w-md rounded-[32px] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] ring-1 ring-black/5 backdrop-blur-xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Ayat tidak ditemukan</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                        Ayat yang Anda cari belum berhasil dimuat. Anda masih bisa kembali ke chapter reader tanpa kehilangan suasana VerseHub.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push(chapterRouteFromVerse)}
                        className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                    >
                        Kembali ke Reader
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[#FAFCFF] text-slate-900 selection:bg-black/10">
            <div
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] mix-blend-multiply"
                style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.12) 1px, transparent 0)",
                    backgroundSize: "18px 18px",
                }}
            />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8f6ef_36%,#f5efe4_66%,#f7f3ea_100%)]" />
                <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#eef7ff]/70 blur-3xl" />
                <div className="absolute right-[-96px] top-0 h-80 w-80 rounded-full bg-[#f6eadb]/75 blur-3xl" />
                <div className="absolute bottom-[-100px] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-white/60 blur-3xl" />
                <div className="absolute left-[12%] top-[28%] h-56 w-56 rounded-full bg-[#fff7ed]/55 blur-3xl" />
            </div>

            {isLandingMode && (
                <>
                    <motion.header
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)]"
                    >
                        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4 px-6 pt-5 md:px-6">
                            <button
                                type="button"
                                onClick={() => router.push("/today")}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/82 text-sky-600 ring-1 ring-black/5 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.28)] backdrop-blur-xl transition hover:bg-white active:scale-95"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <div className="ml-auto flex max-w-[24rem] flex-col text-right">
                                <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40">
                                    {liveDateLabel}
                                </span>
                                <h1 className="text-[22px] font-semibold leading-[1.22] tracking-[-0.01em] text-foreground/95 md:text-[25px]">
                                    Selamat datang kembali,
                                </h1>
                                {memberName ? (
                                    <p className="mt-1 text-[16px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground/80 md:text-[18px]">
                                        {memberName}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-[13px] font-medium leading-[1.45] tracking-[0.01em] text-foreground/60 md:text-[14px]">
                                        Chosen People
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.header>

                    <main className="relative z-10 flex flex-1 flex-col justify-center px-6 pt-20 text-center md:px-10" style={{ paddingBottom: landingContentPadding }}>
                        <div className="mx-auto max-w-3xl">
                            <p className="text-[11px] font-black uppercase tracking-[0.44em] text-[#91A0C7]">{activeScene.eyebrow}</p>
                            <motion.h1
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="mx-auto mt-10 max-w-[12ch] font-serif text-[50px] italic leading-[1.08] tracking-[-0.04em] text-[#172042] sm:text-[64px] md:text-[78px]"
                            >
                                {activeScene.quote}
                            </motion.h1>
                            <p className="mx-auto mt-7 max-w-xl text-[15px] leading-7 text-slate-600 md:text-base">
                                {activeScene.invitation}
                            </p>
                        </div>
                    </main>

                    <div className="absolute inset-x-0 z-40 px-4 md:px-6" style={{ bottom: "calc(96px + env(safe-area-inset-bottom, 24px))" }}>
                        <div className="mx-auto flex max-w-xl flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => setOverlay("explore")}
                                className="group mx-auto inline-flex min-h-[72px] w-full max-w-[360px] items-center justify-between rounded-full bg-white/86 px-5 py-4 text-left shadow-[0_18px_40px_rgba(15,23,42,0.1)] ring-1 ring-black/5 backdrop-blur-2xl transition hover:bg-white active:scale-[0.98]"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-black/5">
                                        <Sparkles className="h-4 w-4" />
                                    </span>
                                    <span>
                                        <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Explore</span>
                                        <span className="mt-1 block text-[15px] font-black tracking-tight text-slate-900">
                                            Waktunya Selidiki Firman Lebih Dalam
                                        </span>
                                    </span>
                                </span>
                                <ArrowRight className="h-5 w-5 text-[#2A67FF] transition group-hover:translate-x-0.5" />
                            </button>

                            <div className="mx-auto grid w-full max-w-[420px] grid-cols-3 gap-2 rounded-[30px] bg-white/78 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur-2xl">
                                <button type="button" onClick={() => setOverlay("picker")} className="rounded-[22px] px-3 py-3 text-center transition hover:bg-slate-50 active:scale-95">
                                    <BookOpenText className="mx-auto h-4 w-4 text-slate-500" />
                                    <span className="mt-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Kitab</span>
                                </button>
                                <button type="button" onClick={() => setOverlay("explore")} className="rounded-[22px] px-3 py-3 text-center transition hover:bg-slate-50 active:scale-95">
                                    <BookHeart className="mx-auto h-4 w-4 text-slate-500" />
                                    <span className="mt-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Deep Dive</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOverlay(null);
                                        if (firstChapterHref) router.push(firstChapterHref);
                                    }}
                                    className="rounded-[22px] px-3 py-3 text-center transition hover:bg-slate-50 active:scale-95"
                                >
                                    <MessageSquareText className="mx-auto h-4 w-4 text-slate-500" />
                                    <span className="mt-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Mulai</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {isChapterMode && (
                <>
                    <motion.header
                        initial={false}
                        animate={shouldShowChrome ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                            "relative z-40 border-b border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,243,234,0.72))] backdrop-blur-2xl",
                            !shouldShowChrome && "pointer-events-none"
                        )}
                    >
                        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => router.push(`/versehub/${lang}`)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/82 text-sky-600 ring-1 ring-black/5 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.28)] backdrop-blur-xl transition hover:bg-white active:scale-95"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <div className="ml-auto flex max-w-[24rem] flex-col text-right">
                                <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40">
                                    {liveDateLabel}
                                </span>
                                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#91A0C7]">
                                    EKSPLORASI FIRMAN HARI INI
                                </p>
                                <h1 className="mt-2 text-[22px] font-semibold leading-[1.22] tracking-[-0.01em] text-foreground/95 md:text-[25px]">
                                    {memberName ? `${memberName}, ${sanctuaryTitle}` : sanctuaryTitle}
                                </h1>
                            </div>
                        </div>
                    </motion.header>

                    <main ref={(node) => { scrollViewportRef.current = node; }} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
                        <div className="mx-auto max-w-4xl pb-[calc(180px+env(safe-area-inset-bottom,24px))]">
                            <section className="overflow-hidden rounded-[34px] bg-white/84 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] backdrop-blur-2xl md:p-7">
                                <div className="flex flex-col gap-5 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
                                    <div className="max-w-2xl">
                                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#91A0C7]">Reader Engine</p>
                                        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{chapterLabel}</h2>
                                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                            Reader mode dibuat lebih utilitarian, tetapi tetap satu pengalaman dengan sanctuary VerseHub. Tekan ayat untuk membuka mentor internal.
                                        </p>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => setOverlay("explore")}
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Explore
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOverlay("picker")}
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-200"
                                        >
                                            <BookOpenText className="h-3.5 w-3.5" />
                                            Ganti Pasal
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-[1.25fr,0.75fr]">
                                    <div className="rounded-[28px] bg-[#FBFAF6] p-4 ring-1 ring-black/[0.04]">
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Bacaan</p>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                            {verses.length} ayat siap dibaca. Tap salah satu ayat untuk membuka scripture guide internal berbasis Laravel.
                                        </p>
                                    </div>
                                    <div className="rounded-[28px] bg-[#FBFAF6] p-4 ring-1 ring-black/[0.04]">
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Companion</p>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                            Ambience Lagusion tetap aktif di reader. Pilih vocal atau instrumental langsung dari floating audio companion.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-4" style={{ paddingBottom: readerContentPadding }}>
                                    {verses.map((verse) => (
                                        <button
                                            key={verse.key}
                                            type="button"
                                            onClick={() => openMentorForVerse(verse)}
                                            className="group block w-full rounded-[28px] bg-[#F9F7F2] px-4 py-4 text-left ring-1 ring-black/[0.03] transition hover:bg-white hover:shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:px-5"
                                        >
                                            <div className="flex items-start gap-4">
                                                <span className="mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-[12px] font-black text-slate-500 shadow-sm ring-1 ring-black/[0.04]">
                                                    {verse.verse}
                                                </span>
                                            <div className="flex-1">
                                                <p className="text-[20px] leading-[1.85] text-slate-800/95 md:text-[23px]">{verse.text}</p>
                                                    <span className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 transition group-hover:text-[#2A67FF]">
                                                        <MessageSquareText className="h-3.5 w-3.5" />
                                                        Buka mentor untuk ayat ini
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </main>
                </>
            )}

            {isVerseMode && verseData && (
                <>
                    <motion.header
                        initial={false}
                        animate={shouldShowChrome ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                            "relative z-40 border-b border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,243,234,0.72))] backdrop-blur-2xl",
                            !shouldShowChrome && "pointer-events-none"
                        )}
                    >
                        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => router.push(chapterRouteFromVerse)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/82 text-sky-600 ring-1 ring-black/5 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.28)] backdrop-blur-xl transition hover:bg-white active:scale-95"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <div className="ml-auto flex max-w-[24rem] flex-col text-right">
                                <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40">
                                    {liveDateLabel}
                                </span>
                                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#91A0C7]">
                                    EKSPLORASI FIRMAN HARI INI
                                </p>
                                <h1 className="mt-2 text-[22px] font-semibold leading-[1.22] tracking-[-0.01em] text-foreground/95 md:text-[25px]">
                                    {memberName ? `${memberName}, ${sanctuaryTitle}` : sanctuaryTitle}
                                </h1>
                            </div>
                        </div>
                    </motion.header>

                    <main ref={(node) => { scrollViewportRef.current = node; }} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
                        <div className="mx-auto max-w-3xl pb-[calc(180px+env(safe-area-inset-bottom,24px))]">
                            <div className="space-y-8">
                                <section className="rounded-[34px] bg-white/84 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] backdrop-blur-2xl md:p-7">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#91A0C7]">Verse Focus</p>
                                            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{verseData.reference}</h2>
                                            <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                                Ayat tunggal ini tetap berada dalam ekosistem reader VerseHub, jadi Anda bisa bookmark, share, dan kembali ke chapter tanpa kehilangan konteks.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => router.push(chapterRouteFromVerse)}
                                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-200"
                                        >
                                            <MessageSquareText className="h-3.5 w-3.5" />
                                            Reader
                                        </button>
                                    </div>
                                </section>

                                <section className="group overflow-hidden rounded-[40px] bg-white/84 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] backdrop-blur-2xl md:p-5">
                                    <div className="overflow-hidden rounded-[24px] ring-1 ring-black/[0.04] md:rounded-[32px]">
                                        <img
                                            src={verseData.og_image_url}
                                            alt="Shared Verse"
                                            className="aspect-[1200/630] w-full cursor-zoom-in object-cover transition-transform duration-700 group-hover:scale-105"
                                            onClick={() => setOgOpen(true)}
                                            loading="lazy"
                                        />
                                    </div>
                                </section>

                                <section className="overflow-hidden rounded-[40px] bg-white/84 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] backdrop-blur-2xl">
                                    <div className="p-5 md:p-7">
                                        <blockquote className="relative">
                                            <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 text-slate-400/10" aria-hidden>
                                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M10 11H6V7a4 4 0 0 1 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                    <path d="M18 11h-4V7a4 4 0 0 1 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                    <path d="M10 11v6H6v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M18 11v6h-4v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>

                                            <div className="pl-6 md:pl-10">
                                                <div className="text-[21px] italic leading-[1.85] text-slate-800/95 md:text-[23px]">
                                                    {verseData.text}
                                                </div>

                                                <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-400/80">
                                                    <span className="uppercase tracking-[0.2em]">{verseData.provider ?? "versehub"}</span>
                                                    {verseData.translation_name && (
                                                        <>
                                                            <span className="opacity-40">•</span>
                                                            <span className="tracking-widest">{verseData.translation_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </blockquote>

                                        <div className="mt-10 flex items-center justify-between border-t border-black/5 pt-6">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={handleLike}
                                                    className={cn(
                                                        "flex h-11 items-center gap-2.5 rounded-full px-5 transition-all active:scale-90",
                                                        liked ? "bg-rose-500/10 text-rose-500" : "text-slate-500 hover:bg-slate-100"
                                                    )}
                                                >
                                                    <Heart className={cn("h-5 w-5", liked ? "fill-current" : "")} />
                                                    <span className="text-sm font-bold tabular-nums">{liked ? `You + ${likeCount - 1}` : likeCount}</span>
                                                </button>

                                                <button className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 active:scale-95">
                                                    <MessageSquare className="h-5 w-5" />
                                                </button>

                                                <button
                                                    onClick={handleShare}
                                                    className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 active:scale-95"
                                                >
                                                    <Send className="h-5 w-5" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleBookmark}
                                                className={cn(
                                                    "flex h-11 items-center gap-2.5 rounded-full px-5 transition-all active:scale-95",
                                                    bookmarked ? "bg-[#2A67FF]/10 text-[#2A67FF]" : "text-slate-500 hover:bg-slate-100"
                                                )}
                                            >
                                                <Bookmark className={cn("h-5 w-5", bookmarked ? "fill-current" : "")} />
                                                <span className="text-sm font-bold tabular-nums">{bookmarked ? `You + ${bookmarkCount - 1}` : bookmarkCount}</span>
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </main>
                </>
            )}

            <AnimatePresence>
                {overlay === "explore" && (
                    <div className="fixed inset-0 z-[60]">
                        <motion.button
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOverlay(null)}
                            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ type: "spring", stiffness: 240, damping: 28 }}
                            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl rounded-t-[36px] bg-white/96 p-6 shadow-[0_-30px_80px_rgba(15,23,42,0.18)] ring-1 ring-black/5 backdrop-blur-2xl md:left-1/2 md:max-w-2xl md:-translate-x-1/2"
                        >
                            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-slate-200" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#91A0C7]">Deep Dive</p>
                                    <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Masuk ke firman tanpa kehilangan rasa heningnya.</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOverlay(null)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-90"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <p className="mt-4 text-sm leading-7 text-slate-600">{activeScene.reflection}</p>

                            <div className="mt-6 grid gap-3 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setOverlay("picker")}
                                    className="rounded-[26px] bg-[#FBFAF6] p-4 text-left ring-1 ring-black/[0.04] transition hover:bg-slate-50 active:scale-[0.98]"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Koleksi Kitab</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-slate-900">Buka Perjanjian Lama dan Baru</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                        Masuk ke daftar kitab, lalu pilih pasal yang ingin Anda baca dengan flow yang lebih tenang.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    disabled={!firstChapterHref}
                                    onClick={() => {
                                        if (!firstChapterHref) return;
                                        setOverlay(null);
                                        router.push(firstChapterHref);
                                    }}
                                    className="rounded-[26px] bg-[#FBFAF6] p-4 text-left ring-1 ring-black/[0.04] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Jalur Cepat</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-slate-900">Mulai dari {firstBookLabel} 1</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                        Cocok untuk langsung masuk ke reader utilitarian tanpa kehilangan transisi dari landing.
                                    </p>
                                </button>

                                <div className="rounded-[26px] bg-[#FBFAF6] p-4 text-left ring-1 ring-black/[0.04]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Lagusion Companion</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-slate-900">Vocal dan audio-only tetap tersedia</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                        Floating audio companion akan menemani bacaan Anda dengan pilihan vocal, piano, acoustic, atau instrumental.
                                    </p>
                                </div>

                                <div className="rounded-[26px] bg-[#FBFAF6] p-4 text-left ring-1 ring-black/[0.04]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Atur Atmosfer</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-slate-900">Pilih Mood Saat Ini</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {[
                                            { key: "hopeful", label: "Cahaya" },
                                            { key: "anxious", label: "Ketenangan" },
                                            { key: "weary", label: "Lelah" },
                                            { key: "grateful", label: "Syukur" },
                                        ].map((mood) => (
                                            <button
                                                key={mood.key}
                                                onClick={() => setActiveMood(mood.key)}
                                                className={cn(
                                                    "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition",
                                                    activeMood === mood.key ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-black/5 hover:bg-slate-50"
                                                )}
                                            >
                                                {mood.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[26px] bg-[#FBFAF6] p-4 text-left ring-1 ring-black/[0.04]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Mentor Internal</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-slate-900">Scripture guide aktif saat ayat dibuka</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                        Mentor menarik refleksi, kaitan ayat, konteks, dan study guidance dari engine Laravel internal dengan metadata penuh.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {overlay === "picker" && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                        <motion.button
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOverlay(null)}
                            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 12 }}
                            className="relative flex h-[min(82dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-[36px] bg-white shadow-2xl ring-1 ring-black/5"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#91A0C7]">VerseHub</p>
                                    <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">Koleksi Kitab</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOverlay(null)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-90"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex gap-2 border-b border-slate-100 px-6 py-4">
                                {(["ot", "nt"] as const).map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setTab(item)}
                                        className={cn(
                                            "rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition",
                                            tab === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        )}
                                    >
                                        {item === "ot" ? "Perjanjian Lama" : "Perjanjian Baru"}
                                    </button>
                                ))}
                            </div>

                            <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[1.15fr,0.85fr]">
                                <div className="min-h-0 overflow-y-auto border-b border-slate-100 p-5 text-slate-900 md:border-b-0 md:border-r">
                                    <div className="grid grid-cols-2 gap-3">
                                        {books.filter((book) => book.testament === tab).map((book) => (
                                            <button
                                                key={book.code}
                                                type="button"
                                                onClick={() => loadBookChapters(book.code)}
                                                className={cn(
                                                    "rounded-[22px] px-4 py-4 text-left text-sm font-bold transition ring-1",
                                                    activeBook === book.code
                                                        ? "bg-slate-900 text-white ring-slate-900"
                                                        : "bg-slate-50 text-slate-700 ring-slate-100 hover:bg-slate-100"
                                                )}
                                            >
                                                {book.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="min-h-0 overflow-y-auto p-5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                        {activeBookLabel ? `Pilih Pasal ${activeBookLabel}` : "Pilih Pasal"}
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {chapters.map((chapter) => (
                                            <button
                                                key={chapter}
                                                type="button"
                                                onClick={() => {
                                                    if (!activeBook) return;
                                                    setOverlay(null);
                                                    router.push(`/versehub/${lang}/${activeBook}-${chapter}`);
                                                }}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                                            >
                                                {chapter}
                                            </button>
                                        ))}
                                        {chapters.length === 0 && (
                                            <p className="text-sm text-slate-500">Pilih kitab terlebih dahulu untuk melihat daftar pasal.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {overlay === "mentor" && mentorPreviewVerse && mentorPreviewLabel && (
                <MentorPanel
                    verseRef={mentorPreviewVerse.key}
                    lang={lang}
                    verseText={mentorPreviewVerse.text}
                    verseLabel={mentorPreviewLabel}
                    activeMood={mentorMood}
                    isAuthenticated={true}
                    onClose={() => setOverlay(null)}
                />
            )}

            <AnimatePresence>
                {controlCenterOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed bottom-[calc(92px+env(safe-area-inset-bottom,24px))] right-4 z-[74] flex flex-col items-end gap-2 md:right-8"
                    >
                        {floatingMenuItems.map((item, index) => (
                            <motion.button
                                key={item.key}
                                type="button"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.26, delay: index * 0.03 }}
                                onClick={item.onClick}
                                className="rounded-full bg-white/88 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 backdrop-blur-2xl ring-1 ring-black/5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)] transition hover:bg-white"
                            >
                                {item.label}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <AmbienceController
                className={cn(
                    "z-[70] transition-opacity duration-500",
                    shouldShowChrome ? "opacity-100" : "pointer-events-none opacity-0"
                )}
                isDucking={!!overlay}
                activeMoodKey={activeMood}
                dayIndex={new Date().getDay()}
                menuOpen={audioMenuOpen}
                hideTrigger
                onMenuOpen={(isOpen) => {
                    if (isOpen) {
                        setAudioMenuOpen(true);
                        setOverlay("audio");
                    } else {
                        setAudioMenuOpen(false);
                        if (overlay === "audio") {
                            setOverlay(null);
                        }
                    }
                }}
            />

            <motion.button
                type="button"
                initial={false}
                animate={shouldShowChrome ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setControlCenterOpen((prev) => !prev)}
                className={cn(
                    "fixed bottom-[calc(20px+env(safe-area-inset-bottom,24px))] right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full bg-white/88 text-slate-700 backdrop-blur-2xl ring-1 ring-black/5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)] transition hover:bg-white md:right-8",
                    !shouldShowChrome && "pointer-events-none"
                )}
                aria-label={controlCenterOpen ? "Close control center" : "Open control center"}
            >
                <motion.div animate={{ rotate: controlCenterOpen ? 45 : 0 }} transition={{ duration: 0.28 }}>
                    <Plus className="h-5 w-5" />
                </motion.div>
            </motion.button>

            {error && isLandingMode && (
                <div className="pointer-events-none absolute left-1/2 top-24 z-40 -translate-x-1/2 px-4">
                    <div className="rounded-full bg-white/85 px-4 py-2 text-[11px] font-bold text-slate-500 shadow-sm ring-1 ring-black/5 backdrop-blur-xl">
                        Koneksi kitab sedang tidak stabil, tetapi sanctuary VerseHub tetap siap dipakai.
                    </div>
                </div>
            )}

            {isLandingMode && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-24 bg-gradient-to-t from-[#F7F4EC] to-transparent" />
            )}

            <AnimatePresence>
                {ogOpen && verseData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md"
                    >
                        <button
                            onClick={() => setOgOpen(false)}
                            className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-90"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={verseData.og_image_url}
                            className="max-h-[85dvh] w-full max-w-5xl rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
