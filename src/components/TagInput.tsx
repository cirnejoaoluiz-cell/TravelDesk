import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange(value: string[]): void;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
}

/** Campo de múltiplos valores: digite e pressione Enter ou vírgula. */
export function TagInput({ value, onChange, placeholder, id, ariaLabel }: TagInputProps) {
  const [text, setText] = useState('');

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()));
    if (parts.length) onChange([...value, ...parts]);
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="input tag-input">
      {value.map((tag) => (
        <span key={tag} className="tag">
          {tag}
          <button type="button" aria-label={`Remover ${tag}`} onClick={() => onChange(value.filter((v) => v !== tag))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => text.trim() && commit(text)}
        placeholder={value.length ? '' : placeholder}
      />
    </div>
  );
}
