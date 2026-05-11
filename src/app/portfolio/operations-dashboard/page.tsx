import type { Metadata } from 'next';
import { TrackedLink } from '@/components/analytics/TrackedLink';

export const metadata: Metadata = {
  title: 'AI Internal Operations Dashboard',
  description:
    'Case study: internal observability dashboard for AI automation systems covering runs, queue health, failures, retries, latency, and KPIs.',
  alternates: {
    canonical: '/portfolio/operations-dashboard',
  },
};

const dashboardModules = [
  'Automation Runs',
  'Queue Health',
  'Failed Jobs',
  'Retry Visibility',
  'Integration Health',
  'AI Request Latency',
  'KPI Metrics',
  'Error Logs',
] as const;

const exampleMetrics = [
  { label: 'Total Runs', value: '12,480' },
  { label: 'Success Rate', value: '98.7%' },
  { label: 'Failed Automations', value: '162' },
  { label: 'Average Processing Time', value: '2.4m' },
  { label: 'Pending Jobs', value: '37' },
  { label: 'Integration Health', value: 'Healthy (5/6)' },
] as const;

const architectureItems = [
  'Laravel jobs / queue workers',
  'Automation event logs',
  'Dashboard API endpoints',
  'Database metrics',
  'Frontend dashboard cards/tables',
  'Retry and failure monitoring',
] as const;

const valueItems = [
  'Debug faster',
  'Reduce silent failures',
  'Improve reliability',
  'Give leadership operational visibility',
  'Make AI automation production-ready',
] as const;

export default function OperationsDashboardCaseStudyPage() {
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

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8">
        <header className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 shadow-xl shadow-black/25 backdrop-blur-sm md:p-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Portfolio Case Study
          </p>
          <h1 className="tct-serif text-3xl leading-tight tracking-tight text-slate-100 md:text-5xl">
            AI Internal Operations Dashboard
          </h1>
        </header>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-3 text-xl font-semibold text-slate-100">Problem</h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            AI automations become risky when teams cannot see what ran, what failed, what retried, how long
            jobs took, or which integrations are unhealthy.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-3 text-xl font-semibold text-slate-100">Solution</h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            An internal operations dashboard for monitoring automation runs, queue status, integration health,
            failed jobs, execution latency, and business KPIs.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Dashboard Modules</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {dashboardModules.map((item) => (
              <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Example Metrics</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {exampleMetrics.map((metric) => (
              <article key={metric.label} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-100">{metric.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Technical Architecture</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {architectureItems.map((item) => (
              <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Business Value</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {valueItems.map((item) => (
              <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <TrackedLink
            href="/aios"
            eventName="landing_cta_click"
            surface="portfolio_case_study"
            meta={{ target: '/aios', product: 'operations_dashboard_demo' }}
            className="inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            Open Live Demo Dashboard
          </TrackedLink>
          <TrackedLink
            href="/aios/runs/run-priya-nair"
            eventName="landing_cta_click"
            surface="portfolio_case_study"
            meta={{ target: '/aios/runs/run-priya-nair', product: 'operations_dashboard_retry_run' }}
            className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
          >
            View Retrying Run
          </TrackedLink>
          <TrackedLink
            href="/"
            eventName="landing_cta_click"
            surface="portfolio_case_study"
            meta={{ target: '/', product: 'back_to_portfolio_home' }}
            className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
          >
            Back to Portfolio Home
          </TrackedLink>
        </section>
      </main>
    </div>
  );
}
