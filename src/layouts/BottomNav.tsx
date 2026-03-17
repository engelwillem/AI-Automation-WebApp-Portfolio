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
    variant?: 'ultra-subtle' | 'high-contrast';
};

type NavVisualPreset = {
    shell: string;
    shellInnerStroke: string;
    activePill: string;
    activeAura: string;
    activeIcon: string;
    idleIcon: string;
    activeLabel: string;
    idleLabel: string;
    activeDot: string;
};

const NAV_PRESETS: Record<'ultra-subtle' | 'high-contrast', NavVisualPreset> = {
    'ultra-subtle': {
        shell:
            'border-white/40 bg-white/70 shadow-[0_24px_48px_-26px_rgba(2,6,23,0.3),0_10px_24px_-16px_rgba(2,6,23,0.15)]',
        shellInnerStroke: 'border-white/70',
        activePill:
            'bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.86)_100%)] ring-1 ring-black/[0.08] shadow-[0_14px_22px_-14px_rgba(2,6,23,0.72),inset_0_1px_0_rgba(255,255,255,0.94)]',
        activeAura: 'bg-[radial-gradient(circle_at_50%_20%,rgba(148,163,184,0.28),rgba(148,163,184,0)_72%)]',
        activeIcon: 'text-slate-900',
        idleIcon: 'text-slate-500/95',
        activeLabel: 'text-slate-900',
        idleLabel: 'text-slate-500/95',
        activeDot: 'bg-slate-900/80',
    },
    'high-contrast': {
        shell:
            'border-black/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.95)_100%)] shadow-[0_28px_56px_-26px_rgba(2,6,23,0.8),0_12px_26px_-16px_rgba(2,6,23,0.45)]',
        shellInnerStroke: 'border-white/75',
        activePill:
            'bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.9)_100%)] ring-1 ring-black/20 shadow-[0_16px_28px_-14px_rgba(2,6,23,0.92),inset_0_1px_0_rgba(255,255,255,0.18)]',
        activeAura: 'bg-[radial-gradient(circle_at_50%_20%,rgba(51,65,85,0.35),rgba(51,65,85,0)_72%)]',
        activeIcon: 'text-white',
        idleIcon: 'text-slate-600',
        activeLabel: 'text-white',
        idleLabel: 'text-slate-600',
        activeDot: 'bg-white',
    },
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
    variant = 'ultra-subtle',
}: FloatingBottomNavProps) {
    const preset = NAV_PRESETS[variant];
    const gridTemplateColumns =
        items.length > 0 ? `repeat(${items.length}, minmax(0, 1fr))` : undefined;

    if (items.length === 0) return null;

    return (
        <nav
            aria-label="Primary"
            className={cn(
                'relative mx-auto w-full max-w-[392px] rounded-[30px] border px-1.5 pb-1.5 pt-1 backdrop-blur-3xl supports-[backdrop-filter]:backdrop-blur-3xl',
                preset.shell,
                className,
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-[1px] rounded-[28px] border',
                    preset.shellInnerStroke,
                )}
            />
            <span
                aria-hidden
                className="pointer-events-none absolute inset-[1px] rounded-[28px] opacity-30"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.10) 1px, transparent 0)',
                    backgroundSize: '11px 11px',
                }}
            />
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/85 to-transparent"
            />
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"
            />

            <div
                className="relative z-[1] grid gap-1"
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
                                'tct-pressable relative inline-flex min-h-[64px] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-2 pb-2 pt-1.5 transition-all duration-300 ease-out',
                                isActive ? 'translate-y-[-1px]' : 'opacity-[0.97] hover:opacity-100',
                            )}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'absolute inset-0 rounded-2xl opacity-0 transition-all duration-300 ease-out',
                                    isActive ? `opacity-100 ${preset.activePill}` : '',
                                )}
                            />
                            <span
                                aria-hidden
                                className={cn(
                                    'pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300',
                                    isActive ? `opacity-100 ${preset.activeAura}` : '',
                                )}
                            />
                            <AppIcon
                                icon={item.icon}
                                variant="nav"
                                active={isActive}
                                strokeWidth={isActive ? 1.8 : 1.6}
                                className={cn(
                                    'relative z-[1] transition-all duration-300 ease-out',
                                    isActive ? `scale-[1.06] ${preset.activeIcon}` : `scale-[0.98] ${preset.idleIcon}`,
                                )}
                            />
                            <span
                                className={cn(
                                    'relative z-[1] text-[10.5px] font-medium leading-none tracking-[0.01em] transition-colors duration-300',
                                    isActive ? `font-semibold ${preset.activeLabel}` : preset.idleLabel,
                                )}
                            >
                                {item.label}
                            </span>
                            <span
                                aria-hidden
                                className={cn(
                                    'absolute bottom-1.5 h-1 w-1 rounded-full opacity-0 transition-all duration-300',
                                    isActive ? `opacity-100 ${preset.activeDot}` : '',
                                )}
                            />
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
