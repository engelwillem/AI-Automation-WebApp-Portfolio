<?php

namespace App\Services\ShareAssets;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ShareOgImageGenerator
{
    /**
     * @param  array<string, mixed>  $sourceData
     * @param  array<string, mixed>  $shareCopy
     */
    public function generateIfMissing(
        string $surface,
        string $subjectId,
        string $revision,
        array $sourceData,
        array $shareCopy,
        ?string $existingImageUrl = null
    ): ?string {
        $existingImageUrl = trim((string) ($existingImageUrl ?? ''));
        if ($existingImageUrl !== '') {
            return $existingImageUrl;
        }

        $disk = Storage::disk('public');
        $relativePath = $this->buildRelativePath($surface, $subjectId, $revision);

        if ($disk->exists($relativePath)) {
            return $disk->url($relativePath);
        }

        $imageBinary = $this->tryGenerateAiImage($surface, $sourceData, $shareCopy);
        if (! is_string($imageBinary) || $imageBinary === '') {
            $imageBinary = $this->renderFallbackImage($surface, $sourceData, $shareCopy);
        }

        if (! is_string($imageBinary) || $imageBinary === '') {
            return null;
        }

        try {
            $disk->put($relativePath, $imageBinary, ['visibility' => 'public']);

            return $disk->url($relativePath);
        } catch (Throwable $e) {
            Log::warning('share_asset_image_store_failed', [
                'surface' => $surface,
                'subject_id' => $subjectId,
                'revision' => $revision,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function buildRelativePath(string $surface, string $subjectId, string $revision): string
    {
        $safeSurface = Str::lower(trim($surface));
        $subjectHash = substr(sha1($subjectId), 0, 12);

        return "share-assets/{$safeSurface}/{$subjectHash}/{$revision}.png";
    }

    /**
     * @param  array<string, mixed>  $sourceData
     * @param  array<string, mixed>  $shareCopy
     */
    private function tryGenerateAiImage(string $surface, array $sourceData, array $shareCopy): ?string
    {
        if (! $this->isAiImageEnabled()) {
            return null;
        }

        $apiKey = trim((string) config('ai.openai.api_key', ''));
        if ($apiKey === '') {
            return null;
        }

        $prompt = $this->buildAiImagePrompt($surface, $sourceData, $shareCopy);
        if ($prompt === '') {
            return null;
        }

        try {
            $response = Http::acceptJson()
                ->asJson()
                ->timeout(max(8, (int) config('share_assets.ai_image_timeout_seconds', 30)))
                ->withToken($apiKey)
                ->post('https://api.openai.com/v1/images/generations', [
                    'model' => (string) config('share_assets.image.model', 'gpt-image-1'),
                    'prompt' => $prompt,
                    'size' => (string) config('share_assets.image.size', '1536x1024'),
                    'quality' => (string) config('share_assets.image.quality', 'medium'),
                    'output_format' => 'png',
                ]);

            if (! $response->successful()) {
                return null;
            }

            $payload = $response->json();
            if (! is_array($payload)) {
                return null;
            }

            $base64 = data_get($payload, 'data.0.b64_json');
            if (is_string($base64) && trim($base64) !== '') {
                $decoded = base64_decode($base64, true);
                if (is_string($decoded) && $decoded !== '') {
                    return $this->ensureOgCanvas($decoded);
                }
            }

            $url = data_get($payload, 'data.0.url');
            if (is_string($url) && filter_var($url, FILTER_VALIDATE_URL)) {
                $download = Http::timeout(20)->get($url);
                if ($download->successful()) {
                    $body = $download->body();
                    if ($body !== '') {
                        return $this->ensureOgCanvas($body);
                    }
                }
            }
        } catch (Throwable $e) {
            Log::warning('share_asset_ai_image_failed', [
                'surface' => $surface,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $sourceData
     * @param  array<string, mixed>  $shareCopy
     */
    private function buildAiImagePrompt(string $surface, array $sourceData, array $shareCopy): string
    {
        $title = trim((string) ($shareCopy['title'] ?? ''));
        $description = trim((string) ($shareCopy['description'] ?? ''));
        $reference = trim((string) ($sourceData['verse_reference'] ?? ''));
        $verseText = Str::limit(trim((string) ($sourceData['verse_text'] ?? '')), 180, '…');
        $postText = Str::limit(trim((string) ($sourceData['post_text'] ?? '')), 180, '…');

        $surfaceDirection = match ($surface) {
            'versehub' => 'Scripture-inspired visual for Christian Bible verse sharing. Calm, reverent, uplifting, no people faces.',
            'renungan' => 'Personal spiritual reflection visual. Soft light, contemplative, warm, peaceful, no explicit text in image.',
            'community' => 'Christian community encouragement visual. Warm, hopeful, empathetic, modern editorial style.',
            default => 'Warm, uplifting spiritual editorial visual.',
        };

        return trim(implode("\n", array_filter([
            $surfaceDirection,
            $title !== '' ? "Headline context: {$title}" : null,
            $description !== '' ? "Summary context: {$description}" : null,
            $reference !== '' ? "Verse reference: {$reference}" : null,
            $verseText !== '' ? "Verse excerpt: {$verseText}" : null,
            $postText !== '' ? "Post excerpt: {$postText}" : null,
            'Output requirements: premium composition for Open Graph preview, landscape, high contrast readability space, no watermark, no logos, no UI chrome, no random typography.',
        ])));
    }

    /**
     * @param  array<string, mixed>  $sourceData
     * @param  array<string, mixed>  $shareCopy
     */
    private function renderFallbackImage(string $surface, array $sourceData, array $shareCopy): ?string
    {
        if (! function_exists('imagecreatetruecolor')) {
            return null;
        }

        $width = 1200;
        $height = 630;
        $image = imagecreatetruecolor($width, $height);
        if (! $image) {
            return null;
        }

        [$r1, $g1, $b1, $r2, $g2, $b2] = $this->gradientPalette($surface);
        $this->fillGradient($image, $width, $height, [$r1, $g1, $b1], [$r2, $g2, $b2]);

        $overlay = imagecolorallocatealpha($image, 0, 0, 0, 70);
        imagefilledrectangle($image, 70, 70, $width - 70, $height - 70, $overlay);

        $title = trim((string) ($shareCopy['title'] ?? ''));
        $description = trim((string) ($shareCopy['description'] ?? ''));
        $reference = trim((string) ($sourceData['verse_reference'] ?? ''));
        if ($title === '') {
            $title = $reference !== '' ? $reference : 'The Chosen Talks';
        }
        if ($description === '') {
            $description = trim((string) ($sourceData['verse_text'] ?? ''));
        }
        if ($description === '') {
            $description = 'Bagikan penguatan firman hari ini.';
        }
        $description = Str::limit($description, 180, '…');

        $white = imagecolorallocate($image, 255, 255, 255);
        $muted = imagecolorallocate($image, 226, 232, 240);

        $font = 5;
        imagestring($image, $font, 110, 120, Str::upper($surface), $muted);
        imagestring($image, $font, 110, 180, Str::upper(Str::limit($title, 80, '...')), $white);

        $lines = $this->wrapText($description, 75);
        $y = 250;
        foreach ($lines as $line) {
            imagestring($image, 4, 110, $y, $line, $muted);
            $y += 28;
            if ($y > 520) {
                break;
            }
        }

        if ($reference !== '') {
            imagestring($image, 4, 110, 560, Str::upper($reference), $white);
        }

        ob_start();
        imagepng($image);
        $binary = (string) ob_get_clean();
        imagedestroy($image);

        return $binary !== '' ? $binary : null;
    }

    private function isAiImageEnabled(): bool
    {
        return (bool) config('share_assets.ai.image_enabled', false);
    }

    /**
     * @param  array<int, int>  $start
     * @param  array<int, int>  $end
     */
    private function fillGradient($image, int $width, int $height, array $start, array $end): void
    {
        for ($y = 0; $y < $height; $y++) {
            $ratio = $height > 1 ? $y / ($height - 1) : 0;
            $r = (int) round($start[0] + (($end[0] - $start[0]) * $ratio));
            $g = (int) round($start[1] + (($end[1] - $start[1]) * $ratio));
            $b = (int) round($start[2] + (($end[2] - $start[2]) * $ratio));
            $color = imagecolorallocate($image, $r, $g, $b);
            imageline($image, 0, $y, $width, $y, $color);
        }
    }

    /**
     * @return array<int, int>
     */
    private function gradientPalette(string $surface): array
    {
        return match ($surface) {
            'versehub' => [8, 47, 73, 15, 23, 42],
            'renungan' => [67, 56, 202, 30, 58, 138],
            'community' => [12, 74, 110, 3, 31, 60],
            default => [30, 41, 59, 15, 23, 42],
        };
    }

    /**
     * @return array<int, string>
     */
    private function wrapText(string $text, int $lineLength): array
    {
        $wrapped = wordwrap(preg_replace('/\s+/', ' ', trim($text)) ?: '', $lineLength, "\n");
        return array_values(array_filter(array_map('trim', explode("\n", $wrapped))));
    }

    private function ensureOgCanvas(string $binary): ?string
    {
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagecreatetruecolor')) {
            return $binary;
        }

        $source = @imagecreatefromstring($binary);
        if (! $source) {
            return $binary;
        }

        $targetW = 1200;
        $targetH = 630;
        $target = imagecreatetruecolor($targetW, $targetH);
        if (! $target) {
            imagedestroy($source);
            return $binary;
        }

        $srcW = imagesx($source);
        $srcH = imagesy($source);
        if ($srcW < 1 || $srcH < 1) {
            imagedestroy($source);
            imagedestroy($target);
            return $binary;
        }

        $srcRatio = $srcW / $srcH;
        $dstRatio = $targetW / $targetH;

        if ($srcRatio > $dstRatio) {
            $cropH = $srcH;
            $cropW = (int) round($srcH * $dstRatio);
            $srcX = (int) floor(($srcW - $cropW) / 2);
            $srcY = 0;
        } else {
            $cropW = $srcW;
            $cropH = (int) round($srcW / $dstRatio);
            $srcX = 0;
            $srcY = (int) floor(($srcH - $cropH) / 2);
        }

        imagecopyresampled($target, $source, 0, 0, $srcX, $srcY, $targetW, $targetH, $cropW, $cropH);

        ob_start();
        imagepng($target);
        $output = (string) ob_get_clean();

        imagedestroy($source);
        imagedestroy($target);

        return $output !== '' ? $output : $binary;
    }
}

