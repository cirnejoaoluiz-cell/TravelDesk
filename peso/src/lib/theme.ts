import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'deficit:theme';

/** Tema salvo; sem escolha salva, segue o do sistema. */
export function initialTheme(): Theme {
  try {
    const s = localStorage.getItem(THEME_KEY);
    if (s === 'light' || s === 'dark') return s;
  } catch {
    /* localStorage indisponível */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#020617' : '#ffffff');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const toggle = useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* sem persistência */
      }
      applyTheme(next);
      return next;
    });
  }, []);
  return { theme, toggle };
}
