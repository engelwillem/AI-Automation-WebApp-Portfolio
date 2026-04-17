<?php

namespace App\Services\Mentor;

use App\Services\AI\AIProviderInterface;
use App\Services\AI\PromptRegistry;
use Illuminate\Support\Str;

class OpenAIMentorDriver implements MentorDriverInterface
{
    public function __construct(
        private readonly AIProviderInterface $provider,
        private readonly PromptRegistry $prompts,
    ) {
    }

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
                    'content' => $this->prompts->system('versehub.mentor').' Return concise, scripture-centered Indonesian JSON only.',
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
        $threadTurns = collect((array) data_get($verseContext, 'thread_context.turns', []))
            ->filter(fn ($turn) => is_array($turn))
            ->map(function (array $turn): array {
                return [
                    'q' => trim((string) ($turn['q'] ?? '')),
                    'a' => trim((string) ($turn['a'] ?? '')),
                ];
            })
            ->filter(fn (array $turn) => $turn['q'] !== '' || $turn['a'] !== '')
            ->values()
            ->all();

        $payload = $this->requestJson(
            [
                [
                    'role' => 'system',
                    'content' => $this->prompts->system('versehub.mentor'),
                ],
                [
                    'role' => 'user',
                    'content' => sprintf(
                        "Pertanyaan: %s\nRujukan: %s\nTeks: %s\nMode: %s\nMood: %s\nIntent: %s\nRefleksi user: %s\nKembalikan JSON dengan keys: answer, interpretation, study_guidance, related_refs (array slug), confidence.",
                        trim($question),
                        $ref,
                        $text !== '' ? $text : '(tidak tersedia)',
                        (string) ($verseContext['assist_mode'] ?? 'explain_simply'),
                        trim((string) ($verseContext['mood'] ?? '')) !== '' ? trim((string) ($verseContext['mood'] ?? '')) : '(tidak tersedia)',
                        trim((string) ($verseContext['intent'] ?? '')) !== '' ? trim((string) ($verseContext['intent'] ?? '')) : '(tidak tersedia)',
                        trim((string) ($verseContext['user_reflection'] ?? '')) !== '' ? trim((string) ($verseContext['user_reflection'] ?? '')) : '(tidak tersedia)'
                    ),
                ],
                [
                    'role' => 'user',
                    'content' => 'Konteks sesi mentor sebelumnya (jika ada): '.json_encode([
                        'thread_context' => [
                            'session_id' => data_get($verseContext, 'thread_context.session_id'),
                            'turns' => $threadTurns,
                        ],
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
        $response = $this->provider->requestJson($messages, [
            'model' => (string) config('versehub_mentor.openai.model', 'gpt-4o-mini'),
            'temperature' => (float) config('versehub_mentor.openai.temperature', 0.4),
            'max_output_tokens' => (int) config('versehub_mentor.openai.max_tokens', 600),
            'format' => $format,
        ]);

        return (array) ($response['data'] ?? []);
    }
}
