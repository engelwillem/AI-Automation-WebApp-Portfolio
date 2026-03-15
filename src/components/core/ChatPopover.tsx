import SegmentedTabs from '@/components/core/SegmentedTabs';
import { IconMessage } from '@/components/icons/AppIcons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAppAccessToken } from '@/services/app-auth-token';

type InboxTab = 'primary' | 'general' | 'requests';

type InboxItem = {
    message_id: number;
    partner: { id: number; name: string; online?: boolean; last_seen_at?: string | null };
    preview: string;
    is_incoming: boolean;
    is_unread: boolean;
    approved: boolean;
    is_following_partner?: boolean;
    is_followed_by_partner?: boolean;
    can_approve?: boolean;
    created_at: string | null;
};

type SharedInbox = {
    tabs?: Record<InboxTab, InboxItem[]>;
    counts?: Record<InboxTab, number>;
    unreadCount?: number;
} | null;

function emptyInbox(): NonNullable<SharedInbox> {
    return {
        tabs: { primary: [], general: [], requests: [] },
        counts: { primary: 0, general: 0, requests: 0 },
        unreadCount: 0,
    };
}

function formatLastSeen(iso: string | null | undefined): string {
    if (!iso) return 'offline';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'offline';
    return `last seen ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function ChatPopover({ className }: { className?: string }) {
    const router = useRouter();
    // Assuming props are passed through a provider or global state in a real Next app
    // For this bridge, we fetch them dynamically
    const [tab, setTab] = useState<InboxTab>('primary');
    const [open, setOpen] = useState(false);
    const [liveInbox, setLiveInbox] = useState<NonNullable<SharedInbox>>(emptyInbox());
    const [draftByPartner, setDraftByPartner] = useState<Record<number, string>>({});
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const lastUnreadRef = useRef<number>(0);

    const showToast = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 1400);
    };

    const refreshInbox = async () => {
        const token = getAppAccessToken();
        if (!token) return;

        try {
            const res = await fetch('/api/inbox', {
                headers: { 
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
            });
            const json = await res.json();
            const data = (json?.inbox ?? emptyInbox()) as NonNullable<SharedInbox>;
            setLiveInbox(data);
            
            const nextUnread = Number(data.unreadCount ?? 0);
            if (nextUnread > lastUnreadRef.current) {
                showToast('Pesan baru masuk');
            }
            lastUnreadRef.current = nextUnread;
        } catch {
            // no-op
        }
    };

    useEffect(() => {
        if (!open) return;

        void refreshInbox();
        const id = window.setInterval(() => {
            void refreshInbox();
        }, 7000);

        return () => window.clearInterval(id);
    }, [open]);

    const toggleFollow = async (partnerId: number) => {
        const token = getAppAccessToken();
        if (!token) return;

        const key = `follow:${partnerId}`;
        setBusyKey(key);
        try {
            const res = await fetch(`/api/users/${partnerId}/follow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({}),
            });

            const json = await res.json();
            if (!res.ok || json?.ok !== true) {
                showToast('Follow action failed');
                return;
            }

            showToast(json?.following ? 'Followed' : 'Unfollowed');
            void refreshInbox();
        } catch {
            showToast('Follow action failed');
        } finally {
            setBusyKey(null);
        }
    };

    const approveRequest = async (messageId: number) => {
        const token = getAppAccessToken();
        if (!token) return;

        const key = `approve:${messageId}`;
        setBusyKey(key);
        try {
            const res = await fetch(`/api/inbox/messages/${messageId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({}),
            });

            const json = await res.json();
            if (!res.ok || json?.ok !== true) {
                showToast('Approve failed');
                return;
            }

            showToast('Request approved');
            await refreshInbox();
            setTab('general');
        } catch {
            showToast('Approve failed');
        } finally {
            setBusyKey(null);
        }
    };

    const sendMessage = async (partnerId: number) => {
        const token = getAppAccessToken();
        const body = String(draftByPartner[partnerId] ?? '').trim();
        if (!token || !body) return;

        const key = `send:${partnerId}`;
        setBusyKey(key);
        try {
            const res = await fetch('/api/inbox/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipient_id: partnerId,
                    body,
                }),
            });

            const json = await res.json();
            if (!res.ok || json?.ok !== true) {
                showToast('Send failed');
                return;
            }

            setDraftByPartner((prev) => ({ ...prev, [partnerId]: '' }));
            showToast('Message sent');
            void refreshInbox();
        } catch {
            showToast('Send failed');
        } finally {
            setBusyKey(null);
        }
    };

    const markAllRead = async () => {
        const token = getAppAccessToken();
        if (!token) return;

        setBusyKey('mark-all');
        try {
            const res = await fetch('/api/inbox/read-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({}),
            });
            const json = await res.json();
            if (!res.ok || json?.ok !== true) {
                showToast('Mark all read gagal');
                return;
            }
            showToast('Semua DM ditandai terbaca');
            await refreshInbox();
        } catch {
            showToast('Mark all read gagal');
        } finally {
            setBusyKey(null);
        }
    };

    const counts = liveInbox.counts ?? { primary: 0, general: 0, requests: 0 };
    const unreadCount = Number(liveInbox.unreadCount ?? 0);
    const tabItems = (liveInbox.tabs?.[tab] ?? []) as InboxItem[];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        'relative flex h-12 w-12 items-center justify-center rounded-full bg-white/80 dark:bg-slate-900/80 shadow-soft backdrop-blur-md ring-1 ring-black/[0.04] dark:ring-white/[0.08]',
                        className,
                    )}
                    aria-label="Open inbox"
                >
                    <IconMessage className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 ? (
                        <span className="absolute right-2 top-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
                            {unreadCount}
                        </span>
                    ) : null}
                </button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-[460px] max-w-[95vw] border-white/15 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
            >
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-white">Inbox</p>
                            <p className="text-xs text-white/55">
                                Announcement & messages
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={busyKey === 'mark-all' || unreadCount <= 0}
                            onClick={() => void markAllRead()}
                            className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/85 hover:bg-white/10 disabled:opacity-50"
                        >
                            {busyKey === 'mark-all' ? '...' : 'Mark all read'}
                        </button>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                            Announcement (Admin)
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                            For Chosen People
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/65">
                            Welcome to The Choose n Talks! Silahkan cek pesan admin di inbox.
                        </p>
                    </div>

                    <SegmentedTabs
                        options={[
                            { id: 'primary', label: `Primary (${counts.primary ?? 0})` },
                            { id: 'general', label: `General (${counts.general ?? 0})` },
                            { id: 'requests', label: `Requests (${counts.requests ?? 0})` },
                        ]}
                        activeId={tab}
                        onChange={(id) => setTab(id as InboxTab)}
                    />

                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                        {tabItems.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                <p className="text-sm font-medium text-white">No messages</p>
                                <p className="mt-1 text-xs text-white/60">
                                    Belum ada percakapan di tab ini.
                                </p>
                            </div>
                        ) : (
                            tabItems.map((item) => {
                                const partnerId = item.partner?.id;
                                const followBusy = busyKey === `follow:${partnerId}`;
                                const approveBusy = busyKey === `approve:${item.message_id}`;
                                const sendBusy = busyKey === `send:${partnerId}`;
                                const following = Boolean(item.is_following_partner);

                                return (
                                    <div
                                        key={item.message_id}
                                        className={cn(
                                            'rounded-2xl border border-white/10 bg-white/5 p-3',
                                            item.is_unread ? 'ring-1 ring-brand/30' : null,
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {item.partner?.name ?? 'Unknown'}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-white/50">
                                                    {item.partner?.online
                                                        ? 'online'
                                                        : formatLastSeen(item.partner?.last_seen_at)}
                                                </p>
                                                <p className="mt-1 text-xs text-white/60">
                                                    {item.preview || 'No content'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={followBusy}
                                                onClick={() => void toggleFollow(partnerId)}
                                                className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/85 hover:bg-white/10 disabled:opacity-60"
                                            >
                                                {followBusy ? '...' : following ? 'Unfollow' : 'Follow'}
                                            </button>
                                        </div>

                                        {item.can_approve ? (
                                            <div className="mt-2 flex justify-end">
                                                <button
                                                    type="button"
                                                    disabled={approveBusy}
                                                    onClick={() => void approveRequest(item.message_id)}
                                                    className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                                                >
                                                    {approveBusy ? 'Approving...' : 'Approve request'}
                                                </button>
                                            </div>
                                        ) : null}

                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                value={draftByPartner[partnerId] ?? ''}
                                                onChange={(e) =>
                                                    setDraftByPartner((prev) => ({
                                                        ...prev,
                                                        [partnerId]: e.target.value,
                                                    }))
                                                }
                                                placeholder="Write message..."
                                                className="h-9 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-white/45 outline-none"
                                            />
                                            <button
                                                type="button"
                                                disabled={sendBusy}
                                                onClick={() => void sendMessage(partnerId)}
                                                className="rounded-xl bg-white/15 px-3 py-2 text-[11px] font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                                            >
                                                {sendBusy ? '...' : 'Send'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/inbox/${partnerId}`)}
                                                className="rounded-xl border border-white/15 px-3 py-2 text-[11px] font-semibold text-white/85 hover:bg-white/10"
                                            >
                                                Open
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </PopoverContent>

            {toast ? (
                <div className="fixed left-1/2 top-6 z-[90] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md">
                    {toast}
                </div>
            ) : null}
        </Popover>
    );
}
