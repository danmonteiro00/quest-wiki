import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { findArea } from '../../shared/map-areas.js';
import { getDb } from '../db.js';

export const mapRouter = Router();

const DEFAULT_SLOTS = 10;

// Criada aqui, e nao em schema.sql, para existir sem depender de rodar a importacao da PokeAPI.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS map_area (
  slug text PRIMARY KEY,
  content json NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

let tableReady;

async function mapDb() {
  const db = await getDb();
  tableReady ??= db.exec(CREATE_TABLE).catch((error) => {
    tableReady = undefined;
    throw error;
  });
  await tableReady;
  return db;
}

const emptyContent = () => ({ image: '', description: '', slots: DEFAULT_SLOTS, pokemon: [], resources: [], subareas: [] });

async function readContent(db, slug) {
  const { rows } = await db.query('SELECT content FROM map_area WHERE slug = $1', [slug]);
  return rows[0]?.content ?? emptyContent();
}

function requireArea(req, res, next) {
  req.area = findArea(req.params.slug);
  if (!req.area) return res.status(404).json({ error: 'Área não encontrada' });
  next();
}

// Senha unica do ADM ate o login existir. Sem ADMIN_PASSWORD definida, a edicao fica desligada.
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(503).json({ error: 'Edição desativada: defina ADMIN_PASSWORD no servidor' });
  const digest = (value) => createHash('sha256').update(value).digest();
  const given = (req.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!timingSafeEqual(digest(given), digest(encodeURIComponent(expected)))) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }
  res.set('Cache-Control', 'no-store');
  next();
}

class InvalidContent extends Error {}

function text(value, label, max) {
  const clean = String(value ?? '').trim();
  if (clean.length > max) throw new InvalidContent(`${label}: use no máximo ${max} caracteres`);
  return clean;
}

function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function parseResource(raw) {
  const name = text(raw?.name, 'Nome do recurso', 80);
  if (!name) throw new InvalidContent('Todo recurso precisa de um nome');
  // O icone pode ser um emoji ou o endereco de uma imagem.
  const icon = text(raw?.icon, `Ícone de ${name}`, 500);
  if (icon.length > 8 && !isHttpUrl(icon)) throw new InvalidContent(`Ícone de ${name}: use um emoji ou um endereço http(s)`);
  return { icon, name, description: text(raw?.description, `Descrição de ${name}`, 2000) };
}

function parseSection(raw) {
  const image = text(raw?.image, 'Imagem', 1000);
  if (image && !isHttpUrl(image)) throw new InvalidContent('A imagem precisa ser um endereço http(s)');
  const slots = Number(raw?.slots ?? DEFAULT_SLOTS);
  if (!Number.isInteger(slots) || slots < 1 || slots > 200) throw new InvalidContent('Quadrados de Pokémon: use um número de 1 a 200');
  const pokemon = [...new Set((Array.isArray(raw?.pokemon) ? raw.pokemon : []).map(String))];
  const resources = (Array.isArray(raw?.resources) ? raw.resources : []).map(parseResource);
  return { image, description: text(raw?.description, 'Descrição', 5000), slots, pokemon, resources };
}

function parseContent(raw) {
  const subareas = (Array.isArray(raw?.subareas) ? raw.subareas : []).map((subarea) => {
    const name = text(subarea?.name, 'Nome da sub-área', 80);
    if (!name) throw new InvalidContent('Toda sub-área precisa de um nome');
    return { name, ...parseSection(subarea) };
  });
  return { ...parseSection(raw), subareas };
}

mapRouter.get('/admin', requireAdmin, (_req, res) => res.status(204).end());

mapRouter.get('/admin/:slug', requireAdmin, requireArea, async (req, res) => {
  res.json(await readContent(await mapDb(), req.area.slug));
});

mapRouter.put('/admin/:slug', requireAdmin, requireArea, async (req, res) => {
  let content;
  try {
    content = parseContent(req.body);
  } catch (error) {
    if (error instanceof InvalidContent) return res.status(400).json({ error: error.message });
    throw error;
  }

  const db = await mapDb();
  const slugs = [...content.pokemon, ...content.subareas.flatMap((subarea) => subarea.pokemon)];
  const { rows } = await db.query('SELECT slug FROM pokedex_entry WHERE slug = ANY($1::text[])', [slugs]);
  const known = new Set(rows.map((row) => row.slug));
  const unknown = slugs.filter((slug) => !known.has(slug));
  if (unknown.length) return res.status(400).json({ error: `Pokémon não encontrado: ${unknown.join(', ')}` });

  await db.query(
    `INSERT INTO map_area (slug, content) VALUES ($1, $2::json)
     ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`,
    [req.area.slug, JSON.stringify(content)],
  );
  res.json(content);
});

mapRouter.get('/:slug', requireArea, async (req, res) => {
  const db = await mapDb();
  const content = await readContent(db, req.area.slug);
  const sections = [{ name: 'Geral', ...content }, ...content.subareas];

  // So os Pokemon descobertos saem do banco, entao os quadrados com "?" nao revelam nada.
  const { rows } = await db.query('SELECT summary FROM pokedex_entry WHERE slug = ANY($1::text[])', [
    sections.flatMap((section) => section.pokemon),
  ]);
  const summaries = new Map(rows.map(({ summary }) => [summary.slug, summary]));

  // O ADM precisa ver a mudanca logo depois de salvar, entao a CDN guarda por pouco tempo.
  res.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
  res.json({
    slug: req.area.slug,
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
