import asyncio
import unittest

from rag.retrieval import RAGRetriever


class _TrackingEmbeddings:
    def __init__(self):
        self.embed_text_calls = []

    async def embed_text(self, text):
        self.embed_text_calls.append(text)
        return [0.25, 0.75]


class _EmptyQdrant:
    def __init__(self):
        self.search_calls = []

    def search(self, **kwargs):
        self.search_calls.append(kwargs)
        return []


class RetrievalOptimizationTests(unittest.TestCase):
    def test_shared_query_vector_avoids_duplicate_embedding_and_preserves_two_collection_searches(self):
        retriever = object.__new__(RAGRetriever)
        retriever.embeddings = _TrackingEmbeddings()
        retriever.client = _EmptyQdrant()
        retriever.legal_collection = "legal_knowledge"
        retriever.case_collection = "case_knowledge"

        async def run():
            vector = await retriever.embeddings.embed_text("When is delivery due?")
            return await asyncio.gather(
                retriever.search_legal("When is delivery due?", question_vector=vector),
                retriever.search_case("When is delivery due?", case_id="case-1", question_vector=vector),
            )

        self.assertEqual(asyncio.run(run()), [[], []])
        self.assertEqual(retriever.embeddings.embed_text_calls, ["When is delivery due?"])
        self.assertEqual(len(retriever.client.search_calls), 2)
        self.assertTrue(all(call["query_vector"] == [0.25, 0.75] for call in retriever.client.search_calls))
