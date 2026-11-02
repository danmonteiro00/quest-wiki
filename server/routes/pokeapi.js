import { Router } from 'express';
import { getDb } from '../db.js';
import { cachePublic } from './cache.js';

// Acesso aos dados crus de qualquer endpoint importado (move, item, location...).
export const pokeapiRouter = Router();

pokeapiRouter.get('/', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    'SELECT endpoint, count(*)::int AS total FROM pokeapi_resource GROUP BY endpoint ORDER BY endpoint',
  );
  cachePublic(res);
  res.json(rows);
});

pokeapiRouter.get('/:endpoint', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    'SELECT id, name FROM pokeapi_resource WHERE endpoint = $1 ORDER BY id',
    [req.params.endpoint],
  );
  if (!rows.length) return res.status(404).json({ error: 'Endpoint não encontrado' });
  cachePublic(res);
  res.json(rows);
});

pokeapiRouter.get('/:endpoint/:key', async (req, res) => {
  const db = await getDb();
  const { endpoint, key } = req.params;
  const { rows } = /^\d+$/.test(key) && Number(key) <= 2147483647
    ? await db.query('SELECT data FROM pokeapi_resource WHERE endpoint = $1 AND id = $2', [endpoint, Number(key)])
    : await db.query('SELECT data FROM pokeapi_resource WHERE endpoint = $1 AND name = $2 LIMIT 1', [endpoint, key]);
  if (!rows.length) return res.status(404).json({ error: 'Recurso não encontrado' });
  cachePublic(res);
  res.json(rows[0].data);
});
