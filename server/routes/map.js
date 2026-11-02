import { Router } from 'express';
import { findArea } from '../../shared/map-areas.js';
import { getDb } from '../db.js';
import { array, fail, imageUrl, isImageUrl, number, text } from '../validate.js';
import { cacheEditable } from './cache.js';

export const mapRouter = Router();
export const adminMapRouter = Router();

const DEFAULT_SLOTS = 10;

const emptyContent = () => ({ name: '', image: '', description: '', slots: DEFAULT_SLOTS, pokemon: [], resources: [], subareas: [] });

async function readContent(db, slug) {
  const { rows } = await db.query('SELECT content FROM map_area WHERE slug = $1', [slug]);
  return { ...emptyContent(), ...rows[0]?.content };
}

function requireArea(req, res, next) {
  req.area = findArea(req.params.slug);
  if (!req.area) return res.status(404).json({ error: 'Área não encontrada' });
  next();
}

function parseResource(raw) {
  const name = text(raw?.name, 'Nome do recurso', 80);
  if (!name) fail('Todo recurso precisa de um nome');
  // O icone pode ser um emoji, o endereco de uma imagem ou um arquivo enviado.
  const icon = text(raw?.icon, `Ícone de ${name}`, 500);
  if (icon.length > 8 && !isImageUrl(icon)) fail(`Ícone de ${name}: use um emoji, um endereço http(s) ou envie um arquivo`);
  return { icon, name, description: text(raw?.description, `Descrição de ${name}`, 2000) };
}

function parseSection(raw) {
  return {
    image: imageUrl(raw?.image, 'Imagem'),
    description: text(raw?.description, 'Descrição', 5000),
    slots: number(raw?.slots ?? DEFAULT_SLOTS, 'Quadrados de Pokémon', { min: 1, max: 200 }),
    pokemon: [...new Set(array(raw?.pokemon).map(String))],
    resources: array(raw?.resources).map(parseResource),
  };
}

function parseContent(raw) {
  const subareas = array(raw?.subareas).map((subarea) => {
    const name = text(subarea?.name, 'Nome da sub-área', 80);
    if (!name) fail('Toda sub-área precisa de um nome');
    return { name, ...parseSection(subarea) };
  });
  return { name: text(raw?.name, 'Nome da área', 80), ...parseSection(raw), subareas };
}

adminMapRouter.get('/:slug', requireArea, async (req, res) => {
  res.json(await readContent(await getDb(), req.area.slug));
});

adminMapRouter.put('/:slug', requireArea, async (req, res) => {
  const content = parseContent(req.body);
  const db = await getDb();
  const slugs = [...content.pokemon, ...content.subareas.flatMap((subarea) => subarea.pokemon)];
  const { rows } = await db.query('SELECT slug FROM pokedex_entry WHERE slug = ANY($1::text[])', [slugs]);
  const known = new Set(rows.map((row) => row.slug));
  const unknown = slugs.filter((slug) => !known.has(slug));
  if (unknown.length) fail(`Pokémon não encontrado: ${unknown.join(', ')}`);

  await db.query(
    `INSERT INTO map_area (slug, content) VALUES ($1, $2::json)
     ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`,
    [req.area.slug, JSON.stringify(content)],
  );
  res.json(content);
});

mapRouter.get('/:slug', requireArea, async (req, res) => {
  const db = await getDb();
  const content = await readContent(db, req.area.slug);
  const sections = [{ ...content, name: 'Geral' }, ...content.subareas];

  // So os Pokemon descobertos saem do banco, entao os quadrados com "?" nao revelam nada.
  const { rows } = await db.query('SELECT summary FROM pokedex_entry WHERE slug = ANY($1::text[])', [
    sections.flatMap((section) => section.pokemon),
  ]);
  const summaries = new Map(rows.map(({ summary }) => [summary.slug, summary]));

  cacheEditable(res);
  res.json({
    slug: req.area.slug,
    name: content.name || req.area.name,
    sections: sections.map(({ name, image, description, slots, pokemon, resources }) => ({
      name,
      image,
      description,
      slots,
      resources,
      pokemon: pokemon
        .map((slug) => summaries.get(slug))
        .filter(Boolean)
        .map(({ slug, name: pokemonName, sprite }) => ({ slug, name: pokemonName, sprite })),
    })),
  });
});
