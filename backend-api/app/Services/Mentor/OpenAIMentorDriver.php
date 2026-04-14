<?php

namespace App\Services\Mentor;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class OpenAIMentorDriver implements MentorDriverInterface
{
    public function getInsights(
        string $bookCode,
        int $chapter,
        int $verse,
        string $text = ''
    ): array {
        $payload = $this->requestJson(
            [
                [
                    'role' => 'system',
                    'content' => 'You are Scripture Guide. Return concise, scripture-centered Indonesian JSON only.',
                ],
                [
                    'role' => 'user',
                    'content' => sprintf(
                        "Buat insight ayat untuk %s %d:%d.\nTeks: %s\nKembalikan JSON dengan keys: reflection_questions (array 2-3), theme_connections (array 2-3), historical_context (string|null).",
                        $bookCode,
                        $chapter,
                        $verse,
                        trim($text) !== '' ? $text : '(tidak tersedia)'
                    ),
                ],
            ],
            [
                'type' => 'json_schema',
                'name' => 'versehub_insights',
                'schema' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => ['reflection_questions', 'theme_connections', 'historical_context'],
                    'properties' => [
                        'reflection_questions' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                            'minItems' => 2,
                            'maxItems' => 4,
                        ],
                        'theme_connections' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                            'minItems' => 2,
                            'maxItems' => 4,
                        ],
                        'historical_context' => [
                            'type' => ['string', 'null'],
                        ],
                    ],
                ],
            ]
        );

        return [
            'reflection_questions' => collect($payload['reflection_questions'] ?? [])
                ->filter(fn ($v) => is_string($v) && trim($v) !== '')
                ->values()
                ->all(),
            'theme_connections' => collect($payload['theme_connections'] ?? [])
                ->filter(fn ($v) => is_string($v) && trim($v) !== '')
                ->values()
                ->all(),
            'historical_context' => is_string($payload['historical_context'] ?? null)
                ? trim((string) $payload['historical_context'])
                : null,
        ];
    }

    public function answerQuestion(string $question, array $verseContext): array
    {
        $ref = (string) ($verseContext['ref'] ?? 'ayat ini');
        $text = trim((string) ($verseContext['text'] ?? ''));

        $payload = $this->requestJson(
            [
                [
                    'role' => 'system',
                    'content' => 'You are Scripture Guide. Keep answer scripture-based, transparent, concise, and non-authoritarian.',
                ],
                [
                    'role' => 'user',
                    'content' => sprintf(
                        "Pertanyaan: %s\nRujukan: %s\nTeks: %s\nKembalikan JSON dengan keys: answer, interpretation, study_guidance, related_refs (array slug), confidence.",
                        trim($question),
                        $ref,
                        $text !== '' ? $text : '(tidak tersedia)'
                    ),
                ],
            ],
            [
                'type' => 'json_schema',
                'name' => 'versehub_answer',
                'schema' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => ['answer', 'interpretation', 'study_guidance', 'related_refs', 'confidence'],
                    'properties' => [
                        'answer' => ['type' => 'string'],
                        'interpretation' => ['type' => ['string', 'null']],
                        'study_guidance' => ['type' => ['string', 'null']],
                        'related_refs' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                        ],
                        'confidence' => ['type' => 'string'],
                    ],
                ],
            ]
        );

        return [
            'answer' => trim((string) ($payload['answer'] ?? '')),
            'interpretation' => is_string($payload['interpretation'] ?? null)
                ? trim((string) $payload['interpretation'])
                : null,
            'study_guidance' => is_string($payload['study_guidance'] ?? null)
                ? trim((string) $payload['study_guidance'])
                : null,
            'related_refs' => collect($payload['related_refs'] ?? [])
                ->filter(fn ($v) => is_string($v) && trim($v) !== '')
                ->map(fn (string $v) => Str::lower(trim($v)))
                ->values()
                ->all(),
            'confidence' => trim((string) ($payload['confidence'] ?? 'interpretive')) ?: 'interpretive',
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $messages
     * @param  array<string, mixed>  $format
     * @return array<string, mixed>
     */
    private function requestJson(array $messages, array $format): array
    {
        $apiKey = trim((string) config('versehub_mentor.openai.api_key'));
        if ($apiKey === '') {
            throw new RuntimeException('VERSEHUB mentor OpenAI API key is not configured.');
        }

        $response = Http::acceptJson()
            ->asJson()
            ->timeout(20)
            ->withToken($apiKey)
            ->post('https://api.openai.com/v1/responses', [
                'model' => (string) config('versehub_mentor.openai.model', 'gpt-4o-mini'),
                'input' => $messages,
                'temperature' => (float) config('versehub_mentor.openai.temperature', 0.4),
                'max_output_tokens' => (int) config('versehub_mentor.openai.max_tokens', 600),
                'text' => [
                    'format' => $format,
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('OpenAI responses request failed with status '.$response->status());
        }

        $json = $response->json();
        if (! is_array($json)) {
            throw new RuntimeException('OpenAI responses payload is not JSON object.');
        }

        $outputText = trim((string) Arr::get($json, 'output_text', ''));
        if ($outputText === '') {
            $outputText = trim((string) Arr::get($json, 'output.0.content.0.text', ''));
        }

        $parsed = json_decode($outputText, true);
        if (! is_array($parsed)) {
            throw new RuntimeException('OpenAI responses output is not valid JSON.');
        }

        return $parsed;
    }
}

