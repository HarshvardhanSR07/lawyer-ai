import { describe, expect, it } from "vitest";
import { shouldSubmitWhisperAudio } from "./whisperSpeechGate";

describe("Whisper speech gate", () => {
  it("submits captured audio only after a speech threshold crossing", () => {
    expect(shouldSubmitWhisperAudio({ audioSize: 1024, detectedSpeech: true })).toBe(true);
  });

  it("keeps silent and empty captures in typed-input fallback mode", () => {
    expect(shouldSubmitWhisperAudio({ audioSize: 1024, detectedSpeech: false })).toBe(false);
    expect(shouldSubmitWhisperAudio({ audioSize: 0, detectedSpeech: true })).toBe(false);
  });
});
