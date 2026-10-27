import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  onSelect(): void;
  danger?: boolean;
}

const ITEM_HEIGHT = 40;
const GAP = 4;
const EDGE = 8;

/**
 * Posiciona a lista fixa na tela, alinhada ao botão: assim ela nunca é cortada
 * por um card com bordas arredondadas e abre para cima quando falta espaço embaixo.
 */
function placeMenu(button: HTMLElement, itemCount: number): CSSProperties {
  const rect = button.getBoundingClientRect();
  const height = itemCount * ITEM_HEIGHT + 12;
  const right = Math.max(EDGE, window.innerWidth - rect.right);
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < height + GAP + EDGE && rect.top > spaceBelow) {
    return { right, bottom: window.innerHeight - rect.top + GAP };
  }
  return { right, top: rect.bottom + GAP };
}

/** Menu "…" compacto para ações secundárias (editar, excluir). */
export function Menu({ actions, label = 'Mais ações' }: { actions: MenuAction[]; label?: string }) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const open = position !== null;
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const close = () => setPosition(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !listRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    // A lista é fixa na tela: acompanha o botão ao rolar ou redimensionar.
    const follow = () => buttonRef.current && setPosition(placeMenu(buttonRef.current, actions.length));
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
  }, [open, actions.length]);

  return (
    <div className="menu" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPosition(open || !buttonRef.current ? null : placeMenu(buttonRef.current, actions.length));
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {open &&
        // Renderizada no <body>: um card com transform ou overflow não desloca nem corta a lista.
        createPortal(
          <div className="menu__list" role="menu" style={position} ref={listRef}>
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className={`menu__item ${action.danger ? 'menu__item--danger' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  close();
                  action.onSelect();
                }}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
