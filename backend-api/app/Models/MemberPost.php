<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany; // Added this import for BelongsToMany

class MemberPost extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'source_type',
        'title',
        'text',
        'image_path',
        'thumb_path',
        'media_paths',
        'metadata',
        'is_featured',
        'daily_content_id',
        'expires_at',
        'hidden_at',
        'hidden_by',
    ];

    protected $casts = [
        'expires_at' => 'datetime', // This cast type is correct for a datetime column
        'hidden_at' => 'datetime',
        'metadata' => 'array',
        'media_paths' => 'array',
        'type' => \App\Enums\PostType::class,
        'source_type' => \App\Enums\SourceType::class,
        'is_featured' => 'boolean',
    ];

    /* --- Scopes --- */

    public function scopeActive($query)
    {
        // Relaxed from 24h to 7 days to ensure feed continuity in slower communities
        return $query->whereNull('hidden_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()->subDays(7)));
    }

    /**
     * Only include posts intended for public community feeds.
     */
    public function scopePublicFeed($query)
    {
        return $query->notPrivateRenunganArchive();
    }

    public function scopePrivateRenunganArchive($query)
    {
        return $query->where(function ($q) {
            $q->where('metadata->visibility', 'private_renungan_archive')
                ->orWhere('metadata->bookmark_origin', 'renungan')
                ->orWhere('text', 'like', 'Renungan Pribadiku%');
        });
    }

    public function scopeNotPrivateRenunganArchive($query)
    {
        return $query
            ->where(function ($visibilityQuery) {
                $visibilityQuery->whereNull('metadata->visibility')
                    ->orWhere('metadata->visibility', '!=', 'private_renungan_archive');
            })
            ->where(function ($originQuery) {
                $originQuery->whereNull('metadata->bookmark_origin')
                    ->orWhere('metadata->bookmark_origin', '!=', 'renungan');
            })
            ->where(function ($textQuery) {
                // Backward guard for older flattened private posts created before metadata hardening.
                $textQuery->whereNull('text')
                    ->orWhere('text', 'not like', 'Renungan Pribadiku%');
            });
    }

    public function scopeVisibleToViewer($query, ?User $viewer)
    {
        if ($viewer && (bool) ($viewer->is_admin ?? false)) {
            return $query;
        }

        $viewerId = (int) ($viewer?->id ?? 0);

        return $query->where(function ($visibilityQuery) use ($viewerId) {
            $visibilityQuery->notPrivateRenunganArchive();

            if ($viewerId > 0) {
                $visibilityQuery->orWhere(function ($ownerQuery) use ($viewerId) {
                    $ownerQuery->where('user_id', $viewerId)
                        ->privateRenunganArchive();
                });
            }
        });
    }

    public function scopeUrgentPrayer($query)
    {
        return $query->whereIn('type', [\App\Enums\PostType::PRAYER_REQUEST, \App\Enums\PostType::VERSE_REFLECTION])
            ->whereDoesntHave('reactions', fn ($q) => $q->where('type', \App\Enums\ReactionType::PRAY));
    }

    public function scopeByType($query, \App\Enums\PostType $type)
    {
        return $query->where('type', $type);
    }

    /* --- Helpers --- */

    public function isFeatured(): bool
    {
        if (array_key_exists('is_featured', $this->attributes)) {
            return (bool) $this->is_featured;
        }

        return (bool) ($this->metadata['featured'] ?? false);
    }

    public function isUrgent(): bool
    {
        return $this->type === \App\Enums\PostType::PRAYER_REQUEST && ! $this->reactions()->where('type', \App\Enums\ReactionType::PRAY)->exists();
    }

    public function isPrivateRenunganArchive(): bool
    {
        $metadata = is_array($this->metadata) ? $this->metadata : [];
        $visibility = (string) ($metadata['visibility'] ?? '');
        $origin = (string) ($metadata['bookmark_origin'] ?? '');
        $text = (string) ($this->text ?? '');

        return $visibility === 'private_renungan_archive'
            || $origin === 'renungan'
            || str_starts_with($text, 'Renungan Pribadiku');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hiddenBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hidden_by');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(MemberPostComment::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(MemberPostReaction::class);
    }

    public function bookmarks(): HasMany
    {
        return $this->hasMany(MemberPostBookmark::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(MemberPostReport::class);
    }

    /**
     * Channels where this post is visible.
     */
    public function channels(): BelongsToMany
    {
        return $this->belongsToMany(Channel::class, 'channel_posts', 'member_post_id', 'channel_id');
    }

    public function meta(): HasMany
    {
        return $this->hasMany(MemberPostMeta::class, 'member_post_id');
    }
}
