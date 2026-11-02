import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { Layout } from './components/Layout.jsx';
import { AdminMapPage } from './pages/admin/AdminMapPage.jsx';
import { AdminPokedexPage } from './pages/admin/AdminPokedexPage.jsx';
import { AdminPokemonFormPage } from './pages/admin/AdminPokemonFormPage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { RequireStaff } from './pages/admin/RequireStaff.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import { MapPage } from './pages/MapPage.jsx';
import { PokedexPage } from './pages/PokedexPage.jsx';
import { PokemonPage } from './pages/PokemonPage.jsx';
import './styles.css';

const dexRoutes = [
  { index: true, element: <PokedexPage /> },
  { path: ':slug', element: <PokemonPage /> },
];

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/pokedex" replace /> },
      { path: 'pokedex', children: dexRoutes },
      // Parametro opcional em uma rota so: trocar de area nao recria o mapa nem perde o zoom.
      { path: 'mapa/:slug?', element: <MapPage /> },
      { path: 'entrar', element: <LoginPage /> },
      { path: 'cadastro', element: <RegisterPage /> },
      {
        path: 'admin',
        element: <RequireStaff />,
        children: [
          { index: true, element: <Navigate to="usuarios" replace /> },
          { path: 'usuarios', element: <AdminUsersPage /> },
          { path: 'pokedex', element: <AdminPokedexPage /> },
          { path: 'pokedex/novo', element: <AdminPokemonFormPage /> },
          { path: 'pokedex/:slug', element: <AdminPokemonFormPage /> },
          { path: 'mapa', element: <AdminMapPage /> },
        ],
      },
    ],
  },
  {
    // Mesma Pokedex sem o menu lateral, para abrir em iframe dentro do forum.
    path: 'embed/pokedex',
    element: (
      <main className="page page--embed">
        <ScrollRestoration />
        <Outlet />
      </main>
    ),
    children: dexRoutes,
  },
  { path: '*', element: <Navigate to="/pokedex" replace /> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
