import React, { useState, useEffect, useMemo } from 'react';
import { AromaChannel } from '../../types/aroma';
import { rgbToHex } from '../../services/hardware/lightEngine';
import { inferAromaProfile } from '../../services/hardware/cartridgeInference';

interface CartridgeEditorModalProps {
  isOpen: boolean;
  channel: AromaChannel | null;
  onClose: () => void;
  onSave: (channelId: string, updates: Partial<AromaChannel>) => Promise<{ success: boolean; error?: string }>;
}

const QUICK_SUGGESTIONS = [
  'Pizza',
  'Rain (Petrichor)',
  'Espresso Coffee',
  'Bourbon Vanilla',
  'Wild Mango',
  'French Lavender',
  'Campfire Smoke',
  'Icy Alpine Mint',
  'Pine Forest',
  'Biryani Spices',
  'Ocean Breeze',
  'Dark Chocolate'
];

export const CartridgeEditorModal: React.FC<CartridgeEditorModalProps> = ({
  isOpen,
  channel,
  onClose,
  onSave
}) => {
  const [smellName, setSmellName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (channel) {
      setSmellName(channel.name || '');
      setFeedback(null);
    }
  }, [channel]);

  // Real-time automatic deduction:
  // The user ONLY enters the smell name. The system decides all other properties:
  // category, keywords, description, LED color, status, and chemical compound.
  const inferred = useMemo(() => {
    return inferAromaProfile(smellName);
  }, [smellName]);

  if (!isOpen || !channel) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smellName.trim()) {
      setFeedback({ message: 'Please enter a smell name (e.g. Pizza, Rain, Mango).', type: 'error' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    // Auto-decided fields saved permanently
    const updates: Partial<AromaChannel> = {
      name: inferred.name,
      category: inferred.category,
      description: inferred.description,
      keywords: inferred.keywords,
      defaultLight: inferred.defaultLight,
      chemicalCompound: inferred.chemicalCompound,
      status: 'working'
    };

    const res = await onSave(channel.id, updates);
    setIsSaving(false);

    if (res.success) {
      setFeedback({
        message: `Saved! ${channel.id} is now assigned to "${inferred.name}". AI will route all "${inferred.name}" scents here.`,
        type: 'success'
      });
      setTimeout(() => {
        onClose();
      }, 1100);
    } else {
      setFeedback({
        message: res.error || 'Failed to save cartridge smell.',
        type: 'error'
      });
    }
  };

  const hexColor = rgbToHex(inferred.defaultLight);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121216] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-black/[0.06] dark:border-white/10 flex flex-col gap-4 max-h-[92vh] overflow-y-auto text-[#1D1D1F] dark:text-[#F4F4F5]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/10">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-2xl font-mono font-bold text-[15px] flex items-center justify-center border shadow-xs transition-colors"
              style={{
                backgroundColor: `${hexColor}20`,
                borderColor: `${hexColor}40`,
                color: hexColor
              }}
            >
              {channel.id}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5]">
                  Change Smell
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-800 text-[#86868B] dark:text-[#A1A1AA]">
                  Pin {channel.channelNumber}
                </span>
              </div>
              <p className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                Just type the smell name. We automatically handle category, keywords, LED &amp; notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 flex items-center justify-center text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* 1-Tap Quick Suggestions */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
            Quick Examples (1-Tap)
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setSmellName(sug)}
                className="shrink-0 px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-[11px] font-medium text-[#1D1D1F] dark:text-[#F4F4F5] border border-stone-200/60 dark:border-white/10 transition-all active:scale-95 cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Form: Single Smell Name Input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center justify-between">
              <span>Smell Name</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Auto-analyzed
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                required
                value={smellName}
                onChange={(e) => setSmellName(e.target.value)}
                placeholder="e.g. Pizza, Rain, Roasted Coffee, Mango..."
                className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-900 border border-stone-200 dark:border-white/10 text-[14px] text-[#1D1D1F] dark:text-white font-medium focus:border-black dark:focus:border-white outline-none transition-all"
              />
              {smellName && (
                <button
                  type="button"
                  onClick={() => setSmellName('')}
                  className="absolute right-3 top-3 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* System Auto-Decided Preview Card */}
          <div className="p-3.5 rounded-2xl bg-[#F5F5F7]/80 dark:bg-zinc-900/80 border border-stone-200/80 dark:border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-600 dark:text-emerald-400">
                  auto_awesome
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
                  System Auto-Decided
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-stone-200 dark:bg-zinc-800 text-[#1D1D1F] dark:text-white">
                {inferred.category}
              </span>
            </div>

            {/* LED Glow Preview */}
            <div className="flex items-center gap-2.5 pt-0.5">
              <div
                className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                style={{
                  backgroundColor: hexColor,
                  boxShadow: `0 0 10px ${hexColor}80`
                }}
              />
              <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                LED Mood: <strong className="text-[#1D1D1F] dark:text-white font-mono">{hexColor}</strong>
              </span>
            </div>

            {/* Description */}
            <p className="text-[11px] text-[#1D1D1F] dark:text-[#D4D4D8] leading-relaxed italic bg-white/60 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-stone-200/50 dark:border-white/5">
              "{inferred.description}"
            </p>

            {/* Keywords Pills */}
            <div className="flex flex-wrap gap-1">
              {inferred.keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-white dark:bg-zinc-800 text-[#86868B] dark:text-[#A1A1AA] border border-stone-200/50 dark:border-white/5"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>

          {/* Feedback Notice */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-[12px] flex items-center gap-2 font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {feedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white text-[12px] font-semibold transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 text-[12px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[15px] ${isSaving ? 'animate-spin' : ''}`}>
                {isSaving ? 'sync' : 'done'}
              </span>
              <span>{isSaving ? 'Saving...' : 'Set Smell'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
