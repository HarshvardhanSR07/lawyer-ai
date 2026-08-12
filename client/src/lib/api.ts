/**
 * API Client for LawyerAI Backend
 *
 * Handles all communication with FastAPI backend:
 * - Speech-to-text
 * - Reasoning (with verification gate)
 * - Text-to-speech
 * - Case metadata
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export interface ReasoningRequest {
  question: string;
  case_context?: any[];
  legal_context?: any[];
  conversation_history?: any[];
  case_id?: string;
}

export interface ReasoningResponse {
  response: string;
  legal_sources: Array<{
    source: string;
    section: string;
    document_name: string;
    page_number: number;
    text: string;
    relevance_score: number;
  }>;
  evidence: Array<{
    document_name: string;
    page_number: number;
    clause: string;
    text: string;
    relevance_score: number;
  }>;
  counterargument: string;
  reasoning_summary: string;
  confidence: "high" | "medium" | "low";
  verification_status: "approved" | "flagged";
}

export interface CaseMetadata {
  case_id: string;
  case_name: string;
  status: string;
  evidence_count: number;
  legal_source_count: number;
}

export class LawyerAIAPI {
  /**
   * Speech-to-text: Convert audio to transcript
   */
  static async transcribeAudio(audioBase64: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/stt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_bytes: audioBase64,
        is_final: true,
      }),
    });

    if (!response.ok) throw new Error("STT failed");
    const data = await response.json();
    return data.transcript;
  }

  /**
   * Reasoning: Get AI response with verification gate
   *
   * CRITICAL: This endpoint enforces verification before returning.
   * If verification fails, response is replaced with guardrail message.
   */
  static async reason(request: ReasoningRequest): Promise<ReasoningResponse> {
    const response = await fetch(`${API_BASE_URL}/api/reason`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error("Reasoning failed");
    return response.json();
  }

  /**
   * Text-to-speech: Convert response to audio
   */
  static async synthesizeSpeech(text: string, voiceId?: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice_id: voiceId || "professional-lawyer",
      }),
    });

    if (!response.ok) throw new Error("TTS failed");
    return response.blob();
  }

  /**
   * Get case metadata
   */
  static async getCaseMetadata(caseId: string): Promise<CaseMetadata> {
    const response = await fetch(`${API_BASE_URL}/api/case/${caseId}`);
    if (!response.ok) throw new Error("Case metadata fetch failed");
    return response.json();
  }

  /**
   * Get demo case
   */
  static async getDemoCase(): Promise<CaseMetadata> {
    const response = await fetch(`${API_BASE_URL}/api/demo/case`);
    if (!response.ok) throw new Error("Demo case fetch failed");
    return response.json();
  }

  /**
   * Run demo question through full pipeline
   */
  static async runDemoQuestion(question: string): Promise<ReasoningResponse> {
    return this.reason({
      question,
      case_id: "CASE001",
    });
  }
}
