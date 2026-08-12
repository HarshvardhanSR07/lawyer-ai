import asyncio
import unittest
from unittest.mock import patch

import main


class _FakeRetriever:
    def __init__(self, legal_sources):
        self.legal_sources = legal_sources
        self.legal_queries = []
        self.case_queries = []
        self.embeddings = _FakeEmbeddings()

    async def search_legal(self, question, question_vector=None):
        self.legal_queries.append((question, question_vector))
        return self.legal_sources

    async def search_case(self, question, case_id=None, question_vector=None):
        self.case_queries.append((question, case_id, question_vector))
        return []


class _FakeEmbeddings:
    async def embed_text(self, question):
        return [len(question)]


class _FakeReasoner:
    def __init__(self, approved):
        self.approved = approved
        self.reason_inputs = []
        self.verify_inputs = []

    async def reason(self, **kwargs):
        self.reason_inputs.append(kwargs)
        return {
            "response": "Draft answer grounded in retrieved context.",
            "counterargument": "",
            "reasoning_summary": "Retrieved and analyzed legal context.",
            "confidence": "high",
        }

    async def verify(self, **kwargs):
        self.verify_inputs.append(kwargs)
        return {"safe_to_deliver": self.approved}


class ReasoningRoutePipelineTests(unittest.TestCase):
    def _call_route(self, legal_sources, approved):
        retriever = _FakeRetriever(legal_sources)
        reasoner = _FakeReasoner(approved)
        request = main.ReasoningRequest(question="Is this agreement enforceable?", case_id="case-1")
        with patch.object(main, "rag_retriever", retriever), patch.object(main, "reasoning_engine", reasoner):
            response = asyncio.run(main.reason_over_context(request))
        return response, retriever, reasoner

    def test_authoritative_retrieval_flows_to_approved_reasoning_response(self):
        source = {
            "source": "Indian Contract Act, 1872",
            "section": "Section 10",
            "authority_level": "primary",
            "text": "All agreements are contracts if made by free consent.",
        }
        response, retriever, reasoner = self._call_route([source], approved=True)

        self.assertEqual(response.verification_status, "approved")
        self.assertEqual(response.legal_sources, [source])
        expected_vector = [len("Is this agreement enforceable?")]
        self.assertEqual(retriever.legal_queries, [("Is this agreement enforceable?", expected_vector)])
        self.assertEqual(retriever.case_queries, [("Is this agreement enforceable?", "case-1", expected_vector)])
        self.assertEqual(reasoner.reason_inputs[0]["legal_sources"], [source])
        self.assertEqual(reasoner.verify_inputs[0]["legal_sources"], [source])

    def test_illustrative_only_retrieval_remains_fail_closed_at_route_level(self):
        source = {
            "source": "Indian Lawyer Dataset — Illustrative Example",
            "authority_level": "illustrative_dataset",
            "text": "Example training-corpus answer.",
        }
        response, _retriever, reasoner = self._call_route([source], approved=False)

        self.assertEqual(response.verification_status, "flagged")
        self.assertIn("cannot provide a confident answer", response.response)
        self.assertEqual(reasoner.verify_inputs[0]["legal_sources"], [source])


if __name__ == "__main__":
    unittest.main()
