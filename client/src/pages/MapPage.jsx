import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { findArea } from '../../../shared/map-areas.js';
import { AreaPanel } from '../components/AreaPanel.jsx';
import { MapViewer } from '../components/MapViewer.jsx';

export function MapPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const area = slug ? findArea(slug) : null;

  if (slug && !area) return <Navigate to="/mapa" replace />;

  return (
    <div className={`map-page${area ? ' map-page--open' : ''}`}>
      <h1 className="visually-hidden">Mapa</h1>
      {area && <AreaPanel key={area.slug} area={area} onClose={() => navigate('/mapa')} />}
      <MapViewer selected={area?.slug} onSelect={(next) => navigate(`/mapa/${next}`)} />
    </div>
  );
}
