# MVP Release QA Report

## Objective
Prepare the AI Automation Systems Portfolio for immediate MVP publishing and interview demo readiness with stable demo routes, clear deployment assumptions, and practical local/production parity notes.

## Deployment Targets
- Frontend: Tencent Edge Pages / EdgeOne Pages
- Backend: cPanel Laravel hosting
- Repo shape: Next.js App Router frontend with Laravel API backend in `backend-api`

## Critical Demo Routes
- `/`
- `/readme`
- `/portfolio/ai-client-onboarding`
- `/portfolio/operations-dashboard`
- `/portfolio/ai-knowledge-os`
- `/aios`
- `/aios/runs/run-sarah-mitchell`
- `/aios/runs/run-priya-nair`
- `/community`
- `/wa-reminder`
- `/today`
- `/renungan`
- `/versehub`

## Frontend QA Findings
- Next.js config uses `output: 'standalone'`, which is server-output oriented. Confirm Tencent Edge Pages supports the selected Next.js preset/runtime for this project shape before production cutover.
- EdgeOne Pages supports configurable root directory, install command, build command, output directory, Node version, and environment variables through project build settings.
- `npm run build` did not complete within the local QA timeout window. It started Next.js build but timed out before a pass/fail result.
- `/aios` has frontend demo fallback data, so the interview demo can still render when Laravel is unavailable.
- `/aios/runs/[runId]` has `notFound` handling for unknown run IDs.
- Bare `/versehub` was a critical route risk because only `/versehub/:path*` redirect coverage existed in `next.config.ts`; this was fixed with a small redirect page.

## Backend QA Findings
- Laravel route registration is healthy: `php artisan route:list` completed successfully and showed onboarding API routes.
- AIOS onboarding backend already includes Laravel models, migrations, controller endpoints, jobs, adapters, and a demo seeder.
- Existing `OnboardingDemoSeeder` uses queue dispatches and older demo names. It is not yet aligned with the frontend Phase 2 demo dataset.
- cPanel queue behavior needs explicit deployment choice: `sync`, database queue with cron/scheduler, or a managed persistent worker if available.

## Local/Production Parity Risks
- Local frontend calls Laravel through Next.js route handlers and `LARAVEL_API_BASE_URL`.
- Production frontend on Tencent Edge Pages must point server-side proxy calls to the cPanel Laravel origin, not localhost.
- `NEXT_PUBLIC_*` variables are public and must not contain secrets.
- If Tencent runtime does not inject server-only env vars as expected, public API base variables may be used as fallback by the existing Laravel API utility.
- `.next` write permissions previously blocked local dev server startup in this workspace; build/deploy environments should have clean writable build output directories.

## Environment Variable Checklist
- Frontend required for production: `NEXT_PUBLIC_APP_URL`, `LARAVEL_API_BASE_URL`
- Frontend optional/public: `NEXT_PUBLIC_LARAVEL_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_TCT_COMMUNITY_URL`, `NEXT_PUBLIC_TCT_WA_SHEET_URL`, Firebase public keys if Firebase is enabled
- Backend required for production: `APP_NAME`, `APP_ENV`, `APP_KEY`, `APP_DEBUG=false`, `APP_URL`, database credentials, `SESSION_DRIVER`, `CACHE_STORE`, `QUEUE_CONNECTION`
- Backend optional/sensitive: `OPENAI_API_KEY`, mail credentials, onboarding CRM/calendar webhook URLs and tokens, Firebase server verification keys

## API Proxy / Backend URL Checklist
- Local: `LARAVEL_API_BASE_URL=http://127.0.0.1:8000`
- Docker: `LARAVEL_API_BASE_URL=http://backend:8000`
- Production: `LARAVEL_API_BASE_URL=https://<cpanel-laravel-origin>`
- Avoid hardcoded localhost in Tencent Edge Pages production variables.
- Keep API proxy traffic through `/api/*` route handlers where the frontend already uses them.

## Queue / Scheduler Checklist
- Local MVP: `QUEUE_CONNECTION=sync` is acceptable for demo reliability.
- cPanel MVP: use `QUEUE_CONNECTION=sync` if persistent workers are unavailable.
- Better cPanel option: `QUEUE_CONNECTION=database` plus cron invoking `php artisan queue:work --stop-when-empty`.
- Scheduler option: cron invoking `php artisan schedule:run` every minute if scheduled commands are used.
- Demo fallback: `/aios` works with frontend demo data even when queue workers are unavailable.

## cPanel Backend Deployment Checklist
- Upload or pull `backend-api` to the cPanel Laravel application directory.
- Run `composer install --no-dev --optimize-autoloader`.
- Configure `.env` with production database, app URL, queue, cache, session, mail, and integration settings.
- Run `php artisan key:generate` only if `APP_KEY` is empty.
- Run migrations only against the intended production database.
- Run `php artisan storage:link` if public storage assets are required.
- Run `php artisan config:clear`, `php artisan route:clear`, then optionally `php artisan config:cache`.
- Configure queue/cron behavior explicitly.

## Tencent Edge Pages Frontend Checklist
- Root directory: repository root.
- Install command: `npm install` or `npm ci` if lockfile install is supported.
- Build command: `npm run build`.
- Node version: use Node 20 or newer.
- Configure `NEXT_PUBLIC_APP_URL`, `LARAVEL_API_BASE_URL`, and any public frontend variables in EdgeOne Pages settings.
- Smoke test all critical demo routes after deployment.

## Critical Fixes Applied
- Added `/versehub` compatibility route at `src/app/versehub/page.tsx`.
- Updated frontend `.env.example` for Tencent/cPanel parity and removed misleading portfolio override defaults.
- Updated backend `.env.example` to remove secret-shaped OpenAI placeholder and personal email examples.
- Isolated TheChosenTalks app navigation so the TCT sidebar and floating bottom nav no longer appear on portfolio, AIOS, WA Reminder, README, or homepage surfaces.

## Remaining Risks
- `npm run build` timed out in local QA, so a clean build still needs confirmation in a writable environment or CI.
- Tencent Edge Pages runtime compatibility for `output: 'standalone'` should be confirmed during first deployment.
- cPanel queue behavior must be selected and documented per hosting capability.
- Backend seeder data does not yet match the frontend Phase 2 AIOS demo dataset.
- Community/TCT routes redirect to `NEXT_PUBLIC_TCT_COMMUNITY_URL`; production domain strategy must be intentional.

## Manual Smoke Test Plan
1. Open `/` and confirm homepage case-study and README CTAs.
2. Open `/readme` and confirm technical docs route renders.
3. Open `/portfolio/ai-client-onboarding`.
4. Open `/portfolio/operations-dashboard`.
5. Open `/portfolio/ai-knowledge-os`.
6. Open `/aios` and confirm demo mode, status badges, integration health, and run table.
7. Open `/aios/runs/run-sarah-mitchell`.
8. Open `/aios/runs/run-priya-nair`.
9. Open `/community`, `/today`, `/renungan`, and `/versehub` and confirm redirect/landing behavior.
10. Open `/wa-reminder`.

## Interview Demo Fallback Plan
- If Laravel is unavailable, use `/aios` demo-mode data and explain that the UI is using portfolio-safe mocked automation records.
- If OpenAI is unavailable, explain that the demo uses structured summary examples to show output shape without exposing secrets.
- If queue workers are unavailable, explain cPanel fallback options: `sync` queue for MVP or database queue plus cron for production-like behavior.
- If integrations are unavailable, point to the UI labels showing `Mocked`, `Degraded`, or `Failed` integration states.

## Publish Readiness

GitHub push status:
- Branch: `main`
- Commit message: `feat: prepare AI automation portfolio MVP for deployment`
- MVP publish commit hash: `f406ee9`
- Push status: pushed to `origin/main`; GitHub reported the repository has moved to `https://github.com/engelwillem/AI-Automation-WebApp-Portfolio.git`

Validation before publish:
- `npx tsc --noEmit --incremental false` passed
- `npm run build` passed; local build logged Laravel localhost connectivity warnings for `/renungan` and continued with fallback content diagnostics
- `php backend-api/artisan route:list` passed and listed 178 routes

Tencent deployment smoke test checklist:
1. `/`
2. `/readme`
3. `/portfolio/ai-client-onboarding`
4. `/portfolio/operations-dashboard`
5. `/portfolio/ai-knowledge-os`
6. `/aios`
7. `/aios/runs/run-sarah-mitchell`
8. `/aios/runs/run-priya-nair`
9. `/community`
10. `/wa-reminder`
11. `/today`
12. `/renungan`
13. `/versehub`

cPanel backend smoke test checklist:
1. SSH into cPanel hosting without printing secrets.
2. `cd` into the Laravel backend project directory.
3. Run `git pull` from the intended branch.
4. Run `composer install --no-dev --optimize-autoloader`.
5. Run `php artisan config:clear`.
6. Run `php artisan cache:clear`.
7. Run `php artisan route:clear`.
8. Run `php artisan view:clear`.
9. Run `php artisan migrate --force` only if migrations are confirmed safe for the target database.
10. Run `php artisan route:list`.

Queue mode:
- MVP reliability: `QUEUE_CONNECTION=sync`.
- More production-like option: database queue plus cron running `php artisan queue:work --stop-when-empty` if cPanel supports it.

Remaining risks:
- Tencent/EdgeOne must use production-safe frontend and backend environment variables.
- Do not expose secrets through `NEXT_PUBLIC_*` variables.
- Confirm the platform preset for this Next.js app and its `output: 'standalone'` setting.
- Confirm cPanel PHP and Composer versions before production deployment.
- Confirm migration safety before running `php artisan migrate --force`.

## Seneco Application Polish

Applied updates:
- Added financial advisory client onboarding blueprint to `/aios`.
- Added financial advice guardrails to `/aios`.
- Added "Most Complex Workflow Built" to `/portfolio/ai-client-onboarding`.
- Added security and compliance notes to `/portfolio/ai-client-onboarding`.
- Added most complex workflow and integration flow sections to `/readme`.
- Added most complex workflow and financial advisory guardrails to `PORTFOLIO_README.md`.

Smoke test focus:
1. Open `/aios` and confirm the workflow blueprint and guardrails render above dashboard metrics.
2. Open `/portfolio/ai-client-onboarding` and confirm the complex workflow and compliance notes render.
3. Open `/readme` and confirm the most complex workflow and integration flow sections render.

Application-ready summary:
The portfolio now presents a financial advisory AI automation workflow that maps lead intake to advisor handoff, AI summary generation, CRM/calendar/email adapters, retry visibility, dashboard metrics, and compliance-aware human approval.
