"""Persistent Groq Whisper automatic-speech-recognition client."""

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)


_MIME_EXTENSIONS = {
    "audio/flac": ".flac",
    "audio/m4a": ".m4a",
    "audio/mp3": ".mp3",
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mpeg",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
}


class GroqWhisperTranscriber:
    """A reusable authenticated client for bounded Groq Whisper transcription."""

    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")
        self.api_url = os.getenv("GROQ_STT_URL", "https://api.groq.com/openai/v1/audio/transcriptions")
        self.language = os.getenv("GROQ_STT_LANGUAGE", "").strip()
        self.max_audio_bytes = int(os.getenv("GROQ_STT_MAX_AUDIO_BYTES", str(24 * 1024 * 1024)))
        self.http_client: httpx.AsyncClient | None = None

    async def initialize(self) -> None:
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY must be configured before starting Groq Whisper transcription")
        if self.max_audio_bytes <= 0:
            raise ValueError("GROQ_STT_MAX_AUDIO_BYTES must be greater than zero")
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(45.0, connect=10.0),
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        logger.info("Persistent Groq Whisper client initialized for model %s", self.model)

    async def close(self) -> None:
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None

    def _client(self) -> httpx.AsyncClient:
        if not self.http_client:
            raise RuntimeError("Groq Whisper client is not initialized")
        return self.http_client

    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> dict[str, Any]:
        if not audio_bytes:
            raise ValueError("Audio content is required for transcription")
        if len(audio_bytes) > self.max_audio_bytes:
            raise ValueError(f"Audio content exceeds the {self.max_audio_bytes}-byte transcription limit")

        normalized_mime_type = (mime_type or "audio/webm").split(";", 1)[0].strip().lower()
        extension = _MIME_EXTENSIONS.get(normalized_mime_type, ".webm")
        data: dict[str, str] = {
            "model": self.model,
            "temperature": "0",
            "response_format": "verbose_json",
        }
        if self.language:
            data["language"] = self.language

        response = await self._client().post(
            self.api_url,
            data=data,
            files={"file": (f"microphone{extension}", audio_bytes, normalized_mime_type)},
        )
        response.raise_for_status()
        payload = response.json()
        text = str(payload.get("text", "")).strip() if isinstance(payload, dict) else ""
        if not text:
            raise ValueError("Groq Whisper returned no transcription text")
        return {
            "text": text,
            "confidence": 0.8,
            "language": payload.get("language", "unknown") if isinstance(payload, dict) else "unknown",
        }
