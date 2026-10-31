import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { YouTubeCinemaPlayer } from '../video/YouTubeCinemaPlayer';
import {
  CURATED_YOUTUBE_VIDEOS,
  extractYouTubeId,
  generateAiSmellTrackForVideo,
  fetchYouTubeVideoInfo,
  enrichVideoScentEvent,
  normalizeVideoScentTimeline,
  rescaleTimelineToDuration
} from '../../services/video/youtubeScentService';
import { videoScentEngine } from '../../services/video/videoEngine';
import { VideoDemo, VideoScentEvent } from '../../types/video';
import { useDevice } from '../../hooks/useDevice';
import { useCartridges } from '../../hooks/useCartridges';
import { motion, AnimatePresence } from 'motion/react';

interface CinemaScreenProps {
  onOpenLiveSession?: () => void;
}

export const CinemaScreen: React.FC<CinemaScreenProps> = () => {
  const { connected } = useDevice();
  const { channelMap } = useCartridges();

  // Active video selection
  const [selectedVideo, setSelectedVideo] = useState<VideoDemo>(() => {
    const base = CURATED_YOUTUBE_VIDEOS[0];
    return {
      ...base,
      events: normalizeVideoScentTimeline(base.events, base.durationSeconds)
    };
  });

  // Custom YouTube URL input
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customInputError, setCustomInputError] = useState<string | null>(null);
  const [isGeneratingAiScript, setIsGeneratingAiScript] = useState(false);

  // Engine state synced with video player
  const [engineState, setEngineState] = useState({
    isPlaying: false,
    currentTimeSeconds: 0,
    durationSeconds: CURATED_YOUTUBE_VIDEOS[0].durationSeconds,
    activeEvent: null as VideoScentEvent | null,
    queuedEvents: [] as VideoScentEvent[],
    video: null as VideoDemo | null
  });

  // Monotonic generation request ID to cancel older in-flight requests
  const generationReqIdRef = useRef(0);
  const activeVideoIdRef = useRef(selectedVideo.id);
  activeVideoIdRef.current = selectedVideo.id;

  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Effective video duration: strictly prioritizes the current selectedVideo duration,
  // preventing stale previous video durations from leaking into a new video
  const effectiveDuration = Math.max(
    5,
    selectedVideo.durationSeconds > 0
      ? selectedVideo.durationSeconds
      : (engineState.durationSeconds > 0 ? engineState.durationSeconds : 15)
  );

  // Subscribe to scent engine
  useEffect(() => {
    videoScentEngine.loadVideo(selectedVideo);

    const unsubscribe = videoScentEngine.subscribe((state) => {
      setEngineState(state);
    });

    return () => {
      unsubscribe();
      videoScentEngine.stop();
    };
  }, [selectedVideo]);

  // Handle seeking by clicking on timeline pins or timestamp rows
  const handleSeekToCue = useCallback((seconds: number) => {
    window.dispatchEvent(
      new CustomEvent('aromaxai:seek-video', {
        detail: { time: seconds }
      })
    );
  }, []);

  // AI smell track generation strictly tied to the exact video duration
  const generateScentsForTargetDuration = useCallback(
    async (video: VideoDemo, targetDuration: number) => {
      const thisReqId = ++generationReqIdRef.current;
      setIsGeneratingAiScript(true);
      setCustomInputError(null);

      try {
        const exactDuration = Math.max(5, Math.round(targetDuration));
        const result = await generateAiSmellTrackForVideo(
          video.title,
          video.description || 'Atmospheric cinematic sensory narrative',
          exactDuration,
          video.youtubeId
        );

        // Check if a newer request was dispatched while this was running
        if (thisReqId !== generationReqIdRef.current) {
          return;
        }

        if (result && Array.isArray(result.events) && result.events.length > 0) {
          const enrichedEvents = result.events.map((ev) => enrichVideoScentEvent(ev));
          const updated: VideoDemo = {
            ...video,
            durationSeconds: exactDuration,
            events: enrichedEvents,
            visualAnalysis: result.visualAnalysis,
            summary: result.summary,
            subtitle: `${enrichedEvents.length} Smells • ${formatTime(exactDuration)}`
          };

          setSelectedVideo(updated);
          videoScentEngine.loadVideo(updated);
        }
      } catch (err: any) {
        if (thisReqId === generationReqIdRef.current) {
          console.warn('AI scent generation error:', err);
          setCustomInputError('Failed to generate smells for this video duration.');
        }
      } finally {
        if (thisReqId === generationReqIdRef.current) {
          setIsGeneratingAiScript(false);
        }
      }
    },
    []
  );

  // Called immediately when YouTube player or direct video reports true video length
  const handleDurationDetected = useCallback(
    (detectedDuration: number) => {
      if (!detectedDuration || detectedDuration <= 0) return;
      const trueDuration = Math.max(5, Math.round(detectedDuration));

      setSelectedVideo((prev) => {
        // Check if this is a curated narrative (e.g. Cheeni Kum) with cinema-mastered cues
        const isCurated = CURATED_YOUTUBE_VIDEOS.some(
          (cv) => cv.youtubeId === prev.youtubeId || cv.id === prev.id
        );

        if (isCurated) {
          return prev;
        }

        // If duration already matches within 1 second, keep current state
        if (Math.abs(prev.durationSeconds - trueDuration) <= 1 && prev.events.length > 0) {
          return prev;
        }

        // Trigger AI smell synthesis for the exact true duration
        generateScentsForTargetDuration({ ...prev, durationSeconds: trueDuration }, trueDuration);

        // Meanwhile, rescale any existing events to the true duration so there is never a bunching glitch
        const rescaled = prev.events.length > 0
          ? rescaleTimelineToDuration(prev.events, trueDuration, prev.durationSeconds)
          : [];

        return {
          ...prev,
          durationSeconds: trueDuration,
          events: rescaled
        };
      });
    },
    [generateScentsForTargetDuration]
  );

  // Load custom YouTube URL
  const handleLoadCustomYouTube = async () => {
    if (!customUrlInput.trim()) return;
    setCustomInputError(null);

    const inputRaw = customUrlInput.trim();
    const ytId = extractYouTubeId(inputRaw);
    if (!ytId) {
      setCustomInputError('Invalid YouTube URL or ID. Please check the link.');
      return;
    }

    // Extract any user notes accompanying the URL (e.g. "https://youtu.be/... Burger and Biryani feast")
    const extractedNotes = inputRaw.replace(/(https?:\/\/[^\s]+)/g, '').trim();

    // Increment request ID to cancel any in-flight generation from previous video
    generationReqIdRef.current++;

    // Immediately stop previous video scent emission and clear previous state
    videoScentEngine.stop();
    setEngineState({
      isPlaying: false,
      currentTimeSeconds: 0,
      durationSeconds: 0,
      activeEvent: null,
      queuedEvents: [],
      video: null
    });

    setIsGeneratingAiScript(true);

    try {
      const videoInfo = await fetchYouTubeVideoInfo(ytId);
      const title = videoInfo?.title || `YouTube Video (${ytId})`;
      const thumbnail = videoInfo?.thumbnail || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
      const description = extractedNotes || 'Atmospheric cinematic sensory narrative';

      const newVideo: VideoDemo = {
        id: `custom-yt-${ytId}-${Date.now()}`,
        youtubeId: ytId,
        title,
        subtitle: 'Detecting video duration & pacing smells...',
        durationSeconds: 0, // Will be set by handleDurationDetected
        thumbnailUrl: thumbnail,
        tags: ['Custom YouTube'],
        description,
        events: []
      };

      setSelectedVideo(newVideo);
      setCustomUrlInput('');

      // Fallback timer: if duration callback doesn't fire within 3.5s, default to 60s
      setTimeout(() => {
        setSelectedVideo((curr) => {
          if (curr.youtubeId === ytId && curr.events.length === 0) {
            const fallbackDur = curr.durationSeconds > 0 ? curr.durationSeconds : 60;
            generateScentsForTargetDuration(curr, fallbackDur);
          }
          return curr;
        });
      }, 3500);
    } catch {
      setIsGeneratingAiScript(false);
      setCustomInputError('Failed to load YouTube video.');
    }
  };

  const progressPercent =
    effectiveDuration > 0
      ? (engineState.currentTimeSeconds / effectiveDuration) * 100
      : 0;

  // Enrich current active event
  const currentEvent = engineState.activeEvent ? enrichVideoScentEvent(engineState.activeEvent) : null;

  // Memoize enriched events for the selected video
  const enrichedVideoEvents = useMemo(() => {
    return normalizeVideoScentTimeline(selectedVideo.events, effectiveDuration);
  }, [selectedVideo.events, effectiveDuration]);

  // Helper to format multi-scent names (up to 3 simultaneous smells)
  const getMultiScentLabel = (ev: VideoScentEvent) => {
    if (ev.channelDetails && ev.channelDetails.length > 0) {
      return ev.channelDetails
        .slice(0, 3)
        .map((d) => d.smellName || channelMap[d.channelId]?.name || d.channelId)
        .join(' + ');
    }
    if (ev.channels && ev.channels.length > 1) {
      return ev.channels
        .slice(0, 3)
        .map((chId) => channelMap[chId]?.name || chId)
        .join(' + ');
    }
    return ev.smellName || ev.title;
  };

  return (
    <div className="flex flex-col gap-5 py-2 max-w-lg mx-auto w-full select-none">
      {/* Title Header */}
      <div className="pt-2 px-1 flex items-center justify-between">
        <h1 className="text-[32px] sm:text-[34px] font-bold tracking-tight text-[#1D1D1F] dark:text-white leading-tight">
          Smell the Story
        </h1>
      </div>

      {/* YouTube URL Input Bar (Zero Downloads / Zero Uploads) */}
      <div className="flex flex-col gap-2 bg-white dark:bg-zinc-900 p-2.5 rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-xs">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoadCustomYouTube();
              }}
              placeholder="Paste any YouTube link (e.g. youtube.com/watch?v=...)"
              className="w-full bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-white placeholder:text-[#86868B] dark:placeholder:text-neutral-500 text-[13px] px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-red-500/20 font-sans"
            />
          </div>
          <button
            type="button"
            onClick={handleLoadCustomYouTube}
            disabled={isGeneratingAiScript || !customUrlInput.trim()}
            aria-label="Send YouTube link and sync smells"
            className="w-10 h-10 rounded-xl bg-[#1D1D1F] hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black flex items-center justify-center transition-all cursor-pointer disabled:opacity-35 shrink-0 shadow-xs active:scale-95"
          >
            {isGeneratingAiScript ? (
              <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <span className="material-symbols-outlined text-[19px]">
                arrow_forward
              </span>
            )}
          </button>
        </div>

        {customInputError && (
          <p className="text-[11.5px] text-red-600 px-1 font-medium">{customInputError}</p>
        )}
      </div>

      {/* Pure Video Player */}
      <div className="flex flex-col gap-2">
        <YouTubeCinemaPlayer
          youtubeId={selectedVideo.youtubeId}
          videoUrl={selectedVideo.videoUrl}
          videoDuration={selectedVideo.durationSeconds}
          activeEvent={currentEvent}
          videoTitle={selectedVideo.title}
          onDurationDetected={handleDurationDetected}
          onTimeUpdate={(cur, dur) => {
            if (dur && dur > 0 && Math.abs(selectedVideo.durationSeconds - dur) > 1.5) {
              handleDurationDetected(dur);
            }
          }}
        />

        {/* Video Title & Time Display */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] truncate">
              {selectedVideo.title}
            </span>
            {currentEvent && engineState.isPlaying ? (
              <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Diffusing: {getMultiScentLabel(currentEvent)}</span>
              </span>
            ) : (
              <span className="text-[12px] text-[#86868B] dark:text-[#A1A1AA] truncate">
                {selectedVideo.subtitle || `${enrichedVideoEvents.length} Smells Synced`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 font-mono text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] shrink-0 bg-neutral-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
            <span>{formatTime(engineState.currentTimeSeconds)}</span>
            <span className="text-neutral-400">/</span>
            <span className="text-neutral-500">{formatTime(effectiveDuration)}</span>
          </div>
        </div>
      </div>

      {/* Scent Timeline */}
      <div className="flex flex-col gap-2.5 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/10 shadow-xs">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
          <span>Scent Timeline</span>
          <span className="text-black dark:text-white font-mono">
            {enrichedVideoEvents.length} {enrichedVideoEvents.length === 1 ? 'Scene' : 'Scenes'} ({formatTime(effectiveDuration)})
          </span>
        </div>

        {/* Scrub Bar with Markers */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            const targetTime = Math.round(pct * effectiveDuration);
            handleSeekToCue(targetTime);
          }}
          className="relative w-full h-3.5 bg-neutral-100 dark:bg-zinc-800 rounded-full cursor-pointer overflow-hidden flex items-center"
        >
          {/* Playhead progress */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-neutral-800 dark:bg-neutral-200 transition-all duration-150 pointer-events-none"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />

          {/* Scent Event Pins */}
          {enrichedVideoEvents.map((ev) => {
            const leftPercent = Math.min(
              95,
              Math.max(0, (ev.timeSeconds / effectiveDuration) * 100)
            );
            const widthPercent = Math.max(
              3,
              Math.min(100 - leftPercent, (ev.durationSeconds / effectiveDuration) * 100)
            );
            const isActive =
              engineState.currentTimeSeconds >= ev.timeSeconds &&
              engineState.currentTimeSeconds < ev.timeSeconds + ev.durationSeconds;

            return (
              <div
                key={ev.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeekToCue(ev.timeSeconds);
                }}
                title={`[${formatTime(ev.timeSeconds)} – ${formatTime(ev.timeSeconds + ev.durationSeconds)}] ${getMultiScentLabel(ev)}`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`
                }}
                className={`absolute top-0 bottom-0 z-10 transition-all cursor-pointer rounded-sm ${
                  isActive
                    ? 'bg-emerald-500 ring-2 ring-emerald-300 shadow-md'
                    : 'bg-indigo-500/70 hover:bg-indigo-600'
                }`}
              />
            );
          })}
        </div>

        {/* Scent Cue List (Multi-Scent Blending up to 3 smells at once) */}
        <div className="flex flex-col gap-2 pt-1">
          {enrichedVideoEvents.map((ev) => {
            const isActive =
              engineState.currentTimeSeconds >= ev.timeSeconds &&
              engineState.currentTimeSeconds < ev.timeSeconds + ev.durationSeconds;

            const channels = (ev.channels || []).slice(0, 3);
            const details = (ev.channelDetails || []).slice(0, 3);

            return (
              <div
                key={ev.id}
                onClick={() => handleSeekToCue(ev.timeSeconds)}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1.5 border ${
                  isActive && engineState.isPlaying
                    ? 'bg-[#F0FDF4] dark:bg-emerald-950/30 border-emerald-500/50 shadow-2xs ring-1 ring-emerald-500/30'
                    : 'bg-[#F9FAFB] dark:bg-zinc-800/60 hover:bg-neutral-100 dark:hover:bg-zinc-800 border-black/[0.04] dark:border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        isActive && engineState.isPlaying
                          ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                          : 'bg-neutral-200 dark:bg-zinc-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {formatTime(ev.timeSeconds)} – {formatTime(ev.timeSeconds + ev.durationSeconds)}
                    </span>

                    {isActive && engineState.isPlaying && (
                      <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-neutral-400">
                    {channels.length === 0
                      ? 'No scent'
                      : `${channels.length} ${channels.length === 1 ? 'smell' : 'smells blend'}`}
                  </span>
                </div>

                {/* Multi-scent chips or neutral scene */}
                {channels.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-[11.5px] text-neutral-400 italic py-0.5">
                    <span className="material-symbols-outlined text-[14px]">air</span>
                    <span>No aroma emitted (Neutral scene)</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {channels.map((chId, idx) => {
                      const detail = details.find((d) => d.channelId === chId);
                      const name = detail?.smellName || channelMap[chId]?.name || chId;

                      return (
                        <div
                          key={chId}
                          className={`flex items-center gap-1.5 px-2 py-0.8 rounded-lg text-[11px] font-medium border ${
                            isActive && engineState.isPlaying
                              ? 'bg-white dark:bg-zinc-800 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                              : 'bg-white dark:bg-zinc-800 border-black/[0.06] dark:border-white/10 text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-[10px]">
                            {chId}
                          </span>
                          <span>{name}</span>
                          {idx < channels.length - 1 && (
                            <span className="text-neutral-400 font-bold ml-0.5">+</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Narratives (Curated Stories) */}
      <div className="flex flex-col gap-2.5 pt-1">
        <span className="text-[12px] font-bold uppercase tracking-wider text-[#86868B] px-1">
          Featured Narratives
        </span>

        <div className="grid grid-cols-1 gap-2">
          {CURATED_YOUTUBE_VIDEOS.map((video) => {
            const isSelected = selectedVideo.id === video.id;
            return (
              <div
                key={video.id}
                onClick={() => {
                  const enriched = {
                    ...video,
                    events: normalizeVideoScentTimeline(video.events, video.durationSeconds)
                  };
                  setSelectedVideo(enriched);
                }}
                className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#1D1D1F] text-white shadow-md'
                    : 'bg-white dark:bg-zinc-900 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5] border border-black/[0.06] dark:border-white/10 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-zinc-800 shrink-0 relative">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[16px]">
                        play_arrow
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold truncate leading-tight">
                      {video.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {formatTime(video.durationSeconds)}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${
                          isSelected ? 'text-emerald-400' : 'text-emerald-600'
                        }`}
                      >
                        {video.events.length} Smells
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-white text-black'
                      : 'bg-[#1D1D1F] text-white dark:bg-white dark:text-black hover:opacity-90'
                  }`}
                >
                  {isSelected ? 'Loaded' : 'Watch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
