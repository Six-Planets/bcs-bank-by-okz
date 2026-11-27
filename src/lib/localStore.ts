/**
 * Local-first Candidate Profile & Exam Telemetry Store for BCS Bank by OKZ (BBBOKZ)
 * Automatically syncs to free-tier Supabase in the background whenever
 * VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY are configured in Vercel.
 */
import { readMasteryMap } from '../data/syllabus';
import { syncAttemptToSupabase, syncProfileToSupabase } from './supabaseClient';

export interface LocalCandidate {
  id: string;
  displayName: string;
  targetBcs: string;
  bio: string;
  joinedAt: string;
}

export interface LocalAttempt {
  id: string;
  timestamp: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  durationSec: number;
  subjects: Record<string, { correct: number; total: number }>;
}

const PROFILE_KEY = 'bbbokz-candidate-profile-v1';
const ATTEMPTS_KEY = 'bbbokz-mock-attempts-v1';

function createClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `okz-${crypto.randomUUID().slice(0, 12)}`;
    }
  } catch {
    /* ignore */
  }
  return `okz-${Date.now().toString(36)}`;
}

const DEFAULT_CANDIDATE: LocalCandidate = {
  id: 'okz-local-candidate',
  displayName: 'Obaidul Kader Zihad',
  targetBcs: '51st BCS Cadre',
  bio: 'Data-driven BCS Preliminary Scholar • BBBOKZ',
  joinedAt: '2026-11-27'
};

export function getCandidateProfile(): LocalCandidate {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      const seeded = { ...DEFAULT_CANDIDATE, id: createClientId() };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return { ...DEFAULT_CANDIDATE, ...(JSON.parse(raw) as Partial<LocalCandidate>) };
  } catch {
    return DEFAULT_CANDIDATE;
  }
}

export function saveCandidateProfile(patch: Partial<LocalCandidate>): LocalCandidate {
  const next = { ...getCandidateProfile(), ...patch };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  const masteredCount = Object.values(readMasteryMap()).filter((v) => v === 1).length;
  const stats = computeLocalStats();
  void syncProfileToSupabase(next, masteredCount, stats.best_score);
  return next;
}

export function getLocalAttempts(): LocalAttempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? (JSON.parse(raw) as LocalAttempt[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalAttempt(attempt: Omit<LocalAttempt, 'id' | 'timestamp'>): LocalAttempt {
  const rec: LocalAttempt = {
    ...attempt,
    id: `att-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  const list = [rec, ...getLocalAttempts()].slice(0, 100);
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  const profile = getCandidateProfile();
  const masteredCount = Object.values(readMasteryMap()).filter((v) => v === 1).length;
  const bestScore = list.reduce((m, a) => Math.max(m, a.score), rec.score);
  void syncAttemptToSupabase(profile.id, rec);
  void syncProfileToSupabase(profile, masteredCount, bestScore);
  return rec;
}

export function computeLocalStats() {
  const attempts = getLocalAttempts();
  const subjects: Record<string, { correct: number; total: number }> = {};
  let totalCorrect = 0;
  let totalAnswered = 0;
  let bestScore: number | null = null;
  const days = new Set<string>();

  for (const a of attempts) {
    totalCorrect += a.correct;
    totalAnswered += a.correct + a.wrong;
    if (bestScore === null || a.score > bestScore) bestScore = a.score;
    days.add(a.timestamp.slice(0, 10));
    for (const [subj, val] of Object.entries(a.subjects || {})) {
      if (!subjects[subj]) subjects[subj] = { correct: 0, total: 0 };
      subjects[subj].correct += val.correct;
      subjects[subj].total += val.total;
    }
  }

  return {
    attempts: attempts.length,
    accuracy: totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0,
    best_score: bestScore,
    streak_days: Math.max(days.size, attempts.length > 0 ? 1 : 0),
    subjects,
    recent: attempts.slice(0, 10)
  };
}
