import React, { useCallback, useRef } from 'react';

interface Pavilion3DProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** Maximum 3D tilt angle in degrees (kept tasteful & posh: 3.5 to 5.5) */
  maxTilt?: number;
  /** Subtle architectural gold/crystal bottom thickness rim */
  rimClass?: string;
  role?: string;
  ariaLabel?: string;
}

/**
 * Interactive 3D Floating Pavilion Surface
 * ----------------------------------------
 * Makes each homepage section behave like a physical, museum-grade 3D pavilion
 * hovering inside the living sanctuary:
 *  - GPU-composited spring-feel pointer 3D perspective tilt
 *  - Live moving glass specular highlight following the cursor
 *  - Physical 3D architectural bottom bevel & floating reflection shadow
 */
export const Pavilion3D: React.FC<Pavilion3DProps> = React.memo(
  ({
    children,
    className = '',
    onClick,
    maxTilt = 4.2,
    rimClass = 'from-amber-400/35 via-white/30 to-violet-400/35',
    role,
    ariaLabel
  }) => {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const sheenRef = useRef<HTMLDivElement | null>(null);

    const handleMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'touch') return;
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / Math.max(1, rect.width);
        const py = (e.clientY - rect.top) / Math.max(1, rect.height);
        const rotY = (px - 0.5) * (maxTilt * 2);
        const rotX = -(py - 0.5) * (maxTilt * 2);
        el.style.transform = `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translate3d(0, -4px, 0)`;

        if (sheenRef.current) {
          sheenRef.current.style.opacity = '1';
          sheenRef.current.style.background = `radial-gradient(420px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255, 250, 230, 0.22), rgba(255, 255, 255, 0.06) 42%, transparent 72%)`;
        }
      },
      [maxTilt]
    );

    const handleLeave = useCallback(() => {
      const el = cardRef.current;
      if (el) {
        el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)';
      }
      if (sheenRef.current) {
        sheenRef.current.style.opacity = '0';
      }
    }, []);

    return (
      <div
        ref={cardRef}
        onClick={onClick}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        role={role}
        aria-label={ariaLabel}
        className={`pavilion-3d relative will-change-transform ${className}`}
        style={{
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Dynamic moving specular crystal sheen */}
        <div
          ref={sheenRef}
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 transition-opacity duration-300 opacity-0"
          aria-hidden="true"
        />

        {/* Physical 3D architectural underside bevel line */}
        <div
          className={`pointer-events-none absolute inset-x-6 -bottom-[2px] h-[3px] rounded-full bg-gradient-to-r ${rimClass} blur-[0.5px] opacity-80`}
          aria-hidden="true"
        />

        {children}
      </div>
    );
  }
);
Pavilion3D.displayName = 'Pavilion3D';
