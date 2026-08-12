import { describe, expect, it } from "vitest";
import { shouldShowRenderOnlyAvatarVideo } from "./avatarVideoVisibility";

describe("render-only avatar visibility", () => {
  it("shows the remote video only while a verified response is speaking and a renderer track is healthy", () => {
    expect(shouldShowRenderOnlyAvatarVideo({ state: "speaking", hasRendererVideo: true, rendererUnavailable: false })).toBe(true);
  });

  it("keeps the 2D fallback visible if response-audio relay or renderer video is unavailable", () => {
    expect(shouldShowRenderOnlyAvatarVideo({ state: "speaking", hasRendererVideo: true, rendererUnavailable: true })).toBe(false);
    expect(shouldShowRenderOnlyAvatarVideo({ state: "speaking", hasRendererVideo: false, rendererUnavailable: false })).toBe(false);
  });

  it("keeps the 2D fallback visible outside verified response playback", () => {
    expect(shouldShowRenderOnlyAvatarVideo({ state: "listening", hasRendererVideo: true, rendererUnavailable: false })).toBe(false);
  });
});
