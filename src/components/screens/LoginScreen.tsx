import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  User
} from 'lucide-react';
import {
  AuthUser,
  completePasswordResetWithCode,
  continueAsGuest,
  getClientAuthConfig,
  launchGoogleOAuth,
  loginWithCredentials,
  loginWithGoogleIdToken,
  registerAccount,
  resendSignupCode,
  sendPasswordReset,
  verifySignupCode
} from '../../auth';
import type { AuthServerSettings } from '../../lib/api';
import { APP_VERSION_LABEL } from '../../lib/updater';
import { MotionBackdrop } from '../common/MotionBackdrop';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = 'signin' | 'signup' | 'verify-signup' | 'reset-request' | 'reset-verify';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    context?: 'signin' | 'signup' | 'use';
    auto_select?: boolean;
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      width?: number;
    }
  ) => void;
  prompt: () => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

async function generateNoncePair(): Promise<{ raw: string; hashed: string }> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  if (crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    return { raw, hashed };
  }
  return { raw, hashed: raw };
}

function loadGoogleIdentityScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);
  const existing = document.querySelector<HTMLScriptElement>('script[data-gis-script="true"]');
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener('load', () => resolve(Boolean(window.google?.accounts?.id)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
    });
  }
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.dataset.gisScript = 'true';
    s.onload = () => resolve(Boolean(window.google?.accounts?.id));
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authCfg, setAuthCfg] = useState<AuthServerSettings>({
    cloudReady: false,
    google: false,
    email: true,
    mailerAutoconfirm: true,
    googleClientId: ''
  });
  const [gisReady, setGisReady] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const onLoginSuccessRef = useRef(onLoginSuccess);
  onLoginSuccessRef.current = onLoginSuccess;

  useEffect(() => {
    void getClientAuthConfig().then(setAuthCfg);
  }, []);

  // Initialize Google 1-Tap Sign-In when Google Client ID + Supabase are connected
  useEffect(() => {
    const isAuthTab = mode === 'signin' || mode === 'signup';
    if (!isAuthTab || !authCfg.cloudReady || !authCfg.google || !authCfg.googleClientId) {
      setGisReady(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const loaded = await loadGoogleIdentityScript();
      if (cancelled || !loaded || !window.google?.accounts?.id) return;

      const noncePair = await generateNoncePair();
      if (cancelled) return;

      const gis = window.google.accounts.id;
      gis.initialize({
        client_id: authCfg.googleClientId,
        nonce: noncePair.hashed,
        context: mode === 'signup' ? 'signup' : 'signin',
        auto_select: false,
        itp_support: true,
        use_fedcm_for_prompt: true,
        callback: async (response: GoogleCredentialResponse) => {
          if (!response.credential) {
            setError('Google sign-in did not return a credential. Please try again.');
            return;
          }
          setBusy(true);
          setError(null);
          const res = await loginWithGoogleIdToken(response.credential, noncePair.raw);
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          onLoginSuccessRef.current(res.user);
        }
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        gis.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'pill',
          width: Math.min(360, Math.max(240, googleBtnRef.current.offsetWidth || 320))
        });
      }

      setGisReady(true);
      try {
        gis.prompt();
      } catch {
        /* ignore suppressed One Tap */
      }
    })();

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [authCfg.cloudReady, authCfg.google, authCfg.googleClientId, mode]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    if (next === 'signin' || next === 'signup') setOtpCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);

    if (mode === 'reset-request') {
      setBusy(true);
      const res = await sendPasswordReset(email);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      setMode('reset-verify');
      setPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setNotice('Verification code sent! Check your email and enter the 6-digit code with your new password.');
      return;
    }

    if (mode === 'reset-verify') {
      if (password !== confirmPassword) return setError('Passwords do not match.');
      setBusy(true);
      const res = await completePasswordResetWithCode(email, otpCode, password);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      onLoginSuccess(res.user);
      return;
    }

    if (mode === 'verify-signup') {
      setBusy(true);
      const res = await verifySignupCode(email, otpCode);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      onLoginSuccess(res.user);
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) return setError('Passwords do not match.');
      setBusy(true);
      const res = await registerAccount(name, email, password);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      if (res.needsVerification) {
        setMode('verify-signup');
        setOtpCode('');
        setNotice(`We sent a 6-digit verification code to ${res.email}. Enter it below to activate your account.`);
        return;
      }
      onLoginSuccess(res.user);
      return;
    }

    setBusy(true);
    const res = await loginWithCredentials(email, password);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onLoginSuccess(res.user);
  };

  const handleResendCode = async () => {
    if (resending || !email.trim()) return;
    setResending(true);
    setError(null);
    const res =
      mode === 'reset-verify' ? await sendPasswordReset(email) : await resendSignupCode(email);
    setResending(false);
    if (!res.ok) return setError(res.error);
    setNotice('A fresh verification code has been sent to your email.');
  };

  const handleGoogleFallbackClick = () => {
    if (!authCfg.cloudReady || !authCfg.google) {
      setError(
        'Google Sign-In activates automatically once Supabase + Google OAuth keys are added in Vercel. Use "Continue as Guest Scholar" below right now!'
      );
      return;
    }
    launchGoogleOAuth();
  };

  const isMainTab = mode === 'signin' || mode === 'signup';

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center px-4 py-8">
      <MotionBackdrop />

      <div className="relative z-10 w-full max-w-md section-card-royal-hero rounded-[2.25rem] p-6 sm:p-8 space-y-5 shadow-2xl overflow-hidden">
        <div className="royal-shimmer-beam" aria-hidden="true" />

        {/* Royal Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-violet-700 p-[2px] shadow-[0_12px_28px_-6px_rgba(245,158,11,0.55)]">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center text-amber-300">
              {mode === 'reset-request' || mode === 'reset-verify' ? (
                <KeyRound className="w-8 h-8" />
              ) : (
                <Crown className="w-8 h-8 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
              )}
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-royal font-extrabold bg-gradient-to-r from-amber-600 via-yellow-500 to-violet-700 dark:from-amber-200 dark:via-yellow-300 dark:to-amber-100 bg-clip-text text-transparent">
              BCS Bank by OKZ
            </h1>
            <p className="text-[11px] font-rounded font-bold text-amber-700 dark:text-amber-300 tracking-wide">
              by Obaidul Kader Zihad • Royal Topic Master
            </p>
          </div>

          <p className="text-xs sm:text-sm font-rounded theme-text-secondary">
            {mode === 'signin' && 'One-tap Google sign-in, email account, or instant scholar access'}
            {mode === 'signup' && 'Create your free cloud-synced account'}
            {mode === 'verify-signup' && 'Verify your email with the 6-digit code'}
            {mode === 'reset-request' && 'Enter your email to receive a 6-digit reset code'}
            {mode === 'reset-verify' && 'Enter the 6-digit email code & choose a new password'}
          </p>
        </div>

        {/* Mode Switcher */}
        {isMainTab && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/40 dark:bg-slate-900/55 border border-amber-400/25">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`py-2 rounded-xl font-rounded font-bold text-xs transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-amber-500 to-violet-600 text-white shadow-sm'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2 rounded-xl font-rounded font-bold text-xs transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-amber-500 to-violet-600 text-white shadow-sm'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Priority #1: 1-Tap Google Sign-In */}
        {isMainTab && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-rounded font-bold text-amber-700 dark:text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fastest: 1-Tap with your Gmail</span>
            </div>

            <div
              ref={googleBtnRef}
              className={gisReady ? 'flex justify-center min-h-[44px]' : 'hidden'}
            />

            {!gisReady && (
              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleFallbackClick}
                className="w-full py-3 px-4 rounded-2xl bg-white/95 dark:bg-slate-900/85 border border-slate-300/80 dark:border-slate-700/80 font-rounded font-bold text-sm theme-text-primary shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                </svg>
                <span>{mode === 'signup' ? '1-Tap Sign Up with Google' : 'Continue with Google'}</span>
              </button>
            )}

            <div className="relative flex items-center justify-center pt-0.5">
              <div className="border-t border-slate-300/60 dark:border-slate-700/70 w-full" />
              <span className="px-3 text-[10px] font-rounded font-bold theme-text-muted uppercase tracking-wider shrink-0">
                or with email &amp; password
              </span>
              <div className="border-t border-slate-300/60 dark:border-slate-700/70 w-full" />
            </div>
          </div>
        )}

        {/* Priority #2: Email + Password + OTP Form */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {mode === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="signup-name" className="block text-xs font-rounded font-bold theme-text-secondary pl-1">
                Your Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Obaidul Kader Zihad"
                  maxLength={60}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/70 dark:border-slate-700/80 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="login-email" className="block text-xs font-rounded font-bold theme-text-secondary pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                readOnly={mode === 'verify-signup'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/70 dark:border-slate-700/80 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400 read-only:opacity-75"
                required
              />
            </div>
          </div>

          {(mode === 'verify-signup' || mode === 'reset-verify') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="otp-code" className="block text-xs font-rounded font-bold theme-text-secondary">
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendCode}
                  className="inline-flex items-center gap-1 text-xs font-rounded font-bold text-amber-600 dark:text-amber-300 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                  <span>{resending ? 'Sending…' : 'Resend code'}</span>
                </button>
              </div>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-amber-400/60 font-rounded font-bold text-center text-lg tracking-[0.35em] theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
          )}

          {(mode === 'signin' || mode === 'signup' || mode === 'reset-verify') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="login-password" className="block text-xs font-rounded font-bold theme-text-secondary">
                  {mode === 'reset-verify' ? 'New Password' : 'Password'}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset-request')}
                    className="text-xs font-rounded font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signin' ? 'Enter your password' : 'At least 6 characters'}
                  className="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/70 dark:border-slate-700/80 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg theme-text-muted hover:theme-text-primary cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {(mode === 'signup' || mode === 'reset-verify') && (
            <div className="space-y-1">
              <label htmlFor="signup-confirm" className="block text-xs font-rounded font-bold theme-text-secondary pl-1">
                {mode === 'reset-verify' ? 'Confirm New Password' : 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-slate-300/70 dark:border-slate-700/80 font-rounded text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-rose-500/15 border border-rose-400/40 text-rose-700 dark:text-rose-300 font-rounded font-bold text-xs text-center"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 font-rounded font-bold text-xs flex items-center justify-center gap-1.5 text-center"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl btn-royal-gold text-white font-rounded font-extrabold text-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>
              {busy
                ? 'Please wait…'
                : mode === 'signin'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'verify-signup'
                ? 'Verify & Continue'
                : mode === 'reset-request'
                ? 'Send Reset Code'
                : 'Reset Password & Sign In'}
            </span>
            {!busy && <ArrowRight className="w-4 h-4" />}
          </button>

          {!isMainTab && (
            <div className="flex items-center justify-center gap-4 pt-1">
              {mode === 'reset-request' && (
                <button
                  type="button"
                  onClick={() => switchMode('reset-verify')}
                  className="py-1 font-rounded font-bold text-xs text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                >
                  Already have a code?
                </button>
              )}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="py-1 font-rounded font-bold text-xs theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </form>

        {/* Instant Local Guest Scholar Access (always works even offline or before cloud setup) */}
        {isMainTab && (
          <button
            type="button"
            onClick={() => onLoginSuccess(continueAsGuest())}
            className="w-full py-2.5 px-4 rounded-2xl theme-subcard border border-amber-400/35 font-rounded font-bold text-xs theme-text-primary hover:border-amber-400 transition-colors cursor-pointer"
          >
            Continue as Guest Scholar (Instant Offline Access) →
          </button>
        )}

        {/* Small-Font Version & Build Number on Login Page */}
        <p className="text-center text-[10px] font-rounded tracking-wide theme-text-muted/85 pt-0.5 select-none">
          BCS Bank by OKZ {APP_VERSION_LABEL} · Obaidul Kader Zihad
        </p>
      </div>
    </div>
  );
};
