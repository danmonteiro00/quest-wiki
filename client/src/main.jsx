import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { Layout } from './components/Layout.jsx';
import { AdminCatalogForm, AdminCatalogList } from './pages/admin/AdminCatalogPages.jsx';
import { AdminDrawFormPage, AdminDrawsPage } from './pages/admin/AdminDrawsPages.jsx';
import { AdminLogsPage } from './pages/admin/AdminLogsPage.jsx';
import { AdminDraftPreviewPage } from './pages/admin/AdminDraftPreviewPage.jsx';
import { AdminMapPage } from './pages/admin/AdminMapPage.jsx';
import { AdminPokedexPage } from './pages/admin/AdminPokedexPage.jsx';
import { AdminPokemonFormPage } from './pages/admin/AdminPokemonFormPage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { RequireStaff } from './pages/admin/RequireStaff.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import { DrawsPage } from './pages/DrawsPage.jsx';
import { ItemDexPage } from './pages/ItemDexPage.jsx';
import { MapPage } from './pages/MapPage.jsx';
import { MoveDexPage } from './pages/MoveDexPage.jsx';
import { PlayerPage } from './pages/PlayerPage.jsx';
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
      { path: 'itemdex', element: <ItemDexPage /> },
      { path: 'movedex', element: <MoveDexPage /> },
      { path: 'sorteios', element: <DrawsPage /> },
      { path: 'jogador', element: <PlayerPage /> },
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
          { path: 'pokedex/rascunhos/:draftId', element: <AdminPokemonFormPage key="draft" /> },
          { path: 'pokedex/rascunhos/:draftId/previa', element: <AdminDraftPreviewPage /> },
          { path: 'pokedex/:slug', element: <AdminPokemonFormPage /> },
          { path: 'itemdex', element: <AdminCatalogList key="item" kind="item" /> },
          { path: 'itemdex/novo', element: <AdminCatalogForm key="item-new" kind="item" /> },
          { path: 'itemdex/:slug', element: <AdminCatalogForm key="item-edit" kind="item" /> },
          { path: 'movedex', element: <AdminCatalogList key="move" kind="move" /> },
          { path: 'movedex/novo', element: <AdminCatalogForm key="move-new" kind="move" /> },
          { path: 'movedex/:slug', element: <AdminCatalogForm key="move-edit" kind="move" /> },
          { path: 'mapa', element: <AdminMapPage /> },
          { path: 'sorteios', element: <AdminDrawsPage /> },
          { path: 'sorteios/novo', element: <AdminDrawFormPage /> },
          { path: 'sorteios/:id', element: <AdminDrawFormPage /> },
          { path: 'logs', element: <AdminLogsPage /> },
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
