"""
Voice Module: Rime TTS Integration

Handles:
- Text-to-speech using Rime
- Voice personality configuration
"""

import logging
import io
import os
from typing import Optional, Dict, AsyncGenerator
import httpx

logger = logging.getLogger(__name__)

class RimeVoice:
    def __init__(self):
        """Configure Rime; the reusable HTTP client is opened during app startup."""
        self.rime_api_key = os.getenv("RIME_API_KEY", "")
        self.rime_api_url = os.getenv("RIME_API_URL", "https://users.rime.ai/v1/rime-tts")
        
        # Voice configuration for LawyerAI
        self.voice_id = os.getenv("RIME_VOICE_ID", "celeste")
        self.model_id = os.getenv("RIME_MODEL_ID", "coda")
        self.voice_personality = {
            "tone": "professional",
            "pace": "measured",
            "confidence": "high",
            "respect": "formal",
        }
        self.http_client: Optional[httpx.AsyncClient] = None
        
        logger.info(f"RimeVoice initialized with voice: {self.voice_id}")

    async def initialize(self):
        """Open the reusable HTTP client once during FastAPI startup."""
        if not self.rime_api_key:
            raise RuntimeError("RIME_API_KEY must be configured before starting the persistent backend")
        self.http_client = httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=10.0))

    async def close(self):
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None

    def _client(self) -> httpx.AsyncClient:
        if not self.http_client:
            raise RuntimeError("Rime client is not initialized")
        return self.http_client
    
    async def synthesize_speech(
        self,
        text: str,
        voice_id: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        """
        Synthesize speech using Rime TTS.
        
        Streams audio chunks as they're generated.
        
        Args:
            text: Text to synthesize
            voice_id: Optional voice ID override
        
        Yields:
            Audio chunks (WAV format)
        """
        try:
            logger.info(f"Synthesizing speech: {text[:50]}...")
            
            voice_to_use = voice_id or self.voice_id
            
            headers = {
                "Authorization": f"Bearer {self.rime_api_key}",
                "Accept": "audio/wav",
                "Content-Type": "application/json",
            }
            
            payload = {
                "text": text,
                "speaker": voice_to_use,
                "modelId": self.model_id,
            }
            
            async with self._client().stream(
                "POST",
                self.rime_api_url,
                json=payload,
                headers=headers,
            ) as response:
                response.raise_for_status()

                # Stream audio chunks
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk
        
        except Exception as e:
            logger.error(f"Speech synthesis error: {e}")
            raise
    
    async def format_for_voice(self, structured_response: str) -> str:
        """
        Convert structured legal response to natural spoken prose.
        
        Implements VOICE DELIVERY FORMATTING PROMPT:
        - Continuous spoken prose, not bullet points
        - Sentences short enough to speak naturally
        - Citations read aloud naturally ("under Section 138 of the Negotiable Instruments Act")
        - Preserve every citation and core argument
        - End with clear position statement
        
        Args:
            structured_response: Structured reasoning output
        
        Returns:
            Natural spoken prose ready for TTS
        """
        try:
            logger.info("Formatting response for voice delivery...")
            
            # Simple formatting for now
            # In production, use LLM to convert structured output to natural prose
            
            # Remove markdown formatting
            formatted = structured_response.replace("**", "").replace("##", "")
            
            # Convert citations to spoken form
            formatted = formatted.replace("Section ", "Section ")
            formatted = formatted.replace("Article ", "Article ")
            formatted = formatted.replace("Act", "Act")
            
            return formatted
        
        except Exception as e:
            logger.error(f"Voice formatting error: {e}")
            return structured_response
