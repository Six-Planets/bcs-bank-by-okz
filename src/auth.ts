import {
  AuthServerSettings,
  Session,
  changePassword,
  consumeAuthRedirectHash,
  getAuthSettings,
  getGoogleOAuthUrl,
  getSession,
  onSessionChange,
  recoverPassword,
  resendOtp,
  signIn,
  signInWithGoogleIdToken,
  signOut,
  signUp,
  startGuestSession,
  verifyEmailOtp
} from './lib/api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  isGuest?: boolean;
}

export function toAuthUser(s: Session | null): AuthUser | null {
  if (!s?.user) return null;
  const email = s.user.email ?? '';
  const meta = (s.user.user_metadata ?? {}) as Record<string, unknown>;
  const username = email.split('@')[0] || 'scholar';
  const rawName =
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    username;
  return { id: s.user.id, email, username, displayName: rawName, isGuest: s.isGuest };
}

export function getStoredUser(): AuthUser | null {
  return toAuthUser(getSession());
}

export function subscribeUser(fn: (u: AuthUser | null) => void): () => void {
  return onSessionChange((s) => fn(toAuthUser(s)));
}

export function continueAsGuest(displayName?: string): AuthUser {
  return toAuthUser(startGuestSession(displayName))!;
}

type Result = { ok: true; user: AuthUser } | { ok: false; error: string };
type RegisterResult =
  | { ok: true; user: AuthUser; needsVerification: false }
  | { ok: true; needsVerification: true; email: string }
  | { ok: false; error: string };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validate(email: string, password: string): string | null {
  if (!email.trim() || !password) return 'Please enter both email and password.';
  if (!isValidEmail(email)) return 'Please enter a valid email address.';
  return null;
}

export async function loginWithCredentials(email: string, password: string): Promise<Result> {
  const bad = validate(email, password);
  if (bad) return { ok: false, error: bad };
  try {
    const s = await signIn(email, password);
    return { ok: true, user: toAuthUser(s)! };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function registerAccount(
  name: string,
  email: string,
  password: string
): Promise<RegisterResult> {
  const bad = validate(email, password);
  if (bad) return { ok: false, error: bad };
  if (name.trim().length < 2) return { ok: false, error: 'Please enter your name.' };
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  try {
    const outcome = await signUp(email, password, name);
    if (outcome.needsVerification || !outcome.session) {
      return { ok: true, needsVerification: true, email: outcome.email };
    }
    return { ok: true, user: toAuthUser(outcome.session)!, needsVerification: false };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function verifySignupCode(email: string, code: string): Promise<Result> {
  const cleanCode = code.trim();
  if (!/^\d{6,8}$/.test(cleanCode)) {
    return { ok: false, error: 'Please enter the 6-digit verification code sent to your email.' };
  }
  try {
    const s = await verifyEmailOtp(email, cleanCode, 'signup');
    return { ok: true, user: toAuthUser(s)! };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function resendSignupCode(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
  try {
    await resendOtp(email, 'signup');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function sendPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = email.trim();
  if (!clean || !isValidEmail(clean)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  try {
    await recoverPassword(clean);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function completePasswordResetWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<Result> {
  if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
  const cleanCode = code.trim();
  if (!/^\d{6,8}$/.test(cleanCode)) {
    return { ok: false, error: 'Please enter the 6-digit verification code from your email.' };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' };
  }
  try {
    const s = await verifyEmailOtp(email, cleanCode, 'recovery');
    await changePassword(newPassword);
    return { ok: true, user: toAuthUser(s)! };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function loginWithGoogleIdToken(idToken: string, nonce?: string): Promise<Result> {
  try {
    const s = await signInWithGoogleIdToken(idToken, nonce);
    return { ok: true, user: toAuthUser(s)! };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getClientAuthConfig(): Promise<AuthServerSettings> {
  return getAuthSettings();
}

export function launchGoogleOAuth(): void {
  window.location.href = getGoogleOAuthUrl();
}

export { consumeAuthRedirectHash };

export function logoutUser(): void {
  void signOut();
}
