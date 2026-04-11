import { describe, expect, it, vi } from "vitest";
import { buildSafeRenunganTelemetryMeta, bucketInputLength, trackRenunganTelemetryEvent } from "./analytics";

const trackFunnelEventMock = vi.fn();

vi.mock("../../lib/funnel-analytics", () => ({
  trackFunnelEvent: (...args: unknown[]) => trackFunnelEventMock(...args),
}));

describe("today ritual telemetry analytics", () => {
  it("builds safe metadata without raw text", () => {
    const meta = buildSafeRenunganTelemetryMeta("saya mau jadi kaya raya");

    expect(meta.had_user_text).toBe(true);
    expect(meta.input_length_bucket).toBe("s_21_60");
    expect(meta).not.toHaveProperty("reflection_text");
  });

  it("maps length to expected bucket", () => {
    expect(bucketInputLength(8)).toBe("xs_0_20");
    expect(bucketInputLength(44)).toBe("s_21_60");
    expect(bucketInputLength(100)).toBe("m_61_140");
  });

  it("sends telemetry through funnel tracker with renungan surface", async () => {
    trackFunnelEventMock.mockResolvedValue(undefined);

    await trackRenunganTelemetryEvent("renungan_request_succeeded", {
      input_length_bucket: "m_61_140",
      total_request_ms: 840,
    });

    expect(trackFunnelEventMock).toHaveBeenCalledWith(
      "renungan_request_succeeded",
      expect.objectContaining({
        surface: "renungan",
        meta: expect.objectContaining({
          pipeline_version: "renungan.v2.1.telemetry",
          total_request_ms: 840,
        }),
      })
    );
  });
});
