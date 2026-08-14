# LawyerAI Environment Variables

Configure these values through the project’s secure settings. **Do not commit a `.env` file or secret values.** The application expects the Node server and the FastAPI child process to share the same runtime environment.

| Variable | Required | Used by | Purpose and recommended value |
|---|---:|---|---|
| `RIME_API_KEY` | Yes | FastAPI and Node fallback | Authorizes Rime text-to-speech. |
| `RIME_API_URL` | No | FastAPI | Defaults to `https://users.rime.ai/v1/rime-tts`. |
| `RIME_MODEL_ID` | No | FastAPI | Defaults to `coda`. |
| `RIME_VOICE_ID` | No | FastAPI | Defaults to `celeste`. |
| `BEY_API_KEY` | Yes, unless alias used | Node and FastAPI | Preferred Beyond Presence render-only API key name. |
| `BEYOND_PRESENCE_API_KEY` | Yes, unless preferred key used | Node and FastAPI | Backwards-compatible alias for `BEY_API_KEY`. |
| `BEYOND_PRESENCE_AVATAR_ID` | Yes | Node | The approved Beyond Presence avatar identifier. |
| `BEY_API_BASE_URL` | No | FastAPI | Defaults to `https://api.bey.dev`. |
| `LIVEKIT_URL` | Yes | Node | LiveKit Cloud URL used by both renderer and browser room participants. |
| `LIVEKIT_API_KEY` | Yes | Node | Mints short-lived, role-specific LiveKit tokens. |
| `LIVEKIT_API_SECRET` | Yes | Node | Signs short-lived, role-specific LiveKit tokens. Never expose it to the browser. |
| `QDRANT_URL` | Yes | FastAPI | Remote Qdrant endpoint initialized before the instance accepts traffic. |
| `QDRANT_API_KEY` | Recommended | FastAPI | Authenticates the remote Qdrant connection. |
| `OPENAI_API_KEY` | Yes when `EMBEDDINGS_PROVIDER=openai` | FastAPI | Supplies remote legal-document embeddings after readiness; no embedding request is made during startup. |
| `EMBEDDINGS_PROVIDER` | No | FastAPI | Defaults to `openai` when `OPENAI_API_KEY` exists; otherwise `local`. |
| `OPENAI_EMBEDDING_MODEL` | No | FastAPI | Defaults to `text-embedding-3-small`. |
| `EMBEDDING_DIMENSIONS` | No | FastAPI | Defaults to `768`; must match the Qdrant collection dimension. |
| `LEGAL_INDEX_BATCH_SIZE` | No | FastAPI | Defaults to `16`; bounds each remote embedding and Qdrant upsert batch while indexing legal sources and the Indian Lawyer dataset. |
| `EMBEDDINGS_MODEL` | Conditional | FastAPI | Required only for local embeddings; defaults to `intfloat/multilingual-e5-large`. |
| `HUGGINGFACE_API_KEY` | Yes for Hugging Face router reasoning and Whisper STT | FastAPI | Authorizes the configured remote reasoning model and approved Whisper transcription requests. |
| `REASONING_PROVIDER` | No | FastAPI | Defaults to `huggingface_router`. Use `huggingface_inference` only to retain the legacy direct Hugging Face inference endpoint. |
| `REASONING_MODEL` | No | FastAPI | Defaults to `openai/gpt-oss-120b:fastest` when `REASONING_PROVIDER=huggingface_router`. |
| `HF_ROUTER_API_BASE` | No | FastAPI | Defaults to `https://router.huggingface.co/v1`; override only for an approved compatible router. |
| `WHISPER_MODEL` | No | FastAPI | Model identifier for Hugging Face Whisper STT once enabled. |
| `INDIAN_LAWYER_DATASET_AUTO_INDEX` | No | FastAPI | Defaults to `true` on the always-on instance; set to `false` only to defer public `default/train` indexing. The import runs in the persistent background worker after readiness. |
| `SUPABASE_URL` | Yes | Node | LawyerAI session, document, and transcript persistence endpoint. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Node | Server-only Supabase persistence credential. |
| `FASTAPI_PORT` | No | Node and FastAPI | Defaults to `8000`; keeps the private FastAPI process off the public port. |
| `FASTAPI_INTERNAL_URL` | No | Node | Overrides the default internal readiness address `http://127.0.0.1:$FASTAPI_PORT`. |
| `CORS_ORIGINS` | Recommended | FastAPI | Comma-separated browser origins; defaults to `http://localhost:3000` for development. |
| `PORT` | Platform-managed | Node | Public listener. Do not hard-code this value. |
| `JWT_SECRET` | Yes | Node | Signs isolated, browser-scoped guest sessions for the no-auth MVP. Use a high-entropy production secret. |
| `DATABASE_URL` | Conditional | Node | Required only for procedures that use the template database helpers. |

> **Voice policy:** Rime supplies text-to-speech only. Hugging Face Whisper is the approved speech-to-text provider for this deployment once `HUGGINGFACE_API_KEY` validation succeeds; typed input remains available whenever microphone transcription is unavailable. Legal reasoning, citations, and Rime audio responses continue to work even if the avatar renderer cannot start.

> **Avatar policy:** Beyond Presence receives only renderer-session credentials through `POST /v1/sessions`. It must never receive documents, legal response text, reasoning instructions, STT configuration, or TTS configuration.

## Reserved Hosting Process Contract

At startup, the public Node process starts one private Uvicorn process. The public process waits for FastAPI’s `GET /health` readiness check before listening on the platform-supplied `PORT` at `0.0.0.0`. FastAPI creates its Qdrant client, embedding provider, reasoning client, Rime client, document parser, and Beyond Presence HTTP client exactly once in its lifespan; it closes them on process shutdown. The Node health route forwards the private health result, allowing the hosting platform to test the public endpoint without exposing the internal port. The no-auth MVP uses a signed, browser-scoped guest-session cookie rather than OAuth routes.

When `INDIAN_LAWYER_DATASET_AUTO_INDEX=true`, the persistent process starts the deterministic public-dataset upsert after core readiness. `/health` reports its indexing status, row count, and chunk count. This data is illustrative drafting material only: retrieved rows retain dataset provenance and cannot independently satisfy the legal verification gate.

## Rime and Render-Only References

Rime documents HTTP WAV synthesis at `https://users.rime.ai/v1/rime-tts`, authenticated with a bearer token and requested with `text`, `speaker`, and `modelId` [1]. The LiveKit Rime integration likewise describes Rime as a TTS provider and identifies that same HTTP base URL [2]. Beyond Presence’s documented LiveKit renderer session uses `POST /v1/sessions` with the LiveKit URL and a renderer token [3].

## References

[1]: https://docs.rime.ai/docs/quickstart-five-minute "Rime — TTS in five minutes"
[2]: https://docs.livekit.io/agents/models/tts/rime/ "LiveKit — Rime TTS"
[3]: https://docs.bey.dev/api-reference/sessions/create-livekit-audio-to-video-session "Beyond Presence — Create LiveKit Audio-to-Video Session"
