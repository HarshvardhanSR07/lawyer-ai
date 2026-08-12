import React, { useState, useEffect } from "react";

interface AvatarComponentProps {
  phase: "LISTENING" | "ANALYZING" | "SEARCHING_LEGAL" | "SEARCHING_EVIDENCE" | "REASONING" | "VERIFYING" | "RESPONDING" | "IDLE";
  mouthShape?: "closed" | "slightly-open" | "open-mid" | "open-wide";
}

const phaseColors: Record<string, string> = {
  LISTENING: "from-blue-500 to-blue-600",
  ANALYZING: "from-purple-500 to-purple-600",
  SEARCHING_LEGAL: "from-indigo-500 to-indigo-600",
  SEARCHING_EVIDENCE: "from-cyan-500 to-cyan-600",
  REASONING: "from-amber-500 to-amber-600",
  VERIFYING: "from-orange-500 to-orange-600",
  RESPONDING: "from-green-500 to-green-600",
  IDLE: "from-gray-500 to-gray-600",
};

export default function AvatarComponent({ phase }: AvatarComponentProps) {
  const [mouthShape, setMouthShape] = useState<"closed" | "slightly-open" | "open-mid" | "open-wide">("closed");
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSwaying, setIsSwaying] = useState(false);

  // Blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      const randomInterval = Math.random() * 3000 + 3000; // 3-6 seconds
      setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }, randomInterval);
    }, 6000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Idle sway animation
  useEffect(() => {
    if (phase === "IDLE" || phase === "LISTENING") {
      setIsSwaying(true);
    } else {
      setIsSwaying(false);
    }
  }, [phase]);

  // Mouth animation during RESPONDING phase (placeholder)
  useEffect(() => {
    if (phase === "RESPONDING") {
      const mouthSequence = ["closed", "slightly-open", "open-mid", "open-wide", "open-mid", "slightly-open"];
      let index = 0;

      const mouthInterval = setInterval(() => {
        setMouthShape(mouthSequence[index % mouthSequence.length] as any);
        index++;
      }, 100);

      return () => clearInterval(mouthInterval);
    } else {
      setMouthShape("closed");
    }
  }, [phase]);

  const glowColor = phaseColors[phase] || phaseColors.IDLE;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Glow Ring */}
      <div
        className={`relative w-48 h-48 rounded-full bg-gradient-to-br ${glowColor} shadow-2xl transition-all duration-300`}
        style={{
          boxShadow: `0 0 30px rgba(${getGlowRGB(phase)}, 0.6)`,
          transform: isSwaying ? `translateY(${Math.sin(Date.now() / 1000) * 4}px)` : "translateY(0)",
        }}
      >
        {/* Avatar Portrait */}
        <div className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden bg-gradient-to-b from-slate-200 to-slate-300">
          {/* Placeholder avatar (professional courtroom appearance) */}
          <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Head */}
            <div className="w-24 h-28 bg-amber-100 rounded-t-full relative">
              {/* Eyes */}
              <div className="absolute top-8 left-6 w-3 h-3 bg-gray-800 rounded-full"></div>
              <div className="absolute top-8 right-6 w-3 h-3 bg-gray-800 rounded-full"></div>

              {/* Blink overlay */}
              {isBlinking && (
                <div className="absolute top-8 left-6 w-3 h-3 bg-amber-100 rounded-full"></div>
              )}
              {isBlinking && (
                <div className="absolute top-8 right-6 w-3 h-3 bg-amber-100 rounded-full"></div>
              )}

              {/* Mouth */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-8">
                {mouthShape === "closed" && (
                  <div className="h-1 bg-gray-700 rounded-full"></div>
                )}
                {mouthShape === "slightly-open" && (
                  <div className="h-2 bg-gray-700 rounded-full"></div>
                )}
                {mouthShape === "open-mid" && (
                  <div className="h-3 bg-gray-700 rounded-full"></div>
                )}
                {mouthShape === "open-wide" && (
                  <div className="h-4 bg-gray-700 rounded-full"></div>
                )}
              </div>
            </div>

            {/* Neck */}
            <div className="w-6 h-4 bg-amber-100"></div>

            {/* Shoulders */}
            <div className="w-32 h-12 bg-slate-700 rounded-b-lg"></div>
          </div>
        </div>
      </div>

      {/* Phase Label */}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-300">{phase}</p>
      </div>
    </div>
  );
}

function getGlowRGB(phase: string): string {
  const rgbMap: Record<string, string> = {
    LISTENING: "59, 130, 246",
    ANALYZING: "168, 85, 247",
    SEARCHING_LEGAL: "99, 102, 241",
    SEARCHING_EVIDENCE: "34, 211, 238",
    REASONING: "217, 119, 6",
    VERIFYING: "234, 88, 12",
    RESPONDING: "34, 197, 94",
    IDLE: "107, 114, 128",
  };
  return rgbMap[phase] || rgbMap.IDLE;
}
