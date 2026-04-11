"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthSession } from '@/auth/use-auth-session';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Share2, Users, MessageSquare, Heart, Bookmark } from 'lucide-react';
import { buildAppAuthHeaders, fetchWithAppAuth } from '@/lib/app-auth-fetch';
import { sanitizeRichHtml } from '@/lib/safe-rich-text';
import { cn } from '@/lib/utils';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

type Post = {
    title: string;
    content: string;
    publish_at: string;
};

type MemberPost = {
    id: number;
    type: string;
    text?: string | null;
    author?: string | null;
    created_at?: string | null;
};

export default function WeeklyChannelPostPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuthSession();
    const refreshTick = useMutationRefreshTick(['/api/channels/']);
    const slugParam = params?.slug;
    const dateParam = params?.date;
    const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
    const date = Array.isArray(dateParam) ? dateParam[0] : dateParam;

    const [channel, setChannel] = useState<{
        title: string;
        members_count: number;
        is_joined: boolean;
    } | null>(null);
    const [post, setPost] = useState<Post | null>(null);
    const [memberPosts, setMemberPosts] = useState<MemberPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const sanitizedContent = useMemo(() => sanitizeRichHtml(post?.content), [post?.content]);

    useEffect(() => {
        if (!slug || !date) return;

        let isActive = true;
        const load = async () => {
            try {
                const response = await fetch(`/api/channels/${slug}/${date}`, {
                    method: 'GET',
                    headers: buildAppAuthHeaders(),
                    cache: 'no-store',
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!isActive) return;

                setChannel(payload.channel ?? null);
                if (payload.post) {
                    setPost({
                        title: payload.post.title ?? '',
                        content: payload.post.content ?? '',
                        publish_at: payload.post.publish_at ?? date,
                    });
                }
                setMemberPosts(Array.isArray(payload.memberPosts) ? payload.memberPosts : []);
            } catch {
                // Keep UI stable when API is unreachable.
            } finally {
                if (isActive) setLoading(false);
            }
        };
        load();
        return () => {
            isActive = false;
        };
    }, [slug, date, refreshTick]);

    const handleMembershipToggle = async () => {
        if (!slug || !channel) return;
        if (!isAuthenticated) return;

        try {
            const response = await fetchWithAppAuth(`/api/channels/${slug}/membership`, {
                method: 'POST',
                headers: buildAppAuthHeaders(),
            });
            if (!response.ok) return;
            const payload = await response.json();
            setChannel(prev => prev ? {
                ...prev,
                is_joined: Boolean(payload.is_joined),
                members_count: typeof payload.members_count === 'number' ? payload.members_count : prev.members_count,
            } : prev);
        } catch {
            // Keep UI responsive on transient failures.
        }
    };

    if (loading || !post || !channel) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            {/* Header Parity */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-3">
                <div className="mx-auto max-w-2xl flex items-center justify-between">
                    <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-elevated active:scale-95 transition-all text-foreground">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{channel.title}</p>
                        <p className="text-xs font-bold text-foreground truncate max-w-[150px]">{post.title}</p>
                    </div>
                    <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-elevated active:scale-95 transition-all text-muted-foreground hover:text-foreground">
                        <Share2 className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
                {/* Stats Card Parity */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-surface shadow-soft ring-1 ring-border/50">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground/60" />
                        <span className="text-xs font-bold text-muted-foreground">{channel.members_count} Members</span>
                    </div>
                    <button onClick={handleMembershipToggle} className="text-[11px] font-bold text-foreground bg-surface-muted px-4 py-1.5 rounded-full hover:bg-surface-elevated transition-colors border border-border/50">
                        {channel.is_joined ? '✓ Joined' : 'Join'}
                    </button>
                </div>

                {/* Content Article Parity */}
                <article className="rounded-[40px] bg-surface shadow-card ring-1 ring-border/50 overflow-hidden">
                    <div className="p-8 md:p-12">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">{post.publish_at}</p>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-8 leading-tight">
                            {post.title}
                        </h1>
                        {post.content ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                                className="reader-prose text-[17px] leading-relaxed text-foreground/80 space-y-6"
                            />
                        ) : (
                            <p className="text-sm font-medium text-muted-foreground">Konten belum tersedia.</p>
                        )}
                    </div>
                    
                    {/* Action Bar inside card Parity */}
                    <div className="border-t border-border/50 p-6 flex items-center justify-center gap-4 bg-surface-muted/30">
                         <button 
                            onClick={() => setLiked(!liked)}
                            className={cn(
                                "h-12 w-12 flex items-center justify-center rounded-full transition-all active:scale-90 border border-border/50 shadow-sm",
                                liked ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-surface text-muted-foreground hover:bg-surface-elevated"
                            )}
                         >
                            <Heart className={cn("h-5 w-5", liked ? "fill-current" : "")} />
                         </button>
                         <button className="h-12 w-12 flex items-center justify-center rounded-full bg-surface text-muted-foreground active:scale-90 border border-border/50 shadow-sm hover:bg-surface-elevated transition-colors">
                            <Bookmark className="h-5 w-5" />
                         </button>
                         <button className="h-12 w-12 flex items-center justify-center rounded-full bg-surface text-muted-foreground active:scale-90 border border-border/50 shadow-sm hover:bg-surface-elevated transition-colors">
                            <MessageSquare className="h-5 w-5" />
                         </button>
                    </div>
                </article>

                {/* Community Feedback Parity */}
                {memberPosts.length > 0 && (
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-2">Community Thoughts</h3>
                        <div className="grid gap-3">
                            {memberPosts.map(m => (
                                <div key={m.id} className="p-5 rounded-[32px] bg-surface-muted/50 ring-1 ring-border/50 border border-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-full bg-surface flex items-center justify-center text-[10px] font-bold shadow-sm border border-border/50 text-foreground">
                                            {m.author?.slice(0, 1)}
                                        </div>
                                        <span className="text-[11px] font-bold text-muted-foreground">{m.author}</span>
                                    </div>
                                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">{m.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
