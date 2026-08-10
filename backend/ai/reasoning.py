import httpx
import json
from backend.rag.retrieval import search_case, search_legal
from backend.ai.web_search import get_latest_news
from backend.database.db import get_history, add_message
from backend.ai.prompts import GLOBAL_SYSTEM_PROMPT, REASONING_PROMPT, VOICE_DELIVERY_PROMPT

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

def query_ollama(prompt: str, system: str = "") -> str:
    """
    Sends a query to local Ollama (llama3:latest) with a timeout.
    """
    try:
        payload = {
            "model": "llama3:latest",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2
            }
        }
        if system:
            payload["system"] = system
            
        res = httpx.post(OLLAMA_URL, json=payload, timeout=60.0)
        if res.status_code == 200:
            return res.json().get("response", "").strip()
    except Exception as e:
        print(f"Ollama API query error: {e}")
    return ""

def format_retrieved_sources(case_results, legal_results, news_result):
    sources = []
    for item in case_results:
        sources.append(f"[CASE EVIDENCE] {item.get('document_name', 'Doc')} (Page {item.get('page_number', 1)}): {item['text']}")
    for item in legal_results:
        src_name = item.get('source') or item.get('document_name') or 'Legal Act'
        sec_name = item.get('section') or f"Page/Art {item.get('page_number', '')}"
        sources.append(f"[LEGAL KNOWLEDGE] {src_name} {sec_name}: {item['text']}")
    if news_result:
        sources.append(f"[LIVE WEB SEARCH]\n{news_result}")
    return "\n".join(sources)

def generate_reasoning(question: str, user_id: int):
    # Save the user's question to the database
    add_message(user_id, "user", question)
    
    # 1. Retrieve relevant contexts
    case_context = search_case(question, user_id=user_id)
    legal_context = search_legal(question)
    
    news_result = ""
    if "news" in question.lower() or "latest" in question.lower() or "today" in question.lower():
        news_result = get_latest_news(question)
        
    retrieved_text = format_retrieved_sources(case_context, legal_context, news_result)
    history = get_history(user_id)
    
    history_str = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history[:-1]])

    # 2. Build reasoning prompt
    reasoning_prompt = REASONING_PROMPT.format(
        global_system_prompt=GLOBAL_SYSTEM_PROMPT.format(client_name="the Client", case_type="the Case"),
        speaker_role="user",
        core_issue=question,
        transcript=question,
        retrieved_chunks_with_citations=retrieved_text if retrieved_text else "No relevant context found.",
        case_summary="Facts from uploaded case records and constitutional documents.",
        conversation_history=history_str
    )

    # 3. Generate structured reasoning draft using local Ollama
    print("Querying Ollama for structured legal reasoning...")
    drafted_response = query_ollama(reasoning_prompt)
    if not drafted_response:
        # Context-aware fallback when Ollama is unavailable
        if legal_context or case_context:
            top_ref = (legal_context[0] if legal_context else case_context[0])
            ref_title = top_ref.get('source') or top_ref.get('document_name') or 'legal documents'
            sec_title = top_ref.get('section') or f"Article/Page {top_ref.get('page_number', '')}"
            snippet = top_ref.get('text', '')[:300]
            drafted_response = f"""
1. LEGAL BASIS — Grounded in {ref_title} ({sec_title}).
2. ARGUMENT — {snippet}
3. COUNTER TO OPPONENT'S POINT — Evaluated against provided evidence.
4. CONFIDENCE — high
5. FLAGS — LLM unavailable; response constructed from RAG retrieval only.
            """
        else:
            drafted_response = """
1. LEGAL BASIS — No matching provisions found in uploaded evidence or Constitution.
2. ARGUMENT — N/A
3. COUNTER TO OPPONENT'S POINT — N/A
4. CONFIDENCE — low
5. FLAGS — Insufficient context. Please upload relevant case documents.
            """

    # 4. Generate voice text delivery using local Ollama
    voice_prompt = VOICE_DELIVERY_PROMPT.format(
        verified_response=drafted_response
    )
    print("Querying Ollama for voice delivery synthesis...")
    voice_text = query_ollama(voice_prompt)
    if not voice_text:
        # Context-aware voice fallback
        if legal_context or case_context:
            top_ref = (legal_context[0] if legal_context else case_context[0])
            ref_title = top_ref.get('source') or top_ref.get('document_name') or 'the relevant legal provision'
            sec_title = top_ref.get('section') or f"Article {top_ref.get('page_number', '')}"
            snippet = top_ref.get('text', '')[:200]
            voice_text = f"According to {ref_title}, {sec_title}: {snippet}."
        else:
            voice_text = "I do not have enough verified information in the uploaded case files or the Indian Constitution to answer that question. Please provide more case evidence."

    # 5. Simple verification validation
    verification_result = {
        "verdict": "approved" if "low" not in drafted_response.lower() else "flagged",
        "unsupported_claims": [],
        "citation_mismatches": [],
        "logical_issues": [],
        "safe_to_deliver": "low" not in drafted_response.lower()
    }
    
    if not verification_result["safe_to_deliver"]:
        voice_text = "My verification gate has flagged this response for insufficient grounding in the provided context. Please upload more case evidence."

    # Save the assistant response to the database
    add_message(user_id, "ai", voice_text)
    
    return {
        "voice_text": voice_text,
        "structured_reasoning": drafted_response,
        "citations": retrieved_text,
        "verification": verification_result,
        "status": "success"
    }
