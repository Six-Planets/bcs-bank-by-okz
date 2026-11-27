import React, { useEffect, useState } from 'react';
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
import { canUseGooglePrompt, requestGoogleIdToken } from '../../lib/googleOneTap';
import { MotionBackdrop } from '../common/MotionBackdrop';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = 'signin' | 'signup' | 'verify-signup' | 'reset-request' | 'reset-verify';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authCfg, setAuthCfg] = useState<AuthServerSettings>({
    cloudReady: true,
    google: true,
    email: true,
    mailerAutoconfirm: true,
    googleClientId: ''
  });

  useEffect(() => {
    void getClientAuthConfig().then(setAuthCfg);
    // Surface any OAuth error returned in URL hash/query cleanly instead of failing silently
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);
      const errMsg =
        hashParams.get('error_description') ||
        queryParams.get('error_description') ||
        hashParams.get('error') ||
        queryParams.get('error');
      if (errMsg) {
        setError(decodeURIComponent(errMsg.replace(/\+/g, ' ')));
        window.history.replaceState(null, '', window.location.pathname + '#/');
      }
    }
  }, []);

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

  const handleGoogleSignIn = async () => {
    if (busy || googleBusy) return;
    setError(null);
    setNotice(null);
    setGoogleBusy(true);
    const cfg = await getClientAuthConfig();
    if (!cfg.cloudReady || !cfg.google) {
      setGoogleBusy(false);
      setError(
        'Google Sign-In is temporarily unavailable. Please sign in with email or tap "Continue as Guest Scholar" below.'
      );
      return;
    }
    // Website: Google's own prompt, which names this site rather than the Supabase project.
    // Android APK, or when Google won't show the prompt: top-level Supabase OAuth redirect.
    if (canUseGooglePrompt(cfg.googleClientId)) {
      const outcome = await requestGoogleIdToken(cfg.googleClientId);
      if (outcome.kind === 'cancelled') {
        setGoogleBusy(false);
        return;
      }
      if (outcome.kind === 'credential') {
        const res = await loginWithGoogleIdToken(outcome.idToken, outcome.nonce);
        setGoogleBusy(false);
        if (res.ok) return onLoginSuccess(res.user);
        setError(res.error);
        return;
      }
    }
    launchGoogleOAuth();
    window.setTimeout(() => setGoogleBusy(false), 6000);
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
              OZ&apos;s BCS Bank
            </h1>
            <p className="text-[11px] font-rounded font-bold text-amber-700 dark:text-amber-300 tracking-wide">
              by Obide Zihad • Royal Topic Master
            </p>
          </div>

          <p className="text-xs sm:text-sm font-rounded theme-text-secondary">
            {mode === 'signin' && 'Sign in with Google, email account, or instant scholar access'}
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

        {/* Priority #1: Posh Native Royal Crystal Google Sign-In Button (Zero Ugly White Iframe!) */}
        {isMainTab && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-rounded font-bold text-amber-700 dark:text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fastest: Continue with Gmail</span>
            </div>

            <button
              type="button"
              disabled={busy || googleBusy || !authCfg.google}
              onClick={() => void handleGoogleSignIn()}
              className="group relative w-full py-3 px-4 rounded-2xl bg-white/92 dark:bg-slate-950/75 border border-amber-400/45 dark:border-amber-300/35 hover:border-amber-400 shadow-[0_10px_28px_-10px_rgba(245,158,11,0.35)] hover:shadow-[0_14px_32px_-8px_rgba(245,158,11,0.48)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-wait overflow-hidden"
            >
              <span className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                {googleBusy ? (
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                    <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                  </svg>
                )}
              </span>
              <span className="font-rounded font-bold text-sm theme-text-primary tracking-wide">
                {googleBusy
                  ? 'Opening Google Sign-In…'
                  : mode === 'signup'
                  ? 'Sign Up with Google'
                  : 'Continue with Google'}
              </span>
              <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

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
                  placeholder="e.g. Obide Zihad"
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

        {/* Instant Local Guest Scholar Access */}
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
          OZ&apos;s BCS Bank {APP_VERSION_LABEL} · Obide Zihad
        </p>
      </div>
    </div>
  );
};
