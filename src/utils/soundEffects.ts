// Synthesized Web Audio API sound effects for cinematic Thanos Snap Disintegration & Reverse Reconstitution
// 100% native Web Audio with zero external dependencies and graceful fallback

class SoundFX {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Cinematic Vanishing / Disintegration Sound
   * Crumbling ash, low-end rumble, and dispersing atmospheric dust whoosh
   */
  playDisintegration() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Low frequency rumble / ground displacement
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

      oscGain.gain.setValueAtTime(0.2, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);

      // 2. Crumbling ash / dissolving noise
      const bufferSize = ctx.sampleRate * 1.3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Brown-ish noise for gravel/ash texture
        output[i] = (Math.random() * 2 - 1) * 0.7;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 1.1);
      filter.Q.setValueAtTime(3, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.15);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start(now);
      whiteNoise.stop(now + 1.2);

      // 3. High-pitch crumbling cinders/sparks
      const sparkOsc = ctx.createOscillator();
      const sparkGain = ctx.createGain();
      sparkOsc.type = 'sine';
      sparkOsc.frequency.setValueAtTime(2400, now);
      sparkOsc.frequency.exponentialRampToValueAtTime(400, now + 0.9);

      sparkGain.gain.setValueAtTime(0.05, now);
      sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      sparkOsc.connect(sparkGain);
      sparkGain.connect(ctx.destination);
      sparkOsc.start(now);
      sparkOsc.stop(now + 0.9);
    } catch {
      // Audio playback fails gracefully if muted by browser
    }
  }

  /**
   * Reverse Thanos Snap / Reconstitution Sound
   * Converging vacuum suction, rising harmonic resonance, and solid crystallization lock
   */
  playReconstitution() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Rising reverse vacuum whoosh
      const bufferSize = ctx.sampleRate * 1.3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.6;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      // Sweep up in reverse!
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 1.0);
      filter.Q.setValueAtTime(4, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.25, now + 0.9);
      noiseGain.gain.linearRampToValueAtTime(0.001, now + 1.2);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start(now);
      whiteNoise.stop(now + 1.2);

      // 2. Harmonic crystalline lock chime
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.95);

      oscGain.gain.setValueAtTime(0.01, now);
      oscGain.gain.exponentialRampToValueAtTime(0.18, now + 0.9);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    } catch {
      // Audio playback fails gracefully
    }
  }
}

export const soundFX = new SoundFX();
