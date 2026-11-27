import React, { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { BottomFloatingNav, NavDestination } from './components/layout/BottomFloatingNav';
import { MotionBackdrop } from './components/common/MotionBackdrop';
import type { ActiveView } from './components/screens/DestinationViews';
import { getActiveView, navigate, useActiveView } from './router';
import { prefetchBCSQuestionBank } from './data/questionBank';

const HomeScreen = lazy(() =>
  import('./components/screens/HomeScreen').then((m) => ({ default: m.HomeScreen }))
);
const DestinationView = lazy(() =>
  import('./components/screens/DestinationViews').then((m) => ({ default: m.DestinationView }))
);

/**
 * BCS Bank by OKZ (BBBOKZ) App Shell
 * Persistent GPU-accelerated infinite MotionBackdrop + Homepage Arena + Floating Bottom Menu Bar.
 */
export function App() {
  const view = useActiveView();
  const isHome = view === 'home';
  const homeScroll = useRef(0);
  const prevView = useRef<ActiveView>(view);

  // Idle-prefetch the 5,655-question classified archive so Topic Master, Mock Test & Question Bank open instantly.
  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => prefetchBCSQuestionBank(), { timeout: 2200 });
    } else {
      const t = window.setTimeout(() => prefetchBCSQuestionBank(), 800);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (getActiveView() === 'home') homeScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    if (prevView.current === view) return;
    prevView.current = view;
    window.scrollTo({
      top: view === 'home' ? homeScroll.current : 0,
      behavior: 'instant' as ScrollBehavior
    });
  }, [view]);

  const handleOpenDestination = useCallback((dest: ActiveView) => navigate(dest), []);
  const handleBackHome = useCallback(() => navigate('home'), []);

  const handleSelectBottomNav = useCallback((dest: NavDestination) => {
    if (dest === 'arena') {
      navigate('home');
    } else {
      navigate(getActiveView() === dest ? 'home' : dest);
    }
  }, []);

  const activeNav: NavDestination =
    view === 'progress' || view === 'profile' || view === 'settings' || view === 'leaderboard'
      ? view
      : 'arena';

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-between">
      {/* Persistent Infinite Motion Backdrop with Anti-Clash Reading Corridor Scrim */}
      <MotionBackdrop />

      <main className="relative z-10 flex-1 w-full">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center font-rounded font-bold text-sm theme-text-secondary">
              Loading BCS Bank by OKZ...
            </div>
          }
        >
          <div className={isHome ? 'screen-enter' : 'screen-hidden'}>
            <HomeScreen onOpen={handleOpenDestination} />
          </div>

          {!isHome && (
            <div key={view} className="screen-enter">
              <DestinationView view={view} onBackHome={handleBackHome} />
            </div>
          )}
        </Suspense>
      </main>

      <footer
        className={`relative z-10 w-full text-center font-rounded text-[10px] tracking-wide theme-text-muted/85 select-none ${
          isHome ? 'pb-24 sm:pb-28 -mt-20 sm:-mt-24 pointer-events-none' : 'pb-5 pt-1'
        }`}
      >
        BCS Bank by OKZ (BBBOKZ) · Crafted by Obaidul Kader Zihad
      </footer>

      {/* Homepage 5-item floating bottom navigation: visible ONLY on the homepage */}
      {isHome && (
        <BottomFloatingNav activeNav={activeNav} onSelectNav={handleSelectBottomNav} />
      )}
    </div>
  );
}

export default App;
