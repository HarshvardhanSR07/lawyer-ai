import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Beyond Presence render-only avatar integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("BEY_API_KEY", "test-render-key");
    vi.stubEnv("BEYOND_PRESENCE_AVATAR_ID", "avatar-123");
    vi.stubEnv("LIVEKIT_URL", "wss://lawyerai-test.livekit.cloud");
    vi.stubEnv("LIVEKIT_API_KEY", "livekit-key");
    vi.stubEnv("LIVEKIT_API_SECRET", "livekit-secret");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("creates a single audio-to-video session and returns browser-scoped LiveKit details only", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: "render-123", status: { type: "to_start" } }), { status: 201 }));

    const { createLiveAvatarCall } = await import("./beyondPresence");
    const session = await createLiveAvatarCall();

    expect(session).toMatchObject({
      agentId: "bey-render-only",
      callId: "render-123",
      rendererStatus: "starting",
      livekitUrl: "wss://lawyerai-test.livekit.cloud",
    });
    expect(session.livekitToken).toMatch(/^ey/);
    expect(session).not.toHaveProperty("apiKey");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.bey.dev/v1/sessions");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ "x-api-key": "test-render-key" }),
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      transport: "livekit",
      avatar_id: "avatar-123",
      url: "wss://lawyerai-test.livekit.cloud",
      token: expect.any(String),
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("/agents");
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("/calls");
  });

  it("preserves the legal response path when the optional renderer cannot start", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Renderer capacity unavailable" }), { status: 429 }));

    const { createLiveAvatarCall } = await import("./beyondPresence");
    const session = await createLiveAvatarCall();

    expect(session).toMatchObject({ rendererStatus: "unavailable", callId: null });
    expect(session.rendererError).toContain("Avatar video renderer is unavailable");
    expect(session.livekitToken).toMatch(/^ey/);
  });
});
