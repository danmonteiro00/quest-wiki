// Dados que so mudam ao reimportar: a CDN pode guardar por um dia e poupar o banco.
export function cachePublic(res) {
  res.set('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
}

// Dados editados na Area Administrativa: a mudanca aparece em cerca de um minuto.
export function cacheEditable(res) {
  res.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
}
