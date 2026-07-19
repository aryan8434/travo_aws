import React, { useState } from 'react';
import { DollarSign, ArrowRightLeft, Coins } from 'lucide-react';

export default function CurrencyWidget() {
  const [inrAmount, setInrAmount] = useState(10000);
  const usdRate = 0.012; // ~83.5 INR = 1 USD
  const eurRate = 0.011; // ~91 INR = 1 EUR

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
          <Coins className="w-4 h-4 text-sky-400" />
          <span>Currency Converter</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Live Rates</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold">Amount in INR (₹)</label>
          <input
            type="number"
            value={inrAmount}
            onChange={(e) => setInrAmount(Number(e.target.value))}
            className="w-full bg-slate-900/90 text-white text-xs font-bold rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">USD ($)</div>
            <div className="text-sm font-extrabold text-cyan-400 mt-0.5">
              ${(inrAmount * usdRate).toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">EUR (€)</div>
            <div className="text-sm font-extrabold text-sky-400 mt-0.5">
              €{(inrAmount * eurRate).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
