import type { Metadata } from 'next';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { TCTLogo } from '@/components/brand/TCTLogo';
import LandingAnimationShell from '@/app/LandingAnimationShell';

export const metadata: Metadata = {
  title: 'AI Automation Systems Portfolio',
  description:
    'AI Automation Systems Portfolio: production-style AI workflows built with Next.js, Laravel, queue workers, API integrations, dashboards, and observability.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AI Automation Systems Portfolio',
    description:
      'Production-style AI automation systems across onboarding, operations, and decision-support workflows.',
    images: [
      {
        url: '/api/og/home',
        width: 1200,
        height: 630,
        alt: 'AI Automation Systems Portfolio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Automation Systems Portfolio',
    description:
      'Production-style AI workflows with Next.js, Laravel, queue workers, integrations, and observability.',
    images: ['/api/og/home'],
  },
};

const portfolioCards = [
  {
    id: 'portfolio_client_onboarding',
    label: 'Case 01',
    title: 'AI Client Onboarding Automation',
    description:
      'Financial advisory workflow automation with AI summaries, advisor tasks, CRM sync, calendar integration, event logging, and operational dashboarding.',
    caseStudyHref: '/portfolio/ai-client-onboarding',
    caseStudyLabel: 'View Case Study',
    demoHref: '/aios',
    demoLabel: 'Open Demo',
  },
  {
    id: 'portfolio_internal_ops',
    label: 'Case 02',
    title: 'AI Internal Operations Dashboard',
    description:
      'Queue, logging, KPI, failure monitoring, retry visibility, and integration health for AI automation systems.',
    caseStudyHref: '/portfolio/operations-dashboard',
    caseStudyLabel: 'View Case Study',
    demoHref: '/aios',
    demoLabel: 'Open Dashboard',
  },
  {
    id: 'portfolio_prompt_os',
    label: 'Case 03',
    title: 'AI Knowledge / Prompt Operating System',
    description:
      'A structured AI decision-support system for product, growth, UX, engineering, trust/privacy, and release readiness.',
    caseStudyHref: '/portfolio/ai-knowledge-os',
    caseStudyLabel: 'View Case Study',
    demoHref: '/community',
    demoLabel: 'Explore System',
  },
] as const;

export default function HomePage() {
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

      <LandingAnimationShell>
        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 md:gap-14">
          <div data-animate="header" className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 backdrop-blur">
              <TCTLogo className="h-5 w-5 opacity-90" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                AI Workflow Systems Engineer
              </p>
            </div>
            <h1 className="tct-serif text-4xl leading-tight tracking-tight text-slate-100 md:text-6xl">
              AI Automation Systems Portfolio
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-300 md:text-[17px]">
              I design and build production-style AI workflows using Next.js, Laravel, queue workers, API integrations, dashboards, logging, and AI-powered business automation.
            </p>
          </div>

          <div data-animate="cards" className="grid gap-5 md:grid-cols-3">
            {portfolioCards.map((card) => (
              <article
                key={card.id}
                className="group flex h-full flex-col rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 shadow-xl shadow-black/25 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-cyan-400/40"
              >
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">{card.label}</p>
                <h2 className="mb-3 text-[22px] font-semibold leading-tight text-slate-100">{card.title}</h2>
                <p className="mb-6 text-[14px] leading-relaxed text-slate-300">{card.description}</p>
                <div className="mt-auto flex flex-wrap gap-3">
                  <TrackedLink
                    href={card.caseStudyHref}
                    eventName="landing_cta_click"
                    surface="landing"
                    meta={{ target: card.caseStudyHref, product: `${card.id}_case_study` }}
                    className="inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-300/10 px-3.5 py-2 text-[12px] font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                  >
                    {card.caseStudyLabel}
                  </TrackedLink>
                  <TrackedLink
                    href={card.demoHref}
                    eventName="landing_cta_click"
                    surface="landing"
                    meta={{ target: card.demoHref, product: `${card.id}_demo` }}
                    className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/70 px-3.5 py-2 text-[12px] font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
                  >
                    {card.demoLabel}
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>

          <div data-animate="stack" className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">Next.js App Router</span>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">Laravel API + Queues</span>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">Workflow Integrations</span>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">Ops Observability</span>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5">AI Automation</span>
          </div>

          <section data-animate="readme-cta" className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 text-left shadow-xl shadow-black/25 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Technical Architecture &amp; README</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
              Explore the engineering architecture, automation systems, integrations, observability, and operational design behind these portfolio projects.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <TrackedLink
                href="/readme"
                eventName="landing_cta_click"
                surface="landing"
                meta={{ target: '/readme', product: 'open_readme' }}
                className="inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-300/10 px-3.5 py-2 text-[12px] font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Open README
              </TrackedLink>
              <TrackedLink
                href="/readme"
                eventName="landing_cta_click"
                surface="landing"
                meta={{ target: '/readme', product: 'view_architecture' }}
                className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/70 px-3.5 py-2 text-[12px] font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700/80"
              >
                View Architecture
              </TrackedLink>
            </div>
          </section>
        </main>
      </LandingAnimationShell>
    </div>
  );
}
