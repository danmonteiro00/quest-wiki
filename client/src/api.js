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
