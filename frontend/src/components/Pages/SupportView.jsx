import React from 'react';
import { HelpCircle, Mail, Linkedin, ShieldCheck, ArrowLeft, MessageSquare } from 'lucide-react';

export default function SupportView({ onBackToHome }) {
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
          <HelpCircle className="w-6 h-6 text-sky-400" /> Help & Customer Support
        </h2>
        <p className="text-xs text-slate-400">Get technical assistance, booking help, or reach out directly to the lead developer</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Developer Contact Card */}
        <div className="glass-card rounded-2xl p-5 border border-cyan-500/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-500/20">
              AR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Mr. Aryan Kumar Raj</h3>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">
                  Lead Developer
                </span>
              </div>
              <p className="text-xs text-slate-400">TravoAI Creator & Technical Support Lead</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Official Developer Email</span>
                <a href="mailto:arkrraj@gmail.com" className="font-bold text-white hover:text-cyan-400">
                  arkrraj@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <Linkedin className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">LinkedIn Profile</span>
                <a
                  href="https://www.linkedin.com/in/aryan-kumar-raj-988587b3/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-cyan-400 hover:underline"
                >
                  linkedin.com/in/aryan-kumar-raj-988587b3
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" /> Frequently Asked Questions
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
              <h4 className="font-bold text-slate-200">How does the 8-Message Sliding Context Memory work?</h4>
              <p className="text-slate-400 leading-relaxed">
                TravoAI stores the last 8 conversation turns in MongoDB and in-memory cache to maintain context across multi-turn prompts (such as follow-up budgets or destination clarifications).
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
              <h4 className="font-bold text-slate-200">How does the RAG vector DB recommendation work?</h4>
              <p className="text-slate-400 leading-relaxed">
                TravoAI converts user prompts into vector embeddings and queries local Vectra DB index for semantic matching over 1,000+ packages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
