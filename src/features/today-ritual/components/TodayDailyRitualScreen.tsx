'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpenText, Bookmark } from 'lucide-react';
import { useAuthSession } from '@/auth/use-auth-session';
import { CommunityService } from '@/services/community.service';
import type { TodaySessionContent } from '../content/today-session.types';
import { buildPersonalRenungan } from '../content/personal-renungan';
import { useTodayRitualProgress } from '../hooks/useTodayRitualProgress';
import { useMotionConfig } from '../hooks/useMotionConfig';
import TodayHeader from './TodayHeader';
import ReceiveVerse from './ReceiveVerse';
import ReflectPrompt from './ReflectPrompt';
import TodayShareActionBar from './TodayShareActionBar';

interface TodayDailyRitualScreenProps {
  sessionContent: TodaySessionContent;
  showOfflineBanner?: boolean;
}

function buildArchiveText(reflectionText: string, meditation: string, verseReference: string): string {
  return [
    reflectionText.trim(),
    '',
    meditation.trim(),
    '',
    verseReference.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}

export default function TodayDailyRitualScreen({
  sessionContent,
  showOfflineBanner = false,
}: TodayDailyRitualScreenProps) {
  const router = useRouter();
  const m = useMotionConfig();
  const { identity, status: authStatus, isAuthenticated } = useAuthSession();
  const ritualSessionScope =
    authStatus === 'authenticated'
      ? `member:${String(identity.email || identity.name || 'member').trim().toLowerCase()}`
      : 'guest';
  const {
    isHydrating,
    hydrationMode,
    reflectionText,
    setReflectionText,
    isReflectDone,
    isPrayerCompleted,
    completeReflect,
    completePrayer,
  } = useTodayRitualProgress(ritualSessionScope);
  const [hasStarted, setHasStarted] = useState(false);
  const [syncedPostId, setSyncedPostId] = useState<string | null>(null);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [activeActionText, setActiveActionText] = useState<string | null>(null);
  const isAuthRestoring = authStatus === 'restoring';
  const memberName = authStatus === 'authenticated' && !identity.isGuest ? identity.name : null;
  const personalRenungan = useMemo(
    () => buildPersonalRenungan(reflectionText, sessionContent),
    [reflectionText, sessionContent]
  );
  const personalShareText = useMemo(
    () => `${personalRenungan.meditation} — ${personalRenungan.verseReference}`,
    [personalRenungan]
  );
  const meditationRef = useRef<HTMLDivElement>(null);
  const verseRevealRef = useRef<HTMLDivElement>(null);
  const ritualStage = useMemo(() => {
    if (isPrayerCompleted) return 'complete';
    if (isReflectDone) return 'meditation';
    if (hasStarted) return 'reflect';
    return 'intro';
  }, [hasStarted, isPrayerCompleted, isReflectDone]);

  useEffect(() => {
    if (reflectionText.trim().length > 0 || isReflectDone || isPrayerCompleted) {
      setHasStarted(true);
    }
  }, [reflectionText, isReflectDone, isPrayerCompleted]);

  useEffect(() => {
    if (ritualStage === 'reflect') {
      setActiveActionText(reflectionText);
      return;
    }
    setActiveActionText(null);
  }, [reflectionText, ritualStage]);

  useEffect(() => {
    if (isHydrating || !isReflectDone || isPrayerCompleted) return;
    const timerId = window.setTimeout(() => {
      meditationRef.current?.focus({ preventScroll: false });
    }, 520);
    return () => window.clearTimeout(timerId);
  }, [isHydrating, isPrayerCompleted, isReflectDone]);

  useEffect(() => {
    if (isHydrating || !isPrayerCompleted) return;
    const timerId = window.setTimeout(() => {
      verseRevealRef.current?.focus({ preventScroll: false });
    }, 720);
    return () => window.clearTimeout(timerId);
  }, [isHydrating, isPrayerCompleted]);

  const handleBookmarkReflection = async () => {
    if (!isAuthenticated) {
      setBookmarkError('Login diperlukan untuk menyimpan ke Bookmarks komunitas.');
      return false;
    }

    setBookmarkError(null);

    try {
      const ensuredPostId = syncedPostId
        ? syncedPostId
        : (
            await CommunityService.createPost(
              buildArchiveText(
                reflectionText,
                personalRenungan.meditation,
                personalRenungan.verseReference
              ),
              'reflection'
            )
          ).id;

      if (!syncedPostId) {
        setSyncedPostId(ensuredPostId);
      }

      const updatedPost = await CommunityService.toggleBookmark(ensuredPostId);
      return updatedPost.isBookmarked;
    } catch {
      setBookmarkError('Belum bisa menyimpan renunganmu ke Bookmarks sekarang.');
      return false;
    }
  };

  const handleStartRenungan = () => {
    if (isAuthRestoring) return;
    if (!isAuthenticated) {
      router.push('/login?next=/renungan');
      return;
    }

    setHasStarted(true);
  };

  const handleContinueReflect = () => {
    if (isAuthRestoring) return;
    if (!isAuthenticated) {
      router.push('/login?next=/renungan');
      return;
    }

    completeReflect();
  };

  const handleCompletePrayer = () => {
    if (isAuthRestoring) return;
    if (!isAuthenticated) {
      router.push('/login?next=/renungan');
      return;
    }

    completePrayer();
  };

  const handleContinueToVersehub = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('tct:versehub:auto-open', 'explore');
    }
    router.push('/versehub/id');
  };

  return (
    <div
      data-testid="today-screen"
      className="relative min-h-screen font-sans bg-[#FAFCFF] selection:bg-black/10"
      aria-busy={isHydrating}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.12) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />
      <motion.div
        className="pointer-events-none fixed inset-0 z-20 bg-gradient-to-b from-[#FAFCFF]/85 via-[#FAFCFF]/55 to-[#FAFCFF]/35 backdrop-blur-[2px]"
        initial={{ opacity: 0.88 }}
        animate={{ opacity: isHydrating ? 0.88 : 0 }}
        transition={hydrationMode === 'restored' ? m.tx.slow : m.tx.calm}
      />

      <div
        className={`relative z-10 w-full max-w-[480px] md:max-w-[620px] mx-auto md:mx-0 min-h-screen bg-transparent ${isHydrating ? 'pointer-events-none' : ''}`}
      >
        <TodayHeader
          greeting="Selamat datang kembali,"
          dateLabel={sessionContent.dateLabel}
          memberName={memberName}
          isAuthRestoring={isAuthRestoring}
        />

        {showOfflineBanner ? (
          <div className="px-6 pt-2">
            <div className="rounded-full border border-sky-200/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(239,246,255,0.72))] px-4 py-2 text-[12px] font-medium text-slate-600 shadow-[0_12px_30px_-24px_rgba(14,165,233,0.35)] backdrop-blur-xl">
              Menampilkan renungan offline. Sambungkan internet untuk pembaruan terbaru.
            </div>
          </div>
        ) : null}

        <main className="pb-[env(safe-area-inset-bottom,32px)] pt-8 flex flex-col">
          <AnimatePresence mode="wait">
            {!isReflectDone ? (
              <motion.div
                key="default-verse"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, transition: m.tx.micro }}
                transition={m.tx.calm}
              >
                <ReceiveVerse
                  verseLabel={sessionContent.verseLabel}
                  openingLine={sessionContent.openingLine}
                  verseText={sessionContent.verseText}
                  verseReference={sessionContent.verseReference}
                />
              </motion.div>
            ) : (
              <motion.section
                key="personal-meditation"
                ref={meditationRef}
                tabIndex={-1}
                initial={{ opacity: 0, y: 22, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
                transition={m.reduce ? m.tx.calm : { ...m.tx.calm, duration: 0.82 }}
                className="mt-6 px-6 focus:outline-none"
              >
                <div className="rounded-[34px] border border-white/70 bg-white/92 px-6 py-7 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.26)] backdrop-blur-xl">
                  <div className="flex items-center gap-3 text-[#0f172a]/55">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7f4ff] text-[#0ea5e9]">
                      <BookOpenText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#0ea5e9]">
                        Renungan Pribadi
                      </p>
                      <p className="mt-1 text-[13px] font-medium text-foreground/45">
                        Disusun dari isi hati yang baru saja kamu doakan.
                      </p>
                    </div>
                  </div>

                  <motion.p
                    className="mt-6 tct-serif text-[23px] leading-[1.7] tracking-[-0.01em] text-foreground/88"
                    initial={{ opacity: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={m.reduce ? m.tx.calm : { ...m.tx.slow, delay: 0.08 }}
                  >
                    {personalRenungan.meditation}
                  </motion.p>

                  <div className="mt-8 flex justify-start">
                    {!isPrayerCompleted && (
                      <motion.button
                        data-testid="today-prayer-submit"
                        onClick={handleCompletePrayer}
                        className="group inline-flex items-center rounded-full bg-[#0f172a] px-7 py-3 text-[15px] font-semibold text-white shadow-[0_18px_36px_-18px_rgba(15,23,42,0.55)] transition-all duration-400 ease-out hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(14,165,233,0.78))] hover:shadow-[0_24px_48px_-24px_rgba(14,165,233,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/45 active:scale-[0.98]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={m.reduce ? m.tx.base : { ...m.tx.base, delay: 0.22 }}
                      >
                        <span className="transition-transform duration-400 ease-out group-hover:translate-x-[1px]">
                          Amin
                        </span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="mt-16 sm:mt-24 px-6">
            <AnimatePresence mode="wait" initial={false}>
              {ritualStage === 'intro' ? (
                <motion.button
                  key="ritual-intro"
                  type="button"
                  onClick={handleStartRenungan}
                  disabled={isAuthRestoring}
                  className="group inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/92 px-6 py-4 text-[15px] font-semibold text-[#0f172a] shadow-[0_22px_60px_-34px_rgba(15,23,42,0.32)] backdrop-blur-xl transition-all duration-400 ease-out hover:-translate-y-[1px] hover:border-sky-300/45 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.84))] hover:shadow-[0_26px_68px_-36px_rgba(14,165,233,0.28)] focus-visible:border-sky-300/45 focus-visible:bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.84))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/45 active:scale-[0.985]"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: m.tx.micro }}
                  transition={m.tx.calm}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-[#0284c7] transition-all duration-400 ease-out group-hover:translate-x-[1px] group-hover:bg-[#e0f2fe] group-hover:shadow-[0_10px_24px_-18px_rgba(14,165,233,0.45)]">
                    <BookOpenText className="h-4 w-4" />
                  </span>
                  <span className="transition-transform duration-400 ease-out group-hover:translate-x-[1.5px]">
                    Mulai Renungan
                  </span>
                </motion.button>
              ) : null}

              {ritualStage === 'reflect' ? (
                <motion.div
                  key="ritual-reflect"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: m.tx.micro }}
                  transition={m.tx.calm}
                >
                  <ReflectPrompt
                    prompt="Apa satu hal yang ingin kamu serahkan kepada Tuhan hari ini?"
                    placeholder="Tulis refleksi singkatmu di sini..."
                    ctaLabel="Doakan"
                    sealedLabel="Telah didoakan"
                    value={activeActionText ?? ''}
                    onChange={setReflectionText}
                    onContinue={handleContinueReflect}
                    isDone={isReflectDone}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

          {isPrayerCompleted && (
            <motion.section
              ref={verseRevealRef}
              tabIndex={-1}
              initial={{ opacity: 0, y: 22, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={m.reduce ? m.tx.calm : { ...m.tx.slow, delay: 0.08 }}
              className="mt-16 sm:mt-24 px-6 pb-8 focus:outline-none"
            >
              <div className="rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.94))] px-6 py-8 shadow-[0_32px_110px_-60px_rgba(14,116,144,0.35)] backdrop-blur-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#0284c7]">
                  Ayat untukmu hari ini
                </p>
                <blockquote className="mt-5 tct-serif text-[25px] leading-[1.65] tracking-[-0.015em] text-foreground/92">
                  “{personalRenungan.verseText}”
                </blockquote>
                <div className="mt-6 h-px w-10 bg-foreground/15" aria-hidden="true" />
                <p className="mt-4 text-[12px] font-semibold tracking-[0.18em] text-foreground/42">
                  {personalRenungan.verseReference}
                </p>

                <TodayShareActionBar
                  shareText={personalShareText}
                  onBookmark={handleBookmarkReflection}
                />

                <div className="mt-4 flex items-start gap-2 text-[13px] leading-6 text-foreground/45">
                  <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-foreground/35" />
                  <p>
                    Bookmark akan menyimpan renungan ini ke kategori <span className="font-semibold text-foreground/68">Arsip</span> dan
                    tab <span className="font-semibold text-foreground/68">Bookmarks</span> di Community.
                  </p>
                </div>

                {bookmarkError ? (
                  <p className="mt-3 text-[13px] font-medium text-rose-500">{bookmarkError}</p>
                ) : null}

                <div className="mt-6 rounded-[24px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-30px_rgba(14,165,233,0.35)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0284c7]">
                    Langkah Berikutnya
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-foreground/70">
                    Misi selesai. Kalau ingin melangkah lebih jauh, VerseHub akan langsung membukakan mode Explore agar kamu bisa masuk ke kitab atau pasal berikutnya dengan tenang.
                  </p>
                  <motion.button
                    type="button"
                    onClick={handleContinueToVersehub}
                    className="mt-4 inline-flex items-center rounded-full bg-[#0f172a] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_18px_36px_-18px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(14,165,233,0.78))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/45 active:scale-[0.98]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={m.reduce ? m.tx.base : { ...m.tx.base, delay: 0.16 }}
                  >
                    Lanjut ke VerseHub Explore
                  </motion.button>
                </div>
              </div>
            </motion.section>
          )}
        </main>
      </div>
    </div>
  );
}
