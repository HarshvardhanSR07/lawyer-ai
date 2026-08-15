# Render Verification Notes

## 2026-08-14

The supplied Render deployment dashboard URL redirects the sandbox browser to the Render sign-in page. The deployment revision, environment values, logs, and public service URL therefore cannot be inspected from this session without authenticated dashboard access or a separately supplied public `onrender.com` service URL.

The GitHub deployment source was previously validated at commit `20f46cd`, which contains the non-fatal Whisper startup repair.

## 2026-08-15

After GitHub commit `38273d2` added Groq Whisper transcription and Docker validation run `31867675329` passed, the public health URL displayed Render's **Application loading** interstitial. The page recorded an incoming request and service wake-up, but did not return LawyerAI readiness JSON within the bounded request window. This does not verify that Render has deployed commit `38273d2`; dashboard access or a completed redeploy observation remains required.

After the wake-up completed, the endpoint again returned HTTP 200 readiness JSON, but it still exposed the legacy `whisper_client` field as `unavailable` instead of the Groq migration's provider-neutral `stt_client` and `stt_provider` fields. Its Indian Lawyer dataset state was also `not_started` with zero indexed rows. This confirms that the public Render service remains on a pre-`38273d2` application revision despite the successful GitHub Docker build.

The deployed `/assistant` page was also rechecked on 2026-08-15. Render displayed its application-loading interstitial after detecting the request and waking the service; the LawyerAI interface did not load within the observation window. Browser microphone capture and dialogue transcription therefore cannot be assessed on the public deployment until the service finishes waking and, more importantly, deploys the validated Groq STT revision.

## Public health result

On 2026-08-14, `GET https://lawyer-ai-7sel.onrender.com/health` returned the readiness JSON for the `reserved-persistent` LawyerAI backend. Qdrant, embeddings, Rime, and the Beyond Presence client reported `ready`. The Whisper client reported `unavailable`, and Indian Lawyer ingestion reported `failed` at row offset `0` with `expected 128, indexed 0`. The Qdrant legal collection itself is reachable and configured for 768-dimensional cosine vectors, with no indexed points at the time of inspection.
