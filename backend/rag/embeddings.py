"""
Embeddings Module

Uses Hugging Face models to generate vector embeddings:
- InLegalBERT for Indian legal text
- multilingual-e5-large as fallback
"""

import os
import logging
import asyncio
from typing import List
import numpy as np
import httpx

logger = logging.getLogger(__name__)

class EmbeddingsModel:
    def __init__(self):
        """Define the embedding configuration; resources are opened by initialize()."""
        self.model_name = os.getenv("EMBEDDINGS_MODEL", "intfloat/multilingual-e5-large")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.is_production = os.getenv("NODE_ENV", "").lower() == "production" or bool(os.getenv("RENDER"))
        configured_provider = os.getenv("EMBEDDINGS_PROVIDER", "").lower()
        self.provider = configured_provider or ("openai" if self.is_production or self.openai_api_key else "local")
        if self.provider not in {"openai", "local"}:
            raise RuntimeError("EMBEDDINGS_PROVIDER must be either 'openai' or 'local'")
        self.vector_dim = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
        logger.info(f"Using embeddings model: {self.model_name}")
        
        # Lazy load the model
        self.model = None
        self.tokenizer = None
        self.torch = None
        self.device = None
        self.http_client: httpx.AsyncClient | None = None
        self.ready = False
    
    async def initialize(self):
        """Eagerly prepare the configured embedding provider during app startup."""
        if self.ready:
            return

        if self.is_production and self.provider != "openai":
            raise RuntimeError("Production RAG requires EMBEDDINGS_PROVIDER=openai; local model downloads are disabled")

        if self.provider == "openai":
            if not self.openai_api_key:
                raise RuntimeError("OPENAI_API_KEY is required for production remote embeddings")
            self.http_client = httpx.AsyncClient(
                base_url=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1"),
                headers={"Authorization": f"Bearer {self.openai_api_key}"},
                timeout=httpx.Timeout(30.0, connect=10.0),
            )
            self.ready = True
            logger.info("OpenAI embedding client initialized without a quota-consuming startup request")
            return

        try:
            from transformers import AutoTokenizer, AutoModel
            import torch
            
            logger.info(f"Loading embeddings model: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name)
            self.torch = torch
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            self.model.eval()
            self.ready = True
            logger.info(f"Model loaded on device: {self.device}")
        except Exception as e:
            logger.error(f"Failed to load embeddings model: {e}")
            raise

    async def close(self):
        """Release reusable network resources during graceful shutdown."""
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None
        self.ready = False

    async def _embed_with_openai(self, text: str) -> List[float]:
        if not self.http_client:
            raise RuntimeError("Embedding client is not initialized")
        response = await self._post_openai_embeddings(text)
        return response.json()["data"][0]["embedding"]

    async def _post_openai_embeddings(self, input_value: str | List[str]) -> httpx.Response:
        """Submit one bounded embeddings request with short 429 backoff for live requests."""
        if not self.http_client:
            raise RuntimeError("Embedding client is not initialized")
        attempts = max(1, int(os.getenv("OPENAI_EMBEDDING_MAX_ATTEMPTS", "3")))
        response: httpx.Response | None = None
        for attempt in range(attempts):
            response = await self.http_client.post(
                "/embeddings",
                json={
                    "model": os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
                    "input": input_value,
                    "dimensions": self.vector_dim,
                },
            )
            if response.status_code != 429 or attempt == attempts - 1:
                response.raise_for_status()
                return response
            retry_after = response.headers.get("retry-after")
            delay = min(float(retry_after) if retry_after else 2 ** attempt, 10.0)
            logger.warning("OpenAI embeddings rate limited; retrying in %.1fs (%s/%s)", delay, attempt + 1, attempts)
            await asyncio.sleep(delay)
        raise RuntimeError("OpenAI embeddings request did not produce a response")
    
    async def embed_text(self, text: str) -> List[float]:
        """
        Embed a single text string.
        
        Returns: Vector as list of floats
        """
        try:
            if not self.ready:
                raise RuntimeError("Embeddings are not initialized; FastAPI startup must complete before requests are served")

            if self.provider == "openai":
                return await self._embed_with_openai(text)
            
            # Tokenize and encode
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512
            ).to(self.device)
            
            # Generate embeddings
            with self.torch.no_grad():
                outputs = self.model(**inputs)
                embeddings = outputs.last_hidden_state.mean(dim=1)
            
            # Normalize and convert to list
            embeddings = embeddings.cpu().numpy()[0]
            embeddings = embeddings / np.linalg.norm(embeddings)
            
            return embeddings.tolist()
        
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            raise
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Embed multiple texts.
        
        Returns: List of vectors
        """
        try:
            if not self.ready:
                raise RuntimeError("Embeddings are not initialized; FastAPI startup must complete before requests are served")
            if not texts:
                return []

            if self.provider == "openai":
                if not self.http_client:
                    raise RuntimeError("Embedding client is not initialized")
                response = await self._post_openai_embeddings(texts)
                data = response.json()["data"]
                return [item["embedding"] for item in sorted(data, key=lambda item: item["index"])]

            batch_size = max(1, int(os.getenv("EMBEDDING_BATCH_SIZE", "16")))
            vectors: List[List[float]] = []
            for start in range(0, len(texts), batch_size):
                batch = texts[start:start + batch_size]
                inputs = self.tokenizer(
                    batch,
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                    max_length=512,
                ).to(self.device)
                with self.torch.no_grad():
                    outputs = self.model(**inputs)
                    attention = inputs["attention_mask"].unsqueeze(-1)
                    pooled = (outputs.last_hidden_state * attention).sum(dim=1) / attention.sum(dim=1).clamp(min=1)
                batch_vectors = pooled.cpu().numpy()
                batch_vectors = batch_vectors / np.linalg.norm(batch_vectors, axis=1, keepdims=True)
                vectors.extend(batch_vectors.tolist())
            return vectors
        except Exception as e:
            logger.error(f"Batch embedding error: {e}")
            raise
    
    async def embed_for_qdrant(self, text: str) -> List[float]:
        """
        Embed text for Qdrant vector storage.
        Returns a normalized vector suitable for cosine similarity.
        """
        return await self.embed_text(text)
