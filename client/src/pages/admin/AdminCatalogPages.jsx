import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { forgetCached, request } from '../../api.js';
import { ImageField } from '../../components/ImageField.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { PokeImage } from '../../components/PokeImage.jsx';
import { capitalize, TYPES, TypeBadge } from '../../components/TypeBadge.jsx';
import { paginate, useListParams } from '../../useListParams.js';

const optionsOf = (values) => values.map((value) => [value, capitalize(value)]);

const CATALOGS = {
  item: {
    title: 'Item DEX',
    api: '/api/admin/items',
    base: '/admin/itemdex',
    addLabel: 'Cadastrar item',
    singular: 'item',
    caches: ['/api/items'],
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'category', label: 'Categoria', list: true },
      { name: 'cost', label: 'Preço', type: 'number', min: 0, max: 9999999 },
      { name: 'image', label: 'Imagem', kind: 'image' },
      { name: 'description', label: 'Descrição', kind: 'textarea' },
    ],
    columns: [
      ['Imagem', (item) => <PokeImage sources={item.image ? [item.image] : []} alt="" width={40} height={40} />],
      ['Nome', (item) => <strong>{item.name}</strong>],
      ['Categoria', (item) => item.category || '—'],
    ],
  },
  move: {
    title: 'Move DEX',
    api: '/api/admin/moves',
    base: '/admin/movedex',
    addLabel: 'Cadastrar golpe',
    singular: 'golpe',
    caches: ['/api/moves', '/api/admin/catalog/moves'],
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'type', label: 'Tipo', kind: 'select', options: optionsOf(TYPES) },
      { name: 'category', label: 'Categoria', kind: 'select', options: optionsOf(['physical', 'special', 'status']) },
      { name: 'power', label: 'Poder', type: 'number', min: 0, max: 999 },
      { name: 'accuracy', label: 'Precisão', type: 'number', min: 0, max: 100 },
      { name: 'pp', label: 'PP', type: 'number', min: 0, max: 99 },
      { name: 'description', label: 'Descrição', kind: 'textarea' },
    ],
    columns: [
      ['Nome', (move) => <strong>{move.name}</strong>],
      ['Tipo', (move) => (move.type ? <TypeBadge type={move.type} /> : '—')],
      ['Categoria', (move) => (move.category ? capitalize(move.category) : '—')],
    ],
  },
};

export function AdminCatalogList({ kind }) {
  const catalog = CATALOGS[kind];
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const { params, setParam, page: requestedPage, setPage } = useListParams();
  const query = params.get('q') ?? '';

  const load = () => request(catalog.api).then(setEntries).catch((failure) => setError(failure.message));

  useEffect(() => {
    load();
  }, []);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (entries ?? []).filter((entry) => !term || entry.name.toLowerCase().includes(term));
  }, [entries, query]);

  const remove = async (entry) => {
    if (!window.confirm(`Excluir ${entry.name} da ${catalog.title}?`)) return;
    setError(null);
    try {
      await request(`${catalog.api}/${encodeURIComponent(entry.slug)}`, { method: 'DELETE' });
      catalog.caches.forEach(forgetCached);
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  const { rows, page, pageCount } = paginate(matches, requestedPage);

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>{catalog.title}</h1>
        {entries && <p className="page-count">{matches.length} de {entries.length}</p>}
      </header>

      <div className="admin-toolbar">
        <label className="field field--search">
          Buscar
          <input type="search" value={query} placeholder="Nome" onChange={(event) => setParam('q', event.target.value)} />
        </label>
        <Link className="button" to={`${catalog.base}/novo`}>{catalog.addLabel}</Link>
      </div>

      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {!entries && !error && <p className="notice">Carregando…</p>}

      {entries && (
        <>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} label={`Páginas: ${catalog.title}`} />
          <div className="table-scroll panel">
            <table className="admin-table">
              <thead>
                <tr>
                  {catalog.columns.map(([label]) => <th key={label}>{label}</th>)}
                  <th><span className="visually-hidden">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.slug}>
                    {catalog.columns.map(([label, render]) => <td key={label}>{render(entry)}</td>)}
                    <td>
                      <div className="admin-actions">
                        <Link className="button button--quiet" to={`${catalog.base}/${entry.slug}`} aria-label={`Editar ${entry.name}`}>Editar</Link>
                        <button type="button" className="button button--quiet button--danger" aria-label={`Excluir ${entry.name}`} onClick={() => remove(entry)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} label={`Páginas: ${catalog.title}`} />
        </>
      )}
    </div>
  );
}

function CatalogField({ field, value, onChange, listId }) {
  if (field.kind === 'image') return <ImageField label={field.label} value={value} maxSide={256} onChange={onChange} />;
  if (field.kind === 'textarea') {
    return (
      <label className="field">
        {field.label}
        <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }
  if (field.kind === 'select') {
    return (
      <label className="field">
        {field.label}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">—</option>
          {field.options.map(([option, label]) => <option key={option} value={option}>{label}</option>)}
        </select>
      </label>
    );
  }
  const { label, type = 'text', min, max, required } = field;
  return (
    <label className="field">
      {label}
      <input type={type} min={min} max={max} required={required} list={field.list ? listId : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

const emptyEntry = (catalog) => Object.fromEntries(catalog.fields.map((field) => [field.name, '']));
const toForm = (catalog, entry) => Object.fromEntries(catalog.fields.map((field) => [field.name, entry[field.name] ?? '']));

export function AdminCatalogForm({ kind }) {
  const catalog = CATALOGS[kind];
  const { slug } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(slug);
  const [form, setForm] = useState(editing ? null : emptyEntry(catalog));
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    request(`${catalog.api}/${encodeURIComponent(slug)}`)
      .then((entry) => setForm(toForm(catalog, entry)))
      .catch((failure) => setError(failure.message));
  }, [editing, slug, catalog]);

  useEffect(() => {
    if (kind !== 'item') return;
    request(catalog.api)
      .then((entries) => setSuggestions([...new Set(entries.map((entry) => entry.category).filter(Boolean))].sort()))
      .catch(() => setSuggestions([]));
  }, [kind, catalog]);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await request(editing ? `${catalog.api}/${encodeURIComponent(slug)}` : catalog.api, { method: editing ? 'PUT' : 'POST', body: form });
      catalog.caches.forEach(forgetCached);
      navigate(catalog.base);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <div className="admin-page admin-page--narrow">
      <Link to={catalog.base} className="back-link">← {catalog.title}</Link>
      <header className="page-header">
        <h1>{editing ? `Editar ${form?.name ?? ''}` : catalog.addLabel}</h1>
      </header>

      <form className="panel admin-form" onSubmit={submit}>
        {editing && !form && !error && <p className="notice">Carregando…</p>}
        {form && catalog.fields.map((field) => (
          <CatalogField
            key={field.name}
            field={field}
            listId="catalog-suggestions"
            value={form[field.name]}
            onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
          />
        ))}
        <datalist id="catalog-suggestions">
          {suggestions.map((value) => <option key={value} value={value} />)}
        </datalist>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {form && <button type="submit" className="button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>}
      </form>
    </div>
  );
}
