import { useTheme } from '../lib/theme';

export function Header() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Déficit</span>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label={dark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
          title={dark ? 'Tema claro' : 'Tema escuro'}
          onClick={toggle}
          className="relative flex h-8 w-16 items-center rounded-full bg-slate-200 p-1 transition-colors dark:bg-slate-700"
        >
          <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform dark:bg-slate-900 ${dark ? 'translate-x-8' : ''}`}>
            {dark ? <Moon /> : <Sun />}
          </span>
        </button>
      </div>
    </header>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-300" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
