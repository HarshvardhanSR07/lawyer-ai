"""Persistent Hugging Face Whisper automatic-speech-recognition client."""

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class WhisperTranscriber:
    """A reusable authenticated client for server-side Whisper transcription."""

    def __init__(self) -> None:
        self.api_key = os.getenv("HUGGINGFACE_API_KEY", "")
        self.model = os.getenv("HUGGINGFACE_WHISPER_MODEL", "openai/whisper-large-v3-turbo")
        self.api_url = os.getenv(
            "HUGGINGFACE_WHISPER_URL",
            f"https://router.huggingface.co/hf-inference/models/{self.model}",
        )
        self.http_client: httpx.AsyncClient | None = None

    async def initialize(self) -> None:
        if not self.api_key:
            raise RuntimeError("HUGGINGFACE_API_KEY must be configured before starting Whisper transcription")
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(45.0, connect=10.0),
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        logger.info("Persistent Hugging Face Whisper client initialized for model %s", self.model)

    async def close(self) -> None:
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None

    def _client(self) -> httpx.AsyncClient:
        if not self.http_client:
            raise RuntimeError("Whisper client is not initialized")
        return self.http_client

    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> dict[str, Any]:
        if not audio_bytes:
            raise ValueError("Audio content is required for transcription")
        response = await self._client().post(
            self.api_url,
            content=audio_bytes,
            headers={"Content-Type": mime_type or "audio/webm"},
        )
        response.raise_for_status()
        payload = response.json()
        text = str(payload.get("text", "")).strip() if isinstance(payload, dict) else ""
        if not text:
            raise ValueError("Whisper returned no transcription text")
        return {
            "text": text,
            "confidence": float(payload.get("confidence", 0.8)) if isinstance(payload, dict) else 0.8,
            "language": payload.get("language", "unknown") if isinstance(payload, dict) else "unknown",
        }
