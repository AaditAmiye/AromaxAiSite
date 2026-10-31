import React, { useEffect, useRef } from 'react';
import { useTheme, SnapPhase } from '../../context/ThemeContext';

interface Particle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  maxDisplacementX: number;
  maxDisplacementY: number;
  size: number;
  rotation: number;
  vRot: number;
  alpha: number;
  color: string;
  delay: number; // Staggered start based on distance from snap origin
  shape: 'flake' | 'ember' | 'dust';
}

export const ThanosSnapTransition: React.FC = () => {
  const { snapPhase, snapOrigin, isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (snapPhase === 'idle') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Calculate maximum distance from snap origin to corner
    const maxDist = Math.hypot(
      Math.max(snapOrigin.x, width - snapOrigin.x),
      Math.max(snapOrigin.y, height - snapOrigin.y)
    );

    // Palette of ash flakes, charred dust, and glowing cinders
    const darkPalette = [
      '#1F2937', // Charcoal ash
      '#374151', // Dark slate ash
      '#4B5563', // Grey dust
      '#6B7280', // Light ash
      '#F59E0B', // Glowing amber ember
      '#EF4444', // Hot cinder
      '#D97706', // Gold spark
      '#9CA3AF'  // Fine dust
    ];

    const lightPalette = [
      '#F3F4F6', // Pure stardust
      '#E5E7EB', // Luminous flake
      '#9CA3AF', // Obsidian dust
      '#60A5FA', // Neon blue plasma spark
      '#38BDF8', // Sky cyan ember
      '#FBBF24', // Warm starlight
      '#A78BFA'  // Violet quantum dust
    ];

    const activePalette = isDark ? lightPalette : darkPalette;

    // Generate ~1400 particles distributed across the viewport
    const count = Math.min(1500, Math.floor((width * height) / 600));
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      // Clustered more realistically across the screen
      const ox = Math.random() * width;
      const oy = Math.random() * height;

      // Distance from snap origin (Aromax AI logo)
      const distFromOrigin = Math.hypot(ox - snapOrigin.x, oy - snapOrigin.y);
      const normalizedDist = distFromOrigin / (maxDist || 1);

      // Delay wave sweeps outward over 750ms
      const delay = normalizedDist * 750 + Math.random() * 120;

      // Dispersal physics: wind blows upwards and slightly towards right/bottom
      const angle = Math.atan2(oy - snapOrigin.y, ox - snapOrigin.x) + (Math.random() - 0.5) * 0.8;
      const speed = 120 + Math.random() * 260;
      const maxDx = Math.cos(angle) * speed + (Math.random() * 80 + 40);
      const maxDy = Math.sin(angle) * speed - (Math.random() * 100 + 50); // Upward thermal draft

      const size = Math.random() < 0.7 ? Math.random() * 2.5 + 1.2 : Math.random() * 4.5 + 2.5;
      const shapeRand = Math.random();
      const shape: 'flake' | 'ember' | 'dust' =
        shapeRand < 0.6 ? 'flake' : shapeRand < 0.85 ? 'ember' : 'dust';

      newParticles.push({
        originX: ox,
        originY: oy,
        x: ox,
        y: oy,
        vx: maxDx,
        vy: maxDy,
        maxDisplacementX: maxDx,
        maxDisplacementY: maxDy,
        size,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 8,
        alpha: 0,
        color: activePalette[Math.floor(Math.random() * activePalette.length)],
        delay,
        shape
      });
    }

    particlesRef.current = newParticles;
    startTimeRef.current = performance.now();

    // Render loop
    const render = (time: number) => {
      const elapsed = time - startTimeRef.current;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;

      if (snapPhase === 'vanishing') {
        // PHASE 1: Vanishing / Disintegration (0 to 1300ms)
        const phaseProgress = Math.min(1, elapsed / 1250);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const particleTime = elapsed - p.delay;

          if (particleTime > 0) {
            // Particle has detached and is flying into the wind
            const progress = Math.min(1, particleTime / 650);
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);

            // Chaotic wind drift + turbulent jitter
            const turbulenceX = Math.sin(particleTime * 0.008 + i) * 12;
            const turbulenceY = Math.cos(particleTime * 0.006 + i) * 8;

            p.x = p.originX + p.maxDisplacementX * easeOut + turbulenceX;
            p.y = p.originY + p.maxDisplacementY * easeOut + turbulenceY;

            // Fade in as ash, then fade out into deep space
            if (progress < 0.25) {
              p.alpha = progress / 0.25;
            } else {
              p.alpha = Math.max(0, 1 - (progress - 0.25) / 0.75);
            }

            p.rotation += p.vRot * 0.016;

            drawParticle(ctx, p);
          }
        }

        // Draw sweeping dissolution shockwave glow
        drawWavefront(ctx, snapOrigin, elapsed, maxDist, width, height, '#F59E0B');
      } else if (snapPhase === 'reconstituting') {
        // PHASE 2: Reverse Thanos Snap / Reconstitution (0 to 1300ms)
        const reverseElapsed = elapsed - 1300; // time since reverse started
        const phaseProgress = Math.min(1, Math.max(0, reverseElapsed / 1200));

        // In reverse snap, time goes from dispersed state back to 0!
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          // Particles furthest away return first or in reverse wave sequence
          const reverseDelay = (1 - (p.delay / 870)) * 600;
          const particleTime = reverseElapsed - reverseDelay;

          if (particleTime > 0) {
            // Progress from 1 (dispersed) down to 0 (locked into matrix)
            const convergeProgress = Math.min(1, particleTime / 550);
            // Spring-like magnetic convergence
            const easeReturn = Math.pow(1 - convergeProgress, 2.5);

            const turbulenceX = Math.sin(particleTime * 0.007 + i) * (8 * easeReturn);
            const turbulenceY = Math.cos(particleTime * 0.005 + i) * (6 * easeReturn);

            p.x = p.originX + p.maxDisplacementX * easeReturn + turbulenceX;
            p.y = p.originY + p.maxDisplacementY * easeReturn + turbulenceY;

            // Alpha fades in as they converge, then locks and dissolves into the solid page
            p.alpha = Math.max(0, Math.min(1, (1 - easeReturn) * 1.2));
            if (convergeProgress > 0.85) {
              p.alpha = (1 - convergeProgress) / 0.15;
            }

            p.rotation -= p.vRot * 0.016;

            drawParticle(ctx, p);

            // Glowing recombination connection threads when close
            if (convergeProgress > 0.6 && convergeProgress < 0.95 && i % 8 === 0) {
              ctx.save();
              ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(245, 158, 11, 0.4)';
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.originX, p.originY);
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        // Draw inward converging cosmic wavefront
        drawReverseWavefront(ctx, snapOrigin, reverseElapsed, maxDist, width, height, isDark ? '#38BDF8' : '#F59E0B');
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [snapPhase, snapOrigin, isDark]);

  if (snapPhase === 'idle') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {/* Fullscreen HTML5 Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          width: '100%',
          height: '100%'
        }}
      />

      {/* Atmospheric Void Backdrop during peak dissolution */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
          snapPhase === 'vanishing'
            ? 'opacity-35 bg-black'
            : 'opacity-15 bg-black'
        }`}
      />
    </div>
  );
};

// Helper: draw realistic jagged ash flakes or glowing cinders
function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  if (p.alpha <= 0.01) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.alpha;

  if (p.shape === 'ember') {
    // Glowing cinder with radiant halo
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
    glow.addColorStop(0, p.color);
    glow.addColorStop(0.5, p.color);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Hot core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === 'flake') {
    // Irregular ash flake polygon
    ctx.fillStyle = p.color;
    ctx.beginPath();
    const half = p.size;
    ctx.moveTo(-half, -half * 0.7);
    ctx.lineTo(half * 0.8, -half);
    ctx.lineTo(half, half * 0.6);
    ctx.lineTo(-half * 0.4, half);
    ctx.closePath();
    ctx.fill();
  } else {
    // Fine dust particle
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Helper: Outward traveling disintegration wave line
function drawWavefront(
  ctx: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  elapsed: number,
  maxDist: number,
  width: number,
  height: number,
  color: string
) {
  const waveRadius = (elapsed / 850) * maxDist;
  if (waveRadius > maxDist * 1.2 || waveRadius < 5) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = Math.max(0, 0.45 - (elapsed / 1100) * 0.45);
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, waveRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle outer blur wave
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.globalAlpha = Math.max(0, 0.3 - (elapsed / 1100) * 0.3);
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, waveRadius + 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// Helper: Inward converging reconstitution wave
function drawReverseWavefront(
  ctx: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  elapsed: number,
  maxDist: number,
  width: number,
  height: number,
  color: string
) {
  // Radius collapses inward from outside towards origin
  const progress = Math.min(1, elapsed / 850);
  const waveRadius = (1 - progress) * maxDist;
  if (waveRadius < 5) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = Math.max(0, 0.4 - progress * 0.35);
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, waveRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
