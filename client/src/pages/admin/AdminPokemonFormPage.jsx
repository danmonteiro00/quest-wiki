import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { slugify } from '../../../../shared/slug.js';
import { forgetCached, request } from '../../api.js';
import { ImageField } from '../../components/ImageField.jsx';
import { SearchSelect } from '../../components/SearchSelect.jsx';
import { capitalize, formatDex, TYPES } from '../../components/TypeBadge.jsx';
import { useApi } from '../../useApi.js';

const STATS = [
  ['hp', 'HP'],
  ['attack', 'Attack'],
  ['defense', 'Defense'],
  ['special-attack', 'Sp. Atk'],
  ['special-defense', 'Sp. Def'],
  ['speed', 'Speed'],
];
const MOVE_METHODS = [['level-up', 'Nível'], ['machine', "TM's"], ['egg', 'Egg Moves'], ['tutor', 'Tutor']];
const MOVE_CATEGORIES = ['physical', 'special', 'status'];

const blank = (value) => value ?? '';

const emptyForm = () => ({
  name: '',
  slug: '',
  dexNumber: '',
  formName: '',
  generation: '',
  type1: '',
  type2: '',
  stats: Object.fromEntries(STATS.map(([stat]) => [stat, ''])),
  isLegendary: false,
  isMythical: false,
  isBaby: false,
  genus: '',
  flavor: '',
  height: '',
  weight: '',
  baseExperience: '',
  captureRate: '',
  baseHappiness: '',
  hatchCounter: '',
  gender: '',
  growthRate: '',
  color: '',
  shape: '',
  habitat: '',
  eggGroups: '',
  heldItems: '',
  evYield: {},
  abilities: [],
  artUrl: '',
  moves: [],
  evolvesFrom: '',
  evolutionHow: '',
});

function toForm(detail) {
  return {
    ...emptyForm(),
    name: detail.name,
    slug: detail.slug,
    dexNumber: detail.dexNumber,
    formName: blank(detail.formName),
    generation: detail.generation,
    type1: detail.types[0],
    type2: blank(detail.types[1]),
    stats: detail.stats,
    isLegendary: detail.isLegendary,
    isMythical: detail.isMythical,
    isBaby: Boolean(detail.isBaby),
    genus: blank(detail.genus),
    flavor: blank(detail.flavorTexts?.[0]?.text),
    height: detail.height,
    weight: detail.weight,
    baseExperience: blank(detail.baseExperience),
    captureRate: blank(detail.captureRate),
    baseHappiness: blank(detail.baseHappiness),
    hatchCounter: blank(detail.hatchCounter),
    gender: blank(detail.gender),
    growthRate: blank(detail.growthRate),
    color: blank(detail.color),
    shape: blank(detail.shape),
    habitat: blank(detail.habitat),
    eggGroups: (detail.eggGroups ?? []).join(', '),
    heldItems: (detail.heldItems ?? []).join(', '),
    evYield: Object.fromEntries((detail.evYield ?? []).map((ev) => [ev.stat, ev.value])),
    abilities: detail.abilities ?? [],
    artUrl: blank(detail.art?.[0]),
    moves: detail.moves?.rows ?? [],
    evolvesFrom: blank(detail.evolvesFrom),
    evolutionHow: blank(detail.evolutionHow),
  };
}

const splitList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

function toPayload({ type1, type2, eggGroups, heldItems, ...form }) {
  return {
    ...form,
    types: [type1, type2].filter(Boolean),
    eggGroups: splitList(eggGroups),
    heldItems: splitList(heldItems),
  };
}

function Input({ label, value, onChange, ...props }) {
  return (
    <label className="field">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}

const toOptions = (items) => items.map((item) => ({ value: item.slug, label: item.name, item }));

function AbilitiesEditor({ abilities, onChange }) {
  const { data: catalog } = useApi('/api/admin/catalog/abilities');
  const options = useMemo(() => toOptions(catalog ?? []), [catalog]);
  const update = (index, patch) => onChange(abilities.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <>
      {abilities.map((ability, index) => (
        <fieldset className="admin-resource" key={index}>
          <label className="check admin-icon">
            <input type="checkbox" checked={Boolean(ability.isHidden)} onChange={(event) => update(index, { isHidden: event.target.checked })} />
            Oculta
          </label>
          <SearchSelect
            label="Habilidade"
            freeText
            required
            options={options}
            value={ability.name}
            placeholder="Digite para buscar ou criar"
            onChange={(name) => update(index, { name })}
            onPick={({ item }) => update(index, { name: item.name, effect: item.effect })}
          />
          <button type="button" className="button button--quiet" onClick={() => onChange(abilities.filter((_, i) => i !== index))}>Remover</button>
          <label className="field admin-wide">
            Efeito
            <textarea rows={2} value={ability.effect} onChange={(event) => update(index, { effect: event.target.value })} />
          </label>
        </fieldset>
      ))}
      <button type="button" className="button button--quiet" onClick={() => onChange([...abilities, { name: '', isHidden: false, effect: '' }])}>
        Adicionar habilidade
      </button>
    </>
  );
}

function MovesEditor({ moves, onChange }) {
  const { data: catalog } = useApi('/api/admin/catalog/moves');
  const options = useMemo(() => toOptions(catalog ?? []), [catalog]);
  const [open, setOpen] = useState(false);
  const update = (index, patch) => onChange(moves.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const add = () => {
    setOpen(true);
    onChange([...moves, { name: '', method: 'level-up', level: '', type: '', category: '', power: '', accuracy: '', pp: '' }]);
  };

  return (
    <div className="admin-block">
      <h2>Golpes ({moves.length})</h2>
      <div className="admin-row">
        {moves.length > 0 && (
          <button type="button" className="button button--quiet" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Esconder golpes' : 'Mostrar golpes'}
          </button>
        )}
        <button type="button" className="button button--quiet" onClick={add}>Adicionar golpe</button>
      </div>
      {open && moves.length > 0 && (
        <div className="table-scroll">
          <table className="admin-table admin-moves">
            <thead>
              <tr>
                <th>Golpe</th><th>Como</th><th>Nv.</th><th>Tipo</th><th>Categoria</th><th>Poder</th><th>Prec.</th><th>PP</th><th />
              </tr>
            </thead>
            <tbody>
              {moves.map((move, index) => (
                <tr key={index}>
                  <td>
                    <SearchSelect
                      ariaLabel="Nome do golpe"
                      freeText
                      required
                      options={options}
                      value={move.name}
                      onChange={(name) => update(index, { name })}
                      onPick={({ item }) => update(index, {
                        name: item.name,
                        type: item.type,
                        category: item.category,
                        power: item.power,
                        accuracy: item.accuracy,
                        pp: item.pp,
                      })}
                    />
                  </td>
                  <td>
                    <select aria-label="Como aprende" value={move.method} onChange={(event) => update(index, { method: event.target.value })}>
                      {MOVE_METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td><input aria-label="Nível" type="number" min="0" max="100" value={blank(move.level)} onChange={(event) => update(index, { level: event.target.value })} /></td>
                  <td>
                    <select aria-label="Tipo do golpe" value={blank(move.type)} onChange={(event) => update(index, { type: event.target.value })}>
                      <option value="">—</option>
                      {TYPES.map((type) => <option key={type} value={type}>{capitalize(type)}</option>)}
                    </select>
                  </td>
                  <td>
                    <select aria-label="Categoria" value={blank(move.category)} onChange={(event) => update(index, { category: event.target.value })}>
                      <option value="">—</option>
                      {MOVE_CATEGORIES.map((category) => <option key={category} value={category}>{capitalize(category)}</option>)}
                    </select>
                  </td>
                  <td><input aria-label="Poder" type="number" min="0" value={blank(move.power)} onChange={(event) => update(index, { power: event.target.value })} /></td>
                  <td><input aria-label="Precisão" type="number" min="0" max="100" value={blank(move.accuracy)} onChange={(event) => update(index, { accuracy: event.target.value })} /></td>
                  <td><input aria-label="PP" type="number" min="0" value={blank(move.pp)} onChange={(event) => update(index, { pp: event.target.value })} /></td>
                  <td>
                    <button type="button" className="button button--quiet" aria-label={`Remover ${move.name || 'golpe'}`} onClick={() => onChange(moves.filter((_, i) => i !== index))}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PokemonFields({ form, setForm, regional, editing, species }) {
  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const setStat = (stat) => (value) => setForm((current) => ({ ...current, stats: { ...current.stats, [stat]: value } }));
  const setEv = (stat) => (value) => setForm((current) => ({ ...current, evYield: { ...current.evYield, [stat]: value } }));
  const check = (field) => (event) => set(field)(event.target.checked);
  const evolveOptions = useMemo(() => species.filter((item) => item.value !== form.slug), [species, form.slug]);

  return (
    <>
      <div className="admin-grid">
        <Input label="Nome" value={form.name} required onChange={set('name')} />
        <Input label="Identificador" value={form.slug} readOnly={editing} placeholder={slugify(form.name)} onChange={set('slug')} />
        <Input label="Número da Pokédex" type="number" min="1" value={form.dexNumber} required readOnly={editing || regional} onChange={set('dexNumber')} />
        <Input label="Forma" value={form.formName} onChange={set('formName')} />
        <Input label="Geração" type="number" min="1" value={form.generation} required onChange={set('generation')} />
        <Input label="Espécie" value={form.genus} onChange={set('genus')} />
        <label className="field">
          Tipo 1
          <select value={form.type1} required onChange={(event) => set('type1')(event.target.value)}>
            <option value="">Escolha</option>
            {TYPES.map((type) => <option key={type} value={type}>{capitalize(type)}</option>)}
          </select>
        </label>
        <label className="field">
          Tipo 2
          <select value={form.type2} onChange={(event) => set('type2')(event.target.value)}>
            <option value="">Nenhum</option>
            {TYPES.map((type) => <option key={type} value={type}>{capitalize(type)}</option>)}
          </select>
        </label>
      </div>

      <div className="admin-row">
        <label className="check"><input type="checkbox" checked={form.isLegendary} onChange={check('isLegendary')} /> Legendary</label>
        <label className="check"><input type="checkbox" checked={form.isMythical} onChange={check('isMythical')} /> Mythical</label>
        <label className="check"><input type="checkbox" checked={form.isBaby} onChange={check('isBaby')} /> Baby</label>
      </div>

      <label className="field">
        Entrada da Pokédex
        <textarea rows={3} value={form.flavor} onChange={(event) => set('flavor')(event.target.value)} />
      </label>

      <div className="admin-block">
        <h2>Imagem</h2>
        <ImageField label="Imagem do Pokémon" value={form.artUrl} onChange={set('artUrl')} />
      </div>

      <div className="admin-block">
        <h2>Status base</h2>
        <div className="admin-grid">
          {STATS.map(([stat, label]) => (
            <Input key={stat} label={label} type="number" min="0" max="999" required value={form.stats[stat]} onChange={setStat(stat)} />
          ))}
        </div>
        <h2>EVs concedidos</h2>
        <div className="admin-grid">
          {STATS.map(([stat, label]) => (
            <Input key={stat} label={`EV ${label}`} type="number" min="0" max="3" value={blank(form.evYield[stat])} onChange={setEv(stat)} />
          ))}
        </div>
      </div>

      <div className="admin-block">
        <h2>Dados</h2>
        <div className="admin-grid">
          <Input label="Altura (m)" type="number" min="0" step="any" required value={form.height} onChange={set('height')} />
          <Input label="Peso (kg)" type="number" min="0" step="any" required value={form.weight} onChange={set('weight')} />
          <Input label="Cor" value={form.color} onChange={set('color')} />
          <Input label="Silhueta" value={form.shape} onChange={set('shape')} />
          <Input label="Habitat" value={form.habitat} onChange={set('habitat')} />
          <Input label="Taxa de captura" type="number" min="0" max="255" value={form.captureRate} onChange={set('captureRate')} />
          <Input label="Amizade base" type="number" min="0" max="255" value={form.baseHappiness} onChange={set('baseHappiness')} />
          <Input label="Experiência base" type="number" min="0" value={form.baseExperience} onChange={set('baseExperience')} />
          <Input label="Crescimento" value={form.growthRate} onChange={set('growthRate')} />
          <Input label="Gênero" value={form.gender} placeholder="50% male / 50% female" onChange={set('gender')} />
          <Input label="Ciclos de ovo" type="number" min="0" max="255" value={form.hatchCounter} onChange={set('hatchCounter')} />
          <Input label="Grupos de ovo (separe com vírgula)" value={form.eggGroups} onChange={set('eggGroups')} />
          <Input label="Itens (separe com vírgula)" value={form.heldItems} onChange={set('heldItems')} />
        </div>
      </div>

      <div className="admin-block">
        <h2>Habilidades</h2>
        <AbilitiesEditor abilities={form.abilities} onChange={set('abilities')} />
      </div>

      {regional ? (
        <p className="admin-note">A forma herda os métodos de evolução do Pokémon de origem.</p>
      ) : (
        <div className="admin-block">
          <h2>Evolução</h2>
          <div className="admin-grid">
            <SearchSelect
              label="Evolui de"
              options={evolveOptions}
              value={form.evolvesFrom}
              placeholder="Nenhum (primeiro estágio)"
              onChange={set('evolvesFrom')}
            />
            <Input label="Como evolui" value={form.evolutionHow} disabled={!form.evolvesFrom} placeholder="Level 16" onChange={set('evolutionHow')} />
          </div>
        </div>
      )}

      <MovesEditor moves={form.moves} onChange={set('moves')} />

      <p className="admin-note">A efetividade de tipos é calculada a partir dos tipos escolhidos.</p>
    </>
  );
}

function clearCaches(slug) {
  forgetCached('/api/pokemon');
  forgetCached('/api/admin/pokedex');
  forgetCached(`/api/pokemon/${encodeURIComponent(slug)}`);
}

export function AdminPokemonFormPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(slug);
  const [list, setList] = useState([]);
  const [kind, setKind] = useState('new');
  const [baseSlug, setBaseSlug] = useState('');
  const [form, setForm] = useState(editing ? null : emptyForm);
  const [regional, setRegional] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request('/api/admin/pokedex').then(setList).catch((failure) => setError(failure.message));
  }, []);

  useEffect(() => {
    if (!editing) return;
    request(`/api/admin/pokedex/${encodeURIComponent(slug)}`)
      .then((detail) => {
        setForm(toForm(detail));
        setRegional(!detail.isDefault);
      })
      .catch((failure) => setError(failure.message));
  }, [editing, slug]);

  const defaults = useMemo(() => list.filter((item) => item.isDefault), [list]);
  const species = useMemo(() => defaults.map((item) => ({ value: item.slug, label: `${formatDex(item.dexNumber)} ${item.name}` })), [defaults]);
  const nextDex = useMemo(() => defaults.reduce((max, item) => Math.max(max, item.dexNumber), 0) + 1, [defaults]);

  useEffect(() => {
    if (!editing && kind === 'new') setForm((current) => (current && !current.dexNumber && list.length ? { ...current, dexNumber: nextDex } : current));
  }, [editing, kind, nextDex, list.length]);

  const chooseKind = (value) => {
    setKind(value);
    setBaseSlug('');
    setError(null);
    setRegional(value === 'regional');
    setForm(value === 'new' ? { ...emptyForm(), dexNumber: nextDex } : null);
  };

  // Traz os dados do Pokemon de origem para o Admin mudar so o que for diferente na forma.
  const chooseBase = async (value) => {
    setBaseSlug(value);
    setError(null);
    setForm(null);
    if (!value) return;
    try {
      const detail = await request(`/api/admin/pokedex/${encodeURIComponent(value)}`);
      setForm({ ...toForm(detail), slug: '', evolvesFrom: '', evolutionHow: '' });
    } catch (failure) {
      setError(failure.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = toPayload(form);
      const saved = editing
        ? await request(`/api/admin/pokedex/${encodeURIComponent(slug)}`, { method: 'PUT', body })
        : await request('/api/admin/pokedex', { method: 'POST', body: { ...body, kind, baseSlug } });
      clearCaches(saved.slug);
      navigate('/admin/pokedex');
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <div className="admin-page admin-page--narrow">
      <Link to="/admin/pokedex" className="back-link">← Pokédex</Link>
      <header className="page-header">
        <h1>{editing ? `Editar ${form?.name ?? ''}` : 'Cadastrar Pokémon'}</h1>
      </header>

      <form className="panel admin-form" onSubmit={submit}>
        {!editing && (
          <div className="admin-grid">
            <label className="field">
              O que você vai cadastrar?
              <select value={kind} onChange={(event) => chooseKind(event.target.value)}>
                <option value="new">Novo Pokémon</option>
                <option value="regional">Forma Regional</option>
              </select>
            </label>
            {kind === 'regional' && (
              <SearchSelect
                label="Pokémon de origem"
                options={species}
                value={baseSlug}
                required
                placeholder="Digite o nome ou o número"
                onChange={chooseBase}
              />
            )}
          </div>
        )}

        {form && <PokemonFields key={`${kind}-${baseSlug}`} form={form} setForm={setForm} regional={regional} editing={editing} species={species} />}
        {editing && !form && !error && <p className="notice">Carregando…</p>}

        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {form && <button type="submit" className="button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>}
      </form>
    </div>
  );
}
