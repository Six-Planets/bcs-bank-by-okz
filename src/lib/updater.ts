/**
 * In-App Self-Updater for BCS Bank by OKZ (BBBOKZ) — Website & Android APK
 * ------------------------------------------------------------------------
 * - Website & WebView layer: detects newer ./version.json -> prompts seamless in-app cache refresh.
 * - Android APK native shell: reads BBBOKZApp/<code > in User-Agent -> if version.json has a higher
 *   native.code, prompts & downloads the latest signed BCS-Bank-by-OKZ.apk directly in-app!
 */
import { useEffect, useState } from 'react';

declare const __BBBOKZ_VERSION__: string | undefined;
declare const __BBBOKZ_BUILD__: number | undefined;

export const APP_VERSION: string =
  (typeof __BBBOKZ_VERSION__ !== 'undefined' && __BBBOKZ_VERSION__) ||
  (import.meta.env.VITE_APP_VERSION as string | undefined) ||
  '2.0.0';

export const APP_BUILD_NUMBER: number =
  (typeof __BBBOKZ_BUILD__ !== 'undefined' && Number(__BBBOKZ_BUILD__)) || 1;

export const APP_VERSION_LABEL = `v${APP_VERSION} (Build ${APP_BUILD_NUMBER})`;

export const LATEST_APK_URL =
  'https://github.com/Six-Planets/bcs-bank-by-okz/releases/latest/download/BCS-Bank-by-OKZ.apk';

const UA_TAG = /BBBOKZApp\/(\d+)/;

interface RemoteVersion {
  version: string;
  build?: number;
  builtAt?: string;
  native?: { code: number; version: string; apk: string };
}

export type UpdateInfo =
  | { kind: 'web'; version: string; build: number; currentVersion: string }
  | { kind: 'apk'; version: string; build: number; currentVersion: string; url: string };

export function nativeCode(): number | null {
  const m = typeof navigator !== 'undefined' ? navigator.userAgent.match(UA_TAG) : null;
  return m ? Number(m[1]) : null;
}

export function isAndroidAppShell(): boolean {
  return nativeCode() !== null;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  let remote: RemoteVersion;
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    remote = (await res.json()) as RemoteVersion;
  } catch {
    return null;
  }

  const installedNative = nativeCode();
  const remoteNativeCode = Number(remote.native?.code || 0);

  // 1. Inside Android APK: if a newer signed APK build exists, offer direct APK self-update
  if (installedNative !== null && remoteNativeCode > installedNative) {
    return {
      kind: 'apk',
      version: remote.native?.version || remote.version,
      build: remoteNativeCode,
      currentVersion: APP_VERSION,
      url: remote.native?.apk || LATEST_APK_URL
    };
  }

  // 2. Website or WebView: if web bundle version or build bumped, offer seamless instant refresh
  const remoteBuild = Number(remote.build || remoteNativeCode || APP_BUILD_NUMBER);
  if (
    (remote.version && remote.version !== APP_VERSION) ||
    remoteBuild > APP_BUILD_NUMBER
  ) {
    return {
      kind: 'web',
      version: remote.version || APP_VERSION,
      build: remoteBuild,
      currentVersion: APP_VERSION
    };
  }

  return null;
}

export async function applyUpdate(u: UpdateInfo): Promise<void> {
  if (u.kind === 'apk') {
    window.location.href = u.url;
    return;
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('bbbokz-shell-') || k.startsWith('bbbokz-db-'))
          .map((k) => caches.delete(k))
      );
    }
  } catch {
    /* ignore */
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_u', `${u.version}-${u.build}`);
  window.location.replace(url.toString());
}

const SNOOZE_KEY = 'bbbokz-update-snooze';

export function useUpdateCheck(): [UpdateInfo | null, () => void] {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const u = await checkForUpdate();
      if (!alive || !u) return;
      let snoozed = '';
      try {
        snoozed = sessionStorage.getItem(SNOOZE_KEY) || '';
      } catch {
        /* ignore */
      }
      if (snoozed !== `${u.kind}:${u.version}:${u.build}`) setInfo(u);
    };

    const first = window.setTimeout(run, 2500);
    const every = window.setInterval(run, 5 * 60 * 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(every);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const dismiss = () => {
    if (info) {
      try {
        sessionStorage.setItem(SNOOZE_KEY, `${info.kind}:${info.version}:${info.build}`);
      } catch {
        /* ignore */
      }
    }
    setInfo(null);
  };

  return [info, dismiss];
}
