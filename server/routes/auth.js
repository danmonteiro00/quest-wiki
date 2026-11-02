import { Router } from 'express';
import { currentUser, endSession, hashPassword, startSession, verifyPassword } from '../auth.js';
import { getDb } from '../db.js';
import { parsePassword, parseUserFields } from '../validate.js';

export const authRouter = Router();

const MAX_FAILED_LOGINS = 10;
const LOCK_MINUTES = 15;
const BAD_LOGIN = 'E-mail ou senha incorretos';

// Mesmo custo com ou sem conta, para o tempo de resposta nao revelar quais e-mails existem.
let decoyHash;

authRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

authRouter.get('/me', async (req, res) => {
  const user = await currentUser(req);
  if (!user) await endSession(req, res);
  res.json({ user });
});

authRouter.post('/register', async (req, res) => {
  const { username, email } = parseUserFields(req.body);
  const hash = await hashPassword(parsePassword(req.body?.password));
  const db = await getDb();
  let rows;
  try {
    ({ rows } = await db.query(
      `INSERT INTO app_user (username, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id::int AS id, username, email, role`,
      [username, email, hash],
    ));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Usuário ou e-mail já cadastrado' });
    throw error;
  }
  await startSession(res, db, rows[0].id);
  res.status(201).json({ user: rows[0] });
});

authRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '').slice(0, 200);
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT id::int AS id, username, email, role, password_hash, failed_logins, COALESCE(locked_until > now(), false) AS locked
     FROM app_user WHERE email = $1`,
    [email],
  );
  const account = rows[0];

  if (!account?.password_hash) {
    decoyHash ??= await hashPassword('senha-que-nao-existe');
    await verifyPassword(password, decoyHash);
    return res.status(401).json({ error: BAD_LOGIN });
  }
  if (account.locked) {
    return res.status(429).json({ error: `Muitas tentativas erradas. Tente de novo em até ${LOCK_MINUTES} minutos.` });
  }

  if (!(await verifyPassword(password, account.password_hash))) {
    const lock = account.failed_logins + 1 >= MAX_FAILED_LOGINS;
    await db.query(
      `UPDATE app_user SET failed_logins = $2, locked_until = CASE WHEN $3::boolean THEN now() + interval '${LOCK_MINUTES} minutes' ELSE NULL END WHERE id = $1`,
      [account.id, lock ? 0 : account.failed_logins + 1, lock],
    );
    return res.status(401).json({ error: BAD_LOGIN });
  }

  await db.query('UPDATE app_user SET failed_logins = 0, locked_until = NULL WHERE id = $1', [account.id]);
  await startSession(res, db, account.id);
  const { id, username, role } = account;
  res.json({ user: { id, username, email: account.email, role } });
});

authRouter.post('/logout', async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
});
