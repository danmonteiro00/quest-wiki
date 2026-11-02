import express from 'express';
import { getDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { pokeapiRouter } from './routes/pokeapi.js';
import { pokemonRouter } from './routes/pokemon.js';

export const app = express();

app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT count(*)::int AS pokemon FROM pokedex_entry');
  res.json({ status: 'ok', pokemon: rows[0].pokemon });
});

app.use('/api/pokemon', pokemonRouter);
app.use('/api/pokeapi', pokeapiRouter);
app.use('/api/auth', authRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno' });
});
