const RIME_TTS_ENDPOINT = "https://users.rime.ai/v1/rime-tts";

function getRimeApiKey() {
  const apiKey = process.env.RIME_API_KEY;
  if (!apiKey) {
    throw new Error("Voice fallback is not configured. Add a Rime API key in project settings.");
  }
  return apiKey;
}

export async function synthesizeLegalSpeech(text: string) {
  const response = await fetch(RIME_TTS_ENDPOINT, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: {
      authorization: `Bearer ${getRimeApiKey()}`,
      "content-type": "application/json",
      accept: "audio/wav",
    },
    body: JSON.stringify({
      text,
      speaker: "celeste",
      modelId: "coda",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Voice fallback failed (${response.status}): ${detail || response.statusText}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.byteLength < 44 || audio.subarray(0, 4).toString("ascii") !== "RIFF") {
    throw new Error("Voice fallback did not return playable WAV audio.");
  }

  return {
    audioBase64: audio.toString("base64"),
    contentType: "audio/wav" as const,
  };
}
