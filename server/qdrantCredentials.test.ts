import { describe, expect, it } from "vitest";

describe("Qdrant credentials", () => {
  it(
    "reaches the configured collection metadata endpoint", async () => {
      const baseUrl = process.env.QDRANT_URL?.replace(/\/$/, "");
      expect(baseUrl, "QDRANT_URL must be configured").toBeTruthy();

      const apiKey = process.env.QDRANT_API_KEY;
      const response = await fetch(`${baseUrl}/collections`, {
        headers: apiKey ? { "api-key": apiKey } : {},
        signal: AbortSignal.timeout(10_000),
      });

      expect(response.status, "Qdrant must accept the configured endpoint and credentials").toBe(200);
      const payload = (await response.json()) as { result?: { collections?: unknown[] } };
      expect(Array.isArray(payload.result?.collections)).toBe(true);
    },
    15_000,
  );
});
