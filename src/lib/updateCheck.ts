/**
 * Mantém o site na versão mais recente.
 *
 * O GitHub Pages permite que o navegador guarde a página por alguns minutos, e o
 * app adicionado à tela de início do iPhone/iPad pode continuar mostrando uma
 * versão antiga por bem mais tempo. Ao abrir e sempre que o app volta a ficar
 * visível, comparamos o arquivo principal publicado com o que está rodando; se
 * mudou, a página é recarregada por um endereço novo (que não pode vir do cache).
 *
 * Os dados ficam salvos a cada alteração, então recarregar não perde nada. Só não
 * recarregamos com um formulário aberto, para não interromper quem está digitando.
 */

const BUNDLE = /assets\/index-[\w-]+\.js/;
const RELOAD_FLAG = 'traveldesk:update-reload';

function runningBundle(): string | null {
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')) {
    const match = BUNDLE.exec(script.src);
    if (match) return match[0];
  }
  return null;
}

async function publishedBundle(): Promise<string | null> {
  const response = await fetch(`./index.html?check=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return null;
  return BUNDLE.exec(await response.text())?.[0] ?? null;
}

function safeSession(action: (s: Storage) => string | null | void) {
  try {
    return action(window.sessionStorage);
  } catch {
    return null;
  }
}

export function startUpdateCheck() {
  // Só no site publicado (no claude.ai a plataforma entrega as versões novas).
  if (import.meta.env.DEV || import.meta.env.VITE_TARGET === 'artifact') return;
  const current = runningBundle();
  if (!current) return;

  let checking = false;
  const check = async () => {
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      const latest = await publishedBundle();
      if (!latest || latest === current) return;
      // Evita repetir a recarga caso a versão nova ainda não tenha chegado a este aparelho.
      if (safeSession((s) => s.getItem(RELOAD_FLAG)) === latest) return;
      if (document.querySelector('dialog[open]')) return; // tenta de novo na próxima vez
      safeSession((s) => s.setItem(RELOAD_FLAG, latest));
      const version = latest.replace(/^assets\/index-|\.js$/g, '');
      window.location.replace(`${window.location.pathname}?v=${version}${window.location.hash}`);
    } catch {
      // Sem conexão: continua na versão atual.
    } finally {
      checking = false;
    }
  };

  void check();
  document.addEventListener('visibilitychange', () => void check());
  window.addEventListener('focus', () => void check());
}
