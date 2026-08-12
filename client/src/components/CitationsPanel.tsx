import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

interface Message {
  speaker: "user" | "lawyerai";
  text: string;
  timestamp: number;
  legalSources?: Array<{
    source: string;
    section: string;
    document_name: string;
    page_number: number;
    text: string;
    relevance_score: number;
  }>;
  evidenceSources?: Array<{
    document_name: string;
    page_number: number;
    clause: string;
    text: string;
    relevance_score: number;
  }>;
  confidence?: string;
}

interface CitationsPanelProps {
  messages: Message[];
}

export default function CitationsPanel({ messages }: CitationsPanelProps) {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  // Get the last AI response with citations
  const lastAIResponse = [...messages].reverse().find((m) => m.speaker === "lawyerai");

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedSources);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSources(newSet);
  };

  return (
    <Card className="p-6 bg-slate-800 border-slate-700">
      <h2 className="text-lg font-semibold mb-4 text-white">SOURCES IN PLAY</h2>

      {!lastAIResponse ? (
        <p className="text-gray-400 text-sm">No citations yet. Start courtroom exchange to see sources.</p>
      ) : (
        <div className="space-y-4">
          {/* Legal Sources */}
          {lastAIResponse.legalSources && lastAIResponse.legalSources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-2">LEGAL AUTHORITIES</h3>
              <div className="space-y-2">
                {lastAIResponse.legalSources.map((source, idx) => {
                  const sourceId = `legal-${idx}`;
                  const isExpanded = expandedSources.has(sourceId);

                  return (
                    <div
                      key={sourceId}
                      className="bg-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-600 transition"
                      onClick={() => toggleExpanded(sourceId)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-600 text-white text-xs">
                              {source.source}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {source.section}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {source.document_name} • Page {source.page_number}
                          </p>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <p className="text-xs text-gray-300 leading-relaxed">{source.text}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Relevance: {(source.relevance_score * 100).toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evidence Sources */}
          {lastAIResponse.evidenceSources && lastAIResponse.evidenceSources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-cyan-400 mb-2">CASE EVIDENCE</h3>
              <div className="space-y-2">
                {lastAIResponse.evidenceSources.map((evidence, idx) => {
                  const sourceId = `evidence-${idx}`;
                  const isExpanded = expandedSources.has(sourceId);

                  return (
                    <div
                      key={sourceId}
                      className="bg-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-600 transition"
                      onClick={() => toggleExpanded(sourceId)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-cyan-600 text-white text-xs">
                              {evidence.document_name}
                            </Badge>
                            {evidence.clause && (
                              <Badge variant="outline" className="text-xs">
                                {evidence.clause}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Page {evidence.page_number}
                          </p>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <p className="text-xs text-gray-300 leading-relaxed">{evidence.text}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Relevance: {(evidence.relevance_score * 100).toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confidence Indicator */}
          {lastAIResponse.confidence && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Confidence</p>
              <Badge
                className={`mt-2 ${
                  lastAIResponse.confidence === "high"
                    ? "bg-green-600"
                    : lastAIResponse.confidence === "medium"
                    ? "bg-yellow-600"
                    : "bg-red-600"
                } text-white`}
              >
                {lastAIResponse.confidence.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
