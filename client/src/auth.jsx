import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { request } from './api.js';

const AuthContext = createContext(null);

// Visitante sem esse cookie nunca entrou, entao nem precisa consultar o servidor.
const mayBeLoggedIn = () => document.cookie.split('; ').includes('qw_logged=1');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(mayBeLoggedIn);

  useEffect(() => {
    if (!mayBeLoggedIn()) return;
    request('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (fields) => {
    const data = await request('/api/auth/login', { method: 'POST', body: fields });
    setUser(data.user);
  }, []);

  const register = useCallback(async (fields) => {
    const data = await request('/api/auth/register', { method: 'POST', body: fields });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await request('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
