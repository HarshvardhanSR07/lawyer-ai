import { ShieldCheck } from "lucide-react";

export type ConversationMessageData = {
  id: string;
  speaker: "user" | "assistant";
  text: string;
  createdAt: number;
  citations?: string[];
  confidence?: "high" | "medium" | "low";
  verificationStatus?: "approved" | "flagged";
};

export function ConversationMessage({ message }: { message: ConversationMessageData }) {
  return (
    <article className={`flex ${message.speaker === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.speaker === "user" ? "rounded-br-md bg-sky-500 text-slate-950" : "rounded-bl-md border border-white/[0.08] bg-white/[0.055] text-slate-200"}`}>
        <div className={`mb-1 flex items-center justify-between gap-4 text-[10px] font-semibold uppercase tracking-[0.14em] ${message.speaker === "user" ? "text-slate-900/65" : "text-sky-200/75"}`}>
          {message.speaker === "user" ? "You" : message.verificationStatus ? (
            <span className={`flex items-center gap-1.5 ${message.verificationStatus === "approved" ? "text-emerald-200" : "text-amber-200"}`}>
              <ShieldCheck className="h-3 w-3" />
              LawyerAI · {message.verificationStatus === "approved" ? "verified" : "review required"} · {message.confidence ?? "confidence unavailable"} confidence
            </span>
          ) : "LawyerAI"}
          <time dateTime={new Date(message.createdAt).toISOString()}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
        </div>
        <p>{message.text}</p>
        {message.speaker === "assistant" && message.citations && message.citations.length > 0 && (
          <div className="mt-3 border-t border-sky-200/10 pt-2 text-xs text-sky-100/80">
            <span className="font-semibold uppercase tracking-[0.12em] text-sky-200/70">{message.verificationStatus === "approved" ? "Verified sources" : "Sources reviewed"}</span>
            <ul className="mt-1.5 space-y-1">{message.citations.map(citation => <li key={citation}>• {citation}</li>)}</ul>
          </div>
        )}
      </div>
    </article>
  );
}
