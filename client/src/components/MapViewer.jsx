import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MAP_AREAS, MAP_HEIGHT, MAP_WIDTH, findArea } from '../../../shared/map-areas.js';

const MAX_ZOOM = 4;
const DRAG_THRESHOLD = 4;
const REVEAL_MARGIN = 70;

const fitScale = (size) => Math.min(size.width / MAP_WIDTH, size.height / MAP_HEIGHT);

function clampAxis(offset, span, viewport) {
  if (span <= viewport) return (viewport - span) / 2;
  return Math.min(0, Math.max(viewport - span, offset));
}

function clampView(view, size) {
  const fit = fitScale(size);
  const scale = Math.min(Math.max(view.scale, fit), fit * MAX_ZOOM);
  return {
    scale,
    x: clampAxis(view.x, MAP_WIDTH * scale, size.width),
    y: clampAxis(view.y, MAP_HEIGHT * scale, size.height),
  };
}

// Mantem fixo na tela o ponto do mapa que esta em (x, y).
function zoomAround(view, size, factor, x, y) {
  const fit = fitScale(size);
  const scale = Math.min(Math.max(view.scale * factor, fit), fit * MAX_ZOOM);
  const ratio = scale / view.scale;
  return clampView({ scale, x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio }, size);
}

// Centraliza a area escolhida so quando ela esta fora da parte visivel do mapa.
function revealArea(view, size, slug) {
  const area = findArea(slug);
  if (!area) return view;
  const left = view.x + area.x * view.scale;
  const top = view.y + area.y * view.scale;
  const visible = left >= REVEAL_MARGIN && left <= size.width - REVEAL_MARGIN && top >= REVEAL_MARGIN && top <= size.height - REVEAL_MARGIN;
  if (visible) return view;
  return clampView({ scale: view.scale, x: size.width / 2 - area.x * view.scale, y: size.height / 2 - area.y * view.scale }, size);
}

function PinIcon({ right }) {
  return (
    <svg className={right ? 'map-pin map-pin--right' : 'map-pin'} viewBox="0 0 24 32" width="20" height="27" aria-hidden="true">
      <path d="M12 1C5.9 1 1 5.9 1 12c0 7.8 11 19 11 19s11-11.2 11-19C23 5.9 18.1 1 12 1z" />
      <circle cx="12" cy="12" r="4.2" />
    </svg>
  );
}

function RouteLine({ path, preview }) {
  const points = path.map((point) => point.join(',')).join(' ');
  return (
    <g className={preview ? 'map-route-line is-preview' : 'map-route-line'} mask="url(#map-labels)">
      <polyline className="map-route-halo" points={points} />
      <polyline className="map-route-dash" points={points} />
    </g>
  );
}

export function MapViewer({ selected, onSelect }) {
  const viewportRef = useRef(null);
  const sizeRef = useRef(null);
  const selectedRef = useRef(selected);
  const pointers = useRef(new Map());
  const gesture = useRef({ moved: false, startX: 0, startY: 0, pinch: 0 });
  const [view, setView] = useState(null);
  const [hovered, setHovered] = useState(null);

  selectedRef.current = selected;

  useLayoutEffect(() => {
    const element = viewportRef.current;
    const measure = () => {
      const previous = sizeRef.current;
      const size = { width: element.clientWidth, height: element.clientHeight };
      if (!size.width || !size.height) return;
      sizeRef.current = size;
      setView((current) => {
        if (!current || !previous) return clampView({ scale: 0, x: 0, y: 0 }, size);
        // Abrir o quadro muda a largura do mapa: mantem o mesmo centro e o enquadramento total.
        const atFit = current.scale <= fitScale(previous) * 1.001;
        const scale = atFit ? fitScale(size) : current.scale;
        const centerX = (previous.width / 2 - current.x) / current.scale;
        const centerY = (previous.height / 2 - current.y) / current.scale;
        const next = clampView({ scale, x: size.width / 2 - centerX * scale, y: size.height / 2 - centerY * scale }, size);
        return revealArea(next, size, selectedRef.current);
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (sizeRef.current) setView((current) => current && revealArea(current, sizeRef.current, selected));
  }, [selected]);

  // O React registra wheel como passivo, e aqui a pagina nao pode rolar junto com o zoom.
  useEffect(() => {
    const element = viewportRef.current;
    const onWheel = (event) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((current) => current && zoomAround(current, sizeRef.current, factor, event.clientX - rect.left, event.clientY - rect.top));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const zoomCenter = (factor) => {
    const size = sizeRef.current;
    setView((current) => current && zoomAround(current, size, factor, size.width / 2, size.height / 2));
  };

  const reset = () => setView(clampView({ scale: 0, x: 0, y: 0 }, sizeRef.current));

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { moved: false, startX: event.clientX, startY: event.clientY, pinch: 0 };
    }
  };

  const onPointerMove = (event) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);
    const state = gesture.current;

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = viewportRef.current.getBoundingClientRect();
      if (state.pinch) {
        const factor = distance / state.pinch;
        const midX = (a.x + b.x) / 2 - rect.left;
        const midY = (a.y + b.y) / 2 - rect.top;
        setView((value) => value && zoomAround(value, sizeRef.current, factor, midX, midY));
      }
      state.pinch = distance;
      state.moved = true;
      return;
    }

    if (!state.moved) {
      if (Math.hypot(current.x - state.startX, current.y - state.startY) < DRAG_THRESHOLD) return;
      state.moved = true;
      // Capturar so depois de arrastar: antes disso, o clique precisa chegar ao pin ou a rota.
      viewportRef.current.setPointerCapture(event.pointerId);
    }
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    setView((value) => value && clampView({ ...value, x: value.x + dx, y: value.y + dy }, sizeRef.current));
  };

  const onPointerEnd = (event) => {
    pointers.current.delete(event.pointerId);
    gesture.current.pinch = 0;
  };

  const onClickCapture = (event) => {
    if (!gesture.current.moved) return;
    gesture.current.moved = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const onKeyDown = (event) => {
    const step = 60;
    const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      setView((value) => value && clampView({ ...value, x: value.x + dx, y: value.y + dy }, sizeRef.current));
    } else if (event.key === '+' || event.key === '=') {
      zoomCenter(1.25);
    } else if (event.key === '-') {
      zoomCenter(0.8);
    } else if (event.key === '0') {
      reset();
    }
  };

  const selectedRoute = findArea(selected)?.path ? findArea(selected) : null;
  const hoveredRoute = hovered && hovered !== selected ? findArea(hovered) : null;

  return (
    <section
      ref={viewportRef}
      className="map-viewport"
      tabIndex={0}
      aria-label="Mapa da região. Use as setas para mover e as teclas + e - para o zoom."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
    >
      {view && (
        <div
          className="map-stage"
          style={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            // O pin mantem o tamanho na tela, mas encolhe quando o mapa inteiro fica pequeno (celular).
            '--map-pin': Math.min(1, Math.max(0.6, view.scale * 1.3)) / view.scale,
          }}
        >
          <img src="/map.jpg" alt="" width={MAP_WIDTH} height={MAP_HEIGHT} draggable="false" />

          <svg className="map-lines" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true">
            <mask id="map-labels" maskUnits="userSpaceOnUse" x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT}>
              <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#fff" />
              {MAP_AREAS.map((area) => (
                <rect key={area.slug} x={area.x - area.width / 2} y={area.y - area.height / 2} width={area.width} height={area.height} fill="#000" />
              ))}
            </mask>
            {hoveredRoute?.path && <RouteLine path={hoveredRoute.path} preview />}
            {selectedRoute && <RouteLine path={selectedRoute.path} />}
          </svg>

          {MAP_AREAS.map((area) => (
            <button
              key={area.slug}
              type="button"
              className={`map-spot map-spot--${area.kind}${area.slug === selected ? ' is-selected' : ''}`}
              style={{
                left: area.x - area.width / 2,
                top: area.y - area.height / 2,
                width: area.width,
                height: area.height,
              }}
              aria-label={area.name}
              aria-pressed={area.slug === selected}
              onClick={() => onSelect(area.slug)}
              onPointerEnter={() => setHovered(area.slug)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(area.slug)}
              onBlur={() => setHovered(null)}
            >
              {area.kind === 'city' && <PinIcon right={area.pinRight} />}
            </button>
          ))}
        </div>
      )}

      <div className="map-controls" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => zoomCenter(1.4)} aria-label="Aproximar">+</button>
        <button type="button" onClick={() => zoomCenter(1 / 1.4)} aria-label="Afastar">−</button>
        <button type="button" onClick={reset} aria-label="Ver o mapa inteiro">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
      </div>

      {!selected && <p className="map-hint">Clique em uma cidade ou no quadrado de uma rota</p>}
    </section>
  );
}
