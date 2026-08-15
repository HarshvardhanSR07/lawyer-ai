import asyncio
from difflib import SequenceMatcher
import os
import re
import unittest

import httpx
from unittest.mock import patch

import main
from voice.groq_whisper import GroqWhisperTranscriber


EXPECTED_TOKENS = "the delivery contract is due on monday".split()


def _word_accuracy(transcript: str) -> float:
    actual_tokens = re.findall(r"[a-z]+", transcript.lower())
    return SequenceMatcher(a=EXPECTED_TOKENS, b=actual_tokens).ratio()


async def _synthesize_known_legal_phrase() -> bytes:
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
        speech = await client.post(
            "https://users.rime.ai/v1/rime-tts",
            headers={
                "authorization": f"Bearer {os.environ['RIME_API_KEY']}",
                "content-type": "application/json",
                "accept": "audio/wav",
            },
            json={
                "text": "The delivery contract is due on Monday.",
                "speaker": "celeste",
                "modelId": "coda",
            },
        )
        speech.raise_for_status()
        if len(speech.content) <= 512:
            raise AssertionError("Rime returned an unexpectedly short WAV response")
        return speech.content


@unittest.skipUnless(
    os.getenv("RUN_LIVE_STT_ACCEPTANCE") == "1",
    "Live provider acceptance is opt-in; set RUN_LIVE_STT_ACCEPTANCE=1 to run it.",
)
class LiveSpeechToTextAcceptanceTests(unittest.TestCase):
    def test_rime_legal_phrase_transcribes_with_groq_whisper(self):
        async def run_acceptance() -> str:
            groq_key = os.environ["GROQ_API_KEY"]
            whisper_model = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")
            whisper_url = os.getenv("GROQ_STT_URL", "https://api.groq.com/openai/v1/audio/transcriptions")

            async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
                transcript = await client.post(
                    whisper_url,
                    headers={"Authorization": f"Bearer {groq_key}"},
                    data={"model": whisper_model, "temperature": "0", "response_format": "verbose_json"},
                    files={"file": ("known-legal-phrase.wav", await _synthesize_known_legal_phrase(), "audio/wav")},
                )
                transcript.raise_for_status()
                return str(transcript.json().get("text", "")).strip()

        text = asyncio.run(run_acceptance())
        self.assertGreaterEqual(_word_accuracy(text), 0.85, text)

    def test_fastapi_stt_route_transcribes_known_phrase(self):
        async def run_acceptance() -> dict:
            transcriber = GroqWhisperTranscriber()
            await transcriber.initialize()
            try:
                payload = {
                    "audio_base64": __import__("base64").b64encode(await _synthesize_known_legal_phrase()).decode("ascii"),
                    "mime_type": "audio/wav",
                    "is_final": True,
                }
                transport = httpx.ASGITransport(app=main.app)
                async with httpx.AsyncClient(transport=transport, base_url="http://lawyerai.test") as client:
                    with patch.object(main, "stt_transcriber", transcriber):
                        response = await client.post("/api/stt", json=payload)
                response.raise_for_status()
                return response.json()
            finally:
                await transcriber.close()

        response = asyncio.run(run_acceptance())
        self.assertTrue(response["is_final"])
        self.assertGreaterEqual(_word_accuracy(response["transcript"]), 0.85, response["transcript"])


if __name__ == "__main__":
    unittest.main()
