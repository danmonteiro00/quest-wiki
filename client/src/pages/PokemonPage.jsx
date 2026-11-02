import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PokeImage } from '../components/PokeImage.jsx';
import { capitalize, formatDex, TypeBadge } from '../components/TypeBadge.jsx';
import { buildPokemonSheet, copyText } from '../pokemonSheet.js';
import { useApi } from '../useApi.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const STAT_MAX = 255;

const METHOD_LABELS = {
  'level-up': 'Nível',
  machine: "TM's",
  egg: 'Egg Moves',
  tutor: 'Tutor',
};

const siblingLink = (slug) => `../${slug}`;

function Section({ title, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Facts({ rows }) {
  return (
    <dl className="facts">
      {rows.filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Stats({ stats, total }) {
  return (
    <>
      <table className="stats">
        <tbody>
          {Object.entries(stats).map(([key, value]) => (
            <tr key={key}>
              <th scope="row">{STAT_LABELS[key] ?? key}</th>
              <td className="stat-value">{value}</td>
              <td className="stat-bar-cell">
                <span className="stat-bar"><span style={{ width: `${Math.min(100, (value / STAT_MAX) * 100)}%` }} /></span>
              </td>
            </tr>
          ))}
          <tr className="stats-total">
            <th scope="row">Total</th>
            <td className="stat-value">{total}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </>
  );
}

function Matchups({ matchups }) {
  const groups = [
    ['Fraquezas', ([, value]) => value > 1],
    ['Resistências', ([, value]) => value > 0 && value < 1],
    ['Imunidades', ([, value]) => value === 0],
  ];
  return (
    <div className="matchups">
      {groups.map(([label, test]) => {
        const items = Object.entries(matchups).filter(test).sort((a, b) => b[1] - a[1]);
        if (!items.length) return null;
        return (
          <div key={label}>
            <h3>{label}</h3>
            <ul className="matchup-list">
              {items.map(([type, value]) => (
                <li key={type}>
                  <TypeBadge type={type} />
                  <span className="multiplier">×{value}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EvolutionNode({ node, current }) {
  return (
    <div className="evo-branch">
      <Link to={siblingLink(node.slug)} className={`evo-pokemon${node.slug === current ? ' is-current' : ''}`} aria-current={node.slug === current ? 'page' : undefined}>
        <PokeImage sources={node.sprite} alt="" width={72} height={72} />
        <span>{node.name}</span>
        <small>{formatDex(node.dexNumber)}</small>
      </Link>
      {node.evolvesTo.length > 0 && (
        <div className="evo-next">
          {node.evolvesTo.map((next) => (
            <div key={next.slug} className="evo-step">
              <p className="evo-how">{next.how.join(' / ') || 'Evolui'}</p>
              <EvolutionNode node={next} current={current} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Moves({ moves, inherited }) {
  const methods = useMemo(() => {
    const rank = (name) => {
      const index = Object.keys(METHOD_LABELS).indexOf(name);
      return index === -1 ? Infinity : index;
    };
    return [...new Set(moves.rows.map((row) => row.method))].sort((a, b) => rank(a) - rank(b));
  }, [moves]);
  const [selected, setSelected] = useState(methods[0]);
  const method = methods.includes(selected) ? selected : methods[0];
  const rows = moves.rows.filter((row) => row.method === method);

  return (
    <>
      <p className="panel-note">
        Dados de <strong>{moves.versionGroup}</strong>{inherited ? ', herdados da forma base' : ''}.
      </p>
      <div className="tabs" role="group" aria-label="Forma de aprendizado">
        {methods.map((name) => (
          <button key={name} type="button" className={name === method ? 'is-active' : ''} aria-pressed={name === method} onClick={() => setSelected(name)}>
            {METHOD_LABELS[name] ?? capitalize(name.replaceAll('-', ' '))}
          </button>
        ))}
      </div>
      <div className="table-scroll">
        <table className="moves">
          <thead>
            <tr>
              {method === 'level-up' && <th className="num">Nv.</th>}
              <th>Golpe</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th className="num">Poder</th>
              <th className="num">Prec.</th>
              <th className="num">PP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.slug}-${row.level}`}>
                {method === 'level-up' && <td className="num">{row.level}</td>}
                <td>{row.name}</td>
                <td>{row.type && <TypeBadge type={row.type} />}</td>
                <td>{row.category ? capitalize(row.category) : '—'}</td>
                <td className="num">{row.power ?? '—'}</td>
                <td className="num">{row.accuracy ?? '—'}</td>
                <td className="num">{row.pp ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CopySheetButton({ pokemon, artUrl }) {
  const [status, setStatus] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    const copied = await copyText(buildPokemonSheet(pokemon, artUrl));
    setStatus(copied ? 'Ficha copiada!' : 'Não foi possível copiar');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div className="copy-sheet">
      <span className="copy-sheet-status" role="status">{status}</span>
      <button type="button" onClick={copy} aria-label="Copiar ficha" title="Copiar ficha">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
      </button>
    </div>
  );
}

export function PokemonPage() {
  const { slug } = useParams();
  const { data: pokemon, error } = useApi(`/api/pokemon/${encodeURIComponent(slug)}`);
  // A ficha copiada usa a mesma imagem que carregou na tela, que pode ser a reserva.
  const [loadedArt, setLoadedArt] = useState(null);

  if (error) {
    return (
      <>
        <Link to=".." relative="path" className="back-link">← Pokédex</Link>
        <p className="notice notice--error">{error.status === 404 ? 'Pokémon não encontrado.' : 'Não foi possível carregar este Pokémon.'}</p>
      </>
    );
  }
  if (!pokemon) return <p className="notice">Carregando…</p>;

  const flags = [
    pokemon.isLegendary && 'Legendary',
    pokemon.isMythical && 'Mythical',
    pokemon.isBaby && 'Baby',
  ].filter(Boolean);

  return (
    <article key={pokemon.slug} className="pokemon">
      <Link to=".." relative="path" className="back-link">← Pokédex</Link>

      <header className={`hero type-tint-${pokemon.types[0]}`}>
        <CopySheetButton pokemon={pokemon} artUrl={loadedArt?.slug === pokemon.slug ? loadedArt.url : pokemon.art[0]} />
        <div className="hero-text">
          <p className="hero-number">{formatDex(pokemon.dexNumber)}</p>
          <h1>{pokemon.name}</h1>
          {pokemon.genus && <p className="hero-genus">{pokemon.genus}</p>}
          <div className="type-row type-row--large">
            {pokemon.types.map((type) => <TypeBadge key={type} type={type} />)}
          </div>
          {flags.length > 0 && <p className="hero-flags">{flags.join(' · ')}</p>}
          {pokemon.flavorTexts[0] && <p className="hero-flavor">{pokemon.flavorTexts[0].text}</p>}
        </div>
        <PokeImage sources={pokemon.art} alt={`Arte de ${pokemon.name}`} className="hero-art" width={320} height={320} eager onLoadSource={(url) => setLoadedArt({ slug: pokemon.slug, url })} />
      </header>

      <div className="panel-grid">
        <Section title="Status base">
          <Stats stats={pokemon.stats} total={pokemon.statTotal} />
        </Section>

        <Section title="Dados">
          <Facts rows={[
            ['Altura', `${pokemon.height} m`],
            ['Peso', `${pokemon.weight} kg`],
            ['Geração', `${pokemon.generation}ª`],
            ['Forma', pokemon.formName],
            ['Cor', pokemon.color],
            ['Silhueta', pokemon.shape],
            ['Habitat', pokemon.habitat],
            ['Taxa de captura', pokemon.captureRate],
            ['Amizade base', pokemon.baseHappiness],
            ['Experiência base', pokemon.baseExperience],
            ['Crescimento', pokemon.growthRate],
            ['Gênero', pokemon.gender],
            ['Grupos de ovo', pokemon.eggGroups.join(', ')],
            ['Ciclos de ovo', pokemon.hatchCounter],
            ['EVs', pokemon.evYield.map((ev) => `${ev.value} ${STAT_LABELS[ev.stat] ?? ev.stat}`).join(', ')],
            ['Itens', pokemon.heldItems.join(', ')],
          ]} />
        </Section>

        <Section title="Habilidades">
          <ul className="abilities">
            {pokemon.abilities.map((ability) => (
              <li key={ability.slug}>
                <strong>{ability.name}</strong>
                {ability.isHidden && <span className="tag">Oculta</span>}
                <p>{ability.effect}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Efetividade de tipos">
          <Matchups matchups={pokemon.matchups} />
        </Section>
      </div>

      {pokemon.evolution && (
        <Section title="Evolução" className="panel--wide">
          <div className="evolution">
            <EvolutionNode node={pokemon.evolution} current={pokemon.slug} />
          </div>
        </Section>
      )}

      {pokemon.varieties.length > 1 && (
        <Section title="Formas" className="panel--wide">
          <ul className="varieties">
            {pokemon.varieties.map((variety) => (
              <li key={variety.slug}>
                <Link to={siblingLink(variety.slug)} className={variety.slug === pokemon.slug ? 'is-current' : ''} aria-current={variety.slug === pokemon.slug ? 'page' : undefined}>
                  <PokeImage sources={variety.sprite} alt="" width={64} height={64} />
                  <span>{variety.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {pokemon.cosmeticForms.length > 0 && (
        <Section title="Variações visuais" className="panel--wide">
          <p className="prose">{pokemon.cosmeticForms.join(', ')}</p>
        </Section>
      )}

      {pokemon.moves?.rows.length > 0 && (
        <Section title="Golpes" className="panel--wide">
          <Moves key={pokemon.slug} moves={pokemon.moves} inherited={pokemon.movesInherited} />
        </Section>
      )}

      <div className="panel-grid">
        {pokemon.flavorTexts.length > 0 && (
          <Section title="Entradas da Pokédex">
            <ul className="flavor-list">
              {pokemon.flavorTexts.map((entry) => (
                <li key={entry.text}>
                  <p>{entry.text}</p>
                  <small>{entry.versions.join(', ')}</small>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="panel-stack">
          {pokemon.pokedexNumbers.length > 0 && (
            <Section title="Números regionais">
              <ul className="regional">
                {pokemon.pokedexNumbers.map((entry) => (
                  <li key={entry.pokedex}><span>{entry.pokedex}</span><strong>{entry.number}</strong></li>
                ))}
              </ul>
            </Section>
          )}

          {pokemon.encounters.length > 0 && (
            <Section title="Onde encontrar">
              <ul className="encounters">
                {pokemon.encounters.map((encounter) => (
                  <li key={encounter.area}>
                    <span>{encounter.area}</span>
                    <small>{encounter.versions.join(', ')}</small>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </article>
  );
}
