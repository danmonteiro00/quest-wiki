const SUMMARY_FIELDS = [
  'id', 'slug', 'name', 'dexNumber', 'isDefault', 'types', 'stats', 'statTotal',
  'generation', 'isLegendary', 'isMythical', 'sprite',
];

const summaryOf = (detail) => Object.fromEntries(SUMMARY_FIELDS.map((field) => [field, detail[field]]));

async function upsertEntry(tx, id, slug, dexNumber, summary, detail) {
  await tx.query(
    `INSERT INTO pokedex_entry (id, slug, dex_number, summary, detail) VALUES ($1, $2, $3, $4::json, $5::json)
     ON CONFLICT (slug) DO UPDATE SET dex_number = EXCLUDED.dex_number, summary = EXCLUDED.summary, detail = EXCLUDED.detail`,
    [id, slug, dexNumber, JSON.stringify(summary), JSON.stringify(detail)],
  );
}

// Grava na Pokedex e em pokedex_override, para a edicao sobreviver a uma nova importacao.
export async function writeEntry(tx, detail) {
  const summary = summaryOf(detail);
  await upsertEntry(tx, detail.id, detail.slug, detail.dexNumber, summary, detail);
  await tx.query(
    `INSERT INTO pokedex_override (slug, deleted, id, dex_number, summary, detail) VALUES ($1, false, $2, $3, $4::json, $5::json)
     ON CONFLICT (slug) DO UPDATE SET deleted = false, id = EXCLUDED.id, dex_number = EXCLUDED.dex_number,
       summary = EXCLUDED.summary, detail = EXCLUDED.detail, updated_at = now()`,
    [detail.slug, detail.id, detail.dexNumber, JSON.stringify(summary), JSON.stringify(detail)],
  );
}

export async function deleteEntry(tx, slug) {
  await tx.query('DELETE FROM pokedex_entry WHERE slug = $1', [slug]);
  await tx.query(
    `INSERT INTO pokedex_override (slug, deleted) VALUES ($1, true)
     ON CONFLICT (slug) DO UPDATE SET deleted = true, id = NULL, dex_number = NULL, summary = NULL, detail = NULL, updated_at = now()`,
    [slug],
  );
}

// Chamado por db:import depois de recriar pokedex_entry com os dados da PokeAPI.
export async function applyOverrides(tx) {
  const { rows } = await tx.query('SELECT slug, deleted, id, dex_number, summary, detail FROM pokedex_override ORDER BY updated_at');
  for (const row of rows) {
    if (row.deleted) await tx.query('DELETE FROM pokedex_entry WHERE slug = $1', [row.slug]);
    else await upsertEntry(tx, row.id, row.slug, row.dex_number, row.summary, row.detail);
  }
  return rows.length;
}
