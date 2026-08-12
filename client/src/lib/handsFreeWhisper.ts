export function shouldStartQueuedWhisperListening(input: {
  queued: boolean;
  avatarState: string;
  isListening: boolean;
  isResponding: boolean;
  isTranscribing: boolean;
  hasLiveRoom: boolean;
}): boolean {
  return input.queued
    && input.avatarState === "listening"
    && !input.isListening
    && !input.isResponding
    && !input.isTranscribing
    && input.hasLiveRoom;
}
