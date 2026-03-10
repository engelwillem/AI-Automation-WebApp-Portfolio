
"use client";

import React from 'react';
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, LogIn, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full flex items-center justify-between p-8 z-50">
        <div className="tct-serif text-2xl font-normal flex items-center gap-2">
          TheChoosen<span className="text-brand font-bold">Talks</span>
        </div>
        <Button asChild variant="ghost" className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white">
          <Link href="/today" className="flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            <span>Mulai</span>
          </Link>
        </Button>
      </header>

      {/* Hero Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[540px] rounded-[44px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-10 md:p-16 shadow-premium relative z-10 text-center"
      >
        <div className="flex justify-center mb-8">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"
          >
            <Users className="w-10 h-10 text-slate-950" />
          </motion.div>
        </div>

        <div className="space-y-4 mb-10">
          <h1 className="tct-serif text-4xl md:text-6xl font-normal leading-[1.1] tracking-tight text-white">
            Bertumbuh <br /> Bersama
          </h1>
          <p className="text-white/60 text-lg leading-relaxed font-medium">
            Ruang harian Anda untuk inspirasi, doa, dan komunitas yang menguatkan.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <Button asChild size="lg" className="h-16 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-lg hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all active:scale-95 border-none cursor-pointer">
            <Link href="/today" className="flex items-center justify-center gap-3 w-full">
              <span>Buka Sekarang</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>

          <div className="flex justify-center gap-8 pt-4">
            {['Read', 'Share', 'Inspiring'].map((label) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-white/30 group">
                <div className="w-1 h-1 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Scroll Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1, duration: 1 }}
        className="fixed bottom-12 flex flex-col items-center gap-4 text-white/20"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.4em]">TheChoosenTalks v1.0</span>
      </motion.div>
    </div>
  );
}
