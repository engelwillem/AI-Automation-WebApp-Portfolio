'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpenText, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { useAuthSession } from '@/auth/use-auth-session';
import { CommunityService } from '@/services/community.service';
import type { TodaySessionContent } from '../content/today-session.types';
import type { PersonalRenunganTelemetryEvent, RenunganMatch } from '../content/personal-renungan';
import {
  buildPersonalRenungan,
  generatePersonalRenungan,
  normalizeReflectionForCache,
  preparePersonalRenungan,
} from '../content/personal-renungan';
import {
  buildSafeRenunganTelemetryMeta,
  trackRenunganTelemetryEvent,
} from '../analytics';
import { useTodayRitualProgress } from '../hooks/useTodayRitualProgress';
import { useMotionConfig } from '../hooks/useMotionConfig';
import TodayHeader from './TodayHeader';
import ReceiveVerse from './ReceiveVerse';
import ReflectPrompt from './ReflectPrompt';
import TodayShareActionBar from './TodayShareActionBar';
import { trackFunnelEvent } from '@/lib/funnel-analytics';
import { createRenunganShareToken } from '@/lib/renungan-share';

interface TodayDailyRitualScreenProps {
  sessionContent: TodaySessionContent;
  showOfflineBanner?: boolean;
}

const GENERATION_STATUS_STEPS = [
  "Membaca isi hati...",
  "Merangkai renungan...",
  "Menyusun doa penutup...",
] as const;

function buildArchiveText(
  reflectionText: string,
  meditation: string,
  verseText: string,
  verseReference: string
): string {
  return [
    "Renungan Pribadiku",
    "",
    "Isi Hati",
    reflectionText.trim(),
    "",
    "Renungan",
    meditation.trim(),
    "",
    "Ayat",
    verseText.trim(),
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
  const [bookmarkSuccessNote, setBookmarkSuccessNote] = useState<string | null>(null);
  const [activeActionText, setActiveActionText] = useState<string | null>(null);
  const [isGeneratingRenungan, setIsGeneratingRenungan] = useState(false);
  const [renunganGenerationLabel, setRenunganGenerationLabel] = useState<string>(
    GENERATION_STATUS_STEPS[0]
  );
  const [snapshotSharePath, setSnapshotSharePath] = useState<string | null>(null);
  const [preparedRenungan, setPreparedRenungan] = useState<{
    cacheKey: string;
    result: RenunganMatch;
  } | null>(null);
  const isAuthRestoring = authStatus === 'restoring';
  const memberName = authStatus === 'authenticated' && !identity.isGuest ? identity.name : null;
  const [personalRenungan, setPersonalRenungan] = useState(() =>
    buildPersonalRenungan('', sessionContent)
  );
  useEffect(() => {
    setPersonalRenungan((current) => {
      if (current?.meditation?.trim()) return current;
      return buildPersonalRenungan('', sessionContent);
    });
  }, [sessionContent]);
  const personalShareText = useMemo(
    () => `${personalRenungan.meditation} - ${personalRenungan.verseReference}`,
    [personalRenungan]
  );
  const personalSharePath = useMemo(() => {
    const meditationExcerpt = personalRenungan.meditation.replace(/\s+/g, " ").trim().slice(0, 220);
    const token = createRenunganShareToken({
      verseReference: personalRenungan.verseReference,
      verseText: personalRenungan.verseText,
      meditationExcerpt,
      theme: personalRenungan.analysis?.primary_theme,
    });
    return `/renungan/share/${token}`;
  }, [personalRenungan]);
  useEffect(() => {
    setSnapshotSharePath(null);
  }, [personalSharePath]);
  const resolvePersonalSharePath = async (): Promise<string | null> => {
    if (snapshotSharePath) return snapshotSharePath;
    try {
      const response = await fetch("/api/renungan/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          lang: "id",
          verse_reference: personalRenungan.verseReference,
          verse_text: personalRenungan.verseText,
          meditation_excerpt: personalRenungan.meditation.replace(/\s+/g, " ").trim().slice(0, 260),
          theme: personalRenungan.analysis?.primary_theme,
          ttl_hours: 72,
        }),
      });
      if (!response.ok) return personalSharePath;
      const payload = (await response.json()) as {
        data?: { share_path?: string };
      };
      const nextPath = String(payload?.data?.share_path || "").trim();
      if (!nextPath) return personalSharePath;
      setSnapshotSharePath(nextPath);
      return nextPath;
    } catch {
      return personalSharePath;
    }
  };
  const reflectionCacheKey = useMemo(() => normalizeReflectionForCache(reflectionText), [reflectionText]);
  const meditationRef = useRef<HTMLDivElement>(null);
  const verseRevealRef = useRef<HTMLDivElement>(null);
  const prepareTimerRef = useRef<number | null>(null);
  const prepareAbortRef = useRef<AbortController | null>(null);
  const generationStageTimersRef = useRef<number[]>([]);
  const doakanFlowStartedAtRef = useRef<number | null>(null);
  const pendingFinalRenderTelemetryRef = useRef(false);
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
    if (ritualStage !== 'reflect' || isReflectDone || isPrayerCompleted) return;

    if (prepareTimerRef.current) {
      window.clearTimeout(prepareTimerRef.current);
      prepareTimerRef.current = null;
    }

    if (reflectionCacheKey.length < 3) {
      setPreparedRenungan(null);
      if (prepareAbortRef.current) {
        prepareAbortRef.current.abort();
        prepareAbortRef.current = null;
      }
      return;
    }

    if (preparedRenungan?.cacheKey === reflectionCacheKey) {
      return;
    }

    prepareTimerRef.current = window.setTimeout(() => {
      if (prepareAbortRef.current) {
        prepareAbortRef.current.abort();
      }

      const controller = new AbortController();
      prepareAbortRef.current = controller;

      void preparePersonalRenungan(reflectionText, sessionContent, { signal: controller.signal })
        .then((prepared) => {
          if (!prepared) return;
          setPreparedRenungan({
            cacheKey: normalizeReflectionForCache(reflectionText),
            result: prepared,
          });
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
        });
    }, 520);

    return () => {
      if (prepareTimerRef.current) {
        window.clearTimeout(prepareTimerRef.current);
        prepareTimerRef.current = null;
      }
    };
  }, [
    isPrayerCompleted,
    isReflectDone,
    preparedRenungan?.cacheKey,
    reflectionCacheKey,
    reflectionText,
    ritualStage,
    sessionContent,
  ]);

  useEffect(() => {
    return () => {
      if (prepareAbortRef.current) {
        prepareAbortRef.current.abort();
      }
      if (prepareTimerRef.current) {
        window.clearTimeout(prepareTimerRef.current);
      }
      generationStageTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      generationStageTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (isHydrating || !isReflectDone || isPrayerCompleted) return;
    const timerId = window.setTimeout(() => {
      meditationRef.current?.focus({ preventScroll: false });
    }, 520);
    return () => window.clearTimeout(timerId);
  }, [isHydrating, isPrayerCompleted, isReflectDone]);

  useEffect(() => {
    if (!pendingFinalRenderTelemetryRef.current || !isReflectDone) return;
    const startedAt = doakanFlowStartedAtRef.current;
    const totalRenderMs = startedAt !== null ? Math.round(performance.now() - startedAt) : null;
    void trackRenunganTelemetryEvent('renungan_final_render_complete', {
      total_render_ms: totalRenderMs,
      stage_count: GENERATION_STATUS_STEPS.length,
    });
    pendingFinalRenderTelemetryRef.current = false;
  }, [isReflectDone]);

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
    setBookmarkSuccessNote(null);

    try {
      const ensuredPostId = syncedPostId
        ? syncedPostId
        : (
            await CommunityService.createPost(
              buildArchiveText(
                reflectionText,
                personalRenungan.meditation,
                personalRenungan.verseText,
                personalRenungan.verseReference
              ),
              'reflection',
              [],
              {
                bookmark_origin: 'renungan',
                visibility: 'private_renungan_archive',
                ritual_user_reflection: reflectionText.trim(),
                ritual_generated_meditation: personalRenungan.meditation,
                ritual_verse_text: personalRenungan.verseText,
                ritual_verse_reference: personalRenungan.verseReference,
                related_verses: personalRenungan.relatedVerses ?? [],
                interpretation_summary:
                  personalRenungan.analysis?.primary_theme
                    ? `Tema: ${personalRenungan.analysis.primary_theme}`
                    : undefined,
              }
            )
          ).id;

      if (!syncedPostId) {
        setSyncedPostId(ensuredPostId);
      }

      const updatedPost = await CommunityService.toggleBookmark(ensuredPostId);
      if (updatedPost.isBookmarked) {
        setBookmarkSuccessNote("Memori rohanimu tersimpan. Kamu bisa membacanya kembali di Community > Bookmarks.");
        void trackFunnelEvent('reflection_bookmark', {
          surface: 'renungan',
          meta: {
            post_id: ensuredPostId,
            source: 'today_share_action_bar',
          },
        });
      }
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

    void trackFunnelEvent('renungan_start', {
      surface: 'renungan',
      meta: {
        source: 'start_cta',
      },
    });
    setHasStarted(true);
  };

  const handleContinueReflect = async () => {
    if (isAuthRestoring) return;
    if (!isAuthenticated) {
      router.push('/login?next=/renungan');
      return;
    }

    const reflection = reflectionText.trim();
    if (!reflection || isGeneratingRenungan) return;
    const cacheKey = normalizeReflectionForCache(reflection);
    const prepared = preparedRenungan?.cacheKey === cacheKey ? preparedRenungan.result : null;
    const safeMeta = buildSafeRenunganTelemetryMeta(reflection);
    const startedAt = performance.now();
    doakanFlowStartedAtRef.current = startedAt;
    pendingFinalRenderTelemetryRef.current = true;

    void trackRenunganTelemetryEvent('renungan_doakan_clicked', {
      ...safeMeta,
      has_prepared_result: Boolean(prepared),
    });

    generationStageTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    generationStageTimersRef.current = [];
    setRenunganGenerationLabel(GENERATION_STATUS_STEPS[0]);
    setIsGeneratingRenungan(true);
    void trackRenunganTelemetryEvent('renungan_request_started', {
      ...safeMeta,
      source: prepared ? 'prepared_cache' : 'api',
    });
    void trackRenunganTelemetryEvent('renungan_first_loading_stage_shown', {
      ...safeMeta,
      stage: GENERATION_STATUS_STEPS[0],
      stage_index: 1,
      time_to_first_feedback_ms: Math.round(performance.now() - startedAt),
    });
    void trackRenunganTelemetryEvent('renungan_loading_stage_shown', {
      ...safeMeta,
      stage: GENERATION_STATUS_STEPS[0],
      stage_index: 1,
      elapsed_ms: Math.round(performance.now() - startedAt),
    });

    if (!prepared) {
      generationStageTimersRef.current.push(
        window.setTimeout(() => {
          setRenunganGenerationLabel(GENERATION_STATUS_STEPS[1]);
          void trackRenunganTelemetryEvent('renungan_loading_stage_shown', {
            ...safeMeta,
            stage: GENERATION_STATUS_STEPS[1],
            stage_index: 2,
            elapsed_ms: Math.round(performance.now() - startedAt),
          });
        }, 900)
      );
      generationStageTimersRef.current.push(
        window.setTimeout(() => {
          setRenunganGenerationLabel(GENERATION_STATUS_STEPS[2]);
          void trackRenunganTelemetryEvent('renungan_loading_stage_shown', {
            ...safeMeta,
            stage: GENERATION_STATUS_STEPS[2],
            stage_index: 3,
            elapsed_ms: Math.round(performance.now() - startedAt),
          });
        }, 1950)
      );
    }

    try {
      const handleGenerationTelemetry = (event: PersonalRenunganTelemetryEvent) => {
        if (event.type !== 'fallback_triggered') return;
        void trackRenunganTelemetryEvent('renungan_frontend_coherence_fallback_triggered', {
          ...safeMeta,
          fallback_reason: event.reason,
          request_id: event.requestId ?? null,
          pipeline_version: event.pipelineVersion ?? null,
          status_code: event.statusCode ?? null,
        });
      };

      const generated = prepared
        ? prepared
        : (await generatePersonalRenungan(reflection, sessionContent, {
            onTelemetry: handleGenerationTelemetry,
          }));
      setPersonalRenungan(generated);
      void trackRenunganTelemetryEvent('renungan_request_succeeded', {
        ...safeMeta,
        total_request_ms: Math.round(performance.now() - startedAt),
        source: prepared ? 'prepared_cache' : 'api',
      });
      completeReflect();
    } catch {
      pendingFinalRenderTelemetryRef.current = false;
      void trackRenunganTelemetryEvent('renungan_request_failed', {
        ...safeMeta,
        total_request_ms: Math.round(performance.now() - startedAt),
        api_outcome_class: prepared ? 'prepared_error' : 'api_error',
      });
    } finally {
      generationStageTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      generationStageTimersRef.current = [];
      setIsGeneratingRenungan(false);
    }
  };

  const handleCompletePrayer = () => {
    if (isAuthRestoring) return;
    if (!isAuthenticated) {
      router.push('/login?next=/renungan');
      return;
    }

    void trackFunnelEvent('renungan_complete', {
      surface: 'renungan',
      meta: {
        source: 'prayer_submit',
        has_reflection_text: reflectionText.trim().length > 0,
      },
    });
    completePrayer();
  };

  const handleContinueToVersehub = () => {
    void trackFunnelEvent('continue_to_versehub', {
      surface: 'renungan',
      meta: {
        target: '/versehub/id',
        mode: 'landing',
      },
    });
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('tct:versehub:auto-open');
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
          isAuthenticated={isAuthenticated}
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
                    className="mt-6 tct-serif break-words whitespace-pre-line text-[23px] leading-[1.7] tracking-[-0.01em] text-foreground/88"
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
                    placeholder="ketik disini..."
                    ctaLabel="Doakan"
                    sealedLabel="Telah didoakan"
                    value={activeActionText ?? ''}
                    onChange={setReflectionText}
                    onContinue={() => void handleContinueReflect()}
                    isDone={isReflectDone}
                    isSubmitting={isGeneratingRenungan}
                    submittingLabel={renunganGenerationLabel}
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
              className="mt-14 sm:mt-20 px-4 sm:px-6 pb-6 sm:pb-8 focus:outline-none"
            >
              <div className="rounded-[28px] sm:rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.94))] px-4 sm:px-6 py-6 sm:py-8 shadow-[0_32px_110px_-60px_rgba(14,116,144,0.35)] backdrop-blur-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#0284c7]">
                  Ayat untukmu hari ini
                </p>
                <blockquote className="mt-4 sm:mt-5 tct-serif text-[22px] sm:text-[25px] leading-[1.58] sm:leading-[1.65] tracking-[-0.015em] text-foreground/92">
                  “{personalRenungan.verseText}”
                </blockquote>
                <div className="mt-6 h-px w-10 bg-foreground/15" aria-hidden="true" />
                <p className="mt-4 text-[12px] font-semibold tracking-[0.18em] text-foreground/42">
                  {personalRenungan.verseReference}
                </p>

                <TodayShareActionBar
                  shareText={personalShareText}
                  sharePath={personalSharePath}
                  isAuthenticated={isAuthenticated}
                  isRestoring={isAuthRestoring}
                  resolveSharePath={resolvePersonalSharePath}
                  onBookmark={handleBookmarkReflection}
                />

                <div className="mt-4 flex items-start gap-2 text-[13px] leading-6 text-foreground/45">
                  <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-foreground/35" />
                  <p>
                    Bookmark akan menyimpan renungan ini ke tab <span className="font-semibold text-foreground/68">Bookmarks pribadimu</span> di{' '}
                    <Link
                      href="/community"
                      className="font-semibold text-[#0284c7] underline-offset-2 transition-colors hover:text-[#0ea5e9] hover:underline"
                    >
                      Community
                    </Link>
                    .
                  </p>
                </div>

                {bookmarkError ? (
                  <p className="mt-3 text-[13px] font-medium text-rose-500">{bookmarkError}</p>
                ) : null}
                {bookmarkSuccessNote ? (
                  <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-[13px] font-medium text-emerald-700">
                    {bookmarkSuccessNote}
                  </p>
                ) : null}

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleContinueToVersehub}
                    className="text-[11px] font-black uppercase tracking-[0.24em] text-[#0284c7] underline-offset-2 transition-colors hover:text-[#0ea5e9] hover:underline"
                  >
                    Lanjut ke Versehub
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </main>
      </div>
    </div>
  );
}

