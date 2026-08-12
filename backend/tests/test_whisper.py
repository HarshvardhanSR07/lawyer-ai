import asyncio
import unittest

import httpx

from voice.whisper import WhisperTranscriber


class _FakeWhisperClient:
    async def post(self, *_args, **_kwargs):
        return httpx.Response(
            200,
            json={"text": "Please review this agreement.", "confidence": 0.91, "language": "en"},
            request=httpx.Request("POST", "https://example.test/whisper"),
        )


class WhisperTranscriberTests(unittest.TestCase):
    def test_reuses_configured_client_and_returns_normalized_transcription(self):
        transcriber = WhisperTranscriber()
        transcriber.http_client = _FakeWhisperClient()

        result = asyncio.run(transcriber.transcribe(b"webm-audio", "audio/webm"))

        self.assertEqual(result["text"], "Please review this agreement.")
        self.assertEqual(result["confidence"], 0.91)
        self.assertEqual(result["language"], "en")

    def test_rejects_empty_audio_before_making_provider_request(self):
        transcriber = WhisperTranscriber()
        transcriber.http_client = _FakeWhisperClient()

        with self.assertRaisesRegex(ValueError, "Audio content is required"):
            asyncio.run(transcriber.transcribe(b"", "audio/webm"))
