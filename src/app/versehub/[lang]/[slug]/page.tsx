"use client";

import { useParams } from "next/navigation";
import { VersehubReaderPage } from "@/features/versehub/pages/VersehubReaderPage";

const isChapterSlug = (slug: string) => {
    const segments = slug ? slug.split(/[-_.]/) : [];
    if (!slug) return false;
    if (segments.length >= 3) return false;
    return segments.length === 2 || /^[a-z]+\d+$/i.test(slug);
};

export default function UnifiedVerseHubPage() {
    const params = useParams<{ lang: string; slug: string }>();
    const lang = params?.lang || "id";
    const slug = params?.slug || "";
    const mode = isChapterSlug(slug) ? "chapter" : "verse";

    return (
        <VersehubReaderPage
            lang={lang}
            mode={mode}
            initialChapterRef={mode === "chapter" ? slug : null}
            initialVerseRef={mode === "verse" ? slug : null}
        />
    );
}
