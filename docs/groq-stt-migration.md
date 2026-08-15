# Groq Whisper Migration Contract

LawyerAI will use Groq's OpenAI-compatible transcription endpoint, `https://api.groq.com/openai/v1/audio/transcriptions`, for its **optional** microphone feature. The active model is `whisper-large-v3-turbo`; it supports multilingual transcription and accepts direct uploads in browser-relevant formats including WAV and WebM.[1]

The persistent FastAPI client must authenticate only with `GROQ_API_KEY`, submit a multipart `file` together with `model`, `temperature=0`, and `response_format=verbose_json`, and bound uploads below the provider's 25 MB free-tier limit. The browser already submits short speech windows, so no application-level audio chunking is added in this migration.[1]

Groq STT is deliberately **non-critical**. Initialization, network, authentication, quota, or provider failures must set the STT dependency to unavailable, return the existing descriptive `503` from `/api/stt`, and leave typed legal questions, RAG retrieval, verification, Rime TTS, and the 2D avatar fallback operational. Rime remains the exclusive TTS provider.

The health response will identify the active STT provider separately from mandatory dependencies. A ready Groq STT client is informational for uptime; its absence must not make `GET /health` return a non-200 response.

## References

[1] [Groq Speech-to-Text documentation](https://console.groq.com/docs/speech-to-text)

[2] [Groq Whisper Large V3 Turbo model documentation](https://console.groq.com/docs/model/whisper-large-v3-turbo)

[3] [Groq OpenAI compatibility documentation](https://console.groq.com/docs/openai)
