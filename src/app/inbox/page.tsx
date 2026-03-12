"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Search, ArrowLeft, MoreVertical, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type InboxItem = {
    message_id: number;
    preview: string;
    is_unread: boolean;
    created_at: string;
    partner: {
        id: number;
        name: string;
        online: boolean;
        avatar?: string;
    };
};

export default function InboxPage() {
    const router = useRouter();
    const [inbox, setInbox] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'primary' | 'general' | 'requests'>('primary');

    useEffect(() => {
        // Mocking parity data for Inbox Index
        setTimeout(() => {
            setInbox([
                {
                    message_id: 1,
                    preview: 'Halo, bagaimana kabarmu hari ini?',
                    is_unread: true,
                    created_at: '2024-03-11T10:00:00Z',
                    partner: { id: 10, name: 'Budi Santoso', online: true }
                },
                {
                    message_id: 2,
                    preview: 'Terima kasih atas renungannya.',
                    is_unread: false,
                    created_at: '2024-03-10T15:30:00Z',
                    partner: { id: 11, name: 'Sari Wijaya', online: false }
                }
            ]);
            setLoading(false);
        }, 800);
    }, []);

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-900 pb-20">
            {/* Header Parity */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-4">
                <div className="mx-auto max-w-2xl flex items-center justify-between">
                    <button onClick={() => router.push('/today')} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white active:scale-95 transition-all">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="font-bold text-lg">Inbox</h1>
                    <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white active:scale-95 transition-all text-slate-400">
                        <Search className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
                {/* Stats Header Parity */}
                <div className="p-5 rounded-[28px] bg-white shadow-soft ring-1 ring-black/[0.03]">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-slate-900 tracking-tight">Pesan Masuk</p>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inbox.length} Percakapan</span>
                    </div>
                    
                    {/* Tabs Bar Parity */}
                    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
                        {(['primary', 'general', 'requests'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "rounded-xl py-2 text-[11px] font-bold capitalize transition-all",
                                    activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation List Parity */}
                <div className="grid gap-2.5">
                    {inbox.length === 0 ? (
                        <div className="p-12 text-center rounded-[32px] bg-white/50 border border-dashed border-slate-200">
                            <Mail className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-400">Belum ada percakapan</p>
                        </div>
                    ) : (
                        inbox.map(item => (
                            <button
                                key={item.message_id}
                                onClick={() => router.push(`/inbox/${item.partner.id}`)}
                                className="group flex items-center gap-4 p-5 rounded-[32px] bg-white shadow-soft ring-1 ring-black/[0.02] transition-all hover:bg-slate-50 active:scale-[0.98]"
                            >
                                <div className="relative flex-none">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold shadow-sm">
                                        {item.partner.name.slice(0, 1)}
                                    </div>
                                    {item.partner.online && (
                                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-bold text-[15px] text-slate-900 truncate">{item.partner.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{formatTime(item.created_at)}</p>
                                    </div>
                                    <p className={cn(
                                        "text-[13px] line-clamp-1 leading-snug",
                                        item.is_unread ? "text-slate-900 font-bold" : "text-slate-500 font-medium"
                                    )}>
                                        {item.preview}
                                    </p>
                                </div>
                                
                                {item.is_unread && (
                                    <div className="h-2 w-2 rounded-full bg-blue-500 flex-none" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}