'use client';

import { useUser } from '@/firebase/auth/use-user';
import { MessageSquare, Bell } from 'lucide-react';
export default function GreetingHeader() {
    const { user } = useUser();
    const userName = user?.displayName ?? 'Friend';

    const now = new Date();
    const h = now.getHours();

    const getDayPart = () => {
        if (h < 11) return 'morning';
        if (h < 15) return 'afternoon';
        if (h < 19) return 'evening';
        return 'night';
    };

    const getGreetingEmoji = () => {
        if (h < 5) return '🌙';
        if (h < 11) return '☀️';
        if (h < 15) return '🌤️';
        if (h < 19) return '🌇';
        return '✨';
    };

    const dateLabel = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    return (
        <div className="-mx-4 px-4 pb-4 pt-2 md:mx-0 md:px-0 md:pb-0">
            <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface/80 px-6 py-5 shadow-soft backdrop-blur-xl">
                {/* Gradient accent blobs */}
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-brand/12 blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 left-10 h-20 w-20 rounded-full bg-brand/8 blur-2xl" />

                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    <span>{getGreetingEmoji()}</span>
                    <span>{dateLabel}</span>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <p className="mb-0.5 text-[12px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Good {getDayPart()}, {userName}
                        </p>
                        <h1 className="tct-serif tct-brand-gradient truncate text-[26px] font-normal leading-tight md:text-4xl">
                            Chosen People
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:text-brand">
                            <MessageSquare className="h-4.5 w-4.5" />
                        </button>
                        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:text-brand">
                            <Bell className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
