# Render Deployment Checklist

LawyerAI is a **single, persistent Docker web service**. The public Node process listens on Render's platform-managed `PORT`, supervises the private FastAPI process on port `8000`, and forwards `GET /health` only after FastAPI is ready. Do not configure a separate Render Python service for `backend/main.py`.

## Render service settings

| Setting | Value |
|---|---|
| Source repository | `HarshvardhanSR07/lawyer-ai` |
| Branch | `main` |
| Runtime | Docker |
| Dockerfile path | `./Dockerfile` |
| Public port | Leave platform-managed; the container consumes Render's `PORT` |
| Health-check path | `/health` |
| Instance count | At least one persistent instance |

Always use **Clear build cache & deploy** after changing the Dockerfile, requirements, or provider configuration.

## Required environment values

Add these in **Render Dashboard → Service → Environment**. Enter secrets in Render; do not commit them to GitHub or paste them into chat.

| Variable | Requirement | Notes |
|---|---|---|
| `QDRANT_URL` | Required | The HTTPS endpoint for the remote Qdrant cluster. Startup intentionally fails without it because RAG is persistent. |
| `QDRANT_API_KEY` | Required for protected Qdrant | The Qdrant cluster API key. |
| `JWT_SECRET` | Required | A high-entropy secret used to sign browser-scoped guest sessions in this no-auth MVP. Generate a new value for Render. |
| `OPENAI_API_KEY` | Required | Used for eager OpenAI embeddings when `EMBEDDINGS_PROVIDER=openai`. |
| `HUGGINGFACE_API_KEY` | Required | Used for reasoning and Whisper transcription. |
| `RIME_API_KEY` | Required | Used only for verified legal-response text-to-speech. |
| `BEY_API_KEY` | Required | Beyond Presence render-only API key; `BEYOND_PRESENCE_API_KEY` is also accepted for compatibility. |
| `BEYOND_PRESENCE_AVATAR_ID` | Required | Approved Beyond Presence avatar identifier. |
| `LIVEKIT_URL` | Required | LiveKit Cloud URL. |
| `LIVEKIT_API_KEY` | Required | Server-only LiveKit API key. |
| `LIVEKIT_API_SECRET` | Required | Server-only LiveKit signing secret. |
| `SUPABASE_URL` | Required | Supabase persistence endpoint. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required | Server-only Supabase persistence key. |
| `CORS_ORIGINS` | Required in production | The public Render origin, for example `https://your-service.onrender.com`. |
| `EMBEDDINGS_PROVIDER` | Required | Set to `openai`; production startup rejects local fallback models to avoid memory-heavy downloads. |
| `INDIAN_LAWYER_DATASET_AUTO_INDEX` | Optional | Defaults to `true`; use `false` only to defer dataset indexing while validating infrastructure. |

Render provides `PORT`; do **not** set it yourself. FastAPI's private port defaults to `8000`; do **not** expose it through Render.

## Deployment sequence

First, confirm the service is deploying GitHub `main` at commit `921f9dc` or newer. Add the environment values above, click **Clear build cache & deploy**, and wait for the log line showing the public Node service listening on `0.0.0.0:$PORT`. Then request `https://<render-service>/health`; it must return HTTP 200 before testing the avatar, microphone, or document workflows.

If the log says `QDRANT_URL must be configured`, the source code is working as designed: add `QDRANT_URL` and `QDRANT_API_KEY`, then redeploy. If a later provider client reports an unavailable credential, add that specific variable through Render's Environment panel rather than weakening the startup verification gate.
