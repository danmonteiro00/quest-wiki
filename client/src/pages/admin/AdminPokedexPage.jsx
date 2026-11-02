import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgetCached, request } from '../../api.js';
import { PokeImage } from '../../components/PokeImage.jsx';
import { formatDex, TypeBadge } from '../../components/TypeBadge.jsx';

const PAGE_SIZE = 50;

export function AdminPokedexPage() {
  const [pokemon, setPokemon] = useState(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [error, setError] = useState(null);

  const load = () => request('/api/admin/pokedex').then(setPokemon).catch((failure) => setError(failure.message));

  useEffect(() => {
    load();
  }, []);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/^#0*/, '');
    if (!term) return pokemon ?? [];
    return (pokemon ?? []).filter((item) => item.name.toLowerCase().includes(term) || item.slug.includes(term) || String(item.dexNumber) === term);
  }, [pokemon, query]);

  const remove = async (item) => {
    if (!window.confirm(`Excluir ${item.name} da Pokédex? Ele também sai das áreas do mapa.`)) return;
    setError(null);
    try {
      await request(`/api/admin/pokedex/${encodeURIComponent(item.slug)}`, { method: 'DELETE' });
      forgetCached('/api/pokemon');
      forgetCached('/api/admin/pokedex');
      forgetCached(`/api/pokemon/${encodeURIComponent(item.slug)}`);
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>Pokédex</h1>
        {pokemon && <p className="page-count">{matches.length} de {pokemon.length}</p>}
      </header>

      <div className="admin-toolbar">
        <label className="field field--search">
          Buscar
          <input
            type="search"
            value={query}
            placeholder="Nome ou número"
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE_SIZE);
            }}
          />
        </label>
        <Link className="button" to="/admin/pokedex/novo">Cadastrar Pokémon</Link>
      </div>

      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {!pokemon && !error && <p className="notice">Carregando…</p>}

      {pokemon && (
        <div className="table-scroll panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th><span className="visually-hidden">Imagem</span></th>
                <th>Número</th>
                <th>Nome</th>
                <th>Tipos</th>
                <th><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {matches.slice(0, limit).map((item) => (
                <tr key={item.slug}>
                  <td><PokeImage sources={item.art} alt="" width={40} height={40} /></td>
                  <td>{formatDex(item.dexNumber)}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>
                    <div className="type-row">
                      {item.types.map((type) => <TypeBadge key={type} type={type} />)}
                    </div>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <Link className="button button--quiet" to={`/admin/pokedex/${item.slug}`} aria-label={`Editar ${item.name}`}>Editar</Link>
                      <button type="button" className="button button--quiet button--danger" aria-label={`Excluir ${item.name}`} onClick={() => remove(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {matches.length > limit && (
            <button type="button" className="button button--quiet admin-more" onClick={() => setLimit(limit + PAGE_SIZE)}>Mostrar mais</button>
          )}
        </div>
      )}
    </div>
  );
}
