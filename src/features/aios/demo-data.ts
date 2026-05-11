export type AiosRunStatus = "completed" | "processing" | "queued" | "retrying" | "failed";
export type AiosStageStatus = "completed" | "processing" | "queued" | "retrying" | "failed" | "pending";
export type AiosIntegrationHealth = "healthy" | "degraded" | "failed" | "mocked";

export type AiosWorkflowStage = {
  id: string;
  label: string;
  status: AiosStageStatus;
  timestamp: string;
  durationMs: number | null;
  errorMessage?: string;
};

export type AiosOperationalLog = {
  timestamp: string;
  level: "info" | "warning" | "error";
  stage: string;
  message: string;
};

export type AiosDemoRun = {
  id: string;
  clientName: string;
  location: string;
  goal: string;
  income: string;
  riskProfile: string;
  interests: string[];
  status: AiosRunStatus;
  startedAt: string;
  finishedAt: string | null;
  currentStage: string;
  durationMs: number | null;
  retryCount: number;
  failedStage?: string;
  failureReason?: string;
  advisorTask: string;
  crmSync: AiosIntegrationHealth;
  calendarEvent: AiosIntegrationHealth;
  emailWorkflow: AiosIntegrationHealth;
  aiProvider: AiosIntegrationHealth;
  aiSummary: string;
  keyPlanningConsiderations: string[];
  suggestedNextStep: string;
  workflowTimeline: AiosWorkflowStage[];
  operationalLogs: AiosOperationalLog[];
};

export type AiosSummaryResponse = {
  total_leads: number;
  completed: number;
  failed: number;
  avg_duration_ms: number | null;
  stage_distribution: Array<{ current_stage: string; total: number }>;
  failure_reasons: Array<{ error_code: string; total: number }>;
};

export type AiosKpiDetailResponse = {
  range: { days: number; from: string; to: string };
  daily_kpis: Array<{
    date: string;
    total_leads: number;
    completed_runs: number;
    failed_runs: number;
    avg_duration_ms: number;
    ai_summary_count: number;
    email_sent_count: number;
    crm_sync_count: number;
  }>;
  funnel_success_counts: Array<{ stage: string; total: number }>;
  failure_by_error_code: Array<{ error_code: string | null; total: number }>;
  integration_health: Array<{ stage: string; success_count: number; failed_count: number }>;
};

export const statusLabels: Record<AiosRunStatus | AiosStageStatus, string> = {
  completed: "Completed",
  processing: "Processing",
  queued: "Queued",
  retrying: "Retrying",
  failed: "Failed",
  pending: "Pending",
};

export const integrationHealthLabels: Record<AiosIntegrationHealth, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  failed: "Failed",
  mocked: "Mocked",
};

const demoWorkflowStages = [
  { id: "lead_intake", label: "Lead intake" },
  { id: "validate_lead", label: "Validate lead" },
  { id: "generate_ai_summary", label: "Generate AI summary" },
  { id: "create_advisor_task", label: "Create advisor task" },
  { id: "send_welcome_email", label: "Send welcome email" },
  { id: "create_calendar_event", label: "Create calendar event" },
  { id: "sync_crm", label: "Sync CRM" },
  { id: "update_dashboard_metrics", label: "Update dashboard metrics" },
] as const;

function buildTimeline(
  statuses: Partial<Record<(typeof demoWorkflowStages)[number]["id"], AiosStageStatus>>,
  errorByStage: Partial<Record<(typeof demoWorkflowStages)[number]["id"], string>> = {}
): AiosWorkflowStage[] {
  return demoWorkflowStages.map((stage, index) => {
    const status = statuses[stage.id] ?? "pending";
    return {
      ...stage,
      status,
      timestamp: status === "pending" ? "-" : `2026-05-11T09:${String(8 + index * 2).padStart(2, "0")}:00+10:00`,
      durationMs: status === "pending" || status === "queued" ? null : 700 + index * 260,
      ...(errorByStage[stage.id] ? { errorMessage: errorByStage[stage.id] } : {}),
    };
  });
}

export const aiosDemoRuns: AiosDemoRun[] = [
  {
    id: "run-sarah-mitchell",
    clientName: "Sarah Mitchell",
    location: "Sydney, Australia",
    goal: "Retirement planning",
    income: "AUD 120,000",
    riskProfile: "Balanced",
    interests: ["Superannuation review", "Insurance review", "Investment planning"],
    status: "completed",
    startedAt: "2026-05-11T09:08:00+10:00",
    finishedAt: "2026-05-11T09:10:18+10:00",
    currentStage: "update_dashboard_metrics",
    durationMs: 138000,
    retryCount: 0,
    advisorTask: "Prepare retirement planning discovery call",
    crmSync: "healthy",
    calendarEvent: "healthy",
    emailWorkflow: "healthy",
    aiProvider: "mocked",
    aiSummary:
      "Sarah is a Sydney-based prospective client seeking retirement planning support. Her profile indicates a balanced risk appetite, strong interest in superannuation optimization, insurance review, and long-term investment planning. Advisor should prepare a discovery call focused on retirement timeline, super balance, insurance coverage, and contribution strategy.",
    keyPlanningConsiderations: [
      "Confirm retirement timeline and target income needs.",
      "Review superannuation contribution strategy and insurance coverage.",
      "Prepare balanced portfolio discussion with downside-risk framing.",
    ],
    suggestedNextStep: "Book a retirement planning discovery call and request current superannuation and insurance statements.",
    workflowTimeline: buildTimeline({
      lead_intake: "completed",
      validate_lead: "completed",
      generate_ai_summary: "completed",
      create_advisor_task: "completed",
      send_welcome_email: "completed",
      create_calendar_event: "completed",
      sync_crm: "completed",
      update_dashboard_metrics: "completed",
    }),
    operationalLogs: [
      { timestamp: "2026-05-11T09:08:00+10:00", level: "info", stage: "lead_intake", message: "Lead received from portfolio demo intake." },
      { timestamp: "2026-05-11T09:08:42+10:00", level: "info", stage: "generate_ai_summary", message: "Advisor-ready summary generated with structured planning considerations." },
      { timestamp: "2026-05-11T09:09:35+10:00", level: "info", stage: "sync_crm", message: "CRM sync completed successfully." },
      { timestamp: "2026-05-11T09:10:18+10:00", level: "info", stage: "update_dashboard_metrics", message: "KPI dashboard updated for completed onboarding run." },
    ],
  },
  {
    id: "run-daniel-harper",
    clientName: "Daniel Harper",
    location: "Melbourne, Australia",
    goal: "Insurance and cashflow review",
    income: "AUD 95,000",
    riskProfile: "Conservative",
    interests: ["Insurance review", "Cashflow planning", "Emergency fund"],
    status: "processing",
    startedAt: "2026-05-11T09:24:00+10:00",
    finishedAt: null,
    currentStage: "generate_ai_summary",
    durationMs: null,
    retryCount: 0,
    advisorTask: "Pending",
    crmSync: "mocked",
    calendarEvent: "mocked",
    emailWorkflow: "healthy",
    aiProvider: "mocked",
    aiSummary:
      "Pending AI summary. Early intake signals indicate conservative risk tolerance, insurance review needs, and cashflow planning interest.",
    keyPlanningConsiderations: [
      "Confirm current insurance coverage and cashflow commitments.",
      "Assess emergency fund and short-term liquidity needs.",
      "Prepare conservative advice framing before advisor handoff.",
    ],
    suggestedNextStep: "Wait for AI summary completion before creating advisor task.",
    workflowTimeline: buildTimeline({
      lead_intake: "completed",
      validate_lead: "completed",
      generate_ai_summary: "processing",
      create_advisor_task: "queued",
      send_welcome_email: "queued",
      create_calendar_event: "pending",
      sync_crm: "pending",
      update_dashboard_metrics: "pending",
    }),
    operationalLogs: [
      { timestamp: "2026-05-11T09:24:00+10:00", level: "info", stage: "lead_intake", message: "Lead received and queued for onboarding pipeline." },
      { timestamp: "2026-05-11T09:24:36+10:00", level: "info", stage: "validate_lead", message: "Lead validation completed." },
      { timestamp: "2026-05-11T09:25:12+10:00", level: "info", stage: "generate_ai_summary", message: "AI summary generation is in progress." },
    ],
  },
  {
    id: "run-priya-nair",
    clientName: "Priya Nair",
    location: "Brisbane, Australia",
    goal: "Investment portfolio review",
    income: "AUD 150,000",
    riskProfile: "Growth",
    interests: ["Investment planning", "Portfolio review", "Long-term wealth growth"],
    status: "retrying",
    startedAt: "2026-05-11T09:14:00+10:00",
    finishedAt: null,
    currentStage: "create_calendar_event",
    durationMs: 174000,
    retryCount: 2,
    failedStage: "create_calendar_event",
    failureReason: "Calendar API timeout",
    advisorTask: "Review growth portfolio objectives before second retry",
    crmSync: "healthy",
    calendarEvent: "degraded",
    emailWorkflow: "healthy",
    aiProvider: "mocked",
    aiSummary:
      "Priya is a Brisbane-based prospective client with a growth risk profile and interest in reviewing investment portfolio structure. Advisor should prepare for a discussion on asset allocation, diversification, long-term growth goals, and tolerance for volatility.",
    keyPlanningConsiderations: [
      "Clarify existing portfolio holdings and concentration risks.",
      "Discuss volatility tolerance and long-term investment horizon.",
      "Prepare growth-oriented review with diversification and tax considerations.",
    ],
    suggestedNextStep: "Retry calendar scheduling, then confirm advisor meeting and sync final appointment details to CRM.",
    workflowTimeline: buildTimeline(
      {
        lead_intake: "completed",
        validate_lead: "completed",
        generate_ai_summary: "completed",
        create_advisor_task: "completed",
        send_welcome_email: "completed",
        create_calendar_event: "retrying",
        sync_crm: "completed",
        update_dashboard_metrics: "queued",
      },
      { create_calendar_event: "Calendar API timeout" }
    ),
    operationalLogs: [
      { timestamp: "2026-05-11T09:14:00+10:00", level: "info", stage: "lead_intake", message: "Lead received from investment review intake." },
      { timestamp: "2026-05-11T09:15:06+10:00", level: "info", stage: "generate_ai_summary", message: "AI summary completed for advisor handoff." },
      { timestamp: "2026-05-11T09:16:28+10:00", level: "warning", stage: "create_calendar_event", message: "Calendar API timeout. Retry attempt 1 scheduled." },
      { timestamp: "2026-05-11T09:16:54+10:00", level: "error", stage: "create_calendar_event", message: "Calendar API timeout persisted. Run marked retrying." },
      { timestamp: "2026-05-11T09:17:02+10:00", level: "info", stage: "sync_crm", message: "CRM sync completed before calendar retry." },
    ],
  },
  {
    id: "run-sample-failed",
    clientName: "Sample Failed Automation",
    location: "Adelaide, Australia",
    goal: "Demo failure observability",
    income: "AUD 0",
    riskProfile: "Demo",
    interests: ["Failure monitoring", "Retry visibility"],
    status: "failed",
    startedAt: "2026-05-11T08:42:00+10:00",
    finishedAt: "2026-05-11T08:43:11+10:00",
    currentStage: "create_calendar_event",
    durationMs: 71000,
    retryCount: 1,
    failedStage: "create_calendar_event",
    failureReason: "Calendar API timeout",
    advisorTask: "Created before calendar failure",
    crmSync: "healthy",
    calendarEvent: "failed",
    emailWorkflow: "healthy",
    aiProvider: "mocked",
    aiSummary:
      "Demo failure record used to show how the operations dashboard surfaces a failed integration stage without exposing real client data.",
    keyPlanningConsiderations: [
      "Confirm retry policy before manual intervention.",
      "Review integration timeout threshold and provider status.",
      "Keep advisor task available even if calendar scheduling fails.",
    ],
    suggestedNextStep: "Investigate calendar adapter timeout and retry with backoff.",
    workflowTimeline: buildTimeline(
      {
        lead_intake: "completed",
        validate_lead: "completed",
        generate_ai_summary: "completed",
        create_advisor_task: "completed",
        send_welcome_email: "completed",
        create_calendar_event: "failed",
        sync_crm: "completed",
        update_dashboard_metrics: "completed",
      },
      { create_calendar_event: "Calendar API timeout" }
    ),
    operationalLogs: [
      { timestamp: "2026-05-11T08:42:00+10:00", level: "info", stage: "lead_intake", message: "Demo failure run started." },
      { timestamp: "2026-05-11T08:42:47+10:00", level: "info", stage: "create_advisor_task", message: "Advisor task created before integration failure." },
      { timestamp: "2026-05-11T08:43:02+10:00", level: "error", stage: "create_calendar_event", message: "Calendar API timeout after retry attempt 1." },
      { timestamp: "2026-05-11T08:43:11+10:00", level: "warning", stage: "update_dashboard_metrics", message: "Failure state recorded for dashboard visibility." },
    ],
  },
];

export function getAiosDemoRun(runId: string): AiosDemoRun | undefined {
  return aiosDemoRuns.find((run) => run.id === runId);
}

export const exampleAiosRunId = "run-sarah-mitchell";

export const demoSummary: AiosSummaryResponse = {
  total_leads: aiosDemoRuns.length,
  completed: aiosDemoRuns.filter((run) => run.status === "completed").length,
  failed: aiosDemoRuns.filter((run) => run.status === "failed").length,
  avg_duration_ms: 127000,
  stage_distribution: [
    { current_stage: "update_dashboard_metrics", total: 2 },
    { current_stage: "generate_ai_summary", total: 1 },
    { current_stage: "create_calendar_event", total: 1 },
  ],
  failure_reasons: [{ error_code: "CALENDAR_TIMEOUT", total: 2 }],
};

export const demoKpiDetail: AiosKpiDetailResponse = {
  range: { days: 30, from: "2026-04-12", to: "2026-05-11" },
  daily_kpis: [
    {
      date: "2026-05-09",
      total_leads: 2,
      completed_runs: 2,
      failed_runs: 0,
      avg_duration_ms: 112000,
      ai_summary_count: 2,
      email_sent_count: 2,
      crm_sync_count: 2,
    },
    {
      date: "2026-05-10",
      total_leads: 3,
      completed_runs: 2,
      failed_runs: 1,
      avg_duration_ms: 139000,
      ai_summary_count: 3,
      email_sent_count: 3,
      crm_sync_count: 3,
    },
    {
      date: "2026-05-11",
      total_leads: 4,
      completed_runs: 1,
      failed_runs: 1,
      avg_duration_ms: 127000,
      ai_summary_count: 3,
      email_sent_count: 3,
      crm_sync_count: 3,
    },
  ],
  funnel_success_counts: [
    { stage: "lead_intake", total: 4 },
    { stage: "validate_lead", total: 4 },
    { stage: "ai_summary_generated", total: 3 },
    { stage: "advisor_task_created", total: 3 },
    { stage: "welcome_email_sent", total: 3 },
    { stage: "crm_synced", total: 3 },
  ],
  failure_by_error_code: [{ error_code: "CALENDAR_TIMEOUT", total: 2 }],
  integration_health: [
    { stage: "crm_synced", success_count: 3, failed_count: 0 },
    { stage: "welcome_email_sent", success_count: 3, failed_count: 0 },
    { stage: "calendar_event_created", success_count: 1, failed_count: 2 },
  ],
};
