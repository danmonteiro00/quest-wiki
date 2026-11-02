import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { MapAdminPage } from './pages/MapAdminPage.jsx';
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
      { path: 'mapa/admin', element: <MapAdminPage /> },
      // Parametro opcional em uma rota so: trocar de area nao recria o mapa nem perde o zoom.
      { path: 'mapa/:slug?', element: <MapPage /> },
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
    <RouterProvider router={router} />
  </StrictMode>,
);
