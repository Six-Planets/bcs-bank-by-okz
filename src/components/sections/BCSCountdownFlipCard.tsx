import React, { useEffect, useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { RotateCw, Calendar, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  BCS_SCHEDULE_CONFIG,
  getNext50thBCSStage,
  calculateCountdownParts
} from '../../config/bcsSchedule';
import { ChronoSundial3DEmblem } from '../illustrations/Royal3DEmblems';
import { FloatingArt } from '../common/FloatingArt';

/* -------------------------------------------------------------------------- */
/*  Isolated 1 Hz clock. Lives ONLY inside the countdown back face.            */
/*  Paused when the card is front-facing or the browser tab is hidden.         */
/* -------------------------------------------------------------------------- */
function useSecondClock(isActive: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isActive) return;
    let timer: number | undefined;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      setNow(Date.now());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };

    const start = () => {
      window.clearTimeout(timer);
      setNow(Date.now());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
      } else {
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isActive]);

  return now;
}

/* -------------------------------------------------------------------------- */
/*  Digit tile: smooth CSS keyframe animation for changing values               */
/* -------------------------------------------------------------------------- */
interface AnimatedDigitTileProps {
  value: number;
  label: string;
  accentClass: string;
  badgeBgClass: string;
}

const AnimatedDigitTile = React.memo<AnimatedDigitTileProps>(
  ({ value, label, accentClass, badgeBgClass }) => {
    const formatted = String(value).padStart(2, '0');
    return (
      <div
        className={`flex flex-col items-center justify-center py-1.5 px-2 sm:py-2 sm:px-3 rounded-2xl border ${badgeBgClass} min-w-[50px] sm:min-w-[62px] shadow-sm`}
      >
        <div className="relative h-6 sm:h-7 flex items-center justify-center overflow-hidden">
          <span
            key={formatted}
            className={`digit-pop font-rounded font-bold text-base sm:text-xl leading-none tracking-tight tabular-nums ${accentClass}`}
          >
            {formatted}
          </span>
        </div>
        <span className="text-[9px] sm:text-[10px] font-rounded font-semibold uppercase tracking-wider theme-text-muted mt-0.5">
          {label}
        </span>
      </div>
    );
  }
);
AnimatedDigitTile.displayName = 'AnimatedDigitTile';

interface TileTheme {
  accents: [string, string, string, string];
  badge: string;
}

const TILE_THEME_50: TileTheme = {
  accents: [
    'text-emerald-700 dark:text-emerald-300',
    'text-teal-700 dark:text-teal-300',
    'text-cyan-700 dark:text-cyan-300',
    'text-indigo-700 dark:text-indigo-300'
  ],
  badge: 'bg-white/85 dark:bg-slate-900/75 border-emerald-300/60 dark:border-emerald-500/30'
};

const TILE_THEME_51: TileTheme = {
  accents: [
    'text-violet-700 dark:text-violet-300',
    'text-fuchsia-700 dark:text-fuchsia-300',
    'text-pink-700 dark:text-pink-300',
    'text-amber-700 dark:text-amber-300'
  ],
  badge: 'bg-white/85 dark:bg-slate-900/75 border-violet-300/60 dark:border-violet-500/30'
};

const TILE_LABELS = ['Days', 'Hours', 'Mins', 'Secs'] as const;

const DigitRow: React.FC<{
  parts: { days: number; hours: number; minutes: number; seconds: number };
  tileTheme: TileTheme;
}> = ({ parts, tileTheme }) => {
  const values = [parts.days, parts.hours, parts.minutes, parts.seconds];
  return (
    <div className="grid grid-cols-4 gap-2">
      {values.map((v, i) => (
        <AnimatedDigitTile
          key={TILE_LABELS[i]}
          value={v}
          label={TILE_LABELS[i]}
          accentClass={tileTheme.accents[i]}
          badgeBgClass={tileTheme.badge}
        />
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Back face — Isolated, displays official countdowns and flip-back button    */
/* -------------------------------------------------------------------------- */
interface CountdownBackContentProps {
  isActive: boolean;
  onFlipBack: () => void;
}

const CountdownBackContent: React.FC<CountdownBackContentProps> = React.memo(
  ({ isActive, onFlipBack }) => {
    const nowMs = useSecondClock(isActive);
    const now = new Date(nowMs);

    const bcs50Resolved = getNext50thBCSStage(now);
    const bcs50Countdown = calculateCountdownParts(bcs50Resolved.stage.scheduledDate, now);
    const bcs51Stage = BCS_SCHEDULE_CONFIG.bcs51.preliminary;
    const bcs51Countdown = calculateCountdownParts(bcs51Stage.scheduledDate, now);

    return (
      <div className="relative rounded-[1.85rem] sm:rounded-[2.25rem] section-card-countdown px-4 py-3.5 sm:px-7 sm:py-4 overflow-hidden">
        {/* Top Bar on Back Face: Title + Flip Back Button */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-indigo-300/30 dark:border-white/15">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
            <span className="font-rounded font-bold text-xs sm:text-sm theme-text-primary">
              Official BPSC Examination Countdowns
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFlipBack();
            }}
            aria-label="Flip back to overview"
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full theme-subcard text-xs font-rounded font-bold text-indigo-700 dark:text-indigo-200 hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-sm shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5 text-fuchsia-500" />
            <span>Flip Back</span>
          </button>
        </div>

        {/* Two Countdowns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* COUNTDOWN A: 50th BCS — Next Upcoming Examination Stage */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-400/40 dark:border-emerald-400/35 flex flex-col justify-between gap-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div>
                <span className="text-[10px] font-rounded font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  50th BCS • Next Upcoming Stage
                </span>
                <h3 className="text-xs sm:text-sm font-rounded font-bold theme-text-primary">
                  {bcs50Resolved.stage.stageName}{' '}
                  <span className="font-bangla text-xs font-semibold theme-text-secondary">
                    ({bcs50Resolved.stage.stageNameBn})
                  </span>
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[10px] sm:text-[11px] font-rounded font-bold">
                <Calendar className="w-3 h-3" />
                <span>{bcs50Resolved.stage.displayDateLabel}</span>
              </span>
            </div>

            {bcs50Countdown.isAnnounced && !bcs50Countdown.isCompleted ? (
              <DigitRow parts={bcs50Countdown} tileTheme={TILE_THEME_50} />
            ) : bcs50Countdown.isCompleted ? (
              <div className="py-2.5 px-4 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-emerald-300/50 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-rounded font-bold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Examination Stage Completed</span>
              </div>
            ) : (
              <div className="py-2.5 px-4 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-emerald-300/50 text-center">
                <span className="font-rounded font-bold text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 block">
                  Date not announced yet
                </span>
                <span className="text-[10px] theme-text-muted">{bcs50Resolved.stage.officialNote}</span>
              </div>
            )}
          </div>

          {/* COUNTDOWN B: 51st BCS — Preliminary Examination */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-amber-500/15 border border-violet-400/40 dark:border-violet-400/35 flex flex-col justify-between gap-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div>
                <span className="text-[10px] font-rounded font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 block">
                  51st BCS • Preliminary Stage
                </span>
                <h3 className="text-xs sm:text-sm font-rounded font-bold theme-text-primary">
                  {bcs51Stage.stageName}{' '}
                  <span className="font-bangla text-xs font-semibold theme-text-secondary">
                    ({bcs51Stage.stageNameBn})
                  </span>
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] sm:text-[11px] font-rounded font-bold">
                <Calendar className="w-3 h-3" />
                <span>{bcs51Stage.displayDateLabel}</span>
              </span>
            </div>

            {bcs51Countdown.isAnnounced && !bcs51Countdown.isCompleted ? (
              <DigitRow parts={bcs51Countdown} tileTheme={TILE_THEME_51} />
            ) : (
              <div className="py-2 px-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/75 border border-violet-300/60 dark:border-violet-500/30 flex items-center justify-between gap-2 shadow-sm h-full">
                <div>
                  <span className="font-rounded font-bold text-xs sm:text-sm text-violet-800 dark:text-violet-200 block">
                    Date not announced yet
                  </span>
                  <span className="text-[10px] sm:text-[11px] theme-text-muted block">
                    {bcs51Stage.officialNote}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-rounded font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-400/30 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>Pending BPSC</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
CountdownBackContent.displayName = 'CountdownBackContent';

/* -------------------------------------------------------------------------- */
/*  Front face — Static, displays headline and 3D illustration                 */
/* -------------------------------------------------------------------------- */
const CountdownFrontContent: React.FC = React.memo(() => {
  const stageName = useMemo(() => getNext50thBCSStage(new Date()).stage.stageName, []);

  return (
    <div className="relative rounded-[1.85rem] sm:rounded-[2.25rem] section-card-countdown px-5 py-4 sm:px-8 sm:py-5 overflow-hidden transition-transform duration-300 group-hover:-translate-y-0.5">
      {/* Ambient Decorative Glows (blur-free radial masks) */}
      <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-gradient-to-br from-violet-400/35 via-fuchsia-400/25 to-transparent glow-orb" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-tl from-amber-300/40 via-sky-300/30 to-transparent glow-orb" />

      <div className="relative z-10 flex flex-row items-center justify-between gap-3 sm:gap-6">
        <div className="space-y-1.5 sm:space-y-2.5 text-left flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-rounded font-bold">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>50th BCS • {stageName}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-700 dark:text-violet-300 text-[10px] sm:text-xs font-rounded font-bold">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>51st BCS • Preliminary</span>
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl lg:text-[1.95rem] font-rounded font-bold theme-text-primary tracking-tight leading-snug">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 dark:from-indigo-300 dark:via-violet-300 dark:to-pink-300 bg-clip-text text-transparent">
              50th BCS Ongoing.
            </span>{' '}
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 dark:from-amber-300 dark:via-orange-300 dark:to-rose-300 bg-clip-text text-transparent">
              51st BCS Awaits.
            </span>
          </h2>

          <div className="pt-0.5 flex items-center">
            <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full theme-subcard text-[11px] sm:text-xs font-rounded font-bold text-indigo-700 dark:text-indigo-200 group-hover:scale-[1.03] transition-transform shadow-sm">
              <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-fuchsia-500 group-hover:rotate-180 transition-transform duration-500" />
              <span>Tap to flip for live exam countdowns</span>
            </span>
          </div>
        </div>

        <FloatingArt
          variant="gentle"
          className="shrink-0 group-hover:scale-105 transition-transform duration-500"
        >
          <ChronoSundial3DEmblem className="w-24 h-20 sm:w-32 sm:h-24 drop-shadow-[0_12px_22px_rgba(245,158,11,0.28)]" />
        </FloatingArt>
      </div>
    </div>
  );
});
CountdownFrontContent.displayName = 'CountdownFrontContent';

/* -------------------------------------------------------------------------- */
/*  High-Performance 3D Flip Card Container                                    */
/*  - Both faces remain permanently mounted in the DOM (no mount/unmount lag)   */
/*  - GPU-accelerated 3D transform (rotateX) with backface-visibility: hidden  */
/*  - Smooth height transition dynamically calculated via ResizeObserver       */
/*  - Rapid repeated clicks reverse velocity smoothly without queuing or delay  */
/* -------------------------------------------------------------------------- */
export const BCSCountdownFlipCard: React.FC = React.memo(() => {
  const [isFlipped, setIsFlipped] = useState(false);
  const isFirstRender = useRef(true);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState({ front: 0, back: 0 });

  const updateHeights = useCallback(() => {
    const f = frontRef.current?.offsetHeight || 0;
    const b = backRef.current?.offsetHeight || 0;
    if (f > 0 && b > 0) {
      setHeights((prev) => (prev.front === f && prev.back === b ? prev : { front: f, back: b }));
    }
  }, []);

  useLayoutEffect(() => {
    updateHeights();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateHeights());
      if (frontRef.current) ro.observe(frontRef.current);
      if (backRef.current) ro.observe(backRef.current);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', updateHeights);
    return () => window.removeEventListener('resize', updateHeights);
  }, [updateHeights]);

  const flipToBack = useCallback(() => {
    isFirstRender.current = false;
    setIsFlipped(true);
  }, []);

  const flipToFront = useCallback(() => {
    isFirstRender.current = false;
    setIsFlipped(false);
  }, []);

  const currentHeight = isFlipped ? (heights.back ? `${heights.back}px` : undefined) : undefined;

  return (
    <div
      className="w-full perspective-1400 select-none"
      style={{
        height: currentHeight,
        transition: !isFirstRender.current ? 'height 0.42s cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
      }}
    >
      <div
        className="relative w-full h-full preserve-3d"
        style={{
          transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
          transition: !isFirstRender.current ? 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}
      >
        {/* FRONT FACE (rotateX: 0deg, in document flow) */}
        <div
          ref={frontRef}
          onClick={flipToBack}
          role="button"
          tabIndex={!isFlipped ? 0 : -1}
          aria-label="50th BCS Ongoing. 51st BCS Awaits. Click to flip for countdowns."
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              flipToBack();
            }
          }}
          className={`w-full backface-hidden cursor-pointer group relative ${
            isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
          style={{
            transform: 'rotateX(0deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <CountdownFrontContent />
        </div>

        {/* BACK FACE (rotateX: 180deg, positioned absolute) */}
        <div
          ref={backRef}
          className={`w-full absolute top-0 left-0 backface-hidden ${
            isFlipped ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          style={{
            transform: 'rotateX(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <CountdownBackContent isActive={isFlipped} onFlipBack={flipToFront} />
        </div>
      </div>
    </div>
  );
});
BCSCountdownFlipCard.displayName = 'BCSCountdownFlipCard';
