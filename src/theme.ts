import { useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'bbbokz-theme';

const listeners = new Set<() => void>();

function readTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

let current: ThemeMode = readTheme();

function writeDom(next: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', next);
  root.classList.toggle('dark', next === 'dark');
  root.style.colorScheme = next;
}

function applyTheme(next: ThemeMode) {
  const root = document.documentElement;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    writeDom(next);
  } else {
    root.classList.add('theme-switching');
    writeDom(next);
    window.setTimeout(() => root.classList.remove('theme-switching'), 420);
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore storage write errors
  }
}

export function setTheme(next: ThemeMode) {
  if (next === current) return;
  current = next;
  applyTheme(next);
  listeners.forEach((l) => l());
}

export function toggleTheme() {
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => current;
const getServerSnapshot = (): ThemeMode => 'dark';

export function useTheme(): ThemeMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
