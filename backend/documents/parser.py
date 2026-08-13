"""
Document Parser Module

Handles:
- PDF extraction using PyMuPDF
- Intelligent chunking by logical units (clauses, sections)
- Metadata tagging for retrieval
"""

import logging
from typing import List, Dict, Optional
import io

logger = logging.getLogger(__name__)

class DocumentParser:
    def __init__(self):
        """Initialize document parser"""
        try:
            import fitz  # PyMuPDF
            self.fitz = fitz
            logger.info("DocumentParser initialized with PyMuPDF")
        except ImportError:
            logger.warning("PyMuPDF not installed, document parsing will be limited")
            self.fitz = None
    
    async def parse_pdf(self, file_obj) -> List[Dict]:
        """
        Parse PDF file and extract text chunks.
        
        Args:
            file_obj: UploadFile object from FastAPI
        
        Returns:
            List of chunks: {text, page_number, clause}
        """
        try:
            if not self.fitz:
                logger.warning("PyMuPDF not available, returning empty chunks")
                return []
            
            content = await file_obj.read()
            return self._parse_pdf_bytes(content)
        except Exception as e:
            logger.error(f"PDF parsing error: {e}")
            return []

    def _parse_pdf_bytes(self, content: bytes) -> List[Dict]:
        """Extract retrieval chunks from already-read PDF bytes."""
        try:
            if not self.fitz:
                return []
            pdf_document = self.fitz.open(stream=content, filetype="pdf")
            chunks = []
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                text = page.get_text()
                
                # Split by paragraphs/clauses
                paragraphs = text.split("\n\n")
                
                for para in paragraphs:
                    if para.strip():
                        chunks.append({
                            "text": para.strip(),
                            "page_number": page_num + 1,
                            "clause": self._extract_clause_number(para),
                        })
            
            logger.info(f"Extracted {len(chunks)} chunks from PDF")
            return chunks
        except Exception as e:
            logger.error(f"PDF parsing error: {e}")
            return []

    async def parse_upload(self, file_obj) -> List[Dict]:
        """Parse a PDF or server-normalized plain-text upload for LawyerAI RAG."""
        content = await file_obj.read()
        content_type = (getattr(file_obj, "content_type", "") or "").lower()
        filename = (getattr(file_obj, "filename", "") or "").lower()
        if content_type == "application/pdf" or filename.endswith(".pdf"):
            return self._parse_pdf_bytes(content)
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            logger.warning("Unsupported non-text document upload: %s", filename)
            return []
        return await self.chunk_by_logical_units(text, document_type="evidence")
    
    def _extract_clause_number(self, text: str) -> str:
        """
        Extract clause/section number from text.
        
        Examples: "Clause 7", "Section 138", "Article 21"
        """
        import re
        
        # Look for common patterns
        patterns = [
            r"Clause\s+(\d+)",
            r"Section\s+(\d+)",
            r"Article\s+(\d+)",
            r"§\s*(\d+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                first_part = pattern.split(r"\s+")[0]
                return f"{first_part} {match.group(1)}"
        
        return ""
    
    async def chunk_by_logical_units(self, text: str, document_type: str = "contract") -> List[Dict]:
        """
        Chunk text by logical units (clauses, sections, paragraphs).
        
        Args:
            text: Full document text
            document_type: "contract", "act", "evidence", etc.
        
        Returns:
            List of chunks with metadata
        """
        try:
            chunks = []
            
            if document_type == "contract":
                # Split by clauses
                clause_chunks = self._split_by_clauses(text)
                chunks.extend(clause_chunks)
            elif document_type == "act":
                # Split by sections
                section_chunks = self._split_by_sections(text)
                chunks.extend(section_chunks)
            else:
                # Default: split by paragraphs
                para_chunks = self._split_by_paragraphs(text)
                chunks.extend(para_chunks)
            
            logger.info(f"Created {len(chunks)} logical chunks")
            return chunks
        
        except Exception as e:
            logger.error(f"Chunking error: {e}")
            return []
    
    def _split_by_clauses(self, text: str) -> List[Dict]:
        """Split contract text by clauses"""
        import re
        
        chunks = []
        
        # Look for "Clause N:" patterns
        clause_pattern = r"(Clause\s+\d+:.*?)(?=Clause\s+\d+:|$)"
        matches = re.finditer(clause_pattern, text, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            chunk_text = match.group(1).strip()
            if chunk_text:
                clause_num = re.search(r"Clause\s+(\d+)", chunk_text, re.IGNORECASE)
                chunks.append({
                    "text": chunk_text,
                    "clause": f"Clause {clause_num.group(1)}" if clause_num else "",
                })
        
        return chunks
    
    def _split_by_sections(self, text: str) -> List[Dict]:
        """Split legal act text by sections"""
        import re
        
        chunks = []
        
        # Look for "Section N" patterns
        section_pattern = r"(Section\s+\d+.*?)(?=Section\s+\d+|$)"
        matches = re.finditer(section_pattern, text, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            chunk_text = match.group(1).strip()
            if chunk_text:
                section_num = re.search(r"Section\s+(\d+)", chunk_text, re.IGNORECASE)
                chunks.append({
                    "text": chunk_text,
                    "section": f"Section {section_num.group(1)}" if section_num else "",
                })
        
        return chunks
    
    def _split_by_paragraphs(self, text: str) -> List[Dict]:
        """Split text by paragraphs"""
        chunks = []
        
        paragraphs = text.split("\n\n")
        for para in paragraphs:
            if para.strip():
                chunks.append({"text": para.strip()})
        
        return chunks
