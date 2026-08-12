type LiveSessionInput = {
  userOpenId: string;
  agentId: string;
  callId: string | null;
};

type DocumentInput = {
  userOpenId: string;
  sessionId?: string;
  filename: string;
  mimeType: "application/pdf" | "text/plain" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  sizeBytes: number;
  storageBucket: string;
  storagePath: string;
  knowledgeFileId: string;
  ingestionStatus: string;
};

type MessageInput = {
  sessionId: string;
  speaker: "user" | "assistant";
  content: string;
  source: "livekit" | "typed" | "whisper";
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase persistence is not configured.");
  return { url, serviceRoleKey };
}

async function persist<T>(table: string, body: unknown): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    signal: AbortSignal.timeout(12_000),
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase persistence failed (${response.status}): ${detail || response.statusText}`);
  }

  const rows = (await response.json()) as T[];
  if (!rows[0]) throw new Error("Supabase persistence returned no saved record.");
  return rows[0];
}

export async function createLiveSession(input: LiveSessionInput) {
  return persist<{ id: string }>("lawyer_sessions", {
    user_open_id: input.userOpenId,
    beyond_agent_id: input.agentId,
    beyond_call_id: input.callId,
  });
}

export async function closeLiveSession(sessionId: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/lawyer_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    signal: AbortSignal.timeout(12_000),
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({ ended_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error("Unable to close the saved legal-assistant session.");
}

export async function assertLiveSessionOwner(sessionId: string, userOpenId: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/lawyer_sessions?id=eq.${encodeURIComponent(sessionId)}&user_open_id=eq.${encodeURIComponent(userOpenId)}&select=id`, {
    signal: AbortSignal.timeout(12_000),
    headers: { authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
  });
  if (!response.ok) throw new Error("Unable to validate the legal-assistant session.");
  const rows = (await response.json()) as { id: string }[];
  if (!rows[0]) throw new Error("This legal-assistant session is unavailable.");
}

export async function saveDocumentMetadata(input: DocumentInput) {
  return persist<{ id: string }>("lawyer_documents", {
    user_open_id: input.userOpenId,
    session_id: input.sessionId ?? null,
    filename: input.filename,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    storage_bucket: input.storageBucket,
    storage_path: input.storagePath,
    knowledge_file_id: input.knowledgeFileId,
    ingestion_status: input.ingestionStatus === "failed" ? "failed" : "available",
  });
}

export async function saveTranscriptEntry(input: MessageInput) {
  return persist<{ id: string }>("lawyer_messages", {
    session_id: input.sessionId,
    speaker: input.speaker,
    content: input.content,
    source: input.source,
  });
}
