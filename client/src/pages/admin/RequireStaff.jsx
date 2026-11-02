import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isStaff } from '../../../../shared/roles.js';
import { useAuth } from '../../auth.jsx';

// Aqui so decide o que mostrar: quem protege os dados de verdade e o servidor (server/auth.js).
export function RequireStaff() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <p className="notice">Carregando…</p>;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(pathname)}`} replace />;
  if (!isStaff(user)) return <p className="notice notice--error">Sua conta não tem acesso à Área Administrativa.</p>;
  return <Outlet />;
}
