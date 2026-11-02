const cache = new Map();

export const readCached = (path) => cache.get(path);
export const forgetCached = (path) => cache.delete(path);

export async function fetchJson(path) {
  if (cache.has(path)) return cache.get(path);
  const response = await fetch(path);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  cache.set(path, data);
  return data;
}

// Para o que exige login ou grava dados: nunca passa pelo cache acima.
export async function request(path, { method = 'GET', body, blob } = {}) {
  const response = await fetch(path, {
    method,
    headers: blob ? { 'Content-Type': blob.type } : body ? { 'Content-Type': 'application/json' } : undefined,
    body: blob ?? (body ? JSON.stringify(body) : undefined),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error ?? 'Não foi possível concluir. Tente de novo.');
    error.status = response.status;
    throw error;
  }
  return data;
}
