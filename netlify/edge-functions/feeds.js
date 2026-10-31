/**
 * Stálé adresy /feeds/*.xml pro Heureku, Zboží, Google a srovnávač.
 *
 * Obsah plní Supabase (edge funkce product-feed + cron) do bucketu `feeds`.
 * Úložiště ale XML posílá jako text/plain a Netlify hlavičky u proxy přepsat
 * neumí, takže typ nastavujeme tady. Adresy se nesmí měnit (párování
 * na Heurece a Zboží trvá kolem 4 pracovních dnů).
 */
const STORAGE = 'https://bfxzhggjpiyqfolqpxzz.supabase.co/storage/v1/object/public/feeds';

export default async (req) => {
  const file = new URL(req.url).pathname.split('/').pop();
  const since = req.headers.get('if-modified-since');
  const upstream = await fetch(`${STORAGE}/${file}`, {
    method: req.method,
    headers: since ? { 'if-modified-since': since } : {},
  });

  if (upstream.status !== 200 && upstream.status !== 304) {
    return new Response('Feed je dočasně nedostupný.', { status: 503, headers: { 'Retry-After': '300' } });
  }

  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  };
  const lastModified = upstream.headers.get('last-modified');
  if (lastModified) headers['Last-Modified'] = lastModified;
  return new Response(upstream.body, { status: upstream.status, headers });
};

export const config = {
  path: ['/feeds/heureka.xml', '/feeds/zbozi.xml', '/feeds/google.xml', '/feeds/srovnavac.xml'],
};
