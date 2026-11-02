import { useEffect, useState } from 'react';
import { request } from '../../api.js';
import { Pagination } from '../../components/Pagination.jsx';
import { logDate } from '../../drawLog.js';
import { useListParams } from '../../useListParams.js';

const TYPING_DELAY = 300;

export function AdminLogsPage() {
  const { params, setParam, page, setPage } = useListParams();
  const user = params.get('user') ?? '';
  const draw = params.get('draw') ?? '';
  const [typed, setTyped] = useState(user);
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => setTyped(user), [user]);

  useEffect(() => {
    if (typed === user) return undefined;
    const timer = setTimeout(() => setParam('user', typed), TYPING_DELAY);
    return () => clearTimeout(timer);
  }, [typed]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ user, draw, page });
    request(`/api/admin/logs?${query}`)
      .then((data) => {
        if (!active) return;
        setLogs(data);
        setError(null);
      })
      .catch((failure) => active && setError(failure.message));
    return () => {
      active = false;
    };
  }, [user, draw, page]);

  const pagination = logs && <Pagination page={page} pageCount={logs.pageCount} onChange={setPage} label="Páginas dos LOG's" />;

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>LOG's dos Jogadores</h1>
        {logs && <p className="page-count">{logs.total}</p>}
      </header>

      <form className="filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="field field--search">
          <span>Jogador</span>
          <input type="search" value={typed} placeholder="Nome do jogador" onChange={(event) => setTyped(event.target.value)} />
        </label>
        <label className="field">
          <span>Sorteio</span>
          <select value={draw} onChange={(event) => setParam('draw', event.target.value)}>
            <option value="">Todos</option>
            {logs?.draws.map((title) => <option key={title} value={title}>{title}</option>)}
          </select>
        </label>
      </form>

      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {!logs && !error && <p className="notice">Carregando…</p>}
      {logs && !logs.total && <p className="notice">Nenhum LOG encontrado.</p>}

      {logs?.total > 0 && (
        <>
          {pagination}
          <div className="table-scroll panel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Jogador</th>
                  <th>Sorteio</th>
                  <th>Dado</th>
                  <th>Resultado</th>
                  <th>Itens</th>
                </tr>
              </thead>
              <tbody>
                {logs.rows.map((log) => (
                  <tr key={log.id}>
                    <td className="log-date">{logDate(log.createdAt)}</td>
                    <td>
                      <button type="button" className="link-button" title={`Ver só os LOG's de ${log.username}`} onClick={() => setParam('user', log.username)}>{log.username}</button>
                    </td>
                    <td>{log.drawTitle}</td>
                    <td>{log.roll}</td>
                    <td><strong>{log.outcomeTitle}</strong></td>
                    <td>{log.items.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination}
        </>
      )}
    </div>
  );
}
