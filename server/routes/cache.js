// Os dados so mudam ao reimportar, entao a CDN pode guardar por um dia e poupar o banco.
export function cachePublic(res) {
  res.set('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
}
