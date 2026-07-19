import React, { useState } from 'react';
import { X, Layers, Database, Cpu, Search, FileText, CheckCircle2, ShieldCheck, ArrowRight, Zap, Code, Terminal, Server } from 'lucide-react';

export default function RagArchitectureModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('pipeline');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel bg-[#0f172a] rounded-3xl border border-cyan-500/40 shadow-2xl my-8 overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950 p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                TravoAI RAG System Architecture
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Vectra DB + Groq 70B
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Detailed 5-stage pipeline: How tour packages are chunked, embedded, indexed, and retrieved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900/90 border-b border-slate-800 px-6 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
              activeTab === 'pipeline'
                ? 'bg-[#0f172a] text-cyan-400 border-cyan-500/40 border-b-transparent shadow-md'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>5-Stage RAG Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('diagram')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
              activeTab === 'diagram'
                ? 'bg-[#0f172a] text-cyan-400 border-cyan-500/40 border-b-transparent shadow-md'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Architecture Diagram</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
              activeTab === 'projects'
                ? 'bg-[#0f172a] text-cyan-400 border-cyan-500/40 border-b-transparent shadow-md'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Similar RAG Systems (AskPDF)</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: 5-STAGE RAG PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-cyan-300 mb-1">💡 What is RAG in TravoAI?</p>
                Retrieval-Augmented Generation (RAG) connects our <strong>Groq Llama-3.3 70B LLM</strong> directly to a local <strong>Vectra Vector Database</strong> containing over 1,000 rich tour packages. This prevents AI hallucination and ensures 100% accurate, up-to-date pricing, itineraries, and hotel details.
              </div>

              {/* 5 Pipeline Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stage 1 */}
                <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-white">Document Parsing & Ingestion</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Reads raw tour package JSON/PDF files (containing 300–800 words each). Extracting title, destination, pricing, hotel tier, itineraries, included/excluded services, and travel tips.
                  </p>
                  <div className="text-[11px] font-mono text-cyan-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    Input: 1,000 Packages ➔ JSON Parser ➔ Structural Entities
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                      2
                    </span>
                    <h4 className="text-sm font-bold text-white">Semantic Text Chunking</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Splits each tour package into optimal 400-word passages with a 50-word sliding overlap window. Preserves contextual relationships between itineraries, activities, and budget limits.
                  </p>
                  <div className="text-[11px] font-mono text-emerald-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    Chunk Size: 400 words | Overlap: 50 words | Preserves Semantics
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/30">
                      3
                    </span>
                    <h4 className="text-sm font-bold text-white">768-Dimensional Vector Embedding</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Converts text chunks into dense 768-dimensional floating point vector representations using local embedding models (BGE-Small / MiniLM).
                  </p>
                  <div className="text-[11px] font-mono text-sky-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    Text ➔ Vector Math: [0.042, -0.198, ..., 0.812] (768 Dimensions)
                  </div>
                </div>

                {/* Stage 4 */}
                <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                      4
                    </span>
                    <h4 className="text-sm font-bold text-white">Vectra Vector DB Indexing</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Indexes 768-dim embeddings into <code>vectra_index/</code> using HNSW (Hierarchical Navigable Small World) graphs for sub-10ms similarity search queries.
                  </p>
                  <div className="text-[11px] font-mono text-amber-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    Storage: Local Vectra Vector Store (0 External DB Costs)
                  </div>
                </div>

                {/* Stage 5 */}
                <div className="glass-card p-4 rounded-2xl md:col-span-2 border border-purple-500/30 bg-purple-950/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/30">
                      5
                    </span>
                    <h4 className="text-sm font-bold text-white">Cosine Similarity & Hallucination Mitigation ($\ge 0.70$)</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    When a user searches (e.g. <em>"Beach package in Goa under ₹40,000"</em>), TravoAI embeds the query, calculates cosine similarity against the vector index, applies a <strong>$\ge 0.70$ relevance cutoff threshold</strong>, and injects only the top matching packages into Groq LLM prompt.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-cyan-400 font-mono">
                      Query Embedding ➔ Cosine Match
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-emerald-400 font-mono">
                      Relevance Cutoff $\ge 0.70$
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-amber-400 font-mono">
                      Grounded Groq LLM Response
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL ARCHITECTURE DIAGRAM */}
          {activeTab === 'diagram' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">TravoAI RAG End-to-End System Architecture</h4>
              
              <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 bg-slate-950/80 space-y-6">
                
                {/* Visual Flow Diagram Cards */}
                <div className="flex flex-col md:flex-row items-stretch justify-between gap-3 text-center">
                  
                  {/* Step A */}
                  <div className="flex-1 bg-slate-900 p-4 rounded-xl border border-cyan-500/30 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto font-bold text-xs">
                      A
                    </div>
                    <h5 className="text-xs font-extrabold text-white">User Prompt</h5>
                    <p className="text-[11px] text-slate-400">"Goa package under 40k"</p>
                  </div>

                  <div className="hidden md:flex items-center text-cyan-400">➔</div>

                  {/* Step B */}
                  <div className="flex-1 bg-slate-900 p-4 rounded-xl border border-sky-500/30 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto font-bold text-xs">
                      B
                    </div>
                    <h5 className="text-xs font-extrabold text-white">Query Embedder</h5>
                    <p className="text-[11px] text-slate-400">768-Dim Vector Generation</p>
                  </div>

                  <div className="hidden md:flex items-center text-cyan-400">➔</div>

                  {/* Step C */}
                  <div className="flex-1 bg-slate-900 p-4 rounded-xl border border-amber-500/30 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto font-bold text-xs">
                      C
                    </div>
                    <h5 className="text-xs font-extrabold text-white">Vectra Vector DB</h5>
                    <p className="text-[11px] text-slate-400">Cosine Similarity Search</p>
                  </div>

                  <div className="hidden md:flex items-center text-cyan-400">➔</div>

                  {/* Step D */}
                  <div className="flex-1 bg-slate-900 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto font-bold text-xs">
                      D
                    </div>
                    <h5 className="text-xs font-extrabold text-white">Groq Llama-3.3</h5>
                    <p className="text-[11px] text-slate-400">Contextual Answer Generation</p>
                  </div>

                </div>

                {/* Technical Specs Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <strong className="text-white">Vector Storage:</strong> Local Vectra DB Index
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white">LLM Engine:</strong> Groq Llama-3.3 70B Versatile
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <Database className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <strong className="text-white">User Chat Memory:</strong> MongoDB Collection
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                    <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <strong className="text-white">Hallucination Threshold:</strong> $\ge 0.70$ Score
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: SIMILAR RAG SYSTEMS (ASKPDF SHOWCASE) */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="glass-card p-5 rounded-2xl border border-cyan-500/30 bg-slate-900/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-cyan-400" /> AskPDF – RAG-Powered Document Q&A System
                    </h4>
                    <p className="text-xs text-cyan-400 font-mono">
                      Tech Stack: Node.js, MongoDB, Redis, Gemini API, Vector Search
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Built a <strong>RAG system</strong> that enables users to upload PDFs and query them via a conversational LLM interface – answers are grounded strictly in document content with real-time streaming.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Processed documents through a <strong>5-stage async pipeline</strong> (parse ➔ chunk ➔ embed ➔ index ➔ search), efficiently handling PDFs up to 20MB and generating 768-dimensional embeddings for semantic vector search.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Offloaded PDF processing to a <strong>decoupled Redis worker using a BRPOP blocking queue</strong>, enabling the API to return <strong>202 Accepted</strong> immediately while tracking asynchronous job status via Redis Hashes (HSET).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Engineered <strong>hallucination mitigation via similarity thresholding ($\ge 0.70$ cutoff)</strong> to reject low-relevance context before LLM generation, and implemented automated state cleanup to prevent orphan records in MongoDB.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between shrink-0 px-6">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Live Vectra DB Index Active (8 RAG Packages Loaded)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all"
          >
            Close Architecture
          </button>
        </div>

      </div>
    </div>
  );
}
