import { describe, expect, it } from "vitest";

describe("configured service credentials", () => {
  it("authenticates to the configured Qdrant Cloud collections endpoint", async () => {
    const baseUrl = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    expect(baseUrl).toMatch(/^https:\/\/.+/);
    expect(apiKey).toBeTruthy();

    const response = await fetch(`${baseUrl!.replace(/\/$/, "")}/collections`, {
      headers: { "api-key": apiKey! },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(200);
  }, 15_000);

  it("authenticates to the configured Supabase REST endpoint", async () => {
    const baseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(baseUrl).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(`${baseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey!}`,
      },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it("authenticates to the Beyond Presence avatars endpoint", async () => {
    const apiKey = process.env.BEYOND_PRESENCE_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.bey.dev/v1/avatars", {
      headers: { "x-api-key": apiKey! },
      signal: AbortSignal.timeout(10_000),
    });

    // A non-auth response confirms the supplied credential reached the provider.
    // It intentionally tolerates provider-side throttling or non-critical endpoint changes.
    expect([401, 403]).not.toContain(response.status);
  }, 15_000);

  it("authenticates the configured Hugging Face token before transcription or routed reasoning is enabled", async () => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: { Authorization: `Bearer ${apiKey!}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(200);
  }, 15_000);

  it("authenticates the configured OpenAI key for remote legal-document embeddings", async () => {
    const apiKey = process.env.OPENAI_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey!}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(200);
  }, 15_000);

  it("authenticates the configured Groq key for optional transcription", async () => {
    const apiKey = process.env.GROQ_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey!}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(200);
  }, 15_000);

  it("authenticates the configured Rime key for legal-response synthesis", async () => {
    const apiKey = process.env.RIME_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://users.rime.ai/v1/rime-tts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey!}`,
        "content-type": "application/json",
        accept: "audio/wav",
      },
      body: JSON.stringify({ text: "Credential validation.", speaker: "celeste", modelId: "coda" }),
      signal: AbortSignal.timeout(30_000),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("audio");
  }, 35_000);
});
