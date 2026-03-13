'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Send, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function QuestionOfTheDay({
    payload,
}: {
    payload?: { question: string; participationCount?: number; response_count?: number };
}) {
    const [answer, setAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const question = payload?.question ?? "Apa satu renungan hari ini?";
    const count = payload?.participationCount ?? payload?.response_count ?? 12;

    const handleSubmit = () => {
        if (!answer.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setTimeout(() => {
            setAnswer('');
            setIsSubmitting(false);
        }, 1000);
    };

    return (
        <Card className="overflow-hidden rounded-[32px] border-0 bg-surface/80 shadow-soft ring-1 ring-border/60 backdrop-blur-sm">
            <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/20">
                        <HelpCircle className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Pertanyaan Hari Ini</span>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold leading-tight text-foreground md:text-xl">
                        {question}
                    </h3>

                    <div className="relative">
                        <input
                            type="text"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="Tulis jawaban singkat Anda..."
                            disabled={isSubmitting}
                            className="h-12 w-full rounded-2xl bg-surface px-4 pr-12 text-sm ring-1 ring-border transition-all outline-none focus:ring-brand/40"
                        />
                        <button
                            onClick={handleSubmit}
                            className="absolute right-2 top-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-md transition-all active:scale-95 hover:opacity-90 disabled:opacity-50"
                            disabled={!answer.trim() || isSubmitting}
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        <span>{count} orang sudah menjawab</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
