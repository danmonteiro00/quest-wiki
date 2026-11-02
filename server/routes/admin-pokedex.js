import { Router } from 'express';
import { slugify } from '../../shared/slug.js';
import { getDb } from '../db.js';
import { typeMatchups } from '../import/build-entries.js';
import { deleteEntry, writeEntry } from '../pokedex-store.js';
import { array, fail, imageUrl, number, text } from '../validate.js';

export const adminPokedexRouter = Router();

const TYPES = new Set([
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]);
const STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const MOVE_METHODS = new Set(['level-up', 'machine', 'egg', 'tutor']);
const MOVE_CATEGORIES = new Set(['physical', 'special', 'status']);
const RESERVED_SLUGS = new Set(['novo']);
// Acima de qualquer id da PokeAPI, para uma nova importacao nunca colidir com o que o Admin criou.
const FIRST_CUSTOM_ID = 1000000;
const CUSTOM_MOVE_SOURCE = 'Quest Wiki';

const clone = (value) => JSON.parse(JSON.stringify(value));
const textList = (value, label) => array(value).map((item) => text(item, label, 80)).filter(Boolean);
const orNull = (value) => value || null;

// Evolucao: cada ficha guarda a cadeia vista pela propria forma, entao as mudancas sao aplicadas ficha a ficha.

function findNode(node, slug) {
  if (!node) return null;
  if (node.slug === slug) return node;
  for (const next of node.evolvesTo) {
    const found = findNode(next, slug);
    if (found) return found;
  }
  return null;
}

function findParent(node, slug) {
  if (!node) return null;
  for (const next of node.evolvesTo) {
    if (next.slug === slug) return node;
    const found = findParent(next, slug);
    if (found) return found;
  }
  return null;
}

const dexNumbersIn = (node) => (node ? [node.dexNumber, ...node.evolvesTo.flatMap(dexNumbersIn)] : []);
const chainOrNull = (tree) => (tree?.evolvesTo.length ? tree : null);

const nodeFrom = (detail) => ({
  slug: detail.slug,
  name: detail.name,
  dexNumber: detail.dexNumber,
  sprite: detail.sprite,
  how: [],
  evolvesTo: [],
});

async function readDetail(db, slug) {
  const { rows } = await db.query('SELECT detail FROM pokedex_entry WHERE slug = $1', [slug]);
  return rows[0]?.detail ?? null;
}

function withoutNode(tree, slug) {
  if (!tree || tree.slug === slug) return null;
  return { ...tree, evolvesTo: tree.evolvesTo.filter((next) => next.slug !== slug).map((next) => withoutNode(next, slug)) };
}

function withNodeFields(tree, slug, fields) {
  const node = tree.slug === slug ? { ...tree, ...fields } : tree;
  return { ...node, evolvesTo: node.evolvesTo.map((next) => withNodeFields(next, slug, fields)) };
}

function withChild(tree, parentSlug, child) {
  const evolvesTo = tree.evolvesTo.map((next) => withChild(next, parentSlug, child));
  return { ...tree, evolvesTo: tree.slug === parentSlug ? [...evolvesTo, child] : evolvesTo };
}

async function chainRows(tx, dexNumbers) {
  const { rows } = await tx.query('SELECT detail FROM pokedex_entry WHERE dex_number = ANY($1::int[])', [[...new Set(dexNumbers)]]);
  return rows.map((row) => row.detail);
}

async function saveChain(tx, detail, evolution) {
  if (JSON.stringify(detail.evolution) !== JSON.stringify(evolution)) await writeEntry(tx, { ...detail, evolution });
}

async function patchChains(tx, dexNumbers, change) {
  for (const detail of await chainRows(tx, dexNumbers)) {
    if (detail.evolution) await saveChain(tx, detail, chainOrNull(change(detail.evolution)));
  }
}

async function setChain(tx, dexNumbers, tree) {
  for (const detail of await chainRows(tx, dexNumbers)) await saveChain(tx, detail, chainOrNull(tree));
}

async function updateEvolution(tx, detail, evolvesFrom, how) {
  const previous = detail.evolution ? clone(detail.evolution) : null;
  const previousParent = findParent(previous, detail.slug);
  const node = findNode(previous, detail.slug) ?? nodeFrom(detail);
  const fields = { name: detail.name, dexNumber: detail.dexNumber, sprite: detail.sprite, how: evolvesFrom && how ? [how] : [] };
  Object.assign(node, fields);

  if ((previousParent?.slug ?? '') === evolvesFrom) {
    if (previous) await patchChains(tx, dexNumbersIn(previous), (tree) => withNodeFields(tree, detail.slug, fields));
    return;
  }

  if (evolvesFrom) {
    if (findNode(node, evolvesFrom)) fail('Evolui de: um Pokémon não pode evoluir de uma das próprias evoluções');
    const parent = await readDetail(tx, evolvesFrom);
    if (!parent || !parent.isDefault) fail('Evolui de: escolha um Pokémon da Pokédex');
  }

  const moved = dexNumbersIn(node);
  const others = (dexNumbers) => dexNumbers.filter((dexNumber) => !moved.includes(dexNumber));

  if (previous) await patchChains(tx, others(dexNumbersIn(previous)), (tree) => withoutNode(tree, detail.slug));

  if (!evolvesFrom) {
    await setChain(tx, moved, node);
    return;
  }

  // Le depois de atualizar a cadeia antiga, que pode ser a mesma do novo pre-evolucao.
  const parent = await readDetail(tx, evolvesFrom);
  const tree = parent.evolution ? clone(parent.evolution) : nodeFrom(parent);
  findNode(tree, evolvesFrom).evolvesTo.push(node);
  await patchChains(tx, others(dexNumbersIn(tree)), (current) => withChild(current, evolvesFrom, node));
  await saveChain(tx, await readDetail(tx, evolvesFrom), tree);
  await setChain(tx, moved, tree);
}

// A lista de formas fica copiada na ficha de cada forma da mesma especie.
async function syncVarieties(tx, dexNumber) {
  const { rows } = await tx.query('SELECT detail FROM pokedex_entry WHERE dex_number = $1 ORDER BY id', [dexNumber]);
  const varieties = rows.map(({ detail }) => ({ slug: detail.slug, name: detail.name, isDefault: detail.isDefault, sprite: detail.sprite }));
  for (const { detail } of rows) {
    if (JSON.stringify(detail.varieties) === JSON.stringify(varieties)) continue;
    await writeEntry(tx, { ...detail, varieties });
  }
}

function parseMoves(raw) {
  return array(raw).map((row) => {
    const name = text(row?.name, 'Nome do golpe', 80);
    if (!name) fail('Todo golpe precisa de um nome');
    if (!MOVE_METHODS.has(row?.method)) fail(`${name}: escolha como o golpe é aprendido`);
    if (row?.type && !TYPES.has(row.type)) fail(`${name}: tipo inválido`);
    if (row?.category && !MOVE_CATEGORIES.has(row.category)) fail(`${name}: categoria inválida`);
    return {
      slug: slugify(name),
      name,
      method: row.method,
      level: number(row?.level, `${name}: nível`, { max: 100, required: false }) ?? 0,
      type: orNull(row?.type),
      category: orNull(row?.category),
      power: number(row?.power, `${name}: poder`, { max: 999, required: false }),
      accuracy: number(row?.accuracy, `${name}: precisão`, { max: 100, required: false }),
      pp: number(row?.pp, `${name}: PP`, { max: 99, required: false }),
    };
  });
}

function parseFields(raw) {
  const name = text(raw?.name, 'Nome', 80);
  if (!name) fail('Nome: campo obrigatório');

  const types = [...new Set(array(raw?.types).filter(Boolean))];
  if (!types.length || types.length > 2 || !types.every((type) => TYPES.has(type))) fail('Tipos: escolha um ou dois tipos');

  const stats = Object.fromEntries(STATS.map((stat) => [stat, number(raw?.stats?.[stat], `Status ${stat}`, { max: 999 })]));

  return {
    name,
    types,
    stats,
    statTotal: Object.values(stats).reduce((sum, value) => sum + value, 0),
    generation: number(raw?.generation, 'Geração', { min: 1, max: 99 }),
    isLegendary: Boolean(raw?.isLegendary),
    isMythical: Boolean(raw?.isMythical),
    isBaby: Boolean(raw?.isBaby),
    formName: orNull(text(raw?.formName, 'Forma', 80)),
    genus: orNull(text(raw?.genus, 'Espécie', 80)),
    height: number(raw?.height, 'Altura', { max: 1000, integer: false }),
    weight: number(raw?.weight, 'Peso', { max: 100000, integer: false }),
    baseExperience: number(raw?.baseExperience, 'Experiência base', { max: 9999, required: false }),
    captureRate: number(raw?.captureRate, 'Taxa de captura', { max: 255, required: false }),
    baseHappiness: number(raw?.baseHappiness, 'Amizade base', { max: 255, required: false }),
    hatchCounter: number(raw?.hatchCounter, 'Ciclos de ovo', { max: 255, required: false }),
    gender: orNull(text(raw?.gender, 'Gênero', 80)),
    growthRate: orNull(text(raw?.growthRate, 'Crescimento', 80)),
    color: orNull(text(raw?.color, 'Cor', 80)),
    shape: orNull(text(raw?.shape, 'Silhueta', 80)),
    habitat: orNull(text(raw?.habitat, 'Habitat', 80)),
    eggGroups: textList(raw?.eggGroups, 'Grupos de ovo'),
    heldItems: textList(raw?.heldItems, 'Itens'),
    evYield: STATS
      .map((stat) => ({ stat, value: number(raw?.evYield?.[stat], `EV ${stat}`, { max: 3, required: false }) ?? 0 }))
      .filter((ev) => ev.value > 0),
    abilities: array(raw?.abilities).map((ability) => {
      const abilityName = text(ability?.name, 'Nome da habilidade', 80);
      if (!abilityName) fail('Toda habilidade precisa de um nome');
      return {
        slug: slugify(abilityName),
        name: abilityName,
        isHidden: Boolean(ability?.isHidden),
        effect: text(ability?.effect, `Efeito de ${abilityName}`, 2000),
      };
    }),
    flavor: text(raw?.flavor, 'Entrada da Pokédex', 2000),
    spriteUrl: imageUrl(raw?.spriteUrl, 'Sprite'),
    artUrl: imageUrl(raw?.artUrl, 'Arte'),
    moveRows: parseMoves(raw?.moves),
    evolvesFrom: text(raw?.evolvesFrom, 'Evolui de', 80),
    evolutionHow: text(raw?.evolutionHow, 'Como evolui', 200),
  };
}

// Imagem nova na frente; as anteriores ficam como reserva se ela nao carregar.
const imageList = (url, previous) => (url ? [url, ...previous.filter((item) => item !== url)] : []);

async function loadMatchups(db, types) {
  const { rows } = await db.query("SELECT data FROM pokeapi_resource WHERE endpoint = 'type' AND id <= 18");
  return typeMatchups(types, rows.map((row) => row.data));
}

function mergeFields(base, fields, matchups) {
  const { flavor, spriteUrl, artUrl, moveRows, evolvesFrom, evolutionHow, ...plain } = fields;
  const [, ...otherFlavors] = base.flavorTexts ?? [];
  const sameMoves = JSON.stringify(moveRows) === JSON.stringify(base.moves?.rows ?? []);
  return {
    ...base,
    ...plain,
    matchups,
    sprite: imageList(spriteUrl, base.sprite ?? []),
    art: imageList(artUrl, base.art ?? []),
    flavorTexts: flavor ? [{ text: flavor, versions: base.flavorTexts?.[0]?.text === flavor ? base.flavorTexts[0].versions : [] }, ...otherFlavors] : otherFlavors,
    moves: moveRows.length ? { versionGroup: sameMoves ? base.moves.versionGroup : CUSTOM_MOVE_SOURCE, rows: moveRows } : null,
    movesInherited: sameMoves ? Boolean(base.movesInherited) : false,
  };
}

const EMPTY_DETAIL = {
  flavorTexts: [],
  pokedexNumbers: [],
  evolution: null,
  varieties: [],
  cosmeticForms: [],
  moves: null,
  movesInherited: false,
  encounters: [],
};

async function nextId(db) {
  const { rows } = await db.query(`SELECT GREATEST(max(id), ${FIRST_CUSTOM_ID - 1}) + 1 AS id FROM pokedex_entry`);
  return rows[0].id;
}

function parseSlug(raw, name) {
  const slug = slugify(raw?.slug || name);
  if (!slug || slug.length > 80) fail('Identificador: use até 80 letras, números ou traços');
  if (RESERVED_SLUGS.has(slug)) fail(`Identificador: "${slug}" é reservado`);
  return slug;
}

adminPokedexRouter.get('/', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT summary FROM pokedex_entry ORDER BY dex_number, id');
  res.json(rows.map((row) => row.summary));
});

adminPokedexRouter.get('/:slug', async (req, res) => {
  const detail = await readDetail(await getDb(), req.params.slug);
  if (!detail) return res.status(404).json({ error: 'Pokémon não encontrado' });
  res.json({
    ...detail,
    evolvesFrom: findParent(detail.evolution, detail.slug)?.slug ?? '',
    evolutionHow: findNode(detail.evolution, detail.slug)?.how.join(' / ') ?? '',
  });
});

adminPokedexRouter.post('/', async (req, res) => {
  const fields = parseFields(req.body);
  const slug = parseSlug(req.body, fields.name);
  const regional = req.body?.kind === 'regional';
  const db = await getDb();

  if (await readDetail(db, slug)) {
    return res.status(409).json({ error: `Já existe um Pokémon com o identificador "${slug}"` });
  }

  const matchups = await loadMatchups(db, fields.types);
  const created = await db.transaction(async (tx) => {
    if (regional) {
      const base = await readDetail(tx, String(req.body?.baseSlug ?? ''));
      if (!base || !base.isDefault) fail('Forma Regional: escolha o Pokémon de origem');
      const detail = mergeFields(base, fields, matchups);
      Object.assign(detail, { id: await nextId(tx), slug, isDefault: false });
      // A forma aparece na propria cadeia no lugar do Pokemon de origem.
      if (detail.evolution) {
        detail.evolution = withNodeFields(detail.evolution, base.slug, { slug, name: detail.name, sprite: detail.sprite });
      }
      await writeEntry(tx, detail);
      await syncVarieties(tx, detail.dexNumber);
      return detail;
    }

    const dexNumber = number(req.body?.dexNumber, 'Número da Pokédex', { min: 1, max: 99999 });
    const { rows } = await tx.query('SELECT slug FROM pokedex_entry WHERE dex_number = $1 LIMIT 1', [dexNumber]);
    if (rows[0]) fail(`Número da Pokédex: #${dexNumber} já é de ${rows[0].slug}`);

    const detail = mergeFields(EMPTY_DETAIL, fields, matchups);
    Object.assign(detail, { id: await nextId(tx), slug, speciesSlug: slug, dexNumber, isDefault: true });
    await writeEntry(tx, detail);
    await syncVarieties(tx, dexNumber);
    await updateEvolution(tx, detail, fields.evolvesFrom, fields.evolutionHow);
    return detail;
  });
  res.status(201).json({ slug: created.slug });
});

adminPokedexRouter.put('/:slug', async (req, res) => {
  const db = await getDb();
  const current = await readDetail(db, req.params.slug);
  if (!current) return res.status(404).json({ error: 'Pokémon não encontrado' });

  const fields = parseFields(req.body);
  const matchups = await loadMatchups(db, fields.types);
  await db.transaction(async (tx) => {
    const detail = mergeFields(current, fields, matchups);
    await writeEntry(tx, detail);
    await syncVarieties(tx, detail.dexNumber);
    if (detail.isDefault) await updateEvolution(tx, await readDetail(tx, detail.slug), fields.evolvesFrom, fields.evolutionHow);
    else if (detail.evolution) {
      const shown = { name: detail.name, sprite: detail.sprite };
      await patchChains(tx, dexNumbersIn(detail.evolution), (tree) => withNodeFields(tree, detail.slug, shown));
    }
  });
  res.json({ slug: current.slug });
});

adminPokedexRouter.delete('/:slug', async (req, res) => {
  const db = await getDb();
  const current = await readDetail(db, req.params.slug);
  if (!current) return res.status(404).json({ error: 'Pokémon não encontrado' });

  if (current.isDefault) {
    if (current.varieties.length > 1) fail('Exclua primeiro as outras formas deste Pokémon');
    if (findNode(current.evolution, current.slug)?.evolvesTo.length) fail('Exclua primeiro as evoluções deste Pokémon');
  }

  await db.transaction(async (tx) => {
    await deleteEntry(tx, current.slug);

    if (current.evolution) await patchChains(tx, dexNumbersIn(current.evolution), (tree) => withoutNode(tree, current.slug));
    if (!current.isDefault) await syncVarieties(tx, current.dexNumber);

    // Tira o Pokemon das areas do mapa, senao a proxima edicao dessas areas seria recusada.
    const { rows } = await tx.query('SELECT slug, content FROM map_area');
    for (const { slug, content } of rows) {
      const without = (section) => ({ ...section, pokemon: section.pokemon.filter((item) => item !== current.slug) });
      const next = { ...without(content), subareas: content.subareas.map(without) };
      if (JSON.stringify(next) === JSON.stringify(content)) continue;
      await tx.query('UPDATE map_area SET content = $2::json, updated_at = now() WHERE slug = $1', [slug, JSON.stringify(next)]);
    }
  });
  res.status(204).end();
});
