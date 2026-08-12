import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Rime legal-speech fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("RIME_API_KEY", "rime-test-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps the Rime credential server-side and returns WAV audio as base64", async () => {
    const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(64)]);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(wav, { status: 200 }));

    const { synthesizeLegalSpeech } = await import("./rime");
    const speech = await synthesizeLegalSpeech("Please review this with a qualified lawyer.");

    expect(speech).toMatchObject({ contentType: "audio/wav" });
    expect(Buffer.from(speech.audioBase64, "base64").subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer rime-test-key" }),
    });
  });
});
