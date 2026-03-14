"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  LogIn,
  Plus,
  Sparkles,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const featureItems = [
    {
        icon: BookOpen,
        title: 'Channels',
        description: 'Pelajaran terstruktur termasuk Sabbath School untuk pendalaman iman yang sistematis.',
        href: '/channels',
        ctaLabel: 'Buka Channels',
        accent: 'violet' as const,
    },
    {
        icon: BookMarked,
        title: 'Bible',
        description: 'Alkitab reader modern dengan pelacakan perjalanan rohani dan refleksi.',
        href: '/versehub/id',
        ctaLabel: 'Buka Bible',
        accent: 'blue' as const,
    },
    {
        icon: Users,
        title: 'Community',
        description: 'Bagikan berkat, kesaksian, dan permohonan doa dalam lingkungan yang aman.',
        href: '/community',
        ctaLabel: 'Buka Community',
        accent: 'emerald' as const,
    },
    {
        icon: Sparkles,
        title: 'Mentor',
        description: 'Panduan belajar Alkitab berbasis teks dengan Scripture Guide yang transparan.',
        href: '/versehub/id',
        ctaLabel: 'Buka Mentor',
        accent: 'cyan' as const,
    },
];

function Background() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-teal-950" />
            <div className={cn(
                'absolute inset-0',
                'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)]',
                'bg-[length:24px_24px]',
                'animate-[twinkle_10s_ease-in-out_infinite]',
            )} />
            <div className="bg-grain absolute inset-0 mix-blend-overlay" />
            <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/8 blur-3xl" style={{ transform: 'translateZ(0)' }} />
            <div className="absolute bottom-[-200px] right-[-200px] h-[560px] w-[560px] rounded-full bg-blue-600/8 blur-3xl" style={{ transform: 'translateZ(0)' }} />
            <style>{`
                @keyframes twinkle { 0%,100%{opacity:.18} 50%{opacity:.32} }
                @keyframes shine { from{transform:translateX(-100%) skewX(-15deg)} to{transform:translateX(250%)  skewX(-15deg)} }
            `}</style>
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50 backdrop-blur-sm', className)}>
            {children}
        </span>
    );
}

/**
 * FeatureCard: Optimized for Stacking Performance
 * Increases opacity and refines border to prevent "ghosting" on mobile.
 */
function FeatureCard({ icon: Icon, title, description, href, ctaLabel = 'Buka', accent = 'cyan' }: {
    icon: React.ElementType;
    title: string;
    description: string;
    href: string;
    ctaLabel?: string;
    accent?: 'cyan' | 'violet' | 'emerald' | 'blue';
}) {
    const accentMap = {
        cyan:    { icon: 'bg-cyan-400/10 text-cyan-400',     glow: 'rgba(34,211,238,0.22)' },
        violet:  { icon: 'bg-violet-400/10 text-violet-400', glow: 'rgba(167,139,250,0.22)' },
        emerald: { icon: 'bg-emerald-400/10 text-emerald-400',glow: 'rgba(52,211,153,0.22)' },
        blue:    { icon: 'bg-blue-400/10 text-blue-400',     glow: 'rgba(96,165,250,0.22)' },
    }[accent];

    return (
        <article 
            className="group relative flex flex-1 flex-col overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/[0.07] p-8 backdrop-blur-lg hover:border-white/30 transition-all duration-500 shadow-premium ring-1 ring-white/5 will-change-transform" 
            style={{ transform: 'translateZ(0)' }}
        >
            {/* Hover radial glow */}
            <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: `radial-gradient(400px circle at 0% 0%, ${accentMap.glow}, transparent 60%)` }}
            />
            <div className="relative z-10 flex flex-1 flex-col">
                <div className={cn('mb-6 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg', accentMap.icon)}>
                    <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-white tracking-tight">{title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-white/60 font-medium">{description}</p>
                <div className="mt-8">
                    <Button asChild variant="outline" className="h-11 w-full rounded-2xl border-white/12 bg-white/[0.03] px-4 text-xs font-bold uppercase tracking-widest text-white/70 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/8 hover:text-white active:scale-[0.98] relative overflow-hidden group/btn">
                        <Link href={href} className="group/cta inline-flex items-center justify-center gap-2">
                            <span className="relative z-10">{ctaLabel}</span>
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1.5 relative z-10" />
                            <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shine_1.5s_infinite]" />
                        </Link>
                    </Button>
                </div>
            </div>
        </article>
    );
}

function QuickAccessLauncher() {
    const [open, setOpen] = useState(false);
    const items = [
        { href: '/channels',    label: 'Channels',  icon: BookOpen,   tone: 'from-violet-400 to-fuchsia-500' },
        { href: '/versehub/id', label: 'Bible',      icon: BookMarked, tone: 'from-blue-400 to-indigo-500' },
        { href: '/today',       label: 'Today',      icon: Sparkles,   tone: 'from-cyan-400 to-teal-500' },
        { href: '/community',   label: 'Community',  icon: Users,      tone: 'from-emerald-400 to-green-500' },
    ];

    return (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center gap-3">
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="mb-3 grid grid-cols-2 gap-2.5"
                    >
                        {items.map((item, i) => (
                            <motion.div key={item.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Link href={item.href} className="group flex w-[96px] flex-col items-center gap-2 rounded-[22px] bg-slate-900/90 px-2 py-4 ring-1 ring-white/12 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all hover:bg-slate-800/95 hover:ring-white/25 active:scale-[0.94]">
                                    <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-md flex-shrink-0 transition-transform group-hover:scale-110', item.tone)}>
                                        <item.icon className="h-5 w-5 text-slate-950" />
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 group-hover:text-white/80 transition-colors">{item.label}</span>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className={cn(
                    'relative inline-flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-white/20 transition-all duration-300 active:scale-90',
                    open ? 'bg-slate-800 text-white shadow-2xl' : 'bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-[0_15px_35px_rgba(34,211,238,0.4)]',
                )}
            >
                <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <Plus className="h-6 w-6" strokeWidth={2.5} />
                </motion.span>
            </button>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Explorer</p>
        </div>
    );
}

function HeroIconRow() {
    const items = [
        { icon: BookOpen, label: 'Read' },
        { icon: Users,    label: 'Share' },
        { icon: Sparkles, label: 'Grow' },
    ];
    return (
        <div className="flex justify-center gap-8">
            {items.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-colors hover:bg-cyan-400/10">
                        <Icon className="h-5 w-5 text-cyan-400" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/40">{label}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * StickyCardItem: Internal helper to isolate card transform logic.
 * Uses DvH (Dynamic Viewport Height) for mobile browser address bar stability.
 */
function StickyCardItem({ item, i, scrollYProgress }: { item: any, i: number, scrollYProgress: any }) {
    // Divided into 4 strict segments (0.25 each)
    const start = i * 0.25;
    const end = (i + 1) * 0.25;

    // Handoff window is 2% to minimize blur overlap
    const handoff = 0.02;

    // Visibility: Hard cut opacity at segment boundaries
    const opacity = useTransform(
        scrollYProgress,
        [start - handoff, start, end - handoff, end],
        i === 0 ? [1, 1, 1, 0] : i === 3 ? [0, 1, 1, 1] : [0, 1, 1, 0]
    );

    // Scaling: Depth effect during transition
    const scale = useTransform(
        scrollYProgress,
        [start - handoff, start, end - handoff, end],
        [0.96, 1, 1, 0.98]
    );

    // Y Axis: Lift-up transition
    const y = useTransform(
        scrollYProgress,
        [start - handoff, start, end - handoff, end],
        [30, 0, 0, -30]
    );

    // Z-Index: Current card always on top (30), past cards beneath (20), future below (10)
    const zIndex = useTransform(
        scrollYProgress,
        [start - handoff, start, end - handoff, end],
        [10, 30, 30, 20]
    );

    // Interactivity: Disable pointer events when card is not active
    const pointerEvents = useTransform(
        scrollYProgress,
        (v) => (v >= start && v < end - handoff) ? 'auto' : 'none'
    );

    return (
        <motion.div
            style={{
                position: 'absolute',
                inset: 0,
                opacity,
                scale,
                y,
                zIndex,
                pointerEvents: pointerEvents as any,
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
            }}
        >
            <FeatureCard {...item} />
        </motion.div>
    );
}

function StickyCardStage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const [activeIndex, setActiveIndex] = useState(0);
    
    // Sync dots with 0.25 segment boundaries
    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        const idx = Math.min(3, Math.floor(latest / 0.25));
        if (idx !== activeIndex) setActiveIndex(idx);
    });

    return (
        <section ref={containerRef} className="relative h-[400vh]">
            <div className="sticky top-0 h-[100dvh] flex items-center justify-center overflow-hidden">
                <div className="mx-auto w-full max-w-6xl px-5 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <Badge><Sparkles size={12} className="text-brand" /> Platform Fitur</Badge>
                        <h2 className="tct-serif text-5xl sm:text-7xl leading-[1.05] tracking-tight text-white font-bold">
                            Satu Platform,<br />
                            <span className="text-white/20">Banyak Cara</span><br />
                            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Bertumbuh.</span>
                        </h2>
                        <p className="text-xl text-white/40 max-w-md leading-relaxed font-medium">
                            Ekosistem terintegrasi yang didesain untuk membantu setiap Chosen People menemukan ritme spiritualnya.
                        </p>
                        <div className="flex items-center gap-3">
                            {featureItems.map((_, i) => (
                                <div key={i} className={cn("rounded-full transition-all duration-500", i === activeIndex ? "w-8 h-1.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "w-1.5 h-1.5 bg-white/10")} />
                            ))}
                        </div>
                    </div>

                    <div className="relative h-[420px] w-full max-w-xl mx-auto lg:mx-0">
                        {featureItems.map((item, i) => (
                            <StickyCardItem 
                                key={item.title} 
                                item={item} 
                                i={i} 
                                scrollYProgress={scrollYProgress} 
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function LandingPage() {
    return (
        <div className="relative min-h-screen text-white selection:bg-cyan-400/30 overflow-x-hidden bg-slate-950">
            <Background />

            <header className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 sm:px-8">
                <span className="tct-serif text-2xl font-bold tracking-tight text-white">
                    TheChosen<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Talks</span>
                </span>
                <Button asChild variant="ghost" className="h-11 rounded-full bg-white/5 px-6 text-xs font-bold uppercase tracking-widest text-white/70 ring-1 ring-white/10 hover:bg-white/10 hover:text-white transition-all active:scale-95">
                    <Link href="/today" className="flex items-center gap-2"><LogIn size={14} /> Login</Link>
                </Button>
            </header>

            <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-4 sm:px-8">
                <section className="flex min-h-[85dvh] flex-col items-center justify-center pb-12 pt-6">
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[540px]">
                        <div className="w-full rounded-[3.5rem] border border-white/10 bg-white/[0.03] px-10 py-14 text-center backdrop-blur-3xl shadow-[0_32px_100px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
                            <div className="space-y-10">
                                <div className="flex justify-center">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_15px_40px_rgba(34,211,238,0.25)] ring-4 ring-white/5">
                                        <Users className="h-10 w-10 text-slate-950" strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h1 className="tct-serif text-5xl font-bold tracking-tight text-white leading-[1.1]">Bertumbuh<br />Bersama</h1>
                                    <p className="text-lg text-white/50 max-w-xs mx-auto leading-relaxed font-medium">Ruang harian untuk inspirasi, doa, dan komunitas yang menguatkan.</p>
                                </div>
                                <HeroIconRow />
                                <Button asChild className="h-16 w-full rounded-[2rem] bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-sm uppercase tracking-widest shadow-2xl shadow-cyan-500/20 active:scale-[0.97] transition-all hover:brightness-110">
                                    <Link href="/today" className="flex items-center justify-center gap-3">Buka Sekarang <ArrowRight size={20} strokeWidth={3} /></Link>
                                </Button>
                            </div>
                        </div>
                        <div className="mt-12 flex flex-col items-center gap-3 text-white/20">
                            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Explore Ecosystem</span>
                            <div className="h-12 w-px bg-gradient-to-b from-cyan-400/40 to-transparent" />
                        </div>
                    </motion.div>
                </section>

                <StickyCardStage />

                <footer className="border-t border-white/5 pb-32 pt-20 text-center space-y-8">
                    <div className="inline-flex items-center gap-3 opacity-30">
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">The Chosen Talks</h2>
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    </div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">© 2026 — Built for the Chosen People by WillBerth.</p>
                    <div className="flex justify-center gap-8 text-[10px] font-black uppercase tracking-widest text-white/30">
                        <Link href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-cyan-400 transition-colors">Terms</Link>
                        <a href="https://instagram.com/willberth.channel/" target="_blank" className="hover:text-cyan-400 transition-colors">Instagram</a>
                    </div>
                </footer>
            </main>

            <QuickAccessLauncher />
        </div>
    );
}
