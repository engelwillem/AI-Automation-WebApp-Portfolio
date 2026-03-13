"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type QuoteCardProps = {
  quote: string;
  authorName?: string | null;
  className?: string;
  actionSlot?: ReactNode;
  compact?: boolean;
};

function stripMarkdownPrefix(text: string): string {
  const cleaned = text
    .replace(/^\s*[\s\S]*?\*\*[^*]+\*\*[:：]?\s*/u, "")
    .replace(/^["'\"「『]+/, "")
    .replace(/["'\"」』]+$/, "")
    .trim();
  return cleaned || text.trim();
}

export function QuoteCard({
  quote,
  authorName,
  className,
  actionSlot,
  compact = false,
}: QuoteCardProps) {
  const cleanQuote = stripMarkdownPrefix(quote);

  return (
    <Card className={cn("rounded-[40px] bg-surface/80 shadow-card border border-border/60 overflow-hidden transition-all duration-500 hover:shadow-2xl backdrop-blur-md", className)}>
      <CardContent className={cn("relative space-y-8 flex flex-col items-center text-center", compact ? "p-10" : "p-12 md:p-16")}>
        {/* Decorative Quote Mark Background */}
        <div className="absolute left-6 top-8 text-brand/10 select-none -z-0">
          <svg width="180" height="180" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C15.4647 8 15.017 8.44772 15.017 9V12C15.017 12.5523 14.5693 13 14.017 13H12.017V21H14.017ZM6.017 21L6.017 18C6.017 16.8954 6.91243 16 8.017 16H11.017C11.5693 16 12.017 15.5523 12.017 15V9C12.017 8.44772 11.5693 8 11.017 8H8.017C7.46472 8 7.017 8.44772 7.017 9V12C7.017 12.5523 6.5693 13 6.017 13H4.017V21H6.017Z" />
          </svg>
        </div>

        {/* Quote Text - Elegant Serif */}
        <p
          className={cn(
            "font-serif italic leading-[1.6] text-foreground relative z-10 tracking-tight",
            compact ? "text-[22px] md:text-[24px]" : "text-[28px] md:text-[34px]"
          )}
        >
          "{cleanQuote}"
        </p>

        {/* Centered Author Attribution */}
        <div className="flex items-center justify-center gap-6 w-full max-w-sm mx-auto relative z-10 opacity-80">
          <div className="h-[1.5px] w-8 bg-brand/30" />
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-muted-foreground whitespace-nowrap">
            {authorName || "Anonymous"}
          </p>
          <div className="h-[1.5px] w-8 bg-brand/30" />
        </div>

        {actionSlot ? (
          <div className="w-full pt-4 relative z-10">
            {actionSlot}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
