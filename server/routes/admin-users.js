import { Router } from 'express';
import { ROLES, canManageUser } from '../../shared/roles.js';
import { endOtherSessions, hashPassword } from '../auth.js';
import { getDb } from '../db.js';
import { fail, parsePassword, parseUserFields } from '../validate.js';

export const adminUsersRouter = Router();

const USER_COLUMNS = 'id::int AS id, username, email, role, created_at AS "createdAt"';

function parseRole(actor, value, current) {
  const role = value ?? current;
  if (!ROLES[role]) fail('Perfil inválido');
  if (role !== current && actor.role !== 'admin') fail('Só o Admin pode mudar o perfil de uma conta');
  return role;
}

async function loadTarget(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(404).json({ error: 'Usuário não encontrado' });
  const db = await getDb();
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM app_user WHERE id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!canManageUser(req.user, rows[0])) return res.status(403).json({ error: 'Só o Admin pode alterar esta conta' });
  req.target = rows[0];
  next();
}

const conflictOr = (res, error) => {
  if (error.code === '23505') return res.status(409).json({ error: 'Usuário ou e-mail já cadastrado' });
  throw error;
};

adminUsersRouter.get('/', async (_req, res) => {
  const db = await getDb();
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM app_user ORDER BY lower(username)`);
  res.json(rows);
});

adminUsersRouter.post('/', async (req, res) => {
  const { username, email } = parseUserFields(req.body);
  const role = parseRole(req.user, req.body?.role, 'player');
  const hash = await hashPassword(parsePassword(req.body?.password));
  const db = await getDb();
  try {
    const { rows } = await db.query(
      `INSERT INTO app_user (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`,
      [username, email, hash, role],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    conflictOr(res, error);
  }
});

adminUsersRouter.put('/:id', loadTarget, async (req, res) => {
  const { username, email } = parseUserFields(req.body);
  const role = parseRole(req.user, req.body?.role, req.target.role);
  // Quem esta editando continua Admin, entao o site nunca fica sem nenhum.
  if (req.target.id === req.user.id && role !== req.user.role) fail('Você não pode mudar o seu próprio perfil');
  const hash = req.body?.password ? await hashPassword(parsePassword(req.body.password)) : null;
  const db = await getDb();
  try {
    const { rows } = await db.query(
      `UPDATE app_user SET username = $2, email = $3, role = $4,
         password_hash = COALESCE($5, password_hash),
         failed_logins = CASE WHEN $5::text IS NULL THEN failed_logins ELSE 0 END,
         locked_until = CASE WHEN $5::text IS NULL THEN locked_until ELSE NULL END
       WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [req.target.id, username, email, role, hash],
    );
    if (hash) await endOtherSessions(db, req.target.id, req);
    res.json(rows[0]);
  } catch (error) {
    conflictOr(res, error);
  }
});

adminUsersRouter.delete('/:id', loadTarget, async (req, res) => {
  if (req.target.id === req.user.id) fail('Você não pode excluir a sua própria conta');
  const db = await getDb();
  await db.query('DELETE FROM app_user WHERE id = $1', [req.target.id]);
  res.status(204).end();
});
