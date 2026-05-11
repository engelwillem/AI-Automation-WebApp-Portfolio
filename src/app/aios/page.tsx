"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  aiosDemoRuns,
  demoKpiDetail,
  demoSummary,
  integrationHealthLabels,
  statusLabels,
  type AiosIntegrationHealth,
  type AiosKpiDetailResponse,
  type AiosRunStatus,
  type AiosSummaryResponse,
} from "@/features/aios/demo-data";

function formatDuration(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "-";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: AiosRunStatus): string {
  const classes: Record<AiosRunStatus, string> = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    processing: "border-sky-200 bg-sky-50 text-sky-700",
    queued: "border-slate-200 bg-slate-50 text-slate-700",
    retrying: "border-amber-200 bg-amber-50 text-amber-700",
    failed: "border-rose-200 bg-rose-50 text-rose-700",
  };
  return classes[status];
}

function healthClass(health: AiosIntegrationHealth): string {
  const classes: Record<AiosIntegrationHealth, string> = {
    healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
    degraded: "border-amber-200 bg-amber-50 text-amber-700",
    failed: "border-rose-200 bg-rose-50 text-rose-700",
    mocked: "border-indigo-200 bg-indigo-50 text-indigo-700",
  };
  return classes[health];
}

function StatusBadge({ status }: { status: AiosRunStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>
      {statusLabels[status]}
    </span>
  );
}

function HealthBadge({ health }: { health: AiosIntegrationHealth }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${healthClass(health)}`}>
      {integrationHealthLabels[health]}
    </span>
  );
}

function shouldUseDemoSummary(summary: AiosSummaryResponse | null): boolean {
  return !summary || summary.total_leads === 0;
}

function shouldUseDemoDetail(detail: AiosKpiDetailResponse | null): boolean {
  return !detail || detail.daily_kpis.length === 0;
}

export default function AiosDashboardPage() {
  const [summary, setSummary] = useState<AiosSummaryResponse | null>(null);
  const [detail, setDetail] = useState<AiosKpiDetailResponse | null>(null);
  const [integrationTest, setIntegrationTest] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [summaryRes, detailRes] = await Promise.all([
          fetch("/api/onboarding/dashboard/summary", { cache: "no-store" }),
          fetch("/api/onboarding/dashboard/kpi-detail?days=30", { cache: "no-store" }),
        ]);

        if (!summaryRes.ok) throw new Error(`Summary API failed (${summaryRes.status})`);
        if (!detailRes.ok) throw new Error(`KPI detail API failed (${detailRes.status})`);

        const summaryJson = (await summaryRes.json()) as AiosSummaryResponse;
        const detailJson = (await detailRes.json()) as AiosKpiDetailResponse;

        if (!active) return;
        setSummary(summaryJson);
        setDetail(detailJson);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load live dashboard metrics.");
        setSummary(demoSummary);
        setDetail(demoKpiDetail);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const visibleSummary = shouldUseDemoSummary(summary) ? demoSummary : summary;
  const visibleDetail = shouldUseDemoDetail(detail) ? demoKpiDetail : detail;
  const isDemoMode = shouldUseDemoSummary(summary) || shouldUseDemoDetail(detail) || Boolean(error);

  const successRate = useMemo(() => {
    if (!visibleSummary || visibleSummary.total_leads === 0) return 0;
    return Math.round((visibleSummary.completed / visibleSummary.total_leads) * 100);
  }, [visibleSummary]);

  const pendingJobs = aiosDemoRuns.filter((run) => run.status === "queued" || run.status === "processing").length;
  const retryingRuns = aiosDemoRuns.filter((run) => run.status === "retrying").length;

  const runIntegrationTest = async () => {
    setIntegrationTest(null);
    const res = await fetch("/api/onboarding/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Sarah Mitchell", risk_profile: "Balanced" }),
    });
    const payload = (await res.json()) as Record<string, unknown>;
    setIntegrationTest({
      http_status: res.status,
      ...payload,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Demo Mode Ready</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">AIOS - Financial Advisory Automation Ops</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Production-style observability for AI onboarding runs, queue states, integrations, failures, retries,
              and advisor handoff readiness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDemoMode ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                Demo data active
              </span>
            ) : (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Live API metrics
              </span>
            )}
            <Link
              href="/portfolio/ai-client-onboarding"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Case Study
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runIntegrationTest}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Test CRM/Calendar Integration
          </button>
          <Link
            href={`/aios/runs/${aiosDemoRuns[0].id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Open Example Run
          </Link>
        </div>

        {integrationTest ? (
          <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-xs">
            {JSON.stringify(integrationTest, null, 2)}
          </pre>
        ) : null}

        {loading ? <p className="mt-8 text-sm text-slate-600">Loading KPI dashboard...</p> : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Live API unavailable: {error}. Showing realistic demo automation runs.
          </p>
        ) : null}

        {visibleSummary && visibleDetail ? (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Total Runs</p>
                <p className="mt-2 text-2xl font-bold">{visibleSummary.total_leads}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Success Rate</p>
                <p className="mt-2 text-2xl font-bold">{successRate}%</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Failed Automations</p>
                <p className="mt-2 text-2xl font-bold">{visibleSummary.failed}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Average Processing Time</p>
                <p className="mt-2 text-2xl font-bold">{formatDuration(visibleSummary.avg_duration_ms)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Pending Jobs</p>
                <p className="mt-2 text-2xl font-bold">{pendingJobs}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Retrying Runs</p>
                <p className="mt-2 text-2xl font-bold">{retryingRuns}</p>
              </div>
            </section>

            <section className="mt-8 rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold">Automation Runs</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Demo records mirror financial advisory onboarding states for completed, processing, retrying, and failed runs.
                </p>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Goal</th>
                      <th className="px-4 py-3">Failed Stage</th>
                      <th className="px-4 py-3">Retry Count</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Integrations</th>
                      <th className="px-4 py-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiosDemoRuns.map((run) => (
                      <tr key={run.id} className="border-b border-slate-100 align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{run.clientName}</p>
                          <p className="text-xs text-slate-500">{run.location}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={run.status} />
                        </td>
                        <td className="px-4 py-3">{run.goal}</td>
                        <td className="px-4 py-3">
                          {run.failedStage ? (
                            <>
                              <p>{formatStage(run.failedStage)}</p>
                              <p className="text-xs text-rose-600">{run.failureReason}</p>
                            </>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{run.retryCount}</td>
                        <td className="px-4 py-3">{formatDuration(run.durationMs)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <HealthBadge health={run.crmSync} />
                            <HealthBadge health={run.calendarEvent} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/aios/runs/${run.id}`} className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                            View run
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold">Stage Distribution</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {visibleSummary.stage_distribution.map((item) => (
                    <li key={item.current_stage} className="flex items-center justify-between">
                      <span>{formatStage(item.current_stage)}</span>
                      <span className="font-semibold">{item.total}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold">Integration Health</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {visibleDetail.integration_health.map((item) => (
                    <li key={item.stage} className="flex items-center justify-between gap-4">
                      <span>{formatStage(item.stage)}</span>
                      <span className="font-semibold">
                        {item.failed_count > 0 ? "Degraded" : "Healthy"} · {item.success_count} success / {item.failed_count} failed
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-4">
                    <span>AI Provider</span>
                    <span className="font-semibold">Mocked · portfolio-safe fallback</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Daily KPI Trend ({visibleDetail.range.from} to {visibleDetail.range.to})</h2>
              <div className="mt-4 overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Leads</th>
                      <th className="px-2 py-2">Completed</th>
                      <th className="px-2 py-2">Failed</th>
                      <th className="px-2 py-2">AI Summary</th>
                      <th className="px-2 py-2">Email</th>
                      <th className="px-2 py-2">CRM Sync</th>
                      <th className="px-2 py-2">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDetail.daily_kpis.map((row) => (
                      <tr key={row.date} className="border-b border-slate-100">
                        <td className="px-2 py-2">{row.date}</td>
                        <td className="px-2 py-2">{row.total_leads}</td>
                        <td className="px-2 py-2">{row.completed_runs}</td>
                        <td className="px-2 py-2">{row.failed_runs}</td>
                        <td className="px-2 py-2">{row.ai_summary_count}</td>
                        <td className="px-2 py-2">{row.email_sent_count}</td>
                        <td className="px-2 py-2">{row.crm_sync_count}</td>
                        <td className="px-2 py-2">{formatDuration(row.avg_duration_ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
