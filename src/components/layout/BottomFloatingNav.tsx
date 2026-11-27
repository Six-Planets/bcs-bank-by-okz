import React from 'react';
import { motion } from 'framer-motion';

export type NavDestination = 'arena' | 'progress' | 'profile' | 'settings' | 'leaderboard';

interface BottomFloatingNavProps {
  activeNav: NavDestination;
  onSelectNav: (dest: NavDestination) => void;
}

const BottomFloatingNavBase: React.FC<BottomFloatingNavProps> = ({
  activeNav,
  onSelectNav
}) => {
  const items: {
    id: NavDestination;
    label: string;
    activePillClass: string;
    topGlowColor: string;
    activeTextClass: string;
    renderIcon: (active: boolean) => React.ReactNode;
  }[] = [
    {
      id: 'arena',
      label: 'Arena',
      activePillClass:
        'from-violet-500/22 via-fuchsia-500/18 to-pink-500/22 border-violet-400/50 dark:border-violet-400/45 shadow-[0_8px_22px_-4px_rgba(139,92,246,0.32)]',
      topGlowColor: '#A855F7',
      activeTextClass: 'text-violet-700 dark:text-violet-200',
      renderIcon: (active) => (
        <svg viewBox="0 0 32 32" className="w-6 h-6 sm:w-6 sm:h-6" fill="none">
          <defs>
            <linearGradient id="navArenaGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="55%" stopColor="#D946EF" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          <polygon
            points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5"
            fill={active ? 'url(#navArenaGrad)' : 'rgba(139, 92, 246, 0.14)'}
            stroke={active ? '#FFFFFF' : '#8B5CF6'}
            strokeWidth="2"
          />
          <path
            d="M16 9L18.2 13.8L23 16L18.2 18.2L16 23L13.8 18.2L9 16L13.8 13.8L16 9Z"
            fill={active ? '#FFFFFF' : '#EC4899'}
          />
        </svg>
      )
    },
    {
      id: 'progress',
      label: 'Progress',
      activePillClass:
        'from-emerald-500/22 via-teal-500/18 to-cyan-500/22 border-emerald-400/50 dark:border-emerald-400/45 shadow-[0_8px_22px_-4px_rgba(16,185,129,0.32)]',
      topGlowColor: '#10B981',
      activeTextClass: 'text-emerald-700 dark:text-emerald-200',
      renderIcon: (active) => (
        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
          <defs>
            <linearGradient id="navProgGrad" x1="4" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="navProgCyan" x1="12" y1="8" x2="26" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="17"
            width="6"
            height="11"
            rx="3"
            fill={active ? 'url(#navProgGrad)' : 'rgba(16, 185, 129, 0.35)'}
            stroke={active ? '#FFFFFF' : '#10B981'}
            strokeWidth="1.5"
          />
          <rect
            x="13"
            y="12"
            width="6"
            height="16"
            rx="3"
            fill={active ? 'url(#navProgCyan)' : 'rgba(6, 182, 212, 0.45)'}
            stroke={active ? '#FFFFFF' : '#06B6D4'}
            strokeWidth="1.5"
          />
          <rect
            x="22"
            y="6"
            width="6"
            height="22"
            rx="3"
            fill="url(#navProgGrad)"
            stroke={active ? '#FFFFFF' : '#10B981'}
            strokeWidth="1.5"
          />
          <circle cx="8" cy="10" r="3" fill="#FACC15" />
          <path d="M8 10L16 7L24 4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: 'Profile',
      activePillClass:
        'from-fuchsia-500/22 via-purple-500/18 to-rose-500/22 border-fuchsia-400/50 dark:border-fuchsia-400/45 shadow-[0_8px_22px_-4px_rgba(217,70,239,0.32)]',
      topGlowColor: '#EC4899',
      activeTextClass: 'text-fuchsia-700 dark:text-fuchsia-200',
      renderIcon: (active) => (
        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
          <defs>
            <linearGradient id="navProfGrad" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          <circle
            cx="16"
            cy="11"
            r="6"
            fill={active ? 'url(#navProfGrad)' : 'rgba(168, 85, 247, 0.25)'}
            stroke={active ? '#FFFFFF' : '#A855F7'}
            strokeWidth="1.8"
          />
          <path
            d="M6 26.5C6 21.8 10.5 18.5 16 18.5C21.5 18.5 26 21.8 26 26.5"
            fill={active ? 'url(#navProfGrad)' : 'rgba(236, 72, 153, 0.22)'}
            stroke={active ? '#FFFFFF' : '#EC4899'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="22.5" cy="7" r="2.5" fill="#FACC15" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      activePillClass:
        'from-sky-500/22 via-blue-500/18 to-indigo-500/22 border-sky-400/50 dark:border-sky-400/45 shadow-[0_8px_22px_-4px_rgba(14,165,233,0.32)]',
      topGlowColor: '#0EA5E9',
      activeTextClass: 'text-sky-700 dark:text-sky-200',
      renderIcon: (active) => (
        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
          <defs>
            <linearGradient id="navSetGrad" x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="8"
            width="24"
            height="4.5"
            rx="2.25"
            fill={active ? 'url(#navSetGrad)' : 'rgba(14, 165, 233, 0.28)'}
          />
          <rect
            x="4"
            y="19.5"
            width="24"
            height="4.5"
            rx="2.25"
            fill={active ? 'url(#navSetGrad)' : 'rgba(99, 102, 241, 0.28)'}
          />
          <circle
            cx="11.5"
            cy="10.25"
            r="4.5"
            fill={active ? '#FFFFFF' : '#38BDF8'}
            stroke="#4F46E5"
            strokeWidth="2"
          />
          <circle
            cx="20.5"
            cy="21.75"
            r="4.5"
            fill={active ? '#FFFFFF' : '#818CF8'}
            stroke="#0284C7"
            strokeWidth="2"
          />
        </svg>
      )
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      activePillClass:
        'from-amber-500/25 via-orange-500/20 to-rose-500/22 border-amber-400/55 dark:border-amber-400/45 shadow-[0_8px_22px_-4px_rgba(245,158,11,0.35)]',
      topGlowColor: '#F59E0B',
      activeTextClass: 'text-amber-700 dark:text-amber-200',
      renderIcon: (active) => (
        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
          <defs>
            <linearGradient id="navLeadGrad" x1="6" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          <path
            d="M8 6H24V11C24 14.5 27 14 27 10V8H24"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M8 8H5V10C5 14 8 14.5 8 11"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M8.5 5.5H23.5V12.5C23.5 16.6 20.1 20 16 20C11.9 20 8.5 16.6 8.5 12.5V5.5Z"
            fill={active ? 'url(#navLeadGrad)' : 'rgba(245, 158, 11, 0.32)'}
            stroke={active ? '#FFFFFF' : '#F59E0B'}
            strokeWidth="1.8"
          />
          <path
            d="M16 20V25M11 26H21"
            stroke={active ? '#EA580C' : '#F59E0B'}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <polygon
            points="16,8.5 17.3,11.2 20.2,11.6 18.1,13.6 18.6,16.5 16,15.1 13.4,16.5 13.9,13.6 11.8,11.6 14.7,11.2"
            fill="#FFFFFF"
          />
        </svg>
      )
    }
  ];

  return (
    <div className="fixed bottom-3.5 sm:bottom-5 inset-x-0 z-50 flex flex-col items-center px-3 sm:px-4 pointer-events-none">
      <nav
        aria-label="Primary Bottom Navigation"
        className="pointer-events-auto relative w-full max-w-[460px] sm:max-w-[590px] glass-bottom-dock rounded-[2.2rem] p-1.5 sm:p-2 flex items-center justify-between gap-1 sm:gap-2"
      >
        {/* Subtle floating golden pier water-reflection glow beneath dock */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 inset-x-10 h-3 rounded-full bg-gradient-to-r from-transparent via-amber-400/45 to-transparent blur-md"
        />
        {items.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <motion.button
              key={item.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelectNav(item.id)}
              className={`relative flex-1 py-2 sm:py-2.5 px-1 sm:px-3.5 rounded-[1.75rem] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors duration-300 cursor-pointer select-none ${
                isActive
                  ? `${item.activeTextClass} font-bold`
                  : 'theme-text-secondary hover:theme-text-primary font-semibold'
              }`}
            >
              {/* Animated Floating Glass Active Pill */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  className={`absolute inset-0 rounded-[1.75rem] bg-gradient-to-br border ${item.activePillClass}`}
                />
              )}

              {/* Subtle Illuminated Top Beam on Active Item */}
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-top-dot"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute -top-0.5 w-6 h-1 rounded-full"
                  style={{
                    backgroundColor: item.topGlowColor,
                    boxShadow: `0 0 10px ${item.topGlowColor}`
                  }}
                />
              )}

              <motion.span
                animate={{
                  scale: isActive ? 1.12 : 1,
                  y: isActive ? -1 : 0
                }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className="relative z-10"
              >
                {item.renderIcon(isActive)}
              </motion.span>

              <span className="relative z-10 text-[10px] sm:text-xs font-rounded tracking-tight leading-none">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};

export const BottomFloatingNav = React.memo(BottomFloatingNavBase);
