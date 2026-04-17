<?php

namespace App\Console\Commands;

use App\Models\BibleVerse;
use App\Services\ShareAssets\Revision\VersehubShareRevision;
use App\Services\ShareAssets\ShareAssetService;
use App\Services\VerseHubDailyService;
use App\Support\VerseHubHomeVerse;
use App\Support\VerseHubWelcomeVerse;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class WarmVersehubShareAssetsCommand extends Command
{
    protected $signature = 'app:warm-versehub-share-assets
        {--lang=id : Language to warm}
        {--include-config-list=1 : Include refs from config(versehub_home_verses)}
        {--limit=120 : Safety cap for warmed refs in one run}';

    protected $description = 'Pre-generate VerseHub share assets (text + OG image) for refs, skipping already-ready revisions.';

    public function __construct(
        private readonly ShareAssetService $shareAssetService,
        private readonly VerseHubDailyService $verseHubDailyService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $lang = Str::lower(trim((string) $this->option('lang')));
        if (! in_array($lang, ['id', 'en'], true)) {
            $this->error("Unsupported lang: {$lang}");
            return self::FAILURE;
        }

        $limit = max(1, min(500, (int) $this->option('limit')));
        $includeConfig = ((string) $this->option('include-config-list')) === '1';

        $refs = [];

        $homeVerse = VerseHubHomeVerse::get($lang, []);
        if (is_array($homeVerse) && is_string($homeVerse['ref'] ?? null)) {
            $refs[] = Str::lower(trim((string) $homeVerse['ref']));
        }

        $welcomeVerse = VerseHubWelcomeVerse::get($lang, [], array_filter($refs));
        if (is_array($welcomeVerse) && is_string($welcomeVerse['ref'] ?? null)) {
            $refs[] = Str::lower(trim((string) $welcomeVerse['ref']));
        }

        $dailyVerse = $this->verseHubDailyService->getTodayDailyVerse(null, $lang);
        if (is_array($dailyVerse) && is_string($dailyVerse['ref'] ?? null)) {
            $refs[] = Str::lower(trim((string) $dailyVerse['ref']));
        }

        if ($includeConfig) {
            $configRefs = config("versehub_home_verses.{$lang}", []);
            if (is_array($configRefs)) {
                foreach ($configRefs as $ref) {
                    if (! is_string($ref)) {
                        continue;
                    }
                    $refs[] = Str::lower(trim($ref));
                }
            }
        }

        $refs = collect($refs)
            ->filter(fn (string $ref) => preg_match('/^[a-z0-9]+-\d+-\d+$/', $ref) === 1)
            ->unique()
            ->take($limit)
            ->values()
            ->all();

        if (empty($refs)) {
            $this->info('No verse refs to warm.');
            return self::SUCCESS;
        }

        $warmed = 0;
        $failed = 0;

        foreach ($refs as $ref) {
            [$bookCode, $chapter, $verse] = explode('-', $ref);
            $row = BibleVerse::query()
                ->where('lang', $lang)
                ->where('provider', 'ayt')
                ->where('book_code', $bookCode)
                ->where('chapter', (int) $chapter)
                ->where('verse', (int) $verse)
                ->first(['text', 'reference', 'book_code', 'chapter', 'verse']);

            if (! $row) {
                $failed++;
                $this->warn("missing_verse: {$ref}");
                continue;
            }

            $slug = "{$bookCode}-{$chapter}-{$verse}";
            $verseText = trim((string) ($row->text ?? ''));
            $reference = trim((string) ($row->reference ?? $slug));
            $promptVersion = (string) config('share_assets.prompt_version', 'v1');
            $styleVersion = (string) config('share_assets.style_version', 'v1');

            $revision = VersehubShareRevision::compute(
                lang: $lang,
                slug: $slug,
                verseText: $verseText,
                translationName: null,
                provider: 'ayt',
                promptVersion: $promptVersion,
                styleVersion: $styleVersion,
            );

            $result = $this->shareAssetService->prepare(
                surface: 'versehub',
                subjectId: "{$lang}:{$slug}",
                revision: $revision,
                sourceData: [
                    'verse_reference' => $reference,
                    'verse_text' => $verseText,
                    'translation_name' => null,
                    'provider' => 'ayt',
                    'link' => "/versehub/{$lang}/{$slug}",
                ],
                sourceImageUrl: null,
                subjectType: 'versehub_verse',
                lang: $lang,
            );

            if (($result['status'] ?? '') === 'ready') {
                $warmed++;
                $this->line("ready: {$slug} rev={$revision} cache=".((bool) ($result['from_cache'] ?? false) ? '1' : '0'));
            } else {
                $failed++;
                $this->warn("failed: {$slug}");
            }
        }

        $this->info("Warm complete. ready={$warmed} failed={$failed} refs=".count($refs));
        return self::SUCCESS;
    }
}
