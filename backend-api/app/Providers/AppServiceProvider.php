<?php

namespace App\Providers;

use App\Filament\Auth\Responses\AdminLoginResponse;
use App\Events\Community\PostRepostedToTalks;
use App\Listeners\Community\InvalidateCommunityPostCaches;
use App\Listeners\Community\RecordPostRepostedAnalytics;
use App\Services\AI\AIProviderInterface;
use App\Services\AI\NullAIProvider;
use App\Services\AI\OpenAIResponsesClient;
use App\Services\Mentor\ClaudeMentorDriver;
use App\Services\Mentor\MentorDriverInterface;
use App\Services\Mentor\OpenAIMentorDriver;
use App\Services\Mentor\TemplateMentorDriver;
use App\Support\RichContentSanitizer;
use Filament\Auth\Http\Responses\Contracts\LoginResponse as FilamentLoginResponseContract;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerInterface;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(HtmlSanitizerInterface::class, function (): HtmlSanitizer {
            $config = (new HtmlSanitizerConfig())
                ->allowSafeElements()
                ->allowElement('div')
                ->allowElement('span')
                ->allowElement('section')
                ->allowElement('figure')
                ->allowElement('figcaption')
                ->allowElement('img', ['src', 'alt', 'title', 'width', 'height'])
                ->allowAttribute('target', ['a'])
                ->allowAttribute('aria-label', '*')
                ->forceAttribute('a', 'rel', 'noopener noreferrer')
                ->allowLinkSchemes(['https', 'http', 'mailto', 'tel'])
                ->allowMediaSchemes(['https', 'http'])
                ->allowRelativeLinks()
                ->allowRelativeMedias();

            return new HtmlSanitizer($config);
        });

        $this->app->singleton(RichContentSanitizer::class);
        $this->app->bind(AIProviderInterface::class, function () {
            $provider = strtolower((string) config('ai.provider', 'openai'));

            if ($provider === 'openai') {
                return $this->app->make(OpenAIResponsesClient::class);
            }

            return $this->app->make(NullAIProvider::class);
        });

        // Override Filament login response so we can send security notifications.
        $this->app->bind(FilamentLoginResponseContract::class, AdminLoginResponse::class);

        $this->app->bind(MentorDriverInterface::class, function () {
            $configuredDriver = strtolower((string) config('versehub_mentor.driver', 'template'));
            $openAIKeyConfigured = trim((string) config('versehub_mentor.openai.api_key')) !== '';
            $claudeKeyConfigured = trim((string) config('versehub_mentor.claude.api_key')) !== '';
            $autoEnableOpenAI = (bool) config('versehub_mentor.auto_enable_openai_when_key_present', true);

            if ($configuredDriver === 'auto') {
                $configuredDriver = $openAIKeyConfigured ? 'openai' : 'template';
            }

            if ($configuredDriver === 'template' && $autoEnableOpenAI && $openAIKeyConfigured) {
                $configuredDriver = 'openai';
            }

            if ($configuredDriver === 'openai') {
                if ($openAIKeyConfigured) {
                    return $this->app->make(OpenAIMentorDriver::class);
                }

                return $this->app->make(TemplateMentorDriver::class);
            }

            if ($configuredDriver === 'claude') {
                if ($claudeKeyConfigured) {
                    return $this->app->make(ClaudeMentorDriver::class);
                }

                return $this->app->make(TemplateMentorDriver::class);
            }

            return $this->app->make(TemplateMentorDriver::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(PostRepostedToTalks::class, RecordPostRepostedAnalytics::class);
        Event::listen(PostRepostedToTalks::class, InvalidateCommunityPostCaches::class);

        // Prefetching can feel "heavy" on local/dev or low-end devices because
        // it injects many <link rel="prefetch"> tags and loads them (waterfall).
        // Disable it for local so navigation feels instant again.
        if (! app()->isLocal()) {
            Vite::prefetch(concurrency: 3);
        }

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $baseUrl = rtrim(env('NEXT_PUBLIC_APP_URL', 'http://localhost:9002'), '/');
            $query = http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

            return "{$baseUrl}/reset-password?{$query}";
        });
    }
}
