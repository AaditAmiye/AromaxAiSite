import React, { useEffect, useRef, useState, useCallback } from 'react';
import { videoScentEngine } from '../../services/video/videoEngine';
import { VideoScentEvent } from '../../types/video';

interface YouTubeCinemaPlayerProps {
  youtubeId?: string;
  videoUrl?: string;
  videoDuration?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onDurationDetected?: (duration: number) => void;
  onStateChange?: (isPlaying: boolean) => void;
  activeEvent: VideoScentEvent | null;
  videoTitle?: string;
  onSeekRequested?: (timeSeconds: number) => void;
  onCaptureFrame?: (base64Frame: string) => void;
}

export const YouTubeCinemaPlayer: React.FC<YouTubeCinemaPlayerProps> = ({
  youtubeId = 'LXb3EKWsInQ',
  videoUrl,
  videoDuration = 0,
  onTimeUpdate,
  onDurationDetected,
  onStateChange,
  activeEvent,
  videoTitle,
  onSeekRequested,
  onCaptureFrame
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Playback mode: 'direct' (HTML5 video) vs 'youtube' (iframe embed)
  const [playerMode, setPlayerMode] = useState<'direct' | 'youtube'>(
    videoUrl ? 'direct' : 'youtube'
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoDuration > 0 ? videoDuration : 0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  // Synchronized refs for non-stale callbacks
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;

  const durationRef = useRef(videoDuration > 0 ? videoDuration : 0);
  durationRef.current = duration;

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const onDurationDetectedRef = useRef(onDurationDetected);
  onDurationDetectedRef.current = onDurationDetected;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const lastReportedSecRef = useRef<number>(-1);
  const lastPostMessageTimeRef = useRef<number>(0);
  const clockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const ytPlayerRef = useRef<any>(null);

  // Auto-switch mode when props change
  useEffect(() => {
    if (videoUrl && !youtubeId) {
      setPlayerMode('direct');
    } else if (!videoUrl && youtubeId) {
      setPlayerMode('youtube');
    }
  }, [videoUrl, youtubeId]);

  // Post message helper for YouTube iframe
  const postToYouTube = useCallback((func: string, args: any[] = []) => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch {
      // Safe catch
    }
  }, []);

  // Frame Capture for Gemini Multimodal Analysis
  const handleCaptureCurrentFrame = useCallback(() => {
    if (playerMode === 'direct' && videoRef.current) {
      try {
        const v = videoRef.current;
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = Math.min(640, v.videoWidth || 640);
        canvas.height = Math.min(360, v.videoHeight || 360);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          onCaptureFrame?.(base64);
        }
      } catch (err) {
        console.warn('Could not capture direct video frame (CORS):', err);
      }
    } else if (youtubeId) {
      // For YouTube, trigger thumbnail analysis
      onCaptureFrame?.(`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`);
    }
  }, [playerMode, youtubeId, onCaptureFrame]);

  // Playback Control Actions
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    isPlayingRef.current = true;
    onStateChangeRef.current?.(true);

    if (playerMode === 'direct' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
      try {
        ytPlayerRef.current.playVideo();
      } catch {
        postToYouTube('playVideo');
      }
    } else {
      postToYouTube('playVideo');
    }
    videoScentEngine.syncTime(currentTimeRef.current, true, durationRef.current);
  }, [playerMode, postToYouTube]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    onStateChangeRef.current?.(false);

    if (playerMode === 'direct' && videoRef.current) {
      videoRef.current.pause();
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {
        postToYouTube('pauseVideo');
      }
    } else {
      postToYouTube('pauseVideo');
    }
    videoScentEngine.syncTime(currentTimeRef.current, false, durationRef.current);
  }, [playerMode, postToYouTube]);

  const handleTogglePlayPause = useCallback(() => {
    if (isPlayingRef.current) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [handlePause, handlePlay]);

  const handleSeek = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(durationRef.current, seconds));
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;

      if (playerMode === 'direct' && videoRef.current) {
        videoRef.current.currentTime = clamped;
      } else if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        try {
          ytPlayerRef.current.seekTo(clamped, true);
        } catch {
          postToYouTube('seekTo', [clamped, true]);
        }
      } else {
        postToYouTube('seekTo', [clamped, true]);
      }

      videoScentEngine.syncTime(clamped, isPlayingRef.current, durationRef.current);
      onSeekRequested?.(clamped);
    },
    [playerMode, postToYouTube, onSeekRequested]
  );

  const handleJump = useCallback(
    (deltaSeconds: number) => {
      handleSeek(currentTimeRef.current + deltaSeconds);
    },
    [handleSeek]
  );

  // Initialize and synchronize official YouTube IFrame API
  useEffect(() => {
    if (playerMode !== 'youtube' || !youtubeId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const setupPlayer = () => {
      if (!isMounted) return;
      const iframeEl = iframeRef.current;
      const YT = (window as any).YT;

      if (iframeEl && YT && YT.Player) {
        try {
          if (ytPlayerRef.current) {
            try { ytPlayerRef.current.destroy(); } catch {}
            ytPlayerRef.current = null;
          }

          ytPlayerRef.current = new YT.Player(iframeEl, {
            events: {
              onReady: (event: any) => {
                if (!isMounted) return;
                setIsPlayerReady(true);
                try {
                  const d = event.target.getDuration();
                  if (typeof d === 'number' && d > 0) {
                    setDuration(d);
                    durationRef.current = d;
                    onDurationDetectedRef.current?.(d);
                    onTimeUpdateRef.current?.(0, d);
                  }
                } catch {}
              },
              onStateChange: (event: any) => {
                if (!isMounted) return;
                lastPostMessageTimeRef.current = Date.now();
                // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
                const state = event.data;
                const playing = state === 1;

                if (playing !== isPlayingRef.current) {
                  setIsPlaying(playing);
                  isPlayingRef.current = playing;
                  onStateChangeRef.current?.(playing);
                }

                try {
                  const cur = event.target.getCurrentTime();
                  const dur = event.target.getDuration();
                  if (typeof dur === 'number' && dur > 0) {
                    setDuration(dur);
                    durationRef.current = dur;
                    onDurationDetectedRef.current?.(dur);
                  }
                  if (typeof cur === 'number') {
                    setCurrentTime(cur);
                    currentTimeRef.current = cur;
                    videoScentEngine.syncTime(cur, playing, durationRef.current);
                    onTimeUpdateRef.current?.(cur, durationRef.current);
                  }
                } catch {}
              }
            }
          });
        } catch (err) {
          console.warn('[YouTube API] Could not create YT.Player instance:', err);
        }
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      setupPlayer();
    } else {
      const orig = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof orig === 'function') orig();
        setupPlayer();
      };
    }

    // High-precision poll (every 200ms) while playing via YouTube API
    pollInterval = setInterval(() => {
      if (!isMounted || !isPlayingRef.current || playerMode !== 'youtube') return;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const cur = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          if (typeof cur === 'number' && !isNaN(cur)) {
            lastPostMessageTimeRef.current = Date.now();
            currentTimeRef.current = cur;
            setCurrentTime(cur);
            if (typeof dur === 'number' && dur > 0 && Math.abs(dur - durationRef.current) > 1) {
              setDuration(dur);
              durationRef.current = dur;
              onDurationDetectedRef.current?.(dur);
            }
            videoScentEngine.syncTime(cur, true, durationRef.current);
            onTimeUpdateRef.current?.(cur, durationRef.current);
          }
        } catch {}
      }
    }, 200);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [youtubeId, playerMode]);

  // Listen to incoming postMessages from YouTube's iframe API (both string and object forms)
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      try {
        let data: any = null;
        if (typeof e.data === 'string') {
          try { data = JSON.parse(e.data); } catch { return; }
        } else if (typeof e.data === 'object' && e.data !== null) {
          data = e.data;
        } else {
          return;
        }

        if (data.event === 'infoDelivery' && data.info) {
          lastPostMessageTimeRef.current = Date.now();
          const info = data.info;

          if (typeof info.duration === 'number' && info.duration > 0) {
            setDuration(info.duration);
            durationRef.current = info.duration;
            onDurationDetectedRef.current?.(info.duration);
            onTimeUpdateRef.current?.(currentTimeRef.current, info.duration);
          }

          if (typeof info.playerState === 'number') {
            const playing = info.playerState === 1;
            if (playing !== isPlayingRef.current) {
              setIsPlaying(playing);
              isPlayingRef.current = playing;
              onStateChangeRef.current?.(playing);
              videoScentEngine.syncTime(currentTimeRef.current, playing, durationRef.current);
            }
          }

          if (typeof info.currentTime === 'number') {
            const time = info.currentTime;
            currentTimeRef.current = time;
            const sec = Math.floor(time);

            if (sec !== lastReportedSecRef.current) {
              lastReportedSecRef.current = sec;
              setCurrentTime(time);
              onTimeUpdateRef.current?.(time, durationRef.current);
              videoScentEngine.syncTime(time, isPlayingRef.current, durationRef.current);
            }
          }
        } else if (data.event === 'onReady') {
          setIsPlayerReady(true);
        }
      } catch {
        // Not a YouTube JSON event
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  // Safe fallback timer ONLY when YouTube API messages are not arriving
  useEffect(() => {
    if (clockTimerRef.current) {
      clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }

    if (isPlaying && playerMode === 'youtube') {
      clockTimerRef.current = setInterval(() => {
        // If native postMessages from YouTube are arriving, let them drive the clock!
        if (Date.now() - lastPostMessageTimeRef.current < 2500) {
          return;
        }

        const nextTime = Math.min(durationRef.current, currentTimeRef.current + 1);
        currentTimeRef.current = nextTime;
        setCurrentTime(nextTime);
        videoScentEngine.syncTime(nextTime, true, durationRef.current);
        onTimeUpdateRef.current?.(nextTime, durationRef.current);

        if (nextTime >= durationRef.current) {
          setIsPlaying(false);
          isPlayingRef.current = false;
          videoScentEngine.syncTime(nextTime, false, durationRef.current);
          if (clockTimerRef.current) clearInterval(clockTimerRef.current);
        }
      }, 1000);
    }

    return () => {
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
        clockTimerRef.current = null;
      }
    };
  }, [isPlaying, playerMode]);

  // Reset state when video changes
  useEffect(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    currentTimeRef.current = 0;
    const initialDur = videoDuration > 0 ? videoDuration : 0;
    setDuration(initialDur);
    durationRef.current = initialDur;
    lastReportedSecRef.current = -1;
    videoScentEngine.pause();

    if (playerMode === 'youtube' && youtubeId) {
      const timer = setTimeout(() => {
        postToYouTube('addEventListener', ['onStateChange']);
        postToYouTube('listening');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [youtubeId, videoUrl, videoDuration, playerMode, postToYouTube]);

  // Handle external seek and playback control events (e.g. from Dynamic Island)
  useEffect(() => {
    const handleCustomSeek = (e: CustomEvent<{ time?: number; action?: 'play' | 'pause' | 'toggle' | 'stop' }>) => {
      if (e.detail?.action === 'play') {
        handlePlay();
      } else if (e.detail?.action === 'pause') {
        handlePause();
      } else if (e.detail?.action === 'toggle') {
        handleTogglePlayPause();
      } else if (e.detail?.action === 'stop') {
        handlePause();
        handleSeek(0);
      } else if (typeof e.detail?.time === 'number') {
        handleSeek(e.detail.time);
      }
    };

    window.addEventListener('aromaxai:seek-video' as any, handleCustomSeek as any);
    return () => {
      window.removeEventListener('aromaxai:seek-video' as any, handleCustomSeek as any);
    };
  }, [handleSeek, handlePlay, handlePause, handleTogglePlayPause]);

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const effectiveVideoUrl = videoUrl || '/sensory-odyssey.mp4';
  const originParam = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="relative w-full rounded-[24px] overflow-hidden bg-black shadow-lg border border-white/10 flex flex-col group">
      {/* Hidden canvas for frame grab */}
      <canvas ref={canvasRef} className="hidden" />



      {/* 16:9 Video Canvas Frame */}
      <div className="relative w-full aspect-[16/9] bg-black overflow-hidden">
        {playerMode === 'direct' ? (
          /* Direct HTML5 4K Video Player - 100% Reliable, zero iframe blocks */
          <video
            ref={videoRef}
            key={effectiveVideoUrl}
            src={effectiveVideoUrl}
            playsInline
            controls
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (d && !isNaN(d) && d > 0) {
                setDuration(d);
                durationRef.current = d;
                onDurationDetectedRef.current?.(d);
              }
              setIsPlayerReady(true);
            }}
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              currentTimeRef.current = t;
              const sec = Math.floor(t);
              if (sec !== lastReportedSecRef.current) {
                lastReportedSecRef.current = sec;
                setCurrentTime(t);
                onTimeUpdateRef.current?.(t, durationRef.current);
                videoScentEngine.syncTime(t, isPlayingRef.current, durationRef.current);
              }
            }}
            onPlay={() => {
              setIsPlaying(true);
              isPlayingRef.current = true;
              onStateChangeRef.current?.(true);
              videoScentEngine.syncTime(currentTimeRef.current, true, durationRef.current);
            }}
            onPause={() => {
              setIsPlaying(false);
              isPlayingRef.current = false;
              onStateChangeRef.current?.(false);
              videoScentEngine.syncTime(currentTimeRef.current, false, durationRef.current);
            }}
            className="w-full h-full object-cover z-10"
          />
        ) : (
          /* YouTube Embed IFrame */
          <iframe
            ref={iframeRef}
            key={youtubeId}
            id={`yt-player-${youtubeId}`}
            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&rel=0&playsinline=1&modestbranding=1&controls=1${
              originParam ? `&origin=${encodeURIComponent(originParam)}` : ''
            }`}
            title={videoTitle || 'YouTube Cinema'}
            className="w-full h-full border-0 absolute inset-0 z-10"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => {
              setIsPlayerReady(true);
              try {
                if (iframeRef.current?.contentWindow) {
                  iframeRef.current.contentWindow.postMessage(
                    JSON.stringify({ event: 'listening' }),
                    '*'
                  );
                }
              } catch {
                // ignore
              }
            }}
            onError={() => {
              setIframeBlocked(true);
            }}
          />
        )}

        {/* Iframe blocked fallback */}
        {iframeBlocked && playerMode === 'youtube' && (
          <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center z-30">
            <span className="material-symbols-outlined text-[32px] text-amber-400 mb-2">
              tv_off
            </span>
            <p className="text-[13px] text-white font-medium">YouTube embed was blocked by browser policy</p>
            <p className="text-[11px] text-neutral-400 mt-1 mb-3">
              Switch to Direct HD Video mode to play native high-definition video directly.
            </p>
            <button
              type="button"
              onClick={() => setPlayerMode('direct')}
              className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-[12px] font-semibold cursor-pointer"
            >
              Switch to Direct HD Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
