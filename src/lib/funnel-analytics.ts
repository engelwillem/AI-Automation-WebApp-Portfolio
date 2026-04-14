"use client";

type FunnelEventName =
  | "landing_cta_click"
  | "signup_start"
  | "signup_success"
  | "login_success"
  | "renungan_start"
  | "renungan_complete"
  | "continue_to_versehub"
  | "reflection_bookmark"
  | "renungan_doakan_clicked"
  | "renungan_request_started"
  | "renungan_first_loading_stage_shown"
  | "renungan_loading_stage_shown"
  | "renungan_request_succeeded"
  | "renungan_request_failed"
  | "renungan_frontend_coherence_fallback_triggered"
  | "renungan_final_render_complete"
  | "renungan_result_helpful"
  | "renungan_result_not_helpful"
  | "renungan_followup_opened";

type FunnelEventPayload = {
  path?: string;
  surface?: string;
  meta?: Record<string, unknown>;
};

const SESSION_KEY = "tct:funnel:session-id";

function getClientPath(): string {
  if (typeof window === "undefined") return "server";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const stored = window.localStorage.getItem(SESSION_KEY);
  if (stored) return stored;

  const nextId = `fn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(SESSION_KEY, nextId);
  return nextId;
}

export async function trackFunnelEvent(
  eventName: FunnelEventName,
  payload: FunnelEventPayload = {}
): Promise<void> {
  if (typeof window === "undefined") return;

  const body = {
    session_id: getSessionId(),
    event_name: eventName,
    path: payload.path ?? getClientPath(),
    surface: payload.surface ?? "web",
    meta: payload.meta ?? {},
    occurred_at: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent("tct:funnel:event", { detail: body }));

  try {
    await fetch("/api/analytics/funnel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Analytics must never block the user flow.
  }
}
