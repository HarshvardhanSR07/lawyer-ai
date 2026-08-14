# Render Verification Notes

## 2026-08-14

The supplied Render deployment dashboard URL redirects the sandbox browser to the Render sign-in page. The deployment revision, environment values, logs, and public service URL therefore cannot be inspected from this session without authenticated dashboard access or a separately supplied public `onrender.com` service URL.

The GitHub deployment source was previously validated at commit `20f46cd`, which contains the non-fatal Whisper startup repair.

## Public health result

On 2026-08-14, `GET https://lawyer-ai-7sel.onrender.com/health` returned the readiness JSON for the `reserved-persistent` LawyerAI backend. Qdrant, embeddings, Rime, and the Beyond Presence client reported `ready`. The Whisper client reported `unavailable`, and Indian Lawyer ingestion reported `failed` at row offset `0` with `expected 128, indexed 0`. The Qdrant legal collection itself is reachable and configured for 768-dimensional cosine vectors, with no indexed points at the time of inspection.
