import { useSearchParams } from 'react-router-dom';

export const DEX_PAGE_SIZE = 48;

export function paginate(list, requested, size = DEX_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(list.length / size));
  const page = Math.min(requested, pageCount);
  return { rows: list.slice((page - 1) * size, page * size), page, pageCount };
}

// Filtros e pagina ficam no endereco: voltar do Pokemon, ou mandar o link para alguem, cai no mesmo lugar.
export function useListParams() {
  const [params, setParams] = useSearchParams();

  const setParam = (key, value) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    }, { replace: true });
  };

  // Sem replace: cada pagina entra no historico, e o navegador volta ao topo ao trocar.
  const setPage = (value) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value > 1) next.set('page', value);
      else next.delete('page');
      return next;
    });
  };

  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);
  return { params, setParam, page, setPage };
}
