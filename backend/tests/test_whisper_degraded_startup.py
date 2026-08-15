import asyncio
import base64
import unittest

from fastapi import FastAPI, HTTPException

import main


class FailingSTT:
    def __init__(self):
        self.closed = False

    async def initialize(self):
        raise RuntimeError("GROQ_API_KEY must be configured")

    async def close(self):
        self.closed = True


class ReadySTT:
    async def initialize(self):
        return None

    async def close(self):
        return None


class STTDegradedStartupTests(unittest.TestCase):
    def test_missing_groq_key_degrades_microphone_only(self):
        app = FastAPI()
        candidate = FailingSTT()

        result = asyncio.run(main._initialize_optional_stt(app, candidate))

        self.assertIsNone(result)
        self.assertTrue(candidate.closed)
        self.assertEqual(app.state.stt_status, "unavailable")
        self.assertEqual(app.state.stt_provider, "groq-whisper")
        self.assertIn("typed questions", app.state.stt_startup_error)

    def test_ready_groq_stt_is_exposed_as_available(self):
        app = FastAPI()

        result = asyncio.run(main._initialize_optional_stt(app, ReadySTT()))

        self.assertIsNotNone(result)
        self.assertEqual(app.state.stt_status, "ready")
        self.assertEqual(app.state.stt_provider, "groq-whisper")
        self.assertIsNone(app.state.stt_startup_error)

    def test_stt_endpoint_preserves_503_when_groq_is_unavailable(self):
        previous = main.stt_transcriber
        previous_error = getattr(main.app.state, "stt_startup_error", None)
        try:
            main.stt_transcriber = None
            main.app.state.stt_startup_error = "Microphone transcription is temporarily unavailable. You can continue with typed questions."
            request = main.STTRequest(audio_base64=base64.b64encode(b"audio").decode("ascii"))
            with self.assertRaises(HTTPException) as raised:
                asyncio.run(main.speech_to_text(request))
            self.assertEqual(raised.exception.status_code, 503)
            self.assertIn("typed questions", raised.exception.detail)
        finally:
            main.stt_transcriber = previous
            main.app.state.stt_startup_error = previous_error
