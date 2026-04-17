"use client";

import { cn } from '@/lib/utils';
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react';
import { AppIcon } from './AppIcon';
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
    ariaLabelContext?: 'default' | 'archive';
    shareBusy?: boolean;
};

export function ActionBar({
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
    ariaLabelContext = 'default',
    shareBusy = false,
}: ActionBarProps) {
    // In Next.js decoupled hybrid, we handle auth check at the page level or within the action handler
    const runMemberAction = (action: () => void | Promise<void>) => {
        void action();
    };

    const prayActionLabel = ariaLabelContext === 'archive' ? 'Doakan arsip' : 'Pray';
    const commentActionLabel = ariaLabelContext === 'archive' ? 'Komentari arsip' : 'Comment';
    const shareActionLabel = ariaLabelContext === 'archive' ? 'Bagikan arsip' : 'Share';
    const bookmarkActionLabel = ariaLabelContext === 'archive' ? 'Simpan arsip' : 'Bookmark';
    const finalShareActionLabel = shareBusy ? 'Menyiapkan...' : shareActionLabel;

    return (
        <div className={cn('flex items-center gap-2 text-sm', splitSave ? 'w-full' : '', className)}>
            {onPray && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className={cn(
                        'tct-pressable inline-flex h-9 items-center gap-2 rounded-full px-3 text-muted-foreground transition-all duration-200 hover:bg-surface-muted hover:text-foreground',
                        prayed ? 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/20' : 'bg-surface-muted/70',
                    )}
                    aria-label={prayActionLabel}
                    aria-pressed={prayed}
                    onClick={() => runMemberAction(onPray)}
                >
                    <AppIcon icon={Heart} variant="action" active={prayed} className={prayed ? 'text-brand fill-current' : 'opacity-70'} />
                    <span className="text-[12px] font-medium tabular-nums">{prayLabel}</span>
                </motion.button>
            )}

            <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                className="tct-pressable inline-flex h-9 items-center gap-2 rounded-full bg-surface-muted/70 px-3 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                aria-label={`${commentActionLabel}${commentsCount ? ` (${commentsCount})` : ''}`}
                onClick={() => runMemberAction(onOpenComments)}
            >
                <AppIcon icon={MessageCircle} variant="action" className="opacity-70" />
                {commentsCount > 0 ? (
                    <span className="text-[12px] font-medium tabular-nums">
                        {commentsCount}
                    </span>
                ) : null}
            </motion.button>

            <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                disabled={shareBusy}
                className={cn(
                    "tct-pressable flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted/70 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground",
                    shareBusy ? "opacity-50" : ""
                )}
                aria-label={finalShareActionLabel}
                onClick={() => runMemberAction(onShare)}
            >
                {shareBusy ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                        <Share2 className="h-4 w-4 opacity-70" />
                    </motion.div>
                ) : (
                    <AppIcon icon={Share2} variant="action" className="opacity-70" />
                )}
            </motion.button>

            <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                className={cn(
                    'tct-pressable inline-flex h-9 items-center gap-2 rounded-full px-3 text-muted-foreground transition-all hover:bg-surface-muted hover:text-foreground',
                    splitSave ? 'ml-auto' : '',
                    bookmarked ? 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/20' : 'bg-surface-muted/70',
                )}
                aria-label={bookmarkActionLabel}
                aria-pressed={bookmarked}
                onClick={() => runMemberAction(onBookmark)}
            >
                <AppIcon icon={Bookmark} variant="action" active={bookmarked} className={bookmarked ? 'text-brand' : 'opacity-70'} />
                <span className="text-[12px] font-medium tabular-nums">
                    {bookmarkLabel}
                </span>
            </motion.button>
        </div>
    );
}
