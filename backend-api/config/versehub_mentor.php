<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Scripture Guide Driver
    |--------------------------------------------------------------------------
    | Controls which driver powers the Mentor System.
    |   "template" — Curated template-based responses (default, no external API)
    |   "openai"   — OpenAI GPT via OPENAI_API_KEY env var
    |   "claude"   — Anthropic Claude via ANTHROPIC_API_KEY env var
    |   "auto"     — OpenAI when key exists, otherwise template
    */
    'driver' => env('VERSEHUB_MENTOR_DRIVER', 'template'),
    'auto_enable_openai_when_key_present' => (bool) env('VERSEHUB_MENTOR_AUTO_ENABLE_OPENAI', true),

    /*
    |--------------------------------------------------------------------------
    | Cache TTL (seconds)
    |--------------------------------------------------------------------------
    | How long to cache Mentor insights per verse ref.
    | Default: 86400 (24 hours). Set to 0 to disable caching.
    */
    'cache_ttl' => (int) env('VERSEHUB_MENTOR_CACHE_TTL', 86400),

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    | Maximum "Ask" requests per authenticated user per hour.
    */
    'ask_rate_limit' => (int) env('VERSEHUB_MENTOR_ASK_RATE_LIMIT', 10),

    /*
    |--------------------------------------------------------------------------
    | Transparency Label
    |--------------------------------------------------------------------------
    | The label shown to identify the Scripture Guide in the UI.
    | CRITICAL: Never remove or make this invisible. Trust is the product.
    */
    'label' => 'Scripture Guide',
    'label_id' => 'Panduan Alkitab',
    'disclaimer_id' => 'Panduan belajar berbasis teks Alkitab — bukan manusia, bukan otoritas teologis resmi.',
    'disclaimer_en' => 'A scripture-based study companion — not a human, not an official theological authority.',

    /*
    |--------------------------------------------------------------------------
    | OpenAI Config (only used when driver = "openai")
    |--------------------------------------------------------------------------
    */
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => env('VERSEHUB_OPENAI_MODEL', 'gpt-4o-mini'),
        'max_tokens' => 600,
        'temperature' => 0.4,
    ],

    /*
    |--------------------------------------------------------------------------
    | Anthropic Config (only used when driver = "claude")
    |--------------------------------------------------------------------------
    */
    'claude' => [
        'api_key' => env('ANTHROPIC_API_KEY'),
        'model' => env('VERSEHUB_CLAUDE_MODEL', 'claude-3-haiku-20240307'),
        'max_tokens' => 600,
    ],
];
