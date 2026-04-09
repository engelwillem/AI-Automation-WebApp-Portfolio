<?php

namespace Tests\Feature;

use App\Enums\PostType;
use App\Models\MemberPost;
use App\Models\MemberPostBookmark;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommunityPrivateRenunganVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_renungan_archive_is_hidden_from_other_users_feed_and_archive(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $privatePost = MemberPost::query()->create([
            'user_id' => $owner->id,
            'type' => PostType::REFLECTION,
            'text' => 'Renungan Pribadiku Isi hati: ini harus privat.',
            'metadata' => [
                'bookmark_origin' => 'renungan',
                'visibility' => 'private_renungan_archive',
            ],
            'expires_at' => now()->addDays(7),
        ]);

        $publicPost = MemberPost::query()->create([
            'user_id' => $owner->id,
            'type' => PostType::USER_POST,
            'text' => 'Ini konten publik.',
            'metadata' => [
                'visibility' => 'public',
            ],
            'expires_at' => now()->addDays(7),
        ]);

        Sanctum::actingAs($viewer);
        $response = $this->getJson('/api/v1/community/posts');

        $response->assertOk();
        $postIds = collect($response->json('data.posts', []))->pluck('id')->all();
        $archiveIds = collect($response->json('data.archivePosts', []))->pluck('id')->all();

        $this->assertContains((string) $publicPost->id, $postIds);
        $this->assertNotContains((string) $privatePost->id, $postIds);
        $this->assertNotContains((string) $privatePost->id, $archiveIds);
    }

    public function test_private_renungan_comment_access_returns_not_found_for_other_user(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $privatePost = MemberPost::query()->create([
            'user_id' => $owner->id,
            'type' => PostType::REFLECTION,
            'text' => 'Renungan Pribadiku Isi hati: ini harus privat.',
            'metadata' => [
                'bookmark_origin' => 'renungan',
                'visibility' => 'private_renungan_archive',
            ],
            'expires_at' => now()->addDays(7),
        ]);

        Sanctum::actingAs($viewer);
        $this->getJson("/api/v1/community/posts/{$privatePost->id}/comments")
            ->assertNotFound();
    }

    public function test_private_renungan_bookmark_is_not_visible_to_other_members_even_if_legacy_bookmark_exists(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $privatePost = MemberPost::query()->create([
            'user_id' => $owner->id,
            'type' => PostType::REFLECTION,
            'text' => 'Renungan Pribadiku Isi hati: tetap privat.',
            'metadata' => [
                'bookmark_origin' => 'renungan',
                'visibility' => 'private_renungan_archive',
            ],
            'expires_at' => now()->addDays(7),
        ]);

        MemberPostBookmark::query()->create([
            'member_post_id' => $privatePost->id,
            'user_id' => $viewer->id,
            'category_id' => null,
        ]);

        Sanctum::actingAs($viewer);
        $response = $this->getJson('/api/v1/community/bookmarks');

        $response->assertOk();
        $bookmarkIds = collect($response->json('data.bookmarks', []))->pluck('id')->all();
        $this->assertNotContains((string) $privatePost->id, $bookmarkIds);
    }
}
