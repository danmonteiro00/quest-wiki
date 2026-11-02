import { parseGender } from '../../shared/gender.js';

// Ficha no formato do forum (BBCode). Os textos fixos, como o nivel, sao preenchidos pelo jogador depois.

const TYPE_COLORS = {
  normal: '#ada594',
  fire: '#f75231',
  water: '#399cff',
  electric: '#ffc631',
  grass: '#7bce52',
  ice: '#5acee7',
  fighting: '#a55239',
  poison: '#b55aa5',
  ground: '#d6b55a',
  flying: '#9cadf7',
  psychic: '#ff73a5',
  bug: '#adbd21',
  rock: '#bda55a',
  ghost: '#6363b5',
  dragon: '#7b63e7',
  dark: '#735a4a',
  steel: '#adadc6',
  fairy: '#f7b5f7',
};

const STAT_ROWS = [
  ['HP', '#c53c3c', 'hp'],
  ['Attack', '#c57a3c', 'attack'],
  ['Defense', '#bba957', 'defense'],
  ['Sp. Atk', '#57a5bb', 'special-attack'],
  ['Sp. Def', '#5ab160', 'special-defense'],
  ['Speed', '#b15aa7', 'speed'],
];
const TOTAL_COLOR = '#8a42a3';

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const colored = (text, type) => (TYPE_COLORS[type] ? `[color=${TYPE_COLORS[type]}]${text}[/color]` : text);

// Sem proporcao de macho e femea, nao mostra simbolo.
function genderSuffix(gender) {
  const { male = 0, female = 0 } = parseGender(gender) ?? {};
  const symbols = `${male > 0 ? '♂' : ''}${female > 0 ? '♀' : ''}`;
  return symbols ? ` (${symbols})` : '';
}

function abilityLine(abilities) {
  const ordered = [...abilities.filter((item) => !item.isHidden), ...abilities.filter((item) => item.isHidden)];
  return ordered.map((item) => item.name).join(' | ');
}

function statsBlock(pokemon) {
  const rows = STAT_ROWS.map(([label, color, stat]) => `<v>[color=${color}]${label}[/color]\n${pokemon.stats[stat]}</v>`);
  rows.push(`<v>[color=${TOTAL_COLOR}]Total[/color]\n${pokemon.statTotal}</v>`);
  return `<div class="fdpok">${rows.join('')}</div>`;
}

// Nivel 0 e 1 sao os golpes iniciais; a mesma linha nao se repete quando o golpe aparece nos dois.
function movesetLines(moves) {
  const lines = (moves?.rows ?? [])
    .filter((move) => move.method === 'level-up')
    .sort((a, b) => a.level - b.level)
    .map((move) => {
      const level = move.level <= 1 ? 'Inicial' : `Lv ${String(move.level).padStart(2, '0')}`;
      return `[${level}] - ${colored(move.name, move.type)}`;
    });
  return [...new Set(lines)];
}

export function buildPokemonSheet(pokemon, artUrl) {
  // Imagem enviada pelo site tem endereco relativo, que nao funcionaria no forum.
  const art = artUrl ? new URL(artUrl, window.location.origin).href : '';
  const types = pokemon.types.map((type) => colored(capitalize(type), type)).join(' / ');

  return [
    `[img(40px,0px)]${art}[/img] ${pokemon.name}${genderSuffix(pokemon.gender)}`,
    `[spoiler]<center>[img(200px,0px)]${art}[/img]`,
    types,
    '[b]Nível 05[/b]',
    '[00/00] ',
    `[b]Habilidade[/b]: ${abilityLine(pokemon.abilities)}`,
    `[b]Item[/b]: ${pokemon.heldItems?.length ? pokemon.heldItems.join(', ') : 'Nenhum'}`,
    `${statsBlock(pokemon)}[b]Moveset[/b]`,
    '',
    ...movesetLines(pokemon.moves),
    '',
    '</center>[/spoiler]',
  ].join('\n');
}

// O campo escondido cobre o iframe do forum, onde o navegador pode bloquear a area de transferencia moderna.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
}
