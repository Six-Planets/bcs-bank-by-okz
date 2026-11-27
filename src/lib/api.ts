/**
 * Dependency-free Supabase Auth (GoTrue) + PostgREST Client for BCS Bank by OKZ (BBBOKZ)
 * --------------------------------------------------------------------------------------
 * Supports:
 *  - Google 1-Tap (ID Token) + Google OAuth redirect fallback
 *  - Email + Password Sign In / Sign Up / 6-Digit Email OTP Verification / Password Reset
 *  - Auto token refresh & offline-queued Mock Test attempts
 *  - Seamless local-first fallback when Supabase env vars are not yet configured
 */
import { computeLocalStats, getCandidateProfile, saveCandidateProfile, saveLocalAttempt } from './localStore';

const ENV_SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || '').replace(/\/+$/, '');
const ENV_SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
const ENV_GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '';

let runtimeSupabaseUrl = ENV_SUPABASE_URL;
let runtimeSupabaseAnon = ENV_SUPABASE_ANON;
let runtimeGoogleClientId = ENV_GOOGLE_CLIENT_ID;
let configPromise: Promise<void> | null = null;

export function isCloudAuthConfigured(): boolean {
  return Boolean(runtimeSupabaseUrl && runtimeSupabaseAnon);
}

function ensureRuntimeConfig(): Promise<void> {
  // Share one in-flight load so every caller waits for auth-config.json.
  configPromise ??= loadRuntimeConfig();
  return configPromise;
}

async function loadRuntimeConfig(): Promise<void> {
  if (runtimeSupabaseUrl && runtimeSupabaseAnon && runtimeGoogleClientId) return;
  try {
    const res = await fetch(`./auth-config.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = (await res.json()) as {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
      googleClientId?: string;
    };
    if (!runtimeSupabaseUrl && cfg.supabaseUrl?.trim()) {
      runtimeSupabaseUrl = cfg.supabaseUrl.trim().replace(/\/+$/, '');
    }
    if (!runtimeSupabaseAnon && cfg.supabaseAnonKey?.trim()) {
      runtimeSupabaseAnon = cfg.supabaseAnonKey.trim();
    }
    if (!runtimeGoogleClientId && cfg.googleClientId?.trim()) {
      runtimeGoogleClientId = cfg.googleClientId.trim();
    }
  } catch {
    /* keep env values */
  }
}

const SESSION_KEY = 'bbbokz-session-v1';
const QUEUE_KEY = 'bbbokz-attempt-queue-v1';

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  isGuest?: boolean;
  user: { id: string; email: string; user_metadata?: Record<string, unknown> };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let session: Session | null = readSession();
const listeners = new Set<(s: Session | null) => void>();

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(s));
}

export function onSessionChange(fn: (s: Session | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSession(): Session | null {
  return session;
}

/** Local Guest Scholar session (works offline or before Supabase keys are wired). */
export function startGuestSession(customName?: string): Session {
  const local = getCandidateProfile();
  const displayName = (customName || local.displayName || 'Obide Zihad').trim();
  saveCandidateProfile({ displayName });
  const guest: Session = {
    access_token: 'local-guest-token',
    refresh_token: 'local-guest-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    isGuest: true,
    user: {
      id: local.id,
      email: 'guest@ozbcsbank.local',
      user_metadata: { display_name: displayName }
    }
  };
  writeSession(guest);
  return guest;
}

function friendly(msg: string, status: number): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid_grant') || m.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please verify your email with the 6-digit code sent to your inbox.';
  }
  if (m.includes('token has expired') || m.includes('otp_expired') || m.includes('invalid otp') || m.includes('invalid token')) {
    return 'Invalid or expired verification code. Please check the code or request a new one.';
  }
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user_already_exists')) {
    return 'This email already has an account. Please sign in.';
  }
  if (m.includes('password should be') || m.includes('weak_password')) {
    return 'Password must be at least 6 characters.';
  }
  if (m.includes('rate limit') || status === 429) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  return msg || 'Something went wrong. Please try again.';
}

async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  await ensureRuntimeConfig();
  if (!isCloudAuthConfigured()) {
    throw new ApiError(
      'Cloud authentication (Supabase) is not connected yet. Tap "Continue as Guest Scholar" below to explore right now.',
      503
    );
  }
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('apikey', runtimeSupabaseAnon);

  if (init.auth !== false) {
    const s = await validSession();
    if (s && !s.isGuest) {
      headers.set('Authorization', `Bearer ${s.access_token}`);
    } else {
      headers.set('Authorization', `Bearer ${runtimeSupabaseAnon}`);
    }
  } else {
    headers.set('Authorization', `Bearer ${runtimeSupabaseAnon}`);
  }

  let res: Response;
  try {
    res = await fetch(runtimeSupabaseUrl + path, { ...init, headers });
  } catch {
    throw new ApiError('No internet connection. Please check your network.', 0);
  }
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const b = (body ?? {}) as Record<string, string>;
    const msg = b.msg || b.message || b.error_description || b.error || res.statusText;
    if (res.status === 401 && init.auth !== false && !session?.isGuest) writeSession(null);
    throw new ApiError(friendly(String(msg), res.status), res.status);
  }
  return body as T;
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

type RawSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: Session['user'];
};

function toSession(r: RawSession): Session {
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_at ?? Math.floor(Date.now() / 1000) + r.expires_in,
    isGuest: false,
    user: r.user
  };
}

let refreshing: Promise<Session | null> | null = null;

export async function validSession(): Promise<Session | null> {
  const s = session;
  if (!s) return null;
  if (s.isGuest) return s;
  if (s.expires_at - 60 > Date.now() / 1000) return s;
  if (!refreshing) {
    refreshing = request<RawSession>('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ refresh_token: s.refresh_token })
    })
      .then((r) => {
        const next = toSession(r);
        writeSession(next);
        return next;
      })
      .catch((e: ApiError) => {
        if (e.status !== 0) writeSession(null);
        return e.status === 0 ? s : null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const r = await request<RawSession>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email: email.trim().toLowerCase(), password })
  });
  const s = toSession(r);
  writeSession(s);
  return s;
}

export interface SignUpOutcome {
  session: Session | null;
  needsVerification: boolean;
  email: string;
}

export async function signUp(email: string, password: string, displayName: string): Promise<SignUpOutcome> {
  const cleanEmail = email.trim().toLowerCase();
  const r = await request<Partial<RawSession> & { id?: string; email?: string }>('/auth/v1/signup', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({
      email: cleanEmail,
      password,
      data: { display_name: displayName.trim() }
    })
  });
  if (r.access_token && r.refresh_token && r.user) {
    const s = toSession(r as RawSession);
    writeSession(s);
    return { session: s, needsVerification: false, email: cleanEmail };
  }
  return { session: null, needsVerification: true, email: cleanEmail };
}

export async function verifyEmailOtp(
  email: string,
  token: string,
  type: 'signup' | 'recovery' | 'email'
): Promise<Session> {
  const r = await request<RawSession>('/auth/v1/verify', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type
    })
  });
  const s = toSession(r);
  writeSession(s);
  return s;
}

export async function resendOtp(email: string, type: 'signup' = 'signup'): Promise<void> {
  await request('/auth/v1/resend', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email: email.trim().toLowerCase(), type })
  });
}

export async function signInWithGoogleIdToken(idToken: string, nonce?: string): Promise<Session> {
  const payload: Record<string, string> = { provider: 'google', id_token: idToken };
  if (nonce) payload.nonce = nonce;
  const r = await request<RawSession>('/auth/v1/token?grant_type=id_token', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });
  const s = toSession(r);
  writeSession(s);
  return s;
}

export async function signOut(): Promise<void> {
  const s = session;
  writeSession(null);
  if (s && !s.isGuest && isCloudAuthConfigured()) {
    try {
      await fetch(`${runtimeSupabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: runtimeSupabaseAnon,
          Authorization: `Bearer ${s.access_token}`
        }
      });
    } catch {
      /* offline fine */
    }
  }
}

export async function changePassword(password: string): Promise<void> {
  if (session?.isGuest) {
    throw new ApiError('Sign in with an email or Google account to set a cloud password.', 400);
  }
  await request('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) });
}

export async function recoverPassword(email: string): Promise<void> {
  await request('/auth/v1/recover', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email: email.trim().toLowerCase() })
  });
}

export interface AuthServerSettings {
  cloudReady: boolean;
  google: boolean;
  email: boolean;
  mailerAutoconfirm: boolean;
  googleClientId: string;
}

export async function getAuthSettings(): Promise<AuthServerSettings> {
  await ensureRuntimeConfig();
  if (!isCloudAuthConfigured()) {
    return {
      cloudReady: false,
      google: false,
      email: true,
      mailerAutoconfirm: true,
      googleClientId: runtimeGoogleClientId
    };
  }

  let google = true;
  let email = true;
  let mailerAutoconfirm = false;

  try {
    const res = await fetch(`${runtimeSupabaseUrl}/auth/v1/settings`, {
      headers: { apikey: runtimeSupabaseAnon },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = (await res.json()) as {
        external?: { google?: boolean; email?: boolean };
        mailer_autoconfirm?: boolean;
      };
      google = Boolean(data?.external?.google);
      email = data?.external?.email !== false;
      mailerAutoconfirm = data?.mailer_autoconfirm !== false;
    }
  } catch {
    /* keep defaults */
  }

  return {
    cloudReady: true,
    google,
    email,
    mailerAutoconfirm,
    googleClientId: runtimeGoogleClientId
  };
}

export function getGoogleOAuthUrl(): string {
  const isAndroidApk =
    typeof navigator !== 'undefined' && /BBBOKZApp\/\d+|OZBcsBankApp\/\d+/.test(navigator.userAgent);
  const redirectTo = isAndroidApk
    ? 'ozbcsbank://auth-callback'
    : typeof window !== 'undefined'
    ? window.location.origin + window.location.pathname
    : '';
  return `${runtimeSupabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&prompt=select_account`;
}

export async function consumeAuthRedirectHash(): Promise<'recovery' | 'oauth' | null> {
  if (typeof window === 'undefined') return null;
  await ensureRuntimeConfig();
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=') || !isCloudAuthConfigured()) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token') || '';
  const expiresIn = Number(params.get('expires_in') || 3600);
  const type = params.get('type');
  if (!accessToken) return null;

  try {
    const res = await fetch(`${runtimeSupabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: runtimeSupabaseAnon,
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!res.ok) return null;
    const user = (await res.json()) as Session['user'];
    writeSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      isGuest: false,
      user
    });
    window.history.replaceState(null, '', window.location.pathname + '#/');
    return type === 'recovery' ? 'recovery' : 'oauth';
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ DATA */
export interface Profile {
  id: string;
  display_name: string;
  target_bcs: string | null;
  bio: string | null;
  settings: Record<string, unknown>;
}

export async function getProfile(): Promise<Profile | null> {
  const s = await validSession();
  if (!s || s.isGuest || !isCloudAuthConfigured()) {
    const local = getCandidateProfile();
    return {
      id: local.id,
      display_name: local.displayName,
      target_bcs: local.targetBcs,
      bio: local.bio,
      settings: {}
    };
  }
  const rows = await request<Profile[]>(
    `/rest/v1/profiles?id=eq.${s.user.id}&select=id,display_name,target_bcs,bio,settings`
  );
  return rows[0] ?? null;
}

export async function updateProfile(
  patch: Partial<Pick<Profile, 'display_name' | 'target_bcs' | 'bio' | 'settings'>>
): Promise<void> {
  if (patch.display_name || patch.target_bcs || patch.bio) {
    saveCandidateProfile({
      displayName: patch.display_name,
      targetBcs: patch.target_bcs ?? undefined,
      bio: patch.bio ?? undefined
    });
  }
  const s = await validSession();
  if (!s || s.isGuest || !isCloudAuthConfigured()) return;
  await request(`/rest/v1/profiles?id=eq.${s.user.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
}

export interface AttemptInput {
  mode: 'mock' | 'practice' | 'subject';
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  duration_sec: number;
  subjects: Record<string, { correct: number; total: number }>;
}

export interface Stats {
  attempts: number;
  questions: number;
  correct: number;
  accuracy: number;
  best_score: number | null;
  avg_score: number | null;
  xp: number;
  last_studied: string | null;
  streak_days: number;
  subjects: Record<string, { correct: number; total: number }>;
}

export interface LeaderRow {
  rank: number;
  display_name: string;
  xp: number;
  attempts: number;
  best_score: number | null;
  is_me: boolean;
}

function readQueue(): (AttemptInput & { client_id: string })[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(q: (AttemptInput & { client_id: string })[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
  } catch {
    /* ignore */
  }
}

export async function recordAttempt(a: AttemptInput): Promise<void> {
  // Always save locally first for instant offline UI feedback
  saveLocalAttempt({
    totalQuestions: a.total,
    correct: a.correct,
    wrong: a.wrong,
    unanswered: a.skipped,
    score: Math.round(a.score * 100) / 100,
    durationSec: a.duration_sec,
    subjects: a.subjects
  });

  if (!session || session.isGuest || !isCloudAuthConfigured()) return;

  const item = {
    ...a,
    score: Math.round(a.score * 100) / 100,
    client_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  };
  writeQueue([...readQueue(), item]);
  await flushAttempts();
}

let flushing = false;
export async function flushAttempts(): Promise<void> {
  if (flushing || !session || session.isGuest || !isCloudAuthConfigured()) return;
  const q = readQueue();
  if (!q.length) return;
  flushing = true;
  try {
    await request('/rest/v1/attempts?on_conflict=user_id,client_id', {
      method: 'POST',
      headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' },
      body: JSON.stringify(q)
    });
    const sent = new Set(q.map((x) => x.client_id));
    writeQueue(readQueue().filter((x) => !sent.has(x.client_id)));
  } catch {
    /* stays queued until online */
  } finally {
    flushing = false;
  }
}

export const pendingAttempts = (): number => readQueue().length;

export async function getStats(): Promise<Stats> {
  if (!session || session.isGuest || !isCloudAuthConfigured()) {
    const local = computeLocalStats();
    const totalCorrect = Object.values(local.subjects).reduce((a, b) => a + b.correct, 0);
    const totalQuestions = Object.values(local.subjects).reduce((a, b) => a + b.total, 0);
    return {
      attempts: local.attempts,
      questions: totalQuestions,
      correct: totalCorrect,
      accuracy: local.accuracy,
      best_score: local.best_score,
      avg_score: local.best_score,
      xp: totalCorrect * 10 + local.attempts * 20,
      last_studied: local.recent[0]?.timestamp ?? null,
      streak_days: local.streak_days,
      subjects: local.subjects
    };
  }
  return request<Stats>('/rest/v1/rpc/my_stats', { method: 'POST', body: '{}' });
}

export async function getLeaderboard(limit = 50): Promise<LeaderRow[]> {
  if (!session || session.isGuest || !isCloudAuthConfigured()) {
    const prof = getCandidateProfile();
    const local = computeLocalStats();
    const myXp = Math.round(
      Object.values(local.subjects).reduce((a, b) => a + b.correct, 0) * 10 + local.attempts * 20
    );
    const base = [
      { display_name: prof.displayName, xp: myXp, attempts: local.attempts, best_score: local.best_score, is_me: true },
      { display_name: 'Tanvir Rahman (46th Cadre)', xp: 2480, attempts: 18, best_score: 158, is_me: false },
      { display_name: 'Nusrat Jahan (Admin)', xp: 2140, attempts: 15, best_score: 146, is_me: false },
      { display_name: 'Mahmudul Hasan (Foreign)', xp: 1890, attempts: 12, best_score: 139, is_me: false },
      { display_name: 'Farhana Akter (Police)', xp: 1620, attempts: 10, best_score: 128, is_me: false }
    ].sort((a, b) => b.xp - a.xp);
    return base.map((r, i) => ({ rank: i + 1, ...r }));
  }
  return request<LeaderRow[]>('/rest/v1/rpc/get_leaderboard', {
    method: 'POST',
    body: JSON.stringify({ lim: limit })
  });
}
