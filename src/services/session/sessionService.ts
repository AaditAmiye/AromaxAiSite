import { ActiveSessionState, BlendChannelAllocation, RGB, ExperienceStage } from '../../types/aroma';
import { deviceService } from '../device/DeviceService';
import { TimerService } from '../timer/timerService';
import { calculateBlendDominantLight } from '../hardware/lightEngine';

type SessionListener = (state: ActiveSessionState) => void;

const SESSION_STORAGE_KEY = 'aromaxai_active_session';

class SessionService {
  private state: ActiveSessionState;
  private listeners = new Set<SessionListener>();
  private tickInterval: NodeJS.Timeout | null = null;
  private purgeInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = this.loadInitialState();
    if (this.state.active && !this.state.paused && this.state.endAt) {
      this.startTick();
    }
  }

  private loadInitialState(): ActiveSessionState {
    const defaultState: ActiveSessionState = {
      active: false,
      paused: false,
      isPurging: false,
      purgeRemainingSeconds: 0,
      experienceId: null,
      experienceTitle: '',
      batchId: 'RF-9042',
      profileName: 'Wild Olympic Understory Profile',
      type: 'blend',
      channels: [],
      light: { r: 52, g: 199, b: 89 },
      totalDurationSeconds: 180,
      remainingSeconds: 180,
      endAt: null,
      pausedAt: null,
      currentStageIndex: 0,
      stages: [],
      diffusionOutputPercent: 70
    };

    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return defaultState;
      const parsed: ActiveSessionState = JSON.parse(raw);

      if (parsed.active && parsed.endAt) {
        const remaining = TimerService.calculateRemaining(parsed.endAt);
        if (remaining > 0) {
          return {
            ...parsed,
            remainingSeconds: remaining
          };
        } else {
          // Expired while offline
          localStorage.removeItem(SESSION_STORAGE_KEY);
          return defaultState;
        }
      }
      return parsed;
    } catch {
      return defaultState;
    }
  }

  getState(): ActiveSessionState {
    return { ...this.state };
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = { ...this.state };
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(copy));
    } catch {
      // ignore
    }
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch (err) {
        console.error('Error in session listener', err);
      }
    }
  }

  /**
   * Starts or restarts an active aroma diffusion session
   */
  async startSession(params: {
    experienceId?: string;
    title: string;
    type: 'text' | 'video' | 'therapy' | 'blend' | 'test';
    channels: BlendChannelAllocation[];
    durationSeconds: number;
    light?: RGB;
    batchId?: string;
    profileName?: string;
    stages?: ExperienceStage[];
  }): Promise<boolean> {
    // 1. Clear previous session tick
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    const duration = Math.max(5, params.durationSeconds || 60);
    const endAt = Date.now() + duration * 1000;
    const computedLight = params.light || calculateBlendDominantLight(params.channels);
    const channelIds = params.channels.map((c) => c.channelId);

    // 2. Send physical hardware command first
    const cmdResult = await deviceService.applyState({
      channels: channelIds,
      light: computedLight,
      outputPercent: this.state.diffusionOutputPercent,
      source: `session-${params.type}`
    });

    if (!cmdResult.success) {
      console.warn('Physical device failed to receive state command:', cmdResult.error);
    }

    // 3. Update active session state
    this.state = {
      active: true,
      paused: false,
      experienceId: params.experienceId || `exp-${Date.now()}`,
      experienceTitle: params.title,
      batchId: params.batchId || `#RF-${Math.floor(1000 + Math.random() * 9000)}`,
      profileName: params.profileName || 'Custom Sensory Profile',
      type: params.type,
      channels: params.channels,
      light: computedLight,
      totalDurationSeconds: duration,
      remainingSeconds: duration,
      endAt,
      pausedAt: null,
      currentStageIndex: 0,
      stages: params.stages || [],
      diffusionOutputPercent: this.state.diffusionOutputPercent
    };

    TimerService.saveTimer({
      id: this.state.experienceId!,
      title: this.state.experienceTitle,
      totalDurationSeconds: duration,
      endAt,
      pausedAt: null,
      remainingSeconds: duration
    });

    this.startTick();
    this.notify();
    return true;
  }

  private startTick() {
    if (this.tickInterval) clearInterval(this.tickInterval);

    this.tickInterval = setInterval(() => {
      if (!this.state.active || this.state.paused || !this.state.endAt) {
        return;
      }

      const remaining = TimerService.calculateRemaining(this.state.endAt);
      this.state.remainingSeconds = remaining;

      if (remaining <= 0) {
        this.handleSessionCompletion();
      } else {
        this.notify();
      }
    }, 500);
  }

  /**
   * Advances multi-stage therapy sessions or stops when completed
   */
  private async handleSessionCompletion() {
    if (this.state.stages && this.state.stages.length > 0) {
      const nextIndex = this.state.currentStageIndex + 1;
      if (nextIndex < this.state.stages.length) {
        // Advance to next stage!
        const nextStage = this.state.stages[nextIndex];
        const nextDuration = nextStage.durationSeconds;
        const nextEndAt = Date.now() + nextDuration * 1000;
        const nextLight = nextStage.light || calculateBlendDominantLight(nextStage.channels);

        this.state.currentStageIndex = nextIndex;
        this.state.channels = nextStage.channels;
        this.state.light = nextLight;
        this.state.totalDurationSeconds = nextDuration;
        this.state.remainingSeconds = nextDuration;
        this.state.endAt = nextEndAt;

        await deviceService.applyState({
          channels: nextStage.channels.map((c) => c.channelId),
          light: nextLight,
          outputPercent: this.state.diffusionOutputPercent,
          source: `therapy-stage-${nextIndex + 1}`
        });

        this.notify();
        return;
      }
    }

    // Complete session: stop physical aromas, keep fan active
    await this.stopSession();
  }

  async pauseSession() {
    if (!this.state.active || this.state.paused || !this.state.endAt) return;

    const remaining = TimerService.calculateRemaining(this.state.endAt);
    this.state.paused = true;
    this.state.pausedAt = Date.now();
    this.state.remainingSeconds = remaining;

    // Temporarily pause hardware emission while keeping fan active
    await deviceService.applyState({
      channels: [],
      light: { r: 20, g: 20, b: 20 },
      source: 'session-pause'
    });

    this.notify();
  }

  async resumeSession() {
    if (!this.state.active || !this.state.paused) return;

    const duration = Math.max(2, this.state.remainingSeconds);
    const endAt = Date.now() + duration * 1000;

    this.state.paused = false;
    this.state.pausedAt = null;
    this.state.endAt = endAt;
    this.state.remainingSeconds = duration;

    // Restore hardware aromas
    await deviceService.applyState({
      channels: this.state.channels.map((c) => c.channelId),
      light: this.state.light,
      outputPercent: this.state.diffusionOutputPercent,
      source: 'session-resume'
    });

    this.startTick();
    this.notify();
  }

  setDiffusionOutput(percent: number) {
    this.state.diffusionOutputPercent = Math.min(100, Math.max(10, percent));
    this.notify();
  }

  setLighting(rgb: RGB) {
    this.state.light = rgb;
    if (this.state.active && !this.state.paused) {
      deviceService.applyState({
        channels: this.state.channels.map((c) => c.channelId),
        light: rgb,
        outputPercent: this.state.diffusionOutputPercent,
        source: 'light-adjust'
      });
    }
    this.notify();
  }

  /**
   * Starts a physical chamber purge sequence:
   * Turns off scent actuators, accelerates mixer fan, displays dynamic purge telemetry
   */
  async startPurge(durationSeconds: number = 6) {
    if (this.purgeInterval) {
      clearInterval(this.purgeInterval);
      this.purgeInterval = null;
    }

    // Physical hardware: clear active scent channels, illuminate cyan/amber purge light, activate fan
    await deviceService.applyState({
      channels: [],
      light: { r: 48, g: 209, b: 88 }, // Refreshing oxygen emerald-cyan
      outputPercent: 100,
      source: 'chamber-purge'
    });
    await deviceService.setFan(true);

    this.state.isPurging = true;
    this.state.purgeRemainingSeconds = durationSeconds;
    this.notify();

    this.purgeInterval = setInterval(async () => {
      const currentRem = (this.state.purgeRemainingSeconds ?? 1) - 1;
      this.state.purgeRemainingSeconds = currentRem;

      if (currentRem <= 0) {
        if (this.purgeInterval) {
          clearInterval(this.purgeInterval);
          this.purgeInterval = null;
        }
        this.state.isPurging = false;
        this.state.purgeRemainingSeconds = 0;
        await deviceService.stopAll();
        this.notify();
      } else {
        this.notify();
      }
    }, 1000);
  }

  cancelPurge() {
    if (this.purgeInterval) {
      clearInterval(this.purgeInterval);
      this.purgeInterval = null;
    }
    this.state.isPurging = false;
    this.state.purgeRemainingSeconds = 0;
    deviceService.stopAll();
    this.notify();
  }

  /**
   * Stops the active session, clears storage and initiates chamber purge
   */
  async stopSession(withPurge: boolean = true) {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.state.active = false;
    this.state.paused = false;
    this.state.remainingSeconds = 0;
    this.state.endAt = null;
    this.state.pausedAt = null;

    TimerService.clearTimer();
    localStorage.removeItem(SESSION_STORAGE_KEY);

    if (withPurge) {
      await this.startPurge(6);
    } else {
      await deviceService.stopAll();
      this.notify();
    }
  }
}

export const sessionService = new SessionService();
