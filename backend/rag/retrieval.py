"""
RAG Retrieval Module

Handles semantic search over legal knowledge and uploaded case documents.
"""

import asyncio
import logging
import os
import uuid
from typing import Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from .embeddings import EmbeddingsModel

logger = logging.getLogger(__name__)


def stable_legal_document_point_id(doc: Dict) -> str:
    """Return the deterministic Qdrant identity used for a legal retrieval document."""
    identity = "|".join([
        str(doc.get("source", "")),
        str(doc.get("section", "")),
        str(doc.get("document_name", "")),
        str(doc.get("dataset_row", "")),
        str(doc.get("dataset_chunk", "")),
        doc["text"],
    ])
    return str(uuid.uuid5(uuid.NAMESPACE_URL, identity))


def stable_case_document_point_id(case_id: str, document_name: str, chunk_index: int, chunk: Dict) -> str:
    """Return a repeatable case-document identity without Python hash randomization."""
    identity = "|".join([
        case_id,
        document_name,
        str(chunk_index),
        str(chunk.get("page_number", "")),
        str(chunk.get("clause", "")),
        chunk["text"],
    ])
    return str(uuid.uuid5(uuid.NAMESPACE_URL, identity))


class RAGRetriever:
    def __init__(self):
        """Initialize Qdrant client and embeddings model."""
        self.qdrant_url = os.getenv("QDRANT_URL", "")
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY", "")
        if not self.qdrant_url:
            raise RuntimeError("QDRANT_URL must be configured for the persistent RAG backend")
        self.client = QdrantClient(url=self.qdrant_url, api_key=self.qdrant_api_key or None, timeout=20)
        self.embeddings = EmbeddingsModel()
        self.legal_collection = "legal_knowledge"
        self.case_collection = "case_knowledge"
        self.vector_dim = self.embeddings.vector_dim
        logger.info("RAGRetriever initialized with Qdrant at %s", self.qdrant_url)

    async def initialize(self):
        """Warm embeddings and Qdrant collections during FastAPI startup."""
        try:
            await self.embeddings.initialize()
            for collection in (self.legal_collection, self.case_collection):
                try:
                    await asyncio.to_thread(self.client.get_collection, collection)
                    logger.info("Collection %s already exists", collection)
                except Exception:
                    await asyncio.to_thread(
                        self.client.create_collection,
                        collection_name=collection,
                        vectors_config=VectorParams(size=self.vector_dim, distance=Distance.COSINE),
                    )
                    logger.info("Created collection %s", collection)
        except Exception as error:
            logger.error("Failed to initialize collections: %s", error)
            raise

    async def close(self):
        await self.embeddings.close()
        await asyncio.to_thread(self.client.close)

    async def search_legal(self, question: str, limit: int = 5, question_vector: Optional[List[float]] = None) -> List[Dict]:
        """Search legal sources, optionally reusing a request-scoped question embedding."""
        try:
            vector = question_vector or await self.embeddings.embed_text(question)
            results = await asyncio.to_thread(
                self.client.search,
                collection_name=self.legal_collection,
                query_vector=vector,
                limit=limit,
            )
            sources = [{
                "source": result.payload.get("source", ""),
                "section": result.payload.get("section", ""),
                "document_name": result.payload.get("document_name", ""),
                "page_number": result.payload.get("page_number", 0),
                "text": result.payload.get("text", ""),
                "authority_level": result.payload.get("authority_level", "primary"),
                "dataset_name": result.payload.get("dataset_name", ""),
                "dataset_split": result.payload.get("dataset_split", ""),
                "dataset_row": result.payload.get("dataset_row"),
                "provenance_url": result.payload.get("provenance_url", ""),
                "citation_warning": result.payload.get("citation_warning", ""),
                "relevance_score": result.score,
            } for result in results]
            logger.info("Found %s legal sources for question", len(sources))
            return sources
        except Exception as error:
            logger.error("Legal search error: %s", error)
            return []

    async def search_case(self, question: str, case_id: Optional[str] = None, limit: int = 5, question_vector: Optional[List[float]] = None) -> List[Dict]:
        """Search uploaded case evidence, optionally reusing a request-scoped question embedding."""
        try:
            vector = question_vector or await self.embeddings.embed_text(question)
            filter_condition = None
            if case_id:
                filter_condition = {"must": [{"key": "case_id", "match": {"value": case_id}}]}
            results = await asyncio.to_thread(
                self.client.search,
                collection_name=self.case_collection,
                query_vector=vector,
                query_filter=filter_condition,
                limit=limit,
            )
            evidence = [{
                "document_name": result.payload.get("document_name", ""),
                "page_number": result.payload.get("page_number", 0),
                "clause": result.payload.get("clause", ""),
                "text": result.payload.get("text", ""),
                "relevance_score": result.score,
            } for result in results]
            logger.info("Found %s case evidence for question", len(evidence))
            return evidence
        except Exception as error:
            logger.error("Case search error: %s", error)
            return []

    async def index_legal_documents(self, documents: List[Dict]) -> int:
        """Batch-embed and upsert legal documents with provenance-preserving payloads."""
        try:
            if not documents:
                return 0
            vectors = await self.embeddings.embed_batch([doc["text"] for doc in documents])
            if len(vectors) != len(documents):
                raise RuntimeError("Embedding provider returned an unexpected legal-document vector count")
            points = [PointStruct(
                id=stable_legal_document_point_id(doc),
                vector=vector,
                payload={
                    "source": doc.get("source", ""),
                    "section": doc.get("section", ""),
                    "document_name": doc.get("document_name", ""),
                    "page_number": doc.get("page_number", 0),
                    "text": doc.get("text", ""),
                    "authority_level": doc.get("authority_level", "primary"),
                    "dataset_name": doc.get("dataset_name", ""),
                    "dataset_config": doc.get("dataset_config", ""),
                    "dataset_split": doc.get("dataset_split", ""),
                    "dataset_row": doc.get("dataset_row"),
                    "dataset_chunk": doc.get("dataset_chunk"),
                    "provenance_url": doc.get("provenance_url", ""),
                    "citation_warning": doc.get("citation_warning", ""),
                },
            ) for doc, vector in zip(documents, vectors)]
            await asyncio.to_thread(self.client.upsert, collection_name=self.legal_collection, points=points)
            logger.info("Indexed %s legal documents", len(documents))
            return len(documents)
        except Exception as error:
            logger.error("Legal indexing error: %s", error)
            return 0

    async def index_case_documents(self, case_id: str, document_name: str, chunks: List[Dict]) -> int:
        """Batch-embed and upsert one uploaded document's case-evidence chunks."""
        try:
            if not chunks:
                return 0
            vectors = await self.embeddings.embed_batch([chunk["text"] for chunk in chunks])
            if len(vectors) != len(chunks):
                raise RuntimeError("Embedding provider returned an unexpected case-document vector count")
            points = [PointStruct(
                id=stable_case_document_point_id(case_id, document_name, index, chunk),
                vector=vector,
                payload={
                    "case_id": case_id,
                    "document_name": document_name,
                    "page_number": chunk.get("page_number", 0),
                    "clause": chunk.get("clause", ""),
                    "text": chunk.get("text", ""),
                },
            ) for index, (chunk, vector) in enumerate(zip(chunks, vectors))]
            await asyncio.to_thread(self.client.upsert, collection_name=self.case_collection, points=points)
            logger.info("Indexed %s chunks from %s", len(chunks), document_name)
            return len(chunks)
        except Exception as error:
            logger.error("Case indexing error: %s", error)
            return 0

    async def get_case_metadata(self, case_id: str) -> Optional[Dict]:
        """Get case metadata; persistence-backed case metadata is a future enhancement."""
        try:
            return {
                "case_id": case_id,
                "case_name": "ABC Technologies vs XYZ Solutions",
                "status": "active",
                "evidence_count": 4,
                "legal_source_count": 12,
            }
        except Exception as error:
            logger.error("Get case metadata error: %s", error)
            return None
