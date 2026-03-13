'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowRight, Heart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function SystemReflectionCard({
    id,
    payload,
    interactions,
}: {
    id?: number | string;
    payload: {
        title?: string;
        text?: string;
        content?: string;
        verseRef?: string;
        ctaText?: string;
        ctaLink?: string;
        stats?: { encouraged_count: number };
    };
    interactions?: { is_encouraged: boolean };
}) {
    const title = payload.title ?? 'Refleksi Terpilih';
    const content = payload.text ?? payload.content ?? 'Satu kutipan yang menguatkan perjalananmu hari ini.';
    const postId = id != null ? String(id) : null;

    const [encouraged, setEncouraged] = useState(interactions?.is_encouraged ?? false);
    const [count, setCount] = useState(payload.stats?.encouraged_count ?? 0);

    const toggleEncourage = () => {
        if (!postId) return;

        const prevEncouraged = encouraged;
        const prevCount = count;

        if (encouraged) {
            setCount((prev) => prev - 1);
        } else {
            setCount((prev) => prev + 1);
        }
        setEncouraged(!encouraged);

        void fetch(`/api/community/posts/${postId}/pray`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).then((response) => {
            if (!response.ok) {
                setEncouraged(prevEncouraged);
                setCount(prevCount);
            }
        }).catch(() => {
            setEncouraged(prevEncouraged);
            setCount(prevCount);
        });
    };

    return (
        <Card className="relative overflow-hidden rounded-[32px] border-0 bg-surface-dark text-surface-dark-foreground shadow-card ring-1 ring-border/50">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            <CardContent className="p-7 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 backdrop-blur-sm">
                            <Sparkles className="h-4 w-4 text-brand" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Refleksi Terpilih</span>
                    </div>

                    <button
                        onClick={toggleEncourage}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-all active:scale-95",
                                encouraged
                                    ? "bg-brand text-brand-foreground shadow-lg"
                                    : "bg-surface-elevated text-surface-foreground hover:bg-surface-muted border border-border/70"
                            )}
                    >
                        <Heart className={cn("h-3.5 w-3.5", encouraged && "fill-current")} />
                        <span className="text-[10px] font-bold">{encouraged ? 'Terberkati' : count > 0 ? count : 'Amin'}</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold leading-tight font-serif">
                        {title}
                    </h3>

                    <p className="text-sm leading-relaxed text-surface-foreground/80">
                        {content}
                    </p>

                    {payload.verseRef && (
                        <div className="inline-flex items-center gap-2 rounded-full bg-surface-elevated px-3 py-1.5 border border-border/70">
                            <span className="text-[10px] font-bold text-surface-foreground/80">{payload.verseRef}</span>
                        </div>
                    )}

                    <div className="pt-4">
                        <Link
                            href={payload.ctaLink ?? '/community'}
                            className="inline-flex items-center gap-2 text-xs font-bold text-brand transition-colors group hover:opacity-80"
                        >
                            {payload.ctaText ?? 'Bagikan pemikiranmu'}
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
