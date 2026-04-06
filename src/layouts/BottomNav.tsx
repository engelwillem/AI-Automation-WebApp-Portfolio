'use client';

import { cn } from '@/lib/utils';
import AppIcon from '@/components/system/AppIcon';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
    id: string;
    icon: LucideIcon;
    label: string;
};

type FloatingBottomNavProps = {
    items: NavItem[];
    activeId: string;
    onChange?: (id: string) => void;
    onPrefetch?: (id: string) => void;
    className?: string;
};

function triggerHaptic() {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(8);
        }
    } catch {
        // ignore unsupported platform errors
    }
}

export default function FloatingBottomNav({
    items,
    activeId,
    onChange,
    onPrefetch,
    className,
}: FloatingBottomNavProps) {
    if (items.length === 0) return null;

    const gridTemplateColumns =
        items.length > 0 ? `repeat(${items.length}, minmax(0, 1fr))` : undefined;

    return (
        <nav
            aria-label="Primary"
            className={cn(
                // Slightly wider shell keeps /renungan aligned with the more generous nav feel used elsewhere.
                'relative mx-auto w-[calc(100vw-28px)] max-w-[420px] rounded-[30px]',
                'border border-black/[0.06]',
                'bg-white/84',
                'backdrop-blur-3xl',
                'shadow-[0_24px_52px_-20px_rgba(15,23,42,0.22),0_10px_22px_-14px_rgba(15,23,42,0.08)]',
                'px-2 pb-2 pt-1.5',
                className,
            )}
        >
            {/* Top highlight line — single, subtle */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
            />

            <div
                className="relative z-[1] grid gap-0.5"
                style={gridTemplateColumns ? { gridTemplateColumns } : undefined}
            >
                {items.map((item) => {
                    const isActive = item.id === activeId;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                triggerHaptic();
                                onChange?.(item.id);
                            }}
                            onMouseEnter={() => onPrefetch?.(item.id)}
                            onTouchStart={() => onPrefetch?.(item.id)}
                            className={cn(
                                'relative inline-flex min-h-[64px] flex-col items-center justify-center gap-1.5',
                                'rounded-[20px] px-2 pb-2 pt-2 transition-all duration-250 ease-out',
                            )}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {/* Active pill background */}
                            {isActive && (
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-0 rounded-[20px] bg-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.42)] ring-1 ring-black/[0.06]"
                                />
                            )}

                            <AppIcon
                                icon={item.icon}
                                variant="nav"
                                active={isActive}
                                strokeWidth={isActive ? 1.75 : 1.55}
                                className={cn(
                                    'relative z-[1] transition-all duration-250 ease-out',
                                    isActive ? 'text-foreground' : 'text-foreground/40',
                                )}
                            />
                            <span
                                className={cn(
                                    'relative z-[1] text-[10.5px] font-medium leading-none tracking-[0.01em] transition-colors duration-250',
                                    isActive ? 'text-foreground font-semibold' : 'text-foreground/40',
                                )}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
