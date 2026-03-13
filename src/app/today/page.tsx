'use client';

import MobileAppLayout from '@/layouts/MobileAppLayout';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

// Atomic Sections
import GreetingHeader from './components/sections/GreetingHeader';
import ActionShortcutBar from './components/sections/ActionShortcutBar';

// Dashboard Cards
import DailyVerseHeroCard from '@/components/versehub/DailyVerseHeroCard';
import ReflectionPrompt from './components/cards/ReflectionPrompt';
import QuoteCard from './components/cards/QuoteCard';
import PinnedLessonCard from './components/cards/PinnedLessonCard';
import DailyPrayerCard from './components/cards/DailyPrayerCard';
import CommunityCard from './components/cards/CommunityCard';
import QuestionOfTheDay from './components/cards/QuestionOfTheDay';
import TalkCard from './components/cards/TalkCard';
import ReflectionCard from './components/cards/ReflectionCard';

// Feed Components
import FeedList from './components/feed/FeedList';
import ThrowingCard from './components/ThrowingCard';

// Types
import type { DailyVerse } from '@/types/versehub-daily';

const slugifyRef = (ref: string) =>
    ref.toLowerCase().trim()
        .replace(/[:\.\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

type FeedItem = {
    id: number | string;
    type: string;
    payload: Record<string, unknown>;
    interactions?: Record<string, unknown>;
    can_moderate?: boolean;
};

type PinnedLesson = {
    quarter: { id: number; title: string; date_range_human?: string; cover_image_url?: string };
    lesson: { id: number; title: string; excerpt?: string; estimated_minutes: number; day_number: number };
    progress: { state: 'start' | 'continue' | 'completed' };
} | null;

type TodayApiHighlight = {
    id: string;
    type?: string;
    text: string;
    imageUrl: string | null;
    createdAt: string | null;
    author: {
        id: string;
        name: string;
        avatarUrl: string | null;
    };
    counts: {
        likes: number;
        comments: number;
        bookmarks: number;
    };
    isLiked: boolean;
    isBookmarked: boolean;
};

type TodayRituals = {
    today_verse?: Record<string, unknown> | null;
    quote_of_day?: {
        text?: string;
        author?: string | null;
        reference?: string | null;
        ref?: string | null;
        source?: string | null;
    } | null;
    reflection_prompt?: {
        question?: string;
        response_count?: number;
    } | null;
};

type TodayLegacyFeedItem = {
    type?: string;
    payload?: Record<string, unknown>;
};

type TodayApiResponse = {
    data?: {
        dailyVerse?: DailyVerse | null;
        highlights?: TodayApiHighlight[];
        rituals?: TodayRituals;
        hybridFeed?: FeedItem[];
        feed?: TodayLegacyFeedItem[] | { data?: TodayLegacyFeedItem[] };
        pinnedLesson?: PinnedLesson;
        welcomeVerse?: DailyVerse | null;
    };
};

const fallbackDailyVerse: DailyVerse = {
    ref: 'mzm-23-1',
    reference: 'Mazmur 23:1',
    quote: 'TUHAN adalah gembalaku, takkan kekurangan aku.'
};

const fallbackFeed: FeedItem[] = [
    {
        id: 1,
        type: 'system_reflection',
        payload: {
            title: 'Kekuatan dalam Kelemahan',
            text: 'Tuhan menunjukkan kuasa-Nya paling nyata saat kita mengakui kelemahan kita.',
            verseRef: '2 Korintus 12:9'
        }
    },
    {
        id: 2,
        type: 'prayer_request',
        payload: {
            author: { name: 'Sarah' },
            text: 'Mohon doa untuk kesehatan ibu saya yang sedang dalam masa pemulihan.',
            title: 'Doa untuk Kesembuhan'
        }
    }
];

function mapHighlightToFeedItem(highlight: TodayApiHighlight): FeedItem {
    return {
        id: highlight.id,
        type: highlight.type || 'member_post',
        payload: {
            author: {
                name: highlight.author?.name ?? 'Member',
                avatar_url: highlight.author?.avatarUrl ?? undefined,
            },
            text: highlight.text,
            image_path: highlight.imageUrl ?? undefined,
            created_at: highlight.createdAt ?? undefined,
            stats: {
                likes_count: highlight.counts?.likes ?? 0,
                comments_count: highlight.counts?.comments ?? 0,
            },
        },
        interactions: {
            is_liked: Boolean(highlight.isLiked),
            is_bookmarked: Boolean(highlight.isBookmarked),
        },
    };
}

export default function TodayPage() {
    const [apiPinnedLesson, setApiPinnedLesson] = useState<PinnedLesson>(null);
    const [apiDailyVerse, setApiDailyVerse] = useState<DailyVerse | null>(null);
    const [apiHighlights, setApiHighlights] = useState<FeedItem[]>([]);
    const [apiHybridFeed, setApiHybridFeed] = useState<FeedItem[]>([]);
    const [apiLegacyFeed, setApiLegacyFeed] = useState<TodayLegacyFeedItem[]>([]);
    const [apiRituals, setApiRituals] = useState<TodayRituals | null>(null);
    const [apiWelcomeVerse, setApiWelcomeVerse] = useState<DailyVerse | null>(null);

    const fallbackRituals: TodayRituals = {
        reflection_prompt: {
            question: "Apa satu hal yang ingin kau serahkan pada Tuhan hari ini?",
            response_count: 54
        },
        quote_of_day: {
            text: "Berhenti mencoba menjadi sempurna, mulailah mencoba menjadi murni hati.",
            reference: "Inspiratif"
        }
    };

    const pinnedLesson = apiPinnedLesson;
    const dailyVerse = apiDailyVerse ?? fallbackDailyVerse;
    const welcomeVerse = apiWelcomeVerse ?? undefined;
    const rituals = apiRituals ?? fallbackRituals;

    const hybridFeed =
        apiHybridFeed.length > 0
            ? apiHybridFeed
            : apiHighlights.length > 0
              ? apiHighlights
              : fallbackFeed;

    useEffect(() => {
        let isActive = true;

        const loadTodayData = async () => {
            try {
                const response = await fetch('/api/today', {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                    },
                    cache: 'no-store',
                });

                if (!response.ok) return;

                const payload = (await response.json()) as TodayApiResponse;
                if (!isActive) return;

                const nextDailyVerse = payload?.data?.dailyVerse ?? null;
                const nextHighlights = Array.isArray(payload?.data?.highlights)
                    ? payload.data.highlights.map(mapHighlightToFeedItem)
                    : [];
                const nextHybridFeed = Array.isArray(payload?.data?.hybridFeed)
                    ? payload.data.hybridFeed
                    : [];
                const nextLegacyFeed = Array.isArray(payload?.data?.feed)
                    ? payload.data.feed
                    : Array.isArray(payload?.data?.feed?.data)
                      ? payload.data.feed.data
                      : [];

                setApiDailyVerse(nextDailyVerse);
                setApiHighlights(nextHighlights);
                setApiHybridFeed(nextHybridFeed);
                setApiLegacyFeed(nextLegacyFeed);
                setApiPinnedLesson(payload?.data?.pinnedLesson ?? null);
                setApiRituals(payload?.data?.rituals ?? null);
                setApiWelcomeVerse(payload?.data?.welcomeVerse ?? null);
            } catch {
                // Keep the visual fallback when the backend is unreachable.
            }
        };

        loadTodayData();

        return () => {
            isActive = false;
        };
    }, []);

    const items = hybridFeed;
    const firstItems = items.slice(0, 2);
    const restItems = items.slice(2);
    const ritualVerse = rituals?.today_verse ?? null;
    const ritualRef = String(
        (ritualVerse as { ref?: string } | null)?.ref ??
        dailyVerse?.ref ??
        '',
    ).trim();
    
    const normalizedRitualVerse = ritualRef
        ? {
            ref: slugifyRef(ritualRef || 'mzm-23-1'),
            book_code: String((ritualVerse as { book_code?: string } | null)?.book_code ?? dailyVerse?.book_code ?? ''),
            chapter: Number((ritualVerse as { chapter?: number } | null)?.chapter ?? dailyVerse?.chapter ?? 0),
            verse: Number((ritualVerse as { verse?: number } | null)?.verse ?? dailyVerse?.verse ?? 0),
            quote: String(
                (ritualVerse as { quote?: string; text?: string } | null)?.quote ??
                (ritualVerse as { quote?: string; text?: string } | null)?.text ??
                dailyVerse?.quote ??
                '',
            ) || undefined,
            cta_label: String(
                (ritualVerse as { cta_label?: string } | null)?.cta_label ??
                dailyVerse?.cta_label ??
                'Baca Alkitab',
            ),
            cta_href: String(
                (ritualVerse as { cta_href?: string; ref?: string } | null)?.cta_href ??
                ((ritualVerse as { ref?: string } | null)?.ref ? `/versehub/id/${(ritualVerse as { ref?: string }).ref}` : dailyVerse?.cta_href) ??
                '/versehub/id',
            ),
            source_post_id: Number((ritualVerse as { source_post_id?: number } | null)?.source_post_id ?? dailyVerse?.source_post_id ?? 0) || undefined,
            reference: String((ritualVerse as { reference?: string } | null)?.reference ?? dailyVerse?.reference ?? '') || undefined,
            title: String((ritualVerse as { title?: string } | null)?.title ?? dailyVerse?.title ?? '') || undefined,
        }
        : null;

    const reflectionPromptPayload = rituals?.reflection_prompt?.question
        ? {
            question: rituals.reflection_prompt.question,
            response_count: rituals.reflection_prompt.response_count,
        }
        : undefined;

    const quoteOfDayPayload = rituals?.quote_of_day?.text
        ? {
            text: rituals.quote_of_day.text,
            author: rituals.quote_of_day.author ?? undefined,
            reference: rituals.quote_of_day.reference ?? undefined,
            ref: rituals.quote_of_day.ref ?? undefined,
            source: rituals.quote_of_day.source ?? undefined,
        }
        : undefined;

    const normalizedLegacyFeed = useMemo(() => {
        if (Array.isArray(apiLegacyFeed)) return apiLegacyFeed;
        return [];
    }, [apiLegacyFeed]);

    const legacyByType = useMemo(() => {
        const map = new Map<string, any>();
        for (const item of normalizedLegacyFeed) {
            if (!item?.type || map.has(item.type)) continue;
            map.set(item.type, item.payload ?? {});
        }
        return map;
    }, [normalizedLegacyFeed]);

    const legacyReflection = legacyByType.get('reflection');
    const legacyPrayer = legacyByType.get('prayer');
    const legacyCommunity = legacyByType.get('community');
    const legacyTalk = legacyByType.get('talk');
    const legacyQuestion = legacyByType.get('question');

    return (
        <MobileAppLayout
            title="Today"
            activeNavId="home"
            backHref="/"
            className="md:max-w-none bg-surface-muted/40"
            header={<GreetingHeader />}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto w-full max-w-[720px] space-y-5 pb-28 pt-2"
            >
                <div className="space-y-5">
                    {/* Entry Points */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, margin: "-10%" }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <ActionShortcutBar />
                    </motion.div>

                    {/* Sacred Anchor (Verse) */}
                    <ThrowingCard index={0}>
                        <DailyVerseHeroCard
                            welcomeVerse={normalizedRitualVerse ?? welcomeVerse}
                            fallbackVerse={dailyVerse}
                        />
                    </ThrowingCard>

                    {/* Active Ritual (Reflection) */}
                    <ThrowingCard index={1}>
                        <ReflectionPrompt payload={reflectionPromptPayload} />
                    </ThrowingCard>

                    {/* Legacy feed cards kept alive for backwards compatibility */}
                    {legacyReflection ? (
                        <ThrowingCard index={2}>
                            <ReflectionCard payload={legacyReflection} />
                        </ThrowingCard>
                    ) : null}
                    {legacyPrayer ? (
                        <ThrowingCard index={3}>
                            <DailyPrayerCard payload={legacyPrayer} />
                        </ThrowingCard>
                    ) : null}
                    {legacyCommunity ? (
                        <ThrowingCard index={4}>
                            <CommunityCard payload={legacyCommunity} />
                        </ThrowingCard>
                    ) : null}
                    {legacyQuestion ? (
                        <ThrowingCard index={5}>
                            <QuestionOfTheDay payload={legacyQuestion} />
                        </ThrowingCard>
                    ) : null}
                    {legacyTalk ? (
                        <ThrowingCard index={6}>
                            <TalkCard payload={legacyTalk} />
                        </ThrowingCard>
                    ) : null}

                    {/* Feed Part 1 (Direct Engagement) */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.98 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: false, margin: "-5%" }}
                        transition={{ duration: 0.8 }}
                    >
                        <FeedList items={firstItems} />
                    </motion.div>

                    {/* Learning Path (If available) */}
                    {pinnedLesson && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                            <PinnedLessonCard pinned={pinnedLesson} />
                        </motion.div>
                    )}

                    {/* Wisdom Pearl (Quote) */}
                    <ThrowingCard index={10}>
                        <QuoteCard payload={quoteOfDayPayload} />
                    </ThrowingCard>

                    {/* Feed Part 2 (Wider Community) */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.98 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: false, margin: "-5%" }}
                        transition={{ duration: 0.8 }}
                    >
                        <FeedList items={restItems} startIndex={2} />
                    </motion.div>
                </div>
            </motion.div>
        </MobileAppLayout>
    );
}
