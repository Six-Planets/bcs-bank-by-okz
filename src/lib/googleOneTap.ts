// Google's own sign-in prompt (One Tap / FedCM) for the website.
// The prompt names this site instead of the Supabase project address, and it
// returns an ID token that Supabase accepts directly, with no redirect.

type PromptOutcome =
  | { kind: 'credential'; idToken: string; nonce: string }
  | { kind: 'cancelled' }
  | { kind: 'unavailable' };

interface GsiMomentNotification {
  isSkippedMoment?: () => boolean;
  getSkippedReason?: () => string;
  isDismissedMoment?: () => boolean;
  getDismissedReason?: () => string;
  isNotDisplayed?: () => boolean;
}

interface GsiId {
  initialize: (opts: Record<string, unknown>) => void;
  prompt: (cb?: (n: GsiMomentNotification) => void) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const NO_RESPONSE_MS = 12000;
let gsiLoad: Promise<GsiId | null> | null = null;

function loadGsi(): Promise<GsiId | null> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  gsiLoad ??= new Promise<GsiId | null>((resolve) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve(window.google?.accounts?.id ?? null);
    script.onerror = () => {
      gsiLoad = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return gsiLoad;
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** True where the Google prompt can be used: the website, not the Android APK shell. */
export function canUseGooglePrompt(clientId: string): boolean {
  if (!clientId || typeof window === 'undefined' || !window.crypto?.subtle) return false;
  return !/BBBOKZApp\/\d+|OZBcsBankApp\/\d+/.test(navigator.userAgent);
}

/**
 * Shows Google's sign-in prompt. Resolves with an ID token and the raw nonce to
 * hand to Supabase, 'cancelled' when the user closes it, or 'unavailable' when
 * Google won't show it (blocked script, cooldown, unsupported browser) so the
 * caller can fall back to the redirect flow.
 */
export async function requestGoogleIdToken(clientId: string): Promise<PromptOutcome> {
  const gsi = await loadGsi();
  if (!gsi) return { kind: 'unavailable' };

  const nonce = randomNonce();
  const hashedNonce = await sha256Hex(nonce);

  return new Promise<PromptOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: PromptOutcome) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(outcome);
    };
    // If Google never answers (prompt suppressed silently), use the redirect flow.
    const timer = window.setTimeout(() => {
      gsi.cancel();
      finish({ kind: 'unavailable' });
    }, NO_RESPONSE_MS);

    gsi.initialize({
      client_id: clientId,
      nonce: hashedNonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
      callback: (res: { credential?: string }) => {
        if (res.credential) finish({ kind: 'credential', idToken: res.credential, nonce });
        else finish({ kind: 'unavailable' });
      }
    });

    gsi.prompt((n) => {
      if (n.isNotDisplayed?.()) return finish({ kind: 'unavailable' });
      if (n.isSkippedMoment?.()) {
        const reason = n.getSkippedReason?.() ?? '';
        return finish(
          reason === 'user_cancel' || reason === 'tap_outside' ? { kind: 'cancelled' } : { kind: 'unavailable' }
        );
      }
      if (n.isDismissedMoment?.() && n.getDismissedReason?.() !== 'credential_returned') {
        finish({ kind: 'cancelled' });
      }
    });
  });
}
