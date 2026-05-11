# AI Automation Portfolio Architecture

## 1. Overview
This project has been repositioned from a general multi-surface website into an AI Automation Systems Portfolio.

Positioning:
AI Automation Systems Builder / AI Workflow Systems Engineer.

Core message:
Production-style AI workflows built with Next.js, Laravel, queue workers, API integrations, dashboards, logging, and AI-powered business automation.

The portfolio now presents the repository as a serious systems engineering body of work: practical AI workflows, operational dashboards, integration patterns, observability, and production-minded product surfaces.

## 2. Completed Work Summary
- Homepage repositioned to AI Automation Systems Portfolio
- Three portfolio case-study pages created
- Public README/docs page created at `/readme`
- Legacy portfolio redirects updated
- Homepage CTA destinations corrected
- Existing product/demo routes preserved
- STEP 8 completed: root `PORTFOLIO_README.md` created as recruiter-friendly technical overview
- STEP 9 completed: `AI_AUTOMATION_WORKFLOW_DIAGRAMS.md` created with Mermaid architecture/workflow diagrams
- STEP 10 completed: `SENECO_APPLICATION_DEMO_READINESS.md` created for Seneco Wealth Australia application preparation
- Phase 2 Operational Realism completed: `/aios` upgraded with realistic demo automation runs, failure/retry visibility, integration health, and run detail pages

## 2.1 Documentation Index
Root recruiter README:
`PORTFOLIO_README.md`

Linked from root README:
- `docs/CORE/architecture/AI_AUTOMATION_WORKFLOW_DIAGRAMS.md`
- `docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`

Public technical README route:
`/readme`

Architecture handoff:
`docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`

Workflow diagrams:
`docs/CORE/architecture/AI_AUTOMATION_WORKFLOW_DIAGRAMS.md`

Seneco demo readiness plan:
`docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`

MVP release QA report:
`docs/CORE/architecture/MVP_RELEASE_QA_REPORT.md`

Local/production parity checklist:
`docs/CORE/architecture/LOCAL_PRODUCTION_PARITY_CHECKLIST.md`

Tencent Edge Pages + cPanel deployment runbook:
`docs/CORE/architecture/DEPLOYMENT_RUNBOOK_TENCENT_CPANEL.md`

## 2.2 Diagram Index
Diagram document:
`docs/CORE/architecture/AI_AUTOMATION_WORKFLOW_DIAGRAMS.md`

Included diagrams:
- Overall Portfolio Architecture
- AI Client Onboarding Workflow
- AI Internal Operations Dashboard Observability
- AI Knowledge / Prompt Operating System
- Deployment / Demo Readiness Flow

## 2.3 Changed Files
STEP 8 changed files:
- `PORTFOLIO_README.md`
- `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`

STEP 9 changed files:
- `docs/CORE/architecture/AI_AUTOMATION_WORKFLOW_DIAGRAMS.md`
- `PORTFOLIO_README.md`
- `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`

STEP 10 changed files:
- `docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`
- `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`

## 3. Current Route Map
`/`
Portfolio landing page

`/readme`
Public technical README and architecture overview

`/portfolio/ai-client-onboarding`
Case study for AI Client Onboarding Automation

`/portfolio/operations-dashboard`
Case study for AI Internal Operations Dashboard

`/portfolio/ai-knowledge-os`
Case study for AI Knowledge / Prompt Operating System

`/portfolio1`
Legacy redirect to `/portfolio/ai-client-onboarding`

`/portfolio2`
Legacy redirect to `/portfolio/operations-dashboard`

`/portfolio3`
Legacy redirect to `/portfolio/ai-knowledge-os`

`/aios`
Live demo/dashboard for financial advisory automation and operations dashboard

`/aios/runs/run-sarah-mitchell`
Example completed run detail for Sarah Mitchell

`/aios/runs/run-priya-nair`
Example retrying run detail with Calendar API timeout visibility

`/community`
Demo surface for AI Knowledge / Prompt Operating System

`/wa-reminder`
Supporting automation product/demo

`/today`
TheChosenTalks daily surface

`/renungan`
TheChosenTalks reflection surface

`/versehub`
TheChosenTalks verse discovery/sharing surface

## 4. Homepage CTA Mapping
AI Client Onboarding Automation:
- View Case Study -> `/portfolio/ai-client-onboarding`
- Open Demo -> `/aios`

AI Internal Operations Dashboard:
- View Case Study -> `/portfolio/operations-dashboard`
- Open Dashboard -> `/aios`

AI Knowledge / Prompt Operating System:
- View Case Study -> `/portfolio/ai-knowledge-os`
- Explore System -> `/community`

README CTA:
- Open README -> `/readme`
- View Architecture -> `/readme`

## 5. Portfolio Case Studies

### 5.1 AI Client Onboarding Automation
The AI Client Onboarding Automation case study presents a financial advisory workflow for moving a new lead from intake to advisor-ready follow-up.

It frames the system around lead intake, AI-generated client summaries, advisor task creation, calendar/CRM style integration, event logging, and KPI dashboarding. The page positions the work as a production-style automation workflow rather than a static demo.

Live demo/dashboard link:
`/aios`

### 5.2 AI Internal Operations Dashboard
The AI Internal Operations Dashboard case study presents observability for AI automations.

It explains how teams can monitor automation runs, queue health, failed jobs, retry visibility, integration health, AI request latency, KPI metrics, and error logs. The page positions the dashboard as the operational layer that makes AI automation safer and more production-ready.

Live demo/dashboard link:
`/aios`

### 5.3 AI Knowledge / Prompt Operating System
The AI Knowledge / Prompt Operating System case study presents TheChosenTalks AI decision-support layer.

It frames the setup as more than a prompt: a structured operating system for product, growth, UX, architecture, QA/release readiness, security, and trust/privacy reasoning. The case study also emphasizes privacy-safe product thinking across TheChosenTalks surfaces.

Relevant demo surfaces:
- `/community`
- `/renungan`
- `/versehub`
- `/today`

## 6. Architecture Narrative
Frontend:
Next.js App Router, TypeScript, Tailwind/shadcn style UI.

Application Surfaces:
Portfolio landing, case studies, README/docs, AIOS dashboard, community/TCT surfaces, WA reminder.

Backend:
Laravel API, service layer, jobs, commands.

Automation:
Queue workers, scheduled commands, background jobs, retry/failure handling.

AI Layer:
OpenAI API, structured summaries, prompt architecture, AI workflow orchestration.

Integrations:
CRM-style adapter, calendar-style adapter, email/notification workflows, WhatsApp reminder workflow.

Observability:
Automation logs, run status, dashboard metrics, execution tracking, failure visibility.

## 7. Engineering Principles
- Preserve existing routes
- Avoid unnecessary rewrites
- Keep demo and portfolio layers separate
- Use presentation pages for case studies
- Keep backend logic untouched unless required
- Maintain privacy-safe TheChosenTalks surfaces
- Prioritize reliability, observability, and recruiter clarity

## 8. Validation Notes
- `npx tsc --noEmit --incremental false` passed
- `npm run lint` is blocked by interactive Next.js ESLint setup prompt
- `npm run typecheck` may fail in this environment due EPERM writing `tsconfig.tsbuildinfo`
- STEP 8-10 were markdown-only documentation updates, so no code validation was needed for those steps

## 8.1 Phase 2 Operational Realism
What changed:
- Added a typed frontend AIOS demo data layer with realistic financial advisory automation records
- Updated `/aios` to show meaningful demo runs, fallback KPI data, status badges, failed stages, retry counts, execution duration, and integration health
- Added `/aios/runs/[runId]` for run-level operational detail
- Added restrained links from `/readme`, `/portfolio/ai-client-onboarding`, and `/portfolio/operations-dashboard` to the AIOS dashboard and example run details

Why it matters for Seneco:
This makes the portfolio feel closer to a production AI automation system for financial advisory operations. It demonstrates queue-aware workflow thinking, advisor handoff readiness, failure visibility, retry tracking, integration health, and leadership-friendly dashboarding.

Affected routes:
- `/aios`
- `/aios/runs/[runId]`
- `/aios/runs/run-sarah-mitchell`
- `/aios/runs/run-priya-nair`
- `/portfolio/ai-client-onboarding`
- `/portfolio/operations-dashboard`
- `/readme`

Affected files:
- `src/features/aios/demo-data.ts`
- `src/app/aios/page.tsx`
- `src/app/aios/runs/[runId]/page.tsx`
- `src/app/portfolio/ai-client-onboarding/page.tsx`
- `src/app/portfolio/operations-dashboard/page.tsx`
- `src/app/readme/page.tsx`
- `PORTFOLIO_README.md`
- `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`
- `docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`
- `docs/CORE/architecture/AI_AUTOMATION_WORKFLOW_DIAGRAMS.md`

Demo data strategy used:
The safest approach for Phase 2 was a frontend demo dataset in `src/features/aios/demo-data.ts`. This keeps the public portfolio demo reliable even when Laravel, queues, or seeded database records are unavailable, while preserving the existing backend API and onboarding architecture for future database-backed demos.

Validation result:
- `npx tsc --noEmit --incremental false` passed
- PHP validation was not run because no Laravel/PHP files were changed

## 8.2 MVP Release QA and Deployment Parity
QA docs added:
- `docs/CORE/architecture/MVP_RELEASE_QA_REPORT.md`
- `docs/CORE/architecture/LOCAL_PRODUCTION_PARITY_CHECKLIST.md`

Deployment docs added:
- `docs/CORE/architecture/DEPLOYMENT_RUNBOOK_TENCENT_CPANEL.md`

Critical fixes applied:
- Added bare `/versehub` compatibility route at `src/app/versehub/page.tsx` so the critical demo route redirects to the VerseHub entry surface.
- Updated `.env.example` to clarify Tencent Edge Pages frontend variables, cPanel Laravel backend URL strategy, and legacy portfolio URL override status.
- Updated `backend-api/.env.example` to remove secret-shaped OpenAI placeholder and personal email examples.

Affected routes:
- `/versehub`
- `/aios`
- `/aios/runs/run-sarah-mitchell`
- `/aios/runs/run-priya-nair`

Affected files:
- `.env.example`
- `backend-api/.env.example`
- `src/app/versehub/page.tsx`
- `PORTFOLIO_README.md`
- `docs/CORE/architecture/MVP_RELEASE_QA_REPORT.md`
- `docs/CORE/architecture/LOCAL_PRODUCTION_PARITY_CHECKLIST.md`
- `docs/CORE/architecture/DEPLOYMENT_RUNBOOK_TENCENT_CPANEL.md`
- `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`
- `docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`

Validation results:
- `npx tsc --noEmit --incremental false` passed.
- `php artisan route:list` passed in `backend-api`.
- `npm run build` started but timed out after the local QA timeout window before producing a pass/fail result.

Remaining known risks:
- Next.js production build still needs confirmation in a clean writable CI/deployment environment.
- Tencent Edge Pages compatibility with this repo's Next.js `output: 'standalone'` setting should be confirmed during deployment setup.
- cPanel queue behavior must be selected explicitly: `sync`, database queue with cron, or persistent worker.
- Laravel `OnboardingDemoSeeder` is not yet aligned with the frontend Phase 2 demo dataset.

## Navigation Scope: TheChosenTalks App Shell

The TheChosenTalks desktop sidebar and floating bottom navigation are scoped only to the Community / TheChosenTalks Daily Reflection app experience. They are no longer inherited by portfolio, AIOS, WA Reminder, README, or other separate demo surfaces.

Current mount behavior:
- `src/components/providers/ClientAppProviders.tsx` still wraps pages with `AppShell` for provider consistency.
- `src/layouts/AppShell.tsx` now gates `DesktopSidebarNav` and `FloatingBottomNav` through `isTctAppNavigationPath(pathname)`.
- `src/lib/app-runtime-paths.ts` owns the route-scope source of truth through `isTctAppNavigationPath`.

Allowed TheChosenTalks navigation prefixes:
- `/community`
- `/reflections`
- `/renungan`
- `/today`
- `/versehub`
- `/profile`
- `/inbox`
- `/channels`

Excluded multi-surface portfolio and demo prefixes:
- `/`
- `/readme`
- `/portfolio`
- `/portfolio1`
- `/portfolio2`
- `/portfolio3`
- `/aios`
- `/wa-reminder`

Why this matters:
This monorepo hosts multiple surfaces with different product contexts: the AI Automation Systems Portfolio, AIOS dashboard, WA Reminder, README/docs, and TheChosenTalks community/reflection app. Keeping TheChosenTalks navigation inside only the TCT app scope prevents cross-surface UI leakage, protects recruiter/demo clarity, and avoids implying that portfolio or AIOS pages are part of the faith-community mobile app shell.

Affected files:
- `src/lib/app-runtime-paths.ts`
- `src/layouts/AppShell.tsx`
- `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`
- `docs/CORE/architecture/MVP_RELEASE_QA_REPORT.md`

Validation route expectations:
- Shows TCT sidebar/floating bottom nav: `/community`, `/renungan`, `/today`, `/versehub`, `/profile`, `/inbox`, `/channels`, and nested routes under those prefixes.
- Shows TCT sidebar/floating bottom nav if the dynamic page exists: `/reflections/[slug]`.
- Does not show TCT sidebar/floating bottom nav: `/`, `/readme`, `/portfolio/ai-client-onboarding`, `/portfolio/operations-dashboard`, `/portfolio/ai-knowledge-os`, `/aios`, `/aios/runs/run-sarah-mitchell`, `/wa-reminder`.

Route existence notes:
- `/reflections` does not currently have a bare page; only `/reflections/[slug]` exists.
- `/aios/runs/[runId]` exists, including `/aios/runs/run-sarah-mitchell`.

## GitHub Publish and Deployment Monitoring

Publish status:
- Branch: `main`
- Commit message: `feat: prepare AI automation portfolio MVP for deployment`
- Commit hash: recorded in the task completion report after Git creates the commit
- GitHub push status: pending before commit; confirm in the task completion report after push

Frontend deployment target:
- Tencent Edge Pages / EdgeOne Pages
- Expected trigger: GitHub push to `main`
- Install command: `npm install` or `npm ci` if the platform supports lockfile installs consistently
- Build command: `npm run build`
- Output directory: use the Tencent/EdgeOne Next.js framework preset output; if a static output field is required, verify against `.next` or standalone adapter behavior for this project
- Node version: Node 20 or newer
- Required environment variables: `NEXT_PUBLIC_APP_URL`, `LARAVEL_API_BASE_URL`
- Optional public environment variables: `NEXT_PUBLIC_LARAVEL_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_TCT_COMMUNITY_URL`, `NEXT_PUBLIC_TCT_WA_SHEET_URL`, Firebase public keys if Firebase is enabled

Backend deployment target:
- cPanel Laravel hosting via SSH
- Safe SSH deployment flow: `cd` into the backend project directory, `git pull`, `composer install --no-dev --optimize-autoloader`, clear Laravel caches, run migrations only when confirmed safe, and verify `php artisan route:list`
- MVP queue recommendation: `QUEUE_CONNECTION=sync` for reliability unless database queue plus cron is already configured

Validation results before publish:
- `npx tsc --noEmit --incremental false` passed
- `npm run build` passed; build warned that local Laravel endpoints were unavailable during `/renungan` generation and used fallback content diagnostics
- `php backend-api/artisan route:list` passed and listed 178 routes
- Initial `cd backend-api && php artisan route:list` failed in `cmd.exe` because the working directory did not change as expected for that invocation; the corrected root-relative command passed

Remaining deployment risks:
- Tencent Edge Pages must be configured with production backend URLs, not localhost
- Confirm Tencent/EdgeOne handling of the repository's Next.js `output: 'standalone'` setting
- Configure server-only variables in Tencent/EdgeOne without exposing secrets as `NEXT_PUBLIC_*`
- Confirm cPanel PHP, Composer, database, and queue settings before enabling production migrations
- `QUEUE_CONNECTION=sync` is safest for MVP if persistent workers or cron queue workers are not confirmed

Frontend post-deploy smoke routes:
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

## 9. Work Log
2026-05-11:
- STEP 8: Added root `PORTFOLIO_README.md`
- Why it matters: gives recruiters and reviewers a concise technical overview of the repo as an AI Automation Systems Portfolio
- Affected files: `PORTFOLIO_README.md`, `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`
- Validation notes: markdown-only update, no code validation needed

2026-05-11:
- STEP 9: Added Mermaid workflow and architecture diagrams
- Why it matters: gives future development and recruiter review a clear visual explanation of the portfolio architecture, onboarding automation, observability layer, prompt operating system, and demo readiness flow
- Affected files: `docs/CORE/architecture/AI_AUTOMATION_WORKFLOW_DIAGRAMS.md`, `PORTFOLIO_README.md`, `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`
- Validation notes: markdown-only update, no code validation needed

2026-05-11:
- STEP 10: Added Seneco application demo readiness plan
- Why it matters: focuses the portfolio toward a financial advisory / wealth management AI Automation Specialist application and defines demo flow, data requirements, polish checklist, and talking points
- Affected files: `docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`, `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`
- Validation notes: markdown-only update, no code validation needed

2026-05-11:
- Phase 2 Operational Realism: Added AIOS demo data, failure/retry dashboard visibility, integration health labels, and run detail route
- Why it matters: strengthens the Seneco application narrative by showing production-style operational visibility for AI automation workflows
- Affected files: `src/features/aios/demo-data.ts`, `src/app/aios/page.tsx`, `src/app/aios/runs/[runId]/page.tsx`, `src/app/portfolio/ai-client-onboarding/page.tsx`, `src/app/portfolio/operations-dashboard/page.tsx`, `src/app/readme/page.tsx`, `PORTFOLIO_README.md`, `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`, `docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`, `docs/CORE/architecture/AI_AUTOMATION_WORKFLOW_DIAGRAMS.md`
- Validation notes: `npx tsc --noEmit --incremental false` passed; PHP validation skipped because no PHP files changed

2026-05-11:
- MVP Release QA and Deployment Parity: Added QA report, parity checklist, Tencent/cPanel deployment runbook, env example hardening, and `/versehub` compatibility route
- Why it matters: prepares the portfolio for immediate MVP publishing and interview demo readiness across Tencent Edge Pages frontend and cPanel Laravel backend
- Affected files: `.env.example`, `backend-api/.env.example`, `src/app/versehub/page.tsx`, `PORTFOLIO_README.md`, `docs/CORE/architecture/MVP_RELEASE_QA_REPORT.md`, `docs/CORE/architecture/LOCAL_PRODUCTION_PARITY_CHECKLIST.md`, `docs/CORE/architecture/DEPLOYMENT_RUNBOOK_TENCENT_CPANEL.md`, `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`, `docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`
- Validation notes: `npx tsc --noEmit --incremental false` passed; `php artisan route:list` passed; `npm run build` timed out during local QA

2026-05-11:
- Navigation Scope: TheChosenTalks app shell navigation was isolated from portfolio and other demo surfaces
- Why it matters: prevents the TCT community/reflection sidebar and floating bottom navigation from appearing on portfolio, AIOS, WA Reminder, README, and homepage surfaces
- Affected files: `src/lib/app-runtime-paths.ts`, `src/layouts/AppShell.tsx`, `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`, `docs/CORE/architecture/MVP_RELEASE_QA_REPORT.md`
- Validation notes: `npx tsc --noEmit --incremental false` and `npm run build` were run for this change; see the latest task report for exact results

2026-05-11:
- GitHub Publish and Deployment Monitoring: Prepared public repo cleanup, validation notes, Tencent Edge Pages monitoring checklist, and cPanel Laravel SSH deployment checklist
- Why it matters: makes the MVP portfolio publishable without local Codex/OpenAI/agent metadata or secrets and gives clear post-push deployment checks
- Affected files: `.gitignore`, `.codex/config.toml`, `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`, `docs/CORE/architecture/MVP_RELEASE_QA_REPORT.md`
- Validation notes: TypeScript, Next.js production build, and Laravel route listing passed before commit

## 10. Next Recommended Work
1. Add architecture diagrams/screenshots to `/readme` and case studies
2. Align Laravel `OnboardingDemoSeeder` with the frontend demo dataset if database-backed public demos become required
3. Polish deployment and public demo readiness
4. Add recruiter/application copy for Seneco Wealth Australia
5. Add public deployment URL and smoke-test notes
