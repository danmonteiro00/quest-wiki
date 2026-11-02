// Quando um Pokemon aparece em uma area do mapa. Vazio significa que aparece sempre.
export const CONDITION_GROUPS = [
  {
    key: 'season',
    label: 'Estação',
    any: 'Qualquer estação',
    options: [
      { value: 'spring', label: 'Primavera', icon: '🌸' },
      { value: 'summer', label: 'Verão', icon: '🌻' },
      { value: 'autumn', label: 'Outono', icon: '🍂' },
      { value: 'winter', label: 'Inverno', icon: '⛄' },
    ],
  },
  {
    key: 'weather',
    label: 'Clima',
    any: 'Qualquer clima',
    options: [
      { value: 'sunny', label: 'Sol', icon: '☀️' },
      { value: 'rain', label: 'Chuva', icon: '🌧️' },
      { value: 'storm', label: 'Tempestade', icon: '⛈️' },
      { value: 'snow', label: 'Neve', icon: '❄️' },
      { value: 'fog', label: 'Neblina', icon: '🌫️' },
      { value: 'sandstorm', label: 'Tempestade de areia', icon: '🏜️' },
    ],
  },
  {
    key: 'time',
    label: 'Horário',
    any: 'Dia e noite',
    options: [
      { value: 'day', label: 'Dia', icon: '🌤️' },
      { value: 'night', label: 'Noite', icon: '🌙' },
    ],
  },
];

export function activeConditions(conditions) {
  return CONDITION_GROUPS.flatMap((group) => {
    const option = group.options.find((item) => item.value === conditions?.[group.key]);
    return option ? [option] : [];
  });
}
