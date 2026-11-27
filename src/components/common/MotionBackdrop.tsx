import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../theme';
import { useBackdrop } from '../../backdrop';

interface LanternMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  speed: number;
  kind: 'lantern' | 'firefly' | 'star';
}

interface RippleWave {
  yRatio: number;
  phase: number;
  speed: number;
  widthRatio: number;
  xRatio: number;
}

/**
 * Living 3D Spatial Sanctuary Backdrop Engine
 * -------------------------------------------
 * Multi-plane infinite-loop 3D world with buttery-smooth GPU pointer/scroll parallax,
 * living water mirror ripples across the lower pond/lagoon, drifting golden fireflies &
 * edge lanterns, and an open sky corridor so 3D floating UI pavilions belong natively
 * to the world without ever ruining the scenery or clashing with text!
 */
export const MotionBackdrop: React.FC = React.memo(() => {
  const theme = useTheme();
  const backdrop = useBackdrop();
  const isDark = theme === 'dark';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldPlaneRef = useRef<HTMLDivElement | null>(null);
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [backdrop.customUrl, backdrop.scene]);

  // Smooth spring-damped 3D Camera Parallax (pointer + subtle scroll depth — zero React re-renders)
  useEffect(() => {
    const el = worldPlaneRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!backdrop.parallaxEnabled || !backdrop.motionEnabled || reduce) {
      el.style.transform = 'scale(1.06) translate3d(0px, 0px, 0px)';
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let hidden = document.hidden;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const nx = e.clientX / Math.max(1, window.innerWidth) - 0.5;
      const ny = e.clientY / Math.max(1, window.innerHeight) - 0.5;
      targetX = -nx * 24;
      targetY = -ny * 16;
    };

    const onScroll = () => {
      const sy = Math.min(window.scrollY, 900);
      targetY = Math.max(-28, Math.min(28, targetY - sy * 0.015));
    };

    const tick = (ms: number) => {
      if (!hidden) {
        // Infinite slow camera breathing + pointer follow
        const breatheX = Math.sin(ms * 0.00028) * 9;
        const breatheY = Math.cos(ms * 0.00022) * 6;
        curX += (targetX + breatheX - curX) * 0.05;
        curY += (targetY + breatheY - curY) * 0.05;
        el.style.transform = `scale(1.09) translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0px)`;
      }
      raf = window.requestAnimationFrame(tick);
    };

    const onVis = () => {
      hidden = document.hidden;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [backdrop.parallaxEnabled, backdrop.motionEnabled]);

  // Real-time 60fps Canvas: Living Pond/Lagoon Shimmer Ripples + Edge Lanterns + Celestial Arcs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (backdrop.scene === 'calm-minimal') return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animate = backdrop.motionEnabled && !reduceMotion;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const isLiteDevice =
      document.documentElement.getAttribute('data-perf') === 'lite' ||
      window.matchMedia?.('(pointer: coarse)').matches;
    let dpr = Math.min(window.devicePixelRatio || 1, isLiteDevice ? 1 : 1.5);
    let rafId = 0;
    let hidden = document.hidden;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, isLiteDevice ? 1 : 1.5);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Seed fireflies & golden floating lanterns strictly along outer margins & lower water edge
    const count = isLiteDevice ? 22 : width < 640 ? 28 : 48;
    const motes: LanternMote[] = Array.from({ length: count }, (_, i) => {
      const side = i % 3;
      const x =
        side === 0
          ? Math.random() * width * 0.24
          : side === 1
          ? width * 0.76 + Math.random() * width * 0.24
          : Math.random() * width;
      const isWaterZone = side === 2;
      const y = isWaterZone
        ? height * 0.72 + Math.random() * height * 0.26
        : Math.random() * height * 0.88;
      const kind: LanternMote['kind'] =
        isWaterZone && i % 4 === 0 ? 'lantern' : i % 3 === 0 ? 'firefly' : 'star';
      return {
        x,
        y,
        vx: (Math.random() - 0.5) * (kind === 'lantern' ? 0.14 : 0.26),
        vy: kind === 'lantern' ? -(0.04 + Math.random() * 0.08) : -(0.1 + Math.random() * 0.22),
        r: kind === 'lantern' ? 3.2 + Math.random() * 2.4 : 1.1 + Math.random() * 1.9,
        phase: Math.random() * Math.PI * 2,
        speed: 0.012 + Math.random() * 0.018,
        kind
      };
    });

    // Shimmering liquid mirror water ripples in the lower 26% pond/lagoon plane
    const ripples: RippleWave[] = Array.from({ length: 16 }, (_, i) => ({
      yRatio: 0.75 + (i / 16) * 0.23,
      phase: Math.random() * Math.PI * 2,
      speed: 0.45 + Math.random() * 0.55,
      widthRatio: 0.06 + Math.random() * 0.14,
      xRatio: 0.06 + Math.random() * 0.88
    }));

    const drawFrame = (ms: number) => {
      const t = ms * 0.001;
      ctx.clearRect(0, 0, width, height);

      const isSanctuary = backdrop.scene === 'emerald-sanctuary';
      const isObservatory = backdrop.scene === 'royal-observatory';
      const isAurora = backdrop.scene === 'royal-aurora';

      // 1. Upper-sky subtle rotating celestial meridian arc (posh architectural sky detail)
      if (isObservatory || isAurora) {
        ctx.save();
        const cx = width * 0.5;
        const cy = height * 0.12;
        const radius = Math.min(width, height) * 0.46;
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.018);
        ctx.strokeStyle = isDark
          ? 'rgba(251, 191, 36, 0.09)'
          : 'rgba(180, 83, 9, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 11]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Flowing silk aurora ribbon (gentle harmonic loop along upper & lower perimeter)
      if (isAurora || isObservatory) {
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        if (isDark) {
          grad.addColorStop(0, 'rgba(251, 191, 36, 0)');
          grad.addColorStop(0.25, 'rgba(251, 191, 36, 0.18)');
          grad.addColorStop(0.5, 'rgba(167, 139, 250, 0.14)');
          grad.addColorStop(0.75, 'rgba(56, 189, 248, 0.18)');
          grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        } else {
          grad.addColorStop(0, 'rgba(217, 119, 6, 0)');
          grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.16)');
          grad.addColorStop(0.7, 'rgba(124, 58, 237, 0.14)');
          grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        }
        ctx.beginPath();
        const step = Math.max(24, Math.floor(width / 32));
        for (let x = -step; x <= width + step; x += step) {
          const nx = x / width;
          const y =
            height * 0.22 +
            Math.sin(nx * Math.PI * 1.8 + t * 0.35) * 34 +
            Math.cos(nx * Math.PI * 1.1 - t * 0.24) * 18;
          if (x === -step) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 3. Living Pond / Lagoon Mirror Water Shimmer Ripples (lower foreground!)
      if (isSanctuary || isObservatory) {
        for (const r of ripples) {
          const driftX = Math.sin(t * r.speed + r.phase) * 28;
          const x = r.xRatio * width + driftX;
          const y = r.yRatio * height;
          const w = r.widthRatio * width * (0.85 + 0.15 * Math.sin(t * 0.9 + r.phase));
          const alpha =
            (0.10 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.2 + r.phase))) *
            (isDark ? 1 : 0.78);
          const rg = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
          const col = isSanctuary
            ? isDark
              ? `rgba(253, 224, 71, ${alpha})`
              : `rgba(255, 251, 235, ${alpha * 1.25})`
            : isDark
            ? `rgba(251, 191, 36, ${alpha})`
            : `rgba(196, 181, 253, ${alpha})`;
          rg.addColorStop(0, 'rgba(255,255,255,0)');
          rg.addColorStop(0.5, col);
          rg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(x - w / 2, y, w, 1.8);
        }
      }

      // 4. Drifting Golden Fireflies & Floating Warm Water Lanterns
      for (const m of motes) {
        if (animate) {
          m.x += m.vx + Math.sin(t * 0.8 + m.phase) * 0.12;
          m.y += m.vy;
          m.phase += m.speed;
          if (m.y < -16) {
            m.y = height + 12;
            m.x = Math.random() < 0.5 ? Math.random() * width * 0.25 : width * 0.75 + Math.random() * width * 0.25;
          }
          if (m.x < -16) m.x = width + 16;
          if (m.x > width + 16) m.x = -16;
        }
        const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(m.phase));

        if (m.kind === 'lantern') {
          // Warm glowing golden lotus lantern orb + soft water reflection beneath
          const halo = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5.2);
          halo.addColorStop(0, `rgba(254, 240, 138, ${0.82 * glow})`);
          halo.addColorStop(0.35, `rgba(245, 158, 11, ${0.38 * glow})`);
          halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * 5.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 251, 235, ${0.95 * glow})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * 0.65, 0, Math.PI * 2);
          ctx.fill();
        } else if (m.kind === 'firefly') {
          const halo = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3.4);
          halo.addColorStop(
            0,
            isSanctuary
              ? `rgba(167, 243, 208, ${0.72 * glow})`
              : `rgba(253, 224, 71, ${0.72 * glow})`
          );
          halo.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * 3.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = isDark
            ? `rgba(226, 232, 240, ${0.52 * glow})`
            : `rgba(217, 119, 6, ${0.32 * glow})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      if (!hidden) drawFrame(now);
      if (animate) rafId = window.requestAnimationFrame(loop);
    };

    drawFrame(performance.now());
    if (animate) rafId = window.requestAnimationFrame(loop);

    const onVis = () => {
      hidden = document.hidden;
    };
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [backdrop.scene, backdrop.motionEnabled, isDark]);

  // Resolve active 3D World panorama image
  const worldImgSrc =
    backdrop.scene === 'emerald-sanctuary'
      ? './bg/emerald-pond-sanctuary.jpg'
      : backdrop.scene === 'royal-observatory'
      ? './bg/royal-observatory-sanctuary.jpg'
      : './bg/royal-aurora.jpg';

  const showWorldImg =
    backdrop.scene !== 'calm-minimal' &&
    !(backdrop.scene === 'custom-video' && backdrop.customUrl && !videoError) &&
    !imgFailed[worldImgSrc];

  // Calibrated exposure so the 3D village/pond/observatory scenery shines richly without text clash
  const scrimAlpha =
    backdrop.exposure === 'vivid'
      ? isDark
        ? 0.24
        : 0.22
      : backdrop.exposure === 'stealth'
      ? isDark
        ? 0.62
        : 0.62
      : isDark
      ? 0.40
      : 0.38;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* LAYER 0: Base Atmospheric Sky & Water Foundation */}
      <div className="absolute inset-0 ambient-field" />

      {/* LAYER 1: 3D Parallax Sanctuary Panorama OR Custom 4K Video/GIF */}
      <div
        ref={worldPlaneRef}
        className="absolute inset-0 will-change-transform"
        style={{ transform: 'scale(1.06) translate3d(0px, 0px, 0px)' }}
      >
        {backdrop.scene === 'custom-video' && backdrop.customUrl && !videoError ? (
          backdrop.customKind === 'image' ? (
            <img
              src={backdrop.customUrl}
              alt=""
              onError={() => setVideoError(true)}
              className="w-full h-full object-cover"
              style={{ opacity: isDark ? 0.88 : 0.82 }}
            />
          ) : (
            <video
              key={backdrop.customUrl}
              src={backdrop.customUrl}
              autoPlay
              muted
              loop
              playsInline
              onError={() => setVideoError(true)}
              className="w-full h-full object-cover"
              style={{ opacity: isDark ? 0.88 : 0.82 }}
            />
          )
        ) : showWorldImg ? (
          <img
            src={worldImgSrc}
            alt=""
            onError={() => setImgFailed((prev) => ({ ...prev, [worldImgSrc]: true }))}
            className="w-full h-full object-cover transition-opacity duration-700"
            style={{
              opacity: isDark ? 0.86 : 0.78,
              filter: isDark
                ? backdrop.scene === 'emerald-sanctuary'
                  ? 'brightness(0.76) saturate(1.12) contrast(1.06)'
                  : 'brightness(0.86) saturate(1.08)'
                : backdrop.scene === 'royal-observatory'
                ? 'brightness(1.12) saturate(0.95) opacity(0.68)'
                : 'brightness(1.04) saturate(1.08)'
            }}
          />
        ) : null}
      </div>

      {/* LAYER 2: Real-Time 60fps Pond Ripples, Floating Golden Lanterns & Fireflies */}
      {backdrop.scene !== 'calm-minimal' && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      )}

      {/* LAYER 3: Sculpted Open-Corridor Scrim
          Leaves left/right village & palace horizons and lower pond vividly clear,
          while gently calming central glare so floating 3D cards read effortlessly */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: scrimAlpha,
          background: isDark
            ? 'radial-gradient(ellipse 64% 78% at 50% 44%, rgba(6, 8, 22, 0.72) 0%, rgba(8, 10, 26, 0.36) 62%, rgba(6, 8, 20, 0.14) 100%)'
            : 'radial-gradient(ellipse 68% 76% at 50% 42%, rgba(255, 253, 248, 0.72) 0%, rgba(246, 244, 255, 0.34) 64%, rgba(255, 255, 255, 0.08) 100%)'
        }}
      />

      {/* LAYER 4: Ultra-Fine 4K Film Grain */}
      <div className="absolute inset-0 backdrop-grain" />
    </div>
  );
});
MotionBackdrop.displayName = 'MotionBackdrop';
