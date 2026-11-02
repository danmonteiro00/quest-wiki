export const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

export const formatDex = (number) => `#${String(number).padStart(4, '0')}`;

export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function TypeBadge({ type }) {
  return <span className={`type-badge type-${type}`}>{capitalize(type)}</span>;
}
