"""Persistent, provenance-preserving ingestion for the public Indian Lawyer dataset."""

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

DATASET_ID = "Mukesh555/indian_lawyer_dataset"
DATASET_CONFIG = "default"
DATASET_SPLIT = "train"
DATASET_HOME_URL = f"https://huggingface.co/datasets/{DATASET_ID}"
ROWS_URL = "https://datasets-server.huggingface.co/rows"


class IndianLawyerDatasetIngestor:
    """Downloads public rows once, turns them into bounded chunks, and upserts them safely."""

    def __init__(self, rag_retriever: Any, page_size: int = 50):
        self.rag_retriever = rag_retriever
        self.page_size = max(1, min(page_size, 100))
        self.http_client: Optional[httpx.AsyncClient] = None
        self.status = "not_started"
        self.rows_indexed = 0
        self.chunks_indexed = 0
        self.total_rows = 0
        self.last_error: Optional[str] = None

    async def initialize(self) -> None:
        if not self.http_client:
            self.http_client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0))

    async def close(self) -> None:
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 1800, overlap: int = 160) -> List[str]:
        """Create bounded, overlapping text segments without interpreting dataset content."""
        cleaned = " ".join((text or "").split())
        if not cleaned:
            return []
        if len(cleaned) <= chunk_size:
            return [cleaned]

        chunks: List[str] = []
        start = 0
        while start < len(cleaned):
            end = min(len(cleaned), start + chunk_size)
            if end < len(cleaned):
                boundary = cleaned.rfind(" ", start + chunk_size - 240, end)
                if boundary > start:
                    end = boundary
            chunks.append(cleaned[start:end])
            if end >= len(cleaned):
                break
            start = max(end - overlap, start + 1)
        return chunks

    @classmethod
    def build_documents(cls, row_index: int, row: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Build non-authoritative citation-ready chunks from one dataset row."""
        instruction = str(row.get("instruction") or "").strip()
        output = str(row.get("output") or "").strip()
        if not output:
            return []

        prefix = (
            "NON-AUTHORITATIVE ILLUSTRATIVE DATASET EXAMPLE. "
            "Do not treat this material as statute, reported case law, or a verified legal authority.\n\n"
        )
        if instruction:
            prefix += f"Task: {instruction}\n\nIllustrative output: "

        output_chunks = cls._chunk_text(output)
        documents: List[Dict[str, Any]] = []
        for chunk_index, chunk in enumerate(output_chunks):
            documents.append(
                {
                    "source": "Indian Lawyer Dataset — Illustrative Example",
                    "section": f"default/train row {row_index}, segment {chunk_index + 1}",
                    "document_name": "Mukesh555/indian_lawyer_dataset",
                    "page_number": 0,
                    "text": prefix + chunk,
                    "authority_level": "illustrative_dataset",
                    "dataset_name": DATASET_ID,
                    "dataset_config": DATASET_CONFIG,
                    "dataset_split": DATASET_SPLIT,
                    "dataset_row": row_index,
                    "dataset_chunk": chunk_index,
                    "provenance_url": DATASET_HOME_URL,
                    "citation_warning": "Illustrative training material; not an authoritative legal source.",
                }
            )
        return documents

    async def index_all(self) -> Dict[str, Any]:
        """Page through the complete published split and idempotently upsert every valid chunk."""
        if not self.http_client:
            raise RuntimeError("Indian Lawyer dataset client is not initialized")
        if self.status == "indexing":
            return self.snapshot()

        self.status = "indexing"
        self.last_error = None
        self.rows_indexed = 0
        self.chunks_indexed = 0
        offset = 0
        try:
            while True:
                response = await self.http_client.get(
                    ROWS_URL,
                    params={
                        "dataset": DATASET_ID,
                        "config": DATASET_CONFIG,
                        "split": DATASET_SPLIT,
                        "offset": offset,
                        "length": self.page_size,
                    },
                )
                response.raise_for_status()
                payload = response.json()
                rows = payload.get("rows", [])
                self.total_rows = int(payload.get("num_rows_total", self.total_rows or len(rows)))
                if not rows:
                    break

                documents: List[Dict[str, Any]] = []
                for wrapped_row in rows:
                    row_index = int(wrapped_row.get("row_idx", offset))
                    documents.extend(self.build_documents(row_index, wrapped_row.get("row", {})))

                if documents:
                    indexed = await self.rag_retriever.index_legal_documents(documents)
                    if indexed != len(documents):
                        cause = getattr(self.rag_retriever, "last_legal_index_error", None)
                        cause_suffix = f"; cause: {cause}" if cause else ""
                        raise RuntimeError(
                            f"Qdrant indexing incomplete at row offset {offset}: expected {len(documents)}, indexed {indexed}{cause_suffix}"
                        )
                    self.chunks_indexed += indexed
                self.rows_indexed += len(rows)
                offset += len(rows)
                logger.info(
                    "Indexed Indian Lawyer dataset progress: %s/%s rows, %s chunks",
                    self.rows_indexed,
                    self.total_rows,
                    self.chunks_indexed,
                )
                if self.total_rows and offset >= self.total_rows:
                    break
                await asyncio.sleep(0)

            self.status = "indexed"
            return self.snapshot()
        except Exception as exc:
            self.status = "failed"
            self.last_error = str(exc)
            logger.exception("Indian Lawyer dataset indexing failed")
            raise

    def snapshot(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "rows_indexed": self.rows_indexed,
            "chunks_indexed": self.chunks_indexed,
            "total_rows": self.total_rows,
            "dataset": DATASET_ID,
            "split": f"{DATASET_CONFIG}/{DATASET_SPLIT}",
            "last_error": self.last_error,
        }
