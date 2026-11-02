import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MAP_AREAS, findArea } from '../../../../shared/map-areas.js';
import { CONDITION_GROUPS } from '../../../../shared/map-conditions.js';
import { forgetCached, request } from '../../api.js';
import { ImageField } from '../../components/ImageField.jsx';

const emptySection = () => ({ image: '', description: '', slots: 10, pokemon: [], conditions: {}, resources: [] });

function PokemonEditor({ slugs, conditions, options, onChange }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const nameOf = (slug) => options.find((pokemon) => pokemon.slug === slug)?.name ?? slug;

  const setCondition = (slug, key, chosen) => {
    onChange(slugs, { ...conditions, [slug]: { ...conditions[slug], [key]: chosen } });
  };

  const remove = (slug) => {
    const { [slug]: removed, ...others } = conditions;
    onChange(slugs.filter((item) => item !== slug), others);
  };

  const add = () => {
    const term = value.trim().toLowerCase();
    if (!term) return;
    const match = options.find((pokemon) => pokemon.slug === term || pokemon.name.toLowerCase() === term);
    if (!match) return setError(`"${value}" não está na Pokédex`);
    setError(null);
    setValue('');
    if (!slugs.includes(match.slug)) onChange([...slugs, match.slug], conditions);
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
      <ul className="admin-chips admin-chips--rows">
        {slugs.map((slug) => (
          <li key={slug}>
            <strong>{nameOf(slug)}</strong>
            <span className="map-conditions">
              {CONDITION_GROUPS.map((group) => (
                <select
                  key={group.key}
                  aria-label={`${group.label} de ${nameOf(slug)}`}
                  value={conditions[slug]?.[group.key] ?? ''}
                  onChange={(event) => setCondition(slug, group.key, event.target.value)}
                >
                  <option value="">{group.any}</option>
                  {group.options.map((option) => <option key={option.value} value={option.value}>{option.icon} {option.label}</option>)}
                </select>
              ))}
            </span>
            <button type="button" onClick={() => remove(slug)} aria-label={`Remover ${nameOf(slug)}`}>×</button>
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
        <fieldset className="admin-resource admin-resource--wide" key={index}>
          <label className="field">
            Nome
            <input value={resource.name} required onChange={(event) => update(index, 'name', event.target.value)} />
          </label>
          <button type="button" className="button button--quiet" onClick={() => onChange(resources.filter((_, i) => i !== index))}>Remover</button>
          <div className="admin-wide">
            <ImageField
              label="Ícone"
              value={resource.icon}
              placeholder="🌿 ou https://..."
              maxSide={128}
              previewClass="image-field-preview--icon"
              onChange={(icon) => update(index, 'icon', icon)}
            />
          </div>
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
      <ImageField label="Imagem do local" value={section.image} onChange={(image) => set('image', image)} />
      <label className="field">
        Descrição
        <textarea rows={4} value={section.description} onChange={(event) => set('description', event.target.value)} />
      </label>
      <label className="field admin-slots">
        Total de quadrados de Pokémon
        <input type="number" min="1" max="200" value={section.slots} onChange={(event) => set('slots', event.target.value)} />
      </label>
      <PokemonEditor
        slugs={section.pokemon}
        conditions={section.conditions ?? {}}
        options={options}
        onChange={(pokemon, conditions) => onChange({ ...section, pokemon, conditions })}
      />
      <h2>Recursos e objetos</h2>
      <ResourceEditor resources={section.resources} onChange={(resources) => set('resources', resources)} />
    </div>
  );
}

function AreaEditor({ slug, options }) {
  const area = findArea(slug);
  const [content, setContent] = useState(null);
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;
    request(`/api/admin/map/${slug}`)
      .then((data) => active && setContent(data))
      .catch((error) => active && setStatus({ error: true, text: error.message }));
    return () => {
      active = false;
    };
  }, [slug]);

  if (!content) return status ? <p className="notice notice--error">{status.text}</p> : <p className="notice">Carregando…</p>;

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
      const saved = await request(`/api/admin/map/${slug}`, { method: 'PUT', body: content });
      forgetCached(`/api/map/${slug}`);
      setContent(saved);
      setStatus({ error: false, text: 'Salvo. O site público mostra a mudança em até 1 minuto.' });
    } catch (error) {
      setStatus({ error: true, text: error.message });
    }
  };

  const subarea = tab > 0 ? content.subareas[tab - 1] : null;

  return (
    <form onSubmit={save} className="panel admin-form">
      <label className="field">
        Nome da área
        <input value={content.name} placeholder={area.name} maxLength={80} onChange={(event) => edit({ ...content, name: event.target.value })} />
      </label>
      <p className="admin-note">O nome aparece no quadro lateral. O que está escrito no desenho do mapa não muda.</p>

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

export function AdminMapPage() {
  const [slug, setSlug] = useState(MAP_AREAS[0].slug);
  const [pokemon, setPokemon] = useState([]);

  useEffect(() => {
    request('/api/admin/pokedex').then(setPokemon).catch(() => setPokemon([]));
  }, []);

  return (
    <div className="admin-page admin-page--narrow">
      <header className="page-header">
        <h1>Mapa</h1>
        <Link className="admin-links" to={`/mapa/${slug}`}>Ver no mapa</Link>
      </header>

      <label className="field admin-select">
        Área
        <select value={slug} onChange={(event) => setSlug(event.target.value)}>
          {MAP_AREAS.map((area) => <option key={area.slug} value={area.slug}>{area.name}</option>)}
        </select>
      </label>

      <datalist id="admin-pokemon">
        {pokemon.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
      </datalist>

      <AreaEditor key={slug} slug={slug} options={pokemon} />
    </div>
  );
}
