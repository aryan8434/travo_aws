import React from 'react';
import { Info, Cpu, Database, Compass, ShieldCheck, History, QrCode, Ticket, Navigation, Layers, Code, ArrowLeft } from 'lucide-react';

export default function AboutView({ onBackToHome }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0b0f17] text-slate-100 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline mb-1 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to AI Concierge
        </button>
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Info className="w-6 h-6 text-cyan-400" /> About TravoAI
        </h2>
        <p className="text-xs text-slate-400">Next-Generation AI Travel Concierge & RAG Vector Recommendation Engine</p>
      </div>

      <div className="space-y-6 max-w-5xl">
        {/* Core Overview Card */}
        <div className="glass-card rounded-2xl p-6 border border-cyan-500/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20">
              <Compass className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">TravoAI Engineering Specifications</h3>
              <p className="text-xs text-slate-400">AI Concierge • Vector Database RAG • Payment Gateway Architecture</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>TravoAI</strong> transforms traditional travel booking into an interactive, conversational AI agent experience similar to ChatGPT + Perplexity. It replaces static forms with natural language understanding, real-time context memory, vector database package retrieval, and verified checkout.
          </p>
        </div>

        {/* Detailed Technical Blocks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* BLOCK 1: Groq LLM Engine */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span>1. Groq Llama-3.1 Intent & Entity Extractor</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Processes natural language inputs (e.g. <em>"Book me a bus from Kota to Jaipur tomorrow after 6 PM under ₹1000"</em>) into structured JSON schema payloads (<code className="text-cyan-300 font-mono">intent</code>, <code className="text-cyan-300 font-mono">from</code>, <code className="text-cyan-300 font-mono">to</code>, <code className="text-cyan-300 font-mono">budget</code>, <code className="text-cyan-300 font-mono">timePreference</code>).
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              Model: llama-3.1-8b-instant | Temp: 0.0 | Format: JSON
            </div>
          </div>

          {/* BLOCK 2: Vectra Vector DB RAG */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>2. Vectra Local Vector DB RAG Search</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Indexes 1,000+ holiday package JSON chunks into vector embeddings using <strong className="text-emerald-400">Vectra Local Vector Database</strong>. Computes cosine similarity and semantic similarity queries to retrieve top matching travel packages in sub-50ms.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              Index: Vectra LocalIndex | Dimension: 128-d / 768-d | TopK: 6
            </div>
          </div>

          {/* BLOCK 3: 8-Message Context Memory */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <History className="w-5 h-5 text-sky-400" />
              <span>3. MongoDB 8-Turn Sliding Window Memory</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Persists the last 8 conversation turns to MongoDB Atlas using atomic <code className="text-cyan-300 font-mono">$push</code> and <code className="text-cyan-300 font-mono">$slice: -20</code> operators, with a zero-latency in-memory cache (<code className="text-cyan-300 font-mono">memoryStore</code>) fallback. Solves context loss across follow-up queries (e.g. <em>"show flights to bangalore"</em> ➔ <em>"5000"</em>).
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              Memory Window: 8 Turns | DB: MongoDB Atlas | Fallback: Cache Map
            </div>
          </div>

          {/* BLOCK 4: PNR, Ticket & QR Generator */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <QrCode className="w-5 h-5 text-amber-400" />
              <span>4. Dynamic PNR, Ticket & QR Subsystem</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upon booking confirmation, automatically generates a unique 6-digit PNR string (<code className="text-cyan-300 font-mono">TRV-XXXXXX</code>), an 8-digit Ticket Number (<code className="text-cyan-300 font-mono">TCK-XXXXXXXX</code>), and an interactive QR Code image payload encoding booking metadata for instant scanning and ticket printing.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              Format: PNR Hash + QR Server API | Output: View & Print Ticket
            </div>
          </div>

          {/* BLOCK 5: Razorpay Payment Integration */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-rose-400" />
              <span>5. Razorpay Gateway & Signature Verification</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Integrates Razorpay Standard Web Checkout. Backend endpoints (<code className="text-cyan-300 font-mono">/api/create-order</code> & <code className="text-cyan-300 font-mono">/api/verify-payment</code>) verify authenticity using <strong className="text-rose-400">HMAC-SHA256 signature verification</strong> (<code className="text-cyan-300 font-mono">order_id|payment_id</code>), storing actual item prices in transaction history.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              HMAC Auth: SHA256 | Test Charge: 100 paise | Record: Actual Price
            </div>
          </div>

          {/* BLOCK 6: Geolocation & Reverse Geocoding */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-violet-400 font-bold text-sm">
              <Navigation className="w-5 h-5 text-violet-400" />
              <span>6. Geolocation & Reverse Weather Engine</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Leverages HTML5 Geolocation API and OpenStreetMap Nominatim reverse geocoding to resolve exact user city coordinates. Synchronizes live weather metrics (temperature, humidity, wind speed, condition) via OpenWeatherMap API into the sidebar & chat greetings.
            </p>
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
              Geo: HTML5 + Nominatim OSM | Weather: OpenWeatherMap API
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
