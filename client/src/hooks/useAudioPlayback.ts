import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioPlaybackOptions {
  onMouthShape?: (shape: "closed" | "slightly-open" | "open-mid" | "open-wide") => void;
  onPlaybackComplete?: () => void;
}

export function useAudioPlayback(options: UseAudioPlaybackOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio context and analyser
  const initializeAudio = useCallback(() => {
    if (audioContextRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    // Create audio element and connect to analyser
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  }, []);

  // Update mouth shape based on audio amplitude
  const updateMouthShape = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (root mean square) for amplitude
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Map RMS to mouth shape (0-255 range)
    let mouthShape: "closed" | "slightly-open" | "open-mid" | "open-wide" = "closed";
    if (rms > 30) mouthShape = "slightly-open";
    if (rms > 60) mouthShape = "open-mid";
    if (rms > 100) mouthShape = "open-wide";

    options.onMouthShape?.(mouthShape);

    // Continue animation loop
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateMouthShape);
    }
  }, [isPlaying, options]);

  // Play audio from blob or URL
  const playAudio = useCallback(
    async (audioSource: Blob | string) => {
      try {
        initializeAudio();

        if (!audioRef.current || !audioContextRef.current) return;

        // Resume audio context if suspended
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        // Set audio source
        if (typeof audioSource === "string") {
          audioRef.current.src = audioSource;
        } else {
          const url = URL.createObjectURL(audioSource);
          audioRef.current.src = url;
        }

        setIsPlaying(true);

        // Start mouth animation loop
        updateMouthShape();

        // Play audio
        await audioRef.current.play();

        // Handle playback end
        audioRef.current.onended = () => {
          setIsPlaying(false);
          options.onPlaybackComplete?.();
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        };
      } catch (error) {
        console.error("Audio playback error:", error);
        setIsPlaying(false);
      }
    },
    [initializeAudio, updateMouthShape, options]
  );

  // Stop audio playback
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stopAudio]);

  return {
    isPlaying,
    playAudio,
    stopAudio,
  };
}
