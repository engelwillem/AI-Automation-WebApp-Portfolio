"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { VersehubLandingView } from "@/features/versehub/components/VersehubLandingView";
import { VerseFocusCard } from "@/features/versehub/components/VerseFocusCard";
import { VerseFocusHeader } from "@/features/versehub/components/VerseFocusHeader";
import { VersehubLoadingScreen } from "@/features/versehub/components/VersehubLoadingScreen";
import { VersehubOverlayController } from "@/features/versehub/components/VersehubOverlayController";
import { VersehubReaderView } from "@/features/versehub/components/VersehubReaderView";
import { useAuthSession } from "@/auth/use-auth-session";
import { useVersehubReaderActions } from "@/features/versehub/hooks/use-versehub-reader-actions";
import { useVersehubReaderChrome } from "@/features/versehub/hooks/use-versehub-reader-chrome";
import { useVersehubReaderData } from "@/features/versehub/hooks/use-versehub-reader-data";
import { landingContentPadding, readerContentPadding } from "@/features/versehub/constants";
import type { OverlayType, Verse } from "@/features/versehub/types";

interface VersehubReaderPageProps {
  lang: string;
  mode?: "landing" | "chapter" | "verse";
  initialChapterRef?: string | null;
  initialVerseRef?: string | null;
}

export function VersehubReaderPage({
  lang: initialLang,
  mode = "landing",
  initialChapterRef = null,
  initialVerseRef = null,
}: VersehubReaderPageProps) {
  const router = useRouter();
  const { identity, status: authStatus, isAuthenticated } = useAuthSession();
  const lang = initialLang || "id";
  const [overlay, setOverlay] = useState<OverlayType>(null);
  const [ogOpen, setOgOpen] = useState(false);
  const [reflectionDrafts, setReflectionDrafts] = useState<Record<string, string>>({});
  const [completedReflections, setCompletedReflections] = useState<Record<string, boolean>>({});
  const [chapterCompletionReflection, setChapterCompletionReflection] = useState("");
  const [hasReachedChapterEnd, setHasReachedChapterEnd] = useState(false);
  const [isSavingChapterReflection, setIsSavingChapterReflection] = useState(false);
  const [isSharingInsight, setIsSharingInsight] = useState(false);

  const {
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
    firstBookLabel,
    firstChapterHref,
    isChapterMode,
    isLandingMode,
    isVerseMode,
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
  } = useVersehubReaderData({
    authStatus,
    identity,
    initialChapterRef,
    initialVerseRef,
    isAuthenticated,
    lang,
    mode,
    overlay,
    setOverlay,
  });

  const {
    audioMenuOpen,
    handleAmbienceMenuOpen,
    handlePlaybackStateChange,
    scrollViewportRef,
    shouldShowChrome,
  } = useVersehubReaderChrome({
    activeMood,
    isLandingMode,
    lang,
    ogOpen,
    overlay,
    setOverlay,
  });

  const {
    handleBookmark,
    handleLike,
    handleMoodQuickStart,
    handleReflectionChange,
    handleReflectionComplete,
    handleSaveChapterReflection,
    handleShare,
    handleShareInsight,
  } = useVersehubReaderActions({
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
    setOverlay,
    setReflectionDrafts,
    setShareInsightError,
    verseBookCode,
    verseChapterNumber,
    verseData,
    verseSegments,
  });



  const openMentorForVerse = (verse: Verse | null, userReflection?: string | null) => {
    if (!verse) return;
    setSelectedVerse(verse);
    setSelectedVerseReflection(userReflection ?? null);
    setOverlay("mentor");
  };

  if (loading) {
    return <VersehubLoadingScreen label="Menyiapkan ruang doa VerseHub..." />;
  }

  if (error && isChapterMode) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAFCFF] px-6 py-16 text-center text-slate-800">
        <div className="mx-auto max-w-md rounded-[32px] bg-white px-6 py-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Pasal tidak ditemukan</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Data pasal belum berhasil dimuat. Kembali ke landing VerseHub untuk memilih kitab lain.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/versehub/${lang}`)}
            className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-[14px] font-semibold text-white shadow-soft transition-all duration-300 hover:bg-slate-800 active:scale-[0.98]"
          >
            Kembali ke VerseHub
          </button>
        </div>
      </div>
    );
  }

  if (error && isVerseMode) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAFCFF] px-6 py-16 text-center text-slate-800">
        <div className="mx-auto max-w-md rounded-[32px] bg-white px-6 py-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Ayat tidak ditemukan</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Ayat yang Anda cari belum berhasil dimuat. Anda masih bisa kembali ke chapter reader tanpa kehilangan suasana VerseHub.
          </p>
          <button
            type="button"
            onClick={() => router.push(chapterRouteFromVerse)}
            className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-[14px] font-semibold text-white shadow-soft transition-all duration-300 hover:bg-slate-800 active:scale-[0.98]"
          >
            Kembali ke Reader
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[#FAFCFF] text-slate-800 selection:bg-sky-100",
    )}>
      {!isLandingMode ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-full bg-[#FAFCFF]" />
          <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-sky-50 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-white blur-[100px]" />
          <div className="absolute left-[12%] top-[28%] h-56 w-56 rounded-full bg-sky-50/50 blur-3xl" />
        </div>
      ) : null}

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
          onSaveChapterReflection={() => handleSaveChapterReflection((href) => router.push(href))}
          onShareInsight={() => handleShareInsight((href) => router.push(href))}
          onReachedChapterEnd={() => setHasReachedChapterEnd(true)}
        />
      )}

      {isVerseMode && verseData && (
        <>
          <VerseFocusHeader
            chapterRouteFromVerse={chapterRouteFromVerse}
            liveDateLabel={liveDateLabel}
            memberName={memberName}
            onBack={() => router.push(chapterRouteFromVerse)}
            sanctuaryTitle={sanctuaryTitle}
            shouldShowChrome={shouldShowChrome}
          />

          <main ref={(node) => { scrollViewportRef.current = node; }} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto max-w-3xl pb-[calc(180px+env(safe-area-inset-bottom,24px))]">
              <VerseFocusCard
                bookmarked={bookmarked}
                bookmarkCount={bookmarkCount}
                chapterRouteFromVerse={chapterRouteFromVerse}
                liked={liked}
                likeCount={likeCount}
                onBackToReader={() => router.push(chapterRouteFromVerse)}
                onBookmark={() => void handleBookmark((href) => router.push(href))}
                onLike={() => void handleLike((href) => router.push(href))}
                onOpenImage={() => setOgOpen(true)}
                onShare={() => void handleShare()}
                verseData={verseData}
              />
            </div>
          </main>
        </>
      )}

      <VersehubOverlayController
        activeBook={activeBook}
        activeBookLabel={activeBookLabel}
        activeMood={activeMood}
        activeScene={activeScene}
        audioMenuOpen={audioMenuOpen}
        books={books}
        chapters={chapters}
        error={error}
        firstBookLabel={firstBookLabel}
        firstChapterHref={firstChapterHref}
        handleAmbienceMenuOpen={handleAmbienceMenuOpen}
        handlePlaybackStateChange={handlePlaybackStateChange}
        isLandingMode={isLandingMode}
        lang={lang}
        loadBookChapters={loadBookChapters}
        mentorMood={mentorMood}
        mentorPreviewLabel={mentorPreviewLabel}
        mentorPreviewVerse={mentorPreviewVerse}
        ogOpen={ogOpen}
        onNavigate={(href) => router.push(href)}
        overlay={overlay}
        selectedVerseReflection={selectedVerseReflection}
        setActiveMood={setActiveMood}
        setOgOpen={setOgOpen}
        setOverlay={setOverlay}
        setTab={setTab}
        shouldShowChrome={shouldShowChrome}
        tab={tab}
        verseData={verseData}
      />
    </div>
  );
}
