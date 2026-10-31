import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useCartridges } from '../../hooks/useCartridges';
import { CHANNEL_MAP } from '../../data/aromas';
import { CalibrateModal } from '../common/CalibrateModal';
import { AromaxLogo } from '../common/AromaxLogo';

interface LiveDiffusionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveDiffusionOverlay: React.FC<LiveDiffusionOverlayProps> = ({
  isOpen,
  onClose
}) => {
  const { channelMap } = useCartridges();
  const {
    active,
    paused,
    isPurging,
    experienceTitle,
    batchId,
    profileName,
    channels,
    light,
    formattedRemaining,
    formattedTotal,
    progressPercent,
    diffusionOutputPercent,
    pauseSession,
    resumeSession,
    stopSession,
    startPurge,
    setDiffusionOutput,
    setLighting
  } = useActiveSession();

  const [isCalibrateOpen, setIsCalibrateOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handlePurge = async () => {
    setPurging(true);
    await stopSession(true);
    // Smoothly minimize back to Dynamic Island where purge continues with animation
    setTimeout(() => {
      setPurging(false);
      onClose();
    }, 350);
  };

  const handleSaveRecipe = () => {
    setSaveNotice('Recipe saved to Sensory Memory Archive');
    setTimeout(() => setSaveNotice(null), 2500);
  };

  const handleShareTelemetry = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `AROMAXAI Live Telemetry: ${experienceTitle} | Batch ${batchId} | Ports: ${channels
          .map((c) => `${c.channelId} (${Math.round((c.intensity || 0.5) * 100)}%)`)
          .join(', ')}`
      );
      setSaveNotice('Telemetry copied to clipboard');
      setTimeout(() => setSaveNotice(null), 2500);
    }
  };

  // Outer circle circumference: 2 * PI * 96 ≈ 603
  const outerCircumference = 603;
  const outerOffset = outerCircumference - (outerCircumference * progressPercent) / 100;

  // Inner circle circumference: 2 * PI * 76 ≈ 477
  const innerCircumference = 477;
  const innerProgress = paused ? 0 : 78;
  const innerOffset = innerCircumference - (innerCircumference * innerProgress) / 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Snappy iOS Backdrop */}
          <motion.div
            key="fullscreen-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
            onClick={onClose}
          />

          {/* Maximized Window with Snappy Zoom In/Out & Motion Blur Originating from Dynamic Island */}
          <motion.div
            key="live-overlay"
            style={{
              transformOrigin: '50% 24px',
              willChange: 'transform, opacity, filter'
            }}
            initial={{
              opacity: 0,
              scale: 0.28,
              y: 8,
              filter: 'blur(14px)'
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              filter: 'blur(0px)',
              transition: {
                type: 'spring',
                stiffness: 620,
                damping: 34,
                mass: 0.4
              }
            }}
            exit={{
              opacity: 0,
              scale: 0.28,
              y: 8,
              filter: 'blur(16px)',
              transition: {
                type: 'spring',
                stiffness: 640,
                damping: 36,
                mass: 0.38
              }
            }}
            className="fixed inset-0 z-50 bg-[#F8F9FA]/95 dark:bg-[#09090B]/98 text-[#1D1D1F] dark:text-[#F4F4F5] flex flex-col overflow-y-auto"
          >
            {/* Top Interactive Island Suction Grabber Bar */}
            <div className="w-full flex justify-center pt-2.5 pb-1">
              <button
                type="button"
                onClick={onClose}
                className="w-12 h-1.5 bg-black/20 dark:bg-white/20 hover:bg-black/40 dark:hover:bg-white/40 rounded-full transition-all cursor-pointer active:scale-95"
                title="Swipe or tap to minimize to Dynamic Island"
              />
            </div>

            {/* Apple iOS Navigation Bar */}
            <header className="sticky top-0 z-40 pt-safe bg-white/70 dark:bg-[#121216]/80 backdrop-blur-2xl border-b border-white/60 dark:border-white/10 transition-all">
              <div className="h-13 px-4 flex items-center justify-between max-w-md mx-auto w-full">
                {/* Clean left status without dead arrow button */}
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,199,89,0.7)]" />
                  <span className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                    Emitting Active
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-medium tracking-wide uppercase text-[#86868B] dark:text-[#A1A1AA]">
                    Active Session
                  </span>
                  <h1 className="text-[15px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5]">
                    Live Diffusion
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white/80 dark:bg-zinc-800 shadow-xs border border-white/80 dark:border-white/10 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                    <span>34 Ch</span>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Minimize to Dynamic Island"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer bg-white/60 dark:bg-zinc-800 border border-white/80 dark:border-white/10 shadow-xs"
                    title="Minimize to Dynamic Island"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>
            </header>

      {/* Main Content matching Image 5 */}
      <main className="flex flex-col flex-1 px-4 pt-3 pb-8 space-y-4 max-w-md mx-auto w-full">
        {/* Top Telemetry Pill */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl ios-glass-pill shadow-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                paused ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'
              }`}
            ></span>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#1D1D1F] dark:text-[#F4F4F5]">
              <AromaxLogo variant="icon" size={13} color="currentColor" />
              <span>{paused ? 'Paused' : 'Emitting'} • AROMAXAI-001</span>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/70 dark:bg-zinc-800/80 backdrop-blur-sm border border-white/80 dark:border-white/10 text-[#86868B] dark:text-[#A1A1AA]">
            Aroma Dispersion
          </span>
        </div>

        {/* Apple Fitness-inspired Hero Visualizer Card */}
        <div className="ios-glass-card rounded-[34px] p-6 ring-1 ring-black/[0.03] dark:ring-white/10 flex flex-col items-center relative overflow-hidden">
          {/* Ambient Auras */}
          <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-emerald-100/50 dark:bg-emerald-950/30 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-amber-100/60 dark:bg-amber-950/30 blur-3xl pointer-events-none"></div>

          {/* Subhead info */}
          <div className="w-full flex items-start justify-between z-10 mb-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
                Atmospheric Petrichor
              </span>
              <h2 className="text-[26px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5] leading-tight">
                {experienceTitle || 'Rainy Forest'}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-medium text-[#86868B] dark:text-[#A1A1AA] block">
                Batch ID
              </span>
              <span className="text-[13px] font-semibold tracking-wide text-[#1D1D1F] dark:text-[#F4F4F5]">
                {batchId}
              </span>
            </div>
          </div>

          {/* Concentric Dual Rings with Center Timer */}
          <div className="relative w-64 h-64 flex items-center justify-center my-3 z-10">
            <svg className="w-full h-full -rotate-90 origin-center" viewBox="0 0 240 240">
              <defs>
                <linearGradient id="amberGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF9500" />
                  <stop offset="100%" stopColor="#FF5E3A" />
                </linearGradient>
                <linearGradient id="forestGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#34C759" />
                  <stop offset="100%" stopColor="#30B0C7" />
                </linearGradient>
              </defs>

              {/* Outer Background Track (Amber) */}
              <circle cx="120" cy="120" r="96" fill="none" stroke="currentColor" className="text-[#F2F2F7] dark:text-zinc-800" strokeWidth="12" />
              {/* Outer Progress Arc */}
              <circle
                cx="120"
                cy="120"
                r="96"
                fill="none"
                stroke="url(#amberGrad)"
                strokeWidth="12"
                strokeDasharray={outerCircumference}
                strokeDashoffset={outerOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />

              {/* Inner Background Track (Emerald) */}
              <circle cx="120" cy="120" r="76" fill="none" stroke="currentColor" className="text-[#F2F2F7] dark:text-zinc-800" strokeWidth="10" />
              {/* Inner Diffusion Flow Arc */}
              <circle
                cx="120"
                cy="120"
                r="76"
                fill="none"
                stroke="url(#forestGrad)"
                strokeWidth="10"
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Center Typography */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-medium tracking-wide uppercase text-[#86868B] dark:text-[#A1A1AA]">
                Remaining
              </span>
              <span className="text-[44px] font-semibold tracking-tighter text-[#1D1D1F] dark:text-[#F4F4F5] leading-none my-1 font-sans">
                {formattedRemaining}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-medium text-[#86868B] dark:text-[#A1A1AA]">
                <span className="material-symbols-outlined text-[14px]">timelapse</span>
                <span>Total {formattedTotal}</span>
              </div>
            </div>
          </div>

          {/* Live Metric Details */}
          <div className="w-full grid grid-cols-2 pt-2 border-t border-black/[0.04] dark:border-white/10 text-[12px] z-10 mt-1">
            <div className="flex items-center gap-1.5 text-[#1D1D1F] dark:text-[#F4F4F5]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-[#86868B] dark:text-[#A1A1AA]">Pressure</span>
              <span className="font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] ml-auto">1.02 BAR</span>
            </div>
            <div className="flex items-center justify-end gap-1 text-[#1D1D1F] dark:text-[#F4F4F5] pl-4">
              <span className="font-medium text-[#86868B] dark:text-[#A1A1AA]">Emission</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">7.1 mg/s</span>
            </div>
          </div>

          {/* Botanical Profile Pill */}
          <div className="w-full bg-white/60 dark:bg-zinc-800/80 backdrop-blur-md rounded-2xl p-2.5 mt-4 flex items-center justify-between border border-white/70 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">forest</span>
              <span className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F4F4F5] truncate">
                {profileName}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#86868B] dark:text-[#A1A1AA] bg-white dark:bg-zinc-700 px-2 py-0.5 rounded-full shadow-xs shrink-0">
              NATURAL
            </span>
          </div>
        </div>

        {/* Channel Blend Matrix Card */}
        <div className="ios-glass-card rounded-[34px] p-5 ring-1 ring-black/[0.03] dark:ring-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1D1D1F] dark:text-[#F4F4F5] text-[18px]">tune</span>
              <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight">
                Channel Blend Matrix
              </h3>
            </div>
            <span className="text-[11px] font-medium text-[#86868B] dark:text-[#A1A1AA] bg-white/60 dark:bg-zinc-800 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/70 dark:border-white/10">
              {channels.length} Active Ports
            </span>
          </div>

          <div className="space-y-3.5">
            {channels.map((ch, idx) => {
              const def = channelMap[ch.channelId] || CHANNEL_MAP[ch.channelId];
              const pct = Math.round((ch.intensity || 0.5) * 100);
              const mgRate = (pct * 0.071).toFixed(1);
              const colors = [
                'bg-emerald-500',
                'bg-amber-500',
                'bg-cyan-500',
                'bg-teal-500',
                'bg-rose-400'
              ];
              const barColor = colors[idx % colors.length];

              return (
                <div key={ch.channelId}>
                  <div className="flex items-center justify-between text-[13px] mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold bg-white/80 dark:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] px-1.5 py-0.5 rounded-md border border-white/70 dark:border-white/10 shadow-2xs">
                        {ch.channelId}
                      </span>
                      <span className="font-medium text-[#1D1D1F] dark:text-[#F4F4F5]">
                        {def?.name || ch.channelId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-medium text-[12px]">
                      <span className="text-[#86868B] dark:text-[#A1A1AA]">{mgRate} mg/s</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-black/5 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diffusion Output Slider */}
        <div className="ios-glass-card rounded-[34px] p-5 ring-1 ring-black/[0.03] dark:ring-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1D1D1F] dark:text-[#F4F4F5] text-[20px]">air</span>
              <span className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">Diffusion Output</span>
            </div>
            <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
              {diffusionOutputPercent}% •{' '}
              {diffusionOutputPercent <= 35
                ? 'Whisper'
                : diffusionOutputPercent <= 75
                ? 'Medium'
                : 'Room Fill'}
            </span>
          </div>
          <div className="relative py-2">
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={diffusionOutputPercent}
              onChange={(e) => setDiffusionOutput(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-black/10 dark:bg-white/15 rounded-full appearance-none cursor-pointer outline-none transition-all"
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-medium text-[#86868B] dark:text-[#A1A1AA] px-1 mt-1">
            <span>Whisper (15%)</span>
            <span>Standard (50%)</span>
            <span>Room Fill (100%)</span>
          </div>
        </div>

        {/* Hardware Optics & Apple Home-style Light Calibrator */}
        <div className="ios-glass-card rounded-[34px] p-5 ring-1 ring-black/[0.03] dark:ring-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#86868B] dark:text-[#A1A1AA]">
                Hardware Optics
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_rgba(52,199,89,0.5)] transition-all"
                  style={{
                    backgroundColor: `rgb(${light.r}, ${light.g}, ${light.b})`
                  }}
                />
                <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                  Forest Mist • Amber-Green
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsCalibrateOpen(true)}
              className="px-3.5 py-1.5 rounded-full ios-glass hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all flex items-center gap-1.5 text-[12px] font-medium text-[#1D1D1F] dark:text-[#F4F4F5] shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-500">palette</span>
              <span>Calibrate</span>
            </button>
          </div>
        </div>

        {/* Telemetry Card: Fan Always Active */}
        <div className="ios-glass-card rounded-2xl px-4 py-3 shadow-xs flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-[#1D1D1F] dark:text-[#F4F4F5]">Airflow: Active</span>
          </div>
          <div className="flex items-center gap-4 text-[#86868B] dark:text-[#A1A1AA] font-medium">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">mode_fan</span>
              1840 RPM
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">thermostat</span>
              22.4°C
            </span>
          </div>
        </div>

        {/* High-end iOS Action Buttons */}
        <div className="pt-2 pb-safe space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Pause / Resume Button */}
            <button
              onClick={paused ? resumeSession : pauseSession}
              className={`h-12 rounded-2xl border text-[#1D1D1F] dark:text-white active:scale-[0.97] transition-all flex items-center justify-center gap-2 font-medium text-[14px] cursor-pointer ios-liquid-btn ${
                paused
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent shadow-[0_4px_16px_rgba(245,158,11,0.3)]'
                  : 'ios-glass hover:bg-white/90 dark:hover:bg-zinc-700 shadow-xs'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] relative z-10 ${paused ? 'text-white' : 'text-amber-500'}`}>
                {paused ? 'play_circle' : 'pause_circle'}
              </span>
              <span className="relative z-10">{paused ? 'Resume' : 'Pause'}</span>
            </button>

            {/* Stop & Purge Button */}
            <button
              onClick={handlePurge}
              disabled={purging}
              className="h-12 rounded-2xl ios-glass hover:bg-red-50/80 dark:hover:bg-red-950/40 border border-red-200/70 dark:border-red-900/40 text-red-600 dark:text-red-400 active:scale-[0.97] transition-all flex items-center justify-center gap-2 font-medium text-[14px] shadow-xs cursor-pointer ios-liquid-btn"
            >
              <span className="material-symbols-outlined text-[20px] relative z-10">
                {purging ? 'progress_activity' : 'mode_fan_off'}
              </span>
              <span className="relative z-10">{purging ? 'Purging...' : 'Stop & Purge'}</span>
            </button>
          </div>

          {/* Auxiliary Footer Actions */}
          <div className="flex items-center justify-center gap-5 pt-1 text-[11px] font-medium text-[#86868B] dark:text-[#A1A1AA]">
            <button
              onClick={handleSaveRecipe}
              className="hover:text-[#1D1D1F] dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">bookmark_add</span>
              Save Recipe
            </button>
            <span>•</span>
            <button
              onClick={handleShareTelemetry}
              className="hover:text-[#1D1D1F] dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">share</span>
              Share Telemetry
            </button>
          </div>

          {saveNotice && (
            <p className="text-[11px] text-center font-medium text-[#34C759] bg-[#34C759]/10 py-1.5 rounded-xl">
              {saveNotice}
            </p>
          )}
        </div>
      </main>

      {/* Optics Calibrator Modal */}
      <CalibrateModal
        isOpen={isCalibrateOpen}
        onClose={() => setIsCalibrateOpen(false)}
        currentLight={light}
        onApplyLight={(newRgb) => setLighting(newRgb)}
      />
    </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
