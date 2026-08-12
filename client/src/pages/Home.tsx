import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-serif">LAWYERAI</h1>
            <p className="text-sm text-gray-400">Evidence-grounded legal research assistant</p>
          </div>
          <Button
            onClick={() => (isAuthenticated ? navigate("/assistant") : startLogin())}
            className="px-6"
          >
            {isAuthenticated ? "Open LawyerAI" : "Sign In"}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold font-serif mb-4">Verified Legal Assistance</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Ask legal questions, upload supporting documents, and receive citation-grounded responses with an optional live rendered avatar.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Live Avatar Delivery</h3>
            <p className="text-sm text-gray-400">Verified Rime response audio can be rendered through a session-scoped avatar video track.</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Indian Law RAG</h3>
            <p className="text-sm text-gray-400">Retrieves relevant sections from Constitution, Acts, and legal precedents.</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Verified Responses</h3>
            <p className="text-sm text-gray-400">Every answer passes a verification gate before being spoken aloud.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => (isAuthenticated ? navigate("/assistant") : startLogin())}
            size="lg"
            className="px-8 py-6 text-lg"
          >
            {isAuthenticated ? "Open LawyerAI" : "Sign In to Begin"}
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            LawyerAI provides general legal information and document-grounded analysis, not legal advice. Consult a qualified lawyer before acting or filing.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-20 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>LawyerAI © 2026 • Evidence-grounded legal research and response assistant</p>
        </div>
      </footer>
    </div>
  );
}
