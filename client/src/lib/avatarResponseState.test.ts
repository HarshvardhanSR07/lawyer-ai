import { describe, expect, it } from "vitest";
import { verifiedResponsePlaybackAvatarState } from "./avatarResponseState";

describe("verified Rime response playback state", () => {
  it("enters speaking only when verified response playback starts", () => {
    expect(verifiedResponsePlaybackAvatarState("started")).toBe("speaking");
  });

  it("returns to listening when response playback ends or fails", () => {
    expect(verifiedResponsePlaybackAvatarState("ended")).toBe("listening");
    expect(verifiedResponsePlaybackAvatarState("failed")).toBe("listening");
  });
});
