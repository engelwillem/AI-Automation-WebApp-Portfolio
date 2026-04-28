<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WaClient extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_name',
        'client_key',
        'fonnte_token',
        'status',
        'timezone',
        'default_timezone',
        'package',
        'daily_limit',
        'monthly_limit',
        'secret_key',
    ];

    public function logs(): HasMany
    {
        return $this->hasMany(WaLog::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(WaReminder::class);
    }
}
