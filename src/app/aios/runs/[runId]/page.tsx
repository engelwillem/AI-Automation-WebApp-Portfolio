import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAiosDemoRun,
  integrationHealthLabels,
  statusLabels,
  type AiosIntegrationHealth,
  type AiosRunStatus,
  type AiosStageStatus,
} from "@/features/aios/demo-data";

function formatDuration(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "-";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  if (value === "-") return "-";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  }).format(new Date(value));
}

function statusClass(status: AiosRunStatus | AiosStageStatus): string {
  const classes: Record<AiosRunStatus | AiosStageStatus, string> = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    processing: "border-sky-200 bg-sky-50 text-sky-700",
    queued: "border-slate-200 bg-slate-50 text-slate-700",
    retrying: "border-amber-200 bg-amber-50 text-amber-700",
    failed: "border-rose-200 bg-rose-50 text-rose-700",
    pending: "border-slate-200 bg-slate-50 text-slate-500",
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

function StatusBadge({ status }: { status: AiosRunStatus | AiosStageStatus }) {
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

export default async function AiosRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = getAiosDemoRun(runId);
  if (!run) notFound();

  const integrations = [
    { name: "CRM", health: run.crmSync },
    { name: "Calendar", health: run.calendarEvent },
    { name: "Email", health: run.emailWorkflow },
    { name: "AI Provider", health: run.aiProvider },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AIOS Run Detail</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{run.clientName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Demo-mode operational detail for one financial advisory onboarding automation run.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={run.status} />
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              Demo Mode
            </span>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Started At</p>
            <p className="mt-2 text-sm font-semibold">{formatDateTime(run.startedAt)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Finished / Current Stage</p>
            <p className="mt-2 text-sm font-semibold">{run.finishedAt ? formatDateTime(run.finishedAt) : run.currentStage}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Duration</p>
            <p className="mt-2 text-sm font-semibold">{formatDuration(run.durationMs)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Retry Count</p>
            <p className="mt-2 text-sm font-semibold">{run.retryCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Failed Stage</p>
            <p className="mt-2 text-sm font-semibold">{run.failedStage ?? "-"}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Client Profile</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-slate-500">Goal</dt><dd className="font-medium">{run.goal}</dd></div>
              <div><dt className="text-slate-500">Income</dt><dd className="font-medium">{run.income}</dd></div>
              <div><dt className="text-slate-500">Risk Profile</dt><dd className="font-medium">{run.riskProfile}</dd></div>
              <div><dt className="text-slate-500">Location</dt><dd className="font-medium">{run.location}</dd></div>
              <div><dt className="text-slate-500">Interests</dt><dd className="font-medium">{run.interests.join(", ")}</dd></div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold">AI Output</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{run.aiSummary}</p>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Key Planning Considerations</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {run.keyPlanningConsiderations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <span className="font-semibold">Suggested next step:</span> {run.suggestedNextStep}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Workflow Timeline</h2>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {run.workflowTimeline.map((stage) => (
                  <tr key={stage.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium">{stage.label}</td>
                    <td className="px-3 py-2"><StatusBadge status={stage.status} /></td>
                    <td className="px-3 py-2">{formatDateTime(stage.timestamp)}</td>
                    <td className="px-3 py-2">{formatDuration(stage.durationMs)}</td>
                    <td className="px-3 py-2 text-rose-600">{stage.errorMessage ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Integration Results</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {integrations.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  <HealthBadge health={item.health} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Operational Logs</h2>
            <div className="mt-3 max-h-80 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="px-2 py-2">Timestamp</th>
                    <th className="px-2 py-2">Level</th>
                    <th className="px-2 py-2">Stage</th>
                    <th className="px-2 py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {run.operationalLogs.map((log) => (
                    <tr key={`${log.timestamp}-${log.message}`} className="border-b border-slate-100 align-top">
                      <td className="px-2 py-2">{formatDateTime(log.timestamp)}</td>
                      <td className="px-2 py-2 uppercase">{log.level}</td>
                      <td className="px-2 py-2">{log.stage}</td>
                      <td className="px-2 py-2">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <nav className="mt-8 flex flex-wrap gap-3">
          <Link href="/aios" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Back to AIOS
          </Link>
          <Link href="/portfolio/ai-client-onboarding" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Client Onboarding Case Study
          </Link>
          <Link href="/portfolio/operations-dashboard" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Operations Dashboard Case Study
          </Link>
        </nav>
      </div>
    </main>
  );
}
