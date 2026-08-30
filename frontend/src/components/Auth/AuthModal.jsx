import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, User, KeyRound, Sparkles, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { backdrop, scaleIn } from '../../lib/motion';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('test1234');
  const [password, setPassword] = useState('test12345');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleQuickFillTestUser = () => {
    setUsername('test1234');
    setPassword('test12345');
    setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please enter a username and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';

    try {
      const res = await axios.post(endpoint, { username, password });
      const data = res.data;

      if ((data.success || data.token) && data.token) {
        const userObj = { ...(data.user || { username, walletBalance: 10000 }), token: data.token };
        axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        setSuccessMsg(isLogin ? `👋 Welcome back, ${userObj.username}!` : '🎉 Account created successfully!');

        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(userObj);
          onClose();
        }, 800);
      } else {
        setErrorMsg(data.error || 'Authentication failed');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md glass-panel bg-[#0f172a] rounded-3xl border border-cyan-500/30 overflow-hidden shadow-2xl space-y-0 text-slate-100"
          >
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">TravoAI Authentication</h3>
              <p className="text-[11px] text-cyan-400">Save full chat history & wallet balance in MongoDB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Login / Register Tab Switches */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setIsLogin(true); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isLogin ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isLogin ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Preset Test Credentials Banner */}
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-cyan-300 font-bold block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Default Test Account:
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                User: <strong className="text-white">test1234</strong> | Pass: <strong className="text-white">test12345</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleQuickFillTestUser}
              className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] rounded-lg border border-cyan-500/30 transition-all shrink-0"
            >
              Auto Fill
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-semibold block">Username or Email</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="test1234"
                  className="w-full bg-slate-900 text-white text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-semibold block">Password (6+ characters)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-slate-900 text-white text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 border border-slate-700 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In to TravoAI' : 'Create TravoAI Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>MongoDB Persistent Chat History & Wallet Sync Activated</span>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
