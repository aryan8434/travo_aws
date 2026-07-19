import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Compass } from 'lucide-react';
import MessageItem from './MessageItem';

export default function ChatBox({ messages, onSendMessage, loading, onBookingComplete, onBookingError, onGoToBookings, currentUser, onOpenAuthModal }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const promptSuggestions = [
    { label: '🚌 Bus Delhi ➔ Jaipur (Evening)', query: 'Book me a bus from Delhi to Jaipur tomorrow after 6 PM under ₹1000' },
    { label: '🌴 Goa RAG Beach Package', query: 'Suggest a beach trip under ₹40,000 for 2 people in December' },
    { label: '🏨 Hotel in Goa < ₹5000', query: 'Need a hotel in Goa under ₹5000' },
    { label: '✈️ Flight Delhi ➔ Mumbai', query: 'Find flights from Delhi to Mumbai under 6000' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleChipClick = (query) => {
    if (loading) return;
    onSendMessage(query);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-[#0b0f17]">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 animate-fade-in max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <Compass className="w-8 h-8 text-white animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-2">
                Where would you like to travel?
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                I am your AI Travel Agent powered by <span className="text-cyan-400 font-medium">Groq & RAG Vector Search</span>. Ask me to find buses, flights, hotels, or custom holiday packages.
              </p>
            </div>

            {/* Quick Prompt Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
              {promptSuggestions.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip.query)}
                  className="glass-card hover:bg-slate-800/80 p-3 rounded-xl border border-slate-800 hover:border-cyan-500/30 text-left transition-all group"
                >
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    {chip.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageItem
              key={index}
              message={msg}
              onBookingComplete={onBookingComplete}
              onBookingError={onBookingError}
              onGoToBookings={onGoToBookings}
              currentUser={currentUser}
              onOpenAuthModal={onOpenAuthModal}
            />
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-3 p-3 glass-panel rounded-xl max-w-xs text-xs text-cyan-400 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>AI is analyzing routes & RAG packages...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Input Bar */}
      <div className="p-4 border-t border-slate-800 glass-panel">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your travel request (e.g., 'Book a bus from Delhi to Jaipur tomorrow after 6 PM')..."
            className="w-full bg-slate-900/90 text-slate-100 text-sm placeholder-slate-500 rounded-xl px-4 py-3.5 pr-12 border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg transition-all shadow-md shadow-cyan-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
