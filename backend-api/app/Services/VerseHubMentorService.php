<?php

namespace App\Services;

use App\Models\StudyPath;
use App\Models\UserMentorSession;
use App\Models\VerseRelationship;
use App\Models\VerseThemeMapping;
use App\Services\Mentor\MentorDriverInterface;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Scripture Guide — VerseHub Mentor Service.
 *
 * Routes all insight and Q&A requests through a swappable driver.
 * Configure via config/versehub_mentor.php → driver.
 *
 * TRANSPARENCY RULE: Every public response MUST be attributable to
 * "Scripture Guide" with a visible disclaimer. Never remove labels.
 */
class VerseHubMentorService
{
    public function __construct(private MentorDriverInterface $driver) {}

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Get guided study insights for a single verse.
     * Cached upstream in VerseHubController (24h TTL).
     */
    public function getGuidedInsights(string $bookCode, int $chapter, int $verse, string $text = ''): array
    {
        try {
            $insights = $this->driver->getInsights($bookCode, $chapter, $verse, $text);
        } catch (\Throwable $e) {
            Log::warning('VerseHubMentorService: driver fallback triggered', ['error' => $e->getMessage()]);
            $insights = $this->fallbackInsights();
        }

        return array_merge($insights, [
            'mentor_label' => config('versehub_mentor.label', 'Scripture Guide'),
            'disclaimer_id' => config('versehub_mentor.disclaimer_id'),
        ]);
    }

    /**
     * Answer a free-text question about a verse.
     * Optionally records the session if a user is provided.
     *
     * @param  array  $verseContext  ['ref', 'text', 'book', 'chapter', 'verse', 'lang']
     */
    public function askScriptureGuide(
        string $question,
        array $verseContext = [],
        ?Authenticatable $user = null
    ): array {
        try {
            $result = $this->driver->answerQuestion($question, $verseContext);
        } catch (\Throwable $e) {
            Log::warning('VerseHubMentorService: ask fallback triggered', ['error' => $e->getMessage()]);
            $result = $this->fallbackAnswer($question);
        }

        $normalized = $this->normalizeAskResult($result, $verseContext);

        // Record session if authenticated.
        if ($user && isset($verseContext['ref'])) {
            try {
                UserMentorSession::create([
                    'user_id' => $user->getAuthIdentifier(),
                    'verse_ref' => $verseContext['ref'],
                    'session_type' => 'ask',
                    'summary' => mb_substr((string) ($normalized['answer'] ?? ''), 0, 500),
                    'metadata' => [
                        'question' => $question,
                        'related_refs' => $normalized['related_refs'] ?? [],
                        'confidence' => $normalized['confidence'] ?? 'unknown',
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::error('VerseHubMentorService: failed to record session', ['error' => $e->getMessage()]);
            }
        }

        return array_merge($normalized, [
            'mentor_label' => config('versehub_mentor.label', 'Scripture Guide'),
            'disclaimer_id' => config('versehub_mentor.disclaimer_id'),
        ]);
    }

    /**
     * Provide denominational context for a passage.
     * Backed by a curated data layer — not driver-dependent (always template).
     */
    public function getDenominationalContext(string $bookCode, int $chapter, int $verse): array
    {
        $key = "{$bookCode}-{$chapter}-{$verse}";

        // Curated high-tension passages. Expand over time.
        $contested = [
            'yoh-6-53' => [
                'summary' => "Ayat ini tentang 'makan daging dan minum darah' Kristus dipahami sangat berbeda antar tradisi.",
                'traditions' => [
                    ['name' => 'Katolik & Ortodoks', 'view' => 'Kehadiran nyata (Real Presence) Kristus dalam Ekaristi — dipahami secara literal.'],
                    ['name' => 'Lutheran', 'view' => "Kehadiran sejati Kristus 'di dalam, bersama, dan di bawah' roti dan anggur (konsubstansiasi)."],
                    ['name' => 'Reformed/Calvinis', 'view' => 'Kehadiran spiritual — Kristus hadir secara rohani, bukan fisik, dalam Perjamuan.'],
                    ['name' => 'Baptist & Evangelikal', 'view' => 'Simbol peringatan — roti dan anggur adalah lambang, bukan transformasi literal.'],
                ],
            ],
            'rom-9-18' => [
                'summary' => 'Roma 9 adalah pusat perdebatan tentang predestinasi dan kehendak bebas manusia.',
                'traditions' => [
                    ['name' => 'Calvinis/Reformed', 'view' => 'Pemilihan tanpa syarat — Allah memilih siapa yang selamat berdasarkan kedaulatan-Nya semata.'],
                    ['name' => 'Arminian', 'view' => 'Prapengetahuan Allah (foreknowledge) tentang iman manusia menjadi dasar pemilihan.'],
                    ['name' => 'Molinisme', 'view' => 'Pengetahuan tengah (middle knowledge) — Allah memilih berdasarkan apa yang manusia akan pilih di conditionals.'],
                ],
            ],
        ];

        if (array_key_exists($key, $contested)) {
            return $contested[$key];
        }

        return [
            'summary' => 'Ayat ini umumnya dipahami serupa di berbagai tradisi Kristen.',
            'traditions' => [
                ['name' => 'Tradisi Umum', 'view' => 'Penekanan pada panggilan untuk hidup sesuai karakter Kristus yang terlihat dalam teks ini.'],
            ],
        ];
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private function fallbackInsights(): array
    {
        return [
            'reflection_questions' => [
                'Apa kata atau frasa yang paling menonjol bagimu dalam ayat ini?',
                'Bagaimana ayat ini berkaitan dengan konteks di sekitarnya?',
            ],
            'theme_connections' => ['Kasih Allah', 'Kesetiaan'],
            'historical_context' => null,
        ];
    }

    private function fallbackAnswer(string $question): array
    {
        return [
            'answer' => 'Cobalah membaca ayat ini dalam konteks penuh pasalnya — konteks sering memberikan jawaban yang lebih kaya dari interpretasi yang berdiri sendiri.',
            'related_refs' => [],
            'confidence' => 'uncertain',
        ];
    }

    private function normalizeAskResult(array $result, array $verseContext): array
    {
        $answer = trim((string) ($result['answer'] ?? ''));
        $interpretation = trim((string) ($result['interpretation'] ?? ''));
        $studyGuidance = trim((string) ($result['study_guidance'] ?? ''));
        $relatedRefs = collect($result['related_refs'] ?? [])
            ->filter(fn ($value) => is_string($value) && trim($value) !== '')
            ->map(fn (string $value) => Str::lower(trim($value)))
            ->values()
            ->all();

        $anchorRef = isset($verseContext['ref']) && is_string($verseContext['ref'])
            ? Str::lower(trim($verseContext['ref']))
            : null;
        $anchorText = isset($verseContext['text']) && is_string($verseContext['text'])
            ? trim($verseContext['text'])
            : '';
        $anchorTextExcerpt = $anchorText !== ''
            ? Str::limit(preg_replace('/\s+/', ' ', $anchorText) ?? $anchorText, 220, '…')
            : null;

        return [
            'answer' => $answer,
            'interpretation' => $interpretation !== '' ? $interpretation : null,
            'study_guidance' => $studyGuidance !== '' ? $studyGuidance : null,
            'related_refs' => $relatedRefs,
            'confidence' => (string) ($result['confidence'] ?? 'interpretive'),
            'scripture_basis' => [
                'anchor_ref' => $anchorRef,
                'anchor_text_excerpt' => $anchorTextExcerpt,
                'related_refs' => $relatedRefs,
            ],
            'sections' => [
                'biblical_text' => $anchorTextExcerpt,
                'interpretation' => $interpretation !== '' ? $interpretation : null,
                'study_guidance' => $studyGuidance !== '' ? $studyGuidance : null,
            ],
        ];
    }

    /**
     * Get explicit relationships for a verse.
     */
    public function getRelationships(string $verseRef): array
    {
        return VerseRelationship::where('from_ref', $verseRef)
            ->orWhere('to_ref', $verseRef)
            ->get()
            ->map(function ($rel) use ($verseRef) {
                $isSource = $rel->from_ref === $verseRef;

                return [
                    'ref' => $isSource ? $rel->to_ref : $rel->from_ref,
                    'type' => $rel->relation_type,
                    'direction' => $isSource ? 'to' : 'from',
                    'strength' => $rel->strength,
                ];
            })->toArray();
    }

    /**
     * Get thematic mappings for a verse.
     */
    public function getThemes(string $verseRef): array
    {
        return VerseThemeMapping::query()
            ->with('theme')
            ->where('verse_ref', $verseRef)
            ->orderBy('sort_order')
            ->get()
            ->map(function ($mapping) {
                $theme = $mapping->theme;
                if (! $theme) {
                    return null;
                }

                return [
                    'slug' => $theme->slug,
                    'name_id' => $theme->title_id,
                    'name_en' => $theme->title_en,
                ];
            })
            ->filter()
            ->values()
            ->toArray();
    }

    /**
     * Check if a verse is part of user's active study paths.
     */
    public function getActiveStudyPaths(?Authenticatable $user, string $verseRef): array
    {
        if (! $user) {
            return [];
        }

        return StudyPath::whereHas('steps', function ($query) use ($verseRef) {
            $query->where('verse_ref', $verseRef);
        })
            ->whereHas('userProgress', function ($query) use ($user) {
                $query->where('user_id', $user->getAuthIdentifier())
                    ->whereNull('completed_at');
            })
            ->get()
            ->map(function ($path) {
                return [
                    'slug' => $path->slug,
                    'title' => $path->title_id,
                    'difficulty' => $path->difficulty,
                ];
            })->toArray();
    }
}
