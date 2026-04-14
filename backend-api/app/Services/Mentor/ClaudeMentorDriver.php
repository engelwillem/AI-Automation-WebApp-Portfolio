<?php

namespace App\Services\Mentor;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class ClaudeMentorDriver implements MentorDriverInterface
{
    public function getInsights(string $bookCode, int $chapter, int $verse, string $text = ''): array
    {
        $result = $this->requestJson(sprintf(
            "Buat insight ayat untuk %s %d:%d.\nTeks: %s\nBalas JSON dengan keys: reflection_questions (array 2-3), theme_connections (array 2-3), historical_context (string|null).",
            $bookCode,
            $chapter,
            $verse,
            trim($text) !== '' ? $text : '(tidak tersedia)'
        ));

        return [
            'reflection_questions' => collect($result['reflection_questions'] ?? [])
                ->filter(fn ($v) => is_string($v) && trim($v) !== '')
                ->values()
                ->all(),
            'theme_connections' => collect($result['theme_connections'] ?? [])
                ->filter(fn ($v) => is_string($v) && trim($v) !== '')
                ->values()
                ->all(),
            'historical_context' => is_string($result['historical_context'] ?? null)
                ? trim((string) $result['historical_context'])
                : null,
        ];
    }

    public function answerQuestion(string $question, array $verseContext): array
    {
        $result = $this->requestJson(sprintf(
            "Pertanyaan: %s\nRujukan: %s\nTeks: %s\nBalas JSON dengan keys: answer, interpretation, study_guidance, related_refs (array slug), confidence.",
            trim($question),
            (string) ($verseContext['ref'] ?? 'ayat ini'),
            trim((string) ($verseContext['text'] ?? '')) ?: '(tidak tersedia)'
        ));

        return [
            'answer' => trim((string) ($result['answer'] ?? '')),
            'interpretation' => is_string($result['interpretation'] ?? null)
                ? trim((string) $result['interpretation'])
                : null,
            'study_guidance' => is_string($result['study_guidance'] ?? null)
                ? trim((string) $result['study_guidance'])
                : null,
            'related_refs' => collect($result['related_refs'] ?? [])
                ->filter(fn ($v) => is_string($v) && trim($v) !== '')
                ->map(fn (string $v) => Str::lower(trim($v)))
                ->values()
                ->all(),
            'confidence' => trim((string) ($result['confidence'] ?? 'interpretive')) ?: 'interpretive',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function requestJson(string $prompt): array
    {
        $apiKey = trim((string) config('versehub_mentor.claude.api_key'));
        if ($apiKey === '') {
            throw new RuntimeException('VERSEHUB mentor Claude API key is not configured.');
        }

        $response = Http::acceptJson()
            ->asJson()
            ->timeout(20)
            ->withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
            ])
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => (string) config('versehub_mentor.claude.model', 'claude-3-haiku-20240307'),
                'max_tokens' => (int) config('versehub_mentor.claude.max_tokens', 600),
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => $prompt."\nHanya keluarkan JSON valid tanpa markdown.",
                    ],
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Claude request failed with status '.$response->status());
        }

        $json = $response->json();
        if (! is_array($json)) {
            throw new RuntimeException('Claude payload is not JSON object.');
        }

        $text = trim((string) data_get($json, 'content.0.text', ''));
        $parsed = json_decode($text, true);
        if (! is_array($parsed)) {
            throw new RuntimeException('Claude output is not valid JSON.');
        }

        return $parsed;
    }
}

