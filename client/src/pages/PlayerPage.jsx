import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ROLES } from '../../../shared/roles.js';
import { request } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { logDate, logMessage } from '../drawLog.js';
import { useListParams } from '../useListParams.js';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request('/api/player/profile').then(setProfile).catch((failure) => setError(failure.message));
  }, []);

  if (error) return <p className="notice notice--error" role="alert">{error}</p>;
  if (!profile) return <p className="notice">Carregando…</p>;

  return (
    <dl className="facts panel">
      <div><dt>Usuário</dt><dd>{profile.username}</dd></div>
      <div><dt>E-mail</dt><dd>{profile.email}</dd></div>
      <div><dt>Perfil</dt><dd>{ROLES[profile.role]}</dd></div>
      <div><dt>Conta criada em</dt><dd>{logDate(profile.createdAt)}</dd></div>
    </dl>
  );
}

function Logs({ page, setPage }) {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    request(`/api/player/logs?page=${page}`)
      .then((data) => active && setLogs(data))
      .catch((failure) => active && setError(failure.message));
    return () => {
      active = false;
    };
  }, [page]);

  if (error) return <p className="notice notice--error" role="alert">{error}</p>;
  if (!logs) return <p className="notice">Carregando…</p>;
  if (!logs.total) return <p className="notice">Você ainda não usou nenhum sorteio.</p>;

  const pagination = <Pagination page={page} pageCount={logs.pageCount} onChange={setPage} label="Páginas dos LOG's" />;
  return (
    <>
      {pagination}
      <ul className="panel log-list">
        {logs.rows.map((log) => <li key={log.id}>{logMessage(log)}</li>)}
      </ul>
      {pagination}
    </>
  );
}

export function PlayerPage() {
  const { user, loading } = useAuth();
  const { params, setParam, page, setPage } = useListParams();
  const tab = params.get('aba') === 'logs' ? 'logs' : 'dados';

  if (loading) return <p className="notice">Carregando…</p>;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent('/jogador')}`} replace />;

  return (
    <div className="admin-page admin-page--narrow">
      <header className="page-header">
        <h1>Área do Jogador</h1>
      </header>
      <div className="tabs" role="group" aria-label="Seções da Área do Jogador">
        <button type="button" className={tab === 'dados' ? 'is-active' : ''} aria-pressed={tab === 'dados'} onClick={() => setParam('aba', '')}>Dados de cadastro</button>
        <button type="button" className={tab === 'logs' ? 'is-active' : ''} aria-pressed={tab === 'logs'} onClick={() => setParam('aba', 'logs')}>LOG's</button>
      </div>
      {tab === 'dados' ? <Profile /> : <Logs page={page} setPage={setPage} />}
    </div>
  );
}
