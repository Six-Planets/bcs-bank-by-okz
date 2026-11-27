import React, { useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { applyUpdate, useUpdateCheck } from '../../lib/updater';

/** Floating Royal "Update Available" prompt for both Website & Android APK */
export const UpdateBanner: React.FC = () => {
  const [info, dismiss] = useUpdateCheck();
  const [busy, setBusy] = useState(false);
  if (!info) return null;

  const isApk = info.kind === 'apk';
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Update available"
      className="fixed z-[100] left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+1rem)] w-[calc(100%-1.5rem)] max-w-md rounded-3xl section-card-royal-hero shadow-2xl p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-violet-600 flex items-center justify-center text-white shadow-md">
        {isApk ? (
          <Download className="w-5 h-5" />
        ) : (
          <RefreshCw className={`w-5 h-5 ${busy ? 'animate-spin' : ''}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-rounded font-extrabold text-sm theme-text-primary">
          {isApk
            ? `New APK Update v${info.version} (Build ${info.build})`
            : `Update Ready v${info.version} (Build ${info.build})`}
        </p>
        <p className="font-rounded text-xs theme-text-secondary truncate">
          {isApk
            ? `v${info.currentVersion} → v${info.version} · tap to download & install`
            : `v${info.currentVersion} → v${info.version} · instant seamless update`}
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void applyUpdate(info);
          if (isApk) window.setTimeout(() => setBusy(false), 3000);
        }}
        className="shrink-0 px-4 py-2 rounded-2xl btn-royal-gold text-white font-rounded font-bold text-xs active:scale-95 transition cursor-pointer disabled:opacity-70"
      >
        {busy ? 'Updating…' : isApk ? 'Install APK' : 'Update'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Later"
        className="shrink-0 p-1.5 rounded-xl theme-text-muted hover:theme-text-primary cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
