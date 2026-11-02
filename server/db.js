import { mkdirSync } from 'node:fs';
import { APP_SCHEMA } from './app-schema.js';

let dbPromise;

// Mesma interface nos dois casos: Postgres real (Neon) ou PGlite local, sem instalar nada.
export function getDb() {
  dbPromise ??= connect().catch((error) => {
    dbPromise = undefined;
    throw error;
  });
  return dbPromise;
}

async function connect() {
  const db = await (process.env.DATABASE_URL ? connectPostgres() : connectPglite());
  await db.exec(APP_SCHEMA);
  return db;
}

async function connectPostgres() {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? 3),
  });
  return {
    query: (sql, params) => pool.query(sql, params),
    exec: (sql) => pool.query(sql),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (sql, params) => client.query(sql, params) });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function connectPglite() {
  const { PGlite } = await import('@electric-sql/pglite');
  mkdirSync('.data', { recursive: true });
  const db = await PGlite.create('.data/pglite');
  return {
    query: (sql, params) => db.query(sql, params),
    exec: (sql) => db.exec(sql),
    transaction: (fn) => db.transaction((tx) => fn({ query: (sql, params) => tx.query(sql, params) })),
    close: () => db.close(),
  };
}
