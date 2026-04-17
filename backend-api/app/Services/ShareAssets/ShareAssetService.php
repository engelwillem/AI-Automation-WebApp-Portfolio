<?php

namespace App\Services\ShareAssets;

use App\Models\ShareAsset;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Orchestrates share asset prepare flow.
 *
 * RULES:
 *  - If a ready asset with the same revision already exists → return immediately (no re-generation)
 *  - If concurrency: only one request generates; others wait and read the fresh result
 *  - If AI fails → persist fallback copy as 'ready' so OG route always has something
 *  - If DB write fails → return in-memory result so share flow is never blocked
 */
class ShareAssetService
{
    private const LOCK_TTL_SECONDS = 20;
    private const LOCK_WAIT_SECONDS = 18;

    public function __construct(
        private readonly ShareCopyGenerator $copyGenerator,
        private readonly ?ShareOgImageGenerator $ogImageGenerator = null,
    ) {}

    /**
     * Prepare (or retrieve cached) share asset.
     *
     * @param  array<string, mixed>  $sourceData
     * @return array{
     *   status: string,
     *   revision: string,
     *   asset_id: int|null,
     *   share_title: string|null,
     *   share_description: string|null,
     *   share_eyebrow: string|null,
     *   final_og_image_url: string|null,
     *   from_cache: bool,
     * }
     */
    public function prepare(
        string $surface,
        string $subjectId,
        string $revision,
        array $sourceData,
        ?string $sourceImageUrl = null,
        ?string $subjectType = null,
        string $lang = 'id',
    ): array {
        $promptVersion = (string) config('share_assets.prompt_version', 'v1');
        $styleVersion  = (string) config('share_assets.style_version', 'v1');

        // 1. Fast path: ready asset already exists for this revision
        if ((bool) config('share_assets.cache_ready', true)) {
            $existing = ShareAsset::findReady($surface, $subjectId, $revision);
            if ($existing) {
                if (trim((string) $existing->resolveOgImageUrl()) === '') {
                    $generatedUrl = $this->ensureOgImage(
                        surface: $surface,
                        subjectId: $subjectId,
                        revision: $revision,
                        sourceData: $sourceData,
                        shareTitle: (string) ($existing->share_title ?? ''),
                        shareDescription: (string) ($existing->share_description ?? ''),
                        shareEyebrow: (string) ($existing->share_eyebrow ?? ''),
                        currentImageUrl: null,
                    );
                    if (is_string($generatedUrl) && trim($generatedUrl) !== '') {
                        $existing->forceFill([
                            'generated_image_url' => $generatedUrl,
                            'final_og_image_url' => $generatedUrl,
                        ])->save();
                        $existing->refresh();
                    }
                }

                return $this->formatResult($existing, fromCache: true);
            }
        }

        // 2. Acquire lock to prevent concurrent generation for the same asset
        $lockKey = "share_asset_lock:{$surface}:{$subjectId}:{$revision}";
        $lock    = Cache::lock($lockKey, self::LOCK_TTL_SECONDS);

        try {
            // Block briefly; if another process holds the lock, wait for it to release
            if (! $lock->block(self::LOCK_WAIT_SECONDS)) {
                // Could not acquire lock → another process is generating; try to read result
                $produced = ShareAsset::findReady($surface, $subjectId, $revision);
                if ($produced) {
                    return $this->formatResult($produced, fromCache: true);
                }

                // Still not ready after wait — return a minimal pending result so caller can fallback
                return $this->pendingResult($revision, $sourceImageUrl);
            }

            // Lock acquired — re-check in case another worker just finished while we were waiting
            $existing = ShareAsset::findReady($surface, $subjectId, $revision);
            if ($existing) {
                return $this->formatResult($existing, fromCache: true);
            }

            // 3. Mark as pending before generation (protects against partial failures)
            $this->upsertStatus($surface, $subjectId, $revision, 'pending', $subjectType, $lang, $promptVersion, $styleVersion, $sourceImageUrl);

            // 4. Generate copy (AI or fallback)
            $copy = $this->copyGenerator->generate($surface, $sourceData);
            $finalOgImageUrl = $this->ensureOgImage(
                surface: $surface,
                subjectId: $subjectId,
                revision: $revision,
                sourceData: $sourceData,
                shareTitle: (string) ($copy['title'] ?? ''),
                shareDescription: (string) ($copy['description'] ?? ''),
                shareEyebrow: (string) ($copy['eyebrow'] ?? ''),
                currentImageUrl: $sourceImageUrl,
            );

            // 5. Persist final ready asset
            $asset = ShareAsset::query()->updateOrCreate(
                [
                    'surface'    => $surface,
                    'subject_id' => $subjectId,
                    'revision'   => $revision,
                ],
                [
                    'subject_type'       => $subjectType,
                    'lang'               => $lang,
                    'prompt_version'     => $promptVersion,
                    'style_version'      => $styleVersion,
                    'status'             => 'ready',
                    'share_title'        => $copy['title'],
                    'share_description'  => $copy['description'],
                    'share_eyebrow'      => $copy['eyebrow'],
                    'source_image_url'   => $sourceImageUrl,
                    'generated_image_url' => ($finalOgImageUrl && $sourceImageUrl !== $finalOgImageUrl) ? $finalOgImageUrl : null,
                    'final_og_image_url' => $finalOgImageUrl,
                    'og_style'           => $this->resolveOgStyle($surface, $sourceData),
                    'error_message'      => null,
                    'failure_count'      => 0,
                ]
            );

            return $this->formatResult($asset, fromCache: false);
        } catch (Throwable $e) {
            Log::warning('share_asset_prepare_failed', [
                'surface'    => $surface,
                'subject_id' => $subjectId,
                'revision'   => $revision,
                'error'      => $e->getMessage(),
            ]);

            // Try to mark as failed (without crashing)
            try {
                $this->upsertStatus($surface, $subjectId, $revision, 'failed', $subjectType, $lang, $promptVersion, $styleVersion, $sourceImageUrl, $e->getMessage());
            } catch (Throwable) {
                // Non-fatal
            }

            // Return safe in-memory fallback without calling AI again.
            $fallback = $this->buildSafeFallbackCopy($surface, $sourceData);

            return [
                'status'            => 'failed',
                'revision'          => $revision,
                'asset_id'          => null,
                'share_title'       => $fallback['title'],
                'share_description' => $fallback['description'],
                'share_eyebrow'     => $fallback['eyebrow'],
                'final_og_image_url' => $sourceImageUrl,
                'from_cache'        => false,
            ];
        } finally {
            $lock->forceRelease();
        }
    }

    /**
     * Read a ready asset by surface + subject + revision (for OG routes).
     * Returns null if not found — caller should use template fallback.
     */
    public function readReady(string $surface, string $subjectId, string $revision): ?ShareAsset
    {
        return ShareAsset::findReady($surface, $subjectId, $revision);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function formatResult(ShareAsset $asset, bool $fromCache): array
    {
        return [
            'status'            => $asset->status,
            'revision'          => $asset->revision,
            'asset_id'          => $asset->id,
            'share_title'       => $asset->share_title,
            'share_description' => $asset->share_description,
            'share_eyebrow'     => $asset->share_eyebrow,
            'final_og_image_url' => $asset->resolveOgImageUrl(),
            'from_cache'        => $fromCache,
        ];
    }

    /** @return array<string, mixed> */
    private function pendingResult(string $revision, ?string $sourceImageUrl): array
    {
        return [
            'status'            => 'pending',
            'revision'          => $revision,
            'asset_id'          => null,
            'share_title'       => null,
            'share_description' => null,
            'share_eyebrow'     => null,
            'final_og_image_url' => $sourceImageUrl,
            'from_cache'        => false,
        ];
    }

    private function upsertStatus(
        string $surface,
        string $subjectId,
        string $revision,
        string $status,
        ?string $subjectType,
        string $lang,
        string $promptVersion,
        string $styleVersion,
        ?string $sourceImageUrl,
        ?string $errorMessage = null,
    ): void {
        ShareAsset::query()->updateOrCreate(
            ['surface' => $surface, 'subject_id' => $subjectId, 'revision' => $revision],
            array_filter([
                'subject_type'      => $subjectType,
                'lang'              => $lang,
                'prompt_version'    => $promptVersion,
                'style_version'     => $styleVersion,
                'status'            => $status,
                'source_image_url'  => $sourceImageUrl,
                'error_message'     => $errorMessage,
            ], fn ($v) => $v !== null)
        );
    }

    /** @param array<string, mixed> $sourceData */
    private function resolveOgStyle(string $surface, array $sourceData): string
    {
        return match ($surface) {
            'versehub'  => 'scripture',
            'renungan'  => 'scripture',
            'community' => empty($sourceData['media_paths']) ? 'scripture' : 'media',
            default     => 'scripture',
        };
    }

    /**
     * @param  array<string, mixed> $sourceData
     * @return array{title: string, description: string, eyebrow: string}
     */
    private function buildSafeFallbackCopy(string $surface, array $sourceData): array
    {
        return match ($surface) {
            'renungan' => [
                'title'       => (string) ($sourceData['verse_reference'] ?? 'Renungan Pribadi'),
                'description' => 'Satu firman yang menemani hari ini dari The Chosen Talks.',
                'eyebrow'     => 'Renungan Hari Ini',
            ],
            'versehub' => [
                'title'       => (string) ($sourceData['verse_reference'] ?? 'VerseHub'),
                'description' => 'Firman yang dibagikan dari The Chosen Talks.',
                'eyebrow'     => 'Firman Hari Ini',
            ],
            'community' => [
                'title'       => 'Dari Komunitas',
                'description' => 'Cerita dan refleksi yang menguatkan dari anggota komunitas.',
                'eyebrow'     => 'Community Share',
            ],
            default => [
                'title'       => 'The Chosen Talks',
                'description' => 'Komunitas iman digital yang hangat dan relevan.',
                'eyebrow'     => 'The Chosen Talks',
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $sourceData
     */
    private function ensureOgImage(
        string $surface,
        string $subjectId,
        string $revision,
        array $sourceData,
        string $shareTitle,
        string $shareDescription,
        string $shareEyebrow,
        ?string $currentImageUrl
    ): ?string {
        $generator = $this->ogImageGenerator ?? app(ShareOgImageGenerator::class);
        $finalUrl = $generator->generateIfMissing(
            surface: $surface,
            subjectId: $subjectId,
            revision: $revision,
            sourceData: $sourceData,
            shareCopy: [
                'title' => $shareTitle,
                'description' => $shareDescription,
                'eyebrow' => $shareEyebrow,
            ],
            existingImageUrl: $currentImageUrl
        );

        $finalUrl = trim((string) ($finalUrl ?? ''));
        if ($finalUrl !== '') {
            return $finalUrl;
        }

        $fallback = trim((string) ($currentImageUrl ?? ''));
        return $fallback !== '' ? $fallback : null;
    }
}
