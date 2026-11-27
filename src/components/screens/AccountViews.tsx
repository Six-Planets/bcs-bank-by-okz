import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Check,
  Cloud,
  Compass,
  Crown,
  Database,
  Download,
  Film,
  Flame,
  Globe2,
  KeyRound,
  Layers,
  Loader2,
  LogOut,
  RefreshCw,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  Trees,
  Trophy,
  Upload,
  Wand2
} from 'lucide-react';
import type { AuthUser } from '../../auth';
import {
  ApiError,
  LeaderRow,
  Stats,
  changePassword,
  getLeaderboard,
  getProfile,
  getStats,
  isCloudAuthConfigured,
  pendingAttempts,
  updateProfile
} from '../../lib/api';
import {
  APP_VERSION_LABEL,
  LATEST_APK_URL,
  UpdateInfo,
  applyUpdate,
  checkForUpdate,
  nativeCode
} from '../../lib/updater';
import { readMasteryMap } from '../../data/syllabus';
import {
  BackdropExposure,
  BackdropScene,
  clearCustomBackdropMedia,
  setBackdropExposure,
  setBackdropScene,
  setCustomBackdropMedia,
  toggleBackdropMotion,
  toggleBackdropParallax,
  useBackdrop
} from '../../backdrop';
import { toggleTheme, useTheme } from '../../theme';

function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e: ApiError) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return { data, error, loading, reload: useCallback(() => setTick((t) => t + 1), []) };
}

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = 'section-card-tm',
  children
}) => <div className={`${className} rounded-[2.25rem] p-5 sm:p-9 space-y-6`}>{children}</div>;

const fmt = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });

/* ---------------------------------------------------------------- PROGRESS */
export const ProgressView: React.FC = () => {
  const { data, loading, error, reload } = useLoad<Stats>(getStats);
  const queued = pendingAttempts();
  const mastery = useMemo(() => readMasteryMap(), []);
  const masteredCount = useMemo(
    () => Object.values(mastery).filter((v) => v === 1).length,
    [mastery]
  );
  const subjects = data ? Object.entries(data.subjects).sort((a, b) => b[1].total - a[1].total) : [];

  return (
    <Card className="section-card-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 font-rounded font-bold text-xs">
            <Target className="w-3.5 h-3.5" />
            <span>{isCloudAuthConfigured() ? 'Cloud + Local Sync Active' : 'Local-First Analytics'}</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
            Your Learning Progress
          </h1>
        </div>
        <button
          type="button"
          onClick={reload}
          aria-label="Refresh progress"
          className="p-2.5 rounded-full theme-subcard cursor-pointer hover:scale-105 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 theme-text-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {queued > 0 && (
        <p className="text-xs font-rounded theme-text-secondary">
          {queued} mock result(s) queued offline — they will sync automatically when online.
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 font-rounded font-bold text-sm theme-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading progress…
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-rounded text-xs text-center">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Mock Tests', value: fmt(data.attempts) },
              { label: 'Accuracy', value: data.attempts ? `${fmt(data.accuracy, 1)}%` : '—' },
              {
                label: 'Best Score',
                value: data.best_score === null ? '—' : `${fmt(data.best_score, 2)}/200`
              },
              { label: 'Topics Mastered', value: fmt(masteredCount) }
            ].map((s) => (
              <div key={s.label} className="p-4 sm:p-5 rounded-3xl theme-subcard text-center space-y-1">
                <div className="text-xl sm:text-2xl font-rounded font-extrabold theme-text-primary">
                  {s.value}
                </div>
                <div className="text-xs font-rounded theme-text-secondary">{s.label}</div>
              </div>
            ))}
          </div>

          {subjects.length === 0 ? (
            <div className="p-6 rounded-3xl theme-subcard text-center space-y-1.5">
              <p className="font-rounded font-bold text-sm theme-text-primary">
                Ready for your first full-length mock test!
              </p>
              <p className="font-rounded text-xs theme-text-secondary">
                Finish a Mock Test or drill S-Tier topics inside Royal Topic Master to build your subject radar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="font-rounded font-bold theme-text-primary">Performance by Subject</h2>
              {subjects.map(([name, v]) => {
                const pct = v.total ? Math.round((100 * v.correct) / v.total) : 0;
                return (
                  <div key={name} className="p-4 rounded-2xl theme-subcard space-y-2">
                    <div className="flex items-center justify-between font-rounded text-sm">
                      <span className="font-bold theme-text-primary">{name}</span>
                      <span className="theme-text-secondary">
                        {v.correct}/{v.total} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-400/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

/* ------------------------------------------------------------- LEADERBOARD */
const MEDAL = ['bg-amber-400 text-amber-950', 'bg-slate-200 text-slate-800', 'bg-orange-300 text-orange-950'];

export const LeaderboardView: React.FC = () => {
  const { data, loading, error, reload } = useLoad<LeaderRow[]>(() => getLeaderboard(50));

  return (
    <Card className="section-card-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
            <Trophy className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
              Cadre Leaderboard
            </h1>
            <p className="text-xs font-rounded theme-text-secondary">
              XP = 10 per correct answer + 20 per finished test
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reload}
          aria-label="Refresh leaderboard"
          className="p-2.5 rounded-full theme-subcard cursor-pointer hover:scale-105 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 theme-text-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 font-rounded font-bold text-sm theme-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading rankings…
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-rounded text-xs text-center">
          {error}
        </div>
      )}

      <div className="space-y-2.5">
        {data?.map((row) => (
          <div
            key={`${row.rank}-${row.display_name}`}
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 ${
              row.is_me
                ? 'bg-amber-500/15 border-2 border-amber-400/70'
                : 'theme-subcard'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-rounded font-extrabold text-xs ${
                  MEDAL[row.rank - 1] ?? 'bg-amber-500/15 theme-text-primary'
                }`}
              >
                #{row.rank}
              </span>
              <span className="font-bangla font-bold text-sm sm:text-base theme-text-primary truncate">
                {row.display_name}
                {row.is_me ? ' (You)' : ''}
              </span>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 font-rounded font-extrabold text-xs shrink-0">
              {fmt(row.xp)} XP
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

/* ----------------------------------------------------------------- PROFILE */
export const ProfileView: React.FC<{ currentUser?: AuthUser | null; onLogout?: () => void }> = ({
  currentUser,
  onLogout
}) => {
  const { data } = useLoad<Stats>(getStats);
  const [name, setName] = useState(currentUser?.displayName || 'Obide Zihad');
  const [targetBcs, setTargetBcs] = useState('51st BCS Cadre');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getProfile()
      .then((p) => {
        if (!p) return;
        if (p.display_name) setName(p.display_name);
        if (p.target_bcs) setTargetBcs(p.target_bcs);
      })
      .catch(() => undefined);
  }, []);

  const badge = !data
    ? 'Royal Scholar'
    : data.streak_days >= 7
    ? 'Consistent Cadre Scholar'
    : data.attempts >= 10
    ? 'Dedicated Candidate'
    : data.attempts >= 1
    ? 'Rising Aspirant'
    : 'New BCS Scholar';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      display_name: name.trim().slice(0, 60) || 'BCS Scholar',
      target_bcs: targetBcs.trim().slice(0, 60) || '51st BCS Cadre'
    }).catch(() => undefined);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="section-card-branding">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-violet-600 text-white flex items-center justify-center font-rounded font-extrabold text-2xl shadow-lg shrink-0 uppercase">
          {(name || currentUser?.username || 'OK').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary truncate">
            {name}
          </h1>
          <p className="text-xs sm:text-sm font-rounded theme-text-secondary truncate">
            {currentUser?.isGuest ? 'Guest Scholar • Local Mode' : currentUser?.email}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/18 text-amber-800 dark:text-amber-200 font-rounded font-bold text-xs">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{badge}</span>
          </div>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-500/15 border border-rose-400/40 text-rose-700 dark:text-rose-300 font-rounded font-bold text-xs hover:bg-rose-500/25 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Trophy className="w-4 h-4 text-amber-500" />, label: 'XP', value: fmt(data.xp) },
            { icon: <Target className="w-4 h-4 text-indigo-500" />, label: 'Tests', value: fmt(data.attempts) },
            { icon: <Flame className="w-4 h-4 text-orange-500" />, label: 'Streak', value: `${data.streak_days}d` }
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-3xl theme-subcard text-center space-y-1">
              <div className="flex justify-center">{s.icon}</div>
              <div className="text-xl font-rounded font-bold theme-text-primary">{s.value}</div>
              <div className="text-xs font-rounded theme-text-secondary">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-slate-300/30 dark:border-white/10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-rounded font-bold theme-text-secondary">
              Display Name (Leaderboard)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-rounded font-bold theme-text-secondary">
              Target BCS Cadre
            </label>
            <input
              value={targetBcs}
              onChange={(e) => setTargetBcs(e.target.value)}
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-royal-gold inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-rounded font-bold text-sm cursor-pointer"
        >
          {saved ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{saved ? 'Profile Saved!' : 'Save Profile'}</span>
        </button>
      </form>
    </Card>
  );
};

/* ---------------------------------------------------------------- SETTINGS */
export const SettingsView: React.FC<{ currentUser?: AuthUser | null }> = ({ currentUser }) => {
  const theme = useTheme();
  const backdrop = useBackdrop();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState(
    backdrop.customUrl && !backdrop.customUrl.startsWith('blob:') ? backdrop.customUrl : ''
  );
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState<'pw' | 'update' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [updateFound, setUpdateFound] = useState<UpdateInfo | null>(null);

  const apkBuild = nativeCode();

  const scenes: { id: BackdropScene; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'emerald-sanctuary',
      title: 'Emerald Pond Sanctuary (Default)',
      desc: 'Lush green village banks + mirror pond ripples & golden floating lanterns',
      icon: <Trees className="w-4 h-4 text-emerald-500" />
    },
    {
      id: 'royal-observatory',
      title: 'Royal Observatory Citadel',
      desc: 'Midnight imperial domes framing an open starlight lagoon & celestial rings',
      icon: <Crown className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'royal-aurora',
      title: 'Liquid Silk Aurora',
      desc: 'Infinite champagne-gold & violet cosmic silk ribbons + stardust',
      icon: <Sparkles className="w-4 h-4 text-violet-500" />
    },
    {
      id: 'custom-video',
      title: 'Custom 4K Video / GIF',
      desc: 'Load your own seamless infinite-loop .mp4, .webm, or .gif wallpaper',
      icon: <Film className="w-4 h-4 text-rose-500" />
    },
    {
      id: 'calm-minimal',
      title: 'Calm Minimal',
      desc: 'Lightweight static royal gradient for ultra-low battery mode',
      icon: <Layers className="w-4 h-4 text-sky-500" />
    }
  ];

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const kind: 'video' | 'image' = file.type.startsWith('image/') ? 'image' : 'video';
    setCustomBackdropMedia(url, kind);
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = urlInput.trim();
    if (!clean) return;
    const isImg = /\.(gif|webp|png|jpe?g)(\?|$)/i.test(clean);
    setCustomBackdropMedia(clean, isImg ? 'image' : 'video');
  };

  const handlePasswordChange = async () => {
    if (pw.length < 6) return setMsg({ ok: false, text: 'Password must be at least 6 characters.' });
    setBusy('pw');
    setMsg(null);
    try {
      await changePassword(pw);
      setPw('');
      setMsg({ ok: true, text: 'Password updated successfully.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleCheckUpdate = async () => {
    setBusy('update');
    setMsg(null);
    const found = await checkForUpdate();
    setBusy(null);
    if (found) {
      setUpdateFound(found);
      setMsg({
        ok: true,
        text: `Update v${found.version} (Build ${found.build}) is ready! Tap Update to install.`
      });
    } else {
      setMsg({ ok: true, text: `You are on the latest release (${APP_VERSION_LABEL}).` });
    }
  };

  return (
    <Card className="section-card-tm">
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-800 dark:text-amber-200 font-royal font-bold text-[10px] tracking-wider uppercase">
          <Wand2 className="w-3.5 h-3.5" />
          <span>Settings &amp; 3D Motion Studio</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
          Appearance, Account &amp; App Updates
        </h1>
      </div>

      {/* Theme + Motion + 3D Parallax */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-4 rounded-2xl theme-subcard flex items-center justify-between cursor-pointer hover:border-amber-400/50 transition-colors"
        >
          <div className="text-left">
            <div className="font-rounded font-bold text-sm theme-text-primary">Theme</div>
            <div className="text-xs font-rounded theme-text-muted">
              {theme === 'dark' ? 'Royal Dark' : 'Sunlit Light'}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-rounded font-bold text-[11px]">
            Switch
          </span>
        </button>

        <button
          type="button"
          onClick={toggleBackdropMotion}
          className="p-4 rounded-2xl theme-subcard flex items-center justify-between cursor-pointer hover:border-amber-400/50 transition-colors"
        >
          <div className="text-left">
            <div className="font-rounded font-bold text-sm theme-text-primary">Living Motion</div>
            <div className="text-xs font-rounded theme-text-muted">
              {backdrop.motionEnabled ? '60fps Active' : 'Paused'}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-rounded font-bold text-[11px]">
            {backdrop.motionEnabled ? 'On' : 'Off'}
          </span>
        </button>

        <button
          type="button"
          onClick={toggleBackdropParallax}
          className="p-4 rounded-2xl theme-subcard flex items-center justify-between cursor-pointer hover:border-amber-400/50 transition-colors"
        >
          <div className="text-left">
            <div className="font-rounded font-bold text-sm theme-text-primary">3D Parallax</div>
            <div className="text-xs font-rounded theme-text-muted">
              {backdrop.parallaxEnabled ? 'Depth Camera On' : 'Locked'}
            </div>
          </div>
          <Compass className="w-4 h-4 text-emerald-500 shrink-0" />
        </button>
      </div>

      {/* 3D World Scene Selector */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 font-rounded font-bold text-sm theme-text-primary">
          <Globe2 className="w-4 h-4 text-amber-500" />
          <span>Choose Living 3D Sanctuary World</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {scenes.map((sc) => {
            const active = backdrop.scene === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setBackdropScene(sc.id)}
                className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer border ${
                  active
                    ? 'bg-gradient-to-r from-amber-500/18 to-violet-500/18 border-amber-400/70 shadow-sm'
                    : 'theme-subcard hover:border-amber-400/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-rounded font-bold text-sm theme-text-primary">
                    {sc.icon}
                    <span>{sc.title}</span>
                  </div>
                  {active && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                </div>
                <p className="text-xs font-rounded theme-text-muted mt-1">{sc.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Anti-Clash Exposure Control */}
      <div className="p-4 rounded-2xl theme-subcard space-y-2.5">
        <div>
          <div className="font-rounded font-bold text-sm theme-text-primary">
            Scenery Exposure &amp; Anti-Clash Scrim
          </div>
          <div className="text-xs font-rounded theme-text-muted">
            Controls how vividly the 3D world shines around and behind the floating pavilions
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'vivid', label: 'Vivid World', sub: 'Rich scenery' },
              { id: 'balanced', label: 'Balanced', sub: 'Soft center veil' },
              { id: 'stealth', label: 'Deep Focus', sub: 'Max contrast' }
            ] as { id: BackdropExposure; label: string; sub: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setBackdropExposure(opt.id)}
              className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                backdrop.exposure === opt.id
                  ? 'bg-gradient-to-r from-amber-500 to-violet-600 text-white border-transparent shadow-sm'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-300/40 dark:border-white/10 theme-text-primary'
              }`}
            >
              <div className="font-rounded font-bold text-xs">{opt.label}</div>
              <div
                className={`text-[10px] font-rounded ${
                  backdrop.exposure === opt.id ? 'text-white/85' : 'theme-text-muted'
                }`}
              >
                {opt.sub}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom 4K Video / GIF Loader */}
      <div className="p-4 sm:p-5 rounded-2xl theme-subcard border border-amber-400/30 space-y-3">
        <div className="flex items-center gap-2 font-rounded font-bold text-sm theme-text-primary">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Load Your Own 4K Infinite Video / GIF Wallpaper</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,image/gif,image/webp,image/png,image/jpeg"
            onChange={handleLocalFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-violet-600 text-white font-rounded font-bold text-xs shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Choose Local 4K Video / GIF</span>
          </button>

          {backdrop.customUrl && (
            <button
              type="button"
              onClick={() => {
                clearCustomBackdropMedia();
                setUrlInput('');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-rounded font-bold text-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Custom Media</span>
            </button>
          )}
        </div>

        <form onSubmit={handleApplyUrl} className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="./bg/motion-bg.mp4 or https://..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-xs theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-rounded font-bold text-xs cursor-pointer"
          >
            Apply Path
          </button>
        </form>
      </div>

      {/* Password Change (when signed in with cloud account) */}
      {currentUser && !currentUser.isGuest && (
        <div className="p-4 rounded-2xl theme-subcard space-y-2.5">
          <label htmlFor="set-pw" className="font-rounded font-bold text-sm theme-text-primary flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Change Account Password</span>
          </label>
          <div className="flex gap-2">
            <input
              id="set-pw"
              type="password"
              autoComplete="new-password"
              placeholder="New password (6+ characters)"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-xs theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void handlePasswordChange()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-rounded font-bold text-xs cursor-pointer disabled:opacity-60"
            >
              {busy === 'pw' ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>
      )}

      {/* App Version, Build Number, In-App Self-Updater & Android APK Download */}
      <div className="p-4 sm:p-5 rounded-2xl theme-subcard border border-amber-400/35 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-violet-600 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <p className="font-rounded font-bold text-sm theme-text-primary">
                App Version &amp; Build
              </p>
              <p className="font-rounded text-xs theme-text-muted">
                OZ&apos;s BCS Bank {APP_VERSION_LABEL}
                {apkBuild !== null ? ` · Android APK Shell #${apkBuild}` : ' · Web App'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {updateFound ? (
              <button
                type="button"
                onClick={() => void applyUpdate(updateFound)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-rounded font-bold text-xs cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {updateFound.kind === 'apk'
                    ? `Install APK v${updateFound.version}`
                    : `Update to v${updateFound.version}`}
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleCheckUpdate()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/18 border border-amber-400/40 text-amber-800 dark:text-amber-200 font-rounded font-bold text-xs cursor-pointer hover:bg-amber-500/25 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy === 'update' ? 'animate-spin' : ''}`} />
                <span>{busy === 'update' ? 'Checking…' : 'Check for Updates'}</span>
              </button>
            )}

            <a
              href={LATEST_APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-rounded font-bold text-xs hover:bg-indigo-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Android APK</span>
            </a>
          </div>
        </div>

        {/* Cloud DB Status Footer inside Version Card */}
        <div className="pt-2.5 border-t border-slate-300/25 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-rounded theme-text-muted">
            {isCloudAuthConfigured() ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Database className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>
              {isCloudAuthConfigured()
                ? 'Supabase Cloud Sync Connected'
                : 'Local-First Mode (Ready for Supabase Env Keys)'}
            </span>
          </span>
          <span className="font-rounded font-bold text-[10px] theme-text-muted">
            {APP_VERSION_LABEL}
          </span>
        </div>
      </div>

      {msg && (
        <div
          role="status"
          className={`p-3 rounded-2xl font-rounded font-bold text-xs text-center flex items-center justify-center gap-2 ${
            msg.ok
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
          }`}
        >
          {msg.ok && <Check className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}
    </Card>
  );
};
