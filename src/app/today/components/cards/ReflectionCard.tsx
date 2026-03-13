'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { BookHeart, PenLine } from 'lucide-react';

export default function ReflectionCard({
    payload,
}: {
    payload: { prompt: string; prompt_id?: string | number | null };
}) {
    const href = payload.prompt_id
        ? `/journal/new?prompt_id=${encodeURIComponent(String(payload.prompt_id))}`
        : `/journal/new`;

    return (
        <Card className="relative overflow-hidden rounded-3xl border-0 bg-surface/80 shadow-soft ring-1 ring-border/60 backdrop-blur-sm">
            {/* Accent blob */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand/12 blur-2xl" />

            <CardContent className="relative p-5">
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 ring-1 ring-brand/20">
                        <BookHeart className="h-4 w-4 text-brand" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Jurnal Pribadi</span>
                </div>

                <p className="text-base font-semibold leading-snug text-foreground">
                    {payload.prompt}
                </p>

                <div className="mt-4">
                    <Button
                        asChild
                        variant="outline"
                        className="h-10 rounded-2xl border-border bg-surface-muted px-5 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-surface-elevated"
                    >
                        <Link href={href} className="inline-flex items-center gap-1.5">
                            <PenLine className="h-3.5 w-3.5" />
                            Tulis Jurnal
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
