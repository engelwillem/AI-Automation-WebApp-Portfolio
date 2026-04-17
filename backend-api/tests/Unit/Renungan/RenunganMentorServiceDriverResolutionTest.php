<?php

namespace Tests\Unit\Renungan;

use App\Services\Renungan\OpenAIRenunganMentorDriver;
use App\Services\Renungan\RenunganMentorService;
use App\Services\Renungan\TemplateRenunganMentorDriver;
use Mockery;
use Tests\TestCase;

class RenunganMentorServiceDriverResolutionTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_template_driver_with_openai_key_auto_switches_to_openai_when_enabled(): void
    {
        config()->set('renungan_mentor.driver', 'template');
        config()->set('renungan_mentor.auto_enable_openai_when_key_present', true);
        config()->set('renungan_mentor.openai.api_key', 'test-openai-key');

        $openAIDriver = Mockery::mock(OpenAIRenunganMentorDriver::class);
        $templateDriver = Mockery::mock(TemplateRenunganMentorDriver::class);

        $openAIDriver
            ->shouldReceive('generate')
            ->once()
            ->andReturn([
                'mentor_opening' => 'Buka hati dalam iman.',
                'meditation' => 'Tuhan setia menopangmu hari ini.',
                'prayer_prompt' => 'Tuhan, pimpin aku berjalan dalam damai.',
                'follow_up_question' => 'Langkah iman apa yang kamu ambil hari ini?',
                'confidence' => 'high',
                'safety_notes' => [],
            ]);
        $templateDriver->shouldNotReceive('generate');

        $service = new RenunganMentorService($openAIDriver, $templateDriver);
        $result = $service->generate([
            'reflection_text' => 'Saya sedang cemas dengan masa depan.',
        ]);

        $this->assertSame('openai', $result['meta']['driver']);
        $this->assertFalse((bool) $result['meta']['used_fallback']);
    }

    public function test_template_driver_stays_template_when_auto_switch_is_disabled(): void
    {
        config()->set('renungan_mentor.driver', 'template');
        config()->set('renungan_mentor.auto_enable_openai_when_key_present', false);
        config()->set('renungan_mentor.openai.api_key', 'test-openai-key');

        $openAIDriver = Mockery::mock(OpenAIRenunganMentorDriver::class);
        $templateDriver = Mockery::mock(TemplateRenunganMentorDriver::class);

        $openAIDriver->shouldNotReceive('generate');
        $templateDriver
            ->shouldReceive('generate')
            ->once()
            ->andReturn([
                'mentor_opening' => 'Template opening.',
                'meditation' => 'Template meditation.',
                'prayer_prompt' => 'Template prayer.',
                'follow_up_question' => 'Template follow up.',
                'confidence' => 'medium',
                'safety_notes' => [],
            ]);

        $service = new RenunganMentorService($openAIDriver, $templateDriver);
        $result = $service->generate([
            'reflection_text' => 'Saya butuh arah.',
        ]);

        $this->assertSame('template', $result['meta']['driver']);
        $this->assertTrue((bool) $result['meta']['used_fallback']);
        $this->assertSame('template_driver_selected', $result['meta']['fallback_reason']);
    }
}

