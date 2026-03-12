#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/deploy/apps/thechoosentalks}"
RELEASES_DIR="$APP_DIR/releases"
SHARED_DIR="$APP_DIR/shared"
PUBLIC_HTML_DIR="${PUBLIC_HTML_DIR:-$HOME/public_html}"
ARTIFACT_PATH="${ARTIFACT_PATH:-$APP_DIR/build.tar.gz}"
ARTIFACT_SHA256="${ARTIFACT_SHA256:-}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
REQUIRED_BIBLE_AYT_ID_MIN="${REQUIRED_BIBLE_AYT_ID_MIN:-1}"
ENABLE_POST_HTTP_HEALTHCHECK="${ENABLE_POST_HTTP_HEALTHCHECK:-1}"
HEALTHCHECK_URLS="${HEALTHCHECK_URLS:-/ /today /versehub/id}"
BASE_URL="${BASE_URL:-}"

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
NEW_RELEASE="$RELEASES_DIR/$TIMESTAMP"
PREV_RELEASE=""
HEALTHCHECK_SCRIPT="$APP_DIR/healthcheck.sh"
ROLLBACK_SCRIPT="$APP_DIR/rollback.sh"
LOCK_FILE="$APP_DIR/deploy.lock"

log() { printf '%s %s\n' "[$(date '+%Y-%m-%d %H:%M:%S')]" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

safe_under_dir() {
    local path="$1"
    local base="$2"

    local real_path
    local real_base

    real_path="$(readlink -f "$path" 2>/dev/null || true)"
    real_base="$(readlink -f "$base" 2>/dev/null || true)"

    [[ -n "$real_path" && -n "$real_base" ]] || return 1
    [[ "$real_path" == "$real_base"/* ]]
}

safe_rm_rf() {
    local target="$1"

    [[ -n "$target" ]] || fail "Refusing rm -rf on empty path"

    safe_under_dir "$target" "$RELEASES_DIR" \
        || fail "Refusing to remove path outside releases dir: $target"

    rm -rf -- "$target"
}

cleanup_failed_release() {
    if [[ -d "$NEW_RELEASE" ]]; then
        log "Cleaning failed release: $NEW_RELEASE"
        safe_rm_rf "$NEW_RELEASE" || true
    fi
}

remove_lock() {
    rm -f "$LOCK_FILE"
}

on_error() {
    local line="${1:-unknown}"
    remove_lock
    log "Deploy failed at line $line."
    cleanup_failed_release
}

rollback_to_previous_if_needed() {
    if [[ -n "$PREV_RELEASE" && -d "$PREV_RELEASE" ]]; then
        log "Post-deploy healthcheck failed. Rolling back to: $PREV_RELEASE"
        ln -sfn "$PREV_RELEASE" "$APP_DIR/current"
        bash "$ROLLBACK_SCRIPT" --release "$PREV_RELEASE" --skip-switch || true
    fi
}

log "Acquiring deploy lock..."
if [[ -e "$LOCK_FILE" ]]; then
    fail "Another deployment is already running."
fi
touch "$LOCK_FILE"

trap 'on_error "$LINENO"' ERR
trap 'remove_lock' EXIT

require_cmd tar
require_cmd rsync
require_cmd php

[[ -f "$ARTIFACT_PATH" ]] || fail "Artifact not found: $ARTIFACT_PATH"
[[ -f "$SHARED_DIR/.env" ]] || fail "Missing shared env: $SHARED_DIR/.env"

if [[ -n "${ARTIFACT_SHA256:-}" ]]; then
    require_cmd sha256sum
    ACTUAL_SHA256="$(sha256sum "$ARTIFACT_PATH" | awk '{print $1}')"
    [[ "$ACTUAL_SHA256" == "$ARTIFACT_SHA256" ]] || fail "Artifact checksum mismatch"
fi

if [[ -L "$APP_DIR/current" || -d "$APP_DIR/current" ]]; then
    PREV_RELEASE="$(readlink -f "$APP_DIR/current" || true)"
fi

log "Starting deployment: $TIMESTAMP"
mkdir -p "$RELEASES_DIR" "$SHARED_DIR" "$PUBLIC_HTML_DIR"
mkdir -p \
    "$SHARED_DIR/storage/framework/sessions" \
    "$SHARED_DIR/storage/framework/views" \
    "$SHARED_DIR/storage/framework/cache/data" \
    "$SHARED_DIR/storage/logs"

if [[ -e "$NEW_RELEASE" ]]; then
    fail "Release directory already exists: $NEW_RELEASE"
fi
safe_under_dir "$NEW_RELEASE" "$RELEASES_DIR" || fail "New release path is unsafe: $NEW_RELEASE"

log "Creating release directory: $NEW_RELEASE"
mkdir -p "$NEW_RELEASE"

log "Validating artifact contents"
tar -tzf "$ARTIFACT_PATH" >/dev/null
if tar -tzf "$ARTIFACT_PATH" | grep -E '(^/|(^|/)\.\.(/|$))' >/dev/null; then
    fail "Artifact contains unsafe paths"
fi

log "Extracting artifact: $ARTIFACT_PATH"
tar -xzf "$ARTIFACT_PATH" -C "$NEW_RELEASE"

[[ -f "$NEW_RELEASE/artisan" ]] || fail "artisan missing in artifact"
[[ -f "$NEW_RELEASE/vendor/autoload.php" ]] || fail "vendor/autoload.php missing in artifact. Build vendor in CI/local and include it."
[[ -f "$NEW_RELEASE/public/build/manifest.json" ]] || fail "public/build/manifest.json missing in artifact. Run Vite build in CI first."

log "Linking shared resources"
ln -sfn "$SHARED_DIR/.env" "$NEW_RELEASE/.env"
rm -rf "$NEW_RELEASE/storage"
ln -sfn "$SHARED_DIR/storage" "$NEW_RELEASE/storage"

cd "$NEW_RELEASE"

DB_CONNECTION_VALUE="$(grep -E '^DB_CONNECTION=' .env | tail -n 1 | cut -d '=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'" | xargs || true)"
DB_DATABASE_VALUE="$(grep -E '^DB_DATABASE=' .env | tail -n 1 | cut -d '=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'" | xargs || true)"
HEALTHCHECK_BASE_URL_VALUE="$(grep -E '^HEALTHCHECK_BASE_URL=' .env | tail -n 1 | cut -d '=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'" | xargs || true)"
APP_URL_VALUE="$(grep -E '^APP_URL=' .env | tail -n 1 | cut -d '=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'" | xargs || true)"

if [[ -z "$BASE_URL" ]]; then
    BASE_URL="${HEALTHCHECK_BASE_URL_VALUE:-${APP_URL_VALUE:-http://127.0.0.1}}"
fi

if [[ "$DB_CONNECTION_VALUE" == "mysql" || "$DB_CONNECTION_VALUE" == "mariadb" ]]; then
    [[ -n "$DB_DATABASE_VALUE" ]] || fail "DB_DATABASE is empty for $DB_CONNECTION_VALUE"
    grep -Eq '^DB_HOST=' .env || fail "DB_HOST is missing in .env for $DB_CONNECTION_VALUE"
    grep -Eq '^DB_USERNAME=' .env || fail "DB_USERNAME is missing in .env for $DB_CONNECTION_VALUE"

    php -r 'if (!extension_loaded("pdo_mysql")) { fwrite(STDERR, "pdo_mysql extension missing\n"); exit(1); }'
    php -r 'require "vendor/autoload.php"; $app = require "bootstrap/app.php"; $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); Illuminate\Support\Facades\DB::connection()->getPdo(); echo "MySQL connectivity OK\n";' >/dev/null
else
    fail "DB_CONNECTION must be mysql or mariadb. SQLite deployments are no longer supported."
fi

mkdir -p bootstrap/cache
mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache/data storage/logs

log "Applying permissions"
find storage bootstrap/cache -type d -exec chmod 755 {} \;
find storage bootstrap/cache -type f -exec chmod 644 {} \;

log "Verifying database health and user integrity..."
if [[ -f "artisan" ]]; then
    USER_COUNT="$(php artisan tinker --execute="echo \App\Models\User::count();" | tr -d '\r\n' || echo "ERROR")"
    if [[ "$USER_COUNT" == "ERROR" ]]; then
        fail "Database connectivity error during health check."
    fi
    log "Current user count: $USER_COUNT"
    if [[ -n "$PREV_RELEASE" && "$USER_COUNT" == "0" ]]; then
        fail "SAFETY ALERT: User count dropped to 0. Aborting switch to prevent data loss."
    fi
fi

log "Running Laravel cache + migrate"
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

php artisan optimize

log "Running pre-switch healthcheck"
[[ -f "$HEALTHCHECK_SCRIPT" ]] || fail "Missing healthcheck script: $HEALTHCHECK_SCRIPT"
[[ -f "$ROLLBACK_SCRIPT" ]] || fail "Missing rollback script: $ROLLBACK_SCRIPT"
bash "$HEALTHCHECK_SCRIPT" --release "$NEW_RELEASE" --required-bible-min "$REQUIRED_BIBLE_AYT_ID_MIN" --skip-http

log "Switching current symlink atomically"
safe_under_dir "$NEW_RELEASE" "$RELEASES_DIR" || fail "Attempted to switch to unsafe path: $NEW_RELEASE"
ln -sfn "$NEW_RELEASE" "$APP_DIR/current"

CURRENT_REAL="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"
[[ "$CURRENT_REAL" == "$NEW_RELEASE" ]] || fail "current symlink verification failed"

log "Publishing public assets to $PUBLIC_HTML_DIR"
rsync -a --delete --exclude='index.php' "$NEW_RELEASE/public/" "$PUBLIC_HTML_DIR/"
cp "$NEW_RELEASE/public/.htaccess" "$PUBLIC_HTML_DIR/" 2>/dev/null || true
rm -f "$PUBLIC_HTML_DIR/hot"

cat >"$PUBLIC_HTML_DIR/index.php" <<'PHP'
<?php
declare(strict_types=1);
require __DIR__ . '/../deploy/apps/thechoosentalks/current/public/index.php';
PHP

if [[ "$ENABLE_POST_HTTP_HEALTHCHECK" == "1" ]]; then
    log "Running post-switch healthcheck with HTTP checks"
    if ! bash "$HEALTHCHECK_SCRIPT" --release "$APP_DIR/current" --required-bible-min "$REQUIRED_BIBLE_AYT_ID_MIN" --base-url "$BASE_URL" --urls "$HEALTHCHECK_URLS"; then
        rollback_to_previous_if_needed
        fail "Post-switch healthcheck failed."
    fi
fi

log "Hardening security: Enforcing 700/600 permissions"
chmod 700 "$APP_DIR" || true
chmod 700 "$RELEASES_DIR" || true
chmod 700 "$NEW_RELEASE" || true
chmod 700 "$APP_DIR"/*.sh || true
chmod 600 "$SHARED_DIR/.env" || true

log "Cleaning old releases, keeping last $KEEP_RELEASES"
find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' \
| sort -r \
| tail -n +"$((KEEP_RELEASES + 1))" \
| while read -r old_release; do
    [[ -n "$old_release" ]] || continue
    safe_rm_rf "$old_release"
done

log "Deployment completed successfully: $TIMESTAMP"
