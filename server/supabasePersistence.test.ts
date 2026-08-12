import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Supabase legal-assistant persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SUPABASE_URL", "https://project.example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("saves a provider session and verifies the authenticated session owner server-side", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "session-123" }]), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "session-123" }]), { status: 200 }));

    const { assertLiveSessionOwner, createLiveSession } = await import("./supabasePersistence");
    const session = await createLiveSession({ userOpenId: "user-123", agentId: "agent-123", callId: "call-123" });
    await assertLiveSessionOwner(session.id, "user-123");

    expect(session).toEqual({ id: "session-123" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://project.example.supabase.co/rest/v1/lawyer_sessions");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer service-role-test-key" }),
    });
    expect(fetchMock.mock.calls[1]?.[0]).toContain("user_open_id=eq.user-123");
  });
});
