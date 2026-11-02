import { useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api.js';
import { useAuth } from '../auth.jsx';
import { logMessage } from '../drawLog.js';
import { useApi } from '../useApi.js';

function DrawResult({ result }) {
  const { outcome, log, diceFaces } = result;
  return (
    <div className="draw-result" role="status">
      {outcome.image && <img src={outcome.image} alt="" className="draw-result-image" />}
      <div>
        <p className="draw-roll">Tirou {log.roll} de {diceFaces}</p>
        <h3>{outcome.title}</h3>
        {outcome.description && <p>{outcome.description}</p>}
        {outcome.items.length > 0 && (
          <>
            <p className="draw-items-title">Você recebeu:</p>
            <ul className="draw-items">
              {outcome.items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
            </ul>
          </>
        )}
        <p className="draw-log-line">{logMessage(log)}</p>
      </div>
    </div>
  );
}

function DrawCard({ draw }) {
  const { user, loading } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const roll = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await request(`/api/draws/${draw.id}/roll`, { method: 'POST' }));
    } catch (failure) {
      setResult(null);
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="panel draw-card">
      <h2>{draw.title}</h2>
      {draw.description && <p className="prose">{draw.description}</p>}
      <p className="draw-dice">Dado de {draw.diceFaces} faces</p>
      {user ? (
        <button type="button" className="button" disabled={busy} onClick={roll}>{busy ? 'Sorteando…' : 'Sortear'}</button>
      ) : (
        !loading && <Link className="button button--quiet" to={`/entrar?next=${encodeURIComponent('/sorteios')}`}>Entre para sortear</Link>
      )}
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {result && <DrawResult result={result} />}
    </article>
  );
}

export function DrawsPage() {
  const { data, error } = useApi('/api/draws');

  return (
    <>
      <header className="page-header">
        <h1>Sorteios</h1>
      </header>
      {error && <p className="notice notice--error">Não foi possível carregar os sorteios.</p>}
      {!data && !error && <p className="notice">Carregando sorteios…</p>}
      {data && !data.length && <p className="notice">Nenhum sorteio cadastrado ainda.</p>}
      <div className="draw-list">
        {data?.map((draw) => <DrawCard key={draw.id} draw={draw} />)}
      </div>
    </>
  );
}
