import express, { Router } from 'express';
import { requireStaff } from './auth.js';
import { getDb } from './db.js';
import { adminPokedexRouter } from './routes/admin-pokedex.js';
import { adminUsersRouter } from './routes/admin-users.js';
import { authRouter } from './routes/auth.js';
import { adminImagesRouter, imagesRouter } from './routes/images.js';
import { adminMapRouter, mapRouter } from './routes/map.js';
import { pokeapiRouter } from './routes/pokeapi.js';
import { pokemonRouter } from './routes/pokemon.js';
import { InvalidInput } from './validate.js';

export const app = express();

// A ficha de um Pokemon com todos os golpes passa do limite padrao de 100 KB.
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT count(*)::int AS pokemon FROM pokedex_entry');
  res.json({ status: 'ok', pokemon: rows[0].pokemon });
});

app.use('/api/pokemon', pokemonRouter);
app.use('/api/map', mapRouter);
app.use('/api/images', imagesRouter);
app.use('/api/pokeapi', pokeapiRouter);
app.use('/api/auth', authRouter);

const adminRouter = Router();
adminRouter.use(requireStaff);
adminRouter.use('/users', adminUsersRouter);
adminRouter.use('/pokedex', adminPokedexRouter);
adminRouter.use('/map', adminMapRouter);
adminRouter.use('/images', adminImagesRouter);
app.use('/api/admin', adminRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use((error, _req, res, _next) => {
  if (error instanceof InvalidInput) return res.status(400).json({ error: error.message });
  if (error.status === 413) return res.status(413).json({ error: 'O conteúdo enviado é grande demais' });
  if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: 'Requisição inválida' });
  console.error(error);
  res.status(500).json({ error: 'Erro interno' });
});
