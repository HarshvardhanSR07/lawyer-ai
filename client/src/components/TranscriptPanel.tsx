import React, { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  speaker: "user" | "lawyerai";
  text: string;
  timestamp: number;
}

interface TranscriptPanelProps {
  messages: Message[];
}

export default function TranscriptPanel({ messages }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="p-6 bg-slate-800 border-slate-700 h-96 flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-white">LIVE DIALOGUE</h2>

      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Awaiting courtroom exchange...</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.speaker === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Speaker Label */}
                <div className="flex-1">
                  <div
                    className={`
                      p-3 rounded-lg
                      ${
                        message.speaker === "user"
                          ? "bg-blue-600 text-white ml-auto max-w-xs"
                          : "bg-slate-700 text-gray-100 max-w-sm"
                      }
                    `}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {message.speaker === "user" ? "You" : "LawyerAI"}
                    </p>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
