import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_FOODS } from './foods';
import type { AppData } from './types';

const KEY = 'deficit:data';

export function emptyData(): AppData {
  return { version: 1, profile: null, foods: DEFAULT_FOODS, meals: [], favorites: [], workouts: [], weighIns: [], freeDays: {} };
}

/** Valida e completa um objeto vindo do localStorage ou de um backup. */
export function normalize(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido.');
  const r = raw as Partial<AppData>;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  if (r.version !== 1) throw new Error('Versão de backup não reconhecida.');
  return {
    version: 1,
    profile: r.profile ?? null,
    foods: Array.isArray(r.foods) && r.foods.length ? r.foods : DEFAULT_FOODS,
    meals: arr(r.meals),
    favorites: arr(r.favorites),
    workouts: arr(r.workouts),
    weighIns: arr(r.weighIns),
    freeDays: r.freeDays && typeof r.freeDays === 'object' ? r.freeDays : {},
  };
}

function load(): AppData {
  try {
    const s = localStorage.getItem(KEY);
    return s ? normalize(JSON.parse(s)) : emptyData();
  } catch {
    return emptyData();
  }
}

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  replace: (d: AppData) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
  }, [data]);
  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);
  const replace = useCallback((d: AppData) => setData(d), []);
  return <Ctx.Provider value={{ data, update, replace }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider ausente');
  return s;
}

export function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deficit-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
