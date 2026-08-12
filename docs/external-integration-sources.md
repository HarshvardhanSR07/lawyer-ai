# External Integration Sources

LawyerAI’s render-only avatar path uses the LiveKit audio-to-video session contract. Beyond Presence receives only an authenticated LiveKit renderer connection and must not receive legal prompts, transcript text, STT configuration, TTS configuration, or reasoning settings.

| Source | Implementation-relevant finding |
|---|---|
| [LiveKit — Beyond Presence virtual avatar integration guide](https://docs.livekit.io/agents/models/avatar/plugins/bey/) | Documents the Node package `@livekit/agents-plugin-bey` and the `AvatarSession` render integration for an existing agent audio stream. |
| [Beyond Presence — LiveKit Plugin](https://docs.bey.dev/integrations/speech-to-video/livekit) | Identifies the official LiveKit speech-to-video integration and Node plugin package. |
| [Beyond Presence — Create LiveKit Audio-to-Video Session](https://docs.bey.dev/api-reference/sessions/create-livekit-audio-to-video-session) | Specifies `POST /v1/sessions` with `transport`, `avatar_id`, `url`, and a LiveKit `token`; it explicitly advises against directly using managed dialogue routes for this purpose. |
| [Rime — TTS in five minutes](https://docs.rime.ai/docs/quickstart-five-minute) | Documents the HTTP request to `https://users.rime.ai/v1/rime-tts`, using bearer authentication plus the `text`, `speaker`, and `modelId` fields. |
| [LiveKit — Rime TTS](https://docs.livekit.io/agents/models/tts/rime/) | Confirms that Rime is a TTS integration and shows Coda with the `celeste` speaker; it also identifies the HTTP synthesis base URL. |
| [LiveKit JS Client SDK](https://docs.livekit.io/reference/client-sdk-js/) | States that a browser client can publish any audio source represented by a `MediaStreamTrack`, enabling a Rime response stream to be published into the renderer’s room. |
| [LiveKit — Publish media](https://docs.livekit.io/transport/media/publish/) | Documents browser publication and explains that backend publishers use an audio source and a track; it confirms that a renderer can consume the published media like any other room participant. |

> The direct render-session adapter in `server/beyondPresence.ts` uses the documented `POST /v1/sessions` payload. The browser receives its own short-lived LiveKit token; the renderer token is never exposed to the browser.

> Rime’s public documentation describes TTS rather than STT. LawyerAI therefore does not retain a hidden Whisper or other STT fallback. The `/api/stt` endpoint reports that unsupported configuration explicitly until the product has an approved STT provider or a Rime-provided transcription capability.

> The browser turns its Rime-generated response audio into a `MediaStreamTrack` and publishes that one response track into the session’s LiveKit room. Beyond Presence may consume the audio track only for lip-synced video rendering; the verified response text remains outside the renderer integration.

## Indian Lawyer Dataset

Dataset: `Mukesh555/indian_lawyer_dataset`  
Split endpoint: https://datasets-server.huggingface.co/splits?dataset=Mukesh555%2Findian_lawyer_dataset  
Parquet endpoint: https://huggingface.co/api/datasets/Mukesh555/indian_lawyer_dataset/parquet/default/train/0.parquet

The public `default/train` sample has two string fields, `instruction` and `output`. Its records are instruction-following legal examples, including hypothetical petitions and drafting outputs. LawyerAI must retain row-level dataset provenance and describe any retrieved dataset excerpt as **non-authoritative illustrative material**. The verification gate must never treat it as statutory text, reported case law, or independently verified legal authority.
