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

  it("maps full mentor payload fields when provided by backend", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            mentor_opening: "Terima kasih sudah jujur.",
            meditation:
              "Kebingunganmu soal kerja hari ini Tuhan lihat dengan penuh kasih. Bawa isi hati ini dalam doa, lalu ambil langkah kecil dengan damai dan hikmat. Tuhan tetap menuntun hatimu agar tidak berjalan sendiri.",
            prayer_prompt: "Tuhan, tuntun langkahku hari ini.",
            follow_up_question: "Langkah kecil apa yang bisa kamu lakukan hari ini?",
            confidence: "high",
            safety_notes: ["Ambil jeda saat emosi tinggi."],
            request_id: "req-mentor-1",
            driver: "openai",
            used_fallback: false,
            verse: {
              text: "Percayalah kepada TUHAN dengan segenap hatimu.",
              reference: "Amsal 3:5",
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-renungan-request-id": "req-mentor-1",
          },
        }
      )
    );

    const result = await generatePersonalRenungan("saya bingung soal kerja", sessionContent);

    expect(result.mentorOpening).toBe("Terima kasih sudah jujur.");
    expect(result.prayerPrompt).toBe("Tuhan, tuntun langkahku hari ini.");
    expect(result.followUpQuestion).toContain("Langkah kecil");
    expect(result.confidence).toBe("high");
    expect(result.safetyNotes).toEqual(["Ambil jeda saat emosi tinggi."]);
    expect(result.requestId).toBe("req-mentor-1");
    expect(result.driver).toBe("openai");
    expect(result.usedFallback).toBe(false);
  });

  it("keeps rendering-safe output with minimal payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            meditation:
              "Saat masa depan terasa kabur, Tuhan tetap memegang hatimu dengan tenang. Bawalah kecemasanmu dalam doa, lalu ambil langkah kecil dengan damai dan hikmat. Tuhan menuntunmu setia hari ini.",
            verse: {
              text: "Percayalah kepada TUHAN dengan segenap hatimu.",
              reference: "Amsal 3:5",
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    const result = await generatePersonalRenungan("bingung masa depan", sessionContent);

    expect(result.meditation.length).toBeGreaterThan(80);
    expect(result.verseText).toBe("Percayalah kepada TUHAN dengan segenap hatimu.");
    expect(result.verseReference).toBe("Amsal 3:5");
    expect(result.mentorOpening).toBeUndefined();
    expect(result.prayerPrompt).toBeUndefined();
    expect(result.followUpQuestion).toBeUndefined();
  });

  it("maps fallback metadata when backend marks used_fallback true", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            meditation:
              "Saat kebingungan datang, Tuhan tetap menolongmu menata hati dengan damai. Bawa pergumulanmu dalam doa, lalu ambil satu langkah kecil dalam hikmat. Tuhan menuntunmu dengan kasih setia hari ini.",
            verse: {
              text: "Percayalah kepada TUHAN dengan segenap hatimu.",
              reference: "Amsal 3:5",
            },
            driver: "template",
            used_fallback: true,
            request_id: "req-fallback-1",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    const result = await generatePersonalRenungan("saya bingung hari ini", sessionContent);

    expect(result.driver).toBe("template");
    expect(result.usedFallback).toBe(true);
    expect(result.requestId).toBe("req-fallback-1");
  });
});
