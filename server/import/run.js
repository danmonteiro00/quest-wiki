import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import tar from 'tar-stream';
import { getDb } from '../db.js';
import { replaceImportedCatalog } from '../catalog-store.js';
import { buildCatalog, buildEntries, createCollector } from './build-entries.js';
import { applyOverrides } from '../pokedex-store.js';

// O repositorio oficial traz a API inteira em um unico arquivo, em vez de ~15 mil requisicoes.
const TARBALL_URL = 'https://codeload.github.com/PokeAPI/api-data/tar.gz/refs/heads/master';
const TARBALL_PATH = '.data/api-data.tar.gz';
const RESOURCE_PATH = /^[^/]+\/data\/api\/v2\/([a-z-]+)\/(\d+)\/(encounters\/)?index\.json$/;
const BATCH_BYTES = 4 * 1024 * 1024;

// Dicionarios de translations/: texto em ingles -> traducao. O que ainda nao foi traduzido fica em ingles.
function loadTranslator() {
  const folder = new URL('./translations/', import.meta.url);
  const dictionary = new Map();
  for (const file of readdirSync(folder)) {
    for (const [source, target] of Object.entries(JSON.parse(readFileSync(new URL(file, folder), 'utf8')))) {
      dictionary.set(source, target);
    }
  }
  return (text) => dictionary.get(text) ?? text;
}

async function ensureTarball() {
  if (existsSync(TARBALL_PATH) && !process.argv.includes('--refresh')) {
    console.log(`Usando ${TARBALL_PATH} (passe --refresh para baixar de novo)`);
    return;
  }
  mkdirSync('.data', { recursive: true });
  console.log('Baixando dados da PokeAPI...');
  const response = await fetch(TARBALL_URL);
  if (!response.ok) throw new Error(`Download falhou: HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(TARBALL_PATH));
}

async function insertResources(tx, rows) {
  await tx.query(
    `INSERT INTO pokeapi_resource (endpoint, id, name, data)
     SELECT e, i, n, d::json FROM unnest($1::text[], $2::int[], $3::text[], $4::text[]) AS t(e, i, n, d)`,
    [rows.map((r) => r.endpoint), rows.map((r) => r.id), rows.map((r) => r.name), rows.map((r) => r.data)],
  );
}

async function insertEntries(tx, entries) {
  const size = 100;
  for (let start = 0; start < entries.length; start += size) {
    const rows = entries.slice(start, start + size);
    await tx.query(
      `INSERT INTO pokedex_entry (id, slug, dex_number, summary, detail)
       SELECT i, s, n, a::json, b::json FROM unnest($1::int[], $2::text[], $3::int[], $4::text[], $5::text[]) AS t(i, s, n, a, b)`,
      [
        rows.map((r) => r.id),
        rows.map((r) => r.slug),
        rows.map((r) => r.dexNumber),
        rows.map((r) => JSON.stringify(r.summary)),
        rows.map((r) => JSON.stringify(r.detail)),
      ],
    );
  }
}

async function importResources(tx, collector) {
  const extract = tar.extract();
  const source = pipeline(createReadStream(TARBALL_PATH), createGunzip(), extract);

  let batch = [];
  let batchBytes = 0;
  let total = 0;
  const flush = async () => {
    if (!batch.length) return;
    await insertResources(tx, batch);
    total += batch.length;
    process.stdout.write(`\r  ${total} recursos gravados`);
    batch = [];
    batchBytes = 0;
  };

  for await (const entry of extract) {
    const match = entry.header.name.match(RESOURCE_PATH);
    if (!match) {
      entry.resume();
      continue;
    }
    const chunks = [];
    for await (const chunk of entry) chunks.push(chunk);

    const endpoint = match[3] ? 'pokemon-encounters' : match[1];
    const id = Number(match[2]);
    const doc = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const data = JSON.stringify(doc);
    collector.add(endpoint, id, doc);

    batch.push({ endpoint, id, name: typeof doc.name === 'string' ? doc.name : null, data });
    batchBytes += data.length;
    if (batchBytes >= BATCH_BYTES) await flush();
  }
  await flush();
  await source;
  process.stdout.write('\n');
  return total;
}

await ensureTarball();

const db = await getDb();
await db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));

// Tudo em uma transacao: se algo falhar, o site continua com os dados anteriores.
await db.transaction(async (tx) => {
  await tx.query('TRUNCATE pokeapi_resource, pokedex_entry');
  const collector = createCollector();
  const total = await importResources(tx, collector);
  const translate = loadTranslator();
  const entries = buildEntries(collector, translate);
  await insertEntries(tx, entries);
  const overrides = await applyOverrides(tx, translate);
  const catalog = buildCatalog(collector, translate);
  await replaceImportedCatalog(tx, catalog, translate);
  console.log(`Concluido: ${total} recursos da PokeAPI, ${entries.length} entradas na Pokedex, ${overrides} edicoes reaplicadas, ${catalog.length} itens, golpes e habilidades`);
});

const { rows } = await db.query(`
  SELECT pg_size_pretty(pg_total_relation_size('pokeapi_resource')) AS raw,
         pg_size_pretty(pg_total_relation_size('pokedex_entry')) AS dex,
         pg_size_pretty(pg_database_size(current_database())) AS database`);
console.log('Tamanho no banco:', rows[0]);
await db.close();
