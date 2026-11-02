const BASE = 'https://www.serebii.net';

// Sufixos usados pelo Serebii para cada tipo de forma.
const BY_SUFFIX = {
  alola: 'a', galar: 'g', hisui: 'h', paldea: 'p',
  mega: 'm', 'mega-x': 'mx', 'mega-y': 'my', 'mega-z': 'mz',
  gmax: 'gi', primal: 'p',
};

// Formas em que a primeira letra nao serve (colide com outra forma ou segue outra regra).
// null = o Serebii nao tem imagem propria, entao usamos a da forma base.
const BY_SLUG = {
  'castform-snowy': 'i',
  'rotom-fan': 's',
  'wormadam-sandy': 'c',
  'darmanitan-galar-standard': 'g',
  'darmanitan-galar-zen': 'gz',
  'pumpkaboo-super': 'h',
  'gourgeist-super': 'h',
  'greninja-battle-bond': null,
  'greninja-mega': 'm',
  'zygarde-10': '10',
  'zygarde-10-power-construct': '10',
  'zygarde-50-power-construct': null,
  'oricorio-pau': 'pau',
  'necrozma-dusk': 'dm',
  'necrozma-dawn': 'dw',
  'rockruff-own-tempo': null,
  'raticate-totem-alola': 'a',
  'marowak-totem': 'a',
  'mimikyu-totem-busted': 'b',
  'cramorant-gulping': 'gu',
  'cramorant-gorging': 'go',
  'toxtricity-amped-gmax': 'gi',
  'toxtricity-low-key-gmax': 'gi',
  'urshifu-single-strike-gmax': 'gi',
  'urshifu-rapid-strike-gmax': 'rgi',
  'tauros-paldea-combat-breed': 'p',
  'tauros-paldea-blaze-breed': 'b',
  'tauros-paldea-aqua-breed': 'a',
  'enamorus-therian': 's',
  'koraidon-swimming-build': null,
  'miraidon-aquatic-mode': null,
  'tatsugiri-curly-mega': 'm',
  'tatsugiri-droopy-mega': 'md',
  'tatsugiri-stretchy-mega': 'ms',
  'meowstic-male-mega': 'm',
  'meowstic-female-mega': 'f',
  'magearna-original-mega': 'mo',
  'pikachu-phd': 'phd',
  'pikachu-pop-star': 'ps',
  'pikachu-starter': null,
  'eevee-starter': null,
};

const pad = (dexNumber) => String(dexNumber).padStart(3, '0');

const spriteUrl = (file) => `${BASE}/pokedex-sv/icon/${file}.png`;
const defaultSpriteUrl = (file) => `${BASE}/pokedex-sv/icon/new/${file}.png`;
const artUrl = (file) => `${BASE}/pokemon/art/${file}.png`;

export function formSuffix(slug, speciesSlug) {
  if (slug in BY_SLUG) return BY_SLUG[slug];
  const suffix = slug.startsWith(`${speciesSlug}-`) ? slug.slice(speciesSlug.length + 1) : slug;
  if (suffix.endsWith('-meteor')) return null;
  if (suffix.includes('totem')) return null;
  return BY_SUFFIX[suffix] ?? suffix[0];
}

// Lista de imagens em ordem de preferencia: a interface tenta a proxima quando uma da 404.
export function imagesFor({ slug, speciesSlug, dexNumber, isDefault }) {
  const base = pad(dexNumber);
  const suffix = isDefault ? null : formSuffix(slug, speciesSlug);
  const form = suffix ? `${base}-${suffix}` : null;
  if (!form) {
    return { sprite: [defaultSpriteUrl(base)], art: [artUrl(base), defaultSpriteUrl(base)] };
  }
  // Sem arte da forma, o sprite dela ainda mostra o Pokemon certo; a forma base e o ultimo recurso.
  return {
    sprite: [spriteUrl(form), defaultSpriteUrl(base)],
    art: [artUrl(form), spriteUrl(form), artUrl(base), defaultSpriteUrl(base)],
  };
}
