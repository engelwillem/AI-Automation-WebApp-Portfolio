"use client";

import { trackFunnelEvent } from "../../lib/funnel-analytics";

type RenunganTelemetryEventName =
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

type RenunganTelemetryMeta = Record<string, unknown> & {
  input_length_bucket?: string;
};

export function bucketInputLength(length: number): string {
  if (length <= 20) return "xs_0_20";
  if (length <= 60) return "s_21_60";
  if (length <= 140) return "m_61_140";
  if (length <= 280) return "l_141_280";
  return "xl_281_plus";
}

export function buildSafeRenunganTelemetryMeta(reflectionText: string): RenunganTelemetryMeta {
  const clean = reflectionText.trim();
  return {
    had_user_text: clean.length > 0,
    input_length_bucket: bucketInputLength(clean.length),
    char_count: clean.length,
  };
}

export async function trackRenunganTelemetryEvent(
  eventName: RenunganTelemetryEventName,
  meta: RenunganTelemetryMeta = {}
): Promise<void> {
  try {
    await trackFunnelEvent(eventName, {
      surface: "renungan",
      meta: {
        pipeline_version: "renungan.v2.1.telemetry",
        ...meta,
      },
    });
  } catch {
    // Analytics should never block renungan flow.
  }
}
