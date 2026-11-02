import { Router } from 'express';
import { withEditedMoves } from '../catalog-store.js';
import { getDb } from '../db.js';
import { cacheEditable } from './cache.js';

export const pokemonRouter = Router();

pokemonRouter.get('/', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT summary FROM pokedex_entry ORDER BY dex_number, id');
  cacheEditable(res);
  res.json(rows.map((row) => row.summary));
});

pokemonRouter.get('/:slug', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT detail FROM pokedex_entry WHERE slug = $1', [req.params.slug]);
  if (!rows.length) return res.status(404).json({ error: 'Pokémon não encontrado' });
  const detail = await withEditedMoves(db, rows[0].detail);
  cacheEditable(res);
  res.json(detail);
});
