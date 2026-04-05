"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    Bookmark,
    ChevronLeft,
    Heart,
    Loader2,
    MessageSquare,
    MessageSquareText,
    Send,
    X,
} from "lucide-react";
import { useAuthSession } from "@/auth/use-auth-session";
import AmbienceController from "@/components/versehub/AmbienceController";
import MentorPanel from "@/components/versehub/MentorPanel";
import { cn } from "@/lib/utils";
import { getAppAccessToken } from "@/services/app-auth-token";
import { getVerseShareUrl } from "@/lib/share";
import { trackVersehubEvent } from "@/features/versehub/analytics";
import { VersehubLandingView } from "@/features/versehub/components/VersehubLandingView";
import { VersehubReaderView } from "@/features/versehub/components/VersehubReaderView";
import { VersehubControlCenter, type ControlCenterItem } from "@/features/versehub/components/VersehubControlCenter";
import { buildTodayDateLabel, landingContentPadding, readerContentPadding, SANCTUARY_SCENES } from "@/features/versehub/constants";
import type { Book, ChapterPayload, OverlayType, Verse, VerseData } from "@/features/versehub/types";

interface VersehubReaderPageProps {
    lang: string;
    mode?: "landing" | "chapter" | "verse";
    initialChapterRef?: string | null;
    initialVerseRef?: string | null;
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
    const { identity, status: authStatus, isAuthenticated } = useAuthSession();
    const lang = params?.lang || initialLang || "id";
    const accessToken = typeof window !== "undefined" ? getAppAccessToken() : null;
    const isLandingMode = mode === "landing";
    const isChapterMode = mode === "chapter";
    const isVerseMode = mode === "verse";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [overlay, setOverlay] = useState<OverlayType>(null);
    const [activeMood, setActiveMood] = useState<string>(isLandingMode ? "hopeful" : "daily");
    const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
    const [selectedVerseReflection, setSelectedVerseReflection] = useState<string | null>(null);
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
    const [lastVisitedChapterHref, setLastVisitedChapterHref] = useState<string | null>(null);
    const [lastVisitedChapterLabel, setLastVisitedChapterLabel] = useState<string | null>(null);
    const [chapterReflectionQuestion, setChapterReflectionQuestion] = useState("Apa satu hal yang sedang Tuhan tekankan di hatimu dari bacaan ini?");
    const [reflectionDrafts, setReflectionDrafts] = useState<Record<string, string>>({});
    const [completedReflections, setCompletedReflections] = useState<Record<string, boolean>>({});
    const [chapterCompletionReflection, setChapterCompletionReflection] = useState("");
    const [hasReachedChapterEnd, setHasReachedChapterEnd] = useState(false);
    const [isSavingChapterReflection, setIsSavingChapterReflection] = useState(false);
    const [chapterReflectionSaved, setChapterReflectionSaved] = useState(false);
    const [chapterReflectionError, setChapterReflectionError] = useState<string | null>(null);
    const [isSharingInsight, setIsSharingInsight] = useState(false);
    const [shareInsightError, setShareInsightError] = useState<string | null>(null);
    const scrollViewportRef = React.useRef<HTMLElement | null>(null);
    const lastScrollTopRef = React.useRef(0);
    const scrollIdleTimerRef = React.useRef<number | null>(null);
    const audioPlaybackStartedAtRef = React.useRef<number | null>(null);

    const activeScene = useMemo(() => {
        const moodMatchedScene = SANCTUARY_SCENES.find((scene) => scene.moodTag === activeMood);
        if (moodMatchedScene) return moodMatchedScene;
        const index = new Date().getDay() % SANCTUARY_SCENES.length;
        return SANCTUARY_SCENES[index];
    }, [activeMood]);

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
    const floatingMenuItems = useMemo<ControlCenterItem[]>(() => {
        const items: ControlCenterItem[] = [
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
        if (typeof window === "undefined") return;
        const storedMood = window.localStorage.getItem("tct:versehub:last-active-mood");
        const storedChapterHref = window.localStorage.getItem("tct:versehub:last-visited-book");
        const storedChapterLabel = window.localStorage.getItem("tct:versehub:last-visited-book-label");

        if (storedMood) {
            setActiveMood(storedMood);
        }
        if (storedChapterHref) {
            setLastVisitedChapterHref(storedChapterHref);
        }
        if (storedChapterLabel) {
            setLastVisitedChapterLabel(storedChapterLabel);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("tct:versehub:last-active-mood", activeMood);
    }, [activeMood]);

    useEffect(() => {
        setReflectionDrafts({});
        setCompletedReflections({});
        setChapterCompletionReflection("");
        setHasReachedChapterEnd(false);
        setChapterReflectionSaved(false);
        setChapterReflectionError(null);
        setShareInsightError(null);
    }, [initialChapterRef, lang, mode]);

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
                    setChapterReflectionQuestion(
                        chapterPayload.reflection_question
                            ?? "Apa satu hal yang sedang Tuhan tekankan di hatimu dari bacaan ini?"
                    );
                    setSelectedVerse(nextVerses[0] ?? null);
                    setVerseData(null);
                    setHasReachedChapterEnd(false);
                    setChapterReflectionSaved(Boolean(chapterPayload.has_reflected));
                    setChapterReflectionError(null);
                    setShareInsightError(null);

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
                    setChapterReflectionQuestion(
                        chapterData?.reflection_question
                            ?? "Apa satu hal yang sedang Tuhan tekankan di hatimu dari bacaan ini?"
                    );
                    setSelectedVerse(nextSelectedVerse);
                    setHasReachedChapterEnd(false);
                    setChapterReflectionSaved(Boolean(chapterData?.has_reflected));
                    setChapterReflectionError(null);
                    setShareInsightError(null);

                    const matchedBook = nextBooks.find((book: Book) => book.code === nextBook);
                    setTab(matchedBook?.testament === "nt" ? "nt" : "ot");
                } else {
                    setChapterLabel("VerseHub");
                    setVerses([]);
                    setChapters([]);
                    setSelectedVerse(null);
                    setVerseData(null);
                    setChapterReflectionQuestion("Apa satu hal yang sedang Tuhan tekankan di hatimu dari bacaan ini?");
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
        if (typeof window === "undefined") return;
        if ((!isChapterMode && !isVerseMode) || !chapterLabel) return;

        const href = isChapterMode
            ? (initialChapterRef ? `/versehub/${lang}/${initialChapterRef}` : activeBook ? `/versehub/${lang}/${activeBook}` : null)
            : chapterRouteFromVerse;
        if (!href) return;
        window.localStorage.setItem("tct:versehub:last-visited-book", href);
        window.localStorage.setItem("tct:versehub:last-visited-book-label", chapterLabel);
        setLastVisitedChapterHref(href);
        setLastVisitedChapterLabel(chapterLabel);
    }, [activeBook, chapterLabel, chapterRouteFromVerse, initialChapterRef, isChapterMode, isVerseMode, lang]);

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

    useEffect(() => {
        const isAnyOverlayActive = overlay !== null || ogOpen;
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("tct:overlay-activity", {
                detail: { source: "versehub", active: isAnyOverlayActive }
            }));
        }
        return () => {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tct:overlay-activity", {
                    detail: { source: "versehub", active: false }
                }));
            }
        };
    }, [overlay, ogOpen]);

    useEffect(() => {
        return () => {
            if (audioPlaybackStartedAtRef.current === null) return;
            const durationSeconds = Math.max(1, Math.round((Date.now() - audioPlaybackStartedAtRef.current) / 1000));
            void trackVersehubEvent(lang, "versehub_audio_toggle", {
                persona: "reader",
                meta: {
                    action: "stop",
                    mood: activeMood,
                    duration_seconds: durationSeconds,
                    source: "cleanup",
                },
            });
        };
    }, [lang]);

    const loadBookChapters = async (bookCode: string) => {
        setActiveBook(bookCode);
        try {
            const payload = await fetchJsonWithTimeout(`/api/versehub/${lang}/chapters?book=${encodeURIComponent(bookCode)}`);
            setChapters(Array.isArray(payload?.chapters) ? payload.chapters : []);
        } catch {
            setChapters([]);
        }
    };

    const openMentorForVerse = (verse: Verse | null, userReflection?: string | null) => {
        if (!verse) return;
        setSelectedVerse(verse);
        setSelectedVerseReflection(userReflection ?? null);
        setOverlay("mentor");
    };

    const handleMoodQuickStart = async (moodKey: string) => {
        setActiveMood(moodKey);
        setOverlay("explore");
        await trackVersehubEvent(lang, "versehub_mood_click", {
            persona: "landing",
            meta: {
                mood: moodKey,
                source: "quick_start",
            },
        });
    };

    const handleReflectionChange = (key: string, value: string) => {
        setReflectionDrafts((prev) => ({ ...prev, [key]: value }));
    };

    const handleReflectionComplete = async (key: string) => {
        const answer = reflectionDrafts[key]?.trim() ?? "";
        if (answer.length < 3) return;

        setCompletedReflections((prev) => ({ ...prev, [key]: true }));
        await trackVersehubEvent(lang, "versehub_reflection_complete", {
            persona: "reader",
            meta: {
                scope: "chapter_break",
                chapter: chapterLabel,
                reflection_length: answer.length,
            },
        });
    };

    const handleSaveChapterReflection = async () => {
        if (!isAuthenticated) {
            router.push(`/login?next=${encodeURIComponent(`/versehub/${lang}/${initialChapterRef ?? ""}`)}`);
            return;
        }

        const token = getAppAccessToken();
        if (!token || !initialChapterRef) {
            setChapterReflectionError("Sesi login tidak ditemukan. Silakan masuk kembali.");
            return;
        }

        const composedBreakReflection = Object.entries(completedReflections)
            .filter(([, isDone]) => isDone)
            .map(([key]) => reflectionDrafts[key]?.trim())
            .filter((item): item is string => Boolean(item));
        const finalReflection = chapterCompletionReflection.trim();
        const answerText = [
            ...composedBreakReflection,
            finalReflection ? `Ringkasan akhir:\n${finalReflection}` : null,
        ]
            .filter(Boolean)
            .join("\n\n");

        if (answerText.trim().length < 3) {
            setChapterReflectionError("Tuliskan sedikit refleksi dulu sebelum menyimpannya ke arsip.");
            return;
        }

        setIsSavingChapterReflection(true);
        setChapterReflectionError(null);

        try {
            const response = await fetch(`/api/versehub/${lang}/reflections`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    verse_ref: initialChapterRef,
                    question_text: chapterReflectionQuestion,
                    answer_text: answerText,
                    is_private: true,
                }),
            });

            if (!response.ok) {
                throw new Error("save_failed");
            }

            setChapterReflectionSaved(true);
        } catch {
            setChapterReflectionError("Belum bisa menyimpan perenungan pasal ini ke arsip.");
        } finally {
            setIsSavingChapterReflection(false);
        }
    };

    const handleShareInsight = async () => {
        const baseReflection = chapterCompletionReflection.trim();
        const fallbackInsight = Object.entries(completedReflections)
            .filter(([, isDone]) => isDone)
            .map(([key]) => reflectionDrafts[key]?.trim())
            .find(Boolean);
        const insight = baseReflection || fallbackInsight || `Saya baru selesai membaca ${chapterLabel} di VerseHub.`;

        setIsSharingInsight(true);
        setShareInsightError(null);

        try {
            const text = `${insight}\n\n${chapterLabel}`;
            router.push(`/community?intent=reflection&text=${encodeURIComponent(text)}`);
        } catch {
            setShareInsightError("Belum bisa membuka Community sekarang.");
        } finally {
            setIsSharingInsight(false);
        }
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
            <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--vh-bg)] text-[var(--vh-text-primary)] transition-colors duration-500">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-[var(--vh-text-muted)]" />
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[var(--vh-text-muted)]">Menyiapkan Ruang Doa...</p>
                </div>
            </div>
        );
    }

    if (error && isChapterMode) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--vh-bg)] px-6 py-16 text-center text-[var(--vh-text-primary)]">
                <div className="mx-auto max-w-md rounded-[32px] bg-[var(--vh-surface)]/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)] ring-1 ring-[var(--vh-border)] backdrop-blur-xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--vh-text-muted)]">Pasal tidak ditemukan</p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--vh-text-secondary)]">
                        Data pasal belum berhasil dimuat. Kembali ke landing VerseHub untuk memilih kitab lain.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push(`/versehub/${lang}`)}
                        className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black shadow-sm transition hover:bg-white/90"
                    >
                        Kembali ke VerseHub
                    </button>
                </div>
            </div>
        );
    }

    if (error && isVerseMode) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--vh-bg)] px-6 py-16 text-center text-[var(--vh-text-primary)]">
                <div className="mx-auto max-w-md rounded-[32px] bg-[var(--vh-surface)]/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)] ring-1 ring-[var(--vh-border)] backdrop-blur-xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--vh-text-muted)]">Ayat tidak ditemukan</p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--vh-text-secondary)]">
                        Ayat yang Anda cari belum berhasil dimuat. Anda masih bisa kembali ke chapter reader tanpa kehilangan suasana VerseHub.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push(chapterRouteFromVerse)}
                        className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black shadow-sm transition hover:bg-white/90"
                    >
                        Kembali ke Reader
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[var(--vh-bg)] text-[var(--vh-text-primary)] selection:bg-[var(--vh-accent)]/30">
            <div
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
                style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                }}
            />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(22,22,24,0.8)_0%,#0A0A0B_60%)]" />
                <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#2A67FF]/[0.03] blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-white/[0.015] blur-[100px]" />
                <div className="absolute left-[12%] top-[28%] h-56 w-56 rounded-full bg-[var(--vh-accent)]/[0.01] blur-3xl" />
            </div>

            {isLandingMode && (
                <VersehubLandingView
                    activeScene={activeScene}
                    landingContentPadding={landingContentPadding}
                    firstChapterHref={firstChapterHref}
                    firstBookLabel={firstBookLabel}
                    continueReadingHref={lastVisitedChapterHref}
                    continueReadingLabel={lastVisitedChapterLabel}
                    onContinueReading={() => {
                        if (lastVisitedChapterHref) {
                            router.push(lastVisitedChapterHref);
                        }
                    }}
                    onBackToday={() => router.push("/today")}
                    onOpenPicker={() => setOverlay("picker")}
                    onOpenExplore={() => setOverlay("explore")}
                    onQuickStartMood={handleMoodQuickStart}
                    onStartFirstChapter={() => {
                        setOverlay(null);
                        if (firstChapterHref) router.push(firstChapterHref);
                    }}
                    liveDateLabel={liveDateLabel}
                    memberName={memberName}
                    activeMood={activeMood}
                />
            )}

            {isChapterMode && (
                <VersehubReaderView
                    chapterLabel={chapterLabel}
                    sanctuaryTitle={sanctuaryTitle}
                    memberName={memberName}
                    liveDateLabel={liveDateLabel}
                    verses={verses}
                    shouldShowChrome={shouldShowChrome}
                    readerContentPadding={readerContentPadding}
                    activeMood={activeMood}
                    chapterReflectionQuestion={chapterReflectionQuestion}
                    chapterCompletionReflection={chapterCompletionReflection}
                    chapterCompletionSaved={chapterReflectionSaved}
                    isSavingChapterReflection={isSavingChapterReflection}
                    isSharingInsight={isSharingInsight}
                    reflectionError={chapterReflectionError}
                    shareInsightError={shareInsightError}
                    hasReachedChapterEnd={hasReachedChapterEnd}
                    scrollViewportRef={scrollViewportRef}
                    reflectionDrafts={reflectionDrafts}
                    completedReflections={completedReflections}
                    onBack={() => router.push(`/versehub/${lang}`)}
                    onOpenPicker={() => setOverlay("picker")}
                    onOpenExplore={() => setOverlay("explore")}
                    onOpenReflectionsJournal={() => router.push(`/versehub/${lang}/reflections`)}
                    onOpenVerseMentor={(verse, userReflection) => openMentorForVerse(verse, userReflection)}
                    onReflectionChange={handleReflectionChange}
                    onReflectionComplete={handleReflectionComplete}
                    onCompletionReflectionChange={setChapterCompletionReflection}
                    onSaveChapterReflection={handleSaveChapterReflection}
                    onShareInsight={handleShareInsight}
                    onReachedChapterEnd={() => setHasReachedChapterEnd(true)}
                />
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
                                <section className="glass-panel rounded-[34px] p-5 md:p-7">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#91A0C7]">Verse Focus</p>
                                            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">{verseData.reference}</h2>
                                            <p className="mt-3 text-sm leading-relaxed text-foreground/60">
                                                Ayat tunggal ini tetap berada dalam ekosistem reader VerseHub, jadi Anda bisa bookmark, share, dan kembali ke chapter tanpa kehilangan konteks.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => router.push(chapterRouteFromVerse)}
                                            className="inline-flex items-center gap-2 rounded-full bg-foreground/5 dark:bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60 transition hover:bg-foreground/10"
                                        >
                                            <MessageSquareText className="h-3.5 w-3.5" />
                                            Reader
                                        </button>
                                    </div>
                                </section>

                                <section className="glass-panel group overflow-hidden rounded-[40px] p-4 md:p-5">
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

                                <section className="glass-panel overflow-hidden rounded-[40px]">
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
                            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl rounded-t-[36px] glass-panel px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom,24px))] shadow-[0_-30px_80px_rgba(15,23,42,0.18)] md:left-1/2 md:max-w-2xl md:-translate-x-1/2 md:pb-6"
                        >
                            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-foreground/10" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#91A0C7]">Deep Dive</p>
                                    <h3 className="mt-2 text-2xl font-black tracking-tight text-foreground">Masuk ke firman tanpa kehilangan rasa heningnya.</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOverlay(null)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 text-foreground/50 transition hover:bg-foreground/10 active:scale-90"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <p className="mt-4 text-sm leading-7 text-foreground/65">{activeScene.reflection}</p>

                            <div className="mt-6 grid gap-3 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setOverlay("picker")}
                                    className="rounded-[26px] bg-[var(--vh-surface)]/80 p-4 text-left ring-1 ring-[var(--vh-border)] transition hover:bg-[var(--vh-surface)] active:scale-[0.98]"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--vh-text-muted)]">Koleksi Kitab</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-[var(--vh-text-primary)]">Buka Perjanjian Lama dan Baru</p>
                                    <p className="mt-2 text-sm leading-relaxed text-[var(--vh-text-secondary)]">
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
                                    className="rounded-[26px] bg-[var(--vh-surface)]/80 p-4 text-left ring-1 ring-[var(--vh-border)] transition hover:bg-[var(--vh-surface)] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--vh-text-muted)]">Jalur Cepat</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-[var(--vh-text-primary)]">Mulai dari {firstBookLabel} 1</p>
                                    <p className="mt-2 text-sm leading-relaxed text-[var(--vh-text-secondary)]">
                                        Cocok untuk langsung masuk ke reader utilitarian tanpa kehilangan transisi dari landing.
                                    </p>
                                </button>

                                <div className="rounded-[26px] bg-[var(--vh-surface)]/80 p-4 text-left ring-1 ring-[var(--vh-border)]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--vh-text-muted)]">Lagusion Companion</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-[var(--vh-text-primary)]">Vocal dan audio-only tetap tersedia</p>
                                    <p className="mt-2 text-sm leading-relaxed text-[var(--vh-text-secondary)]">
                                        Floating audio companion akan menemani bacaan Anda dengan pilihan vocal, piano, acoustic, atau instrumental.
                                    </p>
                                </div>

                                <div className="rounded-[26px] bg-[var(--vh-surface)]/80 p-4 text-left ring-1 ring-[var(--vh-border)]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--vh-text-muted)]">Atur Atmosfer</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-[var(--vh-text-primary)]">Pilih Mood Saat Ini</p>
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
                                                    activeMood === mood.key
                                                        ? "bg-[var(--vh-accent)] text-white"
                                                        : "bg-[var(--vh-surface-elevated)] text-[var(--vh-text-secondary)] ring-1 ring-[var(--vh-border)] hover:bg-[var(--vh-surface)]"
                                                )}
                                            >
                                                {mood.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[26px] bg-[var(--vh-surface)]/80 p-4 text-left ring-1 ring-[var(--vh-border)]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--vh-text-muted)]">Mentor Internal</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-[var(--vh-text-primary)]">Scripture guide aktif saat ayat dibuka</p>
                                    <p className="mt-2 text-sm leading-relaxed text-[var(--vh-text-secondary)]">
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
                            className="relative flex h-[min(82dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-[36px] bg-[var(--vh-surface)] shadow-2xl ring-1 ring-[var(--vh-border)]"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#91A0C7]">VerseHub</p>
                                    <h3 className="mt-1 text-xl font-black tracking-tight text-[var(--vh-text-primary)]">Koleksi Kitab</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOverlay(null)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vh-surface-elevated)] text-[var(--vh-text-secondary)] transition hover:bg-[var(--vh-surface)] active:scale-90"
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
                                            tab === item
                                                ? "bg-[var(--vh-accent)] text-white"
                                                : "bg-[var(--vh-surface-elevated)] text-[var(--vh-text-secondary)] hover:bg-[var(--vh-surface)]"
                                        )}
                                    >
                                        {item === "ot" ? "Perjanjian Lama" : "Perjanjian Baru"}
                                    </button>
                                ))}
                            </div>

                            <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[1.15fr,0.85fr]">
                                <div className="min-h-0 overflow-y-auto border-b border-slate-100 p-5 text-[var(--vh-text-primary)] md:border-b-0 md:border-r">
                                    <div className="grid grid-cols-2 gap-3">
                                        {books.filter((book) => book.testament === tab).map((book) => (
                                            <button
                                                key={book.code}
                                                type="button"
                                                onClick={() => loadBookChapters(book.code)}
                                                className={cn(
                                                    "rounded-[22px] px-4 py-4 text-left text-sm font-bold transition ring-1",
                                                    activeBook === book.code
                                                        ? "bg-[var(--vh-accent)] text-white ring-[var(--vh-accent)]"
                                                        : "bg-[var(--vh-surface-elevated)] text-[var(--vh-text-secondary)] ring-[var(--vh-border)] hover:bg-[var(--vh-surface)]"
                                                )}
                                            >
                                                {book.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="min-h-0 overflow-y-auto p-5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--vh-text-muted)]">
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
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--vh-surface-elevated)] text-sm font-bold text-[var(--vh-text-primary)] transition hover:bg-[var(--vh-surface)]"
                                            >
                                                {chapter}
                                            </button>
                                        ))}
                                        {chapters.length === 0 && (
                                            <p className="text-sm text-[var(--vh-text-secondary)]">Pilih kitab terlebih dahulu untuk melihat daftar pasal.</p>
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
                    userReflection={selectedVerseReflection}
                    isAuthenticated={true}
                    onClose={() => setOverlay(null)}
                />
            )}

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
                onPlaybackStateChange={({ isPlaying, trackTitle, moodKey }) => {
                    if (isPlaying) {
                        audioPlaybackStartedAtRef.current = Date.now();
                        void trackVersehubEvent(lang, "versehub_audio_toggle", {
                            persona: "reader",
                            meta: {
                                action: "play",
                                mood: moodKey,
                                track_title: trackTitle,
                            },
                        });
                        return;
                    }

                    if (audioPlaybackStartedAtRef.current === null) {
                        return;
                    }

                    const durationSeconds = Math.max(1, Math.round((Date.now() - audioPlaybackStartedAtRef.current) / 1000));
                    audioPlaybackStartedAtRef.current = null;
                    void trackVersehubEvent(lang, "versehub_audio_toggle", {
                        persona: "reader",
                        meta: {
                            action: "stop",
                            mood: moodKey,
                            track_title: trackTitle,
                            duration_seconds: durationSeconds,
                        },
                    });
                }}
            />

            <VersehubControlCenter
                isVisible={shouldShowChrome}
                isOpen={controlCenterOpen}
                items={floatingMenuItems}
                onToggle={() => setControlCenterOpen((prev) => !prev)}
            />

            {error && isLandingMode && (
                <div className="pointer-events-none absolute left-1/2 top-24 z-40 -translate-x-1/2 px-4">
                    <div className="rounded-full bg-[var(--vh-surface)]/85 px-4 py-2 text-[11px] font-bold text-[var(--vh-text-secondary)] shadow-sm ring-1 ring-[var(--vh-border)] backdrop-blur-xl">
                        Koneksi kitab sedang tidak stabil, tetapi sanctuary VerseHub tetap siap dipakai.
                    </div>
                </div>
            )}

            {isLandingMode && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-24 bg-gradient-to-t from-[var(--vh-bg)]/80 to-transparent" />
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
