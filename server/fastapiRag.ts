export async function indexLegalDocument(input: {
  caseId: string;
  filename: string;
  mimeType: "application/pdf" | "text/plain";
  bytes: Buffer;
}) {
  const baseUrl = (process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }), input.filename);
  const response = await fetch(`${baseUrl}/api/case/${encodeURIComponent(input.caseId)}/documents`, {
    method: "POST",
    signal: AbortSignal.timeout(45_000),
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LawyerAI document indexing failed (${response.status}): ${detail || response.statusText}`);
  }
  return (await response.json()) as { document_id: string; chunks_indexed: number };
}

export type VerifiedLegalResponse = {
  response: string;
  legal_sources: Array<Record<string, unknown>>;
  evidence: Array<Record<string, unknown>>;
  counterargument: string;
  reasoning_summary: string;
  confidence: "high" | "medium" | "low";
  verification_status: "approved" | "flagged";
};

export async function transcribeWhisperAudio(input: {
  audioBase64: string;
  mimeType: string;
  isFinal: boolean;
}): Promise<{ transcript: string; confidence: number; is_final: boolean }> {
  const baseUrl = (process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/stt`, {
    method: "POST",
    signal: AbortSignal.timeout(50_000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      audio_base64: input.audioBase64,
      mime_type: input.mimeType,
      is_final: input.isFinal,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Whisper transcription failed (${response.status}): ${detail || response.statusText}`);
  }
  const payload = await response.json() as { transcript: string; confidence: number; is_final: boolean };
  return payload;
}

export async function requestVerifiedLegalResponse(input: {
  caseId: string;
  question: string;
  conversationHistory: Array<{ speaker: "user" | "assistant"; text: string }>;
}): Promise<VerifiedLegalResponse> {
  const baseUrl = (process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/reason`, {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question: input.question,
      case_id: input.caseId,
      conversation_history: input.conversationHistory.map(item => ({ role: item.speaker, content: item.text })),
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LawyerAI reasoning failed (${response.status}): ${detail || response.statusText}`);
  }
  return (await response.json()) as VerifiedLegalResponse;
}
