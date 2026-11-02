import { Router } from 'express';
import { getDb } from '../db.js';
import { cleanText, english } from '../import/build-entries.js';

// Habilidades e golpes existentes na PokeAPI, para preencher o formulario da Pokedex.
export const adminCatalogRouter = Router();

// Mudam so ao reimportar, entao o navegador do Admin pode guardar por uma hora.
const cacheForAdmin = (res) => res.set('Cache-Control', 'private, max-age=3600');

const byName = (a, b) => a.name.localeCompare(b.name);

adminCatalogRouter.get('/abilities', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT name AS slug, data->'names' AS names, data->'effect_entries' AS effects, data->'flavor_text_entries' AS flavors
     FROM pokeapi_resource WHERE endpoint = 'ability' AND data->>'is_main_series' = 'true'`,
  );
  cacheForAdmin(res);
  res.json(rows.map((row) => ({
    slug: row.slug,
    name: english(row.names)?.name ?? row.slug,
    effect: cleanText(english(row.effects)?.short_effect ?? english(row.flavors)?.flavor_text ?? ''),
  })).sort(byName));
});

adminCatalogRouter.get('/moves', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT name AS slug, data->'names' AS names, data->'type'->>'name' AS type, data->'damage_class'->>'name' AS category,
       data->'power' AS power, data->'accuracy' AS accuracy, data->'pp' AS pp
     FROM pokeapi_resource WHERE endpoint = 'move' AND id < 10000`,
  );
  cacheForAdmin(res);
  res.json(rows.map(({ names, ...move }) => ({ ...move, name: english(names)?.name ?? move.slug })).sort(byName));
});
