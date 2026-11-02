// Primeira, ultima e as vizinhas da atual; o resto vira reticencias.
function visiblePages(page, pageCount) {
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((item) => item >= 1 && item <= pageCount)
    .sort((a, b) => a - b);
  return pages.flatMap((item, index) => (index && item - pages[index - 1] > 1 ? ['gap', item] : [item]));
}

export function Pagination({ page, pageCount, onChange, label }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {visiblePages(page, pageCount).map((item, index) => (item === 'gap' ? (
        <span key={`gap-${index}`} className="pagination-gap" aria-hidden="true">…</span>
      ) : (
        <button
          key={item}
          type="button"
          className={item === page ? 'is-active' : ''}
          aria-label={`Página ${item}`}
          aria-current={item === page ? 'page' : undefined}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      )))}
      <button type="button" aria-label="Próxima página" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>›</button>
    </nav>
  );
}
