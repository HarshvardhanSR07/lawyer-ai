import asyncio
import os
import unittest

import httpx

from voice.groq_whisper import GroqWhisperTranscriber


class _FakeGroqClient:
    def __init__(self):
        self.kwargs = None

    async def post(self, *_args, **kwargs):
        self.kwargs = kwargs
        return httpx.Response(
            200,
            json={"text": "Please review this agreement.", "language": "en"},
            request=httpx.Request("POST", "https://example.test/transcriptions"),
        )


class GroqWhisperTranscriberTests(unittest.TestCase):
    def test_reuses_configured_client_and_returns_normalized_multipart_transcription(self):
        transcriber = GroqWhisperTranscriber()
        client = _FakeGroqClient()
        transcriber.http_client = client

        result = asyncio.run(transcriber.transcribe(b"webm-audio", "audio/webm"))

        self.assertEqual(result["text"], "Please review this agreement.")
        self.assertEqual(result["confidence"], 0.8)
        self.assertEqual(result["language"], "en")
        self.assertEqual(client.kwargs["data"]["model"], "whisper-large-v3-turbo")
        self.assertEqual(client.kwargs["files"]["file"][0], "microphone.webm")

    def test_rejects_empty_audio_before_making_provider_request(self):
        transcriber = GroqWhisperTranscriber()
        transcriber.http_client = _FakeGroqClient()

        with self.assertRaisesRegex(ValueError, "Audio content is required"):
            asyncio.run(transcriber.transcribe(b"", "audio/webm"))

    def test_rejects_audio_larger_than_the_configured_provider_safe_limit(self):
        transcriber = GroqWhisperTranscriber()
        transcriber.http_client = _FakeGroqClient()
        transcriber.max_audio_bytes = 3

        with self.assertRaisesRegex(ValueError, "transcription limit"):
            asyncio.run(transcriber.transcribe(b"1234", "audio/webm"))

    def test_missing_groq_key_is_rejected_during_optional_initialization(self):
        previous_key = os.environ.pop("GROQ_API_KEY", None)
        try:
            transcriber = GroqWhisperTranscriber()
            with self.assertRaisesRegex(RuntimeError, "GROQ_API_KEY"):
                asyncio.run(transcriber.initialize())
        finally:
            if previous_key is not None:
                os.environ["GROQ_API_KEY"] = previous_key
