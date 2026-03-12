#!/usr/bin/env bash
set -euo pipefail

RELEASE_PATH=""
BASE_URL=""
URLS="/ /today /versehub/id"
REQUIRED_BIBLE_MIN="1"
SKIP_HTTP="0"

while [[ $# -gt 0 ]]; do
    case "$1" in
    --release)
        RELEASE_PATH="$2"
        shift 2
        ;;
    --base-url)
        BASE_URL="$2"
        shift 2
        ;;
    --urls)
        URLS="$2"
        shift 2
        ;;
    --required-bible-min)
        REQUIRED_BIBLE_MIN="$2"
        shift 2
        ;;
    --skip-http)
        SKIP_HTTP="1"
        shift
        ;;
    *)
        echo "Unknown arg: $1" >&2
        exit 2
        ;;
    esac
done

if [[ -z "$RELEASE_PATH" ]]; then
    echo "Missing --release <path>" >&2
    exit 2
fi

cd "$RELEASE_PATH"

if [[ -z "$BASE_URL" && -f ".env" ]]; then
    BASE_URL="$(
        grep -E '^(HEALTHCHECK_BASE_URL|APP_URL)=' .env \
        | tail -n 1 \
        | cut -d '=' -f2- \
        | tr -d '\r' \
        | tr -d '"' \
        | tr -d "'" \
        | xargs || true
    )"
fi

BASE_URL="${BASE_URL:-http://127.0.0.1}"

[[ -f artisan ]] || { echo "artisan missing in release"; exit 1; }
[[ -f vendor/autoload.php ]] || { echo "vendor/autoload.php missing"; exit 1; }
[[ -w storage ]] || { echo "storage not writable"; exit 1; }
[[ -w bootstrap/cache ]] || { echo "bootstrap/cache not writable"; exit 1; }

php artisan --version >/dev/null
php artisan about >/dev/null

BIBLE_COUNT="$(php -r 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo App\Models\BibleVerse::where("provider","ayt")->where("lang","id")->count();')"

if ! [[ "$BIBLE_COUNT" =~ ^[0-9]+$ ]]; then
    echo "Invalid bible count: $BIBLE_COUNT"
    exit 1
fi

if (( BIBLE_COUNT < REQUIRED_BIBLE_MIN )); then
    echo "BibleVerse AYT ID below threshold: count=$BIBLE_COUNT required=$REQUIRED_BIBLE_MIN"
    exit 1
fi

if [[ "$SKIP_HTTP" == "1" ]]; then
    echo "Healthcheck OK (local checks only)."
    exit 0
fi

for path in $URLS; do
    code="$(curl -k -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")"
    if [[ "$code" != "200" ]]; then
        echo "HTTP healthcheck failed: ${BASE_URL}${path} -> $code"
        exit 1
    fi
done

echo "Healthcheck OK."
