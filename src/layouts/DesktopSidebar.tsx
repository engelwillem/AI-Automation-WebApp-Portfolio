'use client';

import { cn } from '@/lib/utils';
import AppIcon from '@/components/system/AppIcon';
import Link from 'next/link';

type NavItem = {
    id: string;
    label: string;
    icon: any;
};

type DesktopSidebarNavProps = {
    activeId?: string;
    navItems: NavItem[];
    isAuthenticated: boolean;
    userName?: string;
    userEmail?: string;
    initials?: string;
    appName?: string;
    communityName?: string;
    className?: string;
};

export default function DesktopSidebarNav({
    activeId,
    navItems,
    isAuthenticated,
    userName,
    userEmail,
    initials,
    appName = 'TheChosenTalks',
    communityName = 'Chosen People',
    className,
}: DesktopSidebarNavProps) {
    const isTodaySidebar = activeId === 'home';

    return (
        <aside
            className={cn(
                'flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-soft',
                className,
            )}
            style={{ position: 'sticky', top: '2rem', alignSelf: 'start' }}
        >
            <div>
                <p
                    className={cn(
                        isTodaySidebar
                            ? 'tct-brand-gradient text-base font-bold tracking-tight'
                            : 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
                    )}
                >
                    {isTodaySidebar ? 'Choose n Talks' : appName}
                </p>
                {!isTodaySidebar ? (
                    <p className="tct-brand-gradient mt-1 text-lg font-semibold">{communityName}</p>
                ) : null}
            </div>

            <nav className="mt-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = item.id === activeId;
                    
                    const routeMap: Record<string, string> = {
                        home: '/today',
                        channels: '/channels',
                        community: '/community',
                        bible: '/versehub/id',
                        profile: '/profile',
                    };
                    const href = (item as any).href || routeMap[item.id] || '/';

                    const baseClass = cn(
                        'group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-200',
                        isActive
                            ? 'bg-surface/70 text-foreground ring-1 ring-black/5 dark:ring-white/10'
                            : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                    );

                    return (
                        <Link
                            key={item.id}
                            href={href}
                            className={baseClass}
                        >
                            <AppIcon
                                icon={item.icon}
                                variant="nav"
                                active={isActive}
                                className={cn(
                                    isActive
                                        ? 'text-foreground'
                                        : 'text-muted-foreground group-hover:text-foreground',
                                )}
                            />
                            <span className="flex-1">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {isAuthenticated ? (
                <div className="mt-auto flex items-center gap-3 rounded-2xl bg-surface-muted p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                            {userName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {userEmail}
                        </p>
                    </div>
                </div>
            ) : null}
        </aside>
    );
}
