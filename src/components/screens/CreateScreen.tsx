import React, { useState, useEffect } from 'react';
import { generateAromaExperience } from '../../services/ai/aiService';
import { synthesizeAromaLocally } from '../../services/ai/clientOlfactoryEngine';
import { useActiveSession } from '../../hooks/useActiveSession';
import { ValidatedAiExperience } from '../../services/ai/aiSchema';
import { CHANNEL_MAP } from '../../data/aromas';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleVoiceModal } from '../voice/GoogleVoiceModal';
import { speakAromaInsight, stopSpeaking } from '../../services/voice/speechService';

interface CreateScreenProps {
  onOpenBlends: () => void;
  onOpenLiveSession: () => void;
}

interface PresetItem {
  id: string;
  name: string;
  prompt: string;
  icon: (active: boolean) => React.ReactNode;
}

export const CreateScreen: React.FC<CreateScreenProps> = ({
  onOpenBlends,
  onOpenLiveSession
}) => {
  const { startSession, active: isSessionActive } = useActiveSession();

  // Initial text matching the user's reference image exactly
  const DEFAULT_PROMPT =
    'A rainy evening in an old forest after twilight with petrichor, damp clay loam, and cool breeze...';

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [selectedPreset, setSelectedPreset] = useState<string>('rainy');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [createdBlend, setCreatedBlend] = useState<ValidatedAiExperience | null>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);

  // Six harmonious presets matching the reference image
  const presets: PresetItem[] = [
    {
      id: 'forest',
      name: 'Forest',
      prompt:
        'An old-growth evergreen forest in misty twilight with fresh pine needles, damp cedar heartwood, and mountain moss...',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          className={`w-6 h-6 transition-colors ${
            active ? 'text-black' : 'text-[#2C2C2E]'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Leaf with central vein matching screenshot */}
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </svg>
      )
    },
    {
      id: 'rainy',
      name: 'Rainy',
      prompt:
        'A rainy evening in an old forest after twilight with petrichor, damp clay loam, and cool breeze...',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          className={`w-6 h-6 transition-colors ${
            active ? 'text-black' : 'text-[#2C2C2E]'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Cloud with raindrops */}
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M8 19v2" />
          <path d="M12 17v2" />
          <path d="M16 19v2" />
        </svg>
      )
    },
    {
      id: 'earthy',
      name: 'Earthy',
      prompt:
        'Sun-baked red clay loam after sudden rain, warm mineral river stones, and crushed vetiver roots...',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          className={`w-6 h-6 transition-colors ${
            active ? 'text-black' : 'text-[#2C2C2E]'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Triangle / pyramid mound matching screenshot */}
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      )
    },
    {
      id: 'fresh',
      name: 'Fresh',
      prompt:
        'Crisp alpine morning air with crushed peppermint crystals, ozone breeze, and iced citrus...',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          className={`w-6 h-6 transition-colors ${
            active ? 'text-black' : 'text-[#2C2C2E]'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Snowflake / star crystal matching screenshot */}
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="20" y1="12" x2="4" y2="12" />
          <line x1="17.66" y1="6.34" x2="6.34" y2="17.66" />
          <line x1="17.66" y1="17.66" x2="6.34" y2="6.34" />
          <path d="M10 4l2-2 2 2" />
          <path d="M10 20l2 2 2-2" />
          <path d="M20 10l2-2-2 2" />
          <path d="M4 10l-2 2 2 2" />
        </svg>
      )
    },
    {
      id: 'cozy',
      name: 'Cozy',
      prompt:
        'Warm bourbon vanilla, golden cardamom honey, and crackling dry birch wood embers in an open hearth...',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          className={`w-6 h-6 transition-colors ${
            active ? 'text-black' : 'text-[#2C2C2E]'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Candle cylinder with flame matching screenshot */}
          <rect x="7" y="10" width="10" height="11" rx="2" />
          <line x1="12" y1="7" x2="12" y2="10" />
          <path d="M12 2c-1.5 2-2.5 3-2.5 4.5a2.5 2.5 0 0 0 5 0C14.5 5 13.5 4 12 2z" />
        </svg>
      )
    },
    {
      id: 'calm',
      name: 'Calm',
      prompt:
        'Serene French lavender blossoms, soothing lotus water, and gentle evening chamomile mist...',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          className={`w-6 h-6 transition-colors ${
            active ? 'text-black' : 'text-[#2C2C2E]'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Botanical sprig / lavender loops matching screenshot */}
          <path d="M12 22V8" />
          <path d="M8 12c-2.5 0-4-1.5-4-3.5S5.5 5 8 5c1 0 2 .5 2.5 1.5C11 5.5 12 5 13 5c2.5 0 4 1.5 4 3.5s-1.5 3.5-4 3.5" />
          <path d="M9 17c-2 0-3-1-3-2.5s1-2.5 3-2.5" />
          <path d="M15 17c2 0 3-1 3-2.5s-1-2.5-3-2.5" />
        </svg>
      )
    }
  ];

  const handleSelectPreset = (preset: PresetItem) => {
    setSelectedPreset(preset.id);
    setPrompt(preset.prompt);
    setIsEditingPrompt(false);
  };

  const handleCreateBlend = async (customPrompt?: string) => {
    const textToUse = (typeof customPrompt === 'string' ? customPrompt : prompt).trim();
    if (!textToUse || synthesizing) return;
    setSynthesizing(true);
    setErrorMessage(null);
    stopSpeaking();
    setIsVoiceSpeaking(false);

    try {
      const result = await generateAromaExperience(textToUse);
      setSynthesizing(false);

      let blend: ValidatedAiExperience | null = null;
      if (result.success && result.blend) {
        blend = result.blend;
      } else {
        blend = synthesizeAromaLocally(textToUse);
      }

      setCreatedBlend(blend);
      setShowResultSheet(true);

      const spokenText =
        blend.spokenResponse ||
        `Crafting ${blend.title}. ${blend.description}`;

      speakAromaInsight(spokenText, {
        onStart: () => setIsVoiceSpeaking(true),
        onEnd: () => setIsVoiceSpeaking(false),
        onError: () => setIsVoiceSpeaking(false)
      });
    } catch {
      setSynthesizing(false);
      const local = synthesizeAromaLocally(textToUse);
      setCreatedBlend(local);
      setShowResultSheet(true);

      const spokenText =
        local.spokenResponse ||
        `Crafting ${local.title}. ${local.description}`;

      speakAromaInsight(spokenText, {
        onStart: () => setIsVoiceSpeaking(true),
        onEnd: () => setIsVoiceSpeaking(false),
        onError: () => setIsVoiceSpeaking(false)
      });
    }
  };

  const handleVoicePromptSubmit = (spokenText: string) => {
    setPrompt(spokenText);
    setIsVoiceModalOpen(false);
    handleCreateBlend(spokenText);
  };

  // Stop speaking when navigating away
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleDiffuseCreatedBlend = async () => {
    if (!createdBlend) return;
    stopSpeaking();
    setIsVoiceSpeaking(false);
    await startSession({
      title: createdBlend.title,
      type: 'text',
      channels: createdBlend.channels,
      durationSeconds: createdBlend.durationSeconds || 180,
      light: createdBlend.light,
      batchId: createdBlend.batchId || '#48-A',
      profileName: createdBlend.description
    });
    setShowResultSheet(false);
    onOpenLiveSession();
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between max-w-[420px] mx-auto px-6 py-2 select-none">
      {/* Upper Content Section */}
      <div className="flex flex-col">
        {/* Main Title matching the screenshot */}
        <div className="pt-6 pb-6">
          <h2 className="text-[34px] sm:text-[38px] font-bold text-[#111111] leading-[1.12] tracking-tight">
            What would you
            <br />
            like to smell?
          </h2>
        </div>

        {/* Prompt Card with Integrated Send Button */}
        <div className="relative w-full rounded-[26px] bg-[#F4F5F7] dark:bg-zinc-800 border border-black/[0.04] dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 transition-all">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreateBlend();
              }
            }}
            rows={3}
            className="w-full bg-transparent text-[#2C2C2E] dark:text-[#F4F4F5] text-[15px] leading-relaxed resize-none focus:outline-none placeholder:text-neutral-400 font-sans pb-10"
            placeholder="Describe any scent, memory, atmosphere, or place..."
          />

          <div className="absolute right-3.5 bottom-3.5 flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
              {prompt.length} chars
            </span>

            {/* Google Voice Mic Button */}
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              aria-label="Search by voice"
              title="Voice Search: tap to speak what you'd like to smell"
              className="w-10 h-10 rounded-full bg-white dark:bg-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-600 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-xs border border-black/5 dark:border-white/10 group relative"
            >
              <span className="material-symbols-outlined text-[20px] text-[#4285F4] group-hover:scale-110 transition-transform">
                mic
              </span>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </button>

            {/* Synthesize Button */}
            <button
              type="button"
              onClick={() => handleCreateBlend()}
              disabled={synthesizing || !prompt.trim()}
              aria-label="Synthesize aroma blend"
              className="w-10 h-10 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-35 shadow-sm"
            >
              {synthesizing ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <span className="material-symbols-outlined text-[19px]">
                  arrow_upward
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Section: HARMONIOUS PRESETS */}
        <div className="mt-8">
          <span className="text-[11px] font-bold tracking-[0.08em] text-[#8E8E93] uppercase font-sans">
            HARMONIOUS PRESETS
          </span>

          {/* Presets Horizontal Row */}
          <div className="grid grid-cols-6 gap-2 sm:gap-2.5 mt-3">
            {presets.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full aspect-[1/1.12] rounded-[18px] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-[#E3E5E9] ring-1.5 ring-black/20 shadow-xs'
                      : 'bg-[#EBECEF] hover:bg-[#E3E5E9]/80'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {preset.icon(isSelected)}
                  </div>
                  <span
                    className={`text-[11.5px] font-medium leading-none ${
                      isSelected ? 'text-black font-semibold' : 'text-[#3A3A3C]'
                    }`}
                  >
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message notification if any */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-[13px] rounded-2xl border border-red-200">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Bottom Area: Explore Blends Link */}
      <div className="pt-8 pb-28 sm:pb-32 flex flex-col items-center gap-3 w-full">
        <button
          type="button"
          onClick={onOpenBlends}
          className="text-[#0071E3] hover:text-[#0077ED] active:opacity-70 text-[14px] font-medium tracking-tight cursor-pointer transition-colors flex items-center gap-1"
        >
          <span>Explore Formula Blends</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>

      {/* Blend Formulated Slide-Up Sheet Modal */}
      <AnimatePresence>
        {showResultSheet && createdBlend && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 120, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 120, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl flex flex-col gap-5 border border-black/5"
            >
              {/* Sheet Drag Handle */}
              <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto sm:hidden" />

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                    Formula Synthesized
                  </span>
                  <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight mt-0.5">
                    {createdBlend.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResultSheet(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Description */}
              <p className="text-[14px] text-neutral-600 leading-relaxed bg-[#F7F8F9] p-3.5 rounded-2xl border border-black/5">
                {createdBlend.description}
              </p>

              {/* Spoken Voice Insight */}
              {createdBlend.spokenResponse && (
                <div className="flex items-start gap-3 p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-zinc-800 dark:to-zinc-800 rounded-2xl border border-blue-100 dark:border-white/10">
                  <div className="w-8 h-8 rounded-full bg-[#4285F4] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <span className="material-symbols-outlined text-[17px]">
                      {isVoiceSpeaking ? 'volume_up' : 'campaign'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#4285F4] uppercase tracking-wider">
                          AROMAX Voice
                        </span>
                        {isVoiceSpeaking && (
                          <div className="flex items-center gap-0.5 ml-1">
                            <span className="w-1 h-3 rounded-full bg-[#4285F4] animate-pulse" />
                            <span className="w-1 h-4 rounded-full bg-[#EA4335] animate-pulse [animation-delay:100ms]" />
                            <span className="w-1 h-2 rounded-full bg-[#FBBC05] animate-pulse [animation-delay:200ms]" />
                            <span className="w-1 h-3.5 rounded-full bg-[#34A853] animate-pulse [animation-delay:300ms]" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (isVoiceSpeaking) {
                            stopSpeaking();
                            setIsVoiceSpeaking(false);
                          } else {
                            speakAromaInsight(createdBlend.spokenResponse || createdBlend.description, {
                              onStart: () => setIsVoiceSpeaking(true),
                              onEnd: () => setIsVoiceSpeaking(false),
                              onError: () => setIsVoiceSpeaking(false)
                            });
                          }
                        }}
                        className="text-[11.5px] font-semibold text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isVoiceSpeaking ? 'stop' : 'replay'}
                        </span>
                        <span>{isVoiceSpeaking ? 'Stop' : 'Replay'}</span>
                      </button>
                    </div>
                    <p className="text-[13px] text-neutral-700 dark:text-neutral-200 mt-1 italic leading-relaxed">
                      "{createdBlend.spokenResponse}"
                    </p>
                  </div>
                </div>
              )}

              {/* Channel Port Allocation */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Hardware Port Allocation (34-Channel Matrix)
                </span>
                <div className="space-y-1.5">
                  {createdBlend.channels.map((ch) => {
                    const def = CHANNEL_MAP[ch.channelId];
                    const pct = Math.round((ch.intensity || 0.5) * 100);
                    return (
                      <div
                        key={ch.channelId}
                        className="flex items-center justify-between text-[13px] bg-neutral-50 px-3 py-2 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-600 text-[12px]">
                            {ch.channelId}
                          </span>
                          <span className="text-neutral-800 font-medium">
                            {def?.name || ch.channelId}
                          </span>
                        </div>
                        <span className="font-mono text-neutral-500 font-semibold">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Luminescence preview */}
              {createdBlend.light && (
                <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-xl text-[12px]">
                  <span className="text-neutral-600 font-medium">
                    Ambient LED Sync
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                      style={{
                        backgroundColor: `rgb(${createdBlend.light.r}, ${createdBlend.light.g}, ${createdBlend.light.b})`
                      }}
                    />
                    <span className="font-mono text-neutral-500 text-[11px]">
                      rgb({createdBlend.light.r},{createdBlend.light.g},{createdBlend.light.b})
                    </span>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDiffuseCreatedBlend}
                  className="w-full h-13 rounded-full bg-black hover:bg-neutral-900 active:scale-[0.98] text-white font-medium text-[15px] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.18)] cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Diffuse Now (Start Scent)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResultSheet(false);
                    onOpenBlends();
                  }}
                  className="w-full h-11 rounded-full text-neutral-600 hover:text-black font-medium text-[14px] flex items-center justify-center cursor-pointer"
                >
                  Browse Master Library
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Voice Modal with pause detection */}
      <GoogleVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSubmitPrompt={handleVoicePromptSubmit}
      />
    </div>
  );
};
