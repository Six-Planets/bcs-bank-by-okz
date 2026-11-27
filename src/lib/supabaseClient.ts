/**
 * Optional Zero-Dependency Free-Tier Supabase Cloud Sync Bridge
 * -------------------------------------------------------------
 * Reads VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY when deployed on Vercel.
 * When not configured (local offline mode), every call is a fast no-op so the
 * app stays 100% functional locally with zero console errors.
 */
import type { LocalAttempt, LocalCandidate } from './localStore';

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

export async function syncProfileToSupabase(
  profile: LocalCandidate,
  masteredCount: number,
  bestMockScore: number | null
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/bbbokz_profiles?on_conflict=client_id`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        client_id: profile.id,
        display_name: profile.displayName,
        target_bcs: profile.targetBcs,
        bio: profile.bio,
        mastered_count: masteredCount,
        best_mock_score: bestMockScore ?? 0,
        updated_at: new Date().toISOString()
      })
    });
  } catch {
    /* keep offline-first resilience */
  }
}

export async function syncAttemptToSupabase(
  clientId: string,
  attempt: LocalAttempt
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/bbbokz_mock_attempts`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        client_id: clientId,
        total_questions: attempt.totalQuestions,
        correct: attempt.correct,
        wrong: attempt.wrong,
        unanswered: attempt.unanswered,
        score: attempt.score,
        duration_sec: attempt.durationSec,
        subjects: attempt.subjects
      })
    });
  } catch {
    /* keep offline-first resilience */
  }
}

export interface CloudLeaderboardRow {
  client_id: string;
  display_name: string;
  target_bcs: string;
  mastered_count: number;
  best_mock_score: number;
}

export async function fetchSupabaseLeaderboard(): Promise<CloudLeaderboardRow[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bbbokz_profiles?select=client_id,display_name,target_bcs,mastered_count,best_mock_score&order=best_mock_score.desc,mastered_count.desc&limit=20`,
      { headers: headers() }
    );
    if (!res.ok) return null;
    return (await res.json()) as CloudLeaderboardRow[];
  } catch {
    return null;
  }
}
