import { Router } from 'express';
import { listCatalog } from '../catalog-store.js';
import { getDb } from '../db.js';

// Habilidades e golpes existentes, para preencher o formulario da Pokedex.
export const adminCatalogRouter = Router();

// Habilidades mudam so ao reimportar, entao o navegador do Admin pode guardar por uma hora.
adminCatalogRouter.get('/abilities', async (_req, res) => {
  res.set('Cache-Control', 'private, max-age=3600');
  res.json(await listCatalog(await getDb(), 'ability'));
});

adminCatalogRouter.get('/moves', async (_req, res) => {
  res.json(await listCatalog(await getDb(), 'move'));
});
