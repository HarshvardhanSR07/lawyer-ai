import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import main


class _FakeParser:
    async def parse_upload(self, _file):
        return ["The supplier must deliver conforming goods by 1 June 2026."]


class _StatefulRetriever:
    def __init__(self):
        self.indexed_case_documents = []
        self.embeddings = _FakeEmbeddings()

    async def index_case_documents(self, case_id, document_name, chunks):
        self.indexed_case_documents = [
            {
                "document_name": document_name,
                "case_id": case_id,
                "text": chunk,
                "clause": "Uploaded document",
            }
            for chunk in chunks
        ]
        return len(self.indexed_case_documents)

    async def search_legal(self, _question, question_vector=None):
        return [{"source": "Indian Contract Act, 1872", "authority_level": "primary", "text": "Section 10"}]

    async def search_case(self, _question, case_id=None, question_vector=None):
        return [item for item in self.indexed_case_documents if item["case_id"] == case_id]


class _FakeEmbeddings:
    async def embed_text(self, _question):
        return [0.1, 0.2]


class _FakeReasoner:
    def __init__(self):
        self.reason_inputs = []

    async def reason(self, **kwargs):
        self.reason_inputs.append(kwargs)
        return {
            "response": "The uploaded delivery clause is relevant.",
            "counterargument": "",
            "reasoning_summary": "Used uploaded case context.",
            "confidence": "high",
        }

    async def verify(self, **_kwargs):
        return {"safe_to_deliver": True}


class DocumentContextPipelineTests(unittest.TestCase):
    def test_uploaded_document_is_retrieved_as_reasoning_case_context(self):
        retriever = _StatefulRetriever()
        reasoner = _FakeReasoner()
        upload = SimpleNamespace(filename="delivery-clause.txt")

        with patch.object(main, "doc_parser", _FakeParser()), patch.object(main, "rag_retriever", retriever), patch.object(main, "reasoning_engine", reasoner):
            upload_response = asyncio.run(main.upload_case_document("case-42", upload))
            reasoning_response = asyncio.run(
                main.reason_over_context(main.ReasoningRequest(question="Was delivery required?", case_id="case-42"))
            )

        self.assertEqual(upload_response.chunks_indexed, 1)
        self.assertEqual(reasoning_response.verification_status, "approved")
        self.assertEqual(len(reasoner.reason_inputs[0]["evidence_sources"]), 1)
        self.assertIn("supplier must deliver", reasoner.reason_inputs[0]["evidence_sources"][0]["text"].lower())


if __name__ == "__main__":
    unittest.main()
