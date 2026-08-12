import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("persistent FastAPI legal-response proxy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FASTAPI_INTERNAL_URL", "http://127.0.0.1:8123/");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests a verified response from the private FastAPI service with the session RAG scope", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      response: "A verified, citation-grounded response.",
      legal_sources: [{ title: "Indian Contract Act", section: "73" }],
      evidence: [],
      counterargument: "",
      reasoning_summary: "",
      confidence: "high",
      verification_status: "approved",
    }), { status: 200 }));

    const { requestVerifiedLegalResponse } = await import("./fastapiRag");
    const result = await requestVerifiedLegalResponse({
      caseId: "live-session-123",
      question: "What remedy follows a contractual breach?",
      conversationHistory: [{ speaker: "user", text: "Review my contract." }],
    });

    expect(result.verification_status).toBe("approved");
    expect(result.confidence).toBe("high");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8123/api/reason",
      expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      case_id: "live-session-123",
      question: "What remedy follows a contractual breach?",
      conversation_history: [{ role: "user", content: "Review my contract." }],
    });
  });

  it("returns an actionable error when the persistent reasoning service is unavailable", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("Qdrant is unavailable", { status: 503, statusText: "Service Unavailable" }));

    const { requestVerifiedLegalResponse } = await import("./fastapiRag");
    await expect(requestVerifiedLegalResponse({ caseId: "session", question: "Question", conversationHistory: [] }))
      .rejects.toThrow("LawyerAI reasoning failed (503)");
  });

  it("sends browser audio only to the private Whisper endpoint with a bounded request", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      transcript: "Please review this agreement.",
      confidence: 0.91,
      is_final: true,
    }), { status: 200 }));

    const { transcribeWhisperAudio } = await import("./fastapiRag");
    const result = await transcribeWhisperAudio({
      audioBase64: "dGVzdC1hdWRpbw==",
      mimeType: "audio/webm",
      isFinal: true,
    });

    expect(result).toMatchObject({ transcript: "Please review this agreement.", is_final: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8123/api/stt",
      expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      audio_base64: "dGVzdC1hdWRpbw==",
      mime_type: "audio/webm",
      is_final: true,
    });
  });
});
