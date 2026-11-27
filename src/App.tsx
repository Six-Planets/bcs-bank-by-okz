import React, { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BottomFloatingNav, NavDestination } from './components/layout/BottomFloatingNav';
import { MotionBackdrop } from './components/common/MotionBackdrop';
import { UpdateBanner } from './components/common/UpdateBanner';
import type { ActiveView } from './components/screens/DestinationViews';
import { LoginScreen } from './components/screens/LoginScreen';
import {
  AuthUser,
  consumeAuthRedirectHash,
  getStoredUser,
  logoutUser,
  subscribeUser
} from './auth';
import { flushAttempts } from './lib/api';
import { APP_VERSION_LABEL } from './lib/updater';
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
 * Full BCS-Monster-style Auth + Living 3D Sanctuary Backdrop + In-App Updater + Version Tag on every page.
 */
export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const view = useActiveView();
  const isHome = view === 'home';
  const homeScroll = useRef(0);
  const prevView = useRef<ActiveView>(view);

  useEffect(() => {
    const unsub = subscribeUser(setCurrentUser);
    void consumeAuthRedirectHash().then((kind) => {
      if (kind === 'recovery') navigate('settings');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (currentUser && !currentUser.isGuest) void flushAttempts();
  }, [currentUser]);

  // Idle-prefetch the 5,655-question classified bank once signed in so Topic Master, Mock Test & Question Bank open instantly.
  useEffect(() => {
    if (!currentUser) return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => prefetchBCSQuestionBank(), { timeout: 2200 });
    } else {
      const t = window.setTimeout(() => prefetchBCSQuestionBank(), 900);
      return () => window.clearTimeout(t);
    }
  }, [currentUser]);

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
  const handleLogout = useCallback(() => {
    logoutUser();
    setCurrentUser(null);
    navigate('home');
  }, []);

  const handleSelectBottomNav = useCallback((dest: NavDestination) => {
    if (dest === 'arena') {
      navigate('home');
    } else {
      navigate(getActiveView() === dest ? 'home' : dest);
    }
  }, []);

  if (!currentUser) {
    return (
      <>
        <LoginScreen onLoginSuccess={setCurrentUser} />
        <UpdateBanner />
      </>
    );
  }

  const activeNav: NavDestination =
    view === 'progress' || view === 'profile' || view === 'settings' || view === 'leaderboard'
      ? view
      : 'arena';

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-between">
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
              <DestinationView
                view={view}
                onBackHome={handleBackHome}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            </div>
          )}
        </Suspense>
      </main>

      {/* Subtle small-font version & build tag on EVERY page (Homepage + every subpage + APK) */}
      <footer
        className={`relative z-10 w-full text-center font-rounded text-[10px] tracking-wide theme-text-muted/85 select-none ${
          isHome ? 'pb-24 sm:pb-28 -mt-20 sm:-mt-24 pointer-events-none' : 'pb-5 pt-1'
        }`}
      >
        BCS Bank by OKZ {APP_VERSION_LABEL} · Obaidul Kader Zihad
      </footer>

      {isHome && (
        <BottomFloatingNav activeNav={activeNav} onSelectNav={handleSelectBottomNav} />
      )}

      <UpdateBanner />
    </div>
  );
}

export default App;
