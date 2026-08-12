# LawyerAI Backend Service

Python FastAPI service for LawyerAI courtroom advocacy console. Handles RAG, reasoning, verification, and voice I/O.

## Architecture

```
backend/
├── main.py                 # FastAPI app and endpoints
├── ai/
│   ├── reasoning.py       # Reasoning engine with verification gate
│   └── prompts.py         # Verbatim prompts from spec
├── rag/
│   ├── retrieval.py       # Qdrant semantic search
│   └── embeddings.py      # Hugging Face embeddings
├── voice/
│   └── rime.py            # Rime TTS + Whisper STT
├── documents/
│   └── parser.py          # PDF extraction and chunking
└── data/
    └── demo_loader.py     # Demo case and legal sources
```

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `config.example.py` to `config.py` and fill in your API keys:

```bash
cp config.example.py config.py
```

Required keys:
- `HUGGINGFACE_API_KEY` - For reasoning LLM and embeddings
- `RIME_API_KEY` - For TTS and STT
- `QDRANT_URL` - Qdrant vector database URL

### 3. Start Qdrant (if running locally)

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 4. Run FastAPI Server

```bash
python main.py
```

Server will start on `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### Speech-to-Text
```
POST /api/stt
Content-Type: application/json

{
  "audio_bytes": "<base64-encoded WAV>",
  "is_final": false
}

Response:
{
  "transcript": "Why should we accept your client's interpretation?",
  "is_final": true,
  "confidence": 0.95
}
```

### Reasoning (Core Loop)
```
POST /api/reason
Content-Type: application/json

{
  "question": "Why should we accept your client's interpretation?",
  "case_context": [...],
  "legal_context": [...],
  "conversation_history": [...]
}

Response:
{
  "response": "Your Honour, respectfully...",
  "legal_sources": [
    {
      "source": "Indian Contract Act, 1872",
      "section": "Section 62",
      "document_name": "ICA_1872.pdf",
      "page_number": 45,
      "text": "...",
      "relevance_score": 0.92
    }
  ],
  "evidence": [...],
  "confidence": "high",
  "verification_status": "approved"
}
```

### Text-to-Speech
```
POST /api/tts
Content-Type: application/json

{
  "text": "Your Honour, respectfully...",
  "voice_id": "professional-lawyer"
}

Response: Audio stream (WAV format)
```

### Case Metadata
```
GET /api/case/{case_id}

Response:
{
  "case_id": "CASE001",
  "case_name": "ABC Technologies vs XYZ Solutions",
  "status": "active",
  "evidence_count": 4,
  "legal_source_count": 12
}
```

### Upload Case Document
```
POST /api/case/{case_id}/documents
Content-Type: multipart/form-data

file: <PDF file>

Response:
{
  "document_id": "CASE001_Contract.pdf",
  "document_name": "Contract.pdf",
  "chunks_indexed": 42
}
```

### Demo Case
```
GET /api/demo/case

Response:
{
  "case_id": "CASE001",
  "case_name": "ABC Technologies vs XYZ Solutions",
  "case_type": "Contract dispute",
  "status": "active",
  "documents": [...]
}
```

### Run Demo Question
```
POST /api/demo/run-question
Content-Type: application/json

{
  "question": "Counsel, the opposing side claims that your client breached the agreement. Why should the court reject that argument?"
}

Response: Same as /api/reason
```

## Reasoning Pipeline

The core reasoning loop implements the mandatory order:

1. **UNDERSTAND** - Parse the question
2. **IDENTIFY LEGAL ISSUE** - Determine what law applies
3. **ANALYZE OPPONENT ARGUMENT** - Understand the opposing position
4. **RETRIEVE SUPPORTING LAW/EVIDENCE** - Search Qdrant for relevant sources
5. **COMPARE ARGUMENT WITH EVIDENCE** - Cross-check against retrieved context
6. **FIND WEAKNESS/CONTRADICTION** - Identify gaps in opponent's argument
7. **FORMULATE COUNTERARGUMENT** - Build response from retrieved sources
8. **VERIFY** - Mandatory verification gate (no response bypasses this)
9. **GENERATE COURTROOM RESPONSE** - Format for voice output

## Verification Gate

Every response passes through a verification step before reaching voice output:

- Checks that all citations appear in retrieved sources
- Validates logical consistency
- Flags under-supported claims
- Returns `safe_to_deliver: false` if response is flagged
- Falls back to guardrail message: "I cannot provide a confident answer..."

## Demo Case: ABC Technologies vs XYZ Solutions

**Case Type:** Contract dispute

**Documents:**
1. Contract.pdf - Original agreement with Clauses 7 and 9
2. Email_Evidence.pdf - Termination notice dated 15th March
3. Payment_Record.pdf - Payment history
4. Legal_Notice.pdf - Counsel's legal notice

**Legal Sources:**
- Indian Contract Act, 1872 (Sections 31, 55, 62, 73, 138)

**Demo Questions:**
1. "Counsel, the opposing side claims that your client breached the agreement. Why should the court reject that argument?"
2. "But counsel, doesn't Clause 9 permit immediate termination?"

## Development Notes

- All LLM calls use verbatim prompts from `ai/prompts.py`
- Verification is mandatory - no exceptions
- Low-confidence responses trigger guardrail messaging
- Qdrant collections: `legal_knowledge`, `case_knowledge`
- Embeddings: 768-dimensional vectors (InLegalBERT or multilingual-e5-large)

## Troubleshooting

### Qdrant Connection Error
```
qdrant_client.http_exceptions.UnexpectedResponse: 502 Bad Gateway
```
Check that Qdrant is running and accessible at `QDRANT_URL`.

### Hugging Face Model Loading
```
OSError: Can't load model
```
Ensure `HUGGINGFACE_API_KEY` is valid and model is available.

### Rime API Error
```
401 Unauthorized
```
Check that `RIME_API_KEY` is correct and has appropriate permissions.

## Production Deployment

For production:
1. Use environment variables instead of config.py
2. Enable CORS only for trusted origins
3. Add rate limiting
4. Implement request logging and monitoring
5. Use async database connections
6. Cache embeddings for frequently accessed documents
7. Implement circuit breaker for external APIs
