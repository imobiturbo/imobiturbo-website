import { sitemapFor, VERSION } from '../../seo/site.mjs';
export function onRequest({ request }) {
  const url = new URL(request.url);
  const file = url.pathname.split('/').pop();
  const xml = sitemapFor(file);
  if (!xml) return new Response('Sitemap não encontrado', { status: 404 });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  return new Response(request.method === 'HEAD' ? null : xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600', 'X-SEO-Version': VERSION } });
}
