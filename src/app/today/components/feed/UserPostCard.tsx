'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import ActionBar from '@/components/ActionBar';
import { cn } from '@/lib/utils';

export default function UserPostCard({
    id,
    payload,
    interactions,
}: {
    id?: number | string;
    payload: {
        author?: { name: string; avatar_url?: string };
        user?: { name: string; avatar?: string };
        text?: string;
        content?: string;
        image_path?: string;
        image?: string;
        media_paths?: string[];
        stats?: { likes_count: number; comments_count: number };
        likeCount?: number;
        commentCount?: number;
        created_at?: string;
        timestamp?: string;
        metadata?: { media_aspect_ratio?: '4:5' | 'og' };
    };
    interactions?: { is_liked: boolean };
}) {
    const userName = payload.author?.name ?? payload.user?.name ?? 'Anonymous';
    const avatar = payload.author?.avatar_url ?? payload.user?.avatar;
    const content = payload.text ?? payload.content ?? '';

    const media = useMemo(() => {
        if (Array.isArray(payload.media_paths) && payload.media_paths.length > 0) {
            return payload.media_paths.filter(Boolean);
        }
        const single = payload.image_path ?? payload.image;
        return single ? [single] : [];
    }, [payload.image_path, payload.image, payload.media_paths]);

    const [activeMediaIdx, setActiveMediaIdx] = useState(0);

    const initialLikes = payload.stats?.likes_count ?? payload.likeCount ?? 0;
    const commentCount = payload.stats?.comments_count ?? payload.commentCount ?? 0;
    const timestamp = payload.created_at ? new Date(payload.created_at).toLocaleDateString() : (payload.timestamp ?? 'Just now');
    const postId = id != null ? String(id) : null;

    const [liked, setLiked] = useState(interactions?.is_liked ?? false);
    const [likes, setLikes] = useState(initialLikes);

    const toggleLike = () => {
        if (!postId) return;

        const prevLiked = liked;
        const prevLikes = likes;

        if (liked) setLikes((prev) => prev - 1);
        else setLikes((prev) => prev + 1);
        setLiked(!liked);

        void fetch(`/api/community/posts/${postId}/pray`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).then((response) => {
            if (!response.ok) {
                setLiked(prevLiked);
                setLikes(prevLikes);
            }
        }).catch(() => {
            setLiked(prevLiked);
            setLikes(prevLikes);
        });
    };

    const moveMedia = (dir: -1 | 1) => {
        if (media.length <= 1) return;
        setActiveMediaIdx((prev) => (prev + dir + media.length) % media.length);
    };

    const currentMedia = media[Math.min(activeMediaIdx, Math.max(0, media.length - 1))] ?? null;

    return (
        <Card className="overflow-hidden rounded-[32px] border-0 bg-surface/80 shadow-soft ring-1 ring-border/60 backdrop-blur-sm">
            <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-surface-muted flex items-center justify-center text-foreground font-bold overflow-hidden border border-border/60">
                            {avatar ? (
                                <img src={avatar} alt={userName} className="h-full w-full object-cover" />
                            ) : (
                                userName.charAt(0)
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">{userName}</p>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">{timestamp}</p>
                        </div>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="px-5 pb-4">
                    <p className="text-[15px] leading-relaxed text-foreground">{content}</p>
                </div>

                {currentMedia ? (
                    <div className="space-y-2 px-4 pb-2">
                        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-muted">
                            <div className={cn(
                                "w-full",
                                (payload.metadata?.media_aspect_ratio === 'og') ? "aspect-[1.91/1]" : "aspect-[4/5]"
                            )}>
                                <img
                                    src={currentMedia}
                                    alt="Post content"
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            {media.length > 1 ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => moveMedia(-1)}
                                        className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                                        aria-label="Previous image"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveMedia(1)}
                                        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                                        aria-label="Next image"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </>
                            ) : null}
                        </div>

                        {media.length > 1 ? (
                            <div className="flex items-center justify-center gap-1.5">
                                {media.map((_, idx) => (
                                    <button
                                        key={`media-dot-${idx}`}
                                        type="button"
                                        aria-label={`Go to image ${idx + 1}`}
                                        onClick={() => setActiveMediaIdx(idx)}
                                        className={cn(
                                            'h-1.5 rounded-full transition-all duration-200',
                                            idx === activeMediaIdx ? 'w-6 bg-brand' : 'w-2.5 bg-muted-foreground/40',
                                        )}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="px-5 pb-5">
                    <div className="mb-4 h-px bg-border/70" />
                    <ActionBar
                        prayLabel={String(likes)}
                        prayed={liked}
                        commentsCount={commentCount}
                        bookmarked={false}
                        bookmarkLabel="0"
                        onPray={toggleLike}
                        onOpenComments={() => { }}
                        onShare={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: userName,
                                    text: content,
                                    url: window.location.href
                                });
                            }
                        }}
                        onBookmark={() => { }}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
