# LawyerAI Service Integration Notes

## Rime text-to-speech

Rime authenticates server-side requests with `Authorization: Bearer $RIME_API_KEY`. Its HTTP TTS endpoint is `POST https://users.rime.ai/v1/rime-tts`; a Coda request supplies `text`, `speaker`, and `modelId: "coda"` and may request `audio/wav`. The provider documents voice metadata at `/data/voices/all-v2.json`. LawyerAI keeps the credential server-side and will use the real-time avatar provider's native audio track for live calls, with Rime available as a server-side fallback. Sources: <https://docs.rime.ai/docs/api-reference> and <https://docs.rime.ai/docs/quickstart-five-minute>.

## OpenAI

OpenAI is reserved for server-side retrieval-grounded reasoning fallback. The browser never receives its credential; document context remains in the legal-assistant retrieval layer and in the user-authorized Beyond Presence knowledge-file session context.

## Knowledge-file formats

Beyond Presence knowledge files accept PDF and text. LawyerAI stores a user-uploaded DOCX unchanged in private Supabase storage, then extracts its raw text server-side and sends that text as the provider-supported knowledge representation. Source: <https://docs.bey.dev/api-reference/knowledge-files/create-knowledge-file>.
