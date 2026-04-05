'use client';

import { cn } from '@/lib/utils';
import AppIcon from '@/components/system/AppIcon';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { TCTLogo } from '@/components/brand/TCTLogo';
import { useCurrentUserAvatarStyle } from '@/lib/avatar-presentation';

type NavItem = {
    id: string;
    label: string;
    icon: LucideIcon;
    href?: string;
};

type DesktopSidebarNavProps = {
    activeId?: string;
    navItems: NavItem[];
    isAuthenticated: boolean;
    userName?: string;
    userEmail?: string;
    initials?: string;
    avatarUrl?: string | null;
    isGuest?: boolean;
    appName?: string;
    communityName?: string;
    className?: string;
};

const ROUTE_MAP: Record<string, string> = {
    today: '/renungan',
    versehub: '/versehub/id',
    community: '/community',
    profile: '/profile',
};

export default function DesktopSidebarNav({
    activeId,
    navItems,
    isAuthenticated,
    userName,
    userEmail,
    initials,
    avatarUrl,
    isGuest = false,
    className,
}: DesktopSidebarNavProps) {
    const resolvedName = userName?.trim() || 'Guest';
    const resolvedInitials = (initials?.trim() || (isGuest ? 'G' : resolvedName.slice(0, 1) || 'U')).toUpperCase();
    const resolvedAvatarUrl = isGuest ? null : avatarUrl;
    const avatarPresentation = useCurrentUserAvatarStyle(
        resolvedAvatarUrl,
        { name: resolvedName },
        32,
    );

    return (
        <aside
            className={cn(
                'flex flex-col gap-2 rounded-3xl p-5',
                'bg-white/60 dark:bg-[hsl(240_5%_8%/0.6)]',
                'backdrop-blur-xl',
                'border border-black/[0.04] dark:border-white/[0.04]',
                className,
            )}
            style={{ position: 'sticky', top: '2rem', alignSelf: 'start' }}
        >
            {/* Brand — quiet, elegant, with SVG logo */}
            <div className="flex items-center gap-2.5 px-3 mb-4 mt-1 opacity-90 transition-opacity hover:opacity-100">
                <TCTLogo className="w-5 h-5 drop-shadow-sm" />
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/45 mt-0.5">
                    The Chosen Talks
                </p>
            </div>

            <nav className="space-y-0.5">
                {navItems.map((item) => {
                    const isActive = item.id === activeId;
                    const href = item.href || ROUTE_MAP[item.id] || '/';

                    return (
                        <Link
                            key={item.id}
                            href={href}
                            className={cn(
                                'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-black/[0.05] dark:bg-white/[0.06] text-foreground'
                                    : 'text-foreground/45 hover:text-foreground/80 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]',
                            )}
                        >
                            <AppIcon
                                icon={item.icon}
                                variant="nav"
                                active={isActive}
                                className={cn(
                                    'transition-opacity',
                                    isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-75',
                                )}
                            />
                            <span className="flex-1">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-4 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex items-center gap-3 px-2">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06] text-[12px] font-semibold text-foreground/70">
                        {resolvedAvatarUrl ? (
                            <img
                                src={resolvedAvatarUrl}
                                alt={resolvedName}
                                className={cn('h-full w-full object-cover', avatarPresentation.className)}
                                style={avatarPresentation.style}
                            />
                        ) : (
                            resolvedInitials
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground/80">
                            {resolvedName}
                        </p>
                        <p className="truncate text-[11px] text-foreground/35">
                            {isGuest ? 'Chosen People' : (userEmail || 'Chosen People')}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
