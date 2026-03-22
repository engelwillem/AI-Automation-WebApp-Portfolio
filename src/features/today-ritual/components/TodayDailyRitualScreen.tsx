'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthSession } from '@/auth/use-auth-session';
import type { TodaySessionContent } from '../content/today-session.types';
import { useTodayRitualProgress } from '../hooks/useTodayRitualProgress';
import { useMotionConfig } from '../hooks/useMotionConfig';

import TodayHeader from './TodayHeader';
import ReceiveVerse from './ReceiveVerse';
import ReflectPrompt from './ReflectPrompt';
import PrayCard from './PrayCard';
import CompleteState from './CompleteState';
import TodayShareActionBar from './TodayShareActionBar';

interface TodayDailyRitualScreenProps {
  sessionContent: TodaySessionContent;
}

export default function TodayDailyRitualScreen({ sessionContent }: TodayDailyRitualScreenProps) {
  const m = useMotionConfig();
  const { user, status: authStatus } = useAuthSession();
  const {
    isHydrating,
    hydrationMode,
    reflectionText,
    setReflectionText,
    isReflectDone,
    isPrayerCompleted,
    completeReflect,
    completePrayer,
  } = useTodayRitualProgress();
  const profileName = user?.displayName?.trim();
  const isAuthRestoring = authStatus === 'restoring';
  const audienceName =
    authStatus === 'authenticated' && profileName && profileName.length > 0
      ? profileName
      : 'Chosen People';
  const phase: 'reflection' | 'prayer' | 'completed' = isPrayerCompleted
    ? 'completed'
    : isReflectDone
      ? 'prayer'
      : 'reflection';

  // Focus targets: programmatically focusable (tabIndex={-1}),
  // not in natural tab order, only called by JS.
  const prayCardRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef<HTMLDivElement>(null);

  // Focus PrayCard when reflection is sealed — but NOT during hydration restore.
  // On restore, user is already oriented; forcing focus would be disorienting.
  useEffect(() => {
    if (isHydrating) return;
    if (isReflectDone && !isPrayerCompleted) {
      // Wait for the section animation to settle before moving focus.
      const id = window.setTimeout(() => {
        prayCardRef.current?.focus({ preventScroll: false });
      }, 700); // matches m.tx.calm duration ~1000ms + small buffer
      return () => window.clearTimeout(id);
    }
  }, [isReflectDone, isHydrating]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus CompleteState when prayer is done — same pattern.
  useEffect(() => {
    if (isHydrating) return;
    if (isPrayerCompleted) {
      const id = window.setTimeout(() => {
        completeRef.current?.focus({ preventScroll: false });
      }, 900); // matches slowTransition ~1400ms + small buffer
      return () => window.clearTimeout(id);
    }
  }, [isPrayerCompleted, isHydrating]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      data-testid="today-screen"
      className="relative min-h-screen font-sans bg-[#FAFCFF] selection:bg-black/10"
      aria-busy={isHydrating}
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/grain.png')] opacity-[0.03] mix-blend-multiply" />
      <motion.div
        className="pointer-events-none fixed inset-0 z-20 bg-gradient-to-b from-[#FAFCFF]/85 via-[#FAFCFF]/55 to-[#FAFCFF]/35 backdrop-blur-[2px]"
        initial={{ opacity: 0.88 }}
        animate={{ opacity: isHydrating ? 0.88 : 0 }}
        // Restored progress veil lifts slowly (slow) — fresh first-load lifts quickly (calm)
        transition={hydrationMode === 'restored' ? m.tx.slow : m.tx.calm}
      />

      <div
        className={`relative z-10 w-full max-w-[480px] md:max-w-[620px] mx-auto md:mx-0 min-h-screen bg-transparent ${isHydrating ? 'pointer-events-none' : ''}`}
      >
        
        <TodayHeader
          greeting={sessionContent.greeting}
          audienceName={audienceName}
          dateLabel={sessionContent.dateLabel}
          isAuthRestoring={isAuthRestoring}
        />

        <main className="pb-[env(safe-area-inset-bottom,32px)] pt-8 flex flex-col">
          
          <ReceiveVerse
            verseLabel={sessionContent.verseLabel}
            openingLine={sessionContent.openingLine}
            verseText={sessionContent.verseText}
            verseReference={sessionContent.verseReference}
          />

          <div className="mt-16 sm:mt-24 transition-all duration-700">
            <ReflectPrompt 
              prompt={sessionContent.reflectionPrompt}
              placeholder={sessionContent.reflectionPlaceholder}
              ctaLabel="Serahkan"
              sealedLabel="Telah diserahkan"
              value={reflectionText} 
              onChange={setReflectionText} 
              onContinue={completeReflect}
              isDone={isReflectDone}
            />
          </div>

          {(phase === 'prayer') && (
            <motion.div
              // tabIndex={-1}: programmatically focusable, not in tab order
              ref={prayCardRef}
              tabIndex={-1}
              // Remove focus ring from the container — the interactive button inside handles its own styling
              className="mt-16 sm:mt-24 focus:outline-none"
              variants={m.v.section}
              initial="hidden"
              animate="visible"
              transition={m.tx.calm}
            >
              <PrayCard 
                label={sessionContent.prayerLabel}
                text={sessionContent.prayerText}
                ctaLabel="Amin"
                completionLabel={sessionContent.prayerCompletionLabel}
                isCompleted={isPrayerCompleted} 
                onComplete={completePrayer}
              />
            </motion.div>
          )}

          {phase === 'completed' && (
            <motion.div
              ref={completeRef}
              tabIndex={-1}
              // focus:outline-none: the CompleteState section handles its own semantics
              className="mt-16 sm:mt-24 focus:outline-none"
              variants={m.v.section}
              initial="hidden"
              animate="visible"
              // Completion is the heaviest section reveal — slow, with a brief breath before appearing
              transition={m.reduce ? m.tx.slow : { ...m.tx.slow, delay: 0.15 }}
            >
              <CompleteState
                isCompleted={isPrayerCompleted}
                completionTitle={sessionContent.completionTitle}
                completionBody={sessionContent.completionBody}
                cueLabel={sessionContent.tomorrowCueLabel}
                cueText={sessionContent.tomorrowCueText}
              />
              <div className="px-6 pb-8">
                <TodayShareActionBar />
              </div>
            </motion.div>
          )}

        </main>
      </div>
    </div>
  );
}
