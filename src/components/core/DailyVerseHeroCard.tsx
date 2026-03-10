"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Share2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DailyVersePayload {
  ref?: string;
  reference?: string;
  quote?: string;
  cta_label?: string;
  cta_href?: string;
}

const FALLBACK_VERSE: DailyVersePayload = {
  ref: "mzm-23-1",
  reference: "Mazmur 23:1",
  quote: "TUHAN adalah gembalaku, takkan kekurangan aku.",
  cta_label: "Baca Alkitab",
  cta_href: "/versehub/id/mzm-23-1",
};

export function DailyVerseHeroCard() {
  const [saved, setSaved] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [verse, setVerse] = useState<DailyVersePayload>(FALLBACK_VERSE);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchVerse = async () => {
      try {
        const response = await fetch("/api/today", { cache: "no-store" });
        if (!response.ok) return;

        const payload = await response.json();
        const dailyVerse = payload?.data?.dailyVerse as DailyVersePayload | undefined;
        if (!cancelled && dailyVerse?.quote) {
          setVerse({
            ref: dailyVerse.ref || FALLBACK_VERSE.ref,
            reference: dailyVerse.reference || FALLBACK_VERSE.reference,
            quote: dailyVerse.quote,
            cta_label: dailyVerse.cta_label || FALLBACK_VERSE.cta_label,
            cta_href: dailyVerse.cta_href || FALLBACK_VERSE.cta_href,
          });
        }
      } catch {
        // Keep fallback verse silently.
      }
    };

    fetchVerse();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first) return;
        if (first.isIntersecting && first.intersectionRatio >= 0.35) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    const parallax = parallaxRef.current;
    if (!card || !parallax) return;

    let rafId = 0;
    let ticking = false;
    const maxY = 14;
    const maxX = 6;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const update = () => {
      ticking = false;
      const rect = card.getBoundingClientRect();
      const viewportH = window.innerHeight || 1;
      if (rect.bottom < -200 || rect.top > viewportH + 200) return;
      const center = rect.top + rect.height / 2;
      const progress = clamp((center - viewportH / 2) / (viewportH / 2), -1, 1);
      const y = -progress * maxY;
      const x = -progress * maxX;
      parallax.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    };

    const requestTick = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick, { passive: true });

    return () => {
      window.removeEventListener("scroll", requestTick);
      window.removeEventListener("resize", requestTick);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const heroRefLabel = verse.reference || FALLBACK_VERSE.reference;
  const heroQuote = verse.quote || FALLBACK_VERSE.quote;
  const heroCtaLabel = verse.cta_label || FALLBACK_VERSE.cta_label;
  const heroRefHref = verse.cta_href || FALLBACK_VERSE.cta_href || "/versehub/id";
  const quoteSubline = "Tetap kuat, tetap berharap, dan terus berjalan bersama Tuhan.";
  const refLine = `${heroRefLabel} • Ayat hari ini`;

  const revealStateClass = isRevealed ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-[6px] blur-[1px]";
  const revealClass = (index: number) => `transition-[opacity,transform,filter] duration-500 ease-out delay-[${index * 55}ms] ${revealStateClass}`;

  return (
    <Card
      ref={cardRef}
      className="
        relative overflow-hidden
        rounded-[32px] border-0 px-5 py-7 md:p-8
        bg-white/40 dark:bg-white/5 backdrop-blur-xl
        ring-1 ring-black/[0.03] dark:ring-white/[0.08]
        shadow-[0_8px_32px_rgba(0,0,0,0.04)]
      "
    >
      <div className="absolute inset-0 opacity-20 dark:opacity-10">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-300 blur-[80px]" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-300 blur-[80px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[1px]" />
      <div
        ref={parallaxRef}
        className="pointer-events-none absolute inset-0 will-change-transform"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(70%_80%_at_50%_0%,rgba(255,255,255,0.65),rgba(255,255,255,0))]" />
      </div>

      <CardHeader className="relative z-10 p-0">
        <div className="flex justify-center">
          <div
            className={`
              mx-auto inline-flex items-center gap-2
              rounded-full bg-white/70 px-4 py-2
              text-xs font-semibold text-slate-700
              ring-1 ring-black/5 backdrop-blur
              ${revealClass(0)}
            `}
          >
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand" />
              Ayat Kekuatanku
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-0">
        <p
          className={`mt-5 text-center text-[26px] leading-[1.22] font-serif font-semibold tracking-[0.005em] text-slate-700 line-clamp-3 md:text-[36px] md:leading-[1.15] md:tracking-[0.01em] ${revealClass(1)}`}
        >
          {heroQuote}
        </p>
        <p className={`mt-3 text-center text-sm leading-relaxed text-slate-600/80 line-clamp-2 md:mt-4 md:text-base ${revealClass(2)}`}>
          {quoteSubline}
        </p>

        <div className={`mt-4 text-center md:mt-5 ${revealClass(3)}`}>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500">{refLine}</p>
        </div>

        <div className="mt-5 md:mt-6">
          <Link
            href={heroRefHref}
            className={`
              group tct-pressable relative inline-flex h-12 w-full items-center justify-center rounded-2xl overflow-hidden
              bg-gradient-to-b from-slate-800 via-slate-700 to-slate-800
              text-white text-sm font-semibold
              shadow-[0_12px_22px_rgba(15,23,42,0.22)]
              hover:brightness-[1.01] hover:shadow-[0_15px_28px_rgba(15,23,42,0.28)]
              active:translate-y-[1px] active:brightness-[0.98] active:shadow-[0_6px_14px_rgba(15,23,42,0.2)]
              transition-[transform,box-shadow,filter,background-color] duration-150 ease-out
              ${revealClass(4)}
            `}
          >
            {heroCtaLabel}
          </Link>
        </div>

        <div className={`mt-4 flex items-center justify-between md:mt-5 ${revealClass(6)}`}>
          <p className="text-xs font-semibold text-slate-500">Bagikan atau simpan</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="
                group tct-pressable relative inline-flex items-center gap-2 rounded-full overflow-hidden
                border border-white/40 bg-white/60 px-4 py-2
                text-xs font-semibold text-slate-700/90
                backdrop-blur hover:brightness-[1.01]
                active:translate-y-[1px]
              "
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>

            <button
              type="button"
              className={`group tct-pressable relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border border-white/40 backdrop-blur hover:brightness-[1.01] active:translate-y-[1px] overflow-hidden ${saved ? "bg-slate-800 text-white" : "bg-white/55 text-slate-700/90"}`}
              onClick={() => setSaved((value) => !value)}
            >
              <Bookmark className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
              Save
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
