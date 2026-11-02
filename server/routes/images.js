import express, { Router } from 'express';
import { getDb } from '../db.js';

// Imagens enviadas ficam no proprio banco: a Vercel nao guarda arquivos entre uma requisicao e outra.
// O navegador reduz a imagem antes de enviar (ver client/src/components/ImageField.jsx).
const MAX_BYTES = 2 * 1024 * 1024;

// Confere o conteudo, e nao o tipo informado: SVG e HTML nunca entram, pois poderiam rodar script no site.
function detectType(data) {
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (data.toString('latin1', 0, 4) === 'RIFF' && data.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export const imagesRouter = Router();

imagesRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(404).json({ error: 'Imagem não encontrada' });
  const db = await getDb();
  const { rows } = await db.query('SELECT content_type, data FROM uploaded_image WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Imagem não encontrada' });
  // Cada envio ganha um id novo, entao o conteudo de um endereco nunca muda.
  res.set({
    'Content-Type': rows[0].content_type,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(rows[0].data));
});

export const adminImagesRouter = Router();

adminImagesRouter.post('/', express.raw({ type: 'image/*', limit: MAX_BYTES }), async (req, res) => {
  const data = req.body;
  const contentType = Buffer.isBuffer(data) ? detectType(data) : null;
  if (!contentType) return res.status(400).json({ error: 'Envie uma imagem JPG, PNG ou WebP' });
  const db = await getDb();
  const { rows } = await db.query(
    'INSERT INTO uploaded_image (content_type, data, uploaded_by) VALUES ($1, $2, $3) RETURNING id::int AS id',
    [contentType, data, req.user.id],
  );
  res.status(201).json({ url: `/api/images/${rows[0].id}` });
});
