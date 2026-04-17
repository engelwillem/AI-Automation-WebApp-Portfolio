<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Share Asset Generation Feature Flags
    |--------------------------------------------------------------------------
    */

    'enabled' => (bool) env('SHARE_ASSETS_ENABLED', true),

    'ai' => [
        'text_enabled' => (bool) env('SHARE_ASSETS_AI_TEXT_ENABLED', true),
        'image_enabled' => (bool) env('SHARE_ASSETS_AI_IMAGE_ENABLED', false),
    ],

    'image' => [
        'model' => env('SHARE_ASSETS_AI_IMAGE_MODEL', 'gpt-image-1'),
        'size' => env('SHARE_ASSETS_AI_IMAGE_SIZE', '1536x1024'),
        'quality' => env('SHARE_ASSETS_AI_IMAGE_QUALITY', 'medium'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Versioning
    |--------------------------------------------------------------------------
    | Bump these when you change prompts or OG visual templates globally.
    | Any existing share_assets rows with old versions will be regenerated.
    */

    'prompt_version' => env('SHARE_ASSETS_PROMPT_VERSION', 'v1'),
    'style_version'  => env('SHARE_ASSETS_STYLE_VERSION', 'v1'),

    /*
    |--------------------------------------------------------------------------
    | Cache / Reuse
    |--------------------------------------------------------------------------
    | If a ready asset exists for the same surface+subject+revision, skip
    | generation and return the cached asset immediately.
    */

    'cache_ready' => (bool) env('SHARE_ASSETS_CACHE_READY', true),

    /*
    |--------------------------------------------------------------------------
    | Timeouts
    |--------------------------------------------------------------------------
    */

    'ai_text_timeout_seconds'  => (int) env('SHARE_ASSETS_AI_TEXT_TIMEOUT', 12),
    'ai_image_timeout_seconds' => (int) env('SHARE_ASSETS_AI_IMAGE_TIMEOUT', 30),

];
