<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\SabbathSchoolController;
use App\Http\Controllers\WeeklyController;
use App\Http\Controllers\VerseHubController;
use App\Http\Controllers\VersehubCommentController;
use App\Http\Controllers\VersehubActionController;
use App\Http\Controllers\VerseHubLibraryController;
use App\Http\Controllers\VerseHubReaderController;
use App\Http\Controllers\VerseHubReflectionController;
use App\Http\Controllers\VerseHubLandingEventController;
use App\Http\Controllers\TodayController;
use App\Http\Controllers\CommunityController;
use App\Http\Controllers\StudyPathController;
use App\Http\Controllers\MemberPostReactionController;
use App\Http\Controllers\MemberPostBookmarkController;
use App\Http\Controllers\MemberPostCommentController;
use App\Http\Controllers\MemberPostAdminController;
use App\Http\Controllers\LessonProgressController;
use App\Http\Controllers\LessonController;
use App\Http\Controllers\Admin\BulkSchedulerTemplateController;
use App\Http\Controllers\Admin\KpiDashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\InboxController;
use App\Http\Controllers\DirectMessageController;
use App\Http\Controllers\UserFollowController;
use App\Http\Controllers\ChannelMembershipController;
use App\Http\Controllers\InboxThreadController;
use App\Http\Controllers\JournalDraftController;
use App\Http\Controllers\SsDayCommentController;
use App\Http\Controllers\SsDayAdminController;
use App\Http\Controllers\SettingsVisibilityController;
use App\Http\Controllers\LandingClickEventController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

// Landing (marketing)
// If already authenticated, go straight to the main app entry (/today).
Route::get('/', function () {
    if (Auth::check()) {
        // Faster SPA redirect for Inertia requests.
        if (request()->header('X-Inertia')) {
            return Inertia::location(route('today.index', [], false));
        }

        // Regular redirect for non-Inertia requests.
        return redirect()->to(route('today.index', [], false));
    }

    return inertia('Auth/Welcome');
})->name('landing.index');

Route::inertia('/privacy', 'Legal/Privacy')->name('legal.privacy');
Route::inertia('/terms', 'Legal/Terms')->name('legal.terms');
Route::post('/landing/events', [LandingClickEventController::class, 'store'])
    ->middleware('throttle:180,1')
    ->name('landing.events.store');

Route::get('/lessons/{lesson}', [LessonController::class, 'show'])->name('lessons.show');

// Legacy Redirects (Moved outside auth middleware to allow safe Guest/SEO traversal)
Route::get('/today', function () {
    return redirect(env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') . '/today');
})->name('today.index');

Route::get('/community', function () {
    return redirect(env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') . '/community');
})->name('community.index');

// Main app pages requiring authentication
// NOTE: `verified` middleware is safe even if User doesn't implement MustVerifyEmail
Route::middleware(['auth', 'verified_or_admin'])->group(function () {

    Route::get('/community/posts/{memberPost}/share', [CommunityController::class, 'share'])
        ->whereNumber('memberPost')
        ->name('community.posts.share');

    Route::post('/community/posts', [App\Http\Controllers\CommunityPostController::class, 'store'])
        ->name('community.posts.store');
    Route::post('/community/posts/{memberPost}/pray', [MemberPostReactionController::class, 'togglePray'])
        ->name('community.posts.pray');
    Route::post('/community/posts/{memberPost}/bookmark', [MemberPostBookmarkController::class, 'toggle'])
        ->name('community.posts.bookmark');
    Route::get('/community/posts/{memberPost}/comments', [MemberPostCommentController::class, 'index'])
        ->name('community.posts.comments.index');
    Route::post('/community/posts/{memberPost}/comments', [MemberPostCommentController::class, 'store'])
        ->name('community.posts.comments.store');
    Route::post('/community/posts/{memberPost}/admin-action', [MemberPostAdminController::class, 'action'])
        ->name('community.posts.admin-action');
    Route::post('/lessons/{lesson}/start', [LessonProgressController::class, 'start'])->name('lessons.start');
    Route::post('/lessons/{lesson}/complete', [LessonProgressController::class, 'complete'])->name('lessons.complete');
});

Route::middleware(['auth', 'admin'])->group(function () {
    Route::post(
        '/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}/admin/days',
        [SsDayAdminController::class, 'store']
    )->name('channels.sabbath-school.day.admin.store');

    Route::patch(
        '/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}/{dayKey}/admin',
        [SsDayAdminController::class, 'update']
    )->name('channels.sabbath-school.day.admin.update');

    Route::delete(
        '/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}/{dayKey}/admin',
        [SsDayAdminController::class, 'destroy']
    )->name('channels.sabbath-school.day.admin.destroy');
});

// (keep marketing fallback page if needed)
// Route::inertia('/today', 'Welcome')->name('today.index');
Route::get('/channels', [ChannelController::class, 'index'])->name('channels.index');
Route::get('/library', function () {
    // Backward-compatible route: /library was renamed to /community.
    // Use a regular redirect for full page loads; for Inertia requests, use location.
    if (request()->header('X-Inertia')) {
        return Inertia::location('/community');
    }

    return redirect()->to('/community');
})->name('library.redirect');

// Channels detail
Route::get('/channels/sabbath-school', function () {
    if (request()->header('X-Inertia')) {
        return Inertia::location('/channels#sabbath-school');
    }

    return redirect()->to('/channels#sabbath-school');
})->name('channels.sabbath-school.index');
Route::get('/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}', [SabbathSchoolController::class, 'lesson'])->name('channels.sabbath-school.lesson');
Route::get('/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}/{dayKey}', [SabbathSchoolController::class, 'day'])->name('channels.sabbath-school.day');
Route::get(
    '/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}/{dayKey}/comments',
    [SsDayCommentController::class, 'index']
)->name('channels.sabbath-school.day.comments.index');

Route::post(
    '/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}/{dayKey}/comments',
    [SsDayCommentController::class, 'store']
)->middleware('throttle:60,1')->name('channels.sabbath-school.day.comments.store');

Route::middleware(['auth', 'verified_or_admin'])->group(function () {
    Route::patch(
        '/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}/{dayKey}/comments/{commentId}',
        [SsDayCommentController::class, 'update']
    )->whereNumber('commentId')->name('channels.sabbath-school.day.comments.update');
    Route::delete(
        '/channels/sabbath-school/{year}/q{quarter}/lesson/{lessonNumber}/{dayKey}/comments/{commentId}',
        [SsDayCommentController::class, 'destroy']
    )->whereNumber('commentId')->name('channels.sabbath-school.day.comments.destroy');
});

Route::get('/channels/{slug}', [WeeklyController::class, 'index'])
    ->whereIn('slug', ['god-first', 'faith-journey', 'family', 'public-post'])
    ->name('channels.weekly.index');
Route::get('/channels/{slug}/{date}', [WeeklyController::class, 'show'])
    ->whereIn('slug', ['god-first', 'faith-journey', 'family', 'public-post'])
    ->name('channels.weekly.show');

// VerseHub (share-friendly verse pages + OG image + library)
// Canonical URLs include language prefix:
// - /versehub/id/flm-1-15
// - /versehub/en/phil-1-15
Route::get('/versehub', function () {
    return redirect(env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') . '/versehub/id');
})->name('versehub.root');

Route::get('/versehub/{lang}', function ($lang) {
    return redirect(env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') . "/versehub/{$lang}");
})->whereIn('lang', ['id', 'en'])->name('versehub.reader');

// Reader helper endpoints (ID only for now)
Route::get('/versehub/id/chapters', [VerseHubReaderController::class, 'chapters'])
    ->name('versehub.reader.chapters');

Route::middleware(['auth', 'verified_or_admin'])->group(function () {
    Route::get('/versehub/id/my-spiritual-journey', [VerseHubReaderController::class, 'activity'])
        ->name('versehub.reader.activity');
    Route::post('/versehub/id/my-spiritual-journey/quote-post', [VerseHubReaderController::class, 'publishQuotePost'])
        ->name('versehub.reader.activity.quote-post');
    Route::get('/versehub/id/activity', function () {
        return redirect()->to('/versehub/id/my-spiritual-journey', app()->environment('local') ? 302 : 301);
    })->name('versehub.reader.activity.legacy');

    // Legacy endpoint: keep URL alive, but always redirect to canonical route.
    Route::get('/versehub/id/my-activity', function () {
        return redirect()->to('/versehub/id/my-spiritual-journey', app()->environment('local') ? 302 : 301);
    })->name('versehub.reader.activity.legacy-alt');
});

// SEO-friendly chapter reader (ID): /versehub/id/mat-1
// IMPORTANT: must be defined before verse share route `/versehub/{lang}/{ref}`.
Route::get('/versehub/id/{chapterRef}', [VerseHubReaderController::class, 'chapter'])
    // Chapter-only patterns:
    // - mat-1
    // - mat_1
    // - mat.1
    // - mat1
    // This must NOT match verse refs like flm-1-15.
    ->where('chapterRef', '(?:[a-z0-9]+[-_.]\d+|[a-z0-9]*[a-z]\d+)')
    ->name('versehub.reader.chapter');
Route::get('/versehub/id/{chapterRef}/og.png', [VerseHubReaderController::class, 'chapterOg'])
    ->where('chapterRef', '(?:[a-z0-9]+[-_.]\d+|[a-z0-9]*[a-z]\d+)')
    ->name('versehub.reader.chapter.og');

// Autocomplete suggestions for the VerseHub Library search input.
// Must be defined before `/versehub/{lang}/{ref}` routes.
Route::get('/versehub/{lang}/suggest', [VerseHubLibraryController::class, 'suggest'])
    ->whereIn('lang', ['id', 'en'])
    ->name('versehub.suggest');

Route::post('/versehub/{lang}/landing-events', [VerseHubLandingEventController::class, 'store'])
    ->whereIn('lang', ['id', 'en'])
    ->middleware('throttle:120,1')
    ->name('versehub.landing-events.store');

Route::middleware(['auth', 'verified_or_admin'])->group(function () {
    Route::get('/versehub/{lang}/reader-actions', [VersehubActionController::class, 'index'])
        ->whereIn('lang', ['id', 'en'])
        ->name('versehub.actions.index');
    Route::get('/versehub/{lang}/reader-actions/summary', [VersehubActionController::class, 'summary'])
        ->whereIn('lang', ['id', 'en'])
        ->name('versehub.actions.summary');
    Route::post('/versehub/{lang}/reader-actions', [VersehubActionController::class, 'upsert'])
        ->whereIn('lang', ['id', 'en'])
        ->name('versehub.actions.upsert');
});

// Study Paths (public read access for shareability and seekers)
Route::get('/versehub/{lang}/study', [StudyPathController::class, 'index'])
    ->whereIn('lang', ['id', 'en'])
    ->name('versehub.study.index');
Route::get('/versehub/{lang}/study/{slug}', [StudyPathController::class, 'show'])
    ->whereIn('lang', ['id', 'en'])
    ->name('versehub.study.show');
Route::get('/versehub/{lang}/study/{slug}/og.png', [StudyPathController::class, 'ogImage'])
    ->whereIn('lang', ['id', 'en'])
    ->name('versehub.study.og');

Route::get('/versehub/{lang}/{ref}/og.png', [VerseHubController::class, 'ogImageLang'])
    ->whereIn('lang', ['id', 'en'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->name('versehub.og');

Route::get('/versehub/{lang}/{ref}', [VerseHubController::class, 'showLang'])
    ->whereIn('lang', ['id', 'en'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->name('versehub.show');

// Scripture Guide: Mentor API for guided insights and contextual questions.
Route::get('/versehub/{lang}/{ref}/mentor', [VerseHubController::class, 'mentorInsights'])
    ->whereIn('lang', ['id', 'en'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->name('versehub.mentor.insights');

Route::get('/versehub/{lang}/{ref}/mentor/og.png', [VerseHubController::class, 'mentorOgImage'])
    ->whereIn('lang', ['id', 'en'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->name('versehub.mentor.og');

// Scripture Guide: Free-text Ask flow (auth + rate-limited).
Route::post('/versehub/{lang}/{ref}/mentor/ask', [VerseHubController::class, 'mentorAsk'])
    ->whereIn('lang', ['id', 'en'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->middleware(['auth', 'throttle:10,60'])
    ->name('versehub.mentor.ask');

Route::get('/versehub/{lang}/{ref}/comments', [VersehubCommentController::class, 'index'])
    ->whereIn('lang', ['id', 'en'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->name('versehub.comments.index');

Route::post('/versehub/{lang}/{ref}/comments', [VersehubCommentController::class, 'store'])
    ->whereIn('lang', ['id', 'en'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->middleware('throttle:60,1')
    ->name('versehub.comments.store');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/inbox', [InboxController::class, 'index'])->name('inbox.index');

    // Study Paths (write actions)
    Route::post('/versehub/{lang}/study/{slug}/join', [StudyPathController::class, 'join'])->name('versehub.study.join');
    Route::post('/versehub/{lang}/study/{slug}/complete/{stepId}', [StudyPathController::class, 'completeStep'])->name('versehub.study.complete');

    // Bible Interaction Loop: Reflections
    Route::get('/versehub/{lang}/reflections', [VerseHubReflectionController::class, 'index'])
        ->whereIn('lang', ['id', 'en'])
        ->name('versehub.reflections.index');
    Route::post('/versehub/{lang}/reflections', [VerseHubReflectionController::class, 'store'])
        ->whereIn('lang', ['id', 'en'])
        ->name('versehub.reflections.store');

    Route::post('/inbox/read-all', [InboxController::class, 'markAllRead'])->name('inbox.readAll');
    Route::post('/inbox/messages', [DirectMessageController::class, 'store'])->name('inbox.messages.store');
    Route::post('/inbox/messages/{directMessage}/approve', [DirectMessageController::class, 'approve'])
        ->name('inbox.messages.approve');
    Route::get('/inbox/{user}/messages', [DirectMessageController::class, 'thread'])
        ->whereNumber('user')
        ->name('inbox.messages.thread');
    Route::get('/inbox/{user}', [InboxThreadController::class, 'show'])
        ->whereNumber('user')
        ->name('inbox.show');
    Route::post('/users/{user}/follow-toggle', [UserFollowController::class, 'toggle'])
        ->name('users.follow.toggle');
    Route::post('/channels/{channel}/membership', [ChannelMembershipController::class, 'toggle'])
        ->name('channels.membership.toggle');
});

// Legacy routes (no language prefix). We keep these for old shared links.
Route::get('/versehub/{ref}/og.png', [VerseHubController::class, 'ogImageLegacy'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->name('versehub.og.legacy');
Route::get('/versehub/{ref}', [VerseHubController::class, 'showLegacy'])
    ->where('ref', '[a-z0-9]+(?:[-_.]\d+){1,3}')
    ->name('versehub.show.legacy');

// Account settings (premium main app page)
Route::middleware('auth')->group(function () {
    // Settings UI lives in the main app `/profile` page.
    Route::get('/profile', function () {
        return redirect()->to(env('NEXT_PUBLIC_APP_URL', 'http://localhost:9002') . '/profile');
    })->name('settings.index');
    Route::get('/settings/ops-visibility', [SettingsVisibilityController::class, 'index'])
        ->middleware('admin')
        ->name('settings.ops-visibility');
    Route::post('/settings/ops-visibility/execute', [SettingsVisibilityController::class, 'execute'])
        ->middleware('admin')
        ->name('settings.ops-visibility.execute');
    Route::get('/settings/kpi-dashboard', [KpiDashboardController::class, 'index'])
        ->middleware('admin')
        ->name('settings.kpi-dashboard');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/two-factor/setup', [ProfileController::class, 'twoFactorSetup'])
        ->name('profile.two-factor.setup');
    Route::post('/profile/two-factor/confirm', [ProfileController::class, 'twoFactorConfirm'])
        ->name('profile.two-factor.confirm');
    Route::delete('/profile/two-factor', [ProfileController::class, 'twoFactorDisable'])
        ->name('profile.two-factor.disable');
    Route::post('/profile/two-factor/recovery-codes', [ProfileController::class, 'regenerateTwoFactorRecoveryCodes'])
        ->name('profile.two-factor.recovery-codes');

    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])
        ->name('notifications.readAll');

    Route::post('/journal/drafts', [JournalDraftController::class, 'store'])
        ->name('journal.drafts.store');
});
require __DIR__ . '/auth.php';

// Auth ping (for multi-device logout detection)
Route::get('/auth/ping', function () {
    return response()->noContent()
        ->header('X-Auth', Auth::check() ? '1' : '0');
})->name('auth.ping');

// Admin helper: download CSV template for the Bulk Scheduler page.
Route::get('/admintalk/bulk-schedule-posts/template.csv', BulkSchedulerTemplateController::class)
    ->middleware('admin')
    ->name('admin.bulk-schedule-posts.template');

// Backward-compat admin entry points.
Route::redirect('/admin', '/admintalk/login', 302);
Route::redirect('/admin/login', '/admintalk/login', 302);

// ==============================================================
// ZERO-DOWNTIME ATOMIC DEPLOYMENT WEBHOOK (FIREWALL BYPASS)
// ==============================================================
if (!app()->environment('production')) {
    Route::get('/system/deploy/{token}', function ($token) {
        // CRITICAL SECURITY: This endpoint executes a shell script.
        // It MUST be protected by token + IP allowlist.
        $validToken = env('DEPLOY_TOKEN');
        if (!$validToken || !hash_equals((string) $validToken, (string) $token)) {
            abort(403, 'Akses deployment ditolak: Token tidak valid.');
        }

        // Optional allowlist. If not set, default to server-only access.
        // Example: DEPLOY_ALLOWED_IPS=127.0.0.1,::1
        $allowed = array_values(array_filter(array_map('trim', explode(',', (string) env('DEPLOY_ALLOWED_IPS', '127.0.0.1,::1')))));
        $ip = request()->ip();
        if ($ip && !in_array($ip, $allowed, true)) {
            abort(403, 'Akses deployment ditolak: IP tidak diizinkan.');
        }

        // Path mutlak ke deploy.sh di folder aplikasi
        $scriptPath = '/home/thechoosentalks/deploy/apps/thechoosentalks/deploy.sh';

        if (!file_exists($scriptPath)) {
            return response("Skrip deploy.sh tidak ditemukan di {$scriptPath}", 404);
        }

        // Eksekusi bash script dari dalam PHP
        // 2>&1 digunakan agar error (stderr) juga tertangkap di output
        $output = shell_exec('bash ' . escapeshellarg($scriptPath) . ' 2>&1');

        return response('<pre>Deployment logs:' . "\n\n" . e((string) $output) . '</pre>');
    })->middleware('throttle:3,1');

    // ZERO-DOWNTIME HTTP POST UPLOADER (No-FTP, No-SSH Firewall Bypass)
    Route::post('/system/deploy/upload/{token}', function (\Illuminate\Http\Request $request, $token) {
        $validToken = env('DEPLOY_TOKEN');
        if (!$validToken || !hash_equals((string) $validToken, (string) $token)) {
            abort(403, 'Akses deployment ditolak.');
        }

        $allowed = array_values(array_filter(array_map('trim', explode(',', (string) env('DEPLOY_ALLOWED_IPS', '127.0.0.1,::1')))));
        $ip = request()->ip();
        if ($ip && !in_array($ip, $allowed, true)) {
            abort(403, 'Akses deployment ditolak: IP tidak diizinkan.');
        }

        $request->validate([
            'archive' => ['required', 'file', 'max:204800'], // 200 MB
            'script' => ['sometimes', 'file', 'max:512'], // 512 KB
        ]);

        $deployDir = '/home/thechoosentalks/deploy/apps/thechoosentalks';

        // Hapus build lama lalu simpan archive baru dari GitHub
        @unlink($deployDir . '/build.tar.gz');
        $request->file('archive')->move($deployDir, 'build.tar.gz');

        // Perbarui script bash deploy.sh jika ada perubahan struktur
        if ($request->hasFile('script')) {
            @unlink($deployDir . '/deploy.sh');
            $request->file('script')->move($deployDir, 'deploy.sh');
            chmod($deployDir . '/deploy.sh', 0755);
        }

        $scriptPath = $deployDir . '/deploy.sh';
        if (!file_exists($scriptPath)) {
            abort(404, "Skrip deploy.sh hilang dari peladen.");
        }

        $output = shell_exec('bash ' . escapeshellarg($scriptPath) . ' 2>&1');
        return response('<pre>Laporan HTTP Eksekusi Deploy:' . "\n\n" . e((string) $output) . '</pre>');
    })->middleware('throttle:3,1');
}











