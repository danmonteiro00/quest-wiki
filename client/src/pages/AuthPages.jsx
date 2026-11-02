import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// So aceita caminhos do proprio site, para um link nao poder mandar a pessoa para fora depois do login.
function useNextPath() {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function AuthForm({ title, submitLabel, onSubmit, footer, children }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit();
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="panel auth-form" onSubmit={submit}>
        <h1>{title}</h1>
        {children}
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <button type="submit" className="button" disabled={busy}>{submitLabel}</button>
        <p>{footer}</p>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, ...props }) {
  return (
    <label className="field">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} required {...props} />
    </label>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const next = useNextPath();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) return <Navigate to={next} replace />;

  return (
    <AuthForm
      title="Entrar"
      submitLabel="Entrar"
      onSubmit={() => login({ email, password })}
      footer={<>Ainda não tem conta? <Link to={`/cadastro?next=${encodeURIComponent(next)}`}>Cadastre-se</Link></>}
    >
      <Input label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Input label="Senha" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
    </AuthForm>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const next = useNextPath();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  if (user) return <Navigate to={next} replace />;

  const submit = async () => {
    if (password !== confirm) throw new Error('As senhas não são iguais');
    await register({ username, email, password });
  };

  return (
    <AuthForm
      title="Criar conta"
      submitLabel="Cadastrar"
      onSubmit={submit}
      footer={<>Já tem conta? <Link to={`/entrar?next=${encodeURIComponent(next)}`}>Entrar</Link></>}
    >
      <Input label="Usuário" autoComplete="username" minLength={3} maxLength={30} value={username} onChange={setUsername} />
      <Input label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <Input label="Senha" type="password" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />
      <Input label="Confirmar senha" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={setConfirm} />
    </AuthForm>
  );
}
