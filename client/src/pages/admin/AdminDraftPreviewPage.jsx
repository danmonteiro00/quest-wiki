import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { request } from '../../api.js';
import { PokemonView } from '../PokemonPage.jsx';

export function AdminDraftPreviewPage() {
  const { draftId } = useParams();
  const [pokemon, setPokemon] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request(`/api/admin/pokedex/drafts/${encodeURIComponent(draftId)}/preview`).then(setPokemon).catch((failure) => setError(failure.message));
  }, [draftId]);

  const bar = (
    <div className="draft-bar" role="status">
      <span><strong>Prévia do rascunho.</strong> Este Pokémon ainda não foi publicado e só aparece aqui.</span>
      <span className="admin-actions">
        <Link className="button button--quiet" to="/admin/pokedex?aba=rascunhos">Voltar aos rascunhos</Link>
        <Link className="button" to={`/admin/pokedex/rascunhos/${draftId}`}>Editar</Link>
      </span>
    </div>
  );

  if (error) {
    return (
      <>
        {bar}
        <p className="notice notice--error" role="alert">Não foi possível montar a prévia: {error}</p>
      </>
    );
  }
  if (!pokemon) return <p className="notice">Carregando…</p>;

  // O proprio rascunho nao tem pagina publicada, entao o link dele fica nesta tela.
  const linkTo = (slug) => (slug === pokemon.slug ? '.' : `/pokedex/${slug}`);
  return <PokemonView pokemon={pokemon} back={bar} linkTo={linkTo} />;
}
