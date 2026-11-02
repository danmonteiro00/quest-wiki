import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../useApi.js';
import { PokeImage } from './PokeImage.jsx';

const KIND_LABELS = { city: 'Cidade', route: 'Rota' };

function AreaImage({ section, areaName }) {
  const [failedUrl, setFailedUrl] = useState(null);

  if (!section.image || failedUrl === section.image) {
    return <div className="area-image area-image--empty">Imagem ainda não cadastrada</div>;
  }
  return <img className="area-image" src={section.image} alt={`${areaName}: ${section.name}`} onError={() => setFailedUrl(section.image)} />;
}

function PokemonSlots({ section }) {
  const total = Math.max(section.slots, section.pokemon.length);
  const unknown = Array.from({ length: total - section.pokemon.length }, (_, index) => index);

  return (
    <section className="area-block">
      <h3>
        Pokémon <span className="area-count">{section.pokemon.length} de {total}</span>
      </h3>
      <ul className="poke-slots">
        {section.pokemon.map((pokemon) => (
          <li key={pokemon.slug}>
            <Link className="poke-slot" to={`/pokedex/${pokemon.slug}`} title={pokemon.name}>
              <PokeImage sources={pokemon.sprite} alt={pokemon.name} width={52} height={52} />
            </Link>
          </li>
        ))}
        {unknown.map((index) => (
          <li key={index}>
            <span className="poke-slot poke-slot--unknown" role="img" aria-label="Pokémon não descoberto">?</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResourceIcon({ icon }) {
  if (/^(https?:\/\/|\/api\/images\/)/.test(icon)) return <img className="resource-icon" src={icon} alt="" width={28} height={28} />;
  return <span className="resource-icon" aria-hidden="true">{icon || '•'}</span>;
}

function ResourceList({ resources }) {
  return (
    <section className="area-block">
      <h3>Recursos e objetos</h3>
      {resources.length === 0 && <p className="area-empty">Nenhum recurso cadastrado.</p>}
      <ul className="resources">
        {resources.map((resource, index) => (
          <li key={`${resource.name}-${index}`}>
            <details>
              <summary>
                <ResourceIcon icon={resource.icon} />
                <span>{resource.name}</span>
              </summary>
              <p>{resource.description || 'Sem descrição cadastrada.'}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AreaPanel({ area, onClose }) {
  const { data, error } = useApi(`/api/map/${area.slug}`);
  const [tab, setTab] = useState(0);
  const sections = data?.sections ?? [];
  const section = sections[tab] ?? sections[0];

  return (
    <aside className="area-panel" aria-label={area.name}>
      <header className="area-header">
        <div>
          <p className="area-kind">{KIND_LABELS[area.kind]}</p>
          <h2>{data?.name ?? area.name}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar quadro">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {error && <p className="notice notice--error">Não foi possível carregar esta área.</p>}
      {!data && !error && <p className="area-empty">Carregando…</p>}

      {section && (
        <>
          {sections.length > 1 && (
            <div className="tabs" role="tablist" aria-label="Sub-áreas">
              {sections.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={index === tab}
                  className={index === tab ? 'is-active' : ''}
                  onClick={() => setTab(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}

          <AreaImage section={section} areaName={area.name} />
          <p className={section.description ? 'area-description' : 'area-description area-empty'}>
            {section.description || 'Descrição ainda não cadastrada.'}
          </p>
          <PokemonSlots section={section} />
          <ResourceList key={tab} resources={section.resources} />
        </>
      )}
    </aside>
  );
}
