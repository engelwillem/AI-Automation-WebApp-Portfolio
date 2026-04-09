"use client";

import { useMemo, useRef, useState } from 'react';
import { buildAppAuthHeaders, fetchWithAppAuth } from '@/lib/app-auth-fetch';

interface MentorInsights {
    reflection_questions?: string[];
    theme_connections?: string[];
    historical_context?: string | null;
    mentor_label?: string;
    disclaimer_id?: string;
}

interface VerseRelationship {
    ref: string;
    type: string;
    direction: 'to' | 'from';
    strength: number;
}

interface VerseTheme {
    slug: string;
    name_id: string;
    name_en: string;
}

interface StudyPath {
    slug: string;
    title: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface DenominationalContext {
    summary: string;
    traditions: Array<{
        name: string;
        view: string;
    }>;
}

interface AskResult {
    answer?: string;
    interpretation?: string;
    study_guidance?: string;
    related_refs?: string[];
    confidence?: string;
    scripture_basis?: {
        anchor_ref?: string | null;
        anchor_text_excerpt?: string | null;
        related_refs?: string[];
    };
    sections?: {
        biblical_text?: string | null;
        interpretation?: string | null;
        study_guidance?: string | null;
    };
    mentor_label?: string;
    disclaimer_id?: string;
}

interface MentorPanelProps {
    /** Full verse reference string, e.g. "yoh-3-16" */
    verseRef: string;
    /** Language code: "id" | "en" */
    lang: string;
    /** Display-ready verse text */
    verseText: string;
    /** Display reference, e.g. "Yohanes 3:16" */
    verseLabel: string;
    /** Whether the current user is authenticated (affects Ask tab) */
    isAuthenticated: boolean;
    /** Active mood for context */
    activeMood: string;
    /** Optional user reflection from chapter reading flow */
    userReflection?: string | null;
    onClose: () => void;
}

type Tab = 'reflect' | 'connect' | 'context' | 'ask';

export default function MentorPanel({
    verseRef,
    lang,
    verseText,
    verseLabel,
    isAuthenticated,
    activeMood,
    userReflection = null,
    onClose,
}: MentorPanelProps) {
    const [tab, setTab] = useState<Tab>('reflect');
    const [insights, setInsights] = useState<MentorInsights | null>(null);
    const [relationships, setRelationships] = useState<VerseRelationship[]>([]);
    const [themes, setThemes] = useState<VerseTheme[]>([]);
    const [activeStudyPaths, setActiveStudyPaths] = useState<StudyPath[]>([]);
    const [denominationalContext, setDenominationalContext] = useState<DenominationalContext | null>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsFetched, setInsightsFetched] = useState(false);

    const [question, setQuestion] = useState('');
    const [askResult, setAskResult] = useState<AskResult | null>(null);
    const [askLoading, setAskLoading] = useState(false);
    const [askError, setAskError] = useState<string | null>(null);

    const questionInputRef = useRef<HTMLTextAreaElement>(null);
    const mentorRequestContext = useMemo(
        () => ({
            mood: activeMood,
            intent: 'deep_study',
            screen_context: 'versehub_reader',
            user_reflection: userReflection,
        }),
        [activeMood, userReflection]
    );

    // Fetch insights lazily on first open or tab switch.
    function ensureInsights() {
        if (insightsFetched || insightsLoading) return;
        setInsightsLoading(true);

        fetchWithAppAuth(`/api/versehub/${encodeURIComponent(lang)}/${encodeURIComponent(verseRef)}/mentor`, {
            headers: buildAppAuthHeaders(),
            cache: 'no-store',
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (json?.insights) setInsights(json.insights);
                if (json?.relationships) setRelationships(json.relationships);
                if (json?.themes) setThemes(json.themes);
                if (json?.active_study_paths) setActiveStudyPaths(json.active_study_paths);
                if (json?.denominational_context) setDenominationalContext(json.denominational_context);
                setInsightsFetched(true);
                setInsightsLoading(false);
            })
            .catch(() => {
                setInsightsFetched(true);
                setInsightsLoading(false);
            });
    }

    function handleTabChange(next: Tab) {
        setTab(next);
        if (next === 'reflect' || next === 'context' || next === 'connect') ensureInsights();
        if (next === 'ask') setTimeout(() => questionInputRef.current?.focus(), 80);
    }

    function handleAsk(e: React.FormEvent) {
        e.preventDefault();
        const q = question.trim();
        if (!q || askLoading) return;
        if (!isAuthenticated) {
            setAskError('Sesi login tidak ditemukan. Silakan login ulang.');
            return;
        }

        setAskLoading(true);
        setAskResult(null);
        setAskError(null);

        fetchWithAppAuth(`/api/versehub/${encodeURIComponent(lang)}/${encodeURIComponent(verseRef)}/mentor/ask`, {
            method: 'POST',
            headers: buildAppAuthHeaders({ contentType: 'application/json' }),
            body: JSON.stringify({ 
                question: q,
                verse_id: verseRef,
                ...mentorRequestContext,
            }),
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((json) => {
                setAskResult(json);
                setAskLoading(false);
            })
            .catch((status) => {
                if (status === 429) {
                    setAskError('Batas pertanyaan tercapai. Coba lagi dalam 1 jam.');
                } else {
                    setAskError('Terjadi kesalahan. Silakan coba lagi.');
                }
                setAskLoading(false);
            });
    }

    // Suggested starter questions
    const starterQuestions = [
        'Apa makna kontekstual ayat ini?',
        'Bagaimana ayat ini dipahami antar denominasi?',
        'Siapa yang Yesus tuju dalam bagian ini?',
        'Apakah ada penggenapan nubuat di sini?',
    ];

    return (
        <div className="fixed inset-0 z-[72]" role="dialog" aria-modal="true" aria-label="Scripture Guide">
            {/* Backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-black/30"
                onClick={onClose}
                aria-label="Tutup Scripture Guide"
            />

            {/* Panel */}
            <aside className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:w-[440px] md:rounded-3xl md:ring-1 md:ring-slate-200">
                {/* Header — always visible, always transparent */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-3 pt-4">
                    <div className="flex items-center gap-2.5">
                        <span className="text-lg text-amber-500">✦</span>
                        <div>
                            <p className="text-sm font-bold leading-tight text-slate-900">Scripture Guide</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        Tutup
                    </button>
                </div>

                {/* Verse reference label */}
                <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-5 py-2">
                    <p className="text-[11px] font-semibold text-slate-500">{verseLabel}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{verseText}</p>

                    {activeStudyPaths.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-2 py-1.5 ring-1 ring-emerald-100">
                            <span className="text-xs">🌱</span>
                            <p className="text-[10px] font-bold text-emerald-800">
                                Ayat ini bagian dari: <span className="underline">{activeStudyPaths[0].title}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-5 pt-2">
                    {(['reflect', 'connect', 'context', 'ask'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => handleTabChange(t)}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors ${tab === t
                                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {t === 'reflect' ? 'Refleksi' : t === 'connect' ? 'Kaitan' : t === 'context' ? 'Konteks' : 'Tanya'}
                        </button>
                    ))}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* ── REFLECT TAB ── */}
                    {tab === 'reflect' && (
                        <>
                            {insightsLoading ? <LoadingSpinner /> : (
                                <div className="space-y-5">
                                    {insights?.reflection_questions?.length ? (
                                        <div>
                                            <SectionLabel color="amber">Pertanyaan Refleksi</SectionLabel>
                                            <ul className="mt-2 space-y-2">
                                                {insights.reflection_questions.map((q, i) => (
                                                    <li
                                                        key={i}
                                                        className="rounded-none bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-amber-100"
                                                    >
                                                        {q}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {insights?.theme_connections?.length ? (
                                        <div>
                                            <SectionLabel color="sky">Hubungan Tema</SectionLabel>
                                            <ul className="mt-2 space-y-2">
                                                {insights.theme_connections.map((t, i) => (
                                                    <li
                                                        key={i}
                                                        className="rounded-none bg-sky-50 px-3.5 py-2.5 text-sm text-slate-700 ring-1 ring-sky-100"
                                                    >
                                                        {t}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {!insights && (
                                        <p className="py-4 text-center text-sm text-slate-400">
                                            Tidak ada wawasan tersedia untuk ayat ini.
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── CONNECT TAB ── */}
                    {tab === 'connect' && (
                        <>
                            {insightsLoading ? <LoadingSpinner /> : (
                                <div className="space-y-6">
                                    {relationships.length > 0 ? (
                                        <div>
                                            <SectionLabel color="amber">Alkitab Menilai Alkitab</SectionLabel>
                                            <p className="mb-2 text-[10px] text-slate-400">Hubungan langsung dengan ayat lain:</p>
                                            <div className="space-y-2">
                                                {relationships.map((rel, i) => (
                                                    <a
                                                        key={i}
                                                        href={`/versehub/${lang}/${rel.ref}`}
                                                        className="flex items-center justify-between rounded-none bg-slate-50 px-4 py-3 ring-1 ring-slate-100 transition-all hover:bg-white hover:shadow-sm hover:ring-slate-200"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">{rel.ref.replace(/-/g, ' ').toUpperCase()}</span>
                                                            <span className="text-[10px] capitalize text-slate-400">{rel.type.replace(/_/g, ' ')}</span>
                                                        </div>
                                                        <span className="text-xs text-amber-500">Baca →</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="py-4 text-center text-sm text-slate-400">
                                            Belum ada hubungan ayat yang tercatat untuk {verseLabel}.
                                        </p>
                                    )}

                                    {themes.length > 0 && (
                                        <div>
                                            <SectionLabel color="sky">Tema Terkait</SectionLabel>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {themes.map((t) => (
                                                    <span
                                                        key={t.slug}
                                                        className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-100"
                                                    >
                                                        {lang === 'id' ? t.name_id : t.name_en}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── CONTEXT TAB ── */}
                    {tab === 'context' && (
                        <>
                            {insightsLoading ? <LoadingSpinner /> : (
                                <div className="space-y-6">
                                    {insights?.historical_context ? (
                                        <div>
                                            <SectionLabel color="slate">Konteks Historis</SectionLabel>
                                            <p className="mt-2 rounded-none bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200">
                                                {insights.historical_context}
                                            </p>
                                        </div>
                                    ) : null}

                                    {denominationalContext && (
                                        <div>
                                            <SectionLabel color="amber">Perspektif Tradisi</SectionLabel>
                                            <p className="mt-2 text-xs text-slate-500 italic mb-3">"{denominationalContext.summary}"</p>
                                            <div className="space-y-3">
                                                {denominationalContext.traditions.map((trad, i) => (
                                                    <div key={i} className="rounded-none border border-slate-100 bg-white p-3 shadow-sm">
                                                        <p className="text-[10px] font-black uppercase text-slate-400">{trad.name}</p>
                                                        <p className="mt-1 text-sm text-slate-700 leading-relaxed">{trad.view}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {!insights?.historical_context && !denominationalContext && (
                                        <p className="py-4 text-center text-sm text-slate-400">
                                            Konteks teologis tidak tersedia untuk ayat ini.
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── ASK TAB ── */}
                    {tab === 'ask' && (
                        <div className="space-y-4">
                            {!isAuthenticated ? (
                                <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                                    <p className="text-sm text-slate-600">
                                        Masuk untuk mengajukan pertanyaan tentang ayat ini kepada Scripture Guide.
                                    </p>
                                    <a
                                        href="/login"
                                        className="mt-3 inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                                    >
                                        Masuk
                                    </a>
                                </div>
                            ) : (
                                <>
                                    {/* Starter suggestions */}
                                    {!askResult && (
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                                Pertanyaan yang sering ditanyakan:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {starterQuestions.map((sq) => (
                                                    <button
                                                        key={sq}
                                                        type="button"
                                                        onClick={() => setQuestion(sq)}
                                                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                                                    >
                                                        {sq}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Ask form */}
                                    <form onSubmit={handleAsk} className="space-y-3">
                                        <textarea
                                            ref={questionInputRef}
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            placeholder="Tanyakan sesuatu tentang ayat ini..."
                                            rows={3}
                                            maxLength={400}
                                            className="w-full resize-none rounded-2xl bg-slate-50 px-3.5 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300"
                                        />
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[10px] text-slate-400">
                                                {question.length}/400
                                            </span>
                                            <button
                                                type="submit"
                                                disabled={question.trim().length < 3 || askLoading}
                                                className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-amber-600"
                                            >
                                                {askLoading ? 'Memuat...' : 'Tanya ✦'}
                                            </button>
                                        </div>
                                    </form>

                                    {/* Error */}
                                    {askError && (
                                        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-100">
                                            {askError}
                                        </p>
                                    )}

                                    {/* Result */}
                                    {askResult && (
                                        <div className="space-y-4">
                                            <SectionLabel color="amber">Jawaban Scripture Guide</SectionLabel>

                                            {/* Explicit Biblical Text Layer */}
                                            {askResult.scripture_basis?.anchor_text_excerpt && (
                                                <div className="space-y-1.5 px-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                        Teks Alkitab (dasar)
                                                    </p>
                                                    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
                                                        {askResult.scripture_basis.anchor_text_excerpt}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Core Answer */}
                                            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-amber-100/50">
                                                {askResult.answer}
                                            </div>

                                            {/* Interpretation Layer */}
                                            {askResult.interpretation && (
                                                <div className="space-y-1.5 px-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Interpretasi</p>
                                                    <p className="text-sm italic leading-relaxed text-slate-600">
                                                        {askResult.interpretation}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Study Guidance Layer */}
                                            {askResult.study_guidance && (
                                                <div className="rounded-2xl border border-dashed border-amber-200 bg-white p-4">
                                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">Panduan Studi</p>
                                                    <p className="text-sm leading-relaxed text-slate-700">
                                                        {askResult.study_guidance}
                                                    </p>
                                                </div>
                                            )}

                                            {askResult.related_refs?.length ? (
                                                <div className="px-1 pt-1">
                                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                        Bacaan terkait:
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {askResult.related_refs.map((r) => (
                                                            <a
                                                                key={r}
                                                                href={`/versehub/${lang}/${r}`}
                                                                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                                                            >
                                                                {r.replace(/-/g, ' ')}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                            <button
                                                type="button"
                                                className="text-xs text-slate-400 hover:text-slate-600"
                                                onClick={() => { setAskResult(null); setQuestion(''); }}
                                            >
                                                Ajukan pertanyaan lain →
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer disclaimer — always shown */}
            </aside>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500" />
            <p className="text-xs text-slate-400">Memuat wawasan...</p>
        </div>
    );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: 'amber' | 'sky' | 'slate' }) {
    const cls = {
        amber: 'text-amber-600',
        sky: 'text-sky-600',
        slate: 'text-slate-500',
    }[color];
    return (
        <p className={`text-[10px] font-bold uppercase tracking-widest ${cls}`}>{children}</p>
    );
}

