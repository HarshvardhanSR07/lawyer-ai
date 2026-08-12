import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { AvatarFallback } from "./AvatarFallback";

Object.assign(globalThis, { React });

describe("AvatarFallback expression state", () => {
  it("maps listening, reasoning, and speaking states to their visible fallback-avatar phases", () => {
    const listening = renderToStaticMarkup(AvatarFallback({ state: "listening" }));
    const thinking = renderToStaticMarkup(AvatarFallback({ state: "thinking" }));
    const speaking = renderToStaticMarkup(AvatarFallback({ state: "speaking" }));

    expect(listening).toContain("LISTENING");
    expect(thinking).toContain("REASONING");
    expect(speaking).toContain("RESPONDING");
    expect(speaking).toContain("Speaking...");
  });

  it("does not show the speaking indicator when the fallback avatar is not in its responding state", () => {
    const offline = renderToStaticMarkup(AvatarFallback({ state: "offline" }));
    expect(offline).toContain("IDLE");
    expect(offline).not.toContain("Speaking...");
  });
});
