// Transforma a regra montada a partir da PokeAPI ("Level Up · min level: 16") no texto da ficha ("Lv. 16").
// Texto escrito pelo Admin nao segue esse formato e passa sem mudar.

const TIMES = { Day: 'de dia', Night: 'à noite', Dusk: 'ao entardecer', 'Full Moon': 'na lua cheia' };
const GENDERS = { 1: 'fêmea', 2: 'macho' };
const STAT_RELATIONS = { 1: 'Attack maior que Defense', '-1': 'Attack menor que Defense', 0: 'Attack igual a Defense' };

const TRIGGERS = {
  'Level Up': 'Subir de nível',
  'In Battle Level Up': 'Subir de nível em batalha',
  'Use Item': 'Usar',
  Trade: 'Troca',
  Spin: 'Girar',
  'Use Move': 'Usar',
  'Strong Style Move': 'Usar no estilo forte',
  'Agile Style Move': 'Usar no estilo ágil',
  'Recoil Damage': 'Receber dano de recuo',
  'Take Damage': 'Receber dano',
  Shed: 'Ao evoluir Nincada, com espaço na equipe e uma Poké Ball',
  'Three Critical Hits': 'Acertar 3 golpes críticos em uma batalha',
  'Three Defeated Bisharp': 'Derrotar 3 Bisharp que carregam Leader\'s Crest',
  'Meltan Candies': 'Usar 400 Meltan Candy',
  'Tower Of Darkness': 'Completar a Tower of Darkness',
  'Tower Of Waters': 'Completar a Tower of Waters',
  'Gimmighoul Coins': 'Subir de nível com 999 Gimmighoul Coins',
};

const CONDITIONS = {
  'held item': (value) => `carregando ${value}`,
  'time of day': (value) => TIMES[value] ?? value,
  'known move': (value) => `conhecendo ${value}`,
  'known move type': (value) => `conhecendo golpe do tipo ${value}`,
  'min happiness': (value) => `com felicidade ${value}+`,
  'min beauty': (value) => `com beleza ${value}+`,
  'min affection': (value) => `com afeição ${value}+`,
  'min steps': (value) => `depois de andar ${value} passos`,
  gender: (value) => `(${GENDERS[value] ?? value})`,
  'relative physical stats': (value) => `com ${STAT_RELATIONS[value] ?? value}`,
  region: (value) => `em ${value}`,
  location: (value) => `em ${value}`,
  'trade species': (value) => `com ${value}`,
  'party species': (value) => `com ${value} na equipe`,
  'party type': (value) => `com Pokémon do tipo ${value} na equipe`,
  'allowed natures': (value) => `com natureza ${value}`,
  'near special rock': () => 'perto da pedra especial',
  'needs overworld rain': () => 'com chuva',
  'turn upside down': () => 'com o console de cabeça para baixo',
  'needs multiplayer': () => 'com outro jogador',
};

const parseCondition = (part) => {
  const index = part.indexOf(': ');
  return index === -1 ? [part, ''] : [part.slice(0, index), part.slice(index + 2)];
};

export function evolutionText(rule) {
  const [trigger, ...parts] = String(rule).split(' · ');
  if (!TRIGGERS[trigger]) return rule;
  const conditions = new Map(parts.map(parseCondition));
  const take = (key) => {
    const value = conditions.get(key);
    conditions.delete(key);
    return value;
  };

  const minLevel = take('min level');
  let start = TRIGGERS[trigger];
  if (minLevel !== undefined) start = `Lv. ${minLevel}${trigger === 'In Battle Level Up' ? ' em batalha' : ''}`;
  if (trigger === 'Use Item') start = `Usar ${take('item')}`;

  if (trigger === 'Use Move' || trigger.endsWith('Style Move')) {
    const move = take('used move');
    const count = take('min move count');
    const style = trigger === 'Use Move' ? '' : ` ${TRIGGERS[trigger].replace('Usar ', '')}`;
    start = `Usar ${move}${style}${count ? ` ${count} vezes` : ''}`;
  }

  if (trigger === 'Recoil Damage' || trigger === 'Take Damage') {
    const damage = take('min damage taken');
    start = `Receber ${damage} de dano${trigger === 'Recoil Damage' ? ' de recuo' : ''}`;
  }

  const rest = [...conditions].map(([key, value]) => (CONDITIONS[key] ? CONDITIONS[key](value) : `${key} ${value}`.trim()));
  return [start, ...rest].join(' ');
}
