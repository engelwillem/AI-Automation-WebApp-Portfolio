import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePersonalRenungan } from "./personal-renungan";
import type { TodaySessionContent } from "./today-session.types";

const sessionContent: TodaySessionContent = {
  userName: "Guest",
  avatarInitial: "G",
  dateLabel: "Sabtu",
  greeting: "Selamat datang",
  openingLine: "Tuhan menyertai",
  verseLabel: "Ayat Hari Ini",
  verseText: "Percayalah kepada TUHAN dengan segenap hatimu.",
  verseReference: "Amsal 3:5",
  reflectionPrompt: "Apa isi hatimu?",
  reflectionPlaceholder: "Tulis di sini",
  reflectionCtaLabel: "Doakan",
  reflectionSealedLabel: "Telah didoakan",
  prayerLabel: "Doa",
  prayerText: "Amin",
  prayerCtaLabel: "Amin",
  prayerCompletionLabel: "Selesai",
  completionTitle: "Selesai",
  completionBody: "Damai sejahtera",
  softProgressLabel: "Langkah",
  progressValue: "1/1",
  tomorrowCueLabel: "Besok",
  tomorrowCueText: "Kembali lagi",
};

describe("generatePersonalRenungan telemetry fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emits coherence fallback telemetry when api output is generic", async () => {
    const onTelemetry = vi.fn();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              meditation:
                "Tuhan menyertaimu. Kamu tidak sendiri. Tetap semangat. Jalani hari ini dengan iman. Tetap percaya.",
              verse: {
                text: "Janganlah hendaknya hatimu gelisah.",
                reference: "Yohanes 14:1",
              },
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "x-renungan-request-id": "req-123",
              "x-renungan-pipeline-version": "renungan.v2.1.telemetry",
            },
          }
        )
      );

    const result = await generatePersonalRenungan(
      "saya lagi takut soal masa depan",
      sessionContent,
      { onTelemetry }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "fallback_triggered",
        reason: "coherence_guardrail",
        requestId: "req-123",
      })
    );
    expect(result.meditation.length).toBeGreaterThan(40);
  });
});
