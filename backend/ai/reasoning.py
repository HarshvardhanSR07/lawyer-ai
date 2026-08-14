"""
Reasoning Engine Module

Implements the core reasoning loop:
UNDERSTAND -> IDENTIFY LEGAL ISSUE -> ANALYZE OPPONENT ARGUMENT -> 
RETRIEVE SUPPORTING LAW/EVIDENCE -> COMPARE ARGUMENT WITH EVIDENCE -> 
FIND WEAKNESS/CONTRADICTION -> FORMULATE COUNTERARGUMENT -> 
VERIFY -> GENERATE COURTROOM RESPONSE

All LLM calls use verbatim prompts from the spec with mandatory verification gate.
"""

import os
import logging
import json
from typing import List, Dict, Optional
import httpx
from . import prompts

logger = logging.getLogger(__name__)

class ReasoningEngine:
    def __init__(self):
        """Initialize the configured remote legal-reasoning provider."""
        self.hf_api_key = os.getenv("HUGGINGFACE_API_KEY", "")
        self.reasoning_provider = os.getenv("REASONING_PROVIDER", "huggingface_router").lower()
        default_model = (
            "openai/gpt-oss-120b:fastest"
            if self.reasoning_provider == "huggingface_router"
            else "mistralai/Mistral-7B-Instruct-v0.3"
        )
        self.hf_model = os.getenv("REASONING_MODEL", default_model)
        self.hf_api_url = "https://api-inference.huggingface.co/models"
        self.hf_router_api_base = os.getenv("HF_ROUTER_API_BASE", "https://router.huggingface.co/v1").rstrip("/")
        self.http_client: httpx.AsyncClient | None = None
        
        logger.info(
            "Reasoning engine initialized with provider=%s model=%s",
            self.reasoning_provider,
            self.hf_model,
        )

    async def initialize(self):
        """Open the reusable LLM HTTP client once during app startup."""
        self.http_client = httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=10.0))

    async def close(self):
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None
    
    async def _call_llm(self, prompt: str, system_prompt: str = "") -> str:
        """
        Call the configured Hugging Face LLM with the supplied legal prompt.
        
        Returns: Generated text response
        """
        try:
            if not self.http_client:
                raise RuntimeError("Reasoning client is not initialized")
            if not self.hf_api_key:
                raise RuntimeError("HUGGINGFACE_API_KEY must be configured for legal reasoning")
            headers = {"Authorization": f"Bearer {self.hf_api_key}"}

            if self.reasoning_provider == "huggingface_router":
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                response = await self.http_client.post(
                    f"{self.hf_router_api_base}/chat/completions",
                    json={
                        "model": self.hf_model,
                        "messages": messages,
                        "max_tokens": 1024,
                        "temperature": 0.7,
                        "top_p": 0.95,
                    },
                    headers=headers,
                )
                response.raise_for_status()
                result = response.json()
                choices = result.get("choices", [])
                content = choices[0].get("message", {}).get("content", "") if choices else ""
                if not isinstance(content, str) or not content.strip():
                    raise RuntimeError("Hugging Face router returned no legal-reasoning content")
                return content

            if self.reasoning_provider == "huggingface_inference":
                full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
                response = await self.http_client.post(
                    f"{self.hf_api_url}/{self.hf_model}",
                    json={
                        "inputs": full_prompt,
                        "parameters": {
                            "max_new_tokens": 1024,
                            "temperature": 0.7,
                            "top_p": 0.95,
                        },
                    },
                    headers=headers,
                )
                response.raise_for_status()
                result = response.json()
                if isinstance(result, list):
                    return result[0].get("generated_text", "")
                return result.get("generated_text", "")

            raise RuntimeError(f"Unsupported REASONING_PROVIDER: {self.reasoning_provider}")
        
        except Exception as e:
            logger.error("LLM call error: %s", e)
            raise
    
    async def reason(
        self,
        question: str,
        legal_sources: List[Dict],
        evidence_sources: List[Dict],
        conversation_history: List[Dict] = [],
        case_id: Optional[str] = None,
        client_name: str = "Client",
        case_type: str = "Contract dispute"
    ) -> Dict:
        """
        Core reasoning function: RETRIEVE FIRST, REASON SECOND.
        
        Implements the full reasoning order:
        UNDERSTAND -> IDENTIFY -> ANALYZE -> RETRIEVE -> COMPARE -> 
        FIND WEAKNESS -> FORMULATE -> VERIFY -> RESPOND
        
        Returns: {response, counterargument, reasoning_summary, confidence}
        """
        try:
            logger.info(f"Reasoning over question: {question[:50]}...")
            
            # Build context strings
            legal_context_str = self._format_legal_sources(legal_sources)
            evidence_context_str = self._format_evidence_sources(evidence_sources)
            conversation_str = self._format_conversation_history(conversation_history)
            
            # Use verbatim prompts from spec
            global_system_prompt = prompts.format_global_system_prompt(client_name, case_type)
            
            reasoning_prompt = prompts.format_reasoning_prompt(
                global_system_prompt=global_system_prompt,
                speaker_role="opposing counsel",
                core_issue=question,
                transcript=question,
                retrieved_chunks_with_citations=legal_context_str + "\n\n" + evidence_context_str,
                case_summary="ABC Technologies vs XYZ Solutions - Contract dispute",
                conversation_history=conversation_str
            )
            
            # Call LLM for reasoning
            reasoning_response = await self._call_llm(reasoning_prompt, "")
            
            # Parse response
            parsed = self._parse_reasoning_response(reasoning_response)
            
            logger.info(f"Reasoning complete. Confidence: {parsed['confidence']}")
            
            return {
                "response": parsed["response"],
                "counterargument": parsed.get("counter", ""),
                "reasoning_summary": parsed.get("reasoning_summary", ""),
                "confidence": parsed.get("confidence", "medium"),
                "flags": parsed.get("flags", []),
            }
        
        except Exception as e:
            logger.error(f"Reasoning error: {e}")
            raise
    
    async def verify(
        self,
        response: str,
        legal_sources: List[Dict],
        evidence_sources: List[Dict]
    ) -> Dict:
        """
        Verification prompt: mandatory second pass before voice output.
        
        CRITICAL: This is a fail-closed gate. If verification fails or errors occur,
        the response is BLOCKED from voice output. No response bypasses this.
        
        Returns: {verdict, unsupported_claims, citation_mismatches, logical_issues, safe_to_deliver}
        """
        try:
            logger.info("Verifying response...")

            authoritative_legal_sources = [
                source for source in legal_sources
                if source.get("authority_level", "primary") != "illustrative_dataset"
            ]
            if not authoritative_legal_sources:
                logger.warning("Verification blocked: no authoritative legal source was retrieved")
                return {
                    "verdict": "flagged",
                    "unsupported_claims": ["No authoritative legal source supports the drafted legal conclusion"],
                    "citation_mismatches": [],
                    "logical_issues": [
                        "Illustrative dataset material cannot be used as statute, reported case law, or legal authority"
                    ],
                    "safe_to_deliver": False,
                }
            
            legal_context_str = self._format_legal_sources(legal_sources)
            evidence_context_str = self._format_evidence_sources(evidence_sources)
            
            # Use verbatim verification prompt from spec
            verification_prompt = prompts.format_verification_prompt(
                draft_response=response,
                retrieved_chunks_with_citations=legal_context_str + "\n\n" + evidence_context_str
            )
            
            # Call LLM for verification
            verification_response = await self._call_llm(verification_prompt, "")
            
            # Parse JSON response
            try:
                result = json.loads(verification_response)
                logger.info(f"Verification result: {result['verdict']}")
                return result
            except json.JSONDecodeError:
                logger.warning("Could not parse verification response as JSON, defaulting to FLAGGED (fail-closed)")
                # FAIL-CLOSED: Default to flagged on parse error
                return {
                    "verdict": "flagged",
                    "unsupported_claims": ["Unable to verify response structure"],
                    "citation_mismatches": [],
                    "logical_issues": ["Verification response malformed"],
                    "safe_to_deliver": False  # CRITICAL: Block unverifiable responses
                }
        
        except Exception as e:
            logger.error(f"Verification error: {e}")
            # FAIL-CLOSED: Block response on any verification error
            return {
                "verdict": "flagged",
                "unsupported_claims": [],
                "citation_mismatches": [],
                "logical_issues": [f"Verification failed: {str(e)}"],
                "safe_to_deliver": False  # CRITICAL: Block on verification failure
            }
    
    def _format_legal_sources(self, sources: List[Dict]) -> str:
        """Format legal sources for prompt context"""
        if not sources:
            return "No legal sources retrieved."
        
        formatted = []
        for src in sources:
            authority_note = ""
            if src.get("authority_level") == "illustrative_dataset":
                authority_note = "\n  Status: NON-AUTHORITATIVE ILLUSTRATIVE DATASET EXAMPLE"
            formatted.append(
                f"- {src.get('source', '')} {src.get('section', '')}\n"
                f"  Document: {src.get('document_name', '')}, Page {src.get('page_number', '')}\n"
                f"  Text: {src.get('text', '')[:200]}...{authority_note}\n"
            )
        return "\n".join(formatted)
    
    def _format_evidence_sources(self, sources: List[Dict]) -> str:
        """Format evidence sources for prompt context"""
        if not sources:
            return "No case evidence retrieved."
        
        formatted = []
        for src in sources:
            formatted.append(
                f"- {src.get('document_name', '')}, Page {src.get('page_number', '')}\n"
                f"  Clause: {src.get('clause', '')}\n"
                f"  Text: {src.get('text', '')[:200]}...\n"
            )
        return "\n".join(formatted)
    
    def _format_conversation_history(self, history: List[Dict]) -> str:
        """Format conversation history for prompt context"""
        if not history:
            return "No prior conversation."
        
        formatted = []
        for msg in history:
            speaker = msg.get("speaker", "Unknown")
            text = msg.get("text", "")
            formatted.append(f"{speaker}: {text}")
        return "\n".join(formatted)
    
    def _parse_reasoning_response(self, response: str) -> Dict:
        """Parse structured reasoning response from LLM"""
        # Simple parsing - in production, use more robust parsing
        result = {
            "response": response,
            "counter": "",
            "reasoning_summary": "",
            "confidence": "medium",
            "flags": [],
        }
        
        # Extract confidence level
        if "high" in response.lower():
            result["confidence"] = "high"
        elif "low" in response.lower():
            result["confidence"] = "low"
        
        return result
