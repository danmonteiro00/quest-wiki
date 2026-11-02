import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { isStaff } from '../shared/roles.js';
import { getDb } from './db.js';

const scrypt = promisify(scryptCallback);

const SCRYPT = { N: 65536, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const SESSION_COOKIE = 'qw_session';
// Sem segredo: so avisa o navegador que vale perguntar quem esta logado, poupando o banco nas visitas anonimas.
const HINT_COOKIE = 'qw_logged';
const SESSION_DAYS = 30;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [, N, r, p, salt, expected] = stored.split('$');
  const hash = await scrypt(password, Buffer.from(salt, 'base64'), 32, { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return timingSafeEqual(hash, Buffer.from(expected, 'base64'));
}

const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

function readCookie(req, name) {
  for (const part of (req.get('cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

function setCookies(res, token, maxAge) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
  res.append('Set-Cookie', `${HINT_COOKIE}=${maxAge ? '1' : ''}; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}

export async function startSession(res, db, userId) {
  const token = randomBytes(32).toString('hex');
  await db.query('DELETE FROM app_session WHERE user_id = $1 AND expires_at < now()', [userId]);
  await db.query(
    `INSERT INTO app_session (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`,
    [tokenHash(token), userId],
  );
  setCookies(res, token, SESSION_DAYS * 24 * 60 * 60);
}

export async function endSession(req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    const db = await getDb();
    await db.query('DELETE FROM app_session WHERE token_hash = $1', [tokenHash(token)]);
  }
  setCookies(res, '', 0);
}

// Encerra as outras sessoes da conta, por exemplo depois de trocar a senha.
export async function endOtherSessions(db, userId, req) {
  const token = readCookie(req, SESSION_COOKIE) ?? '';
  await db.query('DELETE FROM app_session WHERE user_id = $1 AND token_hash <> $2', [userId, tokenHash(token)]);
}

// O papel vem do banco a cada requisicao, entao uma mudanca feita pelo Admin vale na hora.
export async function currentUser(req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT u.id::int AS id, u.username, u.email, u.role
     FROM app_session s JOIN app_user u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash(token)],
  );
  return rows[0] ?? null;
}

export async function requireUser(req, res, next) {
  res.set('Cache-Control', 'no-store');
  req.user = await currentUser(req);
  if (!req.user) return res.status(401).json({ error: 'Entre com a sua conta para continuar' });
  next();
}

export async function requireStaff(req, res, next) {
  res.set('Cache-Control', 'no-store');
  req.user = await currentUser(req);
  if (!req.user) return res.status(401).json({ error: 'Entre com a sua conta para continuar' });
  if (!isStaff(req.user)) return res.status(403).json({ error: 'Sua conta não tem acesso a esta área' });
  next();
}
