import asyncio
import os
import unittest
from unittest.mock import patch

from ai.reasoning import ReasoningEngine


class _RouterResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"choices": [{"message": {"content": "Router-generated legal answer."}}]}


class _RecordingRouterClient:
    def __init__(self):
        self.calls = []

    async def post(self, url, *, json, headers):
        self.calls.append({"url": url, "json": json, "headers": headers})
        return _RouterResponse()


class HuggingFaceRouterReasoningTests(unittest.TestCase):
    def test_router_is_the_default_reasoning_provider_with_the_approved_model(self):
        with patch.dict(os.environ, {"HUGGINGFACE_API_KEY": "test-token"}, clear=False):
            engine = ReasoningEngine()

        self.assertEqual(engine.reasoning_provider, "huggingface_router")
        self.assertEqual(engine.hf_model, "openai/gpt-oss-120b:fastest")

    def test_router_uses_openai_compatible_chat_request_without_exposing_token(self):
        with patch.dict(os.environ, {
            "HUGGINGFACE_API_KEY": "router-test-token",
            "REASONING_PROVIDER": "huggingface_router",
            "REASONING_MODEL": "openai/gpt-oss-120b:fastest",
        }, clear=False):
            engine = ReasoningEngine()
            client = _RecordingRouterClient()
            engine.http_client = client
            result = asyncio.run(engine._call_llm("Legal prompt", "Safety system prompt"))

        self.assertEqual(result, "Router-generated legal answer.")
        self.assertEqual(len(client.calls), 1)
        request = client.calls[0]
        self.assertEqual(request["url"], "https://router.huggingface.co/v1/chat/completions")
        self.assertEqual(request["headers"], {"Authorization": "Bearer router-test-token"})
        self.assertEqual(request["json"]["model"], "openai/gpt-oss-120b:fastest")
        self.assertEqual(
            request["json"]["messages"],
            [
                {"role": "system", "content": "Safety system prompt"},
                {"role": "user", "content": "Legal prompt"},
            ],
        )
        self.assertEqual(request["json"]["max_tokens"], 1024)

    def test_empty_router_content_raises_so_verification_remains_fail_closed(self):
        class _EmptyResponse(_RouterResponse):
            def json(self):
                return {"choices": []}

        class _EmptyClient:
            async def post(self, *_args, **_kwargs):
                return _EmptyResponse()

        with patch.dict(os.environ, {"HUGGINGFACE_API_KEY": "router-test-token"}, clear=False):
            engine = ReasoningEngine()
            engine.http_client = _EmptyClient()
            with self.assertRaisesRegex(RuntimeError, "no legal-reasoning content"):
                asyncio.run(engine._call_llm("Legal prompt"))


if __name__ == "__main__":
    unittest.main()
