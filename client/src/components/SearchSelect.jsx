import { useEffect, useId, useMemo, useRef, useState } from 'react';

const MAX_RESULTS = 50;

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Campo em que se digita para filtrar a lista. Com freeText, o valor e o proprio texto digitado,
// e escolher uma opcao avisa por onPick; sem ele, o valor e o da opcao escolhida.
export function SearchSelect({ label, ariaLabel, options, value, onChange, onPick, freeText = false, required, disabled, placeholder }) {
  const listId = useId();
  const inputRef = useRef(null);
  const [query, setQuery] = useState(null);
  const [position, setPosition] = useState(null);
  const [active, setActive] = useState(0);

  const selected = freeText ? null : options.find((option) => option.value === value);
  const shown = freeText ? value : query ?? selected?.label ?? '';
  const term = normalize(freeText ? value : query ?? '');

  const matches = useMemo(() => {
    const found = term ? options.filter((option) => normalize(option.label).includes(term)) : options;
    return found.slice(0, MAX_RESULTS);
  }, [options, term]);

  const open = position !== null && matches.length > 0;

  // A lista fica em position: fixed para nao ser cortada pela rolagem da tabela de golpes.
  const show = () => {
    const box = inputRef.current.getBoundingClientRect();
    setPosition({ left: box.left, top: box.bottom + 4, width: Math.max(box.width, 260) });
  };

  const close = () => {
    setPosition(null);
    setQuery(null);
  };

  useEffect(() => {
    if (position === null) return undefined;
    // A lista acompanha o campo quando a pagina rola; rolar a propria lista nao muda nada.
    const follow = (event) => {
      if (!event.target.closest?.('.search-select-list')) show();
    };
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    return () => {
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
  }, [position === null]);

  const pick = (option) => {
    onChange(freeText ? option.label : option.value);
    onPick?.(option);
    close();
  };

  const type = (event) => {
    const text = event.target.value;
    if (freeText) onChange(text);
    else {
      setQuery(text);
      if (!text) onChange('');
    }
    setActive(0);
    show();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return show();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + matches.length) % matches.length);
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      pick(matches[Math.min(active, matches.length - 1)]);
    }
  };

  const input = (
    <input
      ref={inputRef}
      role="combobox"
      aria-label={ariaLabel}
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listId}
      aria-activedescendant={open ? `${listId}-${active}` : undefined}
      autoComplete="off"
      value={shown}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      onChange={type}
      onFocus={show}
      onClick={show}
      onBlur={close}
      onKeyDown={onKeyDown}
    />
  );

  return (
    <>
      {label ? <label className="field">{label}{input}</label> : input}
      {open && (
        <ul id={listId} role="listbox" className="search-select-list" style={position}>
          {matches.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'is-active' : ''}
              // Sem isso o campo perde o foco e fecha a lista antes do clique contar.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
