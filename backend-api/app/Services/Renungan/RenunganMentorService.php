<?php

namespace App\Services\Renungan;

use Illuminate\Support\Str;
use Throwable;

class RenunganMentorService
{
    public function __construct(
        private OpenAIRenunganMentorDriver $openAIDriver,
        private TemplateRenunganMentorDriver $templateDriver
    ) {
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array{
     *   mentor_opening: string,
     *   meditation: string,
     *   prayer_prompt: string,
     *   follow_up_question: string,
     *   confidence: string,
     *   safety_notes: array<int, string>,
     *   request_id: string|null,
     *   meta: array<string, mixed>
     * }
     */
    public function generate(array $context): array
    {
        $driverName = $this->resolveDriverName();
        $startedAt = microtime(true);
        $fallbackReason = null;

        if ($driverName === 'openai') {
            try {
                $result = $this->openAIDriver->generate($this->trimContextForModel($context));
                $normalized = $this->normalizeResult($result, $context);

                return $normalized + [
                    'meta' => [
                        'driver' => 'openai',
                        'model' => (string) config('renungan_mentor.openai.model', 'gpt-4o-mini'),
                        'used_fallback' => false,
                        'fallback_reason' => null,
                        'latency_ms' => $this->elapsedMs($startedAt),
                    ],
                ];
            } catch (Throwable $e) {
                $fallbackReason = Str::limit($e->getMessage(), 180, '');
            }
        }

        $fallback = $this->normalizeResult(
            $this->templateDriver->generate($context),
            $context
        );

        return $fallback + [
            'meta' => [
                'driver' => $driverName === 'openai' ? 'openai' : 'template',
                'model' => $driverName === 'openai'
                    ? (string) config('renungan_mentor.openai.model', 'gpt-4o-mini')
                    : null,
                'used_fallback' => true,
                'fallback_reason' => $fallbackReason ?? ($driverName === 'template' ? 'template_driver_selected' : 'unknown'),
                'latency_ms' => $this->elapsedMs($startedAt),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function trimContextForModel(array $context): array
    {
        $maxChars = max(300, (int) config('renungan_mentor.max_reflection_chars', 1800));
        $reflection = trim((string) ($context['reflection_text'] ?? ''));
        $context['reflection_text'] = Str::limit(
            preg_replace('/\s+/', ' ', $reflection) ?? $reflection,
            $maxChars,
            '…'
        );

        return $context;
    }

    /**
     * @param  array<string, mixed>  $result
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function normalizeResult(array $result, array $context): array
    {
        $legacyMeditation = trim((string) ($context['legacy_meditation'] ?? ''));

        $meditation = trim((string) ($result['meditation'] ?? ''));
        if ($meditation === '') {
            $meditation = $legacyMeditation;
        }

        $mentorOpening = trim((string) ($result['mentor_opening'] ?? ''));
        if ($mentorOpening === '') {
            $mentorOpening = 'Terima kasih sudah membuka hati. Tuhan melihat pergumulanmu dan menyertaimu.';
        }

        $prayerPrompt = trim((string) ($result['prayer_prompt'] ?? ''));
        if ($prayerPrompt === '') {
            $prayerPrompt = 'Tuhan, tuntun aku berjalan setia hari ini, dengan hati yang tenang dan jujur.';
        }

        $followUpQuestion = trim((string) ($result['follow_up_question'] ?? ''));
        if ($followUpQuestion === '') {
            $followUpQuestion = 'Langkah kecil apa yang bisa kamu lakukan hari ini sebagai respons iman?';
        }

        $confidence = strtolower(trim((string) ($result['confidence'] ?? 'medium')));
        if (! in_array($confidence, ['low', 'medium', 'high'], true)) {
            $confidence = 'medium';
        }

        $safetyNotes = collect($result['safety_notes'] ?? [])
            ->filter(fn ($value) => is_string($value) && trim($value) !== '')
            ->values()
            ->all();

        return [
            'mentor_opening' => $mentorOpening,
            'meditation' => $meditation,
            'prayer_prompt' => $prayerPrompt,
            'follow_up_question' => $followUpQuestion,
            'confidence' => $confidence,
            'safety_notes' => $safetyNotes,
            'request_id' => is_string($result['request_id'] ?? null) && trim((string) $result['request_id']) !== ''
                ? trim((string) $result['request_id'])
                : null,
        ];
    }

    private function elapsedMs(float $startedAt): int
    {
        return (int) round((microtime(true) - $startedAt) * 1000);
    }

    private function resolveDriverName(): string
    {
        $configuredDriver = strtolower((string) config('renungan_mentor.driver', 'template'));
        if ($configuredDriver === 'openai') {
            return 'openai';
        }

        if ($configuredDriver === 'auto') {
            return $this->shouldAutoEnableOpenAI() ? 'openai' : 'template';
        }

        if ($configuredDriver === 'template' && $this->shouldAutoEnableOpenAI()) {
            return 'openai';
        }

        return 'template';
    }

    private function shouldAutoEnableOpenAI(): bool
    {
        if (! (bool) config('renungan_mentor.auto_enable_openai_when_key_present', true)) {
            return false;
        }

        return trim((string) config('renungan_mentor.openai.api_key', '')) !== '';
    }
}
