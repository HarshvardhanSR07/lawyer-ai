import { Loader2, Mic, Radio, VideoOff } from "lucide-react";
import { AvatarBeyondPresence } from "./Avatar/AvatarBeyondPresence";
import { AvatarFallback } from "./Avatar/AvatarFallback";

export type LiveAvatarState = "connecting" | "listening" | "thinking" | "speaking" | "offline" | "permission";

const stateCopy: Record<LiveAvatarState, { label: string; tone: string }> = {
  connecting: { label: "Connecting to LawyerAI", tone: "bg-amber-400" },
  listening: { label: "Listening", tone: "bg-emerald-400" },
  thinking: { label: "Reviewing context", tone: "bg-violet-400" },
  speaking: { label: "Speaking", tone: "bg-sky-400" },
  offline: { label: "Offline", tone: "bg-slate-500" },
  permission: { label: "Microphone permission needed", tone: "bg-rose-400" },
};

interface LiveAvatarStageProps {
  state: LiveAvatarState;
  videoHostRef: React.RefObject<HTMLDivElement | null>;
  audioHostRef: React.RefObject<HTMLDivElement | null>;
  error: string | null;
  showVideo: boolean;
}

export function LiveAvatarStage({ state, videoHostRef, audioHostRef, error, showVideo }: LiveAvatarStageProps) {
  const copy = stateCopy[state];

  return (
    <section className="relative flex min-h-[340px] flex-1 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#10182a] shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
      <AvatarBeyondPresence videoHostRef={videoHostRef} isVisible={showVideo} />
      <div ref={audioHostRef} className="hidden" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgba(139,171,255,0.14),transparent_36%),linear-gradient(180deg,transparent_52%,rgba(4,8,18,0.84))]" />

      {!showVideo && <div className="relative z-0 m-auto scale-[0.82] sm:scale-90"><AvatarFallback state={state} /></div>}

      {state === "connecting" && (
        <div className="relative z-10 m-auto flex flex-col items-center gap-4 text-slate-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-300/20 bg-sky-300/10">
            <Loader2 className="h-7 w-7 animate-spin text-sky-300" />
          </div>
          <p className="text-sm font-medium">Preparing your private legal session</p>
        </div>
      )}

      {(state === "offline" || state === "permission") && (
        <div className="relative z-10 m-auto max-w-xs px-6 text-center text-slate-300">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            {state === "permission" ? <Mic className="h-7 w-7 text-rose-300" /> : <VideoOff className="h-7 w-7 text-slate-400" />}
          </div>
          <p className="text-sm leading-6">{error ?? "Your avatar will appear here when the secure session connects."}</p>
        </div>
      )}

      <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
        <span className={`h-2 w-2 rounded-full ${copy.tone} ${state === "listening" || state === "speaking" ? "animate-pulse" : ""}`} />
        {copy.label}
      </div>

      <div className="absolute bottom-5 left-5 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300 backdrop-blur-md">
        <Radio className="h-3.5 w-3.5 text-sky-300" />
        Secure live presence
      </div>
    </section>
  );
}
