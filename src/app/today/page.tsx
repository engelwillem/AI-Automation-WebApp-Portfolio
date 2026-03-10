
"use client";

import React from 'react';
import { motion } from "framer-motion";
import { GreetingHeader } from "@/components/core/GreetingHeader";
import { ActionShortcutBar } from "@/components/core/ActionShortcutBar";
import { DailyVerseHeroCard } from "@/components/core/DailyVerseHeroCard";
import { ThrowingCard } from "@/components/core/ThrowingCard";

export default function TodayPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6 pb-28 pt-10 px-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GreetingHeader />
      </motion.div>

      <div className="space-y-8">
        <ThrowingCard index={0}>
          <ActionShortcutBar />
        </ThrowingCard>

        <ThrowingCard index={1}>
          <DailyVerseHeroCard />
        </ThrowingCard>

        <ThrowingCard index={2}>
          <div className="rounded-[44px] border border-dashed border-white/10 p-12 flex flex-col items-center justify-center text-center space-y-4 bg-white/5 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-3xl bg-brand/10 flex items-center justify-center text-brand shadow-lg">
              <span className="text-2xl">✨</span>
            </div>
            <div className="space-y-2">
              <h3 className="tct-serif text-2xl font-normal text-white">Segera Hadir</h3>
              <p className="text-sm text-white/40 max-w-[280px] mx-auto">
                Feed komunitas dan refleksi harian sedang kami siapkan untuk pertumbuhan iman Anda.
              </p>
            </div>
          </div>
        </ThrowingCard>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center mt-20 text-white/20">
        Terpilih • Terhubung • Bertumbuh
      </p>
    </div>
  );
}
