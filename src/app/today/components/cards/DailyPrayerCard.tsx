'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function DailyPrayerCard({
    payload,
}: {
    payload?: { prayer?: string; text?: string; aminCount?: number; response_count?: number };
}) {
    const [saidAmin, setSaidAmin] = useState(false);
    const prayer = payload?.prayer ?? payload?.text ?? "Tuhan, sertai langkah kami hari ini.";
    const [count, setCount] = useState(payload?.aminCount ?? payload?.response_count ?? 28);

    const toggleAmin = () => {
        if (saidAmin) {
            setCount((prev) => prev - 1);
        } else {
            setCount((prev) => prev + 1);
        }
        setSaidAmin(!saidAmin);
    };

    return (
        <Card className="overflow-hidden rounded-[32px] border-0 bg-surface/80 shadow-soft ring-1 ring-border/60 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8">
                <div className="flex flex-col items-center space-y-5 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
                        <Sparkles className="h-6 w-6" />
                    </div>

                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Doa Hari Ini</span>
                        <p className="text-lg font-medium italic leading-relaxed text-foreground md:text-xl">
                            "{prayer}"
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <Button
                            onClick={toggleAmin}
                            className={cn(
                                'h-12 rounded-2xl px-8 font-bold shadow-lg transition-all active:scale-[0.98]',
                                saidAmin
                                    ? 'bg-brand text-brand-foreground hover:opacity-90'
                                    : 'bg-surface text-brand ring-1 ring-border hover:bg-surface-elevated'
                            )}
                        >
                            <span className="mr-2">🙌</span>
                            {saidAmin ? 'Kami Mengamini' : 'Sebut AMIN'}
                        </Button>

                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            {count} Chosen People Mengamini
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
