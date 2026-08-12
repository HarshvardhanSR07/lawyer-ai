# LawyerAI Voice and Avatar Rendering Architecture

## Required pipeline

LawyerAI retains ownership of turn detection, speech-to-text, legal retrieval, verified reasoning, and speech synthesis. Rime is the exclusive speech provider. Beyond Presence is used only after Rime produces audio, solely to render lip-synced avatar video.

```text
User speech → Rime STT → verified legal reasoning/RAG → Rime TTS audio → Beyond Presence Speech-to-Video → avatar video
```

No Beyond Presence managed agent, managed conversation, STT, LLM, or TTS service may be used in this path.

## Official provider contract

Beyond Presence documents its **Speech-to-Video** mode as a component-level integration in which the application manages STT, LLM, and TTS and sends audio to the avatar renderer. It returns avatar video streams; the overview cites approximately 250 ms audio-to-video response time. [1]

The official LiveKit Speech-to-Video integration uses an avatar worker in the application’s own LiveKit room. The application creates the LiveKit room/token and starts Beyond Presence with its avatar ID. The provider explicitly recommends its LiveKit plugin instead of direct session creation. [2] [3]

LiveKit’s official Beyond Presence documentation supports the Node package `@livekit/agents-plugin-bey`. It starts an `AvatarSession` with the selected `avatarId` in a LiveKit `AgentSession` and waits for the avatar participant to join the room. This is the only approved Beyond component in LawyerAI’s response path. [6]

LiveKit supports backend publishing of server-generated audio tracks. Its Node real-time SDK uses an `AudioSource`, a `LocalAudioTrack`, and PCM `AudioFrame` buffers. Rime WAV output must therefore be decoded to PCM and published as 16-bit frames at the track’s declared sample rate and channel count. The documented Node RTC SDK is currently Developer Preview, so LawyerAI retains its existing browser audio playback and 2D avatar as a production-safe fallback. [7] [8]

The render-only session endpoint is `POST https://api.bey.dev/v1/sessions`, documented as **Create LiveKit Audio-to-Video Session**. It takes a LiveKit transport, avatar ID, LiveKit URL, and a short-lived room token. It is distinct from the managed-agent `/v1/calls` route, which LawyerAI must not use. [3]

## Rime speech boundary

Rime’s published cloud API is a low-latency **text-to-speech** service. Its documented HTTP and WebSocket endpoints synthesize speech, return audio, and expose speech metadata; they do not expose a provider-native speech-to-text endpoint. Rime’s own voice-agent guide assigns speech recognition to a separately selected recognition component and assigns Rime speech generation. [4] [5]

Accordingly, the strict requirement that “Rime handles STT” cannot be implemented as written with the current Rime cloud API. The smallest compliant substitute is browser-native Web Speech recognition, which keeps third-party STT credentials out of the application while preserving Rime as the only external speech provider. If browser-native recognition is unsuitable for the target browsers or jurisdiction, the application needs an explicitly approved STT provider.

## Hosting implication

The official quickstart requires a LiveKit agent worker plus LiveKit API key, secret, and URL. That worker needs to keep a real-time room connection open and to subscribe to the Rime audio track while publishing the avatar video track. The current managed web runtime is not suitable for a long-running worker; this integration requires a dedicated always-on real-time agent service before the provider render endpoint can be activated.

## References

[1]: https://docs.bey.dev/integrations/speech-to-video "Beyond Presence — Voice Agent Overview"
[2]: https://docs.bey.dev/get-started/quickstart/speech-to-video.md "Beyond Presence — Speech-to-Video Quickstart"
[3]: https://docs.bey.dev/api-reference/sessions/create-livekit-audio-to-video-session.md "Beyond Presence — Create LiveKit Audio-to-Video Session"
[4]: https://docs.rime.ai/docs/api-reference "Rime — API Reference"
[5]: https://docs.rime.ai/docs/voice-agents "Rime — Build a Voice Agent"
[6]: https://docs.livekit.io/agents/integrations/avatar/bey/ "LiveKit — Beyond Presence virtual avatar integration guide"
[7]: https://docs.livekit.io/transport/media/publish/ "LiveKit — Publishing media from a backend"
[8]: https://docs.livekit.io/reference/client-sdk-node/ "LiveKit — @livekit/rtc-node reference"
