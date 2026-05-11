# AI Automation Systems Portfolio

## Overview
This repository demonstrates production-style AI workflow systems built using Next.js + Laravel, queue workers, integrations, dashboards, observability, and AI orchestration.

Positioning:
AI Automation Systems Builder / AI Workflow Systems Engineer.

The portfolio is designed to show practical automation architecture: mapped workflows, structured AI outputs, operational dashboards, background processing, integration-ready service patterns, and documentation suitable for recruiter review or technical handoff.

## Featured Projects

### 1. AI Client Onboarding Automation
Financial advisory workflow automation with:
- Lead intake
- AI client summaries
- Onboarding pipeline
- Advisor task creation
- CRM/calendar style integrations
- Automation event logging
- KPI dashboarding

Routes:
- Case study: `/portfolio/ai-client-onboarding`
- Demo: `/aios`

### 2. AI Internal Operations Dashboard
Operational visibility layer for:
- Queue visibility
- Failed jobs
- Retry monitoring
- Automation runs
- Metrics
- Integration health
- Leadership observability

Routes:
- Case study: `/portfolio/operations-dashboard`
- Demo: `/aios`

### 3. AI Knowledge / Prompt Operating System
Structured AI decision-support layer for:
- Product strategy
- UX
- Growth
- Engineering architecture
- Trust/privacy reasoning
- Prompt operating layer

Routes:
- Case study: `/portfolio/ai-knowledge-os`
- Demo surface: `/community`

## Technical Stack
Frontend:
- Next.js App Router
- TypeScript
- Tailwind/shadcn-style UI

Backend:
- Laravel API
- Service layer
- Jobs
- Commands

Automation:
- Queue workers
- Scheduled commands
- Retry/failure handling
- Background processing

Database:
- Workflow tables
- Automation logs
- KPI data

AI:
- OpenAI API
- Structured summaries
- Prompt architecture
- AI workflow orchestration

Integrations:
- CRM-style adapter
- Calendar-style adapter
- Email/notification workflows
- WhatsApp reminder workflow

Observability:
- Automation logs
- Run status
- Dashboard metrics
- Failure visibility

## Why This Matches AI Automation Specialist Roles
This portfolio demonstrates the core responsibilities expected from AI Automation Specialist roles:
- Workflow mapping from business process to implementation
- Integrations across product surfaces and backend systems
- AI systems design beyond simple chatbot interactions
- Dashboards for operational and leadership visibility
- Observability through run tracking, logging, and retry/failure handling
- Scalable backend workflows using queues and service boundaries
- Reliability through background processing and production-safe architecture
- Documentation quality for recruiter review and technical handoff

## Operational Demo Layer
The `/aios` demo now includes realistic financial advisory automation runs with completed, processing, retrying, and failed states. It shows status badges, integration health, failed stages, retry counts, execution duration, fallback KPI metrics, and run-level operational detail at `/aios/runs/[runId]`.

The demo data is intentionally portfolio-safe: it uses fictional client records and mocked integration labels while preserving the shape of a production automation workflow.

## MVP Demo Readiness
The MVP interview demo is prepared for Tencent Edge Pages frontend deployment and cPanel Laravel backend deployment.

- `/aios` supports demo-mode operational data if the backend is unavailable.
- Run detail pages are available at `/aios/runs/run-sarah-mitchell` and `/aios/runs/run-priya-nair`.
- Deployment and QA parity docs are available under `docs/CORE/architecture`.
- Production deployment targets are Tencent Edge Pages for the frontend and cPanel Laravel hosting for the backend.

## Further Documentation
- Architecture handoff: `docs/CORE/architecture/AI_AUTOMATION_PORTFOLIO_ARCHITECTURE.md`
- Workflow diagrams: `docs/CORE/architecture/AI_AUTOMATION_WORKFLOW_DIAGRAMS.md`
- Seneco readiness plan: `docs/CORE/architecture/SENECO_APPLICATION_DEMO_READINESS.md`
- MVP release QA report: `docs/CORE/architecture/MVP_RELEASE_QA_REPORT.md`
- Local/production parity checklist: `docs/CORE/architecture/LOCAL_PRODUCTION_PARITY_CHECKLIST.md`
- Deployment runbook: `docs/CORE/architecture/DEPLOYMENT_RUNBOOK_TENCENT_CPANEL.md`

## Demo Routes
- `/`
- `/readme`
- `/portfolio/ai-client-onboarding`
- `/portfolio/operations-dashboard`
- `/portfolio/ai-knowledge-os`
- `/aios`
- `/aios/runs/run-sarah-mitchell`
- `/community`
- `/wa-reminder`
- `/today`
- `/renungan`
- `/versehub`

## Validation
Fallback TypeScript validation command used in this project:

```bash
npx tsc --noEmit --incremental false
```

Lint/typecheck caveats:
- `npm run lint` may be blocked by interactive Next.js ESLint setup prompt
- `npm run typecheck` may fail in this environment due EPERM writing `tsconfig.tsbuildinfo`
