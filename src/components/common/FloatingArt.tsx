import React, { useEffect, useRef } from 'react';

/**
 * Shared IntersectionObserver: one observer for every floating illustration.
 * Off-screen art gets `.is-paused`, which pauses its CSS animation (no GPU work
 * for things the user cannot see). Tab visibility is handled globally in CSS
 * through html[data-tab='hidden'] (set once in main.tsx).
 */
type Entry = (visible: boolean) => void;
const callbacks = new WeakMap<Element, Entry>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) callbacks.get(e.target)?.(e.isIntersecting);
      },
      { rootMargin: '120px 0px' }
    );
  }
  return observer;
}

interface FloatingArtProps {
  variant: 'gentle' | 'reverse';
  className?: string;
  children: React.ReactNode;
}

export const FloatingArt: React.FC<FloatingArtProps> = React.memo(
  ({ variant, className = '', children }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = ref.current;
      const obs = getObserver();
      if (!el || !obs) return;
      callbacks.set(el, (visible) => el.classList.toggle('is-paused', !visible));
      obs.observe(el);
      return () => {
        obs.unobserve(el);
        callbacks.delete(el);
      };
    }, []);

    return (
      <div
        ref={ref}
        className={`${variant === 'gentle' ? 'animate-float-gentle' : 'animate-float-reverse'} ${className}`}
      >
        {children}
      </div>
    );
  }
);
FloatingArt.displayName = 'FloatingArt';

