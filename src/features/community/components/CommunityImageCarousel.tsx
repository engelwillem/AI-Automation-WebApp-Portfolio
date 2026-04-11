"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type MediaAspectRatio = "9:16" | "4:5" | "1:1" | "16:9" | "og" | "auto";

type CommunityImageCarouselProps = {
  images: string[];
  altBase?: string;
  aspectRatio?: MediaAspectRatio;
  className?: string;
  ratioClassName?: string;
  viewportClassName?: string;
  uiVariant?: "default" | "archive";
  showCounter?: boolean;
};

function getRatioClass(aspectRatio: MediaAspectRatio): string {
  if (aspectRatio === "9:16") return "aspect-[9/16]";
  if (aspectRatio === "4:5") return "aspect-[4/5]";
  if (aspectRatio === "1:1") return "aspect-square";
  if (aspectRatio === "16:9") return "aspect-video";
  if (aspectRatio === "og") return "aspect-[1.91/1]";
  return "aspect-[1.08/1]";
}

function getViewportWidthClass(aspectRatio: MediaAspectRatio): string {
  if (aspectRatio === "9:16") {
    return "mx-auto w-[min(100%,15rem)] sm:w-[min(100%,16rem)] md:w-[min(100%,20rem)] lg:w-[min(100%,24rem)]";
  }
  if (aspectRatio === "1:1") {
    return "w-full max-w-[32rem] md:max-w-[36rem] lg:max-w-[40rem]";
  }
  if (aspectRatio === "og") {
    return "w-full max-w-[36rem] md:max-w-[42rem] lg:max-w-[48rem]";
  }
  return "w-full max-w-[34rem] md:max-w-[40rem] lg:max-w-[46rem]";
}

export function CommunityImageCarousel({
  images,
  altBase = "Community image",
  aspectRatio = "auto",
  className,
  ratioClassName,
  viewportClassName,
  uiVariant = "default",
  showCounter = false,
}: CommunityImageCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartIndexRef = useRef<number>(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const total = images.length;

  const ratioClass = useMemo(() => ratioClassName || getRatioClass(aspectRatio), [aspectRatio, ratioClassName]);
  const viewportWidthClass = useMemo(
    () => viewportClassName || getViewportWidthClass(aspectRatio),
    [aspectRatio, viewportClassName]
  );
  const isArchiveVariant = uiVariant === "archive";

  const updateActiveByScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const width = scroller.clientWidth || 1;
    const nextIndex = Math.round(scroller.scrollLeft / width);
    const bounded = Math.max(0, Math.min(total - 1, nextIndex));
    if (bounded !== activeIndex) {
      setActiveIndex(bounded);
    }
  }, [activeIndex, total]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const bounded = Math.max(0, Math.min(total - 1, index));
      const width = scroller.clientWidth || 1;
      scroller.scrollTo({
        left: bounded * width,
        behavior: "smooth",
      });
      setActiveIndex(bounded);
    },
    [total]
  );

  const stepInlineCarousel = useCallback(
    (direction: "prev" | "next") => {
      const delta = direction === "next" ? 1 : -1;
      scrollToIndex(activeIndex + delta);
    },
    [activeIndex, scrollToIndex]
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      touchStartXRef.current = event.touches[0]?.clientX ?? null;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      touchStartIndexRef.current = activeIndex;
    },
    [activeIndex]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const startX = touchStartXRef.current;
      const startY = touchStartYRef.current;
      const endX = event.changedTouches[0]?.clientX ?? null;
      const endY = event.changedTouches[0]?.clientY ?? null;
      touchStartXRef.current = null;
      touchStartYRef.current = null;

      if (startX === null || startY === null || endX === null || endY === null) return;

      const deltaX = startX - endX;
      const deltaY = startY - endY;

      // Preserve vertical page scroll: ignore non-horizontal gestures on the carousel.
      if (Math.abs(deltaY) >= Math.abs(deltaX) || Math.abs(deltaX) < 26) {
        return;
      }

      const direction = deltaX > 0 ? 1 : -1;
      // Limit mobile swipe movement to one slide per gesture.
      scrollToIndex(touchStartIndexRef.current + direction);
    },
    [scrollToIndex]
  );

  const openViewer = (index: number) => {
    setActiveIndex(index);
    setViewerOpen(true);
  };

  const stepViewer = (direction: "prev" | "next") => {
    setActiveIndex((prev) => {
      if (direction === "prev") return Math.max(0, prev - 1);
      return Math.min(total - 1, prev + 1);
    });
  };

  if (total === 0) return null;

  return (
    <>
      <div className={cn("relative", viewportWidthClass, className)}>
        {total === 1 ? (
          <button
            type="button"
            onClick={() => openViewer(0)}
            className={cn(
              "relative block w-full overflow-hidden bg-surface-muted",
              isArchiveVariant ? "rounded-[18px] ring-1 ring-slate-200/80" : "rounded-2xl ring-1 ring-border/60",
              ratioClass
            )}
          >
            <img src={images[0]} alt={altBase} className="h-full w-full object-cover" loading="lazy" />
          </button>
        ) : (
          <>
            <div
              ref={scrollerRef}
              onScroll={updateActiveByScroll}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={cn(
                "relative flex overflow-x-auto scroll-smooth snap-x snap-mandatory touch-pan-y bg-surface-muted scrollbar-hide [scrollbar-width:none]",
                isArchiveVariant ? "rounded-[18px] ring-1 ring-slate-200/80" : "rounded-2xl ring-1 ring-border/60",
                ratioClass
              )}
            >
              {images.map((src, idx) => (
                <button
                  key={`${src}-${idx}`}
                  type="button"
                  onClick={() => openViewer(idx)}
                  className="h-full w-full shrink-0 snap-start snap-always"
                >
                  <img
                    src={src}
                    alt={`${altBase} ${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                </button>
              ))}
            </div>

            <div className={cn("pointer-events-none absolute inset-x-0 z-10 flex justify-center gap-1.5", isArchiveVariant ? "bottom-2.5" : "bottom-3")}>
              {images.map((_, idx) => (
                <span
                  key={`dot-${idx}`}
                  className={cn(
                    isArchiveVariant ? "h-1 w-1 rounded-full transition-colors duration-200" : "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                    idx === activeIndex ? "bg-white/88" : "bg-white/48"
                  )}
                  aria-hidden="true"
                />
              ))}
            </div>

            {showCounter ? (
              <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 inline-flex items-center rounded-full border border-white/25 bg-black/35 px-2 py-1 text-[10px] font-semibold tabular-nums text-white/90 backdrop-blur-sm">
                {activeIndex + 1}/{total}
              </div>
            ) : null}

            <button
              type="button"
              aria-label="Gambar sebelumnya"
              onClick={() => stepInlineCarousel("prev")}
              disabled={activeIndex === 0}
              className={cn(
                "absolute left-1.5 top-1/2 z-20 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-black/10 text-white/72 shadow-[0_4px_14px_-10px_rgba(15,23,42,0.45)] backdrop-blur-[1px] transition-colors hover:bg-black/18 disabled:opacity-0 disabled:pointer-events-none",
                isArchiveVariant ? "h-7 w-7" : "h-8 w-8"
              )}
            >
              <ChevronLeft className={cn(isArchiveVariant ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </button>
            <button
              type="button"
              aria-label="Gambar berikutnya"
              onClick={() => stepInlineCarousel("next")}
              disabled={activeIndex === total - 1}
              className={cn(
                "absolute right-1.5 top-1/2 z-20 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-black/10 text-white/72 shadow-[0_4px_14px_-10px_rgba(15,23,42,0.45)] backdrop-blur-[1px] transition-colors hover:bg-black/18 disabled:opacity-0 disabled:pointer-events-none",
                isArchiveVariant ? "h-7 w-7" : "h-8 w-8"
              )}
            >
              <ChevronRight className={cn(isArchiveVariant ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </button>
          </>
        )}
      </div>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="h-[100dvh] max-h-none w-screen max-w-none border-none bg-black/96 p-0 text-white">
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                {activeIndex + 1} / {total}
              </span>
              <div className="h-10 w-10" aria-hidden="true" />
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
              {total > 1 ? (
                <button
                  type="button"
                  onClick={() => stepViewer("prev")}
                  disabled={activeIndex === 0}
                  className="absolute left-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-35"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}

              <img
                src={images[activeIndex]}
                alt={`${altBase} ${activeIndex + 1}`}
                className="max-h-full max-w-full object-contain"
              />

              {total > 1 ? (
                <button
                  type="button"
                  onClick={() => stepViewer("next")}
                  disabled={activeIndex === total - 1}
                  className="absolute right-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-35"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            {total > 1 ? (
              <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
                {images.map((src, idx) => (
                  <button
                    key={`viewer-thumb-${idx}`}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={cn(
                      "relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl border transition-all",
                      idx === activeIndex ? "border-white shadow-[0_0_0_1px_rgba(255,255,255,0.25)]" : "border-white/10 opacity-70"
                    )}
                  >
                    <img src={src} alt={`${altBase} thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
