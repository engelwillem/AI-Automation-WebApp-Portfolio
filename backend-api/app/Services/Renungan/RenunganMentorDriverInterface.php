<?php

namespace App\Services\Renungan;

interface RenunganMentorDriverInterface
{
    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function generate(array $context): array;
}

