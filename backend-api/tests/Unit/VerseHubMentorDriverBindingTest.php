<?php

namespace Tests\Unit;

use App\Services\Mentor\MentorDriverInterface;
use App\Services\Mentor\OpenAIMentorDriver;
use App\Services\Mentor\TemplateMentorDriver;
use Tests\TestCase;

class VerseHubMentorDriverBindingTest extends TestCase
{
    public function test_template_driver_auto_switches_to_openai_when_key_exists_and_auto_is_enabled(): void
    {
        config()->set('versehub_mentor.driver', 'template');
        config()->set('versehub_mentor.auto_enable_openai_when_key_present', true);
        config()->set('versehub_mentor.openai.api_key', 'test-openai-key');
        config()->set('versehub_mentor.claude.api_key', '');

        $driver = app(MentorDriverInterface::class);

        $this->assertInstanceOf(OpenAIMentorDriver::class, $driver);
    }

    public function test_template_driver_stays_template_when_auto_switch_is_disabled(): void
    {
        config()->set('versehub_mentor.driver', 'template');
        config()->set('versehub_mentor.auto_enable_openai_when_key_present', false);
        config()->set('versehub_mentor.openai.api_key', 'test-openai-key');
        config()->set('versehub_mentor.claude.api_key', '');

        $driver = app(MentorDriverInterface::class);

        $this->assertInstanceOf(TemplateMentorDriver::class, $driver);
    }
}

