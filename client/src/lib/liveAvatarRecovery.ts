import type { LiveAvatarState } from "@/components/LiveAvatarStage";

export const LIVE_AVATAR_START_TIMEOUT_MS = 12_000;
export const LIVE_AVATAR_RECONNECT_ERROR = "The live avatar did not start in time. LawyerAI remains available with the fallback avatar; select Reconnect to try again.";

export async function startBoundedLiveAvatarCall<T>(start: () => Promise<T>, timeoutMs = LIVE_AVATAR_START_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(LIVE_AVATAR_RECONNECT_ERROR)), timeoutMs);
  });

  return Promise.race([start(), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function startupFailureRecovery(error: unknown): { error: string; avatarState: LiveAvatarState } {
  return {
    error: error instanceof Error ? error.message : "Unable to start the live avatar session.",
    avatarState: "offline",
  };
}

export function canReconnectLiveAvatar(input: { isAuthenticated: boolean; isStarting: boolean; hasLiveRoom: boolean }) {
  return input.isAuthenticated && !input.isStarting && !input.hasLiveRoom;
}
