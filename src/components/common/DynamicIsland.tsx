import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useActiveSession } from '../../hooks/useActiveSession';
import { videoScentEngine } from '../../services/video/videoEngine';
import { VideoDemo, VideoScentEvent } from '../../types/video';

interface DynamicIslandProps {
  onOpenLiveSession?: () => void;
  isOverlayOpen?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  onOpenLiveSession,
  isOverlayOpen = false,
  onExpandedChange
}) => {
  // 1. Regular Aroma Session State (Create / Blends / Therapy / Hardware)
  const {
    active: isSessionActive,
    paused: isSessionPaused,
    isPurging,
    purgeRemainingSeconds,
    experienceTitle,
    channels,
    light,
    formattedRemaining,
    progressPercent,
    pauseSession,
    resumeSession,
    stopSession,
    startPurge
  } = useActiveSession();

  // 2. Video Cinema Engine State (Video playback, synchronized scents & timeline)
  const [videoState, setVideoState] = useState<{
    isPlaying: boolean;
    currentTimeSeconds: number;
    durationSeconds: number;
    activeEvent: VideoScentEvent | null;
    video: VideoDemo | null;
  }>({
    isPlaying: false,
    currentTimeSeconds: 0,
    durationSeconds: 0,
    activeEvent: null,
    video: null
  });

  useEffect(() => {
    const unsubscribe = videoScentEngine.subscribe((state) => {
      setVideoState({
        isPlaying: state.isPlaying,
        currentTimeSeconds: state.currentTimeSeconds,
        durationSeconds: state.durationSeconds,
        activeEvent: state.activeEvent,
        video: state.video
      });
    });
    return () => unsubscribe();
  }, []);

  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSliderRef = useRef(false);

  // Notify parent of expansion state
  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  // When fullscreen overlay opens, collapse island immediately
  useEffect(() => {
    if (isOverlayOpen) {
      setIsExpanded(false);
    }
  }, [isOverlayOpen]);

  // Click outside to collapse island with authentic iPhone physics
  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      if (isDraggingSliderRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDownOutside, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside, { capture: true });
    };
  }, [isExpanded]);

  // Format mm:ss
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const remainder = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  // Determine current active mode
  // 1. Video mode is active ONLY when the video is actively playing
  const isVideoMode = Boolean(videoState.video && videoState.isPlaying);

  // 2. Aroma mode is active whenever an aroma session is running (Therapy, Blends, Create, Device) or purging
  const isAromaMode = Boolean(isSessionActive || isPurging);

  // Dynamic Island is visible when video is actively playing OR aroma is diffusing
  const isIslandVisible = isVideoMode || isAromaMode;

  // Scent Glow Accent Color
  const currentLight = isVideoMode
    ? videoState.activeEvent?.light
    : light;

  const scentColor = isPurging
    ? '#22D3EE'
    : currentLight
    ? `rgb(${currentLight.r}, ${currentLight.g}, ${currentLight.b})`
    : '#10B981';

  // Video multi-smell label
  const videoSmellLabel = videoState.activeEvent
    ? videoState.activeEvent.channelDetails && videoState.activeEvent.channelDetails.length > 0
      ? videoState.activeEvent.channelDetails.map((d) => d.smellName || d.channelId).join(' + ')
      : videoState.activeEvent.smellName || videoState.activeEvent.title
    : 'Atmospheric Aroma';

  // Video slider seeking helper
  const handleSliderSeek = useCallback((clientX: number, rect: DOMRect) => {
    if (!videoState.durationSeconds || videoState.durationSeconds <= 0) return;
    const clickX = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = Math.round(pct * videoState.durationSeconds);

    window.dispatchEvent(
      new CustomEvent('aromaxai:seek-video', {
        detail: { time: targetSeconds }
      })
    );
    videoScentEngine.seek(targetSeconds);
  }, [videoState.durationSeconds]);

  // Video play/pause toggle
  const handleToggleVideoPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoState.isPlaying) {
      window.dispatchEvent(new CustomEvent('aromaxai:seek-video', { detail: { action: 'pause' } }));
      videoScentEngine.pause();
    } else {
      window.dispatchEvent(new CustomEvent('aromaxai:seek-video', { detail: { action: 'play' } }));
      videoScentEngine.play();
    }
  };

  // Video stop
  const handleStopVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('aromaxai:seek-video', { detail: { action: 'stop' } }));
    videoScentEngine.stop();
  };

  const handleIslandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  // Video progress percentage
  const videoProgressPercent = videoState.durationSeconds > 0
    ? (videoState.currentTimeSeconds / videoState.durationSeconds) * 100
    : 0;

  return (
    <>
      {/* Transparent touch shield when expanded: closes on outside tap */}
      {isIslandVisible && isExpanded && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className="fixed inset-0 z-40 bg-transparent cursor-default pointer-events-auto"
          aria-hidden="true"
        />
      )}

      {/* Floating iPhone Dynamic Island Hardware Cutout */}
      <div
        ref={containerRef}
        className="fixed top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none"
      >
        <AnimatePresence>
          {isIslandVisible && (
            <motion.div
              key="dynamic-island-shell"
              initial={{
                scale: 0.6,
                opacity: 0,
                y: -14,
                filter: 'blur(8px)'
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                transition: {
                  type: 'spring',
                  stiffness: 550,
                  damping: 32,
                  mass: 0.5
                }
              }}
              exit={{
                scale: 0.4,
                opacity: 0,
                y: -16,
                filter: 'blur(10px)',
                transition: {
                  duration: 0.16
                }
              }}
              className="origin-top flex items-center justify-center"
            >
              {/* iPhone 16 Pro Deep Jet Black OLED Capsule (Color preserved as black) */}
              <motion.div
                onClick={handleIslandClick}
                whileTap={{ scale: isExpanded ? 0.99 : 0.95 }}
                animate={{
                  width: isExpanded ? 362 : isVideoMode ? 245 : 220,
                  height: isExpanded ? (isVideoMode ? 175 : 155) : 38,
                  borderRadius: isExpanded ? 36 : 22
                }}
                transition={{
                  type: 'spring',
                  stiffness: 480,
                  damping: 32,
                  mass: 0.65
                }}
                className="bg-black text-white relative overflow-hidden ring-1 ring-white/15 shadow-[0_22px_60px_rgba(0,0,0,0.9),0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer"
                style={{
                  willChange: 'width, height, border-radius',
                  maxWidth: 'calc(100vw - 24px)'
                }}
              >
                {/* Specular glass reflection along top curve */}
                <div className="absolute top-0 inset-x-0 h-[1.2px] bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none z-30" />

                {/* Ambient Scent Glow Bleeding in OLED Black when active */}
                <div
                  className="absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-25 pointer-events-none transition-colors duration-500"
                  style={{ backgroundColor: scentColor }}
                />

                {/* ========================================================= */}
                {/* 1. COMPACT ISLAND STATE (MINIMAL IPHONE PILL)             */}
                {/* ========================================================= */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: !isExpanded ? 1 : 0,
                    scale: !isExpanded ? 1 : 0.88,
                    pointerEvents: !isExpanded ? 'auto' : 'none'
                  }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  className="absolute inset-0 flex items-center justify-between px-3 z-20 h-[38px]"
                >
                  {/* Left Side: Glowing Droplet & Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Glowing Emitter Orb */}
                    <div className="relative flex items-center justify-center w-3 h-3 shrink-0">
                      <span
                        className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] transition-colors duration-300"
                        style={{ backgroundColor: scentColor, color: scentColor }}
                      />
                      <span
                        className="absolute w-3.5 h-3.5 rounded-full animate-ping opacity-45"
                        style={{ backgroundColor: scentColor }}
                      />
                    </div>

                    {/* Rising Vapor Wisps */}
                    <div className="flex items-center gap-[2px] shrink-0">
                      {[0, 1].map((i) => (
                        <motion.svg
                          key={i}
                          className="w-1.5 h-3"
                          viewBox="0 0 6 12"
                          fill="none"
                          animate={{
                            y: [0, -1.8, 0],
                            opacity: [0.35, 1, 0.35],
                            transition: {
                              duration: 1.2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: i * 0.25
                            }
                          }}
                        >
                          <path
                            d="M 3 11 C 1.5 8.5, 4.5 5.5, 3 3 C 2 1.5, 3 0, 3 0"
                            stroke={scentColor}
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </motion.svg>
                      ))}
                    </div>

                    {/* Diffusing Smell / Video Name */}
                    <span className="text-[12px] font-semibold text-white/95 truncate max-w-[115px]">
                      {isPurging
                        ? 'Chamber Purge'
                        : isVideoMode
                        ? videoSmellLabel
                        : experienceTitle || 'Petrichor Mist'}
                    </span>
                  </div>

                  {/* Right Side: Remaining Time & Mini Status */}
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] font-semibold text-white/90">
                    {isPurging ? (
                      <span className="text-cyan-400 font-bold px-1.5 py-0.5 bg-cyan-950/60 rounded-full border border-cyan-500/25 text-[10px]">
                        {purgeRemainingSeconds ?? 6}s
                      </span>
                    ) : isVideoMode ? (
                      <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/5">
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {videoState.isPlaying ? '▶' : '⏸'}
                        </span>
                        <span>{formatTime(videoState.currentTimeSeconds)}</span>
                      </div>
                    ) : (
                      <div className="bg-white/10 px-2 py-0.5 rounded-full border border-white/5">
                        <span>{formattedRemaining}</span>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* ========================================================= */}
                {/* 2. EXPANDED ISLAND STATE                                  */}
                {/* ========================================================= */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isExpanded ? 1 : 0,
                    scale: isExpanded ? 1 : 0.9,
                    y: isExpanded ? 0 : -6,
                    pointerEvents: isExpanded ? 'auto' : 'none'
                  }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute inset-0 w-[362px] p-4 flex flex-col justify-between z-10"
                >
                  {/* CASE A: VIDEO CINEMA MODE ISLAND */}
                  {isVideoMode ? (
                    <>
                      {/* Top Row: Video Title & Live Diffusing Smell */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13.5px] font-bold text-white truncate leading-tight">
                            {videoState.video?.title || 'YouTube Cinema'}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_6px_currentColor] shrink-0"
                              style={{ backgroundColor: scentColor, color: scentColor }}
                            />
                            <span className="text-[11.5px] font-medium text-emerald-400 truncate">
                              Diffusing: {videoSmellLabel}
                            </span>
                          </div>
                        </div>

                        {/* Current Time / Total */}
                        <div className="font-mono text-[12px] font-semibold text-neutral-300 shrink-0 bg-white/10 px-2 py-1 rounded-lg">
                          <span>{formatTime(videoState.currentTimeSeconds)}</span>
                          <span className="text-neutral-500"> / </span>
                          <span className="text-neutral-400">{formatTime(videoState.durationSeconds)}</span>
                        </div>
                      </div>

                      {/* Middle Row: Interactive Working Video Slider (Scrubber) */}
                      <div className="flex flex-col gap-1.5 py-1">
                        <div
                          onPointerDown={(e) => {
                            isDraggingSliderRef.current = true;
                            const rect = e.currentTarget.getBoundingClientRect();
                            handleSliderSeek(e.clientX, rect);

                            const handlePointerMove = (me: PointerEvent) => {
                              handleSliderSeek(me.clientX, rect);
                            };
                            const handlePointerUp = () => {
                              isDraggingSliderRef.current = false;
                              window.removeEventListener('pointermove', handlePointerMove);
                              window.removeEventListener('pointerup', handlePointerUp);
                            };
                            window.addEventListener('pointermove', handlePointerMove);
                            window.addEventListener('pointerup', handlePointerUp);
                          }}
                          className="relative w-full h-3 bg-white/15 hover:bg-white/20 rounded-full cursor-pointer overflow-hidden flex items-center transition-all group"
                        >
                          {/* Elapsed progress fill */}
                          <div
                            className="h-full rounded-full transition-all duration-75"
                            style={{
                              width: `${Math.min(100, Math.max(0, videoProgressPercent))}%`,
                              background: 'linear-gradient(90deg, #10B981, #34C759)'
                            }}
                          />
                          {/* Draggable Thumb Knob */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] pointer-events-none transition-transform group-hover:scale-125"
                            style={{
                              left: `calc(${Math.min(100, Math.max(0, videoProgressPercent))}% - 7px)`
                            }}
                          />
                        </div>
                      </div>

                      {/* Bottom Row: Exact Controls Requested: Pause, Stop, Purge */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Pause / Play Button */}
                        <button
                          type="button"
                          onClick={handleToggleVideoPlay}
                          className="py-2 px-3 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white shadow-xs cursor-pointer border border-white/10"
                        >
                          <span className="material-symbols-outlined text-[17px] text-amber-400">
                            {videoState.isPlaying ? 'pause' : 'play_arrow'}
                          </span>
                          <span>{videoState.isPlaying ? 'Pause' : 'Play'}</span>
                        </button>

                        {/* Stop Button */}
                        <button
                          type="button"
                          onClick={handleStopVideo}
                          className="py-2 px-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[12px] font-semibold text-red-300 shadow-xs cursor-pointer border border-red-500/25"
                        >
                          <span className="material-symbols-outlined text-[17px]">stop</span>
                          <span>Stop</span>
                        </button>

                        {/* Purge Button */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await startPurge(6);
                          }}
                          className="py-2 px-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[12px] font-semibold text-cyan-300 shadow-xs cursor-pointer border border-cyan-500/25"
                        >
                          <span className="material-symbols-outlined text-[17px]">mode_fan</span>
                          <span>Purge</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* CASE B: STANDARD AROMA DIFFUSION SESSION ISLAND */
                    <>
                      {/* Top Row: Name of Smell Diffusing & Remaining Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-[14px] font-bold text-white truncate leading-tight">
                            {isPurging
                              ? 'Chamber Flush Active'
                              : experienceTitle || 'Atmospheric Petrichor'}
                          </span>
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isPurging ? 'Clearing scent chambers' : isSessionPaused ? 'Aroma Paused' : 'Diffusing Now'}
                          </span>
                        </div>

                        {/* Remaining Time */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="font-mono text-[16px] font-bold text-white tracking-tight">
                            {isPurging ? `${purgeRemainingSeconds ?? 6}s` : formattedRemaining}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-neutral-400">
                            Remaining
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Clean Sleek Progress Bar */}
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden my-1">
                        <motion.div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: isPurging
                              ? `${100 - ((purgeRemainingSeconds ?? 6) / 6) * 100}%`
                              : `${progressPercent}%`,
                            background: isPurging
                              ? 'linear-gradient(90deg, #06B6D4, #22D3EE)'
                              : 'linear-gradient(90deg, #10B981, #34C759)'
                          }}
                        />
                      </div>

                      {/* Bottom Row: Exact Controls Requested: Pause, Stop, Purge */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Pause / Resume Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSessionPaused) resumeSession();
                            else pauseSession();
                          }}
                          disabled={isPurging}
                          className="py-2 px-3 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white shadow-xs cursor-pointer border border-white/10 disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[17px] text-amber-400">
                            {isSessionPaused ? 'play_arrow' : 'pause'}
                          </span>
                          <span>{isSessionPaused ? 'Resume' : 'Pause'}</span>
                        </button>

                        {/* Stop Button */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await stopSession(false);
                          }}
                          className="py-2 px-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[12px] font-semibold text-red-300 shadow-xs cursor-pointer border border-red-500/25"
                        >
                          <span className="material-symbols-outlined text-[17px]">stop</span>
                          <span>Stop</span>
                        </button>

                        {/* Purge Button */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await startPurge(6);
                          }}
                          className="py-2 px-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-[12px] font-semibold text-cyan-300 shadow-xs cursor-pointer border border-cyan-500/25"
                        >
                          <span className="material-symbols-outlined text-[17px]">mode_fan</span>
                          <span>Purge</span>
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
