<?php

namespace Tests\Feature;

use Tests\TestCase;

class RenunganPersonalizationPipelineQualityTest extends TestCase
{
    public function test_personalization_returns_structured_generation_pipeline(): void
    {
        $response = $this->postJson('/api/v1/renungan/personalize', [
            'text' => 'saya mau jadi kaya raya',
            'lang' => 'id',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'meditation',
                'verse' => ['reference', 'text'],
                'analysis',
                'generation' => [
                    'intent_summary',
                    'heart_diagnosis',
                    'pastoral_angle',
                    'outline' => ['opening', 'body', 'closing'],
                    'quality' => ['passed', 'reasons'],
                ],
            ],
        ]);

        $meditation = (string) $response->json('data.meditation');
        $this->assertStringContainsString('kaya raya', mb_strtolower($meditation));
    }

    public function test_short_ambiguous_input_still_gets_non_empty_guided_output(): void
    {
        $response = $this->postJson('/api/v1/renungan/personalize', [
            'text' => 'bingung',
            'lang' => 'id',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.analysis.primary_theme', fn (mixed $value) => is_string($value) && $value !== '');
        $response->assertJsonPath('data.generation.quality.passed', fn (mixed $value) => is_bool($value));

        $meditation = (string) $response->json('data.meditation');
        $this->assertGreaterThanOrEqual(90, strlen($meditation));
        $this->assertStringContainsString('bingung', mb_strtolower($meditation));
    }
}

