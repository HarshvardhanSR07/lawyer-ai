export type VerifiedResponsePlaybackEvent = "started" | "ended" | "failed";

/** The renderer may display video, but only verified local Rime playback may enter speaking state. */
export function verifiedResponsePlaybackAvatarState(event: VerifiedResponsePlaybackEvent): "speaking" | "listening" {
  return event === "started" ? "speaking" : "listening";
}
