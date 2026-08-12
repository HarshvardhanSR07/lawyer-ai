import React from "react";
import { Card } from "@/components/ui/card";

interface SystemStatusPipelineProps {
  currentPhase: "LISTENING" | "ANALYZING" | "SEARCHING_LEGAL" | "SEARCHING_EVIDENCE" | "REASONING" | "VERIFYING" | "RESPONDING" | "IDLE";
}

const phases = [
  "LISTENING",
  "ANALYZING",
  "SEARCHING_LEGAL",
  "SEARCHING_EVIDENCE",
  "REASONING",
  "VERIFYING",
  "RESPONDING",
];

const phaseColors: Record<string, string> = {
  LISTENING: "bg-blue-500",
  ANALYZING: "bg-purple-500",
  SEARCHING_LEGAL: "bg-indigo-500",
  SEARCHING_EVIDENCE: "bg-cyan-500",
  REASONING: "bg-amber-500",
  VERIFYING: "bg-orange-500",
  RESPONDING: "bg-green-500",
  IDLE: "bg-gray-500",
};

export default function SystemStatusPipeline({ currentPhase }: SystemStatusPipelineProps) {
  const currentPhaseIndex = phases.indexOf(currentPhase);

  return (
    <Card className="p-4 bg-slate-800 border-slate-700">
      <div className="flex items-center justify-between gap-2">
        {phases.map((phase, index) => {
          const isActive = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex;

          return (
            <div key={phase} className="flex items-center flex-1">
              {/* Phase Circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-all duration-300
                  ${isActive ? `${phaseColors[phase]} text-white shadow-lg scale-110` : ""}
                  ${isCompleted ? "bg-green-600 text-white" : ""}
                  ${!isActive && !isCompleted ? "bg-slate-600 text-gray-400" : ""}
                `}
              >
                {isCompleted ? "✓" : index + 1}
              </div>

              {/* Phase Label */}
              <div className="ml-2 flex-1">
                <p
                  className={`text-xs font-semibold transition-colors ${
                    isActive ? "text-white" : isCompleted ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {phase.replace(/_/g, " ")}
                </p>
              </div>

              {/* Connector Line */}
              {index < phases.length - 1 && (
                <div
                  className={`
                    h-1 flex-1 mx-1 rounded-full transition-colors
                    ${isCompleted || (index < currentPhaseIndex) ? "bg-green-600" : "bg-slate-600"}
                  `}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
