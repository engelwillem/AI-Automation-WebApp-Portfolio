"use client";

import type { Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Share2, X } from "lucide-react";
import AmbienceController from "@/components/versehub/AmbienceController";
import MentorPanel from "@/components/versehub/MentorPanel";
import { getVerseShareUrl } from "@/lib/share";
import { ensureShareAssetReady } from "@/lib/share-assets";
import { cn } from "@/lib/utils";
import type { Book, OverlayType, SanctuaryScene, Verse, VerseData } from "@/features/versehub/types";

interface VersehubOverlayControllerProps {
  activeBook: string | null;
  activeBookLabel: string | null;
  activeMood: string;
  activeScene: SanctuaryScene;
  audioMenuOpen: boolean;
  books: Book[];
  chapters: number[];
  error: string | null;
  firstBookLabel: string;
  firstChapterHref: string | null;
  handleAmbienceMenuOpen: (isOpen: boolean) => void;
  handlePlaybackStateChange: (args: { isPlaying: boolean; moodKey: string; trackTitle?: string }) => void;
  isLandingMode: boolean;
  lang: string;
  loadBookChapters: (bookCode: string) => Promise<void>;
  mentorMood: string;
  mentorPreviewLabel: string | null;
  mentorPreviewVerse: Verse | null;
  ogOpen: boolean;
  onNavigate: (href: string) => void;
  overlay: OverlayType;
  selectedVerseReflection: string | null;
  setActiveMood: Dispatch<SetStateAction<string>>;
  setOgOpen: Dispatch<SetStateAction<boolean>>;
  setOverlay: Dispatch<SetStateAction<OverlayType>>;
  setTab: Dispatch<SetStateAction<"ot" | "nt">>;
  shouldShowChrome: boolean;
  tab: "ot" | "nt";
  verseData: VerseData | null;
}

export function VersehubOverlayController({
  activeBook,
  activeBookLabel,
  activeMood,
  activeScene,
  audioMenuOpen,
  books,
  chapters,
  error,
  firstBookLabel,
  firstChapterHref,
  handleAmbienceMenuOpen,
  handlePlaybackStateChange,
  isLandingMode,
  lang,
  loadBookChapters,
  mentorMood,
  mentorPreviewLabel,
  mentorPreviewVerse,
  ogOpen,
  onNavigate,
  overlay,
  selectedVerseReflection,
  setActiveMood,
  setOgOpen,
  setOverlay,
  setTab,
  shouldShowChrome,
  tab,
  verseData,
}: VersehubOverlayControllerProps) {
  const [shareBusyId, setShareBusyId] = useState<string | null>(null);

  const handleShareVerse = async (slug: string) => {
    if (shareBusyId) return;
    setShareBusyId(slug);

    let url = getVerseShareUrl(lang, slug);
    const title = `VerseHub ${slug.replace(/-/g, " ").toUpperCase()}`;

    try {
      const prepared = await ensureShareAssetReady("versehub", slug, { lang });
      if (prepared?.shareUrl) {
        url = prepared.shareUrl;
      }
    } catch {
      // non-fatal
    } finally {
      setShareBusyId(null);
    }

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Ignore cancelled share action.
    }
  };

  return (
    <>
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
              className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl rounded-t-[36px] bg-white px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom,24px))] shadow-[0_-30px_80px_rgba(15,23,42,0.1)] md:left-1/2 md:max-w-2xl md:-translate-x-1/2 md:pb-6"
            >
              <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-slate-200" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">VerseHub</p>
                  <h3 className="mt-2 text-2xl tct-serif tracking-tight text-slate-800">Masuk ke firman tanpa kehilangan rasa heningnya.</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOverlay(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 active:scale-90"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-4 text-[15px] leading-relaxed text-slate-500">{activeScene.reflection}</p>

              <div className="mt-8 flex flex-col items-center gap-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#91A0C7] mb-4">Pilih Mood Saat Ini</p>
                  <div className="relative flex flex-wrap justify-center gap-2 p-1.5 rounded-[28px] bg-slate-100/60 ring-1 ring-slate-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] mb-6">
                    {[
                      { key: "hopeful", label: "Cahaya" },
                      { key: "anxious", label: "Ketenangan" },
                      { key: "weary", label: "Lelah" },
                      { key: "grateful", label: "Syukur" },
                    ].map((mood) => {
                      const isActive = activeMood === mood.key;
                      return (
                      <motion.button
                        key={mood.key}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setActiveMood(mood.key)}
                        className={cn(
                          "relative rounded-full px-5 py-2.5 text-[12px] font-bold outline-none isolate transition-colors",
                          isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeMoodPillOverlay"
                            className="absolute inset-0 z-[-1] rounded-full bg-white shadow-sm ring-1 ring-black/[0.04]"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        {mood.label}
                      </motion.button>
                    )})}
                  </div>

                  <div className="flex flex-col sm:flex-row w-full gap-3 mt-4 max-w-md">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      disabled={!firstChapterHref}
                      onClick={() => {
                        if (!firstChapterHref) return;
                        setOverlay(null);
                        onNavigate(firstChapterHref);
                      }}
                      className="flex-1 rounded-full bg-slate-900 px-6 py-[16px] text-center text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition-all hover:bg-slate-800 disabled:opacity-50"
                    >
                      Baca {firstBookLabel} 1
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setOverlay("picker")}
                      className="flex-1 rounded-full bg-slate-50 px-6 py-[16px] text-center text-[14px] font-bold text-slate-600 ring-1 ring-slate-200/60 transition-all hover:bg-slate-100"
                    >
                      Koleksi Kitab
                    </motion.button>
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

              <div className="flex gap-2 border-b border-slate-100 px-6 py-4 bg-[var(--vh-surface)] relative z-10">
                <div className="relative flex rounded-full bg-[var(--vh-surface-elevated)] p-1 ring-1 ring-[var(--vh-border)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                  {(["ot", "nt"] as const).map((item) => {
                    const isActive = tab === item;
                    return (
                      <motion.button
                        key={item}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setTab(item)}
                        className={cn(
                          "relative rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-colors outline-none isolate",
                          isActive ? "text-white" : "text-[var(--vh-text-secondary)] hover:text-[var(--vh-text-primary)]"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabPillOverlay"
                            className="absolute inset-0 z-[-1] rounded-full bg-[var(--vh-accent)] shadow-sm"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        {item === "ot" ? "Perjanjian Lama" : "Perjanjian Baru"}
                      </motion.button>
                  )})}
                </div>
              </div>

              <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[1.15fr,0.85fr]">
                <div className="min-h-0 overflow-y-auto border-b border-slate-100 p-5 text-[var(--vh-text-primary)] md:border-b-0 md:border-r">
                  <div className="grid grid-cols-2 gap-3">
                    {books.filter((book) => book.testament === tab).map((book) => (
                      <button
                        key={book.code}
                        type="button"
                        onClick={() => void loadBookChapters(book.code)}
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
                      <div
                        key={chapter}
                        className="inline-flex items-center gap-1 rounded-xl bg-[var(--vh-surface-elevated)] p-1"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeBook) return;
                            setOverlay(null);
                            onNavigate(`/versehub/${lang}/${activeBook}-${chapter}`);
                          }}
                          className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold text-[var(--vh-text-primary)] transition hover:bg-[var(--vh-surface)]"
                        >
                          {chapter}
                        </button>
                        <button
                          type="button"
                          aria-label={`Bagikan ${activeBookLabel ?? "ayat"} pasal ${chapter}`}
                          disabled={shareBusyId === `${activeBook}-${chapter}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!activeBook) return;
                            void handleShareVerse(`${activeBook}-${chapter}`);
                          }}
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--vh-text-secondary)] transition",
                            shareBusyId === `${activeBook}-${chapter}`
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-[var(--vh-surface)] hover:text-[var(--vh-text-primary)]"
                          )}
                        >
                          {shareBusyId === `${activeBook}-${chapter}` ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                              <Share2 className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <Share2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
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
          isAuthenticated
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
        hideTrigger={false}
        onMenuOpen={handleAmbienceMenuOpen}
        onPlaybackStateChange={handlePlaybackStateChange}
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
              src={verseData.og_image_url || "/og/today-share.png"}
              onError={(event) => {
                event.currentTarget.src = "/og/today-share.png";
              }}
              className="max-h-[85dvh] w-full max-w-5xl rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
