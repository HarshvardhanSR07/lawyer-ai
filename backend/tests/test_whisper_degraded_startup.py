import asyncio
import base64
import unittest

from fastapi import FastAPI, HTTPException

import main


class FailingWhisper:
    def __init__(self):
        self.closed = False

    async def initialize(self):
        raise RuntimeError("HUGGINGFACE_API_KEY must be configured")

    async def close(self):
        self.closed = True


class ReadyWhisper:
    async def initialize(self):
        return None

    async def close(self):
        return None


class WhisperDegradedStartupTests(unittest.TestCase):
    def test_missing_whisper_key_degrades_microphone_only(self):
        app = FastAPI()
        candidate = FailingWhisper()

        result = asyncio.run(main._initialize_optional_whisper(app, candidate))

        self.assertIsNone(result)
        self.assertTrue(candidate.closed)
        self.assertEqual(app.state.whisper_status, "unavailable")
        self.assertIn("typed questions", app.state.whisper_startup_error)

    def test_ready_whisper_is_exposed_as_available(self):
        app = FastAPI()

        result = asyncio.run(main._initialize_optional_whisper(app, ReadyWhisper()))

        self.assertIsNotNone(result)
        self.assertEqual(app.state.whisper_status, "ready")
        self.assertIsNone(app.state.whisper_startup_error)

    def test_stt_endpoint_preserves_503_when_whisper_is_unavailable(self):
        previous = main.whisper_transcriber
        previous_error = getattr(main.app.state, "whisper_startup_error", None)
        try:
            main.whisper_transcriber = None
            main.app.state.whisper_startup_error = "Microphone transcription is temporarily unavailable. You can continue with typed questions."
            request = main.STTRequest(audio_base64=base64.b64encode(b"audio").decode("ascii"))
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(main.speech_to_text(request))
            self.assertEqual(raised.exception.status_code, 503)
            self.assertIn("typed questions", raised.exception.detail)
        finally:
            main.whisper_transcriber = previous
            main.app.state.whisper_startup_error = previous_error
