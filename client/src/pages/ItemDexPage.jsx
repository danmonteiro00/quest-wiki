import { useMemo } from 'react';
import { Pagination } from '../components/Pagination.jsx';
import { PokeImage } from '../components/PokeImage.jsx';
import { useApi } from '../useApi.js';
import { paginate, useListParams } from '../useListParams.js';

export function ItemDexPage() {
  const { data, error } = useApi('/api/items');
  const { params, setParam, page: requestedPage, setPage } = useListParams();

  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';

  const categories = useMemo(() => [...new Set((data ?? []).map((item) => item.category).filter(Boolean))].sort(), [data]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data ?? [])
      .filter((item) => !category || item.category === category)
      .filter((item) => !term || item.name.toLowerCase().includes(term));
  }, [data, query, category]);

  const { rows, page, pageCount } = paginate(visible, requestedPage);
  const pagination = <Pagination page={page} pageCount={pageCount} onChange={setPage} label="Páginas da Item DEX" />;

  return (
    <>
      <header className="page-header">
        <h1>Item DEX</h1>
        <p className="page-count" aria-live="polite">{data ? `${visible.length} de ${data.length}` : ''}</p>
      </header>

      <form className="filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="field field--search">
          <span>Buscar</span>
          <input type="search" value={query} placeholder="Nome do item" onChange={(event) => setParam('q', event.target.value)} />
        </label>
        <label className="field">
          <span>Categoria</span>
          <select value={category} onChange={(event) => setParam('category', event.target.value)}>
            <option value="">Todas</option>
            {categories.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </form>

      {error && <p className="notice notice--error">Não foi possível carregar os itens.</p>}
      {!data && !error && <p className="notice">Carregando itens…</p>}
      {data && !visible.length && <p className="notice">Nenhum item encontrado com esses filtros.</p>}

      {pagination}
      <ul className="item-grid">
        {rows.map((item) => (
          <li key={item.slug} className="panel item-card">
            <PokeImage sources={item.image ? [item.image] : []} alt="" className="item-image" width={48} height={48} />
            <div>
              <h2>{item.name}</h2>
              {item.category && <p className="item-category">{item.category}</p>}
              {item.description && <p className="item-description">{item.description}</p>}
            </div>
          </li>
        ))}
      </ul>
      {pagination}
    </>
  );
}
