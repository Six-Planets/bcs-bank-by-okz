import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Globe2, Sparkles } from 'lucide-react';
import { useTheme, toggleTheme } from '../../theme';
import { useBackdrop, cycleWorldScene } from '../../backdrop';

export type { ThemeMode } from '../../theme';

const SCENE_LABELS: Record<string, string> = {
  'emerald-sanctuary': 'Pond Sanctuary',
  'royal-observatory': 'Observatory',
  'royal-aurora': 'Silk Aurora',
  'custom-video': 'Custom 4K',
  'calm-minimal': 'Minimal'
};

const BrandingBarBase: React.FC = () => {
  const theme = useTheme();
  const backdrop = useBackdrop();
  const isDark = theme === 'dark';

  return (
    <section
      aria-label="BCS Bank by OKZ Command Bridge and Theme Switch"
      className="relative rounded-[1.5rem] sm:rounded-[1.9rem] section-card-branding px-3.5 py-2.5 sm:px-6 sm:py-3 overflow-hidden select-none"
    >
      {/* Subtle Royal Gold & Emerald Horizon Glows */}
      <div className="pointer-events-none absolute -left-10 -top-10 w-44 h-44 rounded-full bg-gradient-to-br from-amber-400/26 via-emerald-400/18 to-transparent glow-orb" />
      <div className="pointer-events-none absolute right-14 -bottom-10 w-44 h-44 rounded-full bg-gradient-to-tl from-indigo-400/24 via-amber-300/22 to-transparent glow-orb" />

      <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4">
        {/* LEFT: Bespoke OKZ Royal Seal + Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-violet-700 p-[1.5px] shadow-[0_8px_20px_-4px_rgba(245,158,11,0.55)] shrink-0">
            <div className="w-full h-full rounded-[10px] sm:rounded-[14px] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.75)]" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 min-w-0">
            <span className="font-royal font-extrabold text-sm sm:text-xl lg:text-2xl tracking-[0.06em] bg-gradient-to-r from-amber-600 via-amber-500 to-indigo-700 dark:from-amber-200 dark:via-yellow-300 dark:to-amber-100 bg-clip-text text-transparent drop-shadow-sm whitespace-nowrap">
              BCS BANK
            </span>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-violet-500/12 to-emerald-500/15 border border-amber-400/45 dark:border-amber-300/35 shrink-0">
              <span className="text-[10px] font-rounded font-semibold theme-text-muted">by</span>
              <span className="font-royal font-extrabold text-[11px] sm:text-xs bg-gradient-to-r from-amber-600 to-violet-700 dark:from-amber-300 dark:to-yellow-200 bg-clip-text text-transparent tracking-widest">
                OKZ
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 pl-1.5 border-l border-amber-500/30 text-[10px] font-rounded font-semibold theme-text-secondary">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                <span>Obaidul Kader Zihad</span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: 1-Click 3D World Switcher + Glossy 3D Light/Dark Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={cycleWorldScene}
            title="Switch live 3D sanctuary world"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full theme-subcard border border-amber-400/35 text-[10px] sm:text-xs font-rounded font-bold text-amber-800 dark:text-amber-200 hover:scale-[1.03] active:scale-95 transition-transform cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden xs:inline sm:inline">
              {SCENE_LABELS[backdrop.scene] || '3D World'}
            </span>
          </button>

          <motion.button
            type="button"
            role="switch"
            aria-checked={isDark}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="theme-toggle-btn relative inline-flex items-center gap-2 p-1 pr-2.5 sm:p-1.5 sm:pr-3 rounded-full theme-subcard shadow-[0_4px_16px_-4px_rgba(99,102,241,0.22)] cursor-pointer select-none shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <div
              className={`relative w-[48px] sm:w-[56px] h-[25px] sm:h-[29px] p-[2px] sm:p-[2.5px] rounded-full transition-colors duration-300 flex items-center ${
                isDark
                  ? 'bg-slate-900/85 border border-amber-400/25 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.6)]'
                  : 'bg-slate-200/85 border border-black/5 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.12)]'
              }`}
            >
              <div
                className={`theme-toggle-thumb relative z-10 w-[21px] h-[21px] sm:w-[24px] sm:h-[24px] rounded-full flex items-center justify-center will-change-transform [--toggle-travel:23px] sm:[--toggle-travel:27px] ${
                  isDark
                    ? 'bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 text-amber-200 shadow-[0_2px_10px_rgba(99,102,241,0.55)]'
                    : 'bg-gradient-to-br from-amber-300 via-orange-400 to-rose-400 text-white shadow-[0_2px_8px_rgba(245,158,11,0.5)]'
                }`}
                style={{
                  transform: isDark
                    ? 'translate3d(var(--toggle-travel, 23px), 0, 0)'
                    : 'translate3d(0, 0, 0)',
                  transition:
                    'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, background 0.3s ease'
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`w-3.5 h-3.5 text-white absolute inset-0 m-auto transform transition-all duration-300 ease-out ${
                    isDark ? 'scale-0 rotate-90 opacity-0 pointer-events-none' : 'scale-100 rotate-0 opacity-100'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>

                <svg
                  viewBox="0 0 24 24"
                  className={`w-3.5 h-3.5 text-amber-200 absolute inset-0 m-auto transform transition-all duration-300 ease-out ${
                    isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0 pointer-events-none'
                  }`}
                  fill="currentColor"
                >
                  <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                </svg>
              </div>
            </div>

            <span className="hidden sm:block text-xs font-rounded font-bold theme-text-primary leading-none">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export const BCSBankBrandingBar = React.memo(BrandingBarBase);
