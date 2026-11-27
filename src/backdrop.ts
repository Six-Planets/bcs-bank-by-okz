import { useSyncExternalStore } from 'react';

export type BackdropScene =
  | 'emerald-sanctuary'
  | 'royal-observatory'
  | 'royal-aurora'
  | 'custom-video'
  | 'calm-minimal';

export type BackdropExposure = 'balanced' | 'vivid' | 'stealth';

export interface BackdropState {
  scene: BackdropScene;
  exposure: BackdropExposure;
  motionEnabled: boolean;
  parallaxEnabled: boolean;
  customUrl: string;
  customKind: 'video' | 'image' | null;
}

const STORAGE_KEY = 'bbbokz-backdrop-v2';

const DEFAULT_STATE: BackdropState = {
  scene: 'emerald-sanctuary',
  exposure: 'vivid',
  motionEnabled: true,
  parallaxEnabled: true,
  customUrl: '',
  customKind: null
};

const VALID_SCENES: BackdropScene[] = [
  'emerald-sanctuary',
  'royal-observatory',
  'royal-aurora',
  'custom-video',
  'calm-minimal'
];

function readInitial(): BackdropState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<BackdropState>;
    const safeUrl =
      typeof parsed.customUrl === 'string' && !parsed.customUrl.startsWith('blob:')
        ? parsed.customUrl
        : '';
    const safeScene: BackdropScene =
      parsed.scene === 'custom-video' && !safeUrl
        ? 'emerald-sanctuary'
        : parsed.scene && VALID_SCENES.includes(parsed.scene)
        ? parsed.scene
        : 'emerald-sanctuary';
    return {
      scene: safeScene,
      exposure:
        parsed.exposure && ['balanced', 'vivid', 'stealth'].includes(parsed.exposure)
          ? parsed.exposure
          : 'vivid',
      motionEnabled: parsed.motionEnabled !== false,
      parallaxEnabled: parsed.parallaxEnabled !== false,
      customUrl: safeUrl,
      customKind: safeUrl ? (parsed.customKind ?? 'video') : null
    };
  } catch {
    return DEFAULT_STATE;
  }
}

let state: BackdropState = readInitial();
const listeners = new Set<() => void>();

function persist(next: BackdropState) {
  state = next;
  try {
    const toStore: BackdropState = next.customUrl.startsWith('blob:')
      ? {
          ...next,
          scene: next.scene === 'custom-video' ? 'emerald-sanctuary' : next.scene,
          customUrl: '',
          customKind: null
        }
      : next;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function setBackdropScene(scene: BackdropScene) {
  persist({ ...state, scene });
}

export function cycleWorldScene() {
  const order: BackdropScene[] = ['emerald-sanctuary', 'royal-observatory', 'royal-aurora'];
  const idx = order.indexOf(state.scene);
  const next = order[(idx + 1) % order.length];
  persist({ ...state, scene: next });
}

export function setBackdropExposure(exposure: BackdropExposure) {
  persist({ ...state, exposure });
}

export function toggleBackdropMotion() {
  persist({ ...state, motionEnabled: !state.motionEnabled });
}

export function toggleBackdropParallax() {
  persist({ ...state, parallaxEnabled: !state.parallaxEnabled });
}

export function setCustomBackdropMedia(url: string, kind: 'video' | 'image') {
  persist({ ...state, scene: 'custom-video', customUrl: url, customKind: kind, motionEnabled: true });
}

export function clearCustomBackdropMedia() {
  if (state.customUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(state.customUrl);
    } catch {
      /* ignore */
    }
  }
  persist({
    ...state,
    scene: state.scene === 'custom-video' ? 'emerald-sanctuary' : state.scene,
    customUrl: '',
    customKind: null
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBackdrop(): BackdropState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => DEFAULT_STATE
  );
}
