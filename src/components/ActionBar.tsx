"use client";

import { cn } from '@/lib/utils';
import { Bookmark, Hand, MessageCircle, Share2 } from 'lucide-react';
import AppIcon from '@/components/system/AppIcon';
import { useUser } from '@/firebase/auth/use-user';
import { motion } from 'framer-motion';

type ActionBarProps = {
    postType?: string;
    prayLabel?: string;
    prayed?: boolean;
    commentsCount: number;
    bookmarked: boolean;
    bookmarkLabel: string;
    onPray?: () => void;
    onOpenComments: () => void;
    onShare: () => void | Promise<void>;
    onBookmark: () => void;
    className?: string;
    splitSave?: boolean;
};

export default function ActionBar({
    postType,
    prayLabel = 'Amin',
    prayed,
    commentsCount,
    bookmarked,
    bookmarkLabel,
    onPray,
    onOpenComments,
    onShare,
    onBookmark,
    className,
    splitSave = false,
}: ActionBarProps) {
    const { user } = useUser();
    const isAuthenticated = true; // Forced true to unhide features

    const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(type === 'medium' ? 12 : 8);
            }
        } catch { /* ignore */ }
    };

    const runMemberAction = (action: () => void | Promise<void>, haptic: 'light' | 'medium' = 'light') => {
        if (!isAuthenticated) {
            // In Next.js we might want to redirect to a login modal or page
            // For now matching Laravel's behavior of jumping to landing/login
            window.location.assign('/');
            return;
        }

        triggerHaptic(haptic);
        void action();
    };

    const showPray = true;
    const showComments = true;
    const showShare = true;
    const showSave = true;

    return (
        <div className={cn('flex items-center gap-1.5 md:gap-2 text-sm', splitSave ? 'w-full' : '', className)}>
            {showPray && onPray && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className={cn(
                        'tct-pressable inline-flex h-9 items-center gap-2 rounded-full px-3 text-muted-foreground transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground',
                        prayed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-slate-100/30 dark:bg-slate-800/30',
                    )}
                    aria-label="Pray"
                    aria-pressed={prayed}
                    onClick={() => onPray && runMemberAction(onPray, 'medium')}
                >
                    <AppIcon icon={Hand} variant="action" active={prayed} className={prayed ? 'text-emerald-600' : 'opacity-70'} />
                    <span className="text-[12px] font-medium tabular-nums whitespace-nowrap">{prayLabel}</span>
                </motion.button>
            )}

            {showComments && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="tct-pressable inline-flex h-9 items-center gap-2 rounded-full bg-slate-100/30 dark:bg-slate-800/30 px-3 text-muted-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                    aria-label={`Comment${commentsCount ? ` (${commentsCount})` : ''}`}
                    onClick={() => runMemberAction(onOpenComments, 'light')}
                >
                    <AppIcon icon={MessageCircle} variant="action" className="opacity-70" />
                    {commentsCount > 0 ? (
                        <span className="text-[12px] font-medium tabular-nums whitespace-nowrap">
                            {commentsCount}
                        </span>
                    ) : null}
                </motion.button>
            )}

            {showShare && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="tct-pressable flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/30 dark:bg-slate-800/30 text-muted-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                    aria-label="Share"
                    onClick={() => runMemberAction(onShare, 'light')}
                >
                    <AppIcon icon={Share2} variant="action" className="opacity-70" />
                </motion.button>
            )}

            {showSave && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className={cn(
                        'tct-pressable inline-flex h-9 items-center gap-2 rounded-full px-3 text-muted-foreground transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground',
                        splitSave ? 'ml-auto' : '',
                        bookmarked ? 'bg-brand/5 text-brand ring-1 ring-inset ring-brand/20' : 'bg-slate-100/30 dark:bg-slate-800/30',
                    )}
                    aria-label="Bookmark"
                    aria-pressed={bookmarked}
                    onClick={() => runMemberAction(onBookmark, 'medium')}
                >
                    <AppIcon icon={Bookmark} variant="action" active={bookmarked} className={bookmarked ? 'text-brand' : 'opacity-70'} />
                    <span className="text-[12px] font-medium tabular-nums whitespace-nowrap">
                        {bookmarkLabel}
                    </span>
                </motion.button>
            )}
        </div>
    );
}
