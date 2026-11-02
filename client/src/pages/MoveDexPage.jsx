import { useMemo } from 'react';
import { Pagination } from '../components/Pagination.jsx';
import { capitalize, TYPES, TypeBadge } from '../components/TypeBadge.jsx';
import { useApi } from '../useApi.js';
import { paginate, useListParams } from '../useListParams.js';

const CATEGORIES = ['physical', 'special', 'status'];

export function MoveDexPage() {
  const { data, error } = useApi('/api/moves');
  const { params, setParam, page: requestedPage, setPage } = useListParams();

  const query = params.get('q') ?? '';
  const type = params.get('type') ?? '';
  const category = params.get('category') ?? '';

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data ?? [])
      .filter((move) => !type || move.type === type)
      .filter((move) => !category || move.category === category)
      .filter((move) => !term || move.name.toLowerCase().includes(term));
  }, [data, query, type, category]);

  const { rows, page, pageCount } = paginate(visible, requestedPage);
  const pagination = <Pagination page={page} pageCount={pageCount} onChange={setPage} label="Páginas da Move DEX" />;

  return (
    <>
      <header className="page-header">
        <h1>Move DEX</h1>
        <p className="page-count" aria-live="polite">{data ? `${visible.length} de ${data.length}` : ''}</p>
      </header>

      <form className="filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="field field--search">
          <span>Buscar</span>
          <input type="search" value={query} placeholder="Nome do golpe" onChange={(event) => setParam('q', event.target.value)} />
        </label>
        <label className="field">
          <span>Tipo</span>
          <select value={type} onChange={(event) => setParam('type', event.target.value)}>
            <option value="">Todos</option>
            {TYPES.map((name) => <option key={name} value={name}>{capitalize(name)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Categoria</span>
          <select value={category} onChange={(event) => setParam('category', event.target.value)}>
            <option value="">Todas</option>
            {CATEGORIES.map((name) => <option key={name} value={name}>{capitalize(name)}</option>)}
          </select>
        </label>
      </form>

      {error && <p className="notice notice--error">Não foi possível carregar os golpes.</p>}
      {!data && !error && <p className="notice">Carregando golpes…</p>}
      {data && !visible.length && <p className="notice">Nenhum golpe encontrado com esses filtros.</p>}

      {pagination}
      {rows.length > 0 && (
        <div className="panel table-scroll">
          <table className="moves move-dex">
            <thead>
              <tr>
                <th>Golpe</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th className="num">Poder</th>
                <th className="num">Prec.</th>
                <th className="num">PP</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((move) => (
                <tr key={move.slug}>
                  <td><strong>{move.name}</strong></td>
                  <td>{move.type && <TypeBadge type={move.type} />}</td>
                  <td>{move.category ? capitalize(move.category) : '—'}</td>
                  <td className="num">{move.power ?? '—'}</td>
                  <td className="num">{move.accuracy ?? '—'}</td>
                  <td className="num">{move.pp ?? '—'}</td>
                  <td className="move-description">{move.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination}
    </>
  );
}
