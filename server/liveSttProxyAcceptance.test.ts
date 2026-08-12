import { describe, expect, it } from "vitest";

const expectedTokens = "the delivery contract is due on monday".split(" ");

function wordAccuracy(transcript: string) {
  const actualTokens = transcript.toLowerCase().match(/[a-z]+/g) ?? [];
  const matchingTokens = expectedTokens.filter((token, index) => actualTokens[index] === token).length;
  return matchingTokens / expectedTokens.length;
}

describe.runIf(process.env.RUN_LIVE_STT_PROXY_ACCEPTANCE === "1")("live Node-to-FastAPI Whisper acceptance", () => {
  it("relays a known Rime legal phrase through the FastAPI STT route with at least 85% token accuracy", async () => {
    const [{ synthesizeLegalSpeech }, { transcribeWhisperAudio }] = await Promise.all([
      import("./rime"),
      import("./fastapiRag"),
    ]);
    const audio = await synthesizeLegalSpeech("The delivery contract is due on Monday.");
    const response = await transcribeWhisperAudio({
      audioBase64: audio.audioBase64,
      mimeType: audio.contentType,
      isFinal: true,
    });

    expect(response.is_final).toBe(true);
    expect(wordAccuracy(response.transcript)).toBeGreaterThanOrEqual(0.85);
  }, 90_000);
});
