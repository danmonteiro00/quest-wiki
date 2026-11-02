import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { ROLES, isStaff } from '../../../shared/roles.js';
import { useAuth } from '../auth.jsx';

const STORAGE_KEY = 'quest-wiki:sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveCollapsed(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Sem armazenamento disponivel, o menu so nao lembra o estado.
  }
}

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h6.2M15.3 12h6.2" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.9c1.6.9 2.6 2.6 3 5.1" />
    </svg>
  );
}

function ItemIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l1.5 12h-17z" />
      <path d="M9 11V6.5a3 3 0 0 1 6 0V11" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" />
    </svg>
  );
}

function PlayerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.7-4.2 3.6-6.5 7.5-6.5s6.8 2.3 7.5 6.5" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9.5 11h6M9.5 14.5h6M9.5 18h3.5" />
    </svg>
  );
}

function UserBar() {
  const { user, loading, logout } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <div className="user-bar" />;

  if (!user) {
    const next = pathname === '/entrar' || pathname === '/cadastro' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return (
      <div className="user-bar">
        <Link className="user-action" to={`/entrar${next}`}>Entrar</Link>
      </div>
    );
  }

  return (
    <div className="user-bar">
      <span className="user-avatar" aria-hidden="true">{user.username.charAt(0).toUpperCase()}</span>
      <Link className="user-text" to="/jogador" title="Área do Jogador">
        <span className="user-name">{user.username}</span>
        <span className="user-role">{ROLES[user.role]}</span>
      </Link>
      <button type="button" className="user-action" onClick={logout}>Sair</button>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const toggle = () => {
    setCollapsed((current) => {
      saveCollapsed(!current);
      return !current;
    });
  };

  return (
    <div className={`shell${collapsed ? ' shell--collapsed' : ''}${mobileOpen ? ' shell--mobile-open' : ''}`}>
      <ScrollRestoration />

      <header className="topbar">
        <button type="button" className="icon-button topbar-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
          <MenuIcon />
        </button>
        <span className="brand-name topbar-brand">Quest Wiki</span>
        <UserBar />
      </header>

      <button type="button" className="scrim" aria-label="Fechar menu" tabIndex={mobileOpen ? 0 : -1} onClick={() => setMobileOpen(false)} />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Quest Wiki</span>
        </div>

        <nav aria-label="Principal" className="sidebar-nav">
          <NavLink to="/pokedex" className="nav-item" title="Pokédex">
            <BallIcon />
            <span className="nav-label">Pokédex</span>
          </NavLink>
          <NavLink to="/mapa" className="nav-item" title="Mapa">
            <MapIcon />
            <span className="nav-label">Mapa</span>
          </NavLink>
          <NavLink to="/itemdex" className="nav-item" title="Item DEX">
            <ItemIcon />
            <span className="nav-label">Item DEX</span>
          </NavLink>
          <NavLink to="/movedex" className="nav-item" title="Move DEX">
            <MoveIcon />
            <span className="nav-label">Move DEX</span>
          </NavLink>
          <NavLink to="/sorteios" className="nav-item" title="Sorteios">
            <DiceIcon />
            <span className="nav-label">Sorteios</span>
          </NavLink>
          {user && (
            <NavLink to="/jogador" className="nav-item" title="Área do Jogador">
              <PlayerIcon />
              <span className="nav-label">Área do Jogador</span>
            </NavLink>
          )}

          {isStaff(user) && (
            <>
              <p className="nav-heading">Área Administrativa</p>
              <NavLink to="/admin/usuarios" className="nav-item" title="Usuários">
                <UsersIcon />
                <span className="nav-label">Usuários</span>
              </NavLink>
              <NavLink to="/admin/pokedex" className="nav-item" title="Administrar Pokédex">
                <BallIcon />
                <span className="nav-label">Pokédex</span>
              </NavLink>
              <NavLink to="/admin/mapa" className="nav-item" title="Administrar mapa">
                <MapIcon />
                <span className="nav-label">Mapa</span>
              </NavLink>
              <NavLink to="/admin/itemdex" className="nav-item" title="Administrar Item DEX">
                <ItemIcon />
                <span className="nav-label">Item DEX</span>
              </NavLink>
              <NavLink to="/admin/movedex" className="nav-item" title="Administrar Move DEX">
                <MoveIcon />
                <span className="nav-label">Move DEX</span>
              </NavLink>
              <NavLink to="/admin/sorteios" className="nav-item" title="Administrar sorteios">
                <DiceIcon />
                <span className="nav-label">Sorteios</span>
              </NavLink>
              <NavLink to="/admin/logs" className="nav-item" title="LOG's dos Jogadores">
                <LogIcon />
                <span className="nav-label">LOG's</span>
              </NavLink>
            </>
          )}
        </nav>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <ChevronIcon />
          <span className="nav-label">Recolher</span>
        </button>
      </aside>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
