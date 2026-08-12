import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CaseData {
  caseId: string;
  caseName: string;
  caseType: string;
  status: string;
  documentCount: number;
  legalSourceCount: number;
  documents?: Array<{ name: string; type: string }>;
}

interface CaseIntelligencePanelProps {
  caseData?: CaseData;
}

export default function CaseIntelligencePanel({ caseData }: CaseIntelligencePanelProps) {
  if (!caseData) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-700 h-96">
        <p className="text-gray-400">Loading case data...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-slate-800 border-slate-700 h-96 flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-white">CASE INTELLIGENCE</h2>

      <div className="space-y-4 flex-1">
        {/* Case Name */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Case</p>
          <p className="text-sm font-semibold text-white mt-1">{caseData.caseName}</p>
        </div>

        {/* Case Type */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Type</p>
          <p className="text-sm text-gray-300 mt-1">{caseData.caseType}</p>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Status</p>
          <Badge className="mt-1 bg-green-600 text-white">{caseData.status}</Badge>
        </div>

        {/* Document Count */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Evidence Documents</p>
          <p className="text-lg font-bold text-blue-400 mt-1">{caseData.documentCount}</p>
        </div>

        {/* Legal Source Count */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Legal Authorities</p>
          <p className="text-lg font-bold text-purple-400 mt-1">{caseData.legalSourceCount}</p>
        </div>

        {/* Documents List */}
        {caseData.documents && caseData.documents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Documents</p>
            <div className="space-y-1">
              {caseData.documents.map((doc, idx) => (
                <div key={idx} className="text-xs text-gray-300">
                  <span className="text-gray-500">{doc.type}:</span> {doc.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
