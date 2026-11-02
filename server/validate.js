// Erro com mensagem pensada para quem preenche o formulario; app.js responde 400 com ela.
export class InvalidInput extends Error {}

export function fail(message) {
  throw new InvalidInput(message);
}

export function text(value, label, max) {
  const clean = String(value ?? '').trim();
  if (clean.length > max) fail(`${label}: use no máximo ${max} caracteres`);
  return clean;
}

export function number(value, label, { min = 0, max, integer = true, required = true } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) fail(`${label}: campo obrigatório`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed)) || parsed < min || parsed > max) {
    fail(`${label}: use um número de ${min} a ${max}`);
  }
  return parsed;
}

export const array = (value) => (Array.isArray(value) ? value : []);

export function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Endereco externo ou imagem enviada para o proprio site (ver routes/images.js).
export const isImageUrl = (value) => isHttpUrl(value) || /^\/api\/images\/\d+$/.test(value);

export function imageUrl(value, label) {
  const clean = text(value, label, 1000);
  if (clean && !isImageUrl(clean)) fail(`${label}: use um endereço http(s) ou envie um arquivo`);
  return clean;
}

export function parseUserFields(raw) {
  const username = text(raw?.username, 'Usuário', 30);
  if (username.length < 3 || !/^[\p{L}\p{N}_.\- ]+$/u.test(username)) {
    fail('Usuário: use de 3 a 30 letras, números, espaços, ponto, traço ou sublinhado');
  }
  const email = text(raw?.email, 'E-mail', 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('E-mail: informe algo como nome@exemplo.com');
  return { username, email };
}

export function parsePassword(value) {
  const password = String(value ?? '');
  if (password.length < 8) fail('Senha: use pelo menos 8 caracteres');
  if (password.length > 200) fail('Senha: use no máximo 200 caracteres');
  return password;
}
