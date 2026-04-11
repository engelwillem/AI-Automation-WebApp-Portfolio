<?php

namespace Tests\Feature;

use Tests\TestCase;

class RenunganPersonalizationTelemetryTest extends TestCase
{
    public function test_personalization_includes_debug_telemetry_snapshot_without_raw_text(): void
    {
        $response = $this
            ->withHeaders(['X-Renungan-Debug-Telemetry' => '1'])
            ->postJson('/api/v1/renungan/personalize', [
                'text' => 'saya lagi bingung soal keputusan kerja dan masa depan',
                'lang' => 'id',
            ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'meditation',
                'verse' => ['reference', 'text'],
                'generation' => [
                    'quality' => ['passed', 'reasons'],
                    'telemetry_debug' => [
                        'request_id',
                        'pipeline_version',
                        'input_length_bucket',
                        'generation_duration_ms',
                        'evaluation_duration_ms',
                        'total_duration_ms',
                        'rewrite_triggered',
                        'quality_passed_initial',
                        'quality_passed_final',
                        'evaluation_reasons',
                        'used_fallback_content',
                        'contains_raw_reflection',
                    ],
                ],
            ],
        ]);

        $telemetry = (array) $response->json('data.generation.telemetry_debug');
        $this->assertSame(false, $telemetry['contains_raw_reflection'] ?? true);
        $serialized = json_encode($telemetry);
        $this->assertIsString($serialized);
        $this->assertStringNotContainsString('bingung soal keputusan kerja', (string) $serialized);
    }

    public function test_force_rewrite_debug_mode_marks_rewrite_triggered(): void
    {
        $response = $this
            ->withHeaders([
                'X-Renungan-Debug-Telemetry' => '1',
                'X-Renungan-Debug-Force' => 'rewrite',
            ])
            ->postJson('/api/v1/renungan/personalize', [
                'text' => 'saya mau jadi kaya raya',
                'lang' => 'id',
            ]);

        $response->assertOk();
        $telemetry = (array) $response->json('data.generation.telemetry_debug');

        $this->assertTrue((bool) ($telemetry['rewrite_triggered'] ?? false));
        $this->assertSame(1, (int) ($telemetry['rewrite_count'] ?? 0));
        $this->assertFalse((bool) ($telemetry['quality_passed_initial'] ?? true));
        $this->assertContains(
            'debug_force_quality_fail_initial',
            (array) ($telemetry['initial_evaluation_reasons'] ?? [])
        );
    }

    public function test_force_fallback_debug_mode_marks_fallback_and_failure_reason(): void
    {
        $response = $this
            ->withHeaders([
                'X-Renungan-Debug-Telemetry' => '1',
                'X-Renungan-Debug-Force' => 'fallback',
            ])
            ->postJson('/api/v1/renungan/personalize', [
                'text' => 'saya sangat marah dan bingung',
                'lang' => 'id',
            ]);

        $response->assertOk();
        $telemetry = (array) $response->json('data.generation.telemetry_debug');
        $reasons = (array) ($telemetry['evaluation_reasons'] ?? []);

        $this->assertTrue((bool) ($telemetry['rewrite_triggered'] ?? false));
        $this->assertTrue((bool) ($telemetry['used_fallback_content'] ?? false));
        $this->assertFalse((bool) ($telemetry['quality_passed_final'] ?? true));
        $this->assertContains('rewrite_failed_to_improve', $reasons);
        $this->assertContains('fallback_due_to_invalid_output', $reasons);
    }
}
