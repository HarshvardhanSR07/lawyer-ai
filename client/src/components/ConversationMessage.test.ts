import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationMessage } from "./ConversationMessage";

Object.assign(globalThis, { React });

describe("ConversationMessage", () => {
  it("renders user and verified assistant history with timestamps, citations, and confidence metadata", () => {
    const userMessage = renderToStaticMarkup(ConversationMessage({
      message: { id: "user-1", speaker: "user", text: "When is delivery due?", createdAt: Date.UTC(2026, 0, 2, 9, 5) },
    }));
    const assistantMessage = renderToStaticMarkup(ConversationMessage({
      message: {
        id: "assistant-1",
        speaker: "assistant",
        text: "The contract says delivery is due Monday.",
        createdAt: Date.UTC(2026, 0, 2, 9, 6),
        verificationStatus: "approved",
        confidence: "high",
        citations: ["Indian Contract Act, 1872 · Section 10"],
      },
    }));

    expect(userMessage).toContain("You");
    expect(userMessage).toContain("When is delivery due?");
    expect(userMessage).toContain("dateTime=\"2026-01-02T09:05:00.000Z\"");
    expect(assistantMessage).toContain("LawyerAI · verified · high confidence");
    expect(assistantMessage).toContain("Verified sources");
    expect(assistantMessage).toContain("Indian Contract Act, 1872 · Section 10");
  });

  it("uses review-required labels rather than verified claims for flagged messages", () => {
    const flaggedMessage = renderToStaticMarkup(ConversationMessage({
      message: {
        id: "assistant-flagged",
        speaker: "assistant",
        text: "I cannot verify that conclusion.",
        createdAt: Date.UTC(2026, 0, 2, 9, 7),
        verificationStatus: "flagged",
        citations: ["Illustrative dataset row"],
      },
    }));

    expect(flaggedMessage).toContain("review required");
    expect(flaggedMessage).toContain("Sources reviewed");
    expect(flaggedMessage).not.toContain("Verified sources");
  });
});
