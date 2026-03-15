<?php

use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    // Public signup is temporarily disabled.
    Route::get('register', function () {
        return redirect()->to('/');
    })
        ->name('register');

    Route::post('register', function () {
        abort(403, 'Pendaftaran sementara dinonaktifkan.');
    });

    // Public login is now migrated to the Next.js SPA.
    Route::get('login', function () {
        return redirect()->to(env('NEXT_PUBLIC_APP_URL', 'http://localhost:9002') . '/login');
    })->name('login');

    Route::post('login', function () {
        return redirect()->to(env('NEXT_PUBLIC_APP_URL', 'http://localhost:9002') . '/login');
    });

    Route::get('two-factor-challenge', [TwoFactorChallengeController::class, 'create'])
        ->name('two-factor.challenge');
    Route::post('two-factor-challenge', [TwoFactorChallengeController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('two-factor.verify');

    Route::get('forgot-password', function () {
        return redirect()->to(env('NEXT_PUBLIC_APP_URL', 'http://localhost:9002') . '/forgot-password');
    })->name('password.request');

    Route::post('forgot-password', function () {
        return redirect()->to(env('NEXT_PUBLIC_APP_URL', 'http://localhost:9002') . '/forgot-password');
    })->name('password.email');

    Route::get('reset-password/{token}', function (string $token) {
        $baseUrl = rtrim(env('NEXT_PUBLIC_APP_URL', 'http://localhost:9002'), '/');
        $query = http_build_query([
            'token' => $token,
            'email' => request()->query('email'),
        ]);
        return redirect()->to("{$baseUrl}/reset-password?{$query}");
    })->name('password.reset');

    Route::post('reset-password', function () {
        return redirect()->to(env('NEXT_PUBLIC_APP_URL', 'http://localhost:9002') . '/login');
    })->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
