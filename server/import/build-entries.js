import { imagesFor } from './serebii.js';

const titleize = (slug) => slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
const idFromUrl = (url) => Number(url.match(/\/(\d+)\/?$/)[1]);
const english = (list) => list?.find((item) => item.language.name === 'en');
const cleanText = (text) => text.replace(/[\f\n\r­]+/g, ' ').replace(/\s+/g, ' ').trim();

const GENERATIONS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };

// Campos mantidos em memoria durante a importacao; o documento completo vai direto para o banco.
const KEEP = {
  pokemon: (d) => ({
    id: d.id, name: d.name, is_default: d.is_default, height: d.height, weight: d.weight,
    base_experience: d.base_experience, abilities: d.abilities, types: d.types, stats: d.stats,
    held_items: d.held_items.map((held) => held.item.name),
    species: d.species, forms: d.forms,
    moves: d.moves.map((m) => ({
      name: m.move.name,
      details: m.version_group_details.map((v) => ({
        group: v.version_group.name, method: v.move_learn_method.name, level: v.level_learned_at,
      })),
    })),
  }),
  'pokemon-species': (d) => ({
    id: d.id, name: d.name, names: d.names, genera: d.genera, varieties: d.varieties,
    flavor_text_entries: d.flavor_text_entries, capture_rate: d.capture_rate,
    base_happiness: d.base_happiness, hatch_counter: d.hatch_counter, gender_rate: d.gender_rate,
    growth_rate: d.growth_rate, egg_groups: d.egg_groups, color: d.color, shape: d.shape,
    habitat: d.habitat, generation: d.generation, is_baby: d.is_baby, is_legendary: d.is_legendary,
    is_mythical: d.is_mythical, pokedex_numbers: d.pokedex_numbers, evolution_chain: d.evolution_chain,
  }),
  'pokemon-form': (d) => ({ id: d.id, name: d.name, names: d.names, form_names: d.form_names }),
  move: (d) => ({
    name: d.name, names: d.names, type: d.type, damage_class: d.damage_class,
    power: d.power, accuracy: d.accuracy, pp: d.pp,
  }),
  ability: (d) => ({ name: d.name, names: d.names, effect_entries: d.effect_entries, flavor_text_entries: d.flavor_text_entries }),
  'evolution-chain': (d) => d,
  type: (d) => ({ id: d.id, name: d.name, damage_relations: d.damage_relations }),
  'version-group': (d) => ({ name: d.name, order: d.order }),
  'pokemon-encounters': (d) => d,
};

export function createCollector() {
  const store = Object.fromEntries(Object.keys(KEEP).map((endpoint) => [endpoint, new Map()]));
  return {
    add(endpoint, id, doc) {
      if (KEEP[endpoint]) store[endpoint].set(id, KEEP[endpoint](doc));
    },
    store,
  };
}

const byName = (map) => new Map([...map.values()].map((item) => [item.name, item]));

function genderLabel(rate) {
  if (rate === -1) return 'Genderless';
  const female = (rate / 8) * 100;
  return `${100 - female}% male / ${female}% female`;
}

export function typeMatchups(types, attackers) {
  const result = {};
  for (const attacker of attackers) {
    let multiplier = 1;
    const relations = attacker.damage_relations;
    for (const type of types) {
      if (relations.double_damage_to.some((t) => t.name === type)) multiplier *= 2;
      if (relations.half_damage_to.some((t) => t.name === type)) multiplier *= 0.5;
      if (relations.no_damage_to.some((t) => t.name === type)) multiplier = 0;
    }
    result[attacker.name] = multiplier;
  }
  return result;
}

const EVOLUTION_HIDDEN = new Set([
  'trigger', 'location', 'version_group', 'is_default',
  'required_pokemon_form', 'evolved_pokemon_form', 'condition_expression',
]);

function describeEvolution(detail) {
  const parts = [titleize(detail.trigger?.name ?? 'evolve')];
  for (const [key, value] of Object.entries(detail)) {
    if (EVOLUTION_HIDDEN.has(key) || value === null || value === false || value === '') continue;
    const label = key.replaceAll('_', ' ');
    if (value === true) parts.push(label);
    else if (typeof value === 'object') parts.push(`${label}: ${titleize(value.name ?? String(value))}`);
    else parts.push(`${label}: ${typeof value === 'string' ? titleize(value) : value}`);
  }
  return parts.join(' · ');
}

// A PokeAPI repete a mesma regra por jogo, mudando so o local; aqui vira uma linha por regra.
function describeEvolutions(details) {
  const rules = new Map();
  for (const detail of details) {
    const rule = describeEvolution(detail);
    if (!rules.has(rule)) rules.set(rule, new Set());
    if (detail.location) rules.get(rule).add(titleize(detail.location.name));
  }
  return [...rules].map(([rule, locations]) => (
    locations.size ? `${rule} · location: ${[...locations].join(', ')}` : rule
  ));
}

function pickMoves(pokemon, moves, groups) {
  const order = (group) => groups.get(group)?.order ?? 0;
  let newest = null;
  for (const move of pokemon.moves) {
    for (const detail of move.details) {
      if (detail.method === 'level-up' && (!newest || order(detail.group) > order(newest))) newest = detail.group;
    }
  }
  if (!newest) return null;

  const rows = [];
  for (const move of pokemon.moves) {
    const info = moves.get(move.name);
    for (const detail of move.details) {
      if (detail.group !== newest) continue;
      rows.push({
        slug: move.name,
        name: english(info?.names)?.name ?? titleize(move.name),
        method: detail.method,
        level: detail.level,
        type: info?.type?.name ?? null,
        category: info?.damage_class?.name ?? null,
        power: info?.power ?? null,
        accuracy: info?.accuracy ?? null,
        pp: info?.pp ?? null,
      });
    }
  }
  rows.sort((a, b) => a.method.localeCompare(b.method) || a.level - b.level || a.name.localeCompare(b.name));
  return { versionGroup: newest, rows };
}

function encounterSummary(encounters) {
  return (encounters ?? []).map((encounter) => ({
    area: titleize(encounter.location_area.name),
    versions: encounter.version_details.map((v) => v.version.name),
  }));
}

export function buildEntries({ store }) {
  const speciesMap = store['pokemon-species'];
  const moves = byName(store.move);
  const abilities = byName(store.ability);
  const groups = byName(store['version-group']);
  const forms = store['pokemon-form'];
  const pokemonByName = byName(store.pokemon);
  const attackers = [...store.type.values()].filter((t) => t.id <= 18);

  const imagesOf = (pokemon, species) => imagesFor({
    slug: pokemon.name,
    speciesSlug: species.name,
    dexNumber: species.id,
    isDefault: pokemon.is_default,
  });

  const displayName = (pokemon, species) => {
    const speciesName = english(species.names)?.name ?? titleize(species.name);
    if (pokemon.is_default) return speciesName;
    const form = forms.get(idFromUrl(pokemon.forms[0].url));
    return english(form?.names)?.name ?? titleize(pokemon.name);
  };

  const defaultOf = (species) => pokemonByName.get(species.varieties.find((v) => v.is_default).pokemon.name);

  const evolutionNode = (link) => {
    const species = speciesMap.get(idFromUrl(link.species.url));
    const pokemon = defaultOf(species);
    return {
      slug: pokemon.name,
      name: displayName(pokemon, species),
      dexNumber: species.id,
      sprite: imagesOf(pokemon, species).sprite,
      how: describeEvolutions(link.evolution_details),
      evolvesTo: link.evolves_to.map(evolutionNode),
    };
  };

  const entries = [];
  for (const pokemon of store.pokemon.values()) {
    const species = speciesMap.get(idFromUrl(pokemon.species.url));
    const types = pokemon.types.map((t) => t.type.name);
    const stats = Object.fromEntries(pokemon.stats.map((s) => [s.stat.name, s.base_stat]));
    const images = imagesOf(pokemon, species);
    const form = forms.get(idFromUrl(pokemon.forms[0].url));

    const summary = {
      id: pokemon.id,
      slug: pokemon.name,
      name: displayName(pokemon, species),
      dexNumber: species.id,
      isDefault: pokemon.is_default,
      types,
      stats,
      statTotal: Object.values(stats).reduce((sum, value) => sum + value, 0),
      generation: GENERATIONS[species.generation.name.split('-')[1]],
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      sprite: images.sprite,
    };

    const flavorTexts = new Map();
    for (const entry of species.flavor_text_entries) {
      if (entry.language.name !== 'en') continue;
      const text = cleanText(entry.flavor_text);
      if (!flavorTexts.has(text)) flavorTexts.set(text, []);
      flavorTexts.get(text).push(entry.version.name);
    }

    const ownMoves = pickMoves(pokemon, moves, groups);
    const defaultPokemon = defaultOf(species);

    const detail = {
      ...summary,
      speciesSlug: species.name,
      art: images.art,
      formName: english(form?.form_names)?.name ?? null,
      genus: english(species.genera)?.genus ?? null,
      height: pokemon.height / 10,
      weight: pokemon.weight / 10,
      baseExperience: pokemon.base_experience,
      captureRate: species.capture_rate,
      baseHappiness: species.base_happiness,
      hatchCounter: species.hatch_counter,
      gender: genderLabel(species.gender_rate),
      growthRate: titleize(species.growth_rate.name),
      eggGroups: species.egg_groups.map((group) => titleize(group.name)),
      color: titleize(species.color.name),
      shape: species.shape ? titleize(species.shape.name) : null,
      habitat: species.habitat ? titleize(species.habitat.name) : null,
      isBaby: species.is_baby,
      evYield: pokemon.stats.filter((s) => s.effort > 0).map((s) => ({ stat: s.stat.name, value: s.effort })),
      heldItems: pokemon.held_items.map(titleize),
      abilities: pokemon.abilities.map((entry) => {
        const ability = abilities.get(entry.ability.name);
        return {
          slug: entry.ability.name,
          name: english(ability?.names)?.name ?? titleize(entry.ability.name),
          isHidden: entry.is_hidden,
          effect: cleanText(english(ability?.effect_entries)?.short_effect
            ?? english(ability?.flavor_text_entries)?.flavor_text
            ?? ''),
        };
      }),
      matchups: typeMatchups(types, attackers),
      flavorTexts: [...flavorTexts].map(([text, versions]) => ({ text, versions })),
      pokedexNumbers: species.pokedex_numbers.map((n) => ({ pokedex: titleize(n.pokedex.name), number: n.entry_number })),
      evolution: species.evolution_chain
        ? evolutionNode(store['evolution-chain'].get(idFromUrl(species.evolution_chain.url)).chain)
        : null,
      varieties: species.varieties.map((variety) => {
        const other = pokemonByName.get(variety.pokemon.name);
        return {
          slug: other.name,
          name: displayName(other, species),
          isDefault: variety.is_default,
          sprite: imagesOf(other, species).sprite,
        };
      }),
      cosmeticForms: pokemon.forms.length > 1
        ? pokemon.forms.map((f) => {
          const cosmetic = forms.get(idFromUrl(f.url));
          return english(cosmetic?.names)?.name ?? titleize(f.name);
        })
        : [],
      moves: ownMoves ?? pickMoves(defaultPokemon, moves, groups),
      movesInherited: !ownMoves && defaultPokemon !== pokemon,
      encounters: encounterSummary(store['pokemon-encounters'].get(pokemon.id)),
    };

    entries.push({ id: pokemon.id, slug: pokemon.name, dexNumber: species.id, summary, detail });
  }
  return entries;
}
