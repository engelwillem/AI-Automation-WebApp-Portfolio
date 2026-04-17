<?php

namespace App\Services\Renungan;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RenunganPersonalizationRequestMapper
{
    private const DEBUG_FORCE_HEADER = 'x-renungan-debug-force';
    private const DEBUG_TELEMETRY_HEADER = 'x-renungan-debug-telemetry';

    /**
     * @return array{
     *   reflection_text: string,
     *   lang: string,
     *   response_mode: string,
     *   entry_state: string|null,
     *   storage_mode: string,
     *   request_id: string,
     *   debug_force_mode: string|null,
     *   include_debug_telemetry: bool
     * }
     */
    public function map(Request $request): array
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'min:3', 'max:5000'],
            'lang' => ['nullable', 'string', 'in:id,en'],
            'mode' => ['nullable', 'string', 'in:calm_heart,practical_step,short_prayer,deep_reflection'],
            'entry_state' => ['nullable', 'string', 'in:overwhelmed,disconnected,clarity,connect,neutral'],
            'storage_mode' => ['nullable', 'string', 'in:standard,no_raw_storage'],
        ]);

        $lang = (($validated['lang'] ?? 'id') === 'en') ? 'id' : 'id';

        return [
            'reflection_text' => trim((string) $validated['text']),
            'lang' => $lang,
            'response_mode' => (string) ($validated['mode'] ?? 'calm_heart'),
            'entry_state' => isset($validated['entry_state']) ? (string) $validated['entry_state'] : null,
            'storage_mode' => (string) ($validated['storage_mode'] ?? 'standard'),
            'request_id' => $this->resolveRequestId($request),
            'debug_force_mode' => $this->resolveDebugForceMode($request),
            'include_debug_telemetry' => $this->shouldIncludeDebugTelemetry($request),
        ];
    }

    private function resolveRequestId(Request $request): string
    {
        $headerRequestId = trim((string) $request->header('x-request-id'));
        if ($headerRequestId !== '') {
            return Str::limit($headerRequestId, 120, '');
        }

        return (string) Str::uuid();
    }

    private function resolveDebugForceMode(Request $request): ?string
    {
        if (! app()->environment(['local', 'testing'])) {
            return null;
        }

        $mode = Str::lower(trim((string) $request->header(self::DEBUG_FORCE_HEADER, '')));
        if (in_array($mode, ['rewrite', 'fallback'], true)) {
            return $mode;
        }

        return null;
    }

    private function shouldIncludeDebugTelemetry(Request $request): bool
    {
        if (! app()->environment(['local', 'testing'])) {
            return false;
        }

        return trim((string) $request->header(self::DEBUG_TELEMETRY_HEADER, '')) === '1';
    }
}
