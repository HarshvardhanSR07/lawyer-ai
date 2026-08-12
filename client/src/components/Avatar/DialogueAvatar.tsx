import React, { useState, useEffect } from "react";

interface DialogueAvatarProps {
  phase: "LISTENING" | "ANALYZING" | "SEARCHING_LEGAL" | "SEARCHING_EVIDENCE" | "REASONING" | "VERIFYING" | "RESPONDING" | "IDLE";
  mouthShape?: "closed" | "slightly-open" | "open-mid" | "open-wide";
  isPlaying?: boolean;
}

const phaseColors: Record<string, { bg: string; glow: string; rgb: string }> = {
  LISTENING: { bg: "from-blue-500 to-blue-600", glow: "blue-500", rgb: "59, 130, 246" },
  ANALYZING: { bg: "from-purple-500 to-purple-600", glow: "purple-500", rgb: "168, 85, 247" },
  SEARCHING_LEGAL: { bg: "from-indigo-500 to-indigo-600", glow: "indigo-500", rgb: "99, 102, 241" },
  SEARCHING_EVIDENCE: { bg: "from-cyan-500 to-cyan-600", glow: "cyan-500", rgb: "34, 211, 238" },
  REASONING: { bg: "from-amber-500 to-amber-600", glow: "amber-500", rgb: "217, 119, 6" },
  VERIFYING: { bg: "from-orange-500 to-orange-600", glow: "orange-500", rgb: "234, 88, 12" },
  RESPONDING: { bg: "from-green-500 to-green-600", glow: "green-500", rgb: "34, 197, 94" },
  IDLE: { bg: "from-gray-500 to-gray-600", glow: "gray-500", rgb: "107, 114, 128" },
};

export default function DialogueAvatar({ phase, mouthShape = "closed", isPlaying = false }: DialogueAvatarProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [headTilt, setHeadTilt] = useState(0);
  const [eyeFocus, setEyeFocus] = useState(0);

  // Blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      const randomInterval = Math.random() * 3000 + 3000;
      setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }, randomInterval);
    }, 6000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Head tilt during listening/responding
  useEffect(() => {
    if (phase === "LISTENING" || phase === "RESPONDING") {
      const tiltInterval = setInterval(() => {
        setHeadTilt((prev) => (prev === 0 ? 3 : 0));
      }, 2000);
      return () => clearInterval(tiltInterval);
    } else {
      setHeadTilt(0);
    }
  }, [phase]);

  // Eye focus based on phase
  useEffect(() => {
    if (phase === "REASONING" || phase === "VERIFYING") {
      setEyeFocus(1); // Looking up/thinking
    } else if (phase === "LISTENING") {
      setEyeFocus(-1); // Looking forward/attentive
    } else {
      setEyeFocus(0); // Neutral
    }
  }, [phase]);

  const phaseColor = phaseColors[phase];
  const mouthHeight = {
    closed: 2,
    "slightly-open": 6,
    "open-mid": 10,
    "open-wide": 14,
  }[mouthShape];

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Avatar Container */}
      <div
        className="relative w-64 h-80 rounded-2xl overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 shadow-2xl"
        style={{
          transform: `translateY(${headTilt}px)`,
          transition: "transform 0.3s ease-in-out",
          boxShadow: `0 0 30px rgba(${phaseColor.rgb}, 0.4), inset 0 0 20px rgba(0,0,0,0.05)`,
        }}
      >
        {/* Head */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-40 h-48 bg-gradient-to-b from-amber-100 to-amber-50 rounded-full shadow-lg">
          {/* Left Eye */}
          <div className="absolute top-16 left-10 w-6 h-8 bg-white rounded-full shadow-md overflow-hidden">
            <div
              className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-full"
              style={{
                transform: `translateY(${eyeFocus * 2}px)`,
                transition: "transform 0.2s ease-out",
              }}
            >
              {/* Pupil */}
              <div className="absolute top-1 left-1 w-3 h-3 bg-black rounded-full"></div>
              {/* Shine */}
              <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full opacity-80"></div>
            </div>

            {/* Left Eye Blink */}
            {isBlinking && (
              <div className="absolute top-0 left-0 w-full h-full bg-amber-100 rounded-full"></div>
            )}
          </div>

          {/* Right Eye */}
          <div className="absolute top-16 right-10 w-6 h-8 bg-white rounded-full shadow-md overflow-hidden">
            <div
              className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-full"
              style={{
                transform: `translateY(${eyeFocus * 2}px)`,
                transition: "transform 0.2s ease-out",
              }}
            >
              {/* Pupil */}
              <div className="absolute top-1 left-1 w-3 h-3 bg-black rounded-full"></div>
              {/* Shine */}
              <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full opacity-80"></div>
            </div>

            {/* Right Eye Blink */}
            {isBlinking && (
              <div className="absolute top-0 left-0 w-full h-full bg-amber-100 rounded-full"></div>
            )}
          </div>

          {/* Eyebrows */}
          <div className="absolute top-12 left-8 w-8 h-1.5 bg-amber-800 rounded-full opacity-70"></div>
          <div className="absolute top-12 right-8 w-8 h-1.5 bg-amber-800 rounded-full opacity-70"></div>

          {/* Nose */}
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 w-2 h-4 bg-amber-200 rounded-full"></div>

          {/* Mouth */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-12">
            {/* Mouth background */}
            <div className="w-full h-1 bg-gray-300 rounded-full"></div>

            {/* Animated mouth opening */}
            <div
              className="w-full bg-gradient-to-b from-red-400 to-red-500 rounded-full transition-all duration-75"
              style={{
                height: `${mouthHeight}px`,
                marginTop: `${Math.max(0, mouthHeight - 2)}px`,
              }}
            ></div>
          </div>
        </div>

        {/* Neck */}
        <div className="absolute top-56 left-1/2 transform -translate-x-1/2 w-12 h-6 bg-gradient-to-b from-amber-100 to-amber-50"></div>

        {/* Shoulders & Torso */}
        <div className="absolute top-64 left-0 right-0 w-full h-32 bg-gradient-to-b from-slate-700 via-slate-600 to-slate-700 rounded-t-3xl">
          {/* Suit jacket detail */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-48 h-20 border-2 border-slate-500 rounded-lg opacity-30"></div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full animate-pulse`}
          style={{
            backgroundColor: `rgb(${phaseColor.rgb})`,
          }}
        ></div>
        <span className="text-sm font-semibold text-gray-300">{phase.replace(/_/g, " ")}</span>
      </div>

      {/* Verification Status Indicator */}
      {phase === "VERIFYING" && (
        <div className="text-xs text-yellow-400 font-semibold animate-pulse">
          Verifying response...
        </div>
      )}

      {phase === "RESPONDING" && isPlaying && (
        <div className="text-xs text-green-400 font-semibold">
          Speaking...
        </div>
      )}
    </div>
  );
}
