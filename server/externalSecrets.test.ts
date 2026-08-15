import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function cloudflareR2Authorization(endpoint: URL, accessKeyId: string, secretAccessKey: string) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256("");
  const canonicalHeaders = `host:${endpoint.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `GET\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    amzDate,
    payloadHash,
  };
}

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

  it("authenticates the configured Hugging Face token before Whisper transcription is enabled", async () => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: { Authorization: `Bearer ${apiKey!}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(200);
  }, 15_000);

  it("authenticates the configured OpenAI key for verified legal reasoning", async () => {
    const apiKey = process.env.OPENAI_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey!}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(200);
  }, 15_000);

  it("authenticates the configured Groq key before any provider transition", async () => {
    const apiKey = process.env.GROQ_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey!}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(200);
  }, 15_000);

  it("authenticates the configured Cloudflare API token and R2 S3 credentials", async () => {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    expect(apiToken).toBeTruthy();
    expect(endpoint).toMatch(/^https:\/\/.+\.r2\.cloudflarestorage\.com$/);
    expect(accessKeyId).toBeTruthy();
    expect(secretAccessKey).toBeTruthy();

    const tokenResponse = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { Authorization: `Bearer ${apiToken!}` },
      signal: AbortSignal.timeout(10_000),
    });
    expect(tokenResponse.status).toBe(200);
    expect((await tokenResponse.json()) as { success?: boolean }).toMatchObject({ success: true });

    const r2Url = new URL(endpoint!);
    const signed = cloudflareR2Authorization(r2Url, accessKeyId!, secretAccessKey!);
    const r2Response = await fetch(`${r2Url.origin}/`, {
      headers: {
        Authorization: signed.authorization,
        "x-amz-content-sha256": signed.payloadHash,
        "x-amz-date": signed.amzDate,
      },
      signal: AbortSignal.timeout(10_000),
    });
    expect(r2Response.status).toBe(200);
  }, 25_000);

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
