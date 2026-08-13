import asyncio
import os
import unittest
from unittest.mock import AsyncMock, patch

from rag.embeddings import EmbeddingsModel
import main


class RenderRateLimitStartupTests(unittest.TestCase):
    def test_openai_startup_initializes_client_without_submitting_an_embeddings_request(self):
        async def run() -> None:
            with patch.dict(os.environ, {
                "NODE_ENV": "production",
                "EMBEDDINGS_PROVIDER": "openai",
                "OPENAI_API_KEY": "test-key",
            }, clear=True), patch("rag.embeddings.httpx.AsyncClient") as client:
                client.return_value.aclose = AsyncMock()
                model = EmbeddingsModel()
                await model.initialize()
                client.return_value.post.assert_not_called()
                self.assertTrue(model.ready)
                await model.close()

        asyncio.run(run())

    def test_knowledge_bootstrap_waits_before_quota_consuming_indexing(self):
        async def run() -> None:
            retriever = object()
            class Ingestor:
                index_all = AsyncMock()

            ingestor = Ingestor()
            with patch.dict(os.environ, {
                "RAG_STARTUP_INDEX_DELAY_SECONDS": "5",
                "INDIAN_LAWYER_DATASET_AUTO_INDEX": "true",
            }, clear=True), patch("main.asyncio.sleep", new=AsyncMock()) as sleep, patch("main.load_demo_data", new=AsyncMock(return_value=True)) as demo:
                await main._bootstrap_knowledge(retriever, ingestor)
                sleep.assert_awaited_once_with(5.0)
                demo.assert_awaited_once_with(retriever)
                ingestor.index_all.assert_awaited_once()

        asyncio.run(run())
