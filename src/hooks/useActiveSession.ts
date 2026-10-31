import { useState, useEffect } from 'react';
import { sessionService } from '../services/session/sessionService';
import { ActiveSessionState, BlendChannelAllocation, RGB, ExperienceStage } from '../types/aroma';

export function useActiveSession() {
  const [session, setSession] = useState<ActiveSessionState>(sessionService.getState());

  useEffect(() => {
    const unsubscribe = sessionService.subscribe((s) => {
      setSession(s);
    });
    return unsubscribe;
  }, []);

  const progressPercent = session.totalDurationSeconds > 0
    ? Math.max(0, Math.min(100, ((session.totalDurationSeconds - session.remainingSeconds) / session.totalDurationSeconds) * 100))
    : 0;

  const formattedRemaining = `${String(Math.floor(session.remainingSeconds / 60)).padStart(2, '0')}:${String(
    session.remainingSeconds % 60
  ).padStart(2, '0')}`;

  const formattedTotal = `${String(Math.floor(session.totalDurationSeconds / 60)).padStart(2, '0')}:${String(
    session.totalDurationSeconds % 60
  ).padStart(2, '0')}`;

  return {
    ...session,
    progressPercent,
    formattedRemaining,
    formattedTotal,
    startSession: (params: {
      experienceId?: string;
      title: string;
      type: 'text' | 'video' | 'therapy' | 'blend' | 'test';
      channels: BlendChannelAllocation[];
      durationSeconds: number;
      light?: RGB;
      batchId?: string;
      profileName?: string;
      stages?: ExperienceStage[];
    }) => sessionService.startSession(params),
    pauseSession: () => sessionService.pauseSession(),
    resumeSession: () => sessionService.resumeSession(),
    stopSession: (withPurge: boolean = true) => sessionService.stopSession(withPurge),
    startPurge: (seconds: number = 6) => sessionService.startPurge(seconds),
    cancelPurge: () => sessionService.cancelPurge(),
    setDiffusionOutput: (val: number) => sessionService.setDiffusionOutput(val),
    setLighting: (rgb: RGB) => sessionService.setLighting(rgb)
  };
}
