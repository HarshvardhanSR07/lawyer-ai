import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { ConversationMessage, type ConversationMessageData } from "@/components/ConversationMessage";
import { LiveAvatarStage, type LiveAvatarState } from "@/components/LiveAvatarStage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { verifiedResponsePlaybackAvatarState } from "@/lib/avatarResponseState";
import { shouldShowRenderOnlyAvatarVideo } from "@/lib/avatarVideoVisibility";
import { citationLabels } from "@/lib/citationLabels";
import { shouldStartQueuedWhisperListening } from "@/lib/handsFreeWhisper";
import { canReconnectLiveAvatar, startBoundedLiveAvatarCall, startupFailureRecovery } from "@/lib/liveAvatarRecovery";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { LocalAudioTrack, Room, RoomEvent, Track } from "livekit-client";
import { FileText, Loader2, LogOut, Mic, MonitorUp, Paperclip, PhoneOff, Send, ShieldCheck, Square } from "lucide-react";
import { nanoid } from "nanoid";

type ChatMessage = ConversationMessageData;

type UploadedDocument = {
  id: string;
  name: string;
  size: number;
  knowledgeFileId: string;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected document could not be read."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("The selected document could not be read."));
      resolve(result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function base64ToBlob(base64: string, contentType: string) {
  const decoded = window.atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return new Blob([bytes], { type: contentType });
}

export default function LawyerAssistant() {
  const { isAuthenticated, logout } = useAuth();
  const { mutateAsync: startLiveCall, isPending: isStartingCall } = trpc.avatar.startLiveCall.useMutation();
  const { mutateAsync: endLiveCall } = trpc.avatar.endLiveCall.useMutation();
  const { mutateAsync: uploadDocument, isPending: isIndexingDocument } = trpc.assistant.uploadDocument.useMutation();
  const { mutateAsync: requestLegalResponse, isPending: isResponding } = trpc.assistant.respond.useMutation();
  const { mutateAsync: transcribeWhisper, isPending: isTranscribing } = trpc.assistant.transcribe.useMutation();
  const { mutate: saveTranscript } = trpc.assistant.saveTranscript.useMutation();
  const videoHostRef = useRef<HTMLDivElement>(null);
  const audioHostRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const rendererVideoRef = useRef(false);
  const responseAudioRef = useRef<HTMLAudioElement | null>(null);
  const responseAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const responseAudioUrlRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const [avatarState, setAvatarState] = useState<LiveAvatarState>("offline");
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isEnding, setIsEnding] = useState(false);
  const [hasRendererVideo, setHasRendererVideo] = useState(false);
  const [rendererUnavailable, setRendererUnavailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoListenNextRef = useRef(false);

  const appendMessage = useCallback((
    speaker: ChatMessage["speaker"],
    text: string,
    citations?: string[],
    verification?: Pick<ChatMessage, "confidence" | "verificationStatus">
  ) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setMessages(current => {
      const last = current.at(-1);
      if (last?.speaker === speaker && last.text === cleanText) return current;
      return [...current, { id: nanoid(), speaker, text: cleanText, citations, createdAt: Date.now(), ...verification }];
    });
  }, []);

  const clearMediaElements = useCallback(() => {
    videoHostRef.current?.replaceChildren();
    audioHostRef.current?.replaceChildren();
  }, []);

  const stopPublishedResponseAudio = useCallback(async () => {
    const room = roomRef.current;
    const publishedTrack = responseAudioTrackRef.current;
    if (room && publishedTrack) await room.localParticipant.unpublishTrack(publishedTrack).catch(() => undefined);
    publishedTrack?.stop();
    responseAudioTrackRef.current = null;
    responseAudioRef.current?.pause();
    responseAudioRef.current?.remove();
    responseAudioRef.current = null;
    if (responseAudioUrlRef.current) URL.revokeObjectURL(responseAudioUrlRef.current);
    responseAudioUrlRef.current = null;
  }, []);

  const playAndPublishRimeResponse = useCallback(async (audioBase64: string, contentType: string) => {
    const room = roomRef.current;
    if (!room) throw new Error("The LiveKit room is no longer connected.");
    await stopPublishedResponseAudio();

    const audio = new Audio();
    const objectUrl = URL.createObjectURL(base64ToBlob(audioBase64, contentType));
    audio.src = objectUrl;
    audio.preload = "auto";
    audio.autoplay = true;
    audioHostRef.current?.appendChild(audio);
    responseAudioRef.current = audio;
    responseAudioUrlRef.current = objectUrl;

    const capturable = audio as HTMLAudioElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const mediaStream = capturable.captureStream?.() ?? capturable.mozCaptureStream?.();
    const mediaTrack = mediaStream?.getAudioTracks()[0];
    if (mediaTrack) {
      const localTrack = new LocalAudioTrack(mediaTrack);
      responseAudioTrackRef.current = localTrack;
      await room.localParticipant.publishTrack(localTrack, { name: "lawyerai-rime-response", source: Track.Source.Microphone });
    }

    audio.onended = () => {
      void stopPublishedResponseAudio();
      autoListenNextRef.current = true;
      setAvatarState(verifiedResponsePlaybackAvatarState("ended"));
    };
    await audio.play();
    setAvatarState(verifiedResponsePlaybackAvatarState("started"));
    if (!mediaTrack) {
      setRendererUnavailable(true);
      setError("Your browser is playing the verified Rime response locally, but cannot relay it to the avatar video renderer. The fallback avatar remains active.");
    }
  }, [stopPublishedResponseAudio]);

  const endSession = useCallback(async () => {
    setIsEnding(true);
    try {
      await stopPublishedResponseAudio();
      await roomRef.current?.disconnect();
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (sessionId) await endLiveCall({ sessionId }).catch(() => undefined);
    } finally {
      roomRef.current = null;
      clearMediaElements();
      setIsSharing(false);
      rendererVideoRef.current = false;
      setHasRendererVideo(false);
      setRendererUnavailable(false);
      setAvatarState("offline");
      setIsEnding(false);
    }
  }, [clearMediaElements, endLiveCall, stopPublishedResponseAudio]);

  const beginSession = useCallback(async () => {
    if (!isAuthenticated || startingRef.current || roomRef.current) return;
    startingRef.current = true;
    setError(null);
    setAvatarState("connecting");
    rendererVideoRef.current = false;
    setHasRendererVideo(false);
    setRendererUnavailable(false);

    try {
      const credentials = await startBoundedLiveAvatarCall(startLiveCall);
      sessionIdRef.current = credentials.sessionId;
      if (credentials.rendererStatus === "unavailable") {
        setRendererUnavailable(true);
        setError(credentials.rendererError ?? "The avatar video renderer is unavailable. LawyerAI will remain available with the fallback avatar.");
      }
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video) {
          const element = track.attach();
          element.autoplay = true;
          if (element instanceof HTMLVideoElement) element.playsInline = true;
          videoHostRef.current?.replaceChildren(element);
          rendererVideoRef.current = true;
          setHasRendererVideo(true);
        }
        // Renderer audio is intentionally ignored. Rime is the only source played to the user.
      });

      room.on(RoomEvent.TrackUnsubscribed, track => {
        track.detach().forEach(element => element.remove());
      });

      room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        const text = segments.filter(segment => segment.final).map(segment => segment.text).join(" ");
        if (!text) return;
        const speaker = participant?.identity === room.localParticipant.identity ? "user" : "assistant";
        // The render-only worker must never originate LawyerAI dialogue or alter verified text.
        if (speaker !== "user") return;
        appendMessage(speaker, text);
        const sessionId = sessionIdRef.current;
        if (sessionId) saveTranscript({ sessionId, speaker, content: text, source: "livekit" });
        setAvatarState("thinking");
      });

      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null;
        clearMediaElements();
        setIsSharing(false);
        rendererVideoRef.current = false;
        setHasRendererVideo(false);
        setAvatarState("offline");
      });

      await room.connect(credentials.livekitUrl, credentials.livekitToken);
      window.setTimeout(() => {
        if (!rendererVideoRef.current) setRendererUnavailable(true);
      }, 2_000);
      autoListenNextRef.current = true;
      setAvatarState("listening");
    } catch (sessionError) {
      const recovery = startupFailureRecovery(sessionError);
      setError(recovery.error);
      setAvatarState(recovery.avatarState);
      await roomRef.current?.disconnect();
      roomRef.current = null;
    } finally {
      startingRef.current = false;
    }
  }, [appendMessage, clearMediaElements, isAuthenticated, saveTranscript, startLiveCall]);

  useEffect(() => {
    if (isAuthenticated) void beginSession();
    return () => {
      void stopPublishedResponseAudio();
      void roomRef.current?.disconnect();
    };
  }, [beginSession, isAuthenticated, stopPublishedResponseAudio]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleScreenShare = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!isSharing);
      setIsSharing(current => !current);
    } catch {
      setError("Screen sharing was not started. Check that your browser allows screen sharing for this site.");
    }
  };

  const selectDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const docxMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const mimeType = file.type === "application/pdf" || file.type === docxMimeType ? file.type : file.type.startsWith("text/") ? "text/plain" : null;
    if (!mimeType) {
      setError("Please upload a PDF, DOCX, or plain-text document. These formats can be indexed for this legal-assistant session.");
      return;
    }

    try {
      setError(null);
      const uploaded = await uploadDocument({ filename: file.name, mimeType, base64: await fileToBase64(file), sessionId: sessionIdRef.current ?? undefined });
      setDocuments(current => [...current, { id: nanoid(), name: uploaded.filename, size: uploaded.size, knowledgeFileId: uploaded.knowledgeFileId }]);
      appendMessage("assistant", `I have indexed “${uploaded.filename}”. I will use it as legal context in this private session.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The document could not be indexed.");
    }
  };

  const sendTextMessage = async (submittedText?: string, source: "typed" | "whisper" = "typed") => {
    const text = (submittedText ?? messageDraft).trim();
    if (!text) return;
    if (!roomRef.current) {
      setError("The live legal-assistant call is not connected yet. Please wait a moment or reconnect before sending a message.");
      return;
    }

    try {
      appendMessage("user", text);
      const sessionId = sessionIdRef.current;
      if (sessionId) saveTranscript({ sessionId, speaker: "user", content: text, source });
      if (!submittedText) setMessageDraft("");
      setError(null);
      setAvatarState("thinking");
      const result = await requestLegalResponse({
        sessionId: sessionIdRef.current!,
        question: text,
        conversationHistory: messages.slice(-12).map(message => ({ speaker: message.speaker, text: message.text })),
      });
      const citations = citationLabels(result.legal_sources);
      appendMessage("assistant", result.response, citations, {
        confidence: result.confidence,
        verificationStatus: result.verification_status,
      });
      if (sessionId) saveTranscript({ sessionId, speaker: "assistant", content: result.response, source });
      try {
        await playAndPublishRimeResponse(result.audio.audioBase64, result.audio.contentType);
      } catch (audioError) {
        setError(audioError instanceof Error ? audioError.message : "The verified response is visible, but its audio could not start.");
        setAvatarState(verifiedResponsePlaybackAvatarState("failed"));
      }
    } catch {
      setError("Your message could not be processed by the verified legal-response service. Please reconnect and try again.");
      setAvatarState("listening");
    }
  };

  const { isListening, audioLevel, startListening, stopListening } = useVoiceInput({
    onAudio: async ({ base64, mimeType }) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || !roomRef.current) {
        setError("Reconnect the live session before using the microphone.");
        return;
      }
      try {
        setError(null);
        setAvatarState("thinking");
        const transcription = await transcribeWhisper({ sessionId, audioBase64: base64, mimeType, isFinal: true });
        if (!transcription.transcript.trim()) {
          setAvatarState("listening");
          setError("Whisper did not detect a usable question. You can type your question instead.");
          return;
        }
        await sendTextMessage(transcription.transcript, "whisper");
      } catch (transcriptionError) {
        setAvatarState("listening");
        setError(transcriptionError instanceof Error ? transcriptionError.message : "Speech transcription failed. You can type your question instead.");
      }
    },
    onError: message => setError(`${message}. You can type your question instead.`),
    maxDurationMs: 10_000,
    silenceDurationMs: 2_000,
  });

  useEffect(() => {
    if (!shouldStartQueuedWhisperListening({
      queued: autoListenNextRef.current,
      avatarState,
      isListening,
      isResponding,
      isTranscribing,
      hasLiveRoom: Boolean(roomRef.current),
    })) return;
    autoListenNextRef.current = false;
    const timer = window.setTimeout(() => void startListening(), 600);
    return () => window.clearTimeout(timer);
  }, [avatarState, isListening, isResponding, isTranscribing, startListening]);

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070b16] px-6 text-slate-100">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/30">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">LawyerAI</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your live legal assistant</h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">Sign in to begin a private voice session, share a screen, and add documents for context.</p>
          <Button className="mt-7 w-full" onClick={() => { window.location.href = "/api/oauth/login"; }}>Sign in to continue</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_2%,rgba(65,100,182,0.22),transparent_32%),#070b16] text-slate-100">
      <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">LawyerAI</p>
          <h1 className="mt-1 text-base font-semibold tracking-tight text-white">Live legal-assistant session</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-2 text-slate-300 hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</Button>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-5 p-5 lg:grid-cols-[minmax(360px,0.92fr)_minmax(500px,1.08fr)] lg:p-8">
        <div className="flex min-h-[560px] flex-col gap-4">
          <LiveAvatarStage state={avatarState} videoHostRef={videoHostRef} audioHostRef={audioHostRef} error={error} showVideo={shouldShowRenderOnlyAvatarVideo({ state: avatarState, hasRendererVideo, rendererUnavailable })} />
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-xs text-slate-400">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Voice and video connect through a short-lived session token.</span>
            <button className="font-medium text-sky-300 hover:text-sky-200" onClick={() => void beginSession()} disabled={!canReconnectLiveAvatar({ isAuthenticated, isStarting: isStartingCall || startingRef.current, hasLiveRoom: Boolean(roomRef.current) })}>Reconnect</button>
          </div>
        </div>

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#111827]/80 shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
            <div>
              <h2 className="font-semibold text-white">Conversation</h2>
              <p className="mt-1 text-xs text-slate-400">Verified answers and supporting sources appear here.</p>
            </div>
            {isStartingCall && <Loader2 className="h-4 w-4 animate-spin text-sky-300" />}
          </div>

          {error && <div role="alert" className="mx-5 mt-4 rounded-xl border border-rose-300/20 bg-rose-400/[0.08] px-3 py-2 text-xs leading-5 text-rose-100">{error}</div>}

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-sm">
                  <p className="text-base font-medium text-slate-200">I’m ready when you are.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Ask a question to receive a verified, citation-grounded legal response. The avatar renders the corresponding Rime audio when available.</p>
                </div>
              </div>
            ) : messages.map(message => <ConversationMessage key={message.id} message={message} />)}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/[0.08] bg-slate-950/20 p-4">
            {documents.length > 0 && <div className="mb-3 flex flex-wrap gap-2">{documents.map(document => <span key={document.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-300/15 bg-sky-300/[0.07] px-3 py-1 text-xs text-sky-100"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{document.name}</span><span className="text-sky-200/60">{formatFileSize(document.size)}</span></span>)}</div>}
            <div className="flex gap-2">
              <Input value={messageDraft} onChange={event => setMessageDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void sendTextMessage(); }} placeholder="Ask LawyerAI a legal question…" disabled={isResponding || isTranscribing} className="border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500" />
              <Button size="icon" onClick={() => void sendTextMessage()} disabled={!messageDraft.trim() || isResponding || isTranscribing} aria-label="Send message">{isResponding || isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
              <div className="contents sm:flex sm:gap-2">
                <label>
                  <input type="file" className="sr-only" accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => void selectDocument(event)} disabled={isIndexingDocument} />
                  <span className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08] sm:w-auto sm:px-3 ${isIndexingDocument ? "cursor-wait opacity-60" : "cursor-pointer"}`}>{isIndexingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}{isIndexingDocument ? "Indexing…" : "Add document"}</span>
                </label>
                <Button variant="outline" size="sm" className={`h-9 w-full gap-2 border-white/10 bg-white/[0.04] px-2 text-slate-200 hover:bg-white/[0.08] hover:text-white sm:w-auto sm:px-3 ${isSharing ? "border-sky-300/40 bg-sky-300/10 text-sky-100" : ""}`} onClick={() => void toggleScreenShare()}><MonitorUp className="h-4 w-4" /> {isSharing ? "Sharing screen" : "Share screen"}</Button>
                <Button variant="outline" size="sm" className={`h-9 w-full gap-2 border-white/10 bg-white/[0.04] px-2 text-slate-200 hover:bg-white/[0.08] hover:text-white sm:w-auto sm:px-3 ${isListening ? "border-rose-300/40 bg-rose-300/10 text-rose-100" : ""}`} onClick={() => isListening ? stopListening() : void startListening()} disabled={isResponding || isTranscribing || !roomRef.current} aria-label={isListening ? "Stop listening" : "Retry microphone listening"}>
                  {isListening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />} {isListening ? `Listening ${Math.round(audioLevel * 100)}%` : "Voice ready"}
                </Button>
              </div>
              <Button variant="outline" size="sm" className="col-span-2 h-9 w-full gap-2 border-rose-300/20 bg-rose-400/[0.08] text-rose-200 hover:bg-rose-400/[0.15] hover:text-rose-100 sm:w-auto" onClick={() => void endSession()} disabled={isEnding}><PhoneOff className="h-4 w-4" /> {isEnding ? "Ending" : "End"}</Button>
            </div>
          </div>
        </section>
      </div>
      <p className="mx-auto max-w-[1440px] px-5 pb-7 text-center text-xs leading-5 text-slate-500 lg:px-8">LawyerAI provides information and document-grounded analysis, not formal legal advice. Consult a qualified lawyer before relying on or filing anything.</p>
    </main>
  );
}
