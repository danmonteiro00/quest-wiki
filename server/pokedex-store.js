import { evolutionText } from './import/evolution-text.js';

const SUMMARY_FIELDS = [
  'id', 'slug', 'name', 'dexNumber', 'isDefault', 'types', 'stats', 'statTotal',
  'generation', 'isLegendary', 'isMythical', 'art',
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

// Fichas salvas com dados antigos: fica so a arte, sem os locais da PokeAPI e com as descricoes traduzidas.
// O sprite so continua se o Admin nao tiver cadastrado outra imagem, ate ele trocar pela arte.
function refreshSaved(detail, translate) {
  const refreshNode = (node) => ({ ...node, how: (node.how ?? []).map(evolutionText), evolvesTo: node.evolvesTo.map(refreshNode) });
  const { sprite = [], ...rest } = detail;
  const art = (detail.art ?? []).filter((url) => !url.includes('/pokedex-sv/icon/'));
  return {
    ...rest,
    art: art.length ? art : sprite,
    genus: translate(detail.genus),
    evolution: detail.evolution ? refreshNode(detail.evolution) : null,
    encounters: (detail.encounters ?? []).filter((encounter) => !encounter.versions?.length),
    flavorTexts: (detail.flavorTexts ?? []).map((entry) => ({ ...entry, text: translate(entry.text) })),
    abilities: (detail.abilities ?? []).map((ability) => ({ ...ability, effect: translate(ability.effect) })),
  };
}

function relinkArt(detail, artOf) {
  const withArt = ({ sprite, ...item }) => ({ ...item, art: artOf.get(item.slug) ?? [] });
  const relinkNode = (node) => ({ ...withArt(node), evolvesTo: node.evolvesTo.map(relinkNode) });
  return {
    ...detail,
    varieties: (detail.varieties ?? []).map(withArt),
    evolution: detail.evolution ? relinkNode(detail.evolution) : null,
  };
}

// Chamado por db:import depois de recriar pokedex_entry com os dados da PokeAPI.
export async function applyOverrides(tx, translate) {
  const { rows } = await tx.query('SELECT slug, deleted, id, dex_number, detail FROM pokedex_override ORDER BY updated_at');
  const kept = [];
  for (const row of rows) {
    if (row.deleted) {
      await tx.query('DELETE FROM pokedex_entry WHERE slug = $1', [row.slug]);
      continue;
    }
    const detail = refreshSaved(row.detail, translate);
    kept.push({ ...row, detail });
    await upsertEntry(tx, row.id, row.slug, row.dex_number, summaryOf(detail), detail);
  }

  // As fichas guardam copias da imagem das formas e da cadeia; so da para ligar depois de todas gravadas.
  const { rows: arts } = await tx.query("SELECT slug, summary->'art' AS art FROM pokedex_entry");
  const artOf = new Map(arts.map((row) => [row.slug, row.art]));
  for (const row of kept) {
    const detail = relinkArt(row.detail, artOf);
    await upsertEntry(tx, row.id, row.slug, row.dex_number, summaryOf(detail), detail);
  }
  return rows.length;
}
