<?php

namespace App\Http\Controllers;

use App\Models\BibleVerse;
use App\Services\AI\VerseHubAIService;
use App\Services\VerseHub\VerseHubMentorOgCopyBuilder;
use App\Services\VerseHub\VerseHubResponseAssembler;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class VerseHubController extends Controller
{
    private VerseHubResponseAssembler $responseAssembler;
    private VerseHubMentorOgCopyBuilder $mentorOgCopyBuilder;

    public function __construct(
        ?VerseHubResponseAssembler $responseAssembler = null,
        ?VerseHubMentorOgCopyBuilder $mentorOgCopyBuilder = null,
    ) {
        $this->responseAssembler = $responseAssembler ?? app(VerseHubResponseAssembler::class);
        $this->mentorOgCopyBuilder = $mentorOgCopyBuilder ?? app(VerseHubMentorOgCopyBuilder::class);
    }

    /**
     * Display a dedicated verse page that is share-friendly (WA/FB OG tags).
     *
     * Example: /versehub/psa-56-4-5
     */
    /**
     * Legacy entry (no language prefix). Keep for backward compatibility.
     */
    public function showLegacy(Request $request, string $ref)
    {
        // Legacy links had no language prefix; infer language from native book code.
        // - English commonly uses gen/ps/rom/phil/phlm/etc.
        // - Indonesian uses kej/mzm/yoh/flm/etc.
        $lang = $this->inferLangFromLegacyRef($ref);

        return $this->handleShow($request, $lang, $ref, true);
    }

    public function showLang(Request $request, string $lang, string $ref)
    {
        return $this->handleShow($request, $lang, $ref, false);
    }

    /**
     * OG Image endpoint for WhatsApp previews.
     */
    public function ogImageLegacy(Request $request, string $ref)
    {
        $lang = $this->inferLangFromLegacyRef($ref);

        return $this->handleOg($request, $lang, $ref, true);
    }

    private function inferLangFromLegacyRef(string $ref): string
    {
        $parsed = $this->parseRawRef($ref);
        $book = $parsed['book'] ?? Str::lower(trim((string) Str::before($ref, '-')));

        if (array_key_exists($book, $this->bookMap('en'))) {
            return 'en';
        }
        $aliasTarget = $this->bookAlias($book);
        if ($aliasTarget !== null && array_key_exists($aliasTarget, $this->bookMap('en'))) {
            return 'en';
        }

        return 'id';
    }

    public function ogImageLang(Request $request, string $lang, string $ref)
    {
        return $this->handleOg($request, $lang, $ref, false);
    }

    /**
     * Scripture Guide: Mentor Insights API endpoint.
     * Returns contextual questions and theme connections for a given verse.
     */
    public function mentorInsights(Request $request, string $lang, string $ref, VerseHubAIService $mentor)
    {
        abort_unless(in_array($lang, ['id', 'en'], true), 404);

        $normalized = $this->normalizeRef($lang, $ref);
        if (! is_array($normalized)) {
            abort(404);
        }

        if ($normalized['redirect_to']) {
            return response()->json(['redirect_to' => $normalized['redirect_to']], 302);
        }

        $query = $this->refToProviderQuery($lang, $normalized['ref']);
        if (! is_string($query)) {
            abort(404);
        }

        if (! preg_match('/^([a-z0-9]+)-(\d+)-(\d+)$/', $normalized['ref'], $m)) {
            return response()->json(['error' => 'Invalid reference.'], 400);
        }

        $bookCode = $m[1];
        $chapter = (int) $m[2];
        $verse = (int) $m[3];

        // Fetch verse text to enrich insights.
        $verseData = $this->fetchVerseForLang($lang, $query);
        $verseText = trim((string) ($verseData['text'] ?? ''));

        $insights = Cache::remember(
            "versehub:mentor:{$lang}:{$normalized['ref']}",
            now()->addHours(24),
            fn () => $mentor->getGuidedInsights($bookCode, $chapter, $verse, $verseText)
        );

        // Fetch additional structural data.
        $relationships = $mentor->getRelationships($normalized['ref']);
        $themes = $mentor->getThemes($normalized['ref']);
        $studyPaths = $mentor->getActiveStudyPaths($request->user(), $normalized['ref']);

        // HARDENING: Add denominational context for deeper theological parity
        $denominationalContext = $mentor->getDenominationalContext($bookCode, $chapter, $verse);

        return response()->json(
            $this->responseAssembler->buildMentorInsightsPayload(
                $normalized['ref'],
                $query,
                (string) config('versehub_mentor.label', 'Scripture Guide'),
                $insights,
                $relationships,
                $themes,
                $studyPaths,
                $denominationalContext
            )
        );
    }

    /**
     * Scripture Guide: Free-text Ask flow.
     * Rate-limited to 10/hour per authenticated user.
     */
    public function mentorAsk(Request $request, string $lang, string $ref, VerseHubAIService $mentor)
    {
        abort_unless(in_array($lang, ['id', 'en'], true), 404);

        $validated = $request->validate([
            'question' => ['required', 'string', 'min:3', 'max:400'],
            'mode' => ['nullable', 'string', 'in:explain_simply,practical_meaning,prayer_from_verse,related_verses,tradition_context_note'],
            'context' => ['nullable', 'array'],
            'context.mood' => ['nullable', 'string', 'max:60'],
            'context.intent' => ['nullable', 'string', 'max:120'],
            'context.user_reflection' => ['nullable', 'string', 'max:1200'],
        ]);

        $normalized = $this->normalizeRef($lang, $ref);
        if (! is_array($normalized)) {
            abort(404);
        }

        if ($normalized['redirect_to']) {
            return response()->json(['redirect_to' => $normalized['redirect_to']], 302);
        }

        if (! preg_match('/^([a-z0-9]+)-(\d+)-(\d+)$/', $normalized['ref'], $m)) {
            return response()->json(['error' => 'Invalid reference.'], 400);
        }

        $maxAttempts = max(1, (int) config('versehub_mentor.ask_rate_limit', 10));
        $userId = (string) ($request->user()?->getAuthIdentifier() ?? 'guest');
        $rateKey = 'versehub:mentor:ask:'.$userId;
        if (RateLimiter::tooManyAttempts($rateKey, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($rateKey);

            return response()->json([
                'message' => 'Terlalu banyak pertanyaan. Coba lagi dalam beberapa menit.',
                'retry_after_seconds' => $seconds,
            ], 429)->header('Retry-After', (string) $seconds);
        }
        RateLimiter::hit($rateKey, 3600);

        $query = $this->refToProviderQuery($lang, $normalized['ref']);
        $verseData = $query ? $this->fetchVerseForLang($lang, $query) : [];

        $verseContext = [
            'ref' => $normalized['ref'],
            'text' => trim((string) ($verseData['text'] ?? '')),
            'book' => $m[1],
            'chapter' => (int) $m[2],
            'verse' => (int) $m[3],
            'lang' => $lang,
            'mood' => is_array($validated['context'] ?? null) ? (string) ($validated['context']['mood'] ?? '') : '',
            'intent' => is_array($validated['context'] ?? null) ? (string) ($validated['context']['intent'] ?? '') : '',
            'user_reflection' => is_array($validated['context'] ?? null) ? (string) ($validated['context']['user_reflection'] ?? '') : '',
        ];

        $result = $mentor->ask(
            question: $validated['question'],
            verseContext: $verseContext,
            user: $request->user(),
            assistMode: (string) ($validated['mode'] ?? 'explain_simply')
        );

        return response()->json($result);
    }

    /**
     * Premium OG card for Ask-the-Bible responses.
     * Example:
     * /versehub/id/yoh-3-16/mentor/og.png?q=Apa%20makna%20ayat%20ini&summary=...
     */
    public function mentorOgImage(Request $request, string $lang, string $ref)
    {
        abort_unless(in_array($lang, ['id', 'en'], true), 404);

        $normalized = $this->normalizeRef($lang, $ref);
        if (! is_array($normalized)) {
            abort(404);
        }

        if ($normalized['redirect_to']) {
            $redirectTo = rtrim((string) $normalized['redirect_to'], '/').'/mentor/og.png';

            return redirect()->to($redirectTo, $this->canonicalRedirectCode());
        }

        $query = $this->refToProviderQuery($lang, $normalized['ref']);
        if (! is_string($query)) {
            abort(404);
        }

        $verse = $this->fetchVerseForLang($lang, $query);
        $reference = (string) ($verse['reference'] ?? Str::upper($normalized['ref']));
        $copy = $this->mentorOgCopyBuilder->build(
            $reference,
            (string) $request->query('q', ''),
            (string) $request->query('summary', '')
        );

        $png = $this->renderAskOg($copy['title'], $copy['subtitle']);

        return new Response($png, 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function handleShow(Request $request, string $lang, string $ref, bool $isLegacy)
    {
        abort_unless(in_array($lang, ['id', 'en'], true), 404);

        $normalized = $this->normalizeRef($lang, $ref);
        if (! is_array($normalized)) {
            abort(404);
        }

        if ($normalized['redirect_to']) {
            return redirect()->to($normalized['redirect_to'], $this->canonicalRedirectCode());
        }

        $query = $this->refToProviderQuery($lang, $normalized['ref']);
        if (! is_string($query)) {
            abort(404);
        }

        $verse = $this->fetchVerseForLang($lang, $query);

        $ogPath = $isLegacy
            ? $this->publicUrl("/versehub/{$normalized['ref']}/og.png")
            : $this->publicUrl("/versehub/{$lang}/{$normalized['ref']}/og.png");

        $canonical = $this->publicUrl("/versehub/{$lang}/{$normalized['ref']}");

        $data = $this->responseAssembler->buildReaderPayload(
            $lang,
            $normalized['ref'],
            $query,
            $verse,
            $ogPath,
            $canonical
        );

        if ($request->expectsJson()) {
            return response()->json($data);
        }

        return view('versehub.show', $data);
    }

    private function handleOg(Request $request, string $lang, string $ref, bool $isLegacy)
    {
        abort_unless(in_array($lang, ['id', 'en'], true), 404);

        $normalized = $this->normalizeRef($lang, $ref);
        if (! is_array($normalized)) {
            abort(404);
        }

        if ($normalized['redirect_to']) {
            return redirect()->to($normalized['redirect_to'], $this->canonicalRedirectCode());
        }

        $query = $this->refToProviderQuery($lang, $normalized['ref']);
        if (! is_string($query)) {
            abort(404);
        }

        $verse = $this->fetchVerseForLang($lang, $query);
        $reference = (string) ($verse['reference'] ?? Str::upper($normalized['ref']));
        $text = trim((string) ($verse['text'] ?? ''));

        $png = $this->renderOgPng($reference, $text);

        return new Response($png, 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    /**
     * Normalize ref:
     * - Enforce 1 verse per URL
     * - Redirect legacy aliases
     * - Redirect range to verse1
     */
    private function normalizeRef(string $lang, string $ref): ?array
    {
        $rawRef = Str::lower(trim($ref));
        $parsed = $this->parseRawRef($ref);
        if ($parsed === null) {
            return null;
        }

        $originalBook = $parsed['book'];
        $chapter = (string) $parsed['chapter'];
        $v1 = (string) $parsed['verse_start'];
        $v2 = $parsed['verse_end'] !== null ? (string) $parsed['verse_end'] : null;
        $book = $this->resolveBookCode($lang, $originalBook);
        if ($book === null) {
            return null;
        }

        $canonical = sprintf('%s-%s-%s', $book, $chapter, $v1);
        $redirectTo = null;

        $isOg = Str::contains(request()->route()?->getName() ?? '', '.og') || Str::endsWith(request()->path(), '/og.png');

        // If only chapter is provided (example: 1ptr-3), redirect safely to verse 1.
        if (! $parsed['has_verse']) {
            $path = "/versehub/{$lang}/{$canonical}";
            if ($isOg) {
                $path .= '/og.png';
            }
            $redirectTo = url($path);
        }

        // If original ref had range, redirect to verse1.
        if ($v2 !== null) {
            $path = "/versehub/{$lang}/{$canonical}";
            if ($isOg) {
                $path .= '/og.png';
            }
            $redirectTo = url($path);
        }

        // If we normalized a legacy alias (book code changed), redirect to canonical.
        if ($redirectTo === null && $originalBook !== $book) {
            $path = "/versehub/{$lang}/{$canonical}";
            if ($isOg) {
                $path .= '/og.png';
            }
            $redirectTo = url($path);
        }

        // If formatting is non-canonical (underscore, dot, no separator), redirect to canonical.
        if ($redirectTo === null && $rawRef !== $canonical) {
            $path = "/versehub/{$lang}/{$canonical}";
            if ($isOg) {
                $path .= '/og.png';
            }
            $redirectTo = url($path);
        }

        // If legacy route called, redirect to canonical with lang prefix.
        if ($redirectTo === null && request()->route()?->getName() === 'versehub.show.legacy') {
            $redirectTo = url("/versehub/{$lang}/{$canonical}");
        }
        if ($redirectTo === null && request()->route()?->getName() === 'versehub.og.legacy') {
            $redirectTo = url("/versehub/{$lang}/{$canonical}/og.png");
        }

        return [
            'ref' => $canonical,
            'redirect_to' => $redirectTo,
        ];
    }

    private function refToProviderQuery(string $lang, string $ref): ?string
    {
        $ref = Str::lower(trim($ref));
        if (! preg_match('/^([a-z0-9]+)-(\d+)-(\d+)$/', $ref, $m)) {
            return null;
        }

        $book = $m[1];
        $chapter = $m[2];
        $verse = $m[3];
        $resolved = $this->resolveBookCode($lang, $book);
        if ($resolved === null) {
            return null;
        }
        $bookName = $this->bookMap($lang)[$resolved] ?? null;
        if ($bookName === null) {
            return null;
        }

        return sprintf('%s %d:%d', $bookName, (int) $chapter, (int) $verse);
    }

    private function fetchVerseForLang(string $lang, string $query): array
    {
        if ($lang === 'en') {
            return $this->fetchVerseEnglish($query);
        }

        // Prefer local DB (AYT) for Indonesian.
        $db = $this->fetchVerseFromDb('ayt', 'id', $query);
        if ($db) {
            return $db;
        }

        // Fallback to provider (TB) if not found.
        return $this->fetchVerseIndonesian($query);
    }

    /**
     * Fetch a single verse from local DB.
     *
     * @param  string  $provider  Example: ayt
     * @param  string  $lang  Example: id
     * @param  string  $query  Normalized query: "genesis 1:1" etc.
     */
    private function fetchVerseFromDb(string $provider, string $lang, string $query): ?array
    {
        if (! Schema::hasTable('bible_verses')) {
            return null;
        }

        $query = Str::lower(trim($query));
        if (! preg_match('/^(?<book>.+)\s+(?<chapter>\d+):(?<verse>\d+)$/', $query, $m)) {
            return null;
        }

        $bookName = trim((string) $m['book']);
        $chapter = (int) $m['chapter'];
        $verse = (int) $m['verse'];

        if ($lang === 'id') {
            $bookCode = $this->bookCodeFromProviderName('id', $bookName);
        } else {
            // For future: english dataset.
            $bookCode = $this->bookCodeFromProviderName('en', $bookName);
        }

        if (! $bookCode) {
            return null;
        }

        $row = BibleVerse::query()
            ->where('provider', $provider)
            ->where('lang', $lang)
            ->where('book_code', $bookCode)
            ->where('chapter', $chapter)
            ->where('verse', $verse)
            ->first();

        if (! $row) {
            return null;
        }

        return [
            'reference' => $row->reference ?: Str::upper($bookCode)." {$chapter}:{$verse}",
            'text' => $row->text,
            'translation_name' => $row->translation_name,
            'provider' => $row->provider,
        ];
    }

    private function fetchVerseIndonesian(string $query): array
    {
        $alkitabPath = $this->bibleApiQueryToAlkitabMobiPath($query);
        if (! is_string($alkitabPath)) {
            abort(404);
        }

        $url = 'https://alkitab.mobi'.$alkitabPath;

        return Cache::remember(
            'versehub:alkitab-mobi:'.md5($url),
            now()->addHours(6),
            function () use ($url) {
                $http = Http::timeout(12);
                if (app()->environment('local')) {
                    $http = $http->withoutVerifying();
                }
                $resp = $http->get($url);
                abort_unless($resp->ok(), 502);
                $html = (string) $resp->body();

                return $this->parseAlkitabMobiTbHtml($html);
            }
        );
    }

    private function fetchVerseEnglish(string $query): array
    {
        // Use bible-api.com (WEB / English).
        $url = 'https://bible-api.com/'.rawurlencode($query);

        return Cache::remember(
            'versehub:bible-api:'.md5($url),
            now()->addHours(6),
            function () use ($url) {
                $http = Http::timeout(12);
                if (app()->environment('local')) {
                    $http = $http->withoutVerifying();
                }
                $resp = $http->get($url);
                abort_unless($resp->ok(), 502);
                /** @var array $data */
                $data = $resp->json();

                if (! is_array($data)) {
                    return [];
                }

                // Add provider label for UI.
                $data['provider'] = 'bible-api.com';

                return $data;
            }
        );
    }

    /**
     * Convert slug ref like "psa-56-4-5" to bible-api query "psalm 56:4-5".
     */
    private function refToBibleApiQuery(string $ref): ?string
    {
        $ref = Str::lower(trim($ref));
        if (! preg_match('/^([a-z0-9]+)[-\.](\d+)[-\.](\d+)(?:[-\.](\d+))?$/', $ref, $m)) {
            return null;
        }

        $book = $m[1];
        $chapter = $m[2];
        $v1 = $m[3];
        $v2 = $m[4] ?? null;

        // Book mapping for bible-api.com query.
        // Support common EN abbreviations + Indonesian abbreviations (Ef, Flp, Kis, etc.).
        $bookMap = [
            'psa' => 'psalm',
            'psalm' => 'psalm',
            'psalms' => 'psalm',

            // Gospels
            'mat' => 'matthew',
            'mrk' => 'mark',
            'luk' => 'luke',
            'jhn' => 'john',

            // Acts
            'act' => 'acts',
            'acts' => 'acts',
            'kis' => 'acts',

            // Pauline letters
            'rom' => 'romans',
            'rm' => 'romans',

            '1cor' => '1 corinthians',
            '2cor' => '2 corinthians',
            'kor' => 'corinthians', // ambiguous; prefer 1cor/2cor slugs
            '1kor' => '1 corinthians',
            '2kor' => '2 corinthians',

            'eph' => 'ephesians',
            'ef' => 'ephesians',

            'php' => 'philippians',
            'flp' => 'philippians',
            'fil' => 'philippians',
            'filipi' => 'philippians',

            'col' => 'colossians',
            'kol' => 'colossians',

            'phm' => 'philemon',
            'flm' => 'philemon',
            'filemon' => 'philemon',

            // Pentateuch
            'gen' => 'genesis',
            'exo' => 'exodus',
        ];

        $bookName = $bookMap[$book] ?? null;
        if (! $bookName) {
            return null;
        }

        $versePart = $v2 ? "{$v1}-{$v2}" : $v1;

        return sprintf('%s %s:%s', $bookName, $chapter, $versePart);
    }

    // (old fetchVerse removed; replaced by fetchVerseForLang + provider-specific methods)

    /**
     * Convert bible-api style query (normalized) to alkitab.mobi path (TB).
     * Example: "philemon 1:15-16" -> "/tb/Flm/1/15-16"
     */
    private function bibleApiQueryToAlkitabMobiPath(string $query): ?string
    {
        $query = Str::lower(trim($query));

        // Extract last "chapter:verses" and everything before it as book name.
        if (! preg_match('/^(?<book>.+)\s+(?<chapter>\d+):(?<verses>\d+(?:-\d+)?)$/', $query, $m)) {
            return null;
        }

        $book = trim((string) $m['book']);
        $chapter = (string) $m['chapter'];
        $verses = (string) $m['verses'];

        $code = $this->providerNameToAlkitabMobiCode($book);
        if (! $code) {
            return null;
        }

        return sprintf('/tb/%s/%s/%s', $code, $chapter, $verses);
    }

    private function parseRawRef(string $raw): ?array
    {
        $s = Str::lower(trim($raw));
        if ($s === '') {
            return null;
        }

        // Normalize separators for robust handling:
        // 1ptr_3_1, 1ptr.3.1, 1ptr 3 1, 1ptr3:1
        $normalized = str_replace(['_', '.', ' ', ':'], '-', $s);
        $normalized = preg_replace('/-+/', '-', $normalized) ?? $normalized;

        // book-chapter-verse(-verseEnd)?
        if (preg_match('/^(?<book>[a-z0-9]+)-(?<ch>\d+)-(?<v1>\d+)(?:-(?<v2>\d+))?$/', $normalized, $m)) {
            return [
                'book' => (string) $m['book'],
                'chapter' => (int) $m['ch'],
                'verse_start' => (int) $m['v1'],
                'verse_end' => isset($m['v2']) && $m['v2'] !== '' ? (int) $m['v2'] : null,
                'has_verse' => true,
            ];
        }

        // book-chapter:verse or bookchapter:verse
        if (preg_match('/^(?<book>[a-z0-9]+)-?(?<ch>\d+):(?<v1>\d+)(?:-(?<v2>\d+))?$/', $s, $m)) {
            return [
                'book' => (string) $m['book'],
                'chapter' => (int) $m['ch'],
                'verse_start' => (int) $m['v1'],
                'verse_end' => isset($m['v2']) && $m['v2'] !== '' ? (int) $m['v2'] : null,
                'has_verse' => true,
            ];
        }

        // chapter-only: book-chapter
        if (preg_match('/^(?<book>[a-z0-9]+)-(?<ch>\d+)$/', $normalized, $m)) {
            return [
                'book' => (string) $m['book'],
                'chapter' => (int) $m['ch'],
                'verse_start' => 1,
                'verse_end' => null,
                'has_verse' => false,
            ];
        }

        return null;
    }

    private function bookMap(string $lang): array
    {
        $map = config("versehub_books.{$lang}");

        return is_array($map) ? $map : [];
    }

    private function bookAlias(string $book): ?string
    {
        $aliases = config('versehub_books.aliases');
        if (! is_array($aliases)) {
            return null;
        }
        $book = Str::lower(trim($book));
        $target = $aliases[$book] ?? null;

        return is_string($target) ? Str::lower(trim($target)) : null;
    }

    private function resolveBookCode(string $lang, string $book): ?string
    {
        $book = Str::lower(trim($book));
        $map = $this->bookMap($lang);
        if (array_key_exists($book, $map)) {
            return $book;
        }

        $alias = $this->bookAlias($book);
        if ($alias !== null && array_key_exists($alias, $map)) {
            return $alias;
        }

        return null;
    }

    private function bookCodeFromProviderName(string $lang, string $providerName): ?string
    {
        $providerName = Str::lower(trim($providerName));
        foreach ($this->bookMap($lang) as $code => $name) {
            if (Str::lower((string) $name) === $providerName) {
                return (string) $code;
            }
        }

        return null;
    }

    private function providerNameToAlkitabMobiCode(string $providerName): ?string
    {
        $providerName = Str::lower(trim($providerName));
        $map = [
            'genesis' => 'Kej',
            'exodus' => 'Kel',
            'leviticus' => 'Im',
            'numbers' => 'Bil',
            'deuteronomy' => 'Ul',
            'joshua' => 'Yos',
            'judges' => 'Hak',
            'ruth' => 'Rut',
            '1 samuel' => '1Sam',
            '2 samuel' => '2Sam',
            '1 kings' => '1Raj',
            '2 kings' => '2Raj',
            '1 chronicles' => '1Taw',
            '2 chronicles' => '2Taw',
            'ezra' => 'Ezr',
            'nehemiah' => 'Neh',
            'esther' => 'Est',
            'job' => 'Ayb',
            'psalms' => 'Mzm',
            'proverbs' => 'Ams',
            'ecclesiastes' => 'Pkh',
            'song of solomon' => 'Kid',
            'isaiah' => 'Yes',
            'jeremiah' => 'Yer',
            'lamentations' => 'Rat',
            'ezekiel' => 'Yeh',
            'daniel' => 'Dan',
            'hosea' => 'Hos',
            'joel' => 'Yoe',
            'amos' => 'Amo',
            'obadiah' => 'Oba',
            'jonah' => 'Yun',
            'micah' => 'Mik',
            'nahum' => 'Nah',
            'habakkuk' => 'Hab',
            'zephaniah' => 'Zef',
            'haggai' => 'Hag',
            'zechariah' => 'Zak',
            'malachi' => 'Mal',
            'matthew' => 'Mat',
            'mark' => 'Mrk',
            'luke' => 'Luk',
            'john' => 'Yoh',
            'acts' => 'Kis',
            'romans' => 'Rom',
            '1 corinthians' => '1Ko',
            '2 corinthians' => '2Ko',
            'galatians' => 'Gal',
            'ephesians' => 'Ef',
            'philippians' => 'Flp',
            'colossians' => 'Kol',
            '1 thessalonians' => '1Tes',
            '2 thessalonians' => '2Tes',
            '1 timothy' => '1Tim',
            '2 timothy' => '2Tim',
            'titus' => 'Tit',
            'philemon' => 'Flm',
            'hebrews' => 'Ibr',
            'james' => 'Yak',
            '1 peter' => '1Ptr',
            '2 peter' => '2Ptr',
            '1 john' => '1Yoh',
            '2 john' => '2Yoh',
            '3 john' => '3Yoh',
            'jude' => 'Yud',
            'revelation' => 'Why',
        ];

        return $map[$providerName] ?? null;
    }

    private function canonicalRedirectCode(): int
    {
        return app()->environment('local') ? 302 : 301;
    }

    /**
     * Parse alkitab.mobi TB HTML page and return a verse payload compatible with the existing view.
     */
    private function parseAlkitabMobiTbHtml(string $html): array
    {
        // Title contains reference in Indonesian.
        $reference = null;
        if (preg_match('/<title>\s*([^<]+)\s*\(TB\)\s*<\/title>/i', $html, $m)) {
            $reference = trim(html_entity_decode((string) $m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }

        // Extract the TB paragraph only.
        // Example snippet:
        // <p><strong><a ...><span class="reftext">TB:</span></a></strong> ...</p>
        $text = '';
        if (preg_match('/<p>\s*<strong>\s*<a[^>]*>\s*<span[^>]*>\s*TB:\s*<\/span>\s*<\/a>\s*<\/strong>\s*(?<text>.*?)<\/p>/is', $html, $m)) {
            $raw = (string) ($m['text'] ?? '');
            $raw = preg_replace('/<br\s*\/?>/i', "\n", $raw) ?? $raw;
            $raw = strip_tags($raw);
            $text = trim(html_entity_decode($raw, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }

        return [
            'reference' => $reference,
            'text' => $text,
            'translation_name' => 'TB',
            'provider' => 'alkitab.mobi',
        ];
    }

    private function renderOgPng(string $reference, string $text): string
    {
        return $this->renderGenericPremiumOg(
            $reference,
            $text,
            $this->ogThemeByType('verse'),
            'VERSEHUB  •  THEchosen TALKS'
        );
    }

    /**
     * Public helper to render Study Path OG images using the premium engine.
     */
    public function renderStudyPathOg(string $title, string $description, string $themeColor = 'amber'): string
    {
        $theme = $this->ogThemeByType('study', $themeColor);

        return $this->renderGenericPremiumOg($title, $description, $theme, 'VERSEHUB  •  STUDY PATH');
    }

    /**
     * Public helper to render chapter OG cards using a consistent template family.
     */
    public function renderChapterOg(string $title, string $description): string
    {
        return $this->renderGenericPremiumOg(
            $title,
            $description,
            $this->ogThemeByType('chapter'),
            'VERSEHUB  •  BIBLE CHAPTER'
        );
    }

    /**
     * Public helper to render Ask-the-Bible OG cards using a consistent template family.
     */
    public function renderAskOg(string $title, string $description): string
    {
        return $this->renderGenericPremiumOg(
            $title,
            $description,
            $this->ogThemeByType('ask'),
            'VERSEHUB  •  ASK THE BIBLE'
        );
    }

    public function renderGenericPremiumOg(string $title, string $subtitle, array $theme, string $topLabel): string
    {
        $w = 1200;
        $h = 630;
        $img = imagecreatetruecolor($w, $h);
        imagesavealpha($img, true);
        imagealphablending($img, true);
        $entityType = $this->ogEntityTypeFromLabel($topLabel);
        $typography = $this->ogTypographyProfile($entityType);

        // Use static background only for entity types that explicitly need it.
        $bgApplied = (($typography['use_static_bg'] ?? false) === true)
            ? $this->applyStaticBackground($img, $w, $h)
            : false;

        if (! $bgApplied) {
            // Gradient background based on theme.
            [$br, $bg, $bb] = $theme['bg'];
            for ($y = 0; $y < $h; $y++) {
                $t = $y / max(1, ($h - 1));
                $r = (int) round($br * (1 - $t) + ($br + 10) * $t);
                $g = (int) round($bg * (1 - $t) + ($bg + 10) * $t);
                $b = (int) round($bb * (1 - $t) + ($bb + 15) * $t);
                $col = imagecolorallocate($img, $r, $g, $b);
                imageline($img, 0, $y, $w, $y, $col);
            }

            // Luxury accent: soft glow
            [$ar, $ag, $ab] = $theme['accent'];
            imagefilledellipse(
                $img,
                200,
                200,
                800,
                800,
                imagecolorallocatealpha($img, $ar, $ag, $ab, 120)
            );
        }

        // Dark scrim for max text legibility.
        imagefilledrectangle(
            $img,
            0,
            0,
            $w,
            $h,
            imagecolorallocatealpha($img, 0, 0, 0, 60)
        );

        // Left vertical accent bar.
        [$ar, $ag, $ab] = $theme['accent'];
        imagefilledrectangle(
            $img,
            72,
            120,
            77,
            500,
            imagecolorallocatealpha($img, $ar, $ag, $ab, 30)
        );

        // Deterministic copy prep per entity type.
        [$titlePrepared, $subtitlePrepared] = $this->prepareOgCopy($title, $subtitle, $typography);

        // Render text with premium hierarchy + robust font fallback.
        $font = $this->findFont();
        if ($font) {
            // Brand label: small uppercase label top
            $labelColor = imagecolorallocatealpha($img, $ar, $ag, $ab, 20); // warm gold, semi-transparent
            imagettftext($img, (int) $typography['label_font_size'], 0, 96, 100, $labelColor, $font, $topLabel);

            // Title in large, bold white
            $titleColor = imagecolorallocate($img, 255, 252, 245);
            $titleLines = $this->wrapTtf(
                $titlePrepared,
                (int) $typography['title_font_size'],
                $font,
                (int) $typography['text_width']
            );
            $titleY = (int) $typography['title_start_y'];
            foreach (array_slice($titleLines, 0, (int) $typography['title_max_lines']) as $line) {
                imagettftext($img, (int) $typography['title_font_size'], 0, 96, $titleY, $titleColor, $font, $line);
                $titleY += (int) $typography['title_line_height'];
            }

            // A thin separator line beneath the title
            $sepY = $titleY + 12;
            imagefilledrectangle(
                $img,
                96,
                $sepY,
                96 + (int) $typography['separator_width'],
                $sepY + 1,
                imagecolorallocatealpha($img, $ar, $ag, $ab, 50)
            );

            // Subtitle text: slightly dimmed warm white, smaller
            $subColor = imagecolorallocatealpha($img, 235, 230, 220, 15);
            $subLines = $this->wrapTtf(
                $subtitlePrepared,
                (int) $typography['subtitle_font_size'],
                $font,
                (int) $typography['text_width']
            );
            $subY = $sepY + 36;
            foreach (array_slice($subLines, 0, (int) $typography['subtitle_max_lines']) as $line) {
                imagettftext($img, (int) $typography['subtitle_font_size'], 0, 96, $subY, $subColor, $font, $line);
                $subY += (int) $typography['subtitle_line_height'];
            }

            // Bottom watermark
            $wmColor = imagecolorallocatealpha($img, 255, 255, 255, 90);
            imagettftext($img, (int) $typography['watermark_font_size'], 0, $h - 36, 96, $wmColor, $font, 'thechoosentalks.org');
        } else {
            $this->renderBitmapFallback(
                $img,
                $w,
                $h,
                $topLabel,
                $titlePrepared,
                $subtitlePrepared,
                $ar,
                $ag,
                $ab
            );
        }

        ob_start();
        imagepng($img);
        $out = (string) ob_get_clean();
        imagedestroy($img);

        return $out;
    }

    private function applyStaticBackground(\GdImage $img, int $w, int $h): bool
    {
        // If the background doesn't exist (or is a tiny placeholder), generate a nice default.
        // This keeps OG previews looking premium out-of-the-box, while still letting you replace
        // the background file anytime.
        $this->ensureDefaultBackgroundExists();

        $candidates = [
            public_path('og/versehub-bg.png'),
            public_path('og/versehub-bg.jpg'),
            public_path('og/versehub-bg.jpeg'),
        ];

        $bg = null;
        foreach ($candidates as $path) {
            if (! file_exists($path)) {
                continue;
            }

            $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            try {
                if ($ext === 'png') {
                    $bg = @imagecreatefrompng($path);
                }
                if ($ext === 'jpg' || $ext === 'jpeg') {
                    $bg = @imagecreatefromjpeg($path);
                }
            } catch (\Throwable) {
                $bg = null;
            }

            if ($bg) {
                break;
            }
        }

        if (! $bg) {
            return false;
        }

        $srcW = imagesx($bg);
        $srcH = imagesy($bg);

        // Scale-to-fill (cover) then center-crop.
        $srcRatio = $srcW / max(1, $srcH);
        $dstRatio = $w / max(1, $h);

        if ($srcRatio > $dstRatio) {
            // source wider -> crop left/right
            $newW = (int) round($srcH * $dstRatio);
            $newH = $srcH;
            $srcX = (int) floor(($srcW - $newW) / 2);
            $srcY = 0;
        } else {
            // source taller -> crop top/bottom
            $newW = $srcW;
            $newH = (int) round($srcW / $dstRatio);
            $srcX = 0;
            $srcY = (int) floor(($srcH - $newH) / 2);
        }

        imagecopyresampled($img, $bg, 0, 0, $srcX, $srcY, $w, $h, $newW, $newH);
        imagedestroy($bg);

        return true;
    }

    private function ensureDefaultBackgroundExists(): void
    {
        $path = public_path('og/versehub-bg.png');

        $valid = false;
        if (file_exists($path)) {
            $info = @getimagesize($path);
            if (is_array($info)) {
                [$w, $h] = $info;
                // Treat very small images as placeholders that should be regenerated.
                $valid = ($w >= 800 && $h >= 400);
            }
        }

        if ($valid) {
            return;
        }

        $dir = dirname($path);
        if (! is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }

        $w = 1200;
        $h = 630;
        $im = imagecreatetruecolor($w, $h);
        imagesavealpha($im, true);
        imagealphablending($im, true);

        // Smooth vertical gradient
        for ($y = 0; $y < $h; $y++) {
            $t = $y / max(1, ($h - 1));
            $r = (int) round(11 * (1 - $t) + 15 * $t);
            $g = (int) round(18 * (1 - $t) + 42 * $t);
            $b = (int) round(32 * (1 - $t) + 79 * $t);
            $col = imagecolorallocate($im, $r, $g, $b);
            imageline($im, 0, $y, $w, $y, $col);
        }

        // Ambient shapes
        $c1 = imagecolorallocatealpha($im, 0, 166, 255, 105);
        imagefilledellipse($im, 270, 460, 720, 720, $c1);
        $c2 = imagecolorallocatealpha($im, 255, 255, 255, 122);
        imagefilledellipse($im, 980, 200, 520, 520, $c2);

        @imagepng($im, $path);
        imagedestroy($im);
    }

    private function findFont(): ?string
    {
        $fromEnv = trim((string) env('VERSEHUB_OG_FONT', ''));
        $fromEnvPath = $fromEnv !== '' ? base_path($fromEnv) : '';

        $candidates = [
            // Optional explicit pin via env (relative to project root)
            $fromEnvPath,

            // Bundled VerseHub brand fonts (recommended for deploy consistency)
            base_path('resources/fonts/og/VerseHubBrand-Regular.ttf'),
            base_path('resources/fonts/og/VerseHubBrand-Mono.ttf'),

            // Repo/local custom fonts (legacy candidates)
            base_path('resources/fonts/Canela-Regular.ttf'),
            base_path('resources/fonts/PlayfairDisplay-Regular.ttf'),
            base_path('resources/fonts/Inter-Regular.ttf'),
            public_path('fonts/Canela-Regular.ttf'),
            public_path('fonts/PlayfairDisplay-Regular.ttf'),
            public_path('fonts/Inter-Regular.ttf'),

            // Linux common fonts (cpanel/ubuntu/debian/alpine variants)
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
            '/usr/share/fonts/noto/NotoSans-Regular.ttf',

            // Windows local dev
            'C:\\Windows\\Fonts\\segoeui.ttf',
            'C:\\Windows\\Fonts\\arial.ttf',
        ];
        foreach ($candidates as $p) {
            if (file_exists($p)) {
                return $p;
            }
        }

        return null;
    }

    private function ogEntityTypeFromLabel(string $topLabel): string
    {
        $label = Str::lower(trim($topLabel));
        if (Str::contains($label, 'study path')) {
            return 'study';
        }
        if (Str::contains($label, 'bible chapter')) {
            return 'chapter';
        }
        if (Str::contains($label, 'ask the bible')) {
            return 'ask';
        }

        return 'verse';
    }

    private function ogTypographyProfile(string $entityType): array
    {
        $base = [
            'use_static_bg' => true,
            'label_font_size' => 13,
            'title_font_size' => 52,
            'title_start_y' => 200,
            'title_line_height' => 68,
            'title_max_lines' => 2,
            'title_max_chars' => 72,
            'subtitle_font_size' => 28,
            'subtitle_line_height' => 42,
            'subtitle_max_lines' => 4,
            'subtitle_max_chars' => 210,
            'watermark_font_size' => 14,
            'separator_width' => 354,
            'text_width' => 1000,
        ];

        if ($entityType === 'chapter') {
            return array_merge($base, [
                'use_static_bg' => true,
                'title_font_size' => 54,
                'title_max_chars' => 58,
                'subtitle_max_chars' => 170,
                'subtitle_font_size' => 27,
            ]);
        }

        if ($entityType === 'study') {
            return array_merge($base, [
                'use_static_bg' => false,
                'title_font_size' => 50,
                'title_max_chars' => 86,
                'subtitle_max_chars' => 200,
                'subtitle_font_size' => 27,
            ]);
        }

        if ($entityType === 'ask') {
            return array_merge($base, [
                'use_static_bg' => false,
                'title_font_size' => 46,
                'title_line_height' => 62,
                'title_max_chars' => 96,
                'subtitle_max_chars' => 220,
                'subtitle_font_size' => 27,
            ]);
        }

        // verse default
        return $base;
    }

    /**
     * Deterministic truncation: same copy always produces same result for a given OG entity profile.
     */
    private function prepareOgCopy(string $title, string $subtitle, array $profile): array
    {
        $titleText = $this->normalizeOgText($title);
        $subtitleText = $this->normalizeOgText($subtitle);

        $titleText = $this->truncateDeterministic($titleText, (int) ($profile['title_max_chars'] ?? 72));
        $subtitleText = $this->truncateDeterministic($subtitleText, (int) ($profile['subtitle_max_chars'] ?? 210));

        return [$titleText, $subtitleText];
    }

    private function normalizeOgText(string $text): string
    {
        $normalized = preg_replace('/\s+/u', ' ', trim($text)) ?? trim($text);

        return html_entity_decode($normalized, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private function truncateDeterministic(string $text, int $maxChars): string
    {
        if ($maxChars < 1) {
            return '';
        }

        if (mb_strlen($text, 'UTF-8') <= $maxChars) {
            return $text;
        }

        $slice = mb_substr($text, 0, max(1, $maxChars - 1), 'UTF-8');
        $slice = rtrim($slice, " \t\n\r\0\x0B.,;:!?");

        return $slice.'…';
    }

    /**
     * Last-resort bitmap text render (when TTF fonts are unavailable on host).
     * Keeps OG readable instead of blank.
     */
    private function renderBitmapFallback(\GdImage $img, int $w, int $h, string $label, string $title, string $subtitle, int $ar, int $ag, int $ab): void
    {
        $labelColor = imagecolorallocate($img, max(0, $ar - 10), max(0, $ag - 10), max(0, $ab - 10));
        $titleColor = imagecolorallocate($img, 248, 245, 239);
        $subColor = imagecolorallocate($img, 220, 216, 206);
        $wmColor = imagecolorallocate($img, 188, 188, 188);

        imagestring($img, 3, 96, 72, $this->truncateDeterministic($label, 56), $labelColor);

        $titleLines = $this->wrapBitmapText($title, 58);
        $y = 150;
        foreach (array_slice($titleLines, 0, 3) as $line) {
            imagestring($img, 5, 96, $y, $line, $titleColor);
            $y += 26;
        }

        $subtitleLines = $this->wrapBitmapText($subtitle, 86);
        $subY = $y + 22;
        foreach (array_slice($subtitleLines, 0, 4) as $line) {
            imagestring($img, 4, 96, $subY, $line, $subColor);
            $subY += 22;
        }

        imagestring($img, 2, 96, $h - 34, 'thechoosentalks.org', $wmColor);
    }

    private function wrapBitmapText(string $text, int $maxCharsPerLine): array
    {
        $words = preg_split('/\s+/u', trim($text)) ?: [];
        $lines = [];
        $line = '';

        foreach ($words as $word) {
            $candidate = $line === '' ? $word : $line.' '.$word;
            if (mb_strlen($candidate, 'UTF-8') > $maxCharsPerLine && $line !== '') {
                $lines[] = $line;
                $line = $word;
            } else {
                $line = $candidate;
            }
        }

        if ($line !== '') {
            $lines[] = $line;
        }

        return $lines;
    }

    /**
     * Centralized OG theme presets to keep premium visual language consistent.
     *
     * @param  string  $type  verse|chapter|study|ask
     * @param  string|null  $variant  Optional variant for study (amber/sky/green/rose).
     */
    private function ogThemeByType(string $type, ?string $variant = null): array
    {
        $type = Str::lower(trim($type));
        $variant = $variant ? Str::lower(trim($variant)) : null;

        if ($type === 'study') {
            $studyThemes = [
                'amber' => ['bg' => [45, 30, 10], 'accent' => [210, 175, 95]],
                'sky' => ['bg' => [10, 30, 45], 'accent' => [95, 175, 210]],
                'green' => ['bg' => [10, 45, 30], 'accent' => [95, 210, 175]],
                'rose' => ['bg' => [45, 10, 30], 'accent' => [210, 95, 175]],
            ];

            return $studyThemes[$variant ?? 'amber'] ?? $studyThemes['amber'];
        }

        if ($type === 'chapter') {
            return ['bg' => [15, 23, 42], 'accent' => [234, 179, 8]];
        }

        if ($type === 'ask') {
            return ['bg' => [22, 18, 38], 'accent' => [99, 179, 237]];
        }

        // verse default
        return ['bg' => [8, 14, 30], 'accent' => [210, 175, 95]];
    }

    private function publicUrl(string $path): string
    {
        $official = trim((string) config('ui.official_domain', ''));

        if ($official !== '') {
            $normalized = preg_match('/^https?:\/\//i', $official)
                ? $official
                : 'https://'.$official;

            return rtrim($normalized, '/').'/'.ltrim($path, '/');
        }

        return url($path);
    }

    /**
     * Very simple TTF wrap by words.
     */
    private function wrapTtf(string $text, int $fontSize, string $font, int $maxWidth): array
    {
        $words = preg_split('/\s+/', trim($text)) ?: [];
        $lines = [];
        $line = '';

        foreach ($words as $word) {
            $candidate = $line === '' ? $word : $line.' '.$word;
            $box = imagettfbbox($fontSize, 0, $font, $candidate);
            $w = $box ? abs($box[2] - $box[0]) : 0;
            if ($w > $maxWidth && $line !== '') {
                $lines[] = $line;
                $line = $word;
            } else {
                $line = $candidate;
            }
        }
        if ($line !== '') {
            $lines[] = $line;
        }

        return $lines;
    }
}
