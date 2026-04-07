"use client";

import type { MoodQuickStartOption, SanctuaryScene } from "./types";

export const landingContentPadding = "calc(240px + env(safe-area-inset-bottom, 24px))";
export const readerContentPadding = "calc(180px + env(safe-area-inset-bottom, 24px))";

export const SANCTUARY_SCENES: SanctuaryScene[] = [
    {
        eyebrow: "VerseHub",
        quote: "\"Janganlah kita jemu-jemu berbuat baik...\"",
        invitation: "Masuk sebentar, tenangkan hati, lalu buka firman dengan ritme yang lebih hening dan lebih dalam.",
        reflection: "VerseHub bukan sekadar daftar pasal. Ini ruang baca yang membantu firman terasa dekat, terarah, dan layak ditinggali lebih lama.",
        moodTag: "hopeful",
        suggestedRoute: "explore",
    },
    {
        eyebrow: "Daily Mana",
        quote: "\"Firman-Mu itu pelita bagi kakiku...\"",
        invitation: "Mulai dari satu langkah kecil. Pilih mood, buka kitab, lalu lanjutkan perjalanan tanpa kehilangan konteks.",
        reflection: "Ketika Anda belum tahu harus mulai dari mana, VerseHub memberi pintu masuk yang lembut, bukan kebisingan pilihan.",
        moodTag: "anxious",
        suggestedRoute: "explore",
    },
    {
        eyebrow: "Ruang Doa Digital",
        quote: "\"Tinggallah di dalam Aku...\"",
        invitation: "",
        reflection: "",
        moodTag: "weary",
        suggestedRoute: "explore",
    },
];

export const MOOD_QUICK_STARTS: MoodQuickStartOption[] = [
    {
        key: "anxious",
        label: "Cemas",
        description: "Buka jalur yang lebih menenangkan.",
    },
    {
        key: "grateful",
        label: "Bersyukur",
        description: "Masuk ke bacaan syukur dan pujian.",
    },
    {
        key: "weary",
        label: "Butuh Kekuatan",
        description: "Temukan pasal yang memulihkan tenaga batin.",
    },
];

export function buildTodayDateLabel(): string {
    try {
        return new Intl.DateTimeFormat("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Jakarta",
        }).format(new Date()).toUpperCase();
    } catch {
        return "HARI INI";
    }
}
