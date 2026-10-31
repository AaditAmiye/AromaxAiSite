import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isFirebaseConfigured } from '../../services/firebase/firebaseClient';
import { AromaxLogo } from './AromaxLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, signInAsGuest, signInWithEmail, signUpWithEmail, logout } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setMessage(null);

    const res =
      mode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);

    setLoading(false);
    if (res.success) {
      setMessage('Authenticated successfully.');
      setTimeout(() => onClose(), 800);
    } else {
      setMessage(res.error || 'Authentication failed.');
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    await signInAsGuest();
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="ios-glass-card w-full max-w-sm rounded-[32px] p-6 shadow-2xl text-[#1D1D1F] dark:text-[#F4F4F5] flex flex-col gap-5">
        {/* Top specular reflection rim */}
        <div className="glass-reflection-rim inset-x-8" />
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.05] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <AromaxLogo variant="badge" size={28} />
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight">
              AromaxAI Access
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full ios-glass hover:bg-white/90 dark:hover:bg-zinc-700 flex items-center justify-center text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Current status */}
        <div className="bg-[#F5F5F7] dark:bg-zinc-900/90 p-3.5 rounded-2xl flex items-center justify-between border border-transparent dark:border-white/10">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-[#86868B] dark:text-[#A1A1AA]">Operator Identity</span>
            <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
              {user?.displayName || 'Guest Operator'}
            </span>
            <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">{user?.email || 'Local session'}</span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              user?.isAnonymous
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40'
            }`}
          >
            {user?.isAnonymous ? 'Guest' : 'Authenticated'}
          </span>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[#86868B] dark:text-[#A1A1AA]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@aromaxai.com"
              className="bg-[#F5F5F7] dark:bg-zinc-900 text-[#1D1D1F] dark:text-[#F4F4F5] p-2.5 rounded-xl text-[14px] border border-black/[0.06] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[#86868B] dark:text-[#A1A1AA]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-[#F5F5F7] dark:bg-zinc-900 text-[#1D1D1F] dark:text-[#F4F4F5] p-2.5 rounded-xl text-[14px] border border-black/[0.06] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {message && (
            <p className="text-[12px] text-[#FF3B30] dark:text-red-400 bg-[#FFF5F5] dark:bg-red-950/40 p-2 rounded-xl text-center border border-red-200 dark:border-red-900/40">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full ios-liquid-btn-emerald text-white font-medium text-[14px] h-11 rounded-2xl flex items-center justify-center transition-all mt-1 shadow-sm active:scale-95 ring-1 ring-white/20 cursor-pointer"
          >
            <span className="relative z-10">{loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[12px]">
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-[#0071E3] dark:text-sky-400 hover:underline cursor-pointer"
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
          {user && !user.isAnonymous && (
            <button
              type="button"
              onClick={logout}
              className="text-[#FF3B30] dark:text-red-400 hover:underline cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Guest fallback button */}
        <button
          type="button"
          onClick={handleGuest}
          className="w-full bg-[#F5F5F7] dark:bg-zinc-800/80 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] font-medium text-[13px] h-10 rounded-2xl flex items-center justify-center transition-all border border-transparent dark:border-white/10 cursor-pointer"
        >
          Continue as Guest Operator
        </button>

        {!isFirebaseConfigured && (
          <p className="text-[10px] text-center text-[#86868B] dark:text-[#A1A1AA]">
            Firebase environment credentials optional. Operating in local authenticated mode.
          </p>
        )}
      </div>
    </div>
  );
};
