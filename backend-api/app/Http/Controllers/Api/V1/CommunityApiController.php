<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MemberBookmarkCategory;
use App\Models\MemberPost;
use App\Models\MemberPostBookmark;
use App\Models\MemberPostComment;
use App\Models\User;
use App\Notifications\MemberPostCommentReplyNotification;
use App\Services\Community\CommunityRepostService;
use App\Services\Interaction\SpiritualInteractionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CommunityApiController extends Controller
{
    public function __construct(
        private readonly SpiritualInteractionService $interactionService,
        private readonly CommunityRepostService $communityRepostService,
    ) {}

    public function index(Request $request, \App\Services\TodayFeedService $feedService): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();

        $now = Carbon::now();
        $talkPosts = MemberPost::query()
            ->whereNull('hidden_at')
            ->active()
            ->publicFeed()
            ->with(['user:id,name,avatar_path'])
            ->withCount([
                'comments',
                'bookmarks',
                'reactions as pray_count' => fn ($q) => $q->where('type', 'pray'),
            ])
            ->withExists([
                'reactions as is_prayed_by_me' => fn ($q) => $q
                    ->where('type', 'pray')
                    ->where('user_id', $user?->id ?? 0),
                'bookmarks as is_bookmarked_by_me' => fn ($q) => $q
                    ->where('user_id', $user?->id ?? 0),
            ])
            ->orderByDesc('activated_at')
            ->orderByDesc('created_at')
            ->limit(120)
            ->get()
            ->map(fn (MemberPost $post) => $this->serializePost($post, $user))
            ->values();

        $archivePosts = MemberPost::query()
            ->whereNull('hidden_at')
            ->where(function ($query) use ($now) {
                $query->where('status', 'gallery')
                    ->orWhere(function ($expired) use ($now) {
                        $expired->whereNotNull('expires_at')
                            ->where('expires_at', '<=', $now);
                    })
                    ->orWhere(function ($legacy) use ($now) {
                        $legacy->whereNull('expires_at')
                            ->where('created_at', '<=', $now->copy()->subDay());
                    });
            })
            ->publicFeed()
            ->with(['user:id,name,avatar_path'])
            ->withCount([
                'comments',
                'bookmarks',
                'reactions as pray_count' => fn ($q) => $q->where('type', 'pray'),
            ])
            ->withExists([
                'reactions as is_prayed_by_me' => fn ($q) => $q
                    ->where('type', 'pray')
                    ->where('user_id', $user?->id ?? 0),
                'bookmarks as is_bookmarked_by_me' => fn ($q) => $q
                    ->where('user_id', $user?->id ?? 0),
            ])
            ->orderByDesc('activated_at')
            ->orderByDesc('expires_at')
            ->orderByDesc('created_at')
            ->limit(120)
            ->get()
            ->map(fn (MemberPost $post) => $this->serializePost($post, $user))
            ->values();

        // Keep featured feed payload available for backward-compatible consumers.
        $feedData = $feedService->getTodayData($user);

        return response()->json([
            'data' => [
                'posts' => $talkPosts,
                'archivePosts' => $archivePosts,
                'featuredFeed' => $feedData['feed'] ?? [],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);

        $validated = $request->validate([
            'text' => ['required_without:images', 'nullable', 'string', 'max:5000'],
            'type' => ['nullable', 'string', 'in:user_post,prayer_request,reflection,testimony,quote'],
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'imageUrl' => ['nullable', 'url', 'max:2048'],
            'metadata' => ['nullable', 'array'],
            'metadata.media_aspect_ratio' => ['nullable', 'string', 'in:9:16,4:5,1:1,16:9,og,auto']
        ]);

        $mediaPaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('community/posts', 'public');
                $mediaPaths[] = '/storage/'.ltrim($path, '/');
            }
        }

        if (empty($mediaPaths) && $request->filled('imageUrl')) {
            $mediaPaths[] = $request->input('imageUrl');
        }

        $post = MemberPost::query()->create([
            'user_id' => $user->id,
            'type' => $validated['type'] ?? 'user_post',
            'status' => 'active',
            'text' => trim((string) ($validated['text'] ?? '')),
            'image_path' => $mediaPaths[0] ?? null,
            'media_paths' => ! empty($mediaPaths) ? $mediaPaths : null,
            'activated_at' => Carbon::now(),
            'metadata' => array_merge($validated['metadata'] ?? [], [
                'last_activated_at' => Carbon::now()->toIso8601String(),
            ]),
            'expires_at' => Carbon::now()->addDay(),
        ]);

        $fresh = $this->reloadPost($post->id, $user->id);

        return response()->json([
            'data' => [
                'post' => $this->serializePost($fresh, $user),
            ],
        ], 201);
    }

    public function togglePray(MemberPost $memberPost): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);
        $this->abortIfPrivateRenunganNotVisibleToViewer($memberPost, $user);

        $added = $this->interactionService->toggleReaction($memberPost, $user, 'pray');

        $fresh = $this->reloadPost($memberPost->id, $user->id);

        return response()->json([
            'data' => [
                'status' => $added ? 'added' : 'removed',
                'post' => $this->serializePost($fresh, $user),
            ],
        ]);
    }

    public function toggleBookmark(MemberPost $memberPost): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);
        $this->abortIfPrivateRenunganNotVisibleToViewer($memberPost, $user);

        $bookmark = MemberPostBookmark::query()
            ->where('member_post_id', $memberPost->id)
            ->where('user_id', $user->id)
            ->first();

        if ($bookmark) {
            $bookmark->delete();
            $status = 'removed';
        } else {
            $defaultCategory = $this->ensureDefaultBookmarkCategory($user);
            MemberPostBookmark::query()->create([
                'member_post_id' => $memberPost->id,
                'user_id' => $user->id,
                'category_id' => $defaultCategory->id,
            ]);
            $status = 'added';
        }

        $fresh = $this->reloadPost($memberPost->id, $user->id);

        return response()->json([
            'data' => [
                'status' => $status,
                'post' => $this->serializePost($fresh, $user),
            ],
        ]);
    }

    public function destroy(MemberPost $memberPost): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);
        abort_unless($user->is_admin || (int) $memberPost->user_id === (int) $user->id, 403);

        $memberPost->forceFill([
            'hidden_at' => now(),
            'hidden_by' => $user->id,
        ])->save();

        return response()->json([
            'data' => [
                'status' => 'removed',
                'id' => (string) $memberPost->id,
            ],
        ]);
    }

    public function update(Request $request, MemberPost $memberPost): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);
        abort_unless($user->is_admin || (int) $memberPost->user_id === (int) $user->id, 403);

        $validated = $request->validate([
            'text' => ['nullable', 'string', 'max:5000', 'required_without:metadata.preview_media_index'],
            'metadata' => ['nullable', 'array'],
            'metadata.preview_media_index' => ['nullable', 'integer', 'min:0', 'required_without:text'],
        ]);

        $updates = [];
        if (array_key_exists('text', $validated)) {
            $nextText = trim((string) ($validated['text'] ?? ''));
            if ($nextText === '') {
                return response()->json([
                    'message' => 'The text field must not be empty.',
                    'errors' => [
                        'text' => ['The text field must not be empty.'],
                    ],
                ], 422);
            }
            $updates['text'] = $nextText;
        }

        $previewIndex = $request->input('metadata.preview_media_index');
        if ($request->has('metadata.preview_media_index')) {
            $mediaCount = count($memberPost->media_paths ?? []);
            if (! is_numeric($previewIndex) || (int) $previewIndex < 0 || (int) $previewIndex >= $mediaCount) {
                return response()->json([
                    'message' => 'Preview image index is invalid for this post.',
                    'errors' => [
                        'metadata.preview_media_index' => ['Preview image index is invalid for this post.'],
                    ],
                ], 422);
            }

            $metadata = is_array($memberPost->metadata) ? $memberPost->metadata : [];
            $metadata['preview_media_index'] = (int) $previewIndex;
            $updates['metadata'] = $metadata;
        }

        if (! empty($updates)) {
            $memberPost->forceFill($updates)->save();
        }

        $fresh = $this->reloadPost($memberPost->id, $user->id);

        return response()->json([
            'data' => [
                'post' => $this->serializePost($fresh, $user),
            ],
        ]);
    }

    public function repost(Request $request, MemberPost $memberPost): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);
        abort_if($memberPost->hidden_at !== null, 404);
        $this->abortIfPrivateRenunganNotVisibleToViewer($memberPost, $user);

        $repost = $this->communityRepostService->repostToTalks(
            memberPost: $memberPost,
            actorId: (int) $user->id,
            requestId: $request->header('X-Request-Id'),
            sourceSurface: 'gallery'
        );

        $fresh = $this->reloadPost((int) $repost['post']->id, (int) $user->id);

        return response()->json([
            'data' => [
                'status' => (string) $repost['result'],
                'post' => $this->serializePost($fresh, $user),
            ],
        ]);
    }

    public function listBookmarks(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);

        $bookmarks = MemberPostBookmark::query()
            ->where('user_id', $user->id)
            ->with([
                'category',
                'post' => fn ($query) => $query
                    ->whereNull('hidden_at')
                    ->visibleToViewer($user)
                    ->with(['user:id,name,avatar_path'])
                    ->withCount([
                        'comments',
                        'bookmarks',
                        'reactions as pray_count' => fn ($q) => $q->where('type', 'pray'),
                    ])
                    ->withExists([
                        'reactions as is_prayed_by_me' => fn ($q) => $q
                            ->where('type', 'pray')
                            ->where('user_id', $user->id),
                        'bookmarks as is_bookmarked_by_me' => fn ($q) => $q
                            ->where('user_id', $user->id),
                    ]),
            ])
            ->orderByDesc('created_at')
            ->limit(240)
            ->get()
            ->filter(fn (MemberPostBookmark $bookmark) => $bookmark->post !== null)
            ->values()
            ->map(function (MemberPostBookmark $bookmark) use ($user): array {
                $serialized = $this->serializePost($bookmark->post, $user);
                $serialized['bookmark_category'] = $bookmark->category
                    ? [
                        'id' => (string) $bookmark->category->id,
                        'name' => (string) $bookmark->category->name,
                        'slug' => (string) $bookmark->category->slug,
                        'is_default' => (bool) $bookmark->category->is_default,
                    ]
                    : null;
                return $serialized;
            });

        return response()->json([
            'data' => [
                'bookmarks' => $bookmarks,
            ],
        ]);
    }

    public function listBookmarkCategories(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);

        $default = $this->ensureDefaultBookmarkCategory($user);

        $categories = MemberBookmarkCategory::query()
            ->where('user_id', $user->id)
            ->withCount('bookmarks')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(fn (MemberBookmarkCategory $category) => [
                'id' => (string) $category->id,
                'name' => (string) $category->name,
                'slug' => (string) $category->slug,
                'is_default' => (bool) $category->is_default,
                'count' => (int) ($category->bookmarks_count ?? 0),
            ])
            ->values();

        return response()->json([
            'data' => [
                'defaultCategoryId' => (string) $default->id,
                'categories' => $categories,
            ],
        ]);
    }

    public function createBookmarkCategory(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
        ]);

        $name = trim((string) $validated['name']);
        $baseSlug = Str::slug(Str::lower($name), '-');
        $rootSlug = $baseSlug !== '' ? $baseSlug : 'kategori';
        $slug = $rootSlug;
        $suffix = 2;

        while (
            MemberBookmarkCategory::query()
                ->where('user_id', $user->id)
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = "{$rootSlug}-{$suffix}";
            $suffix++;
        }

        $category = MemberBookmarkCategory::query()->create([
            'user_id' => $user->id,
            'name' => $name,
            'slug' => $slug,
            'is_default' => false,
        ]);

        return response()->json([
            'data' => [
                'category' => [
                    'id' => (string) $category->id,
                    'name' => (string) $category->name,
                    'slug' => (string) $category->slug,
                    'is_default' => (bool) $category->is_default,
                    'count' => 0,
                ],
            ],
        ], 201);
    }

    public function moveBookmarkCategory(Request $request, MemberPost $memberPost): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);

        $validated = $request->validate([
            'category_id' => ['required', 'integer'],
        ]);

        $categoryId = (int) $validated['category_id'];
        $category = MemberBookmarkCategory::query()
            ->where('id', $categoryId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $bookmark = MemberPostBookmark::query()
            ->where('member_post_id', $memberPost->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $bookmark->forceFill([
            'category_id' => $category->id,
        ])->save();

        return response()->json([
            'data' => [
                'status' => 'updated',
                'postId' => (string) $memberPost->id,
                'category' => [
                    'id' => (string) $category->id,
                    'name' => (string) $category->name,
                    'slug' => (string) $category->slug,
                    'is_default' => (bool) $category->is_default,
                ],
            ],
        ]);
    }

    public function commentsIndex(MemberPost $memberPost): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        $this->abortIfPrivateRenunganNotVisibleToViewer($memberPost, $user);

        $comments = MemberPostComment::query()
            ->where('member_post_id', $memberPost->id)
            ->with(['user:id,name,avatar_path', 'replyTo.user:id,name'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (MemberPostComment $comment) => $this->serializeComment($comment))
            ->values();

        return response()->json([
            'data' => [
                'comments' => $comments,
            ],
        ]);
    }

    public function commentsStore(Request $request, MemberPost $memberPost): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();
        abort_unless($user, 401);
        $this->abortIfPrivateRenunganNotVisibleToViewer($memberPost, $user);

        $validated = $request->validate([
            'text' => ['required', 'string', 'max:2000'],
            'reply_to_comment_id' => ['nullable', 'integer'],
        ]);

        $replyToCommentId = isset($validated['reply_to_comment_id'])
            ? (int) $validated['reply_to_comment_id']
            : null;

        $replyTarget = null;
        if ($replyToCommentId) {
            $replyTarget = MemberPostComment::query()
                ->with('user:id,name')
                ->where('member_post_id', $memberPost->id)
                ->find($replyToCommentId);
        }

        $comment = MemberPostComment::query()->create([
            'member_post_id' => $memberPost->id,
            'user_id' => $user->id,
            'reply_to_comment_id' => $replyTarget?->id,
            'body' => trim((string) $validated['text']),
        ]);

        if ($replyTarget?->user && $replyTarget->user->id !== $user->id) {
            $replyTarget->user->notify(new MemberPostCommentReplyNotification(
                actorName: (string) $user->name,
                postId: $memberPost->id,
                snippet: trim((string) $validated['text']),
            ));
            Cache::forget("notifications:payload:user:{$replyTarget->user->id}");
        }

        $comment->load(['user:id,name,avatar_path', 'replyTo.user:id,name']);

        return response()->json([
            'data' => [
                'comment' => $this->serializeComment($comment),
            ],
        ], 201);
    }

    public function media(string $path): Response
    {
        $relativePath = $this->normalizeStoredMediaPath($path);
        abort_unless($relativePath !== null, 404);

        $disk = Storage::disk('public');
        abort_unless($disk->exists($relativePath), 404);

        return $disk->response($relativePath, null, [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    private function reloadPost(int $postId, int $userId): MemberPost
    {
        return MemberPost::query()
            ->with(['user:id,name,avatar_path'])
            ->withCount([
                'comments',
                'bookmarks',
                'reactions as pray_count' => fn ($q) => $q->where('type', 'pray'),
            ])
            ->withExists([
                'reactions as is_prayed_by_me' => fn ($q) => $q
                    ->where('type', 'pray')
                    ->where('user_id', $userId),
                'bookmarks as is_bookmarked_by_me' => fn ($q) => $q
                    ->where('user_id', $userId),
            ])
            ->findOrFail($postId);
    }

    private function serializePost(MemberPost $post, ?User $viewer = null): array
    {
        $author = $post->user;
        $viewerId = (int) ($viewer?->id ?? 0);
        $authorId = (int) ($author?->id ?? 0);
        $isFollowingAuthor = false;
        $isFollowedByAuthor = false;

        if ($viewerId > 0 && $authorId > 0 && $viewerId !== $authorId) {
            $isFollowingAuthor = $viewer->following()->where('users.id', $authorId)->exists();
            $isFollowedByAuthor = $author->following()->where('users.id', $viewerId)->exists();
        }

        $bookmarkCategory = null;
        if ($viewerId > 0) {
            $viewerBookmark = MemberPostBookmark::query()
                ->where('member_post_id', $post->id)
                ->where('user_id', $viewerId)
                ->with('category')
                ->first();

            if ($viewerBookmark?->category) {
                $bookmarkCategory = [
                    'id' => (string) $viewerBookmark->category->id,
                    'name' => (string) $viewerBookmark->category->name,
                    'slug' => (string) $viewerBookmark->category->slug,
                    'is_default' => (bool) $viewerBookmark->category->is_default,
                ];
            }
        }

        return [
            'id' => (string) $post->id,
            'type' => (string) ($post->type->value ?? 'user_post'),
            'status' => (string) ($post->status ?: ($post->expires_at?->isFuture() ? 'active' : 'gallery')),
            'text' => (string) ($post->text ?? ''),
            'imageUrl' => $this->communityMediaUrl($post->image_path),
            'mediaPaths' => collect($post->media_paths ?? [])
                ->map(fn ($item) => $this->communityMediaUrl(is_string($item) ? $item : null))
                ->filter()
                ->values()
                ->all(),
            'createdAt' => $post->created_at?->toIso8601String(),
            'created_at' => $post->created_at?->toIso8601String(),
            'activatedAt' => $post->activated_at?->toIso8601String(),
            'activated_at' => $post->activated_at?->toIso8601String(),
            'publicAt' => ($post->activated_at ?? $post->created_at)?->toIso8601String(),
            'public_at' => ($post->activated_at ?? $post->created_at)?->toIso8601String(),
            'expiresAt' => $post->expires_at?->toIso8601String(),
            'expires_at' => $post->expires_at?->toIso8601String(),
            'author' => [
                'id' => (string) ($author?->id ?? ''),
                'name' => (string) ($author?->name ?? 'Member'),
                'avatarUrl' => $author?->getFilamentAvatarUrl(),
                'isOfficial' => (bool) ($author?->is_admin ?? false),
                'isFollowing' => $isFollowingAuthor,
                'isFollowedBy' => $isFollowedByAuthor,
                'isMutualFollow' => $isFollowingAuthor && $isFollowedByAuthor,
            ],
            'counts' => [
                'likes' => (int) ($post->pray_count ?? 0),
                'comments' => (int) ($post->comments_count ?? 0),
                'bookmarks' => (int) ($post->bookmarks_count ?? 0),
            ],
            'isLiked' => (bool) ($post->is_prayed_by_me ?? false),
            'isBookmarked' => (bool) ($post->is_bookmarked_by_me ?? false),
            'metadata' => $post->metadata,
            'bookmark_category' => $bookmarkCategory,
            'can_moderate' => (bool) ($viewer?->is_admin ?? false),
        ];
    }

    private function ensureDefaultBookmarkCategory(User $user): MemberBookmarkCategory
    {
        $existingDefault = MemberBookmarkCategory::query()
            ->where('user_id', $user->id)
            ->where('is_default', true)
            ->first();
        if ($existingDefault) {
            return $existingDefault;
        }

        $existingArchiveByName = MemberBookmarkCategory::query()
            ->where('user_id', $user->id)
            ->where('slug', 'arsip')
            ->first();
        if ($existingArchiveByName) {
            $existingArchiveByName->forceFill(['is_default' => true])->save();
            return $existingArchiveByName;
        }

        return MemberBookmarkCategory::query()->create([
            'user_id' => $user->id,
            'name' => 'Arsip',
            'slug' => 'arsip',
            'is_default' => true,
        ]);
    }

    private function serializeComment(MemberPostComment $comment): array
    {
        return [
            'id' => (string) $comment->id,
            'postId' => (string) $comment->member_post_id,
            'text' => (string) $comment->body,
            'createdAt' => $comment->created_at?->diffForHumans(),
            'replyToId' => $comment->reply_to_comment_id ? (string) $comment->reply_to_comment_id : null,
            'replyToAuthor' => $comment->replyTo?->user?->name ? (string) $comment->replyTo->user->name : null,
            'author' => [
                'id' => (string) ($comment->user?->id ?? ''),
                'name' => (string) ($comment->user?->name ?? 'Member'),
                'avatarUrl' => $comment->user?->getFilamentAvatarUrl(),
            ],
        ];
    }


    private function communityMediaUrl(?string $value): ?string
    {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            return null;
        }

        $relativePath = $this->normalizeStoredMediaPath($raw);
        if ($relativePath === null) {
            return $raw;
        }

        return url('/api/v1/community/media/'.implode('/', array_map('rawurlencode', explode('/', $relativePath))));
    }

    private function normalizeStoredMediaPath(?string $value): ?string
    {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            return null;
        }

        if (filter_var($raw, FILTER_VALIDATE_URL)) {
            $parsedPath = parse_url($raw, PHP_URL_PATH);
            if (! is_string($parsedPath) || $parsedPath === '') {
                return null;
            }
            $raw = $parsedPath;
        }

        $normalized = '/'.ltrim($raw, '/');

        if (str_starts_with($normalized, '/storage/')) {
            $normalized = substr($normalized, strlen('/storage/'));
        } else {
            $normalized = ltrim($normalized, '/');
        }

        $normalized = trim($normalized, '/');
        if ($normalized === '' || str_contains($normalized, '..')) {
            return null;
        }

        return $normalized;
    }

    private function syncPublicMediaMirror(string $relativePath): void
    {
        try {
            $publicStorageRoot = public_path('storage');

            if (is_link($publicStorageRoot)) {
                return;
            }

            $source = storage_path('app/public/'.ltrim($relativePath, '/'));
            $target = $publicStorageRoot.DIRECTORY_SEPARATOR.ltrim($relativePath, '/');

            if (! is_file($source)) {
                return;
            }

            File::ensureDirectoryExists(dirname($target));
            File::copy($source, $target);
        } catch (\Throwable) {
            // Non-fatal: file already persisted on public disk.
        }
    }

    private function abortIfPrivateRenunganNotVisibleToViewer(MemberPost $post, ?User $viewer): void
    {
        if (! $post->isPrivateRenunganArchive()) {
            return;
        }

        $isOwner = $viewer && (int) $viewer->id === (int) $post->user_id;
        $isAdmin = $viewer && (bool) ($viewer->is_admin ?? false);

        if (! $isOwner && ! $isAdmin) {
            abort(Response::HTTP_NOT_FOUND, 'Post not found.');
        }
    }
}

