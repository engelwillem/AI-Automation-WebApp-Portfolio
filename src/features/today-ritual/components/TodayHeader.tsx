'use client';

import { motion } from 'framer-motion';
import { useMotionConfig } from '../hooks/useMotionConfig';

interface TodayHeaderProps {
  greeting: string;
  audienceName?: string;
  dateLabel: string;
  isAuthRestoring?: boolean;
}

function normalizeGreetingLine(greeting: string, audienceName?: string): string {
  const rawGreeting = String(greeting || '').trim();
  if (!rawGreeting) return 'Selamat datang';

  const normalizedAudience = String(audienceName || '').trim();
  if (!normalizedAudience) return rawGreeting;

  const escapedAudience = normalizedAudience.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trailingAudiencePattern = new RegExp(`[\\s,.-]*${escapedAudience}[\\s,.-]*$`, 'i');
  const cleaned = rawGreeting.replace(trailingAudiencePattern, '').trim();

  return cleaned || rawGreeting;
}

export default function TodayHeader({
  greeting,
  audienceName,
  dateLabel,
  isAuthRestoring = false,
}: TodayHeaderProps) {
  const m = useMotionConfig();
  const greetingLine = normalizeGreetingLine(greeting, audienceName);
  const primaryGreeting = /[.!?]$/.test(greetingLine) ? greetingLine : `${greetingLine}.`;
  const identityLabel = isAuthRestoring ? '...' : audienceName ?? 'Chosen People';

  return (
    <header className="sticky top-0 z-50 w-full pt-[env(safe-area-inset-top,0px)] mix-blend-multiply">
      <div className="mx-auto w-full px-6 pt-5 pb-4">
        <motion.div
          variants={m.v.fade}
          initial="hidden"
          animate="visible"
          // Header uses calm pace — establishes presence without drama
          transition={m.tx.calm}
          className="flex max-w-[34rem] flex-col"
        >
          <span className="mb-1 text-[10px] font-bold tracking-[0.15em] text-foreground/40 uppercase">
            {dateLabel}
          </span>
          <h1 className="text-[22px] leading-[1.22] font-semibold tracking-[-0.01em] text-foreground/95 md:text-[25px]">
            {primaryGreeting}
          </h1>
          <p className="mt-1 text-[13px] leading-[1.45] font-medium tracking-[0.01em] text-foreground/60 md:text-[14px]">
            {identityLabel}
          </p>
        </motion.div>
      </div>
    </header>
  );
}
