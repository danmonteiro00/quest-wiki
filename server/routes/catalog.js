import { Router } from 'express';
import { slugify } from '../../shared/slug.js';
import { deleteCatalogEntry, listCatalog, readCatalogEntry, writeCatalogEntry } from '../catalog-store.js';
import { getDb } from '../db.js';
import { fail, imageUrl, number, text } from '../validate.js';
import { MOVE_CATEGORIES, TYPES } from './admin-pokedex.js';
import { cacheEditable } from './cache.js';

const RESERVED_SLUGS = new Set(['novo']);

function requiredName(raw) {
  const name = text(raw?.name, 'Nome', 80);
  if (!name) fail('Nome: campo obrigatório');
  return name;
}

function parseItem(raw) {
  return {
    name: requiredName(raw),
    category: text(raw?.category, 'Categoria', 80),
    cost: number(raw?.cost, 'Preço', { max: 9999999, required: false }),
    image: imageUrl(raw?.image, 'Imagem'),
    description: text(raw?.description, 'Descrição', 2000),
  };
}

function parseMove(raw) {
  if (raw?.type && !TYPES.has(raw.type)) fail('Tipo: escolha um tipo da lista');
  if (raw?.category && !MOVE_CATEGORIES.has(raw.category)) fail('Categoria: escolha physical, special ou status');
  return {
    name: requiredName(raw),
    type: raw?.type || null,
    category: raw?.category || null,
    power: number(raw?.power, 'Poder', { max: 999, required: false }),
    accuracy: number(raw?.accuracy, 'Precisão', { max: 100, required: false }),
    description: text(raw?.description, 'Descrição', 2000),
  };
}

function publicRouter(kind) {
  const router = Router();
  router.get('/', async (_req, res) => {
    const entries = await listCatalog(await getDb(), kind);
    cacheEditable(res);
    res.json(entries);
  });
  return router;
}

function adminRouter(kind, parse, label) {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await listCatalog(await getDb(), kind));
  });

  router.get('/:slug', async (req, res) => {
    const entry = await readCatalogEntry(await getDb(), kind, req.params.slug);
    if (!entry) return res.status(404).json({ error: `${label} não encontrado` });
    res.json(entry);
  });

  router.post('/', async (req, res) => {
    const fields = parse(req.body);
    const slug = slugify(fields.name);
    if (!slug || RESERVED_SLUGS.has(slug)) fail('Nome: escolha outro nome');
    const db = await getDb();
    if (await readCatalogEntry(db, kind, slug)) return res.status(409).json({ error: `Já existe um registro chamado "${fields.name}"` });
    const entry = { slug, ...fields };
    await writeCatalogEntry(db, kind, entry);
    res.status(201).json(entry);
  });

  router.put('/:slug', async (req, res) => {
    const db = await getDb();
    const current = await readCatalogEntry(db, kind, req.params.slug);
    if (!current) return res.status(404).json({ error: `${label} não encontrado` });
    // O que nao aparece no formulario, como o PP dos golpes, continua guardado.
    const entry = { ...current, ...parse(req.body), slug: req.params.slug };
    await writeCatalogEntry(db, kind, entry);
    res.json(entry);
  });

  router.delete('/:slug', async (req, res) => {
    const db = await getDb();
    if (!(await readCatalogEntry(db, kind, req.params.slug))) return res.status(404).json({ error: `${label} não encontrado` });
    await deleteCatalogEntry(db, kind, req.params.slug);
    res.status(204).end();
  });

  return router;
}

export const itemsRouter = publicRouter('item');
export const movesRouter = publicRouter('move');
export const adminItemsRouter = adminRouter('item', parseItem, 'Item');
export const adminMovesRouter = adminRouter('move', parseMove, 'Golpe');
