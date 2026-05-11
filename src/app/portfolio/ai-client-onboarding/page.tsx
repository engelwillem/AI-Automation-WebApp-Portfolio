import type { Metadata } from 'next';
import { TrackedLink } from '@/components/analytics/TrackedLink';

export const metadata: Metadata = {
  title: 'AI Client Onboarding Automation for Financial Advisory Teams',
  description:
    'Case study: production-style AI onboarding automation for financial advisory teams using Next.js, Laravel, queues, integrations, and KPI observability.',
  alternates: {
    canonical: '/portfolio/ai-client-onboarding',
  },
};

const workflowSteps = [
  'New Lead',
  'Validate Intake',
  'Generate AI Client Summary',
  'Send Welcome Email',
  'Create Advisor Task',
  'Create Calendar Event',
  'Sync CRM',
  'Log Every Step',
  'Update KPI Dashboard',
] as const;

const architectureItems = [
  'Next.js frontend',
  'Laravel API backend',
  'Queue/job processor',
  'Database workflow tables',
  'OpenAI API',
  'CRM adapter',
  'Calendar adapter',
  'Automation event logs',
  'KPI dashboard',
] as const;

const builtItems = [
  'AI summary generation',
  'Background job processing',
  'Structured event logging',
  'Advisor task creation',
  'CRM/calendar integration adapters',
  'Retry/failure visibility',
  'Dashboard metrics',
] as const;

const valueItems = [
  'Faster onboarding',
  'Better advisor preparation',
  'Reduced admin work',
  'More reliable follow-up',
  'Leadership visibility',
] as const;

export default function AiClientOnboardingCaseStudyPage() {
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
            AI Client Onboarding Automation for Financial Advisory Teams
          </h1>
        </header>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-3 text-xl font-semibold text-slate-100">Problem</h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            Financial advisory teams spend too much time on manual lead intake, client summary preparation,
            advisor task creation, CRM updates, and follow-up coordination.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-3 text-xl font-semibold text-slate-100">Solution</h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            A production-style AI automation workflow that processes new leads, generates structured AI
            summaries, creates advisor tasks, syncs CRM/calendar actions, logs every automation stage, and
            updates dashboard metrics.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Workflow</h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <li
                key={step}
                className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
              >
                <span className="mr-2 text-cyan-300/85">{String(index + 1).padStart(2, '0')}</span>
                {step}
              </li>
            ))}
          </ol>
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
          <h2 className="mb-4 text-xl font-semibold text-slate-100">What I Built</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {builtItems.map((item) => (
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
            meta={{ target: '/aios', product: 'ai_client_onboarding_demo' }}
            className="inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            Open Live Demo Dashboard
          </TrackedLink>
          <TrackedLink
            href="/aios/runs/run-sarah-mitchell"
            eventName="landing_cta_click"
            surface="portfolio_case_study"
            meta={{ target: '/aios/runs/run-sarah-mitchell', product: 'ai_client_onboarding_run_detail' }}
            className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
          >
            View Example Run
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
