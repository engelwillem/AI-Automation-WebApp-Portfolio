<?php

namespace App\Console\Commands;

use App\Models\WaClient;
use Illuminate\Console\Command;

class CreateWaClientCommand extends Command
{
    protected $signature = 'wa:create-client
        {client_name : Human readable client name}
        {client_key : Unique client key}
        {fonnte_token : Fonnte token}
        {--timezone=Asia/Makassar : Primary timezone}
        {--default-timezone= : Fallback timezone (optional)}
        {--secret-key= : Optional secret key}
        {--package= : Optional package name}
        {--daily-limit= : Optional daily limit}
        {--monthly-limit= : Optional monthly limit}
        {--inactive : Create as inactive}';

    protected $description = 'Create or update WhatsApp reminder client for multi-tenant usage';

    public function handle(): int
    {
        $clientKey = trim((string) $this->argument('client_key'));
        $payload = [
            'client_name' => trim((string) $this->argument('client_name')),
            'fonnte_token' => trim((string) $this->argument('fonnte_token')),
            'status' => $this->option('inactive') ? 'inactive' : 'active',
            'timezone' => $this->normalizeNullable($this->option('timezone')),
            'default_timezone' => $this->normalizeNullable($this->option('default-timezone')),
            'secret_key' => $this->normalizeNullable($this->option('secret-key')),
            'package' => $this->normalizeNullable($this->option('package')),
            'daily_limit' => $this->normalizeNullableInt($this->option('daily-limit')),
            'monthly_limit' => $this->normalizeNullableInt($this->option('monthly-limit')),
        ];

        $client = WaClient::query()->updateOrCreate(
            ['client_key' => $clientKey],
            $payload
        );

        $this->info('WA client saved.');
        $this->line(json_encode([
            'id' => $client->id,
            'client_key' => $client->client_key,
            'status' => $client->status,
            'timezone' => $client->timezone,
            'default_timezone' => $client->default_timezone,
            'package' => $client->package,
            'daily_limit' => $client->daily_limit,
            'monthly_limit' => $client->monthly_limit,
            'has_secret_key' => trim((string) $client->secret_key) !== '',
        ], JSON_UNESCAPED_SLASHES));

        return self::SUCCESS;
    }

    private function normalizeNullable(mixed $value): ?string
    {
        $v = trim((string) $value);
        return $v === '' ? null : $v;
    }

    private function normalizeNullableInt(mixed $value): ?int
    {
        $v = trim((string) $value);
        if ($v === '') {
            return null;
        }

        if (! ctype_digit($v)) {
            $this->warn("Invalid integer value '{$v}', ignored.");
            return null;
        }

        return (int) $v;
    }
}

