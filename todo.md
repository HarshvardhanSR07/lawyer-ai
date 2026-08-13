# LawyerAI v2 — Hyper-Realistic Avatar Legal Assistant

## Rime-owned Voice and Render-only Avatar Revision
- [x] Audit and remove Beyond Presence managed-agent, conversation, STT, and TTS paths
- [x] Revise the voice architecture: use Hugging Face Whisper for STT and retain Rime exclusively for TTS
- [x] Research and select only an official Beyond Presence render-only speech-to-video endpoint
- [x] Establish the bounded render transport by publishing only verified Rime response audio to the session-scoped LiveKit room
- [x] Preserve the existing 2D avatar as `AvatarFallback` without deleting its code
- [x] Add `AvatarBeyondPresence` and mount it only while the pipeline is RESPONDING
- [x] Fall back to the 2D avatar if Beyond rendering errors, times out, or has no video within two seconds
- [x] Keep the existing avatar status ring around both render and fallback modes
- [x] Verify a missing Beyond credential still leaves the fallback avatar rendered
- [x] Publish only verified Rime response audio to a one-room-per-session LiveKit transport
- [x] Start only the Beyond Presence Speech-to-Video worker against that room, never a managed conversation agent
- [x] Issue browser-scoped LiveKit room tokens without exposing API keys or secrets
- [x] Render the returned avatar video track only for the RESPONDING status; render the static/2D avatar between turns
- [x] Keep legal response text, citations, and audio working if the video renderer is unavailable
- [x] Confirm Rime has no approved STT endpoint and select Hugging Face Whisper for transcription
- [x] Add a persistent Hugging Face Whisper STT client with bounded transcription requests
- [x] Add regression tests for the persistent Whisper client and authenticated Node-to-FastAPI transcription proxy
- [x] Replace the rejected Hugging Face access token and re-run its live credential validation
- [x] Re-enable microphone transcription through Whisper while retaining typed input as the fallback

## Reserved Hosting and Persistent FastAPI Backend
- [x] Run FastAPI as the single long-lived backend process required by Reserved Hosting
- [x] Initialize models, Qdrant, Rime, and Beyond Presence resources once during FastAPI startup
- [x] Add `GET /health` with a 200 OK readiness response for platform uptime checks
- [x] Keep each LiveKit room connection open for its full legal-assistant session lifecycle
- [x] Remove lazy per-request initialization of models and external clients
- [x] Document the safe non-secret runtime configuration contract in `docs/environment-variables.md` instead of maintaining a project `.env.example`
- [x] Add Reserved Hosting persistent-worker operating guidance
- [x] Replace managed Beyond Presence calls with the render-only LiveKit session contract
- [x] Add a Dockerfile and supervisor entrypoint that keep Node and FastAPI alive together
- [x] Add lifecycle-focused automated tests for FastAPI startup, readiness, and persistent client reuse
- [x] Resolve the stale Supabase persistence module import and verify the Node server starts cleanly
- [ ] Perform an authenticated browser smoke test of `avatar.startLiveCall` against Beyond Presence and LiveKit
- [x] Run the complete Node type-check and test suite after the integration refactor

## Phase 1: UI Redesign
- [x] Replace courtroom console with modern chat interface
- [x] Create avatar display panel (left/top, prominent)
- [x] Create chat panel (bottom, scrollable message history)
- [x] Design control bar (mic status, screen share, document upload, call, end)
- [x] Implement responsive layout (avatar + chat stacked on mobile)
- [x] Add loading states and connection indicators
- [x] Replace remaining courtroom-branded browser metadata with live legal-assistant branding
- [x] Remove remaining courtroom and unsupported live-transcription claims from the public landing page

## Phase 2: Provider Selection and Avatar Integration
- [x] Select Beyond Presence render-only sessions rather than a HeyGen API client, preserving the configured professional avatar identity
- [x] Select the configured Beyond Presence avatar rather than generating a second provider-specific avatar
- [x] Implement avatar video streaming to frontend
- [x] Handle avatar initialization and lifecycle
- [x] Add avatar status indicator (listening, thinking, speaking)
- [x] Add and run a bounded live Rime credential probe alongside the completed OpenAI validation
- [x] Add Supabase tables and storage metadata for uploaded documents and conversations
- [x] Persist live-avatar session metadata through protected Supabase-backed server procedures
- [x] Persist uploaded-document metadata and live-chat transcript entries without exposing service credentials
- [x] Evaluate Beyond Presence live-avatar API and replace the Higgsfield generation path when supported
- [x] Securely configure the supplied Beyond Presence API credential and avatar identifier on the server
- [x] Add a server-created Beyond Presence call session and a browser LiveKit client connection
- [x] Render the remote avatar audio/video tracks in the assistant interface without exposing provider credentials
- [x] Surface live-session and document-indexing errors in the conversation interface
- [x] Bound automatic live-avatar startup and replace prolonged connecting states with an actionable reconnect error

## Phase 3: Always-On Auto-Listening
- [x] Re-enable automatic microphone input using Hugging Face Whisper STT
- [x] Add regression coverage for the bounded hands-free Whisper restart guard
- [x] Add silence detection (auto-stop after 2s silence)
- [x] Gate Whisper transcription on a detected speech-threshold crossing and show a typed-input fallback when no speech is captured
- [x] Add audio level visualization
- [x] Add microphone permission handling for Whisper-powered transcription
- [x] Align the visible microphone control copy with automatic Whisper listening and typed-input fallback
- [x] Add a Rime speech fallback for verified legal text when a live-avatar renderer is unavailable

## Phase 4: Chat Panel
- [x] Render explicit User and LawyerAI speaker labels in each chat message
- [x] Display formatted timestamps for each chat message
- [x] Add message scrolling and auto-scroll to latest
- [x] Add backend-supplied verified-response confidence metadata to assistant messages
- [x] Surface an explicit verified-response status in assistant messages
- [x] Show citations inline with responses
- [x] Send typed messages through the live-agent conversation rather than only displaying them locally

## Phase 5: Document Upload, Screen Share, Call
- [x] Add DOCX support to document upload and indexing alongside PDF and plain text
- [x] Add document processing (chunking, embedding, indexing to Qdrant)
- [x] Implement screen share button (placeholder or WebRTC integration)
- [x] Implement call button (placeholder or call UI)
- [x] Add file list/history display

## Phase 6: Render-only Expression Delivery
- [x] Decide not to add Higgsfield; Beyond Presence owns render-only lip-sync video for the configured avatar
- [x] Keep legal-response confidence available for provider-safe UI status without transmitting reasoning to the renderer
- [x] Trigger render-only video delivery through verified Rime audio rather than provider-side TTS
- [x] Audit and gate fallback mouth motion so only render-only Beyond Presence video provides lip movement during responses
- [x] Preserve blink, eye-focus, and head-tilt motion in the 2D fallback avatar

## Phase 7: Response-state Presentation
- [x] Parse the reasoning response confidence level in the private FastAPI response contract
- [x] Display high, medium, or low confidence as verified-response metadata rather than an unverified facial-expression claim
- [x] Add regression coverage proving renderer relay failure keeps the fallback visible while verified Rime playback remains active
- [x] Use the existing state-tied fallback animations for smooth response-state transitions
- [x] Display approved versus flagged verification status alongside LawyerAI responses

## Phase 8: End-to-End Testing
- [x] Test auto-listening activation through the bounded hands-free Whisper restart-guard regression suite
- [x] Test live transcription accuracy with a known Rime legal phrase through the configured Hugging Face Whisper model
- [x] Add retrieval-to-reasoning pipeline regressions for authoritative approval and illustrative-only fail-closed behavior
- [ ] Test avatar generation and streaming
- [x] Test fallback-avatar expression state and speaking-indicator synchronization through rendering regressions
- [x] Test document upload and context augmentation through the route-level parser, indexer, retriever, and reasoning regression
- [x] Test chat message display and history with rendering coverage for speaker labels, timestamps, citations, and verification metadata
- [x] Test non-authenticated error handling and reconnection readiness through renderer-unavailable, fallback-visibility, bounded-startup timeout, and reconnect-eligibility regressions
- [x] Prevent assistant action controls from overlapping at narrow mobile widths through responsive action rows

## Phase 9: Deployment
- [ ] Run final authenticated end-to-end QA covering renderer startup, verified response audio, document indexing, and avatar fallback
- [x] Performance optimization: shared request-scoped query embeddings, concurrent legal/case retrieval, batch indexing, thread-offloaded Qdrant I/O, and stable case-document IDs
- [x] Create checkpoint
- [x] Deploy to production with Docker and a minimum instance count of one, as confirmed by the user
- [ ] Deliver to user
- [x] Stabilize the Beyond Presence external credential test with an explicit bounded request timeout and non-flaky assertion
- [x] Replace the external Beyond Presence probe’s exact-status assertion with an authentication-validity assertion that tolerates transient provider responses
- [ ] Verify the user-confirmed Docker deployment uses a minimum instance count of one and the production combined service returns 200 from `GET /health`
- [x] Retrieve Hugging Face Indian Lawyer dataset split names and Parquet file metadata
- [x] Inspect the Indian Lawyer dataset schema and select provenance-preserving legal fields for RAG ingestion
- [x] Verify the persistent ingestion job performs idempotent Qdrant upserts with stable point identities
- [x] Surface dataset provenance in verified legal retrieval citations
- [x] Add regression coverage for dataset parsing, repeated upsert idempotency, and citation metadata
- [x] Strengthen the live Whisper acceptance test with a defined full-phrase transcription accuracy threshold
- [x] Run the known-audio live transcription acceptance through the application’s FastAPI STT route and Node-to-FastAPI proxy
- [x] Optimize retrieval latency and ingestion throughput with shared query embeddings, concurrent Qdrant searches, batched embedding requests, and deterministic case-document IDs
- [ ] Verify the production Docker deployment health endpoint on its public URL and record the successful `GET /health` result
- [x] Export the checkpointed LawyerAI source to the `HarshvardhanSR07/lawyer-ai` GitHub repository with the existing repository preserved on `legacy-render-main-20260812`
- [ ] Configure and verify a GitHub-connected Docker deployment for the exported LawyerAI source through Amazon ECR and Amazon ECS
- [ ] Replace the unresolved `MY_AWS_*`, `MY_ECR_REPOSITORY`, `MY_ECS_SERVICE`, `MY_ECS_CLUSTER`, task-definition, and container-name placeholders in the user-added AWS workflow
- [x] Audit all Python and Node production dependency pins for valid published versions and compatible Python support
- [x] Replace the invalid `qdrant-client==2.7.0` requirement with `qdrant-client==1.19.0` and resolve the production requirements against Python 3.11
- [x] Pin the Docker base to a Python-compatible Node 22 Bookworm image and exclude local secrets and dependency artifacts from the Docker build context
- [x] Add regression coverage for the Qdrant package pin and the Python-compatible Docker runtime contract
- [x] Add a credential-free GitHub Actions Docker build validation and retire the failing placeholder ECS workflow; run 31738048802 built successfully
- [x] Guard the OIDC ECS workflow until AWS resource variables and the deploy-role secret are configured
- [x] Fix the Python parser f-string import syntax error and add citation-parser regressions
- [x] Remove OAuth routes and SDK initialization from the no-auth MVP startup path; use signed browser-scoped guest sessions for isolated persistence
- [x] Verify the public listener binds exactly to the host-provided `PORT` on `0.0.0.0` while preserving the combined `/health` route
- [x] Synchronize the validated parser, guest-session, no-auth startup, and listener repair to GitHub at `921f9dc`; Docker build run 31740845533 succeeded
- [ ] Verify and correct the hosting deployment’s stale source revision so it builds GitHub commit `921f9dc` or newer
- [ ] Configure `QDRANT_URL` and `QDRANT_API_KEY` in Render for the persistent RAG backend, then redeploy and verify `/health`
- [x] Rotate LawyerAI’s project `QDRANT_URL` and `QDRANT_API_KEY` to the user-supplied Qdrant Cloud credentials; live Qdrant collections probe passed
- [x] Document the complete Render environment-variable checklist, including the required guest-session `JWT_SECRET` and deployed CORS origin
- [x] Correct Qdrant Cloud transport configuration for the Render deployment and eliminate the 403 compatibility probe
- [x] Require the configured remote embedding provider in production so Render never downloads the local multilingual embedding model at startup
- [ ] Synchronize the validated Qdrant Cloud transport and production remote-embedding startup repair to GitHub
- [x] Add and format-check a parameterized GitHub Actions workflow and ECS task-definition template for the always-on LawyerAI Docker service
