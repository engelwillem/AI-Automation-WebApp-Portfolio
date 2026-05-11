import type { Metadata } from 'next';
import { TrackedLink } from '@/components/analytics/TrackedLink';

export const metadata: Metadata = {
  title: 'AI Automation Systems Portfolio Documentation',
  description:
    'Public technical overview of the AI Automation Systems Portfolio: architecture, stack, workflows, observability, and portfolio routes.',
  alternates: {
    canonical: '/readme',
  },
};

const featuredSystems = [
  {
    title: 'AI Client Onboarding Automation',
    description:
      'Automates lead intake, AI client summaries, advisor tasks, CRM synchronization, calendar actions, and KPI updates.',
    technologies: 'Next.js, Laravel, Queues, OpenAI API, CRM + Calendar adapters',
    purpose: 'Accelerate onboarding while improving advisor readiness and follow-up reliability.',
    href: '/portfolio/ai-client-onboarding',
  },
  {
    title: 'AI Internal Operations Dashboard',
    description:
      'Operational visibility layer for automation runs, queue health, failures, retries, latency, and integration status.',
    technologies: 'Laravel Jobs, Metrics APIs, Queue Monitoring, Dashboard UI',
    purpose: 'Reduce silent failures and improve production reliability for automation systems.',
    href: '/portfolio/operations-dashboard',
  },
  {
    title: 'AI Knowledge / Prompt Operating System',
    description:
      'Structured decision-support system spanning product strategy, growth, UX, engineering, QA, and trust/privacy.',
    technologies: 'Prompt Architecture, Role-based Reasoning, Next.js + Laravel Context',
    purpose: 'Create consistent, high-quality cross-functional decisions for product evolution.',
    href: '/portfolio/ai-knowledge-os',
  },
] as const;

const stackGroups = [
  {
    name: 'Frontend',
    items: ['Next.js App Router', 'TypeScript', 'Tailwind', 'shadcn/ui'],
  },
  {
    name: 'Backend',
    items: ['Laravel API', 'Service Layer', 'Queue Jobs', 'Scheduled Commands'],
  },
  {
    name: 'Automation',
    items: ['Queue Workers', 'Retry Handling', 'Event Logging', 'Background Processing'],
  },
  {
    name: 'AI',
    items: ['OpenAI API', 'Structured JSON Output', 'Prompt Architecture', 'AI Workflow Orchestration'],
  },
  {
    name: 'Database',
    items: ['MariaDB/MySQL', 'Workflow Tables', 'KPI Metrics', 'Automation Logs'],
  },
  {
    name: 'Integrations',
    items: ['CRM-style adapter', 'Calendar adapter', 'Email workflows', 'WhatsApp reminder workflow'],
  },
  {
    name: 'Observability',
    items: ['Dashboard metrics', 'Queue visibility', 'Failure monitoring', 'Execution tracking'],
  },
] as const;

const architectureFlow = [
  'Frontend (Next.js)',
  'Internal API Layer',
  'Laravel Backend',
  'Queue Workers',
  'AI / Integrations',
  'Logging + Dashboard',
] as const;

const engineeringPrinciples = [
  'Privacy-safe handling',
  'Incremental architecture',
  'Operational reliability',
  'Observability-first automation',
  'Production-safe workflows',
  'Modular service patterns',
  'Trust and UX balance',
] as const;

const portfolioRoutes = [
  '/',
  '/portfolio/ai-client-onboarding',
  '/portfolio/operations-dashboard',
  '/portfolio/ai-knowledge-os',
  '/aios',
  '/community',
  '/wa-reminder',
  '/today',
  '/renungan',
  '/versehub',
] as const;

const recruiterSignals = [
  'AI workflow design',
  'Queue systems',
  'API integrations',
  'Operational dashboards',
  'Logging and retry systems',
  'AI orchestration',
  'Product/system thinking',
  'Privacy-aware architecture',
  'Scalable backend workflows',
] as const;

export default function ReadmePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070B14] px-6 py-12 text-slate-100 selection:bg-cyan-200/20 md:px-8 md:py-16">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 10% 10%, rgba(59,130,246,0.25), transparent 30%), radial-gradient(circle at 90% 0%, rgba(14,165,233,0.18), transparent 32%), linear-gradient(180deg, #081123 0%, #070B14 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8">
        <header className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Developer Documentation
          </p>
          <h1 className="tct-serif text-4xl leading-tight tracking-tight text-slate-100 md:text-6xl">
            AI Automation Systems Portfolio
          </h1>
          <p className="mt-5 max-w-4xl text-[15px] leading-relaxed text-slate-300 md:text-[17px]">
            Production-style AI workflow systems built with Next.js, Laravel, queue workers, integrations,
            dashboards, logging, and structured AI orchestration.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <TrackedLink
              href="/"
              eventName="landing_cta_click"
              surface="readme"
              meta={{ target: '/', product: 'view_portfolio' }}
              className="inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              View Portfolio
            </TrackedLink>
            <TrackedLink
              href="/portfolio/ai-client-onboarding"
              eventName="landing_cta_click"
              surface="readme"
              meta={{ target: '/portfolio/ai-client-onboarding', product: 'explore_architecture' }}
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
            >
              Explore Architecture
            </TrackedLink>
            <TrackedLink
              href="/aios"
              eventName="landing_cta_click"
              surface="readme"
              meta={{ target: '/aios', product: 'open_live_demo' }}
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
            >
              Open Live Demo
            </TrackedLink>
            <TrackedLink
              href="/aios/runs/run-sarah-mitchell"
              eventName="landing_cta_click"
              surface="readme"
              meta={{ target: '/aios/runs/run-sarah-mitchell', product: 'open_example_run' }}
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
            >
              Open Example Run
            </TrackedLink>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Featured Systems</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {featuredSystems.map((system) => (
              <article key={system.title} className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <h3 className="text-lg font-semibold text-slate-100">{system.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{system.description}</p>
                <p className="mt-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Technologies:</span> {system.technologies}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Business Purpose:</span> {system.purpose}
                </p>
                <TrackedLink
                  href={system.href}
                  eventName="landing_cta_click"
                  surface="readme"
                  meta={{ target: system.href, product: 'featured_system_case_study' }}
                  className="mt-4 inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  Open Case Study
                </TrackedLink>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Technical Stack</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stackGroups.map((group) => (
              <article key={group.name} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-200/90">{group.name}</h3>
                <ul className="space-y-1 text-sm text-slate-300">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Architecture Overview</h2>
          <div className="grid gap-3 md:grid-cols-6">
            {architectureFlow.map((item, index) => (
              <div key={item} className="flex items-center gap-3 md:block">
                <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-sm text-slate-200 md:min-h-20">
                  {item}
                </div>
                {index < architectureFlow.length - 1 ? (
                  <span className="text-cyan-300/80 md:mt-2 md:block md:text-center">↓</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Engineering Principles</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {engineeringPrinciples.map((item) => (
              <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Portfolio Routes</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {portfolioRoutes.map((route) => (
              <li key={route} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono">
                {route}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-300/10 to-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">What This Portfolio Demonstrates</h2>
          <ul className="grid gap-2 text-sm text-slate-200 md:grid-cols-2">
            {recruiterSignals.map((item) => (
              <li key={item} className="rounded-lg border border-cyan-400/20 bg-slate-900/70 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
