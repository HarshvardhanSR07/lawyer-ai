import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

function getLiveKitHttpUrl(url: string) {
  return url.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");
}

async function createValidationToken(apiKey: string, apiSecret: string) {
  return new SignJWT({ video: { roomList: true } })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(apiKey)
    .setSubject("lawyerai-livekit-validation")
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(new TextEncoder().encode(apiSecret));
}

describe("LiveKit credential configuration", () => {
  it("authenticates a short-lived server token against the RoomService API", async () => {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    expect(url).toBeTruthy();
    expect(apiKey).toBeTruthy();
    expect(apiSecret).toBeTruthy();

    const token = await createValidationToken(apiKey!, apiSecret!);
    const response = await fetch(`${getLiveKitHttpUrl(url!)}/twirp/livekit.RoomService/ListRooms`, {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
    });

    expect(response.status).toBe(200);
  }, 15_000);
});
