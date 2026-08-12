import { useState, useRef, useCallback, useEffect } from "react";
import { shouldSubmitWhisperAudio } from "@/lib/whisperSpeechGate";

interface UseVoiceInputOptions {
  onAudio?: (audio: { base64: string; mimeType: string }) => void | Promise<void>;
  /** Legacy raw-audio callback retained for the retired console route. */
  onTranscript?: (audioBase64: string) => void;
  onError?: (error: string) => void;
  maxDurationMs?: number;
  silenceDurationMs?: number;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const maximumTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAudibleAtRef = useRef(0);
  const detectedSpeechRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const cleanUpCapture = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    if (maximumTimerRef.current) clearTimeout(maximumTimerRef.current);
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    animationFrameRef.current = null;
    maximumTimerRef.current = null;
    silenceTimerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopListening = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    cleanUpCapture();
    setIsListening(false);
  }, [cleanUpCapture]);

  const startListening = useCallback(async () => {
    if (mediaRecorderRef.current?.state === "recording") return;
    try {
      setIsListening(true);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const supportedMime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = supportedMime ? new MediaRecorder(stream, { mimeType: supportedMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      lastAudibleAtRef.current = Date.now();
      detectedSpeechRef.current = false;
      const monitorLevel = () => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
        setAudioLevel(Math.min(1, rms * 6));
        if (rms > 0.025) {
          detectedSpeechRef.current = true;
          lastAudibleAtRef.current = Date.now();
        }
        animationFrameRef.current = requestAnimationFrame(monitorLevel);
      };
      monitorLevel();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        if (!shouldSubmitWhisperAudio({ audioSize: audioBlob.size, detectedSpeech: detectedSpeechRef.current })) {
          return optionsRef.current.onError?.("No speech was detected. Please try again or type your question.");
        }
        const reader = new FileReader();
        reader.onload = () => {
          const base64Audio = (reader.result as string).split(",")[1];
          if (!base64Audio) return;
          if (optionsRef.current.onAudio) {
            void optionsRef.current.onAudio({ base64: base64Audio, mimeType: audioBlob.type || "audio/webm" });
          } else {
            optionsRef.current.onTranscript?.(base64Audio);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      maximumTimerRef.current = setTimeout(stopListening, optionsRef.current.maxDurationMs ?? 10_000);
      silenceTimerRef.current = setInterval(() => {
        if (Date.now() - lastAudibleAtRef.current >= (optionsRef.current.silenceDurationMs ?? 2_000)) stopListening();
      }, 250);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Microphone access denied";
      cleanUpCapture();
      setIsListening(false);
      optionsRef.current.onError?.(errorMsg);
    }
  }, [cleanUpCapture, stopListening]);

  useEffect(() => () => cleanUpCapture(), [cleanUpCapture]);

  return {
    isListening,
    audioLevel,
    startListening,
    stopListening,
  };
}
