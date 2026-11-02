import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { requireUser } from '../auth.js';
import { getDb } from '../db.js';
import { array, fail, imageUrl, number, text } from '../validate.js';

export const drawsRouter = Router();
export const adminDrawsRouter = Router();
export const adminLogsRouter = Router();
export const playerRouter = Router();

const LOG_PAGE_SIZE = 50;
const DRAW_COLUMNS = 'id::int AS id, title, description, dice_faces AS "diceFaces", outcomes';
const LOG_COLUMNS = `id::int AS id, username, draw_title AS "drawTitle", roll, outcome_title AS "outcomeTitle",
  items, created_at AS "createdAt"`;

function parseItem(raw, title) {
  const name = text(raw?.name, `Item de ${title}`, 80);
  return { name, quantity: number(raw?.quantity, `Quantidade de ${name || 'item'} em ${title}`, { min: 1, max: 9999, required: false }) ?? 1 };
}

// Como o jogador ve o item, no resultado e no LOG.
const itemLabel = ({ name, quantity }) => (quantity > 1 ? `${quantity}x ${name}` : name);

function parseOutcome(raw) {
  const title = text(raw?.title, 'Título da face', 80);
  if (!title) fail('Toda face precisa de um título');
  return {
    title,
    description: text(raw?.description, `Descrição de ${title}`, 2000),
    image: imageUrl(raw?.image, `Imagem de ${title}`),
    faces: number(raw?.faces, `Faces de ${title}`, { min: 1, max: 1000 }),
    items: array(raw?.items).map((item) => parseItem(item, title)).filter((item) => item.name),
  };
}

function parseDraw(raw) {
  const title = text(raw?.title, 'Título', 80);
  if (!title) fail('Título: campo obrigatório');
  const diceFaces = number(raw?.diceFaces, 'Faces do dado', { min: 2, max: 1000 });
  const outcomes = array(raw?.outcomes).map(parseOutcome);
  if (!outcomes.length) fail('Adicione pelo menos uma face');
  const filled = outcomes.reduce((sum, outcome) => sum + outcome.faces, 0);
  if (filled !== diceFaces) fail(`As faces preenchidas somam ${filled}, mas o dado tem ${diceFaces}`);
  return { title, description: text(raw?.description, 'Descrição', 2000), diceFaces, outcomes };
}

async function readDraw(db, rawId) {
  if (!/^\d{1,15}$/.test(rawId)) return null;
  const { rows } = await db.query(`SELECT ${DRAW_COLUMNS} FROM draw WHERE id = $1`, [Number(rawId)]);
  return rows[0] ?? null;
}

const pageOf = (value) => Math.max(1, Math.min(1000000, Math.floor(Number(value)) || 1));

// Filtros opcionais, sempre como parametros: o texto digitado nunca entra no SQL.
async function readLogs(db, { userId, username, drawTitle, page }) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };
  if (userId) add('user_id = ?', userId);
  if (username) add('position(lower(?) in lower(username)) > 0', username);
  if (drawTitle) add('draw_title = ?', drawTitle);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: count } = await db.query(`SELECT count(*)::int AS total FROM draw_log ${where}`, params);
  const { rows } = await db.query(
    `SELECT ${LOG_COLUMNS} FROM draw_log ${where} ORDER BY created_at DESC, id DESC
     LIMIT ${LOG_PAGE_SIZE} OFFSET ${(page - 1) * LOG_PAGE_SIZE}`,
    params,
  );
  return { rows, total: count[0].total, pageCount: Math.max(1, Math.ceil(count[0].total / LOG_PAGE_SIZE)) };
}

// Sem cache: um sorteio recem-criado precisa aparecer na hora, e um excluido nao pode continuar na lista.
drawsRouter.get('/', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query('SELECT id::int AS id, title, description, dice_faces AS "diceFaces" FROM draw ORDER BY title');
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

// O resultado e decidido aqui e gravado no LOG antes de responder, entao o navegador nao tem como escolher.
drawsRouter.post('/:id/roll', requireUser, async (req, res) => {
  const db = await getDb();
  const draw = await readDraw(db, req.params.id);
  if (!draw) return res.status(404).json({ error: 'Sorteio não encontrado' });

  const roll = randomInt(1, draw.diceFaces + 1);
  let reached = 0;
  const outcome = draw.outcomes.find(({ faces }) => {
    reached += faces;
    return roll <= reached;
  });

  const items = outcome.items.map(itemLabel);
  const { rows } = await db.query(
    `INSERT INTO draw_log (user_id, username, draw_id, draw_title, roll, outcome_title, items)
     VALUES ($1, $2, $3, $4, $5, $6, $7::json) RETURNING ${LOG_COLUMNS}`,
    [req.user.id, req.user.username, draw.id, draw.title, roll, outcome.title, JSON.stringify(items)],
  );
  const { title, description, image } = outcome;
  res.status(201).json({ diceFaces: draw.diceFaces, outcome: { title, description, image, items }, log: rows[0] });
});

adminDrawsRouter.get('/', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query(`SELECT ${DRAW_COLUMNS} FROM draw ORDER BY title`);
  res.json(rows);
});

adminDrawsRouter.get('/:id', async (req, res) => {
  const draw = await readDraw(await getDb(), req.params.id);
  if (!draw) return res.status(404).json({ error: 'Sorteio não encontrado' });
  res.json(draw);
});

adminDrawsRouter.post('/', async (req, res) => {
  const { title, description, diceFaces, outcomes } = parseDraw(req.body);
  const db = await getDb();
  const { rows } = await db.query(
    `INSERT INTO draw (title, description, dice_faces, outcomes) VALUES ($1, $2, $3, $4::json) RETURNING ${DRAW_COLUMNS}`,
    [title, description, diceFaces, JSON.stringify(outcomes)],
  );
  res.status(201).json(rows[0]);
});

adminDrawsRouter.put('/:id', async (req, res) => {
  const db = await getDb();
  const current = await readDraw(db, req.params.id);
  if (!current) return res.status(404).json({ error: 'Sorteio não encontrado' });
  const { title, description, diceFaces, outcomes } = parseDraw(req.body);
  const { rows } = await db.query(
    `UPDATE draw SET title = $2, description = $3, dice_faces = $4, outcomes = $5::json, updated_at = now()
     WHERE id = $1 RETURNING ${DRAW_COLUMNS}`,
    [current.id, title, description, diceFaces, JSON.stringify(outcomes)],
  );
  res.json(rows[0]);
});

// Os LOGs guardam copia dos nomes, entao continuam legiveis depois de excluir o sorteio.
adminDrawsRouter.delete('/:id', async (req, res) => {
  const db = await getDb();
  const current = await readDraw(db, req.params.id);
  if (!current) return res.status(404).json({ error: 'Sorteio não encontrado' });
  await db.query('DELETE FROM draw WHERE id = $1', [current.id]);
  res.status(204).end();
});

adminLogsRouter.get('/', async (req, res) => {
  const db = await getDb();
  const logs = await readLogs(db, {
    username: text(req.query.user, 'Jogador', 80),
    drawTitle: text(req.query.draw, 'Sorteio', 80),
    page: pageOf(req.query.page),
  });
  const { rows } = await db.query('SELECT DISTINCT draw_title AS title FROM draw_log ORDER BY draw_title');
  res.json({ ...logs, draws: rows.map((row) => row.title) });
});

playerRouter.use(requireUser);

playerRouter.get('/profile', async (req, res) => {
  const db = await getDb();
  const { rows } = await db.query(
    'SELECT username, email, role, created_at AS "createdAt" FROM app_user WHERE id = $1',
    [req.user.id],
  );
  res.json(rows[0]);
});

playerRouter.get('/logs', async (req, res) => {
  res.json(await readLogs(await getDb(), { userId: req.user.id, page: pageOf(req.query.page) }));
});
