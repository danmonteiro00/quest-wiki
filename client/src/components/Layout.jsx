import { useEffect, useState } from 'react';
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';

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

      <header className="mobile-bar">
        <button type="button" className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
          <MenuIcon />
        </button>
        <span className="brand-name">Quest Wiki</span>
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
