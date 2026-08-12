import asyncio
import unittest

from data.indian_lawyer_dataset import (
    DATASET_CONFIG,
    DATASET_ID,
    DATASET_SPLIT,
    IndianLawyerDatasetIngestor,
)
from rag.retrieval import RAGRetriever, stable_case_document_point_id, stable_legal_document_point_id


class _FakeEmbeddings:
    async def embed_text(self, text):
        return [0.1, 0.2]

    async def embed_batch(self, texts):
        return [[0.1, 0.2] for _text in texts]


class _FakeQdrant:
    def __init__(self):
        self.points_by_id = {}
        self.upsert_calls = 0

    def upsert(self, collection_name, points):
        self.upsert_calls += 1
        for point in points:
            self.points_by_id[str(point.id)] = point


class IndianLawyerDatasetIngestorTests(unittest.TestCase):
    def test_build_documents_preserves_non_authoritative_provenance(self):
        documents = IndianLawyerDatasetIngestor.build_documents(
            27,
            {
                "instruction": "Draft an illustrative legal response.",
                "output": "Example response text.",
            },
        )

        self.assertEqual(len(documents), 1)
        document = documents[0]
        self.assertIn("NON-AUTHORITATIVE ILLUSTRATIVE DATASET EXAMPLE", document["text"])
        self.assertEqual(document["authority_level"], "illustrative_dataset")
        self.assertEqual(document["dataset_name"], DATASET_ID)
        self.assertEqual(document["dataset_config"], DATASET_CONFIG)
        self.assertEqual(document["dataset_split"], DATASET_SPLIT)
        self.assertEqual(document["dataset_row"], 27)
        self.assertIn("not an authoritative legal source", document["citation_warning"])

    def test_build_documents_chunks_large_rows_without_losing_row_identity(self):
        documents = IndianLawyerDatasetIngestor.build_documents(
            88,
            {"instruction": "Illustrative drafting task", "output": "word " * 1000},
        )

        self.assertGreater(len(documents), 1)
        self.assertEqual([doc["dataset_chunk"] for doc in documents], list(range(len(documents))))
        self.assertTrue(all(doc["dataset_row"] == 88 for doc in documents))
        self.assertTrue(all(len(doc["text"]) <= 3000 for doc in documents))

    def test_build_documents_skips_rows_without_output(self):
        self.assertEqual(IndianLawyerDatasetIngestor.build_documents(1, {"instruction": "Only prompt"}), [])

    def test_repeated_upserts_keep_stable_qdrant_logical_records(self):
        documents = IndianLawyerDatasetIngestor.build_documents(
            5,
            {"instruction": "Illustrative question", "output": "Example legal answer."},
        )
        retriever = object.__new__(RAGRetriever)
        retriever.embeddings = _FakeEmbeddings()
        retriever.client = _FakeQdrant()
        retriever.legal_collection = "legal_knowledge"

        first_indexed = asyncio.run(retriever.index_legal_documents(documents))
        first_ids = set(retriever.client.points_by_id)
        second_indexed = asyncio.run(retriever.index_legal_documents(documents))

        self.assertEqual(first_indexed, len(documents))
        self.assertEqual(second_indexed, len(documents))
        self.assertEqual(retriever.client.upsert_calls, 2)
        self.assertEqual(set(retriever.client.points_by_id), first_ids)
        self.assertEqual(len(retriever.client.points_by_id), len(documents))
        self.assertEqual(first_ids, {stable_legal_document_point_id(document) for document in documents})

    def test_case_document_upserts_use_stable_ids_and_one_batch_embedding_call(self):
        class _BatchTrackingEmbeddings(_FakeEmbeddings):
            def __init__(self):
                self.batch_calls = []

            async def embed_batch(self, texts):
                self.batch_calls.append(texts)
                return await super().embed_batch(texts)

        chunks = [
            {"text": "The buyer shall pay within thirty days.", "page_number": 1, "clause": "4.1"},
            {"text": "Delivery is due on Monday.", "page_number": 2, "clause": "5.2"},
        ]
        retriever = object.__new__(RAGRetriever)
        retriever.embeddings = _BatchTrackingEmbeddings()
        retriever.client = _FakeQdrant()
        retriever.case_collection = "case_knowledge"

        self.assertEqual(asyncio.run(retriever.index_case_documents("case-1", "agreement.txt", chunks)), 2)
        self.assertEqual(retriever.embeddings.batch_calls, [[chunk["text"] for chunk in chunks]])
        self.assertEqual(
            set(retriever.client.points_by_id),
            {stable_case_document_point_id("case-1", "agreement.txt", index, chunk) for index, chunk in enumerate(chunks)},
        )


if __name__ == "__main__":
    unittest.main()
