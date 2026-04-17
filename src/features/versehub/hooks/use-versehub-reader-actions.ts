"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { fetchWithAppAuth } from "@/lib/app-auth-fetch";
import { buildWhatsAppShareUrl, getVerseShareUrl } from "@/lib/share";
import { ensureShareAssetReady } from "@/lib/share-assets";
import { trackVersehubEvent } from "@/features/versehub/analytics";
import type { VerseData } from "@/features/versehub/types";

interface UseVersehubReaderActionsArgs {
  bookmarked: boolean;
  chapterCompletionReflection: string;
  chapterLabel: string;
  chapterReflectionQuestion: string;
  completedReflections: Record<string, boolean>;
  initialChapterRef: string | null;
  initialVerseRef: string | null;
  isAuthenticated: boolean;
  isVerseMode: boolean;
  lang: string;
  liked: boolean;
  mode: "landing" | "chapter" | "verse";
  reflectionDrafts: Record<string, string>;
  setActiveMood: Dispatch<SetStateAction<string>>;
  setBookmarked: Dispatch<SetStateAction<boolean>>;
  setBookmarkCount: Dispatch<SetStateAction<number>>;
  setChapterCompletionReflection: Dispatch<SetStateAction<string>>;
  setChapterReflectionError: Dispatch<SetStateAction<string | null>>;
  setChapterReflectionSaved: Dispatch<SetStateAction<boolean>>;
  setCompletedReflections: Dispatch<SetStateAction<Record<string, boolean>>>;
  setHasReachedChapterEnd: Dispatch<SetStateAction<boolean>>;
  setIsSavingChapterReflection: Dispatch<SetStateAction<boolean>>;
  setIsSharingInsight: Dispatch<SetStateAction<boolean>>;
  setLiked: Dispatch<SetStateAction<boolean>>;
  setLikeCount: Dispatch<SetStateAction<number>>;
  setReflectionDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setShareInsightError: Dispatch<SetStateAction<string | null>>;
  verseBookCode: string | null;
  verseChapterNumber: number | null;
  verseData: VerseData | null;
  verseSegments: string[];
}

export function useVersehubReaderActions({
  bookmarked,
  chapterCompletionReflection,
  chapterLabel,
  chapterReflectionQuestion,
  completedReflections,
  initialChapterRef,
  initialVerseRef,
  isAuthenticated,
  isVerseMode,
  lang,
  liked,
  mode,
  reflectionDrafts,
  setActiveMood,
  setBookmarked,
  setBookmarkCount,
  setChapterCompletionReflection,
  setChapterReflectionError,
  setChapterReflectionSaved,
  setCompletedReflections,
  setHasReachedChapterEnd,
  setIsSavingChapterReflection,
  setIsSharingInsight,
  setLiked,
  setLikeCount,
  setReflectionDrafts,
  setShareInsightError,
  verseBookCode,
  verseChapterNumber,
  verseData,
  verseSegments,
}: UseVersehubReaderActionsArgs) {
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setReflectionDrafts({});
    setCompletedReflections({});
    setChapterCompletionReflection("");
    setHasReachedChapterEnd(false);
    setChapterReflectionSaved(false);
    setChapterReflectionError(null);
    setShareInsightError(null);
  }, [
    initialChapterRef,
    lang,
    mode,
    setChapterCompletionReflection,
    setChapterReflectionError,
    setChapterReflectionSaved,
    setCompletedReflections,
    setHasReachedChapterEnd,
    setReflectionDrafts,
    setShareInsightError,
  ]);

  const handleMoodQuickStart = async (moodKey: string) => {
    setActiveMood(moodKey);
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

  const handleSaveChapterReflection = async (navigate: (href: string) => void) => {
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/versehub/${lang}/${initialChapterRef ?? ""}`)}`);
      return;
    }

    if (!initialChapterRef) {
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
      const response = await fetchWithAppAuth(`/api/versehub/${lang}/reflections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

  const handleShareInsight = async (navigate: (href: string) => void) => {
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
      navigate(`/community?intent=reflection&text=${encodeURIComponent(text)}`);
    } catch {
      setShareInsightError("Belum bisa membuka Community sekarang.");
    } finally {
      setIsSharingInsight(false);
    }
  };

  const handleLike = async (navigate: (href: string) => void) => {
    if (!isVerseMode || !initialVerseRef || !verseBookCode || !verseChapterNumber) return;
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    const nextLiked = !liked;
    const previousLiked = liked;
    setLiked(nextLiked);
    setLikeCount((prev) => (nextLiked ? prev + 1 : prev - 1));

    try {
      const response = await fetchWithAppAuth(`/api/versehub/${lang}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

  const handleBookmark = async (navigate: (href: string) => void) => {
    if (!isVerseMode || !initialVerseRef || !verseBookCode || !verseChapterNumber) return;
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    const nextBookmarked = !bookmarked;
    const previousBookmarked = bookmarked;
    setBookmarked(nextBookmarked);
    setBookmarkCount((prev) => (nextBookmarked ? prev + 1 : prev - 1));

    try {
      const response = await fetchWithAppAuth(`/api/versehub/${lang}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    if (!verseData || !initialVerseRef || isSharing) return;
    let shareUrl = getVerseShareUrl(lang, initialVerseRef);

    setIsSharing(true);
    try {
      const prepared = await ensureShareAssetReady("versehub", initialVerseRef, { lang });
      if (prepared?.shareUrl) {
        shareUrl = prepared.shareUrl;
      }
    } catch {
      // non-fatal
    } finally {
      setIsSharing(false);
    }

    const shareData = {
      title: verseData.reference,
      text: `${verseData.reference}\n\n"${verseData.text}"\n\nBuka di VerseHub:`,
      url: shareUrl,
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

  const handleShareWhatsApp = async () => {
    if (!verseData || !initialVerseRef || isSharing) return;
    let shareUrl = getVerseShareUrl(lang, initialVerseRef);

    setIsSharing(true);
    try {
      const prepared = await ensureShareAssetReady("versehub", initialVerseRef, { lang });
      if (prepared?.shareUrl) {
        shareUrl = prepared.shareUrl;
      }
    } catch {
      // non-fatal
    } finally {
      setIsSharing(false);
    }

    const shareText = `${verseData.reference}\n\n"${verseData.text}"\n\nBuka di VerseHub: ${shareUrl}`;
    const waUrl = buildWhatsAppShareUrl(shareText);
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return {
    handleBookmark,
    handleLike,
    handleMoodQuickStart,
    handleReflectionChange,
    handleReflectionComplete,
    handleSaveChapterReflection,
    handleShare,
    handleShareWhatsApp,
    handleShareInsight,
    isSharing,
  };
}
