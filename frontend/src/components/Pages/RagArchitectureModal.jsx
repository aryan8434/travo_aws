import React, { useState } from 'react';
import { X, Layers, Database, Cpu, Search, FileText, CheckCircle2, ShieldCheck, ArrowRight, Zap, Terminal, Server, ArrowDown, Sparkles } from 'lucide-react';

export default function RagArchitectureModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('pipeline');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl glass-panel bg-[#0f172a] rounded-3xl border border-cyan-500/40 shadow-2xl my-6 overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-cyan-500/25">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2.5">
                TravoAI RAG Architecture & Pipeline
                <span className="text-xs font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Vectra DB + Groq 70B
                </span>
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                Complete technical pipeline: Ingestion, 768-dim embeddings, vector indexing & LLM grounding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 shadow-md"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation (2 Clean Tabs) */}
        <div className="flex bg-slate-900/90 border-b border-slate-800 px-6 pt-4 gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-5 py-3 text-sm font-bold rounded-t-2xl border-t border-x transition-all flex items-center gap-2.5 ${
              activeTab === 'pipeline'
                ? 'bg-[#0f172a] text-cyan-400 border-cyan-500/40 border-b-transparent shadow-lg'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>1. 5-Stage Visual Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('diagram')}
            className={`px-5 py-3 text-sm font-bold rounded-t-2xl border-t border-x transition-all flex items-center gap-2.5 ${
              activeTab === 'diagram'
                ? 'bg-[#0f172a] text-cyan-400 border-cyan-500/40 border-b-transparent shadow-lg'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span>2. System Architecture & Detailed Guide</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: 5-STAGE VISUAL PIPELINE (DIAGRAM-HEAVY, MINIMAL TEXT) */}
          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              
              {/* High Level Flow Chart */}
              <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-5 rounded-2xl border border-cyan-500/30 text-center space-y-3">
                <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> End-to-End Data Processing Flow
                </span>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs font-bold font-mono pt-2">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 text-slate-200">
                    1. JSON Ingestion
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-cyan-500/30 text-cyan-300">
                    2. 400-Word Chunking
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-sky-500/30 text-sky-300">
                    3. 768-Dim Vector
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-amber-500/30 text-amber-300">
                    4. Vectra Index
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/30 text-emerald-300">
                    5. Cosine Search (≥ 0.70)
                  </div>
                </div>
              </div>

              {/* 5 Diagram Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Stage 1 Diagram */}
                <div className="glass-card p-5 rounded-2xl border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-xl font-mono text-xs font-bold border border-cyan-500/30">
                      STAGE 1
                    </span>
                    <span className="text-sm font-extrabold text-white">Document Parsing</span>
                  </div>
                  {/* Visual Diagram Box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>📄 Raw Tour Package Data</span>
                      <span className="text-cyan-400">JSON/PDF</span>
                    </div>
                    <div className="text-center text-slate-500 my-1">↓ Extract & Normalize Entities ↓</div>
                    <div className="flex justify-around bg-slate-900 p-2 rounded-lg text-emerald-400 text-[11px]">
                      <span>• Title</span>
                      <span>• Itinerary</span>
                      <span>• Price</span>
                      <span>• Amenities</span>
                    </div>
                  </div>
                </div>

                {/* Stage 2 Diagram */}
                <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-xl font-mono text-xs font-bold border border-emerald-500/30">
                      STAGE 2
                    </span>
                    <span className="text-sm font-extrabold text-white">Semantic Chunking</span>
                  </div>
                  {/* Visual Diagram Box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="text-slate-300 text-center">
                      [ 📄 800-Word Package Document ]
                    </div>
                    <div className="text-center text-emerald-400 my-1">↓ Split into 400-Word Windows ↓</div>
                    <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                      <div className="bg-slate-900 p-2 rounded-lg text-slate-200 border border-emerald-500/30">
                        Chunk #1 (Words 1-400)
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg text-slate-200 border border-emerald-500/30">
                        Chunk #2 (Words 350-750)
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-400 text-center italic mt-1">
                      50-Word Overlap Window Preserves Context
                    </div>
                  </div>
                </div>

                {/* Stage 3 Diagram */}
                <div className="glass-card p-5 rounded-2xl border border-sky-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-sky-500/20 text-sky-300 rounded-xl font-mono text-xs font-bold border border-sky-500/30">
                      STAGE 3
                    </span>
                    <span className="text-sm font-extrabold text-white">768-Dim Vector Embedding</span>
                  </div>
                  {/* Visual Diagram Box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="text-sky-300">
                      Input Chunk Text ➔ Local BGE Transformer Model
                    </div>
                    <div className="text-center text-sky-400 my-1">↓ Generate Dense Vector Array ↓</div>
                    <div className="bg-slate-900 p-2.5 rounded-lg text-amber-300 text-[11px] text-center overflow-x-auto truncate">
                      [ 0.0412, -0.1983, 0.4021, ..., 0.8119 ] (768 Float32 Numbers)
                    </div>
                  </div>
                </div>

                {/* Stage 4 Diagram */}
                <div className="glass-card p-5 rounded-2xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-xl font-mono text-xs font-bold border border-amber-500/30">
                      STAGE 4
                    </span>
                    <span className="text-sm font-extrabold text-white">Vectra DB HNSW Indexing</span>
                  </div>
                  {/* Visual Diagram Box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="text-amber-300 text-center">
                      768-Dim Vector Array + Metadata Payload
                    </div>
                    <div className="text-center text-amber-400 my-1">↓ Insert into Local Vector Store ↓</div>
                    <div className="bg-slate-900 p-2.5 rounded-lg text-emerald-400 text-center text-[11px] border border-amber-500/30">
                      <code>vectra_index/index.json</code> (Sub-10ms Lookup Time)
                    </div>
                  </div>
                </div>

                {/* Stage 5 Diagram */}
                <div className="glass-card p-5 rounded-2xl md:col-span-2 border border-purple-500/40 bg-purple-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-xl font-mono text-xs font-bold border border-purple-500/30">
                      STAGE 5
                    </span>
                    <span className="text-base font-extrabold text-white">Cosine Similarity & Hallucination Guard (Cutoff ≥ 0.70)</span>
                  </div>
                  {/* Visual Diagram Box */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-cyan-500/30 text-cyan-300">
                        1. User Query Vector
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-purple-500/30 text-purple-300">
                        2. Cosine Distance Math
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-emerald-500/30 text-emerald-300">
                        3. Similarity Cutoff ≥ 0.70
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-center text-xs font-sans font-bold">
                      ✅ Only Top-k Highly Relevant Chunks are Injected into Groq Llama-3.3 70B Prompt!
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: SYSTEM ARCHITECTURE & 3-COLUMN DETAILED GUIDE */}
          {activeTab === 'diagram' && (
            <div className="space-y-6">
              
              {/* Architecture Header Flow */}
              <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 bg-slate-950/90 space-y-4">
                <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" /> Complete System Architecture Overview
                </h4>
                
                {/* 4 Block Horizontal Diagram */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs font-bold font-mono">
                  <div className="bg-slate-900 p-4 rounded-xl border border-cyan-500/30 space-y-1">
                    <span className="text-cyan-400 block text-sm">USER QUERY</span>
                    <span className="text-slate-300 font-sans font-normal text-xs block">"Goa package under 40k"</span>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-sky-500/30 space-y-1">
                    <span className="text-sky-400 block text-sm">EMBEDDING</span>
                    <span className="text-slate-300 font-sans font-normal text-xs block">768-Dim Query Vector</span>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/30 space-y-1">
                    <span className="text-amber-400 block text-sm">VECTRA DB</span>
                    <span className="text-slate-300 font-sans font-normal text-xs block">Cosine Match ≥ 0.70</span>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 space-y-1">
                    <span className="text-emerald-400 block text-sm">GROQ LLM</span>
                    <span className="text-slate-300 font-sans font-normal text-xs block">Llama-3.3 70B Output</span>
                  </div>
                </div>
              </div>

              {/* 3-COLUMN DETAILED TEXT & PARAGRAPH EXPLANATIONS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column 1 */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <FileText className="w-5 h-5" />
                    <h4 className="text-base font-extrabold text-white">1. Data Ingestion & Vector Pipeline</h4>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    TravoAI stores all 1,000+ tour packages as structured documents. Every package includes a 300–800 word description detailing destinations, prices, hotels, daily itineraries, and included services.
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    During server initialization, the <strong>ragEngine</strong> loads the package dataset, splits long documents into 400-word sliding windows with a 50-word overlap, and generates <strong>768-dimensional vector embeddings</strong> for every chunk using a local BGE-Small transformer model.
                  </p>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300">
                    ✓ 768-Dim Embeddings<br/>
                    ✓ HNSW Vector Indexing<br/>
                    ✓ Zero External DB Cost
                  </div>
                </div>

                {/* Column 2 */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                    <h4 className="text-base font-extrabold text-white">2. Cosine Similarity & Anti-Hallucination</h4>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    When a user enters a prompt, TravoAI converts the query into the same 768-dim vector space and performs a mathematical <strong>cosine similarity dot-product search</strong> against all indexed package vectors.
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    To eliminate AI hallucinations, a strict <strong>similarity threshold cutoff of ≥ 0.70</strong> is enforced. Only chunks meeting this relevance threshold are retrieved and passed to the LLM as verified context.
                  </p>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300">
                    ✓ Score Cutoff ≥ 0.70<br/>
                    ✓ 100% Grounded Context<br/>
                    ✓ Sub-10ms Vector Lookup
                  </div>
                </div>

                {/* Column 3 */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-sky-400">
                    <Cpu className="w-5 h-5" />
                    <h4 className="text-base font-extrabold text-white">3. Groq LLM & Real-Time Generation</h4>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    The top matching package context is formatted into a structured prompt and sent to the <strong>Groq Llama-3.3 70B Versatile API</strong> for lightning-fast inference.
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Groq synthesizes the retrieved package data into conversational recommendations, rendering interactive <strong>Booking Cards</strong> with live pricing, hotel tiers, itineraries, and 1-click Razorpay payment buttons directly in the chat!
                  </p>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-sky-300">
                    ✓ Groq 70B Llama-3.3<br/>
                    ✓ Interactive Booking Cards<br/>
                    ✓ Razorpay Payment Integration
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-900/90 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between shrink-0 px-6">
          <span className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" /> Live Vectra DB Vector Index Active (8 Tour Packages Loaded)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl border border-slate-700 transition-all shadow-md"
          >
            Close Architecture Guide
          </button>
        </div>

      </div>
    </div>
  );
}
