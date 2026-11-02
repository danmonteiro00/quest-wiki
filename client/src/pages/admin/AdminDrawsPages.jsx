import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { forgetCached, request } from '../../api.js';
import { ImageField } from '../../components/ImageField.jsx';
import { SearchSelect } from '../../components/SearchSelect.jsx';
import { useApi } from '../../useApi.js';

const API = '/api/admin/draws';

export function AdminDrawsPage() {
  const [draws, setDraws] = useState(null);
  const [error, setError] = useState(null);

  const load = () => request(API).then(setDraws).catch((failure) => setError(failure.message));

  useEffect(() => {
    load();
  }, []);

  const remove = async (draw) => {
    if (!window.confirm(`Excluir o sorteio ${draw.title}? Os LOG's já gravados continuam.`)) return;
    setError(null);
    try {
      await request(`${API}/${draw.id}`, { method: 'DELETE' });
      forgetCached('/api/draws');
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>Sorteios</h1>
        {draws && <p className="page-count">{draws.length}</p>}
      </header>

      <div className="admin-toolbar">
        <Link className="button" to="/admin/sorteios/novo">Cadastrar sorteio</Link>
      </div>

      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {!draws && !error && <p className="notice">Carregando…</p>}
      {draws && !draws.length && <p className="notice">Nenhum sorteio cadastrado ainda.</p>}

      {draws?.length > 0 && (
        <div className="table-scroll panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Faces do dado</th>
                <th>Resultados</th>
                <th><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {draws.map((draw) => (
                <tr key={draw.id}>
                  <td><strong>{draw.title}</strong></td>
                  <td>{draw.diceFaces}</td>
                  <td>{draw.outcomes.length}</td>
                  <td>
                    <div className="admin-actions">
                      <Link className="button button--quiet" to={`/admin/sorteios/${draw.id}`} aria-label={`Editar ${draw.title}`}>Editar</Link>
                      <button type="button" className="button button--quiet button--danger" aria-label={`Excluir ${draw.title}`} onClick={() => remove(draw)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const emptyOutcome = () => ({ title: '', description: '', image: '', faces: 1, items: [] });

function ItemsEditor({ items, options, onChange }) {
  const update = (index, patch) => onChange(items.map((current, i) => (i === index ? { ...current, ...patch } : current)));
  return (
    <div className="admin-wide draw-items-editor">
      {items.map((item, index) => (
        <div className="admin-row" key={index}>
          <SearchSelect
            label={`Item ${index + 1}`}
            freeText
            required
            options={options}
            value={item.name}
            placeholder="Digite para buscar ou escrever"
            onChange={(name) => update(index, { name })}
          />
          <label className="field draw-item-quantity">
            Quantidade
            <input type="number" min="1" max="9999" required value={item.quantity} onChange={(event) => update(index, { quantity: event.target.value })} />
          </label>
          <button type="button" className="button button--quiet" aria-label={`Remover item ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
      <button type="button" className="button button--quiet" onClick={() => onChange([...items, { name: '', quantity: 1 }])}>Adicionar item entregue</button>
    </div>
  );
}

function OutcomeEditor({ outcome, position, options, onChange, onRemove }) {
  const set = (field) => (value) => onChange({ ...outcome, [field]: value });
  return (
    <fieldset className="admin-resource admin-resource--wide">
      <legend>Resultado {position}</legend>
      <label className="field">
        Título
        <input value={outcome.title} required maxLength={80} onChange={(event) => set('title')(event.target.value)} />
      </label>
      <button type="button" className="button button--quiet" onClick={onRemove}>Remover</button>
      <label className="field">
        Faces que preenche
        <input type="number" min="1" max="1000" required value={outcome.faces} onChange={(event) => set('faces')(event.target.value)} />
      </label>
      <div className="admin-wide">
        <ImageField label="Imagem" value={outcome.image} onChange={set('image')} />
      </div>
      <label className="field admin-wide">
        Descrição
        <textarea rows={2} value={outcome.description} onChange={(event) => set('description')(event.target.value)} />
      </label>
      <ItemsEditor items={outcome.items} options={options} onChange={set('items')} />
    </fieldset>
  );
}

export function AdminDrawFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState(editing ? null : { title: '', description: '', diceFaces: 20, outcomes: [emptyOutcome()] });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data: items } = useApi('/api/items');
  const options = useMemo(() => (items ?? []).map((item) => ({ value: item.slug, label: item.name })), [items]);

  useEffect(() => {
    if (!editing) return;
    request(`${API}/${encodeURIComponent(id)}`).then(setForm).catch((failure) => setError(failure.message));
  }, [editing, id]);

  const filled = (form?.outcomes ?? []).reduce((sum, outcome) => sum + (Number(outcome.faces) || 0), 0);
  const complete = form && filled === Number(form.diceFaces);
  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await request(editing ? `${API}/${id}` : API, { method: editing ? 'PUT' : 'POST', body: form });
      forgetCached('/api/draws');
      navigate('/admin/sorteios');
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <div className="admin-page admin-page--narrow">
      <Link to="/admin/sorteios" className="back-link">← Sorteios</Link>
      <header className="page-header">
        <h1>{editing ? `Editar ${form?.title ?? ''}` : 'Cadastrar sorteio'}</h1>
      </header>

      <form className="panel admin-form" onSubmit={submit}>
        {editing && !form && !error && <p className="notice">Carregando…</p>}
        {form && (
          <>
            <div className="admin-grid">
              <label className="field">
                Título
                <input value={form.title} required maxLength={80} placeholder="Baú Comum" onChange={(event) => set('title')(event.target.value)} />
              </label>
              <label className="field">
                Faces do dado
                <input type="number" min="2" max="1000" required value={form.diceFaces} onChange={(event) => set('diceFaces')(event.target.value)} />
              </label>
            </div>
            <label className="field">
              Descrição
              <textarea rows={3} value={form.description} onChange={(event) => set('description')(event.target.value)} />
            </label>

            <div className="admin-block">
              <h2>Faces do dado</h2>
              <p className={`draw-filled${complete ? '' : ' draw-filled--pending'}`} role="status">
                Faces preenchidas: {filled} de {form.diceFaces || 0}{complete ? '' : ' (precisa fechar a conta para salvar)'}
              </p>
              {form.outcomes.map((outcome, index) => (
                <OutcomeEditor
                  key={index}
                  outcome={outcome}
                  position={index + 1}
                  options={options}
                  onChange={(next) => set('outcomes')(form.outcomes.map((item, i) => (i === index ? next : item)))}
                  onRemove={() => set('outcomes')(form.outcomes.filter((_, i) => i !== index))}
                />
              ))}
              <button type="button" className="button button--quiet" onClick={() => set('outcomes')([...form.outcomes, emptyOutcome()])}>Adicionar resultado</button>
            </div>
          </>
        )}
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {form && <button type="submit" className="button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>}
      </form>
    </div>
  );
}
