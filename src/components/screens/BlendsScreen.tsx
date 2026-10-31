import React, { useState } from 'react';
import { PREDEFINED_BLENDS } from '../../data/blends';
import { Blend } from '../../types/aroma';
import { CHANNEL_MAP } from '../../data/aromas';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useCartridges } from '../../hooks/useCartridges';
import { rgbToHex } from '../../services/hardware/lightEngine';

interface BlendsScreenProps {
  onOpenLiveSession: () => void;
}

export const BlendsScreen: React.FC<BlendsScreenProps> = ({ onOpenLiveSession }) => {
  const { startSession, active: isSessionActive } = useActiveSession();
  const { channelMap } = useCartridges();
  const [selectedBlend, setSelectedBlend] = useState<Blend>(PREDEFINED_BLENDS[0]);
  const [customDurationMinutes, setCustomDurationMinutes] = useState(3);

  const handleLaunchBlend = async (blend: Blend) => {
    const duration = customDurationMinutes * 60;
    await startSession({
      experienceId: blend.id,
      title: blend.name,
      type: 'blend',
      channels: blend.channels,
      durationSeconds: duration,
      light: blend.light,
      batchId: blend.batchId || `#BL-${Math.floor(1000 + Math.random() * 9000)}`,
      profileName: blend.profileName || blend.category || 'Master Formulation'
    });
  };

  return (
    <div className="flex flex-col gap-6 py-2 max-w-lg mx-auto w-full">
      {/* Title */}
      <div className="pt-2 flex flex-col gap-1.5 px-1">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5]">
          Formula Blends
        </h1>
        <p className="text-[15px] leading-snug text-[#86868B] dark:text-[#A1A1AA] font-normal">
          Mastered olfactory accords engineered for balanced dispersion across physical ports.
        </p>
      </div>

      {/* Featured Blend Card */}
      <div className="ios-glass-card rounded-[34px] p-6 ring-1 ring-black/[0.03] dark:ring-white/10 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {selectedBlend.category}
            </span>
            <h2 className="text-[24px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5] mt-0.5">
              {selectedBlend.name}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 bg-white/60 dark:bg-zinc-800/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] border border-white/80 dark:border-white/10 shadow-2xs">
            <div
              className="w-2.5 h-2.5 rounded-full shadow-xs"
              style={{ backgroundColor: rgbToHex(selectedBlend.light) }}
            />
            <span>{selectedBlend.batchId || '#BL-001'}</span>
          </div>
        </div>

        <p className="text-[14px] text-[#86868B] dark:text-[#A1A1AA] leading-relaxed">
          {selectedBlend.description}
        </p>

        {/* Channel matrix breakdown */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[12px] font-semibold text-[#86868B] dark:text-[#A1A1AA] uppercase tracking-wider">
            Port Allocation
          </span>
          <div className="space-y-2">
            {selectedBlend.channels.map((ch) => {
              const def = channelMap[ch.channelId] || CHANNEL_MAP[ch.channelId];
              const pct = Math.round((ch.intensity || 0.5) * 100);
              return (
                <div key={ch.channelId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                      <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">{ch.channelId}</span>
                      {def?.name || ch.channelId}
                    </span>
                    <span className="text-[#86868B] dark:text-[#A1A1AA] font-mono">{pct}%</span>
                  </div>
                  <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Duration selection */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[12px] font-semibold text-[#86868B] dark:text-[#A1A1AA] uppercase tracking-wider">
            Session Length
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 5, 10].map((mins) => (
              <button
                key={mins}
                onClick={() => setCustomDurationMinutes(mins)}
                className={`w-9 h-8 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                  customDurationMinutes === mins
                    ? 'bg-emerald-600 dark:bg-zinc-800 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] ring-1 ring-white/10'
                    : 'bg-white/60 dark:bg-zinc-800/80 backdrop-blur-md text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white border border-white/70 dark:border-white/10 shadow-2xs'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Launch Button */}
        <button
          type="button"
          onClick={() => handleLaunchBlend(selectedBlend)}
          className="w-full ios-liquid-btn-emerald active:scale-[0.97] text-white font-medium text-[15px] h-13 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(16,185,129,0.35)] ring-1 ring-white/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] relative z-10">air</span>
          <span className="relative z-10">
            {isSessionActive
              ? `Diffuse ${selectedBlend.name} (${customDurationMinutes}m)`
              : `Diffuse ${selectedBlend.name} (${customDurationMinutes}m)`}
          </span>
        </button>
      </div>

      {/* Catalog Grid */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] px-1">Master Formulations</h3>
        <div className="grid grid-cols-1 gap-2.5">
          {PREDEFINED_BLENDS.map((blend) => {
            const isSelected = blend.id === selectedBlend.id;
            return (
              <div
                key={blend.id}
                onClick={() => setSelectedBlend(blend)}
                className={`p-4 rounded-[30px] ios-glass-card transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-[#1D1D1F] dark:border-white/30 shadow-sm ring-1 ring-[#1D1D1F]/20 dark:ring-white/20'
                    : 'hover:bg-white/85 dark:hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs shrink-0 border border-white/80 dark:border-white/10"
                    style={{ backgroundColor: `${rgbToHex(blend.light)}22` }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: rgbToHex(blend.light) }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] truncate">
                      {blend.name}
                    </span>
                    <span className="text-[12px] text-[#86868B] dark:text-[#A1A1AA] truncate">
                      {blend.channels.map((c) => c.channelId).join(' • ')} ({blend.category})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchBlend(blend);
                  }}
                  className="px-3.5 py-1.5 rounded-full ios-liquid-btn-emerald active:scale-95 text-white text-[12px] font-semibold tracking-wide shrink-0 transition-all shadow-xs ring-1 ring-white/20 cursor-pointer"
                >
                  <span className="relative z-10">Diffuse</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
