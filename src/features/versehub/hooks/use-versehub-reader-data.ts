"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { buildAppAuthHeaders, fetchWithAppAuth } from "@/lib/app-auth-fetch";
import { useMutationRefreshTick } from "@/hooks/use-mutation-refresh-tick";
import {
  useLastVisitedVersehubChapter,
  usePersistedVersehubMood,
  useVersehubAutoOpenExplore,
} from "@/features/versehub/hooks/use-versehub-persistence";
import { buildTodayDateLabel, SANCTUARY_SCENES } from "@/features/versehub/constants";
import type {
  Book,
  ChapterPayload,
  OverlayType,
  SanctuaryScene,
  Verse,
  VerseData,
} from "@/features/versehub/types";

const DEFAULT_CHAPTER_REFLECTION_QUESTION = "Apa satu hal yang sedang Tuhan tekankan di hatimu dari bacaan ini?";

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

interface UseVersehubReaderDataArgs {
  authStatus: "restoring" | "guest" | "authenticated";
  identity: {
    isGuest: boolean;
    name: string;
  };
  initialChapterRef: string | null;
  initialVerseRef: string | null;
  isAuthenticated: boolean;
  lang: string;
  mode: "landing" | "chapter" | "verse";
  overlay: OverlayType;
  setOverlay: Dispatch<SetStateAction<OverlayType>>;
}

export function useVersehubReaderData({
  authStatus,
  identity,
  initialChapterRef,
  initialVerseRef,
  isAuthenticated,
  lang,
  mode,
  overlay,
  setOverlay,
}: UseVersehubReaderDataArgs) {
  const refreshTick = useMutationRefreshTick(["/api/versehub/"]);
  const isLandingMode = mode === "landing";
  const isChapterMode = mode === "chapter";
  const isVerseMode = mode === "verse";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [lastVisitedChapterHref, setLastVisitedChapterHref] = useState<string | null>(null);
  const [lastVisitedChapterLabel, setLastVisitedChapterLabel] = useState<string | null>(null);
  const [chapterReflectionQuestion, setChapterReflectionQuestion] = useState(DEFAULT_CHAPTER_REFLECTION_QUESTION);
  const [chapterReflectionSaved, setChapterReflectionSaved] = useState(false);
  const [chapterReflectionError, setChapterReflectionError] = useState<string | null>(null);
  const [shareInsightError, setShareInsightError] = useState<string | null>(null);

  const activeScene = useMemo<SanctuaryScene>(() => {
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
  const mentorMood = activeMood;
  const memberName = authStatus === "authenticated" && !identity.isGuest ? identity.name : null;
  const liveDateLabel = useMemo(() => buildTodayDateLabel(), []);
  const sanctuaryTitle = isLandingMode ? "VerseHub" : isVerseMode ? verseData?.reference ?? chapterLabel : chapterLabel;

  usePersistedVersehubMood(
    activeMood,
    setActiveMood,
    setLastVisitedChapterHref,
    setLastVisitedChapterLabel
  );

  useEffect(() => {
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
          setChapterReflectionQuestion(chapterPayload.reflection_question ?? DEFAULT_CHAPTER_REFLECTION_QUESTION);
          setSelectedVerse(nextVerses[0] ?? null);
          setVerseData(null);
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
          setChapterReflectionQuestion(chapterData?.reflection_question ?? DEFAULT_CHAPTER_REFLECTION_QUESTION);
          setSelectedVerse(nextSelectedVerse);
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
          setChapterReflectionQuestion(DEFAULT_CHAPTER_REFLECTION_QUESTION);
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
    refreshTick,
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
    if (!isAuthenticated || !isVerseMode || !initialVerseRef || !verseBookCode || !verseChapterNumber) {
      return;
    }

    fetchWithAppAuth(`/api/versehub/${lang}/actions?book=${verseBookCode}&chapter=${verseChapterNumber}`, {
      headers: buildAppAuthHeaders(),
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
  }, [refreshTick, initialVerseRef, isAuthenticated, isVerseMode, lang, verseBookCode, verseChapterNumber]);

  useLastVisitedVersehubChapter({
    activeBook,
    chapterLabel,
    chapterRouteFromVerse,
    initialChapterRef,
    isChapterMode,
    isVerseMode,
    lang,
    setLastVisitedChapterHref,
    setLastVisitedChapterLabel,
  });

  useVersehubAutoOpenExplore(isLandingMode, setOverlay);

  const loadBookChapters = async (bookCode: string) => {
    setActiveBook(bookCode);
    try {
      const payload = await fetchJsonWithTimeout(`/api/versehub/${lang}/chapters?book=${encodeURIComponent(bookCode)}`);
      setChapters(Array.isArray(payload?.chapters) ? payload.chapters : []);
    } catch {
      setChapters([]);
    }
  };

  return {
    activeBook,
    activeBookLabel,
    activeMood,
    activeScene,
    bookmarked,
    bookmarkCount,
    books,
    chapterLabel,
    chapterReflectionError,
    chapterReflectionQuestion,
    chapterReflectionSaved,
    chapterRouteFromVerse,
    chapters,
    error,
    firstBookCode,
    firstBookLabel,
    firstChapterHref,
    isChapterMode,
    isLandingMode,
    isVerseMode,
    lang,
    lastVisitedChapterHref,
    lastVisitedChapterLabel,
    liked,
    likeCount,
    liveDateLabel,
    loadBookChapters,
    loading,
    memberName,
    mentorMood,
    mentorPreviewLabel,
    mentorPreviewVerse,
    sanctuaryTitle,
    selectedVerse,
    selectedVerseReflection,
    setActiveMood,
    setBookmarked,
    setBookmarkCount,
    setChapterReflectionError,
    setChapterReflectionSaved,
    setLiked,
    setLikeCount,
    setSelectedVerse,
    setSelectedVerseReflection,
    setShareInsightError,
    setTab,
    shareInsightError,
    tab,
    verseBookCode,
    verseChapterNumber,
    verseData,
    verseSegments,
    verses,
  };
}
