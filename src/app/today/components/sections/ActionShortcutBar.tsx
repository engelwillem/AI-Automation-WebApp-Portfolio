'use client';

import Link from 'next/link';
import { PenSquare, BookOpen, LayoutGrid, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
    {
        icon: PenSquare,
        label: 'Berbagi',
        href: '/community',
    },
    {
        icon: BookOpen,
        label: 'Baca',
        href: '/versehub/id',
    },
    {
        icon: LayoutGrid,
        label: 'Ikut',
        href: '/channels',
    },
    {
        icon: Inbox,
        label: 'Pesan',
        href: '/inbox',
    },
];

export default function ActionShortcutBar() {
    return (
        <div className="grid grid-cols-4 gap-3 py-2">
            {actions.map((action, i) => (
                <Link
                    key={i}
                    href={action.href}
                    className="group flex flex-col items-center gap-2"
                >
                    <div
                        className={cn(
                            'relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[22px]',
                            'bg-surface/70 backdrop-blur-md transition-all duration-300',
                            'ring-1 ring-border/60',
                            'shadow-[0_4px_12px_rgba(0,0,0,0.03)] group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]',
                            'group-hover:-translate-y-1 group-active:scale-90',
                        )}
                    >
                        {/* Subtle inner glow */}
                        <div className="absolute inset-0 bg-brand/0 opacity-0 transition-opacity duration-500 group-hover:opacity-10" />

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 shadow-sm ring-1 ring-brand/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                            <action.icon className="h-5 w-5 text-brand" />
                        </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
                        {action.label}
                    </span>
                </Link>
            ))}
        </div>
    );
}
