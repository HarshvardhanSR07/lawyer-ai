from backend.documents.mock_data import get_mock_case_knowledge, get_mock_legal_knowledge
import re

# In-memory storage for uploaded case files (since we lack Qdrant working locally)
USER_DOCUMENTS = {}

def insert_case_document(user_id: int, filename: str, text: str):
    if user_id not in USER_DOCUMENTS:
        USER_DOCUMENTS[user_id] = []
    
    # Store chunks simply
    chunks = text.split("\n\n")
    for i, chunk in enumerate(chunks):
        if len(chunk.strip()) > 10:
            USER_DOCUMENTS[user_id].append({
                "document_name": filename,
                "text": chunk.strip(),
                "page_number": i + 1
            })

def tokenize(text):
    return set(re.findall(r'\w+', text.lower()))

def calculate_score(query_tokens, text_tokens):
    return len(query_tokens.intersection(text_tokens))

def search_case(question: str, user_id: int = None, limit: int = 2):
    query_tokens = tokenize(question)
    data = get_mock_case_knowledge()
    
    if user_id and user_id in USER_DOCUMENTS:
        data.extend(USER_DOCUMENTS[user_id])
    
    scored = []
    for item in data:
        score = calculate_score(query_tokens, tokenize(item["text"]))
        if "notice" in query_tokens and "Clause 7" in item["text"]: score += 10
        if "breach" in query_tokens and "Clause 9" in item["text"]: score += 10
        scored.append((score, item))
        
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for score, item in scored[:limit]]

def search_legal(question: str, limit: int = 2):
    query_tokens = tokenize(question)
    data = get_mock_legal_knowledge()
    
    if 0 in USER_DOCUMENTS:
        data.extend(USER_DOCUMENTS[0])
    
    scored = []
    for item in data:
        score = calculate_score(query_tokens, tokenize(item["text"]))
        if "breach" in query_tokens and "Section 73" in item["text"]: score += 10
        if "liberty" in query_tokens and "Article 21" in item["text"]: score += 10
        if score > 0:
            scored.append((score, item))
        
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for score, item in scored[:limit]]
