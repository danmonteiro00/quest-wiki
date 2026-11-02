// Item DEX, Move DEX e as habilidades do formulario da Pokedex ficam em catalog_entry.

export async function listCatalog(db, kind) {
  const { rows } = await db.query('SELECT data FROM catalog_entry WHERE kind = $1 AND NOT deleted', [kind]);
  return rows.map((row) => row.data).sort((a, b) => a.name.localeCompare(b.name));
}

export async function readCatalogEntry(db, kind, slug) {
  const { rows } = await db.query('SELECT data FROM catalog_entry WHERE kind = $1 AND slug = $2 AND NOT deleted', [kind, slug]);
  return rows[0]?.data ?? null;
}

// edited protege a linha de db:import, tanto a editada quanto a excluida.
export async function writeCatalogEntry(db, kind, data) {
  await db.query(
    `INSERT INTO catalog_entry (kind, slug, data, edited, deleted) VALUES ($1, $2, $3::json, true, false)
     ON CONFLICT (kind, slug) DO UPDATE SET data = EXCLUDED.data, edited = true, deleted = false, updated_at = now()`,
    [kind, data.slug, JSON.stringify(data)],
  );
}

export async function deleteCatalogEntry(db, kind, slug) {
  await db.query(
    "UPDATE catalog_entry SET data = '{}'::json, edited = true, deleted = true, updated_at = now() WHERE kind = $1 AND slug = $2",
    [kind, slug],
  );
}

// Chamado por db:import. O que veio do CRUD fica como esta, so ganhando as traducoes novas.
export async function replaceImportedCatalog(tx, entries, translate) {
  await tx.query('DELETE FROM catalog_entry WHERE NOT edited');
  const size = 200;
  for (let start = 0; start < entries.length; start += size) {
    const rows = entries.slice(start, start + size);
    await tx.query(
      `INSERT INTO catalog_entry (kind, slug, data)
       SELECT k, s, d::json FROM unnest($1::text[], $2::text[], $3::text[]) AS t(k, s, d)
       ON CONFLICT (kind, slug) DO NOTHING`,
      [rows.map((row) => row.kind), rows.map((row) => row.data.slug), rows.map((row) => JSON.stringify(row.data))],
    );
  }
  const { rows: edited } = await tx.query('SELECT kind, slug, data FROM catalog_entry WHERE edited AND NOT deleted');
  for (const { kind, slug, data } of edited) {
    const description = translate(data.description ?? '');
    if (description === (data.description ?? '')) continue;
    await tx.query('UPDATE catalog_entry SET data = $3::json WHERE kind = $1 AND slug = $2', [kind, slug, JSON.stringify({ ...data, description })]);
  }
}

// As fichas guardam copias dos golpes; assim o que muda na Move DEX aparece nelas sem regravar cada Pokemon.
export async function withEditedMoves(db, detail) {
  const rows = detail.moves?.rows;
  if (!rows?.length) return detail;
  const { rows: edited } = await db.query(
    "SELECT slug, data FROM catalog_entry WHERE kind = 'move' AND edited AND NOT deleted AND slug = ANY($1::text[])",
    [[...new Set(rows.map((row) => row.slug))]],
  );
  if (!edited.length) return detail;
  const bySlug = new Map(edited.map((row) => [row.slug, row.data]));
  const patched = rows.map((row) => {
    const move = bySlug.get(row.slug);
    if (!move) return row;
    const { name, type, category, power, accuracy, pp } = move;
    return { ...row, name, type, category, power, accuracy, pp };
  });
  return { ...detail, moves: { ...detail.moves, rows: patched } };
}
