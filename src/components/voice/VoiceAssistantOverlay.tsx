import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useVoiceAssistant } from '../../context/VoiceAssistantContext';
import { rgbToHex } from '../../services/hardware/lightEngine';

interface VoiceAssistantOverlayProps {
  onOpenLiveSession?: () => void;
}

export const VoiceAssistantOverlay: React.FC<VoiceAssistantOverlayProps> = ({
  onOpenLiveSession
}) => {
  const {
    state,
    transcript,
    interimTranscript,
    responseMessage,
    lastSynthesizedBlend,
    finishAndProcessNow,
    cancelAssistant,
    processDirectCommand
  } = useVoiceAssistant();

  const isVisible =
    state === 'listening_for_command' ||
    state === 'processing' ||
    state === 'diffusing' ||
    state === 'error';

  const currentText = (interimTranscript || transcript).trim();

  const quickPrompts = [
    'Make it smell like fresh pizza',
    'Smell like monsoon rain and wet earth',
    'Cozy dark roasted coffee with vanilla',
    'Peaceful lavender garden',
    'Ocean breeze with salty mist'
  ];

  const dominantColor = lastSynthesizedBlend?.light
    ? rgbToHex(lastSynthesizedBlend.light)
    : '#34C759';

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-xl animate-in fade-in duration-200">
          {/* Backdrop dismissal */}
          <div
            className="absolute inset-0"
            onClick={cancelAssistant}
            aria-hidden="true"
          />

          {/* Assistant Modal Card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-sm rounded-[36px] bg-[#121216] border border-white/10 text-white p-6 shadow-2xl flex flex-col items-center gap-4 overflow-hidden"
          >
            {/* Top ambient colored light aura */}
            <div
              className="absolute -top-16 inset-x-0 h-36 blur-3xl opacity-30 pointer-events-none transition-colors duration-500"
              style={{ backgroundColor: dominantColor }}
            />

            {/* Top Bar: Title & Close */}
            <div className="w-full flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34C759] animate-pulse" />
                <span className="text-[12px] font-bold tracking-widest uppercase text-white/80">
                  A R O • Voice Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={cancelAssistant}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Siri / Gemini Acoustic Visualizer Orb */}
            <div className="relative my-1 flex items-center justify-center">
              {/* Outer Pulsing Glow */}
              <motion.div
                animate={{
                  scale: state === 'listening_for_command' ? [1, 1.25, 1] : state === 'processing' ? [1, 1.15, 1] : 1,
                  opacity: [0.4, 0.8, 0.4]
                }}
                transition={{
                  repeat: Infinity,
                  duration: state === 'listening_for_command' ? 1.5 : 2,
                  ease: 'easeInOut'
                }}
                className="absolute w-28 h-28 rounded-full blur-2xl"
                style={{
                  background:
                    state === 'diffusing'
                      ? dominantColor
                      : 'linear-gradient(135deg, #00C6FF, #0072FF, #9D00FF, #FF007F)'
                }}
              />

              {/* Core Morphing Sphere */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: state === 'listening_for_command' ? [0.95, 1.05, 0.95] : 1
                }}
                transition={{
                  rotate: { repeat: Infinity, duration: 8, ease: 'linear' },
                  scale: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                }}
                className="relative w-18 h-18 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center justify-center border border-white/20 overflow-hidden"
                style={{
                  background:
                    state === 'diffusing'
                      ? `radial-gradient(circle, ${dominantColor}, #000)`
                      : 'radial-gradient(circle at 30% 30%, #5eead4, #3b82f6 50%, #9333ea 85%)'
                }}
              >
                <span className="material-symbols-outlined text-[28px] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  {state === 'diffusing'
                    ? 'air'
                    : state === 'processing'
                    ? 'hourglass_empty'
                    : 'mic'}
                </span>
              </motion.div>
            </div>

            {/* Status & Realtime Transcript */}
            <div className="w-full flex flex-col items-center text-center gap-1.5 z-10">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400">
                {state === 'listening_for_command' && 'Listening to your question...'}
                {state === 'processing' && 'AI Formulating Scent...'}
                {state === 'diffusing' && 'Scent Diffusing Now'}
                {state === 'error' && 'Notice'}
              </span>

              {/* Spoken Text Display */}
              <div className="min-h-[55px] w-full flex items-center justify-center px-2 py-1 rounded-2xl bg-white/5 border border-white/5">
                {currentText ? (
                  <p className="text-[16px] font-medium text-white tracking-tight leading-snug">
                    "{currentText}"
                  </p>
                ) : (
                  <p className="text-[13px] text-white/50 italic leading-relaxed">
                    {state === 'listening_for_command'
                      ? 'Say what you want to smell (e.g. "make it smell like pizza")...'
                      : responseMessage || 'Tell me a scent or story...'}
                  </p>
                )}
              </div>

              {state === 'listening_for_command' && currentText && (
                <div className="flex flex-col items-center gap-2 w-full pt-1">
                  <span className="text-[11px] text-white/50 animate-pulse">
                    Stop speaking to auto-process with AI
                  </span>
                  <button
                    type="button"
                    onClick={finishAndProcessNow}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[12px] uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Done Speaking • Process Now</span>
                  </button>
                </div>
              )}
            </div>

            {/* Synthesized Blend Card (when diffusing) */}
            {state === 'diffusing' && lastSynthesizedBlend && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-3.5 rounded-2xl bg-white/10 border border-white/10 flex flex-col gap-2 z-10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: dominantColor, color: dominantColor }}
                    />
                    <span className="text-[14px] font-bold text-white">
                      {lastSynthesizedBlend.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    DIFFUSING
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {lastSynthesizedBlend.channels.map((ch) => (
                    <span
                      key={ch.channelId}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/15 text-white/90"
                    >
                      {ch.channelId} ({Math.round(ch.intensity * 100)}%)
                    </span>
                  ))}
                </div>

                {onOpenLiveSession && (
                  <button
                    type="button"
                    onClick={() => {
                      cancelAssistant();
                      onOpenLiveSession();
                    }}
                    className="mt-1 w-full py-2 rounded-xl bg-white text-black text-[11px] font-bold tracking-wide uppercase transition-all active:scale-95 cursor-pointer shadow-sm hover:opacity-90"
                  >
                    View in Dynamic Island
                  </button>
                )}
              </motion.div>
            )}

            {/* Quick 1-Tap Suggestions (only when listening and empty) */}
            {state === 'listening_for_command' && !currentText && (
              <div className="w-full flex flex-col gap-1.5 z-10 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 text-center">
                  Or Tap A Quick Scent
                </span>
                <div className="flex flex-col gap-1.5">
                  {quickPrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => processDirectCommand(prompt)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 text-[11px] text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt}</span>
                      <span className="material-symbols-outlined text-[14px] text-white/40 group-hover:text-white/80">
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Note */}
            <div className="text-[10px] text-white/40 tracking-wide text-center z-10">
              Say <strong className="text-white/70">"Aro"</strong> followed by your scent request
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
