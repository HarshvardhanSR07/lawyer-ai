from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from backend.documents.mock_data import get_mock_case_knowledge, get_mock_legal_knowledge
import uuid

# Initialize an in-memory Qdrant client
client = QdrantClient(":memory:")

def setup_qdrant():
    # Using fastembed out of the box with add() method
    client.set_model("BAAI/bge-small-en-v1.5")
    
    # Check if collections exist
    collections = [c.name for c in client.get_collections().collections]
    
    if "case_knowledge" not in collections:
        client.recreate_collection(
            collection_name="case_knowledge",
            vectors_config=client.get_fastembed_vector_params()
        )
        
    if "legal_knowledge" not in collections:
        client.recreate_collection(
            collection_name="legal_knowledge",
            vectors_config=client.get_fastembed_vector_params()
        )

def populate_mock_data():
    setup_qdrant()
    
    case_data = get_mock_case_knowledge()
    legal_data = get_mock_legal_knowledge()
    
    # Add case data
    client.add(
        collection_name="case_knowledge",
        documents=[item["text"] for item in case_data],
        metadata=[{k: v for k, v in item.items() if k != "text"} for item in case_data],
        ids=[item["id"] for item in case_data]
    )
    
    # Add legal data
    client.add(
        collection_name="legal_knowledge",
        documents=[item["text"] for item in legal_data],
        metadata=[{k: v for k, v in item.items() if k != "text"} for item in legal_data],
        ids=[item["id"] for item in legal_data]
    )

def search_case(question: str, limit: int = 2):
    results = client.query(
        collection_name="case_knowledge",
        query_text=question,
        limit=limit
    )
    return results

def search_legal(question: str, limit: int = 2):
    results = client.query(
        collection_name="legal_knowledge",
        query_text=question,
        limit=limit
    )
    return results

# Initialize data immediately when this module is imported
populate_mock_data()
