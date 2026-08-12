import { describe, expect, it } from "vitest";
import { canReconnectLiveAvatar, LIVE_AVATAR_RECONNECT_ERROR, startBoundedLiveAvatarCall, startupFailureRecovery } from "./liveAvatarRecovery";

describe("live-avatar startup recovery", () => {
  it("turns a delayed startup into the actionable fallback-avatar reconnect error", async () => {
    const neverResolves = () => new Promise<never>(() => undefined);
    await expect(startBoundedLiveAvatarCall(neverResolves, 5)).rejects.toThrow(LIVE_AVATAR_RECONNECT_ERROR);

    const recovery = startupFailureRecovery(new Error(LIVE_AVATAR_RECONNECT_ERROR));
    expect(recovery).toEqual({ error: LIVE_AVATAR_RECONNECT_ERROR, avatarState: "offline" });
  });

  it("allows retry after startup failure but blocks reconnect while a session is starting or connected", () => {
    expect(canReconnectLiveAvatar({ isAuthenticated: true, isStarting: false, hasLiveRoom: false })).toBe(true);
    expect(canReconnectLiveAvatar({ isAuthenticated: true, isStarting: true, hasLiveRoom: false })).toBe(false);
    expect(canReconnectLiveAvatar({ isAuthenticated: true, isStarting: false, hasLiveRoom: true })).toBe(false);
  });
});
