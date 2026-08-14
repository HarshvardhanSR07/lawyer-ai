"""
LawyerAI FastAPI Backend Service

Handles:
- RAG (Qdrant retrieval)
- Reasoning (Hugging Face LLM)
- Verification (citation accuracy gate)
- Voice I/O (Hugging Face Whisper STT and Rime TTS)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
from typing import Optional, List
import base64
from pydantic import BaseModel
import logging
import httpx
import asyncio

# Import modules
from ai.reasoning import ReasoningEngine
from rag.retrieval import RAGRetriever
from voice.rime import RimeVoice
from voice.whisper import WhisperTranscriber
from documents.parser import DocumentParser
from data.demo_loader import load_demo_data, get_demo_case_metadata
from data.indian_lawyer_dataset import IndianLawyerDatasetIngestor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

rag_retriever: Optional[RAGRetriever] = None
reasoning_engine: Optional[ReasoningEngine] = None
rime_voice: Optional[RimeVoice] = None
whisper_transcriber: Optional[WhisperTranscriber] = None
doc_parser: Optional[DocumentParser] = None
indian_lawyer_dataset: Optional[IndianLawyerDatasetIngestor] = None


async def _initialize_optional_whisper(app: FastAPI, candidate: WhisperTranscriber) -> Optional[WhisperTranscriber]:
    """Initialize microphone transcription without making typed legal assistance unavailable."""
    try:
        await candidate.initialize()
    except Exception as exc:
        logger.warning("Whisper unavailable; microphone transcription is disabled while typed assistance remains available: %s", exc)
        await candidate.close()
        app.state.whisper_status = "unavailable"
        app.state.whisper_startup_error = "Microphone transcription is temporarily unavailable. You can continue with typed questions."
        return None

    app.state.whisper_status = "ready"
    app.state.whisper_startup_error = None
    return candidate


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eagerly initialize all reusable backend resources once per Reserved instance."""
    global rag_retriever, reasoning_engine, rime_voice, whisper_transcriber, doc_parser, indian_lawyer_dataset
    beyond_client = None
    knowledge_bootstrap_task: Optional[asyncio.Task] = None
    logger.info("Starting persistent LawyerAI backend resources")
    try:
        rag_retriever = RAGRetriever()
        reasoning_engine = ReasoningEngine()
        rime_voice = RimeVoice()
        whisper_candidate = WhisperTranscriber()
        doc_parser = DocumentParser()
        indian_lawyer_dataset = IndianLawyerDatasetIngestor(rag_retriever)
        beyond_client = httpx.AsyncClient(
            base_url=os.getenv("BEY_API_BASE_URL", "https://api.bey.dev"),
            headers={"x-api-key": os.getenv("BEY_API_KEY", os.getenv("BEYOND_PRESENCE_API_KEY", ""))},
            timeout=httpx.Timeout(30.0, connect=10.0),
        )

        await rag_retriever.initialize()
        await reasoning_engine.initialize()
        await rime_voice.initialize()
        whisper_transcriber = await _initialize_optional_whisper(app, whisper_candidate)
        await indian_lawyer_dataset.initialize()

        app.state.beyond_client = beyond_client
        app.state.ready = True
        app.state.indian_lawyer_dataset = indian_lawyer_dataset
        knowledge_bootstrap_task = asyncio.create_task(_bootstrap_knowledge(rag_retriever, indian_lawyer_dataset))
        app.state.indian_lawyer_dataset_task = knowledge_bootstrap_task
        knowledge_bootstrap_task.add_done_callback(_log_dataset_index_result)
        logger.info("Knowledge indexing is deferred until after the public service becomes ready")
        logger.info("Persistent LawyerAI backend is ready")
        yield
    except Exception:
        logger.exception("Persistent backend startup failed")
        raise
    finally:
        app.state.ready = False
        active_dataset_task = getattr(app.state, "indian_lawyer_dataset_task", knowledge_bootstrap_task)
        if active_dataset_task and not active_dataset_task.done():
            active_dataset_task.cancel()
            try:
                await active_dataset_task
            except asyncio.CancelledError:
                pass
        if indian_lawyer_dataset:
            await indian_lawyer_dataset.close()
        if beyond_client:
            await beyond_client.aclose()
        if rime_voice:
            await rime_voice.close()
        if whisper_transcriber:
            await whisper_transcriber.close()
        if reasoning_engine:
            await reasoning_engine.close()
        if rag_retriever:
            await rag_retriever.close()
        logger.info("Persistent LawyerAI backend stopped cleanly")


app = FastAPI(title="LawyerAI Backend", version="2.0.0", lifespan=lifespan)


def _log_dataset_index_result(task: asyncio.Task) -> None:
    """Surface background indexing failures instead of allowing them to be silently discarded."""
    if task.cancelled():
        logger.info("Indian Lawyer dataset indexing was cancelled during shutdown")
        return
    try:
        task.result()
    except Exception:
        logger.exception("Indian Lawyer dataset indexing task failed")


async def _bootstrap_knowledge(retriever: RAGRetriever, ingestor: IndianLawyerDatasetIngestor) -> None:
    """Index seed knowledge after readiness so transient provider quotas cannot block port binding."""
    delay = max(0.0, float(os.getenv("RAG_STARTUP_INDEX_DELAY_SECONDS", "60")))
    if delay:
        logger.info("Deferring initial knowledge indexing for %.0f seconds", delay)
        await asyncio.sleep(delay)

    success = await load_demo_data(retriever)
    if not success:
        logger.warning("Demo data was not loaded; continuing with the persistent service")

    auto_index_dataset = os.getenv("INDIAN_LAWYER_DATASET_AUTO_INDEX", "true").lower() in {"1", "true", "yes"}
    if auto_index_dataset:
        await ingestor.index_all()
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class STTRequest(BaseModel):
    """Speech-to-text request (audio window)"""
    audio_base64: str
    mime_type: str = "audio/webm"
    is_final: bool = False

class STTResponse(BaseModel):
    """Speech-to-text response"""
    transcript: str
    is_final: bool
    confidence: float

class ReasoningRequest(BaseModel):
    """Reasoning engine request"""
    question: str
    case_context: List[dict] = []
    legal_context: List[dict] = []
    conversation_history: List[dict] = []
    case_id: Optional[str] = None

class ReasoningResponse(BaseModel):
    """Reasoning engine response"""
    response: str
    legal_sources: List[dict] = []
    evidence: List[dict] = []
    counterargument: str = ""
    reasoning_summary: str = ""
    confidence: str  # "high", "medium", "low"
    verification_status: str  # "approved", "flagged"

class TTSRequest(BaseModel):
    """Text-to-speech request"""
    text: str
    voice_id: Optional[str] = None

class CaseMetadataResponse(BaseModel):
    """Case metadata response"""
    case_id: str
    case_name: str
    status: str
    evidence_count: int
    legal_source_count: int

class DocumentUploadResponse(BaseModel):
    """Document upload response"""
    document_id: str
    document_name: str
    chunks_indexed: int

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Return 200 only after persistent dependencies are ready for live legal sessions."""
    if not getattr(app.state, "ready", False) or not rag_retriever or not rime_voice:
        raise HTTPException(status_code=503, detail="Backend resources are not ready")
    try:
        rag_retriever.client.get_collections()
    except Exception as exc:
        logger.warning("Health check detected unavailable Qdrant: %s", exc)
        raise HTTPException(status_code=503, detail="Qdrant is unavailable") from exc
    if not rag_retriever.embeddings.ready or not rime_voice.http_client:
        raise HTTPException(status_code=503, detail="An eager backend resource is unavailable")
    return {
        "status": "ok",
        "service": "LawyerAI Backend",
        "version": "2.0.0",
        "mode": "reserved-persistent",
        "dependencies": {
            "qdrant": "ready",
            "embeddings": "ready",
            "rime_client": "ready",
            "whisper_client": getattr(app.state, "whisper_status", "unavailable"),
            "beyond_client": "ready" if getattr(app.state, "beyond_client", None) else "unavailable",
            "indian_lawyer_dataset": indian_lawyer_dataset.snapshot() if indian_lawyer_dataset else {"status": "unavailable"},
        },
    }


@app.get("/api/internal/datasets/indian-lawyer/status")
async def indian_lawyer_dataset_status():
    """Return the provenance-preserving dataset ingestion state for internal operations."""
    if not getattr(app.state, "ready", False) or not indian_lawyer_dataset:
        raise HTTPException(status_code=503, detail="Dataset ingestor is not ready")
    return indian_lawyer_dataset.snapshot()


@app.post("/api/internal/datasets/indian-lawyer/index")
async def start_indian_lawyer_dataset_index():
    """Start or report the idempotent full public dataset import on the persistent worker."""
    if not getattr(app.state, "ready", False) or not indian_lawyer_dataset:
        raise HTTPException(status_code=503, detail="Dataset ingestor is not ready")
    running_task = getattr(app.state, "indian_lawyer_dataset_task", None)
    if running_task and not running_task.done():
        return indian_lawyer_dataset.snapshot()
    app.state.indian_lawyer_dataset_task = asyncio.create_task(indian_lawyer_dataset.index_all())
    app.state.indian_lawyer_dataset_task.add_done_callback(_log_dataset_index_result)
    return indian_lawyer_dataset.snapshot()

# ============================================================================
# SPEECH-TO-TEXT ENDPOINT
# ============================================================================

@app.post("/api/stt", response_model=STTResponse)
async def speech_to_text(request: STTRequest):
    """
    Transcribe a bounded browser audio window with Hugging Face Whisper.
    Rime remains exclusively responsible for text-to-speech.
    """
    try:
        if not whisper_transcriber:
            raise HTTPException(
                status_code=503,
                detail=getattr(app.state, "whisper_startup_error", "Whisper transcription is not ready"),
            )
        audio_bytes = base64.b64decode(request.audio_base64, validate=True)
        result = await whisper_transcriber.transcribe(audio_bytes, request.mime_type)
        return STTResponse(
            transcript=result["text"],
            is_final=request.is_final,
            confidence=result.get("confidence", 0.9)
        )
    except (ValueError, base64.binascii.Error) as e:
        raise HTTPException(status_code=400, detail=f"Invalid audio transcription request: {e}")
    except httpx.HTTPStatusError as e:
        logger.error("Whisper request failed: %s", e.response.status_code)
        raise HTTPException(status_code=502, detail="Whisper transcription provider is unavailable")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# REASONING ENDPOINT (CORE LOOP)
# ============================================================================

@app.post("/api/reason", response_model=ReasoningResponse)
async def reason_over_context(request: ReasoningRequest):
    """
    Core reasoning endpoint: RETRIEVE FIRST, REASON SECOND, VERIFY ALWAYS.
    
    1. Retrieve legal sources and case evidence
    2. Reason over retrieved context
    3. Verify response before returning (MANDATORY GATE)
    4. Return structured response with citations
    
    If verification fails, response is blocked and guardrail message is returned instead.
    """
    try:
        # Step 1: Retrieve legal sources and case evidence
        logger.info(f"Retrieving context for question: {request.question}")
        question_vector = await rag_retriever.embeddings.embed_text(request.question)
        legal_sources, evidence_sources = await asyncio.gather(
            rag_retriever.search_legal(request.question, question_vector=question_vector),
            rag_retriever.search_case(request.question, case_id=request.case_id, question_vector=question_vector),
        )
        
        # Step 2: Reason over retrieved context
        logger.info("Reasoning over retrieved context")
        reasoning_result = await reasoning_engine.reason(
            question=request.question,
            legal_sources=legal_sources,
            evidence_sources=evidence_sources,
            conversation_history=request.conversation_history,
            case_id=request.case_id
        )
        
        # Step 3: Verify response (MANDATORY GATE - fail-closed)
        logger.info("Verifying response")
        verification_result = await reasoning_engine.verify(
            response=reasoning_result["response"],
            legal_sources=legal_sources,
            evidence_sources=evidence_sources
        )
        
        # CRITICAL: Check verification result
        if not verification_result.get("safe_to_deliver", False):
            logger.warning(f"Response BLOCKED by verification: {verification_result}")
            # Return guardrail message instead of unverified response
            reasoning_result["response"] = (
                "I cannot provide a confident answer based on the available case evidence "
                "and legal sources. I recommend consulting with a qualified lawyer for this matter."
            )
            verification_status = "flagged"
        else:
            logger.info("Response passed verification")
            verification_status = "approved"
        
        return ReasoningResponse(
            response=reasoning_result["response"],
            legal_sources=legal_sources,
            evidence=evidence_sources,
            counterargument=reasoning_result.get("counterargument", ""),
            reasoning_summary=reasoning_result.get("reasoning_summary", ""),
            confidence=reasoning_result.get("confidence", "medium"),
            verification_status=verification_status
        )
    except Exception as e:
        logger.error(f"Reasoning error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# TEXT-TO-SPEECH ENDPOINT
# ============================================================================

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Rime.
    
    Request: text (str), voice_id (optional)
    Response: audio stream (PCM or buffered WAV)
    """
    try:
        logger.info(f"Generating speech for: {request.text[:50]}...")
        audio_stream = await rime_voice.synthesize_speech(
            text=request.text,
            voice_id=request.voice_id
        )
        return StreamingResponse(
            audio_stream,
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=response.wav"}
        )
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CASE MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/case/{case_id}", response_model=CaseMetadataResponse)
async def get_case_metadata(case_id: str):
    """
    Get case metadata: name, status, evidence count, legal source count.
    """
    try:
        metadata = await rag_retriever.get_case_metadata(case_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="Case not found")
        return CaseMetadataResponse(**metadata)
    except Exception as e:
        logger.error(f"Get case error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/case/{case_id}/documents", response_model=DocumentUploadResponse)
async def upload_case_document(case_id: str, file: UploadFile = File(...)):
    """
    Upload and index a case document (PDF).
    
    1. Parse PDF
    2. Chunk by logical units
    3. Embed chunks
    4. Index into Qdrant case_knowledge collection
    """
    try:
        logger.info(f"Uploading document for case {case_id}: {file.filename}")
        
        # Node normalizes DOCX into text before it reaches this private RAG endpoint.
        chunks = await doc_parser.parse_upload(file)
        if not chunks:
            raise HTTPException(status_code=422, detail="No readable legal text could be extracted from the uploaded document")
        
        # Index into Qdrant
        indexed_count = await rag_retriever.index_case_documents(
            case_id=case_id,
            document_name=file.filename,
            chunks=chunks
        )
        
        return DocumentUploadResponse(
            document_id=f"{case_id}_{file.filename}",
            document_name=file.filename,
            chunks_indexed=indexed_count
        )
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# DEMO ENDPOINTS
# ============================================================================

@app.get("/api/demo/case")
async def get_demo_case():
    """Get demo case (ABC Technologies vs XYZ Solutions)"""
    try:
        metadata = await get_demo_case_metadata()
        return metadata
    except Exception as e:
        logger.error(f"Get demo case error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/demo/run-question")
async def run_demo_question(request: ReasoningRequest):
    """
    Run demo question through the full reasoning pipeline.
    Used by the "RUN DEMO QUESTION" button fallback.
    """
    try:
        # Use demo case ID
        request.case_id = "CASE001"
        
        # Run through normal reasoning pipeline
        result = await reason_over_context(request)
        return result
    except Exception as e:
        logger.error(f"Demo question error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", os.getenv("FASTAPI_PORT", 8000)))
    uvicorn.run(app, host="0.0.0.0", port=port)
