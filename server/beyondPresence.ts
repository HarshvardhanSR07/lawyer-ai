import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";

const BEY_API = "https://api.bey.dev/v1";
const TOKEN_TTL_SECONDS = 60 * 20;

type BeyondRenderSession = {
  id?: string;
  status?: { type?: string };
};

type LiveKitConfig = {
  apiKey: string;
  apiSecret: string;
  url: string;
};

type RendererState = "starting" | "unavailable";

function getLiveKitConfig(): LiveKitConfig {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    throw new Error("LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in project settings.");
  }
  return { apiKey, apiSecret, url };
}

function getBeyConfig() {
  return {
    apiKey: process.env.BEY_API_KEY ?? process.env.BEYOND_PRESENCE_API_KEY,
    avatarId: process.env.BEYOND_PRESENCE_AVATAR_ID,
  };
}

async function createLiveKitToken(input: {
  identity: string;
  roomName: string;
  canPublish: boolean;
  canSubscribe: boolean;
}): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitConfig();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    video: {
      room: input.roomName,
      roomJoin: true,
      canPublish: input.canPublish,
      canSubscribe: input.canSubscribe,
      canPublishData: true,
    },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(apiKey)
    .setSubject(input.identity)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(new TextEncoder().encode(apiSecret));
}

async function startRenderOnlySession(input: { roomName: string; token: string }): Promise<BeyondRenderSession> {
  const { apiKey, avatarId } = getBeyConfig();
  if (!apiKey || !avatarId) throw new Error("Beyond Presence render credentials are not configured.");

  const { url } = getLiveKitConfig();
  const response = await fetch(`${BEY_API}/sessions`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      transport: "livekit",
      avatar_id: avatarId,
      url,
      token: input.token,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Avatar video renderer is unavailable (${response.status}): ${detail || response.statusText}`);
  }
  return (await response.json()) as BeyondRenderSession;
}

/**
 * Starts only Beyond Presence's LiveKit audio-to-video renderer. This module never
 * sends prompts, transcript text, LLM configuration, STT settings, or TTS settings
 * to Beyond Presence. Legal reasoning and Rime audio remain LawyerAI responsibilities.
 */
export async function createLiveAvatarCall() {
  const { url: livekitUrl } = getLiveKitConfig();
  const roomName = `lawyerai-${randomUUID()}`;
  const browserIdentity = `lawyerai-browser-${randomUUID()}`;
  const rendererIdentity = `lawyerai-renderer-${randomUUID()}`;
  const livekitToken = await createLiveKitToken({
    identity: browserIdentity,
    roomName,
    canPublish: true,
    canSubscribe: true,
  });
  const rendererToken = await createLiveKitToken({
    identity: rendererIdentity,
    roomName,
    canPublish: true,
    canSubscribe: true,
  });

  let rendererStatus: RendererState = "starting";
  let rendererSessionId: string | null = null;
  let rendererError: string | null = null;
  try {
    const rendererSession = await startRenderOnlySession({ roomName, token: rendererToken });
    rendererSessionId = rendererSession.id ?? null;
  } catch (error) {
    rendererStatus = "unavailable";
    rendererError = error instanceof Error ? error.message : "Avatar video renderer is unavailable.";
  }

  return {
    // Compatibility fields intentionally contain renderer identifiers only; no provider key is returned.
    agentId: "bey-render-only",
    callId: rendererSessionId,
    rendererStatus,
    rendererError,
    roomName,
    livekitUrl,
    livekitToken,
  };
}
