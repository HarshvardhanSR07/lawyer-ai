import DialogueAvatar from "./DialogueAvatar";
import type { LiveAvatarState } from "../LiveAvatarStage";

const phaseForState: Record<LiveAvatarState, "LISTENING" | "REASONING" | "RESPONDING" | "ANALYZING" | "IDLE"> = {
  connecting: "ANALYZING",
  listening: "LISTENING",
  thinking: "REASONING",
  speaking: "RESPONDING",
  offline: "IDLE",
  permission: "IDLE",
};

/** Preserved 2D dialogue avatar used whenever render-only video is unavailable or inactive. */
export function AvatarFallback({ state }: { state: LiveAvatarState }) {
  return <DialogueAvatar phase={phaseForState[state]} isPlaying={state === "speaking"} />;
}
