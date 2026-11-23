/**
 * Mantém o app na versão publicada mais recente.
 *
 * O app instalado no celular costuma voltar do segundo plano sem recarregar, e o
 * GitHub Pages deixa a página em cache por alguns minutos. Ao abrir e sempre que o
 * app volta a ficar visível, comparamos o arquivo principal publicado com o que
 * está rodando; se mudou, recarregamos (os dados já estão salvos). Não recarrega
 * com uma janela de lançamento aberta, para não perder o que está sendo digitado.
 */
const BUNDLE = /assets\/index-[\w-]+\.js/;
const RELOAD_FLAG = 'kcalc:update-reload';

function runningBundle(): string | null {
  for (const s of document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')) {
    const m = BUNDLE.exec(s.src);
    if (m) return m[0];
  }
  return null;
}

export function startUpdateCheck() {
  if (import.meta.env.DEV) return;
  const current = runningBundle();
  if (!current) return;
  let checking = false;

  const check = async () => {
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
      const res = await fetch(`./index.html?check=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const latest = BUNDLE.exec(await res.text())?.[0];
      if (!latest || latest === current) return;
      if (sessionStorage.getItem(RELOAD_FLAG) === latest) return; // já tentou: evita laço
      if (document.querySelector('[data-sheet]')) return; // tenta de novo depois
      sessionStorage.setItem(RELOAD_FLAG, latest);
      window.location.reload();
    } catch {
      // Offline: segue na versão atual.
    } finally {
      checking = false;
    }
  };

  void check();
  document.addEventListener('visibilitychange', () => void check());
  window.addEventListener('focus', () => void check());
}
