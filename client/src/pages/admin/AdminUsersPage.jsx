import { useEffect, useMemo, useState } from 'react';
import { ROLES, canManageUser } from '../../../../shared/roles.js';
import { request } from '../../api.js';
import { useAuth } from '../../auth.jsx';

const emptyForm = () => ({ id: null, username: '', email: '', password: '', role: 'player' });

function UserForm({ form, setForm, actor, onSaved, onCancel }) {
  const [error, setError] = useState(null);
  const editing = form.id !== null;
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const ownAccount = form.id === actor.id;

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const { id, ...fields } = form;
      await request(editing ? `/api/admin/users/${id}` : '/api/admin/users', { method: editing ? 'PUT' : 'POST', body: fields });
      onSaved();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <form className="panel admin-form" onSubmit={submit} aria-label={editing ? `Editar ${form.username}` : 'Novo usuário'}>
      <h2>{editing ? `Editar ${form.username}` : 'Novo usuário'}</h2>
      <div className="admin-grid">
        <label className="field">
          Usuário
          <input value={form.username} onChange={set('username')} required minLength={3} maxLength={30} />
        </label>
        <label className="field">
          E-mail
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label className="field">
          {editing ? 'Nova senha (opcional)' : 'Senha'}
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required={!editing} minLength={8} />
        </label>
        {actor.role === 'admin' && (
          <label className="field">
            Perfil
            <select value={form.role} onChange={set('role')} disabled={ownAccount}>
              {Object.entries(ROLES).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
            </select>
          </label>
        )}
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <div className="admin-row">
        <button type="submit" className="button">Salvar</button>
        <button type="button" className="button button--quiet" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export function AdminUsersPage() {
  const { user: actor, setUser } = useAuth();
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const load = () => request('/api/admin/users').then(setUsers).catch((failure) => setError(failure.message));

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (users ?? []).filter((user) => user.username.toLowerCase().includes(term) || user.email?.includes(term));
  }, [users, query]);

  const saved = async () => {
    if (form.id === actor.id) setUser((current) => ({ ...current, username: form.username, email: form.email }));
    setForm(null);
    await load();
  };

  const remove = async (user) => {
    if (!window.confirm(`Excluir a conta de ${user.username}? Isso não pode ser desfeito.`)) return;
    setError(null);
    try {
      await request(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <div className="admin-page admin-form">
      <header className="page-header">
        <h1>Usuários</h1>
        {users && <p className="page-count">{users.length} contas</p>}
      </header>

      {form ? (
        <UserForm form={form} setForm={setForm} actor={actor} onSaved={saved} onCancel={() => setForm(null)} />
      ) : (
        <div className="admin-toolbar">
          <label className="field field--search">
            Buscar
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button type="button" className="button" onClick={() => setForm(emptyForm())}>Novo usuário</button>
        </div>
      )}

      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {!users && !error && <p className="notice">Carregando…</p>}

      {users && (
        <div className="table-scroll panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const allowed = canManageUser(actor, user);
                return (
                  <tr key={user.id}>
                    <td><strong>{user.username}</strong></td>
                    <td>{user.email}</td>
                    <td>{ROLES[user.role] ?? user.role}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="button button--quiet"
                          disabled={!allowed}
                          aria-label={`Editar ${user.username}`}
                          onClick={() => setForm({ ...emptyForm(), ...user, password: '' })}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button--quiet button--danger"
                          disabled={!allowed || user.id === actor.id}
                          aria-label={`Excluir ${user.username}`}
                          onClick={() => remove(user)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
