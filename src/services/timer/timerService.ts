export interface StoredTimerState {
  id: string;
  title: string;
  totalDurationSeconds: number;
  endAt: number; // Date.now() timestamp
  pausedAt: number | null;
  remainingSeconds: number;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'aromaxai_active_timer';

export class TimerService {
  /**
   * Calculates current remaining seconds based on Date.now() to prevent any timer drift.
   */
  static calculateRemaining(endAt: number): number {
    const diffMs = endAt - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  /**
   * Persists active session timer to localStorage
   */
  static saveTimer(timer: StoredTimerState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    } catch (e) {
      console.warn('Unable to persist timer state', e);
    }
  }

  /**
   * Retrieves active session timer from localStorage
   */
  static loadTimer(): StoredTimerState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed: StoredTimerState = JSON.parse(raw);

      // Check if timer already expired while browser was closed
      if (parsed.pausedAt) {
        return parsed;
      }
      const remaining = this.calculateRemaining(parsed.endAt);
      if (remaining <= 0) {
        this.clearTimer();
        return null;
      }
      return {
        ...parsed,
        remainingSeconds: remaining
      };
    } catch {
      return null;
    }
  }

  static clearTimer(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Unable to clear timer state', e);
    }
  }
}
