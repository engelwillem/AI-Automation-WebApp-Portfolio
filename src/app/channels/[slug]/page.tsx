"use client";

import React, { useState, useEffect } from 'react';
import { useAuthSession } from '@/auth/use-auth-session';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, Users, Bell, ArrowLeft, MessageSquare, Plus } from 'lucide-react';
import { buildAppAuthHeaders, fetchWithAppAuth } from '@/lib/app-auth-fetch';
import { cn } from '@/lib/utils';
import { useMutationRefreshTick } from '@/hooks/use-mutation-refresh-tick';

type Post = {
    id: number;
    title: string;
    publish_at: string;
};

type MemberPost = {
    id: number;
    type: string;
    title?: string | null;
    text?: string | null;
    author?: string | null;
    created_at?: string | null;
};

const formatDate = (value: string): string => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
    return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function WeeklyChannelIndexPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuthSession();
    const refreshTick = useMutationRefreshTick(['/api/channels/']);
    const slugParam = params?.slug;
    const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

    const [channel, setChannel] = useState<{
        title: string;
        description: string;
        members_count: number;
        is_joined: boolean;
    } | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [memberPosts, setMemberPosts] = useState<MemberPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        let isActive = true;
        const load = async () => {
            try {
                setLoadError(null);
                const response = await fetch(`/api/channels/${slug}`, {
                    method: 'GET',
                    headers: buildAppAuthHeaders(),
                    cache: 'no-store',
                });
                if (!response.ok) {
                    throw new Error(response.status === 404 ? 'not_found' : 'fetch_failed');
                }
                const payload = await response.json();
                if (!isActive) return;

                setChannel(payload.channel ?? null);
                setPosts(Array.isArray(payload.posts) ? payload.posts : []);
                setMemberPosts(Array.isArray(payload.memberPosts) ? payload.memberPosts : []);
            } catch (error) {
                if (!isActive) return;
                setLoadError(error instanceof Error ? error.message : 'fetch_failed');
                setChannel(null);
            } finally {
                if (isActive) setLoading(false);
            }
        };
        load();
        return () => {
            isActive = false;
        };
    }, [slug, refreshTick]);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
                <div className="w-full max-w-md rounded-[32px] border border-border/60 bg-surface p-8 text-center shadow-soft">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                        {loadError === 'not_found' ? 'Channel tidak ditemukan' : 'Channel belum tersedia'}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Halaman channel belum bisa dimuat sekarang. Kembali ke katalog untuk membuka channel lain.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push('/channels')}
                        className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2.5 text-xs font-bold text-background shadow-soft transition hover:bg-foreground/90"
                    >
                        Kembali ke Channels
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            {/* Nav Header Parity */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-4">
                <div className="mx-auto max-w-2xl flex items-center justify-between">
                    <button onClick={() => router.push('/channels')} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-elevated active:scale-95 transition-all text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="font-bold text-lg leading-tight text-foreground">{channel.title}</h1>
                    <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-elevated active:scale-95 transition-all text-muted-foreground hover:text-foreground">
                        <Bell className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
                {/* Channel Info Parity */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between p-5 rounded-[28px] bg-surface shadow-soft ring-1 ring-border/50">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-foreground flex items-center justify-center text-background">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">{channel.members_count} Anggota</p>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Active Community</p>
                            </div>
                        </div>
                        <button
                            onClick={handleMembershipToggle}
                            className={cn(
                            "rounded-full px-5 py-2 text-xs font-bold transition-all active:scale-95",
                            channel.is_joined ? "bg-surface-elevated text-foreground" : "bg-foreground text-background shadow-md hover:bg-foreground/90"
                        )}>
                            {channel.is_joined ? 'Joined' : 'Join Channel'}
                        </button>
                    </div>
                </section>

                {/* Posts List Parity */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-2">Published Posts</h3>
                    <div className="grid gap-3">
                        {posts.map(post => (
                            <button
                                key={post.id}
                                onClick={() => router.push(`/channels/${slug}/${post.publish_at.slice(0, 10)}`)}
                                className="group flex items-center justify-between p-5 rounded-[28px] bg-surface shadow-soft ring-1 ring-border/50 transition-all hover:ring-border active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-surface-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-[15px] text-foreground line-clamp-1">{post.title}</p>
                                        <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{formatDate(post.publish_at)}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </button>
                        ))}
                    </div>
                    {posts.length === 0 && (
                        <div className="rounded-[24px] border border-dashed border-border p-8 text-center bg-surface/70">
                            <p className="text-sm font-semibold text-muted-foreground">Belum ada konten mingguan dipublikasikan.</p>
                        </div>
                    )}
                </section>

                {/* Community Section Parity */}
                {memberPosts.length > 0 && (
                    <section className="space-y-4 pt-4 border-t border-border/60">
                         <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Community Posts</h3>
                            <button className="text-[10px] font-bold text-brand bg-brand/5 px-3 py-1 rounded-full border border-brand/10 hover:bg-brand/10 transition-colors">
                                <Plus className="h-3 w-3 inline mr-1" /> Buat Post
                            </button>
                         </div>
                         <div className="grid gap-3">
                            {memberPosts.map(m => (
                                <div key={m.id} className="p-5 rounded-[28px] bg-surface shadow-soft ring-1 ring-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-full bg-surface-muted flex items-center justify-center text-[10px] font-bold text-foreground">
                                            {m.author?.slice(0, 1)}
                                        </div>
                                        <span className="text-[11px] font-bold text-muted-foreground">{m.author}</span>
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed font-medium">{m.text}</p>
                                </div>
                            ))}
                         </div>
                    </section>
                )}
            </main>
        </div>
    );
}
