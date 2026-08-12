import { describe, expect, it } from "vitest";
import { shouldStartQueuedWhisperListening } from "./handsFreeWhisper";

const ready = {
  queued: true,
  avatarState: "listening",
  isListening: false,
  isResponding: false,
  isTranscribing: false,
  hasLiveRoom: true,
};

describe("hands-free Whisper listening guard", () => {
  it("starts a single queued listening window only when the live session is ready", () => {
    expect(shouldStartQueuedWhisperListening(ready)).toBe(true);
  });

  it("does not overlap an active transcription, response, or recording", () => {
    expect(shouldStartQueuedWhisperListening({ ...ready, isListening: true })).toBe(false);
    expect(shouldStartQueuedWhisperListening({ ...ready, isTranscribing: true })).toBe(false);
    expect(shouldStartQueuedWhisperListening({ ...ready, isResponding: true })).toBe(false);
  });

  it("does not start when silent-loop protection has no queue or the room is unavailable", () => {
    expect(shouldStartQueuedWhisperListening({ ...ready, queued: false })).toBe(false);
    expect(shouldStartQueuedWhisperListening({ ...ready, hasLiveRoom: false })).toBe(false);
    expect(shouldStartQueuedWhisperListening({ ...ready, avatarState: "speaking" })).toBe(false);
  });
});
