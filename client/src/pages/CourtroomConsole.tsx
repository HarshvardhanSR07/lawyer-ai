import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/_core/hooks/useAuth";
import { nanoid } from "nanoid";
import DialogueAvatar from "@/components/Avatar/DialogueAvatar";
import SystemStatusPipeline from "@/components/SystemStatusPipeline";
import TranscriptPanel from "@/components/TranscriptPanel";
import CaseIntelligencePanel from "@/components/CaseIntelligencePanel";
import CitationsPanel from "@/components/CitationsPanel";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { LawyerAIAPI, ReasoningResponse } from "@/lib/api";

type Phase = "LISTENING" | "ANALYZING" | "SEARCHING_LEGAL" | "SEARCHING_EVIDENCE" | "REASONING" | "VERIFYING" | "RESPONDING" | "IDLE";
type MouthShape = "closed" | "slightly-open" | "open-mid" | "open-wide";

interface Message {
  speaker: "user" | "lawyerai";
  text: string;
  timestamp: number;
  legalSources?: any[];
  evidenceSources?: any[];
  confidence?: string;
  verificationStatus?: "approved" | "flagged";
}

export default function CourtroomConsole() {
  const { isAuthenticated } = useAuth();
  const [sessionId] = useState<string>(nanoid());
  const [caseId] = useState<string>("CASE001");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPhase, setCurrentPhase] = useState<Phase>("IDLE");
  const [caseData, setCaseData] = useState<any>(null);
  const [mouthShape, setMouthShape] = useState<MouthShape>("closed");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice input hook
  const { isListening: isRecording, startListening } = useVoiceInput({
    onTranscript: (audioBase64) => handleAudioCapture(audioBase64),
  });

  // Audio playback hook
  const { isPlaying, playAudio } = useAudioPlayback({
    onMouthShape: setMouthShape,
  });

  // Load demo case on mount
  useEffect(() => {
    const loadDemoCase = async () => {
      try {
        const caseMetadata = await LawyerAIAPI.getDemoCase();
        setCaseData(caseMetadata);
      } catch (error) {
        console.error("Failed to load demo case:", error);
      }
    };
    loadDemoCase();
  }, []);

  // Handle audio capture from microphone
  const handleAudioCapture = async (audioBase64: string) => {
    try {
      setCurrentPhase("ANALYZING");

      // Transcribe audio
      const transcribedText = await LawyerAIAPI.transcribeAudio(audioBase64);

      // Add user message to transcript
      const userMessage: Message = {
        speaker: "user",
        text: transcribedText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Call reasoning endpoint
      await callReasoning(transcribedText);
    } catch (error) {
      console.error("Audio capture error:", error);
      setErrorMessage("Microphone error. Please check permissions and try again.");
      setCurrentPhase("IDLE");
    }
  };

  // Call reasoning endpoint
  const callReasoning = async (question: string) => {
    try {
      setCurrentPhase("SEARCHING_LEGAL");
      await new Promise((resolve) => setTimeout(resolve, 300));

      setCurrentPhase("SEARCHING_EVIDENCE");
      await new Promise((resolve) => setTimeout(resolve, 300));

      setCurrentPhase("REASONING");

      // Call backend reasoning endpoint
      const response: ReasoningResponse = await LawyerAIAPI.reason({
        question,
        case_id: caseId,
      });

      setCurrentPhase("VERIFYING");
      await new Promise((resolve) => setTimeout(resolve, 200));

      setCurrentPhase("RESPONDING");

      // Add AI response to transcript
      const aiMessage: Message = {
        speaker: "lawyerai",
        text: response.response,
        timestamp: Date.now(),
        legalSources: response.legal_sources,
        evidenceSources: response.evidence,
        confidence: response.confidence,
        verificationStatus: response.verification_status,
      };
      setMessages((prev) => [...prev, aiMessage]);

      // VERIFICATION GATE: Only synthesize if response passed verification
      if (response.verification_status === "flagged") {
        console.warn("Response blocked by verification gate");
        // Response already replaced with guardrail message by backend
        // Still play it as audio
      }

      // Synthesize speech
      try {
        const audioBlob = await LawyerAIAPI.synthesizeSpeech(response.response);
        await playAudio(audioBlob);
      } catch (ttsError) {
        console.error("TTS error:", ttsError);
      }

      setCurrentPhase("IDLE");
    } catch (error) {
      console.error("Reasoning error:", error);
      setErrorMessage("Backend error. Please try again.");
      setCurrentPhase("IDLE");
    }
  };

  // Run demo question
  const runDemoQuestion = async () => {
    const demoQuestion =
      "Counsel, the opposing side claims that your client breached the agreement. Why should the court reject that argument?";

    const userMessage: Message = {
      speaker: "user",
      text: demoQuestion,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    await callReasoning(demoQuestion);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">LAWYERAI</h1>
          <p className="text-gray-400 mb-6">Sign in to access the courtroom console</p>
          <Button className="w-full">Sign In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif">LAWYERAI / AI COURTROOM ADVOCATE</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Case: {caseData?.case_name}</p>
          <p className="text-xs text-gray-500">Session: {sessionId.slice(0, 8)}</p>
        </div>
      </div>

      {/* System Status Pipeline */}
      <SystemStatusPipeline currentPhase={currentPhase} />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
        {/* Left Panel: Avatar */}
        <div className="lg:col-span-3">
          <Card className="p-6 bg-slate-800 border-slate-700 flex flex-col items-center justify-center">
            <DialogueAvatar phase={currentPhase} mouthShape={isPlaying ? mouthShape : "closed"} isPlaying={isPlaying} />
          </Card>
        </div>

        {/* Center Panel: Transcript */}
        <div className="lg:col-span-6">
          <TranscriptPanel messages={messages} />
        </div>

        {/* Right Panel: Case Intelligence */}
        <div className="lg:col-span-3">
          <CaseIntelligencePanel caseData={caseData} />
        </div>
      </div>

      {/* Bottom Panel: Citations */}
      <div className="mt-6">
        <CitationsPanel messages={messages} />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100">
          <p className="text-sm">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 flex gap-4 justify-center">
        <Button
          onClick={startListening}
          disabled={isRecording || currentPhase !== "IDLE" || isPlaying}
          className="px-6"
        >
          {isRecording ? <Spinner className="mr-2" /> : null}
          {isRecording ? "Listening..." : "Start Speaking"}
        </Button>
        <Button
          onClick={runDemoQuestion}
          variant="outline"
          disabled={currentPhase !== "IDLE" || isPlaying}
          className="px-6"
        >
          RUN DEMO QUESTION
        </Button>
      </div>
    </div>
  );
}
