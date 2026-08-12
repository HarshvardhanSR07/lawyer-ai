"""
Demo Data Loader

Loads demo case (ABC Technologies vs XYZ Solutions) and Indian law corpus
into Qdrant for testing and demo purposes.
"""

import asyncio
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# Demo legal sources (Indian Contract Act)
DEMO_LEGAL_SOURCES = [
    {
        "source": "Indian Contract Act, 1872",
        "section": "Section 62",
        "document_name": "ICA_1872.pdf",
        "page_number": 45,
        "text": "Performance of contract: The performance of a contract shall be done by the party or parties bound by it, or by their legal representatives, unless it is clear from the contract that performance by a particular person is essential.",
        "document_type": "act",
        "jurisdiction": "India",
    },
    {
        "source": "Indian Contract Act, 1872",
        "section": "Section 138",
        "document_name": "ICA_1872.pdf",
        "page_number": 89,
        "text": "Discharge of contract by breach: When a party to a contract has refused to perform, or disabled himself from performing, his promise in its entirety, the promisee may put an end to the contract.",
        "document_type": "act",
        "jurisdiction": "India",
    },
    {
        "source": "Indian Contract Act, 1872",
        "section": "Section 55",
        "document_name": "ICA_1872.pdf",
        "page_number": 38,
        "text": "Effect of neglect of promisee to afford promisor reasonable facilities for performance: If the promisee neglects or refuses to afford the promisor reasonable facilities for the performance of his promise, the promisor is excused by such neglect or refusal as to performance.",
        "document_type": "act",
        "jurisdiction": "India",
    },
    {
        "source": "Indian Contract Act, 1872",
        "section": "Section 73",
        "document_name": "ICA_1872.pdf",
        "page_number": 52,
        "text": "Compensation for loss or damage caused by breach of contract: When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby.",
        "document_type": "act",
        "jurisdiction": "India",
    },
    {
        "source": "Indian Contract Act, 1872",
        "section": "Section 31",
        "document_name": "ICA_1872.pdf",
        "page_number": 22,
        "text": "When persons agree upon something as a consideration for any promise, such an agreement is said to be made 'as a consideration for the promise'. The consideration may be an act, forbearance, or promise.",
        "document_type": "act",
        "jurisdiction": "India",
    },
]

# Demo case documents (ABC Technologies vs XYZ Solutions)
DEMO_CASE_DOCUMENTS = [
    {
        "document_name": "Contract.pdf",
        "page_number": 1,
        "clause": "Clause 7",
        "text": "Clause 7: Notice Period. Either party may terminate this agreement by providing written notice to the other party at least thirty (30) days in advance. The notice must be delivered in person or via registered mail to the address specified in Schedule A.",
        "case_id": "CASE001",
        "document_type": "contract",
    },
    {
        "document_name": "Contract.pdf",
        "page_number": 2,
        "clause": "Clause 9",
        "text": "Clause 9: Termination for Cause. Notwithstanding Clause 7, either party may terminate this agreement immediately upon written notice if the other party materially breaches any provision of this agreement and fails to cure such breach within fourteen (14) days of receiving written notice of the breach.",
        "case_id": "CASE001",
        "document_type": "contract",
    },
    {
        "document_name": "Email_Evidence.pdf",
        "page_number": 1,
        "clause": "Notice Period",
        "text": "Email dated 15th March 2026 from ABC Technologies to XYZ Solutions: 'Dear Sir/Madam, We hereby provide formal notice of our intention to terminate the agreement effective 15th April 2026, in accordance with Clause 7 of the contract. This notice is provided thirty (30) days in advance as required. Regards, ABC Technologies.'",
        "case_id": "CASE001",
        "document_type": "evidence",
    },
    {
        "document_name": "Payment_Record.pdf",
        "page_number": 1,
        "clause": "Payment History",
        "text": "Payment records show that ABC Technologies has consistently paid all invoices within the agreed payment terms. Last payment of USD 50,000 was made on 10th March 2026, well before the termination notice date of 15th March 2026.",
        "case_id": "CASE001",
        "document_type": "evidence",
    },
    {
        "document_name": "Legal_Notice.pdf",
        "page_number": 1,
        "clause": "Legal Notice",
        "text": "Legal notice from ABC Technologies' counsel dated 20th March 2026: 'Our client has provided proper notice of termination as per Clause 7 of the agreement. We deny any allegations of breach. The termination is valid and effective 15th April 2026.'",
        "case_id": "CASE001",
        "document_type": "notice",
    },
]

async def load_demo_data(rag_retriever) -> bool:
    """
    Load demo legal sources and case documents into Qdrant.
    
    Returns: True if successful, False otherwise
    """
    try:
        logger.info("Loading demo data into Qdrant...")
        
        # Index legal sources
        logger.info(f"Indexing {len(DEMO_LEGAL_SOURCES)} legal sources...")
        legal_count = await rag_retriever.index_legal_documents(DEMO_LEGAL_SOURCES)
        logger.info(f"Indexed {legal_count} legal sources")
        
        # Index case documents
        logger.info(f"Indexing {len(DEMO_CASE_DOCUMENTS)} case document chunks...")
        case_count = await rag_retriever.index_case_documents(
            case_id="CASE001",
            document_name="ABC_Technologies_vs_XYZ_Solutions",
            chunks=DEMO_CASE_DOCUMENTS
        )
        logger.info(f"Indexed {case_count} case document chunks")
        
        logger.info("Demo data loaded successfully")
        return True
    
    except Exception as e:
        logger.error(f"Failed to load demo data: {e}")
        return False

async def get_demo_case_metadata() -> Dict:
    """Get demo case metadata"""
    return {
        "case_id": "CASE001",
        "case_name": "ABC Technologies vs XYZ Solutions",
        "case_type": "Contract dispute",
        "status": "active",
        "evidence_count": len([d for d in DEMO_CASE_DOCUMENTS if d["document_type"] == "evidence"]),
        "legal_source_count": len(DEMO_LEGAL_SOURCES),
    }
