import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Compass,
  Crown,
  Database,
  Film,
  Flame,
  Globe2,
  Layers,
  Sparkles,
  Target,
  Trash2,
  Trees,
  Trophy,
  Upload,
  Wand2
} from 'lucide-react';
import {
  computeLocalStats,
  getCandidateProfile,
  saveCandidateProfile
} from '../../lib/localStore';
import {
  CloudLeaderboardRow,
  fetchSupabaseLeaderboard,
  isSupabaseConfigured
} from '../../lib/supabaseClient';
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
  const stats = useMemo(() => computeLocalStats(), []);
  const mastery = useMemo(() => readMasteryMap(), []);
  const masteredCount = useMemo(
    () => Object.values(mastery).filter((v) => v === 1).length,
    [mastery]
  );
  const attemptedQs = Object.keys(mastery).length;
  const subjects = Object.entries(stats.subjects).sort((a, b) => b[1].total - a[1].total);

  return (
    <Card className="section-card-sm">
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 font-rounded font-bold text-xs">
          <Target className="w-3.5 h-3.5" />
          <span>{isSupabaseConfigured ? 'Cloud + Local Sync Active' : 'Local-First Analytics Engine'}</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
          Your Learning Progress
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Mock Tests Taken', value: fmt(stats.attempts) },
          { label: 'Mock Accuracy', value: stats.attempts ? `${fmt(stats.accuracy, 1)}%` : '—' },
          {
            label: 'Best Mock Score',
            value: stats.best_score === null ? '—' : `${fmt(stats.best_score, 2)}/200`
          },
          { label: 'Topics Mastered', value: `${masteredCount} / ${attemptedQs || 0}` }
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
            Complete a Mock Test or drill S-Tier topics inside Royal Topic Master to build your subject radar.
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
    </Card>
  );
};

/* ------------------------------------------------------------- LEADERBOARD */
export const LeaderboardView: React.FC = () => {
  const profile = useMemo(() => getCandidateProfile(), []);
  const stats = useMemo(() => computeLocalStats(), []);
  const mastered = useMemo(
    () => Object.values(readMasteryMap()).filter((v) => v === 1).length,
    []
  );
  const [cloudRows, setCloudRows] = useState<CloudLeaderboardRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    if (isSupabaseConfigured) {
      void fetchSupabaseLeaderboard().then((rows) => {
        if (alive && rows && rows.length > 0) setCloudRows(rows);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  const personalScore = Math.round((stats.best_score ?? 0) + mastered * 0.5);
  const rows = cloudRows
    ? cloudRows.map((r, i) => ({
        name: r.display_name,
        tag: r.client_id === profile.id ? 'You · Live Supabase Sync' : r.target_bcs,
        score: Math.round((r.best_mock_score ?? 0) + (r.mastered_count ?? 0) * 0.5),
        badge: i === 0 ? '👑' : i === 1 ? '🥇' : i === 2 ? '🥈' : '⭐',
        isMe: r.client_id === profile.id
      }))
    : [
        { name: profile.displayName, tag: 'You · BBBOKZ Scholar', score: personalScore, badge: '👑', isMe: true },
        { name: 'Tanvir Rahman (46th Cadre)', tag: 'Benchmark Target', score: 158, badge: '🥇', isMe: false },
        { name: 'Nusrat Jahan (Admin)', tag: 'Benchmark Target', score: 146, badge: '🥈', isMe: false },
        { name: 'Mahmudul Hasan (Foreign)', tag: 'Benchmark Target', score: 139, badge: '🥉', isMe: false },
        { name: 'Farhana Akter (Police)', tag: 'Benchmark Target', score: 128, badge: '⭐', isMe: false }
      ].sort((a, b) => b.score - a.score);

  return (
    <Card className="section-card-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
            <Trophy className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
              Cadre Benchmark Board
            </h1>
            <p className="text-xs font-rounded theme-text-secondary">
              {cloudRows
                ? 'Live global rankings synced via Supabase'
                : 'Track your mock scores & Topic Master readiness against BCS Cadre benchmarks'}
            </p>
          </div>
        </div>
        {isSupabaseConfigured && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 font-rounded font-bold text-xs">
            <Cloud className="w-3.5 h-3.5" />
            <span>Supabase Live</span>
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className={`p-4 rounded-2xl theme-subcard flex items-center justify-between gap-3 ${
              r.isMe ? 'border-amber-400/60 bg-amber-500/10' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-amber-500/15 font-rounded font-extrabold text-sm flex items-center justify-center shrink-0">
                #{i + 1}
              </span>
              <div className="min-w-0">
                <div className="font-rounded font-bold text-sm sm:text-base theme-text-primary truncate">
                  {r.badge} {r.name}
                </div>
                <div className="text-[11px] font-rounded theme-text-muted">{r.tag}</div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 font-rounded font-extrabold text-xs shrink-0">
              {r.score} pts
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

/* ----------------------------------------------------------------- PROFILE */
export const ProfileView: React.FC = () => {
  const [profile, setProfile] = useState(() => getCandidateProfile());
  const [name, setName] = useState(profile.displayName);
  const [targetBcs, setTargetBcs] = useState(profile.targetBcs);
  const [bio, setBio] = useState(profile.bio);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveCandidateProfile({
      displayName: name.trim() || 'Obaidul Kader Zihad',
      targetBcs: targetBcs.trim() || '51st BCS Cadre',
      bio: bio.trim()
    });
    setProfile(updated);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="section-card-branding">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-violet-600 text-white flex items-center justify-center shadow-lg shrink-0">
          <Crown className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
            {profile.displayName}
          </h1>
          <p className="text-xs sm:text-sm font-rounded text-amber-700 dark:text-amber-300 font-bold">
            {profile.targetBcs} • BCS Bank by OKZ
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3.5">
        <div className="space-y-1">
          <label className="block text-xs font-rounded font-bold theme-text-secondary">
            Display Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-rounded font-bold theme-text-secondary">
            Study Motto
          </label>
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/60 dark:border-slate-700/70 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
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
export const SettingsView: React.FC = () => {
  const theme = useTheme();
  const backdrop = useBackdrop();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState(
    backdrop.customUrl && !backdrop.customUrl.startsWith('blob:') ? backdrop.customUrl : ''
  );

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

  return (
    <Card className="section-card-tm">
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-800 dark:text-amber-200 font-royal font-bold text-[10px] tracking-wider uppercase">
          <Wand2 className="w-3.5 h-3.5" />
          <span>3D Sanctuary &amp; Motion Studio</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-rounded font-bold theme-text-primary">
          World Scenery, 3D Parallax &amp; Cloud Status
        </h1>
        <p className="text-xs sm:text-sm font-rounded theme-text-secondary">
          Switch living 3D sanctuary worlds, tune anti-clash exposure, or plug in your own infinite 4K loop video.
        </p>
      </div>

      {/* Theme + Motion + 3D Parallax Controls */}
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
              { id: 'stealth', label: 'Deep Focus', sub: 'Max reading contrast' }
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
        <p className="text-xs font-rounded theme-text-secondary">
          Upload any 4K <code>.mp4</code>, <code>.webm</code>, or <code>.gif</code> to preview live, or drop it in <code>public/bg/motion-bg.mp4</code> and apply <code>./bg/motion-bg.mp4</code>.
        </p>

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

      {/* Supabase Cloud Sync Readiness Status */}
      <div className="p-4 rounded-2xl theme-subcard flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <div className="font-rounded font-bold text-sm theme-text-primary">
              Supabase Cloud Database Sync
            </div>
            <div className="text-xs font-rounded theme-text-muted">
              {isSupabaseConfigured
                ? 'Connected via VITE_SUPABASE_URL — syncing profiles & mock scores automatically.'
                : 'Running in Local-First mode. Add VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY on Vercel to activate free cloud sync.'}
            </div>
          </div>
        </div>
        <span
          className={`shrink-0 px-3 py-1 rounded-full font-rounded font-bold text-xs ${
            isSupabaseConfigured
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
          }`}
        >
          {isSupabaseConfigured ? 'Connected' : 'Ready'}
        </span>
      </div>
    </Card>
  );
};
