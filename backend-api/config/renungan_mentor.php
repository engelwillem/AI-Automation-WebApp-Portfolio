<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Renungan Mentor Driver
    |--------------------------------------------------------------------------
    | "template" (default) keeps deterministic pipeline as the source output.
    | "openai" enables OpenAI Responses API as primary mentor engine.
    | "auto" will use OpenAI when OPENAI_API_KEY is present, otherwise template.
    */
    'driver' => env('RENUNGAN_MENTOR_DRIVER', 'template'),
    'auto_enable_openai_when_key_present' => (bool) env('RENUNGAN_MENTOR_AUTO_ENABLE_OPENAI', true),

    /*
    |--------------------------------------------------------------------------
    | Networking & Safety
    |--------------------------------------------------------------------------
    */
    'timeout_seconds' => (int) env('RENUNGAN_MENTOR_TIMEOUT_SECONDS', 20),
    'max_reflection_chars' => (int) env('RENUNGAN_MENTOR_MAX_REFLECTION_CHARS', 1800),

    /*
    |--------------------------------------------------------------------------
    | OpenAI
    |--------------------------------------------------------------------------
    */
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => env('RENUNGAN_OPENAI_MODEL', 'gpt-4o-mini'),
        'temperature' => (float) env('RENUNGAN_OPENAI_TEMPERATURE', 0.6),
        'max_output_tokens' => (int) env('RENUNGAN_OPENAI_MAX_OUTPUT_TOKENS', 700),
    ],
];
