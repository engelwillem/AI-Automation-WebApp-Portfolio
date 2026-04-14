<?php

namespace App\Services\Renungan;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class OpenAIRenunganMentorDriver implements RenunganMentorDriverInterface
{
    public function generate(array $context): array
    {
        $apiKey = trim((string) config('renungan_mentor.openai.api_key'));
        if ($apiKey === '') {
            throw new RuntimeException('OpenAI API key is not configured for renungan mentor.');
        }

        $reflectionText = trim((string) ($context['reflection_text'] ?? ''));
        $verseReference = trim((string) ($context['verse_reference'] ?? ''));
        $verseText = trim((string) ($context['verse_text'] ?? ''));
        $analysis = (array) ($context['analysis'] ?? []);
        $interpretation = (array) ($context['interpretation'] ?? []);

        $response = Http::acceptJson()
            ->asJson()
            ->timeout(max(5, (int) config('renungan_mentor.timeout_seconds', 20)))
            ->withToken($apiKey)
            ->post('https://api.openai.com/v1/responses', [
                'model' => (string) config('renungan_mentor.openai.model', 'gpt-4o-mini'),
                'temperature' => (float) config('renungan_mentor.openai.temperature', 0.6),
                'max_output_tokens' => (int) config('renungan_mentor.openai.max_output_tokens', 700),
                'input' => [
                    [
                        'role' => 'system',
                        'content' => implode("\n", [
                            'Anda adalah Pendamping Renungan AI berbahasa Indonesia.',
                            'Nada wajib: hangat, tenang, restrained, tidak manipulatif, tidak menghakimi.',
                            'Dasar utama: teks Alkitab yang diberikan; jangan klaim wahyu pribadi.',
                            'Jangan memberi instruksi ekstrem atau nasihat kesehatan mental profesional.',
                            'Keluaran HARUS JSON valid sesuai skema.',
                        ]),
                    ],
                    [
                        'role' => 'user',
                        'content' => json_encode([
                            'reflection_text' => $reflectionText,
                            'verse' => [
                                'reference' => $verseReference,
                                'text' => $verseText,
                            ],
                            'analysis' => [
                                'primary_theme' => (string) ($analysis['primary_theme'] ?? ''),
                                'primary_emotion' => (string) ($analysis['primary_emotion'] ?? ''),
                                'intent' => (string) ($analysis['intent'] ?? ''),
                            ],
                            'interpretation' => [
                                'verse_main_message' => (string) ($interpretation['verse_main_message'] ?? ''),
                                'pastoral_application' => (string) ($interpretation['pastoral_application'] ?? ''),
                                'hope_direction' => (string) ($interpretation['hope_direction'] ?? ''),
                                'correction_direction' => (string) ($interpretation['correction_direction'] ?? ''),
                            ],
                            'instruction' => 'Kembalikan JSON dengan key mentor_opening, meditation, prayer_prompt, follow_up_question, confidence(low|medium|high), safety_notes(array string).',
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ],
                ],
                'text' => [
                    'format' => [
                        'type' => 'json_schema',
                        'name' => 'renungan_mentor_response',
                        'schema' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'required' => [
                                'mentor_opening',
                                'meditation',
                                'prayer_prompt',
                                'follow_up_question',
                                'confidence',
                                'safety_notes',
                            ],
                            'properties' => [
                                'mentor_opening' => ['type' => 'string'],
                                'meditation' => ['type' => 'string'],
                                'prayer_prompt' => ['type' => 'string'],
                                'follow_up_question' => ['type' => 'string'],
                                'confidence' => ['type' => 'string'],
                                'safety_notes' => [
                                    'type' => 'array',
                                    'items' => ['type' => 'string'],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('OpenAI responses request failed with status '.$response->status());
        }

        $payload = $response->json();
        if (! is_array($payload)) {
            throw new RuntimeException('OpenAI responses payload is not JSON object.');
        }

        $text = trim((string) Arr::get($payload, 'output_text', ''));
        if ($text === '') {
            $text = trim((string) Arr::get($payload, 'output.0.content.0.text', ''));
        }

        $parsed = json_decode($text, true);
        if (! is_array($parsed)) {
            throw new RuntimeException('OpenAI responses output is not valid JSON.');
        }

        return [
            'mentor_opening' => trim((string) ($parsed['mentor_opening'] ?? '')),
            'meditation' => trim((string) ($parsed['meditation'] ?? '')),
            'prayer_prompt' => trim((string) ($parsed['prayer_prompt'] ?? '')),
            'follow_up_question' => trim((string) ($parsed['follow_up_question'] ?? '')),
            'confidence' => Str::lower(trim((string) ($parsed['confidence'] ?? 'medium'))),
            'safety_notes' => collect($parsed['safety_notes'] ?? [])
                ->filter(fn ($value) => is_string($value) && trim($value) !== '')
                ->values()
                ->all(),
            'request_id' => $response->header('x-request-id'),
        ];
    }
}

