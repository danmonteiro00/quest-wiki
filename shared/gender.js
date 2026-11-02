// Guardado como "88% male / 12% female" ou "Genderless". A PokeAPI usa oitavos (87,5%), por isso o arredondamento.
export function parseGender(gender) {
  if (!gender) return null;
  const male = /([\d.]+)%\s*male/i.exec(gender)?.[1];
  const female = /([\d.]+)%\s*female/i.exec(gender)?.[1];
  if (male === undefined && female === undefined) return { male: 0, female: 0 };
  const rounded = Math.round(male !== undefined ? Number(male) : 100 - Number(female));
  return { male: rounded, female: 100 - rounded };
}

export const genderFromPercent = (male, female) => (male || female ? `${male}% male / ${female}% female` : 'Genderless');

export function genderText(gender) {
  const parts = parseGender(gender);
  if (!parts) return null;
  return parts.male || parts.female ? `${parts.male}% macho / ${parts.female}% fêmea` : 'Sem gênero';
}
