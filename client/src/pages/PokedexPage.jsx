import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Pagination } from '../components/Pagination.jsx';
import { PokeImage } from '../components/PokeImage.jsx';
import { capitalize, formatDex, TYPES, TypeBadge } from '../components/TypeBadge.jsx';
import { useApi } from '../useApi.js';
import { paginate, useListParams } from '../useListParams.js';

const SORTS = {
  dex: { label: 'Número', compare: (a, b) => a.dexNumber - b.dexNumber || a.id - b.id },
  name: { label: 'Nome', compare: (a, b) => a.name.localeCompare(b.name) },
  total: { label: 'Total de status', compare: (a, b) => b.statTotal - a.statTotal },
};

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function PokedexPage() {
  const { data, error } = useApi('/api/pokemon');
  const { params, setParam, page: requestedPage, setPage } = useListParams();

  const query = params.get('q') ?? '';
  const type = params.get('type') ?? '';
  const generation = params.get('gen') ?? '';
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'dex';
  const showForms = params.get('forms') === '1';

  const visible = useMemo(() => {
    if (!data) return [];
    const term = query.trim().toLowerCase().replace(/^#0*/, '');
    return data
      .filter((pokemon) => showForms || pokemon.isDefault)
      .filter((pokemon) => !type || pokemon.types.includes(type))
      .filter((pokemon) => !generation || pokemon.generation === Number(generation))
      .filter((pokemon) => !term || pokemon.name.toLowerCase().includes(term) || String(pokemon.dexNumber) === term)
      .sort(SORTS[sort].compare);
  }, [data, query, type, generation, sort, showForms]);

  const { rows, page, pageCount } = paginate(visible, requestedPage);
  const pagination = <Pagination page={page} pageCount={pageCount} onChange={setPage} label="Páginas da Pokédex" />;

  return (
    <>
      <header className="page-header">
        <h1>Pokédex</h1>
        <p className="page-count" aria-live="polite">{data ? `${visible.length} de ${data.length}` : ''}</p>
      </header>

      <form className="filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="field field--search">
          <span>Buscar</span>
          <input type="search" value={query} placeholder="Nome ou número" onChange={(event) => setParam('q', event.target.value)} />
        </label>
        <label className="field">
          <span>Tipo</span>
          <select value={type} onChange={(event) => setParam('type', event.target.value)}>
            <option value="">Todos</option>
            {TYPES.map((name) => <option key={name} value={name}>{capitalize(name)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Geração</span>
          <select value={generation} onChange={(event) => setParam('gen', event.target.value)}>
            <option value="">Todas</option>
            {GENERATIONS.map((number) => <option key={number} value={number}>{number}ª geração</option>)}
          </select>
        </label>
        <label className="field">
          <span>Ordenar por</span>
          <select value={sort} onChange={(event) => setParam('sort', event.target.value === 'dex' ? '' : event.target.value)}>
            {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={showForms} onChange={(event) => setParam('forms', event.target.checked ? '1' : '')} />
          <span>Incluir formas</span>
        </label>
      </form>

      {error && <p className="notice notice--error">Não foi possível carregar a Pokédex. Confira se a API está rodando e se os dados foram importados.</p>}
      {!data && !error && <p className="notice">Carregando Pokédex…</p>}
      {data && !visible.length && <p className="notice">Nenhum Pokémon encontrado com esses filtros.</p>}

      {pagination}
      <ul className="dex-grid">
        {rows.map((pokemon) => (
          <li key={pokemon.id} className={`dex-card type-tint-${pokemon.types[0]}`}>
            <Link to={pokemon.slug} state={{ dexSearch: params.toString() }}>
              <span className="dex-number">{formatDex(pokemon.dexNumber)}</span>
              <PokeImage sources={pokemon.art} alt="" className="dex-art" width={96} height={96} />
              <span className="dex-name">{pokemon.name}</span>
              <span className="type-row">
                {pokemon.types.map((name) => <TypeBadge key={name} type={name} />)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {pagination}
    </>
  );
}
