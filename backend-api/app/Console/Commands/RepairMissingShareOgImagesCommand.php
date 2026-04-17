<?php

namespace App\Console\Commands;

use App\Models\BibleVerse;
use App\Models\MemberPost;
use App\Models\RenunganShareSnapshot;
use App\Models\ShareAsset;
use App\Services\ShareAssets\ShareAssetService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

use const FILTER_VALIDATE_URL;

class RepairMissingShareOgImagesCommand extends Command
{
    protected $signature = 'app:repair-missing-share-og
        {--limit=300 : Max rows processed per run}
        {--surface= : Optional filter: versehub|renungan|community}';

    protected $description = 'Backfill missing OG image URL for ready share assets safely (idempotent).';

    public function __construct(
        private readonly ShareAssetService $shareAssetService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $limit = max(1, min(2000, (int) $this->option('limit')));
        $surfaceFilter = trim((string) $this->option('surface'));
        if ($surfaceFilter !== '' && ! in_array($surfaceFilter, ['versehub', 'renungan', 'community'], true)) {
            $this->error('Invalid --surface value. Allowed: versehub|renungan|community');
            return self::FAILURE;
        }

        $query = ShareAsset::query()
            ->where('status', 'ready')
            ->where(function ($q): void {
                $q->whereNull('final_og_image_url')
                    ->orWhere('final_og_image_url', '');
            })
            ->orderBy('id');

        if ($surfaceFilter !== '') {
            $query->where('surface', $surfaceFilter);
        }

        $rows = $query->limit($limit)->get();
        if ($rows->isEmpty()) {
            $this->info('No ready share assets with missing OG image.');
            return self::SUCCESS;
        }

        $ok = 0;
        $skip = 0;
        $fail = 0;

        foreach ($rows as $asset) {
            $prepared = $this->prepareSourcePayload($asset);
            if (! is_array($prepared)) {
                $skip++;
                $this->warn("skip id={$asset->id} surface={$asset->surface} reason=source_not_found");
                continue;
            }

            try {
                $result = $this->shareAssetService->prepare(
                    surface: (string) $asset->surface,
                    subjectId: (string) $asset->subject_id,
                    revision: (string) $asset->revision,
                    sourceData: (array) $prepared['sourceData'],
                    sourceImageUrl: isset($prepared['sourceImageUrl']) ? (string) $prepared['sourceImageUrl'] : null,
                    subjectType: isset($prepared['subjectType']) ? (string) $prepared['subjectType'] : (string) ($asset->subject_type ?? ''),
                    lang: isset($prepared['lang']) ? (string) $prepared['lang'] : (string) ($asset->lang ?? 'id'),
                );

                $finalOg = trim((string) ($result['final_og_image_url'] ?? ''));
                if ($finalOg !== '') {
                    $ok++;
                    $this->line("ok id={$asset->id} surface={$asset->surface}");
                } else {
                    $fail++;
                    $this->warn("fail id={$asset->id} surface={$asset->surface} reason=empty_og_after_prepare");
                }
            } catch (\Throwable $e) {
                $fail++;
                $this->warn("fail id={$asset->id} surface={$asset->surface} err=".$e->getMessage());
            }
        }

        $this->info("repair done processed={$rows->count()} ok={$ok} skip={$skip} fail={$fail}");
        return self::SUCCESS;
    }

    /**
     * @return array{sourceData: array<string, mixed>, sourceImageUrl?: string, subjectType?: string, lang?: string}|null
     */
    private function prepareSourcePayload(ShareAsset $asset): ?array
    {
        return match ((string) $asset->surface) {
            'versehub' => $this->prepareVersehubPayload($asset),
            'renungan' => $this->prepareRenunganPayload($asset),
            'community' => $this->prepareCommunityPayload($asset),
            default => null,
        };
    }

    /**
     * @return array{sourceData: array<string, mixed>, sourceImageUrl?: string, subjectType?: string, lang?: string}|null
     */
    private function prepareVersehubPayload(ShareAsset $asset): ?array
    {
        $subjectId = (string) $asset->subject_id; // lang:slug
        if (! str_contains($subjectId, ':')) {
            return null;
        }
        [$lang, $slug] = explode(':', $subjectId, 2);
        $lang = Str::lower(trim((string) $lang));
        $slug = Str::lower(trim((string) $slug));

        if (! preg_match('/^([a-z0-9]+)-(\d+)-(\d+)$/', $slug, $m)) {
            return null;
        }

        $row = BibleVerse::query()
            ->where('lang', $lang)
            ->where('provider', 'ayt')
            ->where('book_code', (string) $m[1])
            ->where('chapter', (int) $m[2])
            ->where('verse', (int) $m[3])
            ->first(['text', 'reference']);

        if (! $row) {
            return null;
        }

        return [
            'sourceData' => [
                'verse_reference' => (string) ($row->reference ?? $slug),
                'verse_text' => (string) ($row->text ?? ''),
                'translation_name' => null,
                'provider' => 'ayt',
                'link' => "/versehub/{$lang}/{$slug}",
            ],
            'subjectType' => 'versehub_verse',
            'lang' => $lang,
        ];
    }

    /**
     * @return array{sourceData: array<string, mixed>, sourceImageUrl?: string, subjectType?: string, lang?: string}|null
     */
    private function prepareRenunganPayload(ShareAsset $asset): ?array
    {
        $token = (string) $asset->subject_id;
        $snapshot = RenunganShareSnapshot::query()->where('token', $token)->first();
        if (! $snapshot) {
            return null;
        }

        return [
            'sourceData' => [
                'verse_reference' => (string) $snapshot->verse_reference,
                'verse_text' => (string) $snapshot->verse_text,
                'meditation_excerpt' => (string) $snapshot->meditation_excerpt,
                'theme' => (string) ($snapshot->theme ?? ''),
                'link' => "/renungan/share/{$token}",
            ],
            'subjectType' => 'renungan_snapshot',
            'lang' => (string) ($snapshot->lang ?? 'id'),
        ];
    }

    /**
     * @return array{sourceData: array<string, mixed>, sourceImageUrl?: string, subjectType?: string, lang?: string}|null
     */
    private function prepareCommunityPayload(ShareAsset $asset): ?array
    {
        $postId = (int) $asset->subject_id;
        if ($postId < 1) {
            return null;
        }

        $post = MemberPost::query()->with('user:id,name')->find($postId);
        if (! $post) {
            return null;
        }

        $mediaPaths = (array) ($post->media_paths ?? []);
        $previewIndex = isset($post->metadata['preview_media_index']) ? (int) $post->metadata['preview_media_index'] : 0;
        $sourcePath = $mediaPaths[$previewIndex] ?? $mediaPaths[0] ?? null;
        $sourceUrl = null;
        if (is_string($sourcePath) && trim($sourcePath) !== '') {
            $raw = trim($sourcePath);
            if (filter_var($raw, FILTER_VALIDATE_URL)) {
                $sourceUrl = $raw;
            }
        }

        return [
            'sourceData' => [
                'post_text' => (string) ($post->text ?? ''),
                'post_type' => (string) ($post->type?->value ?? 'user_post'),
                'author_name' => (string) ($post->user?->name ?? 'Member'),
                'media_paths' => $mediaPaths,
                'link' => "/community/posts/{$postId}/share",
            ],
            'sourceImageUrl' => $sourceUrl ?? '',
            'subjectType' => 'community_post',
            'lang' => 'id',
        ];
    }
}
