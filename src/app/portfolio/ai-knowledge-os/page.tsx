import type { Metadata } from 'next';
import { TrackedLink } from '@/components/analytics/TrackedLink';

export const metadata: Metadata = {
  title: 'AI Knowledge & Prompt Operating System',
  description:
    'Case study: TheChosenTalks AI decision-support operating system for product, growth, UX, architecture, QA readiness, and trust/privacy.',
  alternates: {
    canonical: '/portfolio/ai-knowledge-os',
  },
};

const coreModules = [
  'AI CMO',
  'Product Growth Strategist',
  'UX and Brand Experience Director',
  'SEO / GEO Strategist',
  'Fullstack Web Architect',
  'Tech Lead for Next.js + Laravel',
  'QA and Release Readiness Lead',
  'Security and Trust Reviewer',
] as const;

const decisionFrameworks = [
  'Website / feature audit',
  'Growth and marketing plan',
  'UX and brand direction',
  'Engineering / architecture diagnosis',
  'Trust and privacy review',
  'KPI and validation planning',
] as const;

const technicalContext = [
  'Next.js App Router',
  'Laravel API backend',
  'Internal API proxy pattern',
  'Sanctum-style auth',
  'Docker local workflow',
  'cPanel deployment reality',
  'Privacy-safe content handling',
] as const;

const businessValue = [
  'Better product decisions',
  'Safer releases',
  'Clearer backlog priorities',
  'Higher trust',
  'More consistent growth strategy',
  'Better alignment between marketing, UX, and engineering',
] as const;

const demoLinks = [
  { href: '/community', label: 'Open Community' },
  { href: '/renungan', label: 'Open Renungan' },
  { href: '/versehub', label: 'Open Versehub' },
  { href: '/today', label: 'Open Today' },
] as const;

export default function AiKnowledgeOsCaseStudyPage() {
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
            AI Knowledge &amp; Prompt Operating System
          </h1>
        </header>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-3 text-xl font-semibold text-slate-100">Problem</h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            Product, growth, UX, engineering, privacy, and release decisions often become scattered across
            documents, chats, and ad-hoc reasoning.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-3 text-xl font-semibold text-slate-100">Solution</h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            A structured AI operating layer that combines role-based reasoning, product strategy, growth
            analysis, UX direction, technical architecture, QA readiness, and trust/privacy guardrails.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Core Modules</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {coreModules.map((item) => (
              <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Decision Frameworks</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {decisionFrameworks.map((item) => (
              <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Technical Context</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {technicalContext.map((item) => (
              <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Business Value</h2>
          <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {businessValue.map((item) => (
              <li key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Demo Surfaces</h2>
          <div className="flex flex-wrap gap-3">
            {demoLinks.map((link) => (
              <TrackedLink
                key={link.href}
                href={link.href}
                eventName="landing_cta_click"
                surface="portfolio_case_study"
                meta={{ target: link.href, product: 'ai_knowledge_os_demo_surface' }}
                className="inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                {link.label}
              </TrackedLink>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
