import { useEffect, useState } from 'react';
import { fetchJson, readCached } from './api.js';

export function useApi(path) {
  const [state, setState] = useState({ path, data: readCached(path), error: null });

  useEffect(() => {
    let active = true;
    const cached = readCached(path);
    setState({ path, data: cached, error: null });
    if (cached) return undefined;
    fetchJson(path)
      .then((data) => active && setState({ path, data, error: null }))
      .catch((error) => active && setState({ path, data: undefined, error }));
    return () => {
      active = false;
    };
  }, [path]);

  // Evita mostrar por um instante os dados da pagina anterior ao trocar de rota.
  return state.path === path ? state : { path, data: readCached(path), error: null };
}
