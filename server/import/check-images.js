import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import tar from 'tar-stream';
import { imagesFor } from './serebii.js';

// Confere no Serebii se as imagens das formas existem. Baixa pouco e devagar (HEAD, 4 por vez).
const RESOURCE = /^[^/]+\/data\/api\/v2\/pokemon\/(\d+)\/index\.json$/;
const extract = tar.extract();
const source = pipeline(createReadStream('.data/api-data.tar.gz'), createGunzip(), extract);

const forms = [];
for await (const entry of extract) {
  if (!RESOURCE.test(entry.header.name)) {
    entry.resume();
    continue;
  }
  const chunks = [];
  for await (const chunk of entry) chunks.push(chunk);
  const doc = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (doc.is_default) continue;
  forms.push({
    slug: doc.name,
    speciesSlug: doc.species.name,
    dexNumber: Number(doc.species.url.match(/(\d+)\/$/)[1]),
    isDefault: false,
  });
}
await source;

const exists = async (url) => (await fetch(url, { method: 'HEAD' })).ok;
const missing = [];
let cursor = 0;

await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < forms.length) {
    const form = forms[cursor++];
    const { art } = imagesFor(form);
    if (art.length === 1) missing.push(`${form.slug} (sem sufixo)`);
    else if (!(await exists(art[0]))) missing.push(`${form.slug} -> ${art[0].split('/').pop()}`);
  }
}));

console.log(`Formas verificadas: ${forms.length}`);
console.log(`${forms.length} formas conferidas. Sem arte propria (${missing.length}):\n  ${missing.sort().join('\n  ')}`);
