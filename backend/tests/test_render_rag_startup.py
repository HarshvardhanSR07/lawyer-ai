import asyncio
import os
import unittest
from unittest.mock import patch

from rag.embeddings import EmbeddingsModel
from rag.retrieval import RAGRetriever


class RenderRagStartupTests(unittest.TestCase):
    def test_qdrant_cloud_client_uses_https_default_port_and_skips_compatibility_probe(self):
        with patch.dict(os.environ, {
            "QDRANT_URL": "https://cluster.eu-central-1-0.aws.cloud.qdrant.io",
            "QDRANT_API_KEY": "test-key",
        }, clear=True), patch("rag.retrieval.QdrantClient") as client:
            RAGRetriever()

        client.assert_called_once_with(
            url="https://cluster.eu-central-1-0.aws.cloud.qdrant.io",
            port=None,
            prefer_grpc=False,
            https=True,
            api_key="test-key",
            timeout=20,
            check_compatibility=False,
        )

    def test_production_requires_remote_embedding_provider_instead_of_loading_local_model(self):
        with patch.dict(os.environ, {
            "NODE_ENV": "production",
            "EMBEDDINGS_PROVIDER": "local",
        }, clear=True):
            model = EmbeddingsModel()
            with self.assertRaisesRegex(RuntimeError, "local model downloads are disabled"):
                asyncio.run(model.initialize())

    def test_production_without_provider_key_fails_clearly_before_local_model_load(self):
        with patch.dict(os.environ, {"NODE_ENV": "production"}, clear=True):
            model = EmbeddingsModel()
            self.assertEqual(model.provider, "openai")
            with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
                asyncio.run(model.initialize())
