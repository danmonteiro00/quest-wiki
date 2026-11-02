import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MAP_AREAS } from '../../../shared/map-areas.js';
import { forgetCached } from '../api.js';
import { useApi } from '../useApi.js';

const STORAGE_KEY = 'quest-wiki:admin-password';

function readPassword() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function savePassword(value) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem armazenamento disponivel, a senha so vale ate recarregar a pagina.
  }
}

async function adminFetch(path, password, options = {}) {
  const response = await fetch(`/api/map/admin${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${encodeURIComponent(password)}`, 'Content-Type': 'application/json' },
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error ?? `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const emptySection = () => ({ image: '', description: '', slots: 10, pokemon: [], resources: [] });

function LoginForm({ onLogin }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await adminFetch('', value);
      onLogin(value);
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <form className="admin-login panel" onSubmit={submit}>
      <h1>Editar mapa</h1>
      <label className="field">
        Senha do ADM
        <input type="password" autoComplete="current-password" value={value} onChange={(event) => setValue(event.target.value)} required />
      </label>
      {error && <p className="notice notice--error">{error}</p>}
      <button type="submit" className="button">Entrar</button>
    </form>
  );
}

function PokemonEditor({ slugs, options, onChange }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const nameOf = (slug) => options.find((pokemon) => pokemon.slug === slug)?.name ?? slug;

  const add = () => {
    const term = value.trim().toLowerCase();
    if (!term) return;
    const match = options.find((pokemon) => pokemon.slug === term || pokemon.name.toLowerCase() === term);
    if (!match) return setError(`"${value}" não está na Pokédex`);
    setError(null);
    setValue('');
    if (!slugs.includes(match.slug)) onChange([...slugs, match.slug]);
  };

  return (
    <>
      <div className="admin-row">
        <label className="field">
          Adicionar Pokémon descoberto
          <input
            list="admin-pokemon"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
          />
        </label>
        <button type="button" className="button button--quiet" onClick={add}>Adicionar</button>
      </div>
      {error && <p className="notice notice--error">{error}</p>}
      <ul className="admin-chips">
        {slugs.map((slug) => (
          <li key={slug}>
            {nameOf(slug)}
            <button type="button" onClick={() => onChange(slugs.filter((item) => item !== slug))} aria-label={`Remover ${nameOf(slug)}`}>×</button>
          </li>
        ))}
      </ul>
    </>
  );
}

function ResourceEditor({ resources, onChange }) {
  const update = (index, field, value) => onChange(resources.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  return (
    <>
      {resources.map((resource, index) => (
        <fieldset className="admin-resource" key={index}>
          <label className="field admin-icon">
            Ícone
            <input value={resource.icon} placeholder="🌿" onChange={(event) => update(index, 'icon', event.target.value)} />
          </label>
          <label className="field">
            Nome
            <input value={resource.name} required onChange={(event) => update(index, 'name', event.target.value)} />
          </label>
          <button type="button" className="button button--quiet" onClick={() => onChange(resources.filter((_, i) => i !== index))}>Remover</button>
          <label className="field admin-wide">
            Descrição
            <textarea rows={2} value={resource.description} onChange={(event) => update(index, 'description', event.target.value)} />
          </label>
        </fieldset>
      ))}
      <button type="button" className="button button--quiet" onClick={() => onChange([...resources, { icon: '', name: '', description: '' }])}>
        Adicionar recurso
      </button>
    </>
  );
}

function SectionEditor({ section, options, onChange }) {
  const set = (field, value) => onChange({ ...section, [field]: value });

  return (
    <div className="admin-section">
      <label className="field">
        Endereço da imagem
        <input type="url" value={section.image} placeholder="https://..." onChange={(event) => set('image', event.target.value)} />
      </label>
      <label className="field">
        Descrição
        <textarea rows={4} value={section.description} onChange={(event) => set('description', event.target.value)} />
      </label>
      <label className="field admin-slots">
        Total de quadrados de Pokémon
        <input type="number" min="1" max="200" value={section.slots} onChange={(event) => set('slots', event.target.value)} />
      </label>
      <PokemonEditor slugs={section.pokemon} options={options} onChange={(pokemon) => set('pokemon', pokemon)} />
      <h2>Recursos e objetos</h2>
      <ResourceEditor resources={section.resources} onChange={(resources) => set('resources', resources)} />
    </div>
  );
}

function AreaEditor({ slug, password, options, onUnauthorized }) {
  const [content, setContent] = useState(null);
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;
    setContent(null);
    setTab(0);
    setStatus(null);
    adminFetch(`/${slug}`, password)
      .then((data) => active && setContent(data))
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) onUnauthorized();
        else setStatus({ error: true, text: error.message });
      });
    return () => {
      active = false;
    };
  }, [slug, password, onUnauthorized]);

  if (!content) return status ? <p className="notice notice--error">{status.text}</p> : <p className="area-empty">Carregando…</p>;

  const edit = (next) => {
    setContent(next);
    setStatus(null);
  };

  const updateSubarea = (index, next) => edit({ ...content, subareas: content.subareas.map((item, i) => (i === index ? next : item)) });

  const addSubarea = () => {
    edit({ ...content, subareas: [...content.subareas, { name: `Sub-área ${content.subareas.length + 1}`, ...emptySection() }] });
    setTab(content.subareas.length + 1);
  };

  const removeSubarea = (index) => {
    edit({ ...content, subareas: content.subareas.filter((_, i) => i !== index) });
    setTab(0);
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      const saved = await adminFetch(`/${slug}`, password, { method: 'PUT', body: JSON.stringify(content) });
      forgetCached(`/api/map/${slug}`);
      setContent(saved);
      setStatus({ error: false, text: 'Salvo. O site público mostra a mudança em até 1 minuto.' });
    } catch (error) {
      if (error.status === 401) return onUnauthorized();
      setStatus({ error: true, text: error.message });
    }
  };

  const subarea = tab > 0 ? content.subareas[tab - 1] : null;

  return (
    <form onSubmit={save} className="panel admin-form">
      <div className="tabs" role="tablist" aria-label="Sub-áreas">
        <button type="button" role="tab" aria-selected={tab === 0} className={tab === 0 ? 'is-active' : ''} onClick={() => setTab(0)}>Geral</button>
        {content.subareas.map((item, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={tab === index + 1}
            className={tab === index + 1 ? 'is-active' : ''}
            onClick={() => setTab(index + 1)}
          >
            {item.name || 'Sem nome'}
          </button>
        ))}
        <button type="button" onClick={addSubarea}>+ Sub-área</button>
      </div>

      {subarea && (
        <div className="admin-row">
          <label className="field">
            Nome da sub-área
            <input value={subarea.name} required onChange={(event) => updateSubarea(tab - 1, { ...subarea, name: event.target.value })} />
          </label>
          <button type="button" className="button button--quiet" onClick={() => removeSubarea(tab - 1)}>Remover sub-área</button>
        </div>
      )}

      <SectionEditor
        key={tab}
        section={subarea ?? content}
        options={options}
        onChange={(next) => (subarea ? updateSubarea(tab - 1, next) : edit({ ...content, ...next }))}
      />

      {status && <p className={status.error ? 'notice notice--error' : 'notice'} role="status">{status.text}</p>}
      <button type="submit" className="button">Salvar</button>
    </form>
  );
}

export function MapAdminPage() {
  const [password, setPassword] = useState(readPassword);
  const [slug, setSlug] = useState(MAP_AREAS[0].slug);
  const { data: pokemon } = useApi('/api/pokemon');

  const logout = useCallback(() => {
    savePassword('');
    setPassword('');
  }, []);

  if (!password) {
    return (
      <LoginForm
        onLogin={(value) => {
          savePassword(value);
          setPassword(value);
        }}
      />
    );
  }

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>Editar mapa</h1>
        <div className="admin-links">
          <Link to={`/mapa/${slug}`}>Ver no mapa</Link>
          <button type="button" className="button button--quiet" onClick={logout}>Sair</button>
        </div>
      </header>

      <label className="field admin-select">
        Área
        <select value={slug} onChange={(event) => setSlug(event.target.value)}>
          {MAP_AREAS.map((area) => <option key={area.slug} value={area.slug}>{area.name}</option>)}
        </select>
      </label>

      <datalist id="admin-pokemon">
        {pokemon?.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
      </datalist>

      <AreaEditor key={slug} slug={slug} password={password} options={pokemon ?? []} onUnauthorized={logout} />
    </div>
  );
}
