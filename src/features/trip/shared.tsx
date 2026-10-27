import { useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink, MapPin } from 'lucide-react';

/** Componentes pequenos compartilhados entre as abas. */

export function mapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function normalizeUrl(link: string) {
  if (!link) return '';
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export function AddressLink({ address }: { address: string }) {
  if (!address) return null;
  return (
    <a className="detail-link" href={mapsUrl(address)} target="_blank" rel="noreferrer">
      <MapPin size={13} /> {address}
    </a>
  );
}

export function ExternalAnchor({ href, label = 'Abrir link' }: { href: string; label?: string }) {
  if (!href) return null;
  let host = label;
  try {
    host = new URL(normalizeUrl(href)).hostname.replace(/^www\./, '');
  } catch {
    /* mantém o rótulo padrão */
  }
  return (
    <a className="detail-link" href={normalizeUrl(href)} target="_blank" rel="noreferrer">
      <ExternalLink size={13} /> {host}
    </a>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  return (
    <button
      type="button"
      className="code-chip"
      title="Copiar localizador"
      onClick={() => {
        navigator.clipboard
          ?.writeText(code)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {
            // Sem acesso à área de transferência: seleciona o código para cópia manual.
            const node = document.activeElement?.querySelector('.code-chip__value');
            if (node) window.getSelection()?.selectAllChildren(node);
          });
      }}
    >
      <span className="code-chip__label">Localizador</span>
      <span className="code-chip__value">{code}</span>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export function TabHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="tab-header">
      <div>
        <h2 className="tab-header__title">{title}</h2>
        {subtitle && <p className="tab-header__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
