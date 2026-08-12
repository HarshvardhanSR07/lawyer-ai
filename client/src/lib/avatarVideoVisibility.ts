export type AvatarVideoState = "connecting" | "listening" | "thinking" | "speaking" | "offline" | "permission";

/** The remote renderer is visible only for an active verified response with a healthy video track. */
export function shouldShowRenderOnlyAvatarVideo({
  state,
  hasRendererVideo,
  rendererUnavailable,
}: {
  state: AvatarVideoState;
  hasRendererVideo: boolean;
  rendererUnavailable: boolean;
}) {
  return state === "speaking" && hasRendererVideo && !rendererUnavailable;
}
