export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = '/os-crm/v2/';
    const landing = url.pathname === '/' || url.pathname === '/os-crm/v2' || url.pathname.startsWith(prefix);
    // Rotas de login, app, APIs, OAuth e WebSocket seguem à origem intactas.
    if (!landing) return fetch(request);
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Método não permitido', {status:405,headers:{Allow:'GET, HEAD'}});
    }
    if (url.pathname === '/os-crm/v2' || url.pathname === prefix) {
      url.pathname = '/';
      return new Response(null, {status:302,headers:{Location:url.href,'Cache-Control':'no-store'}});
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Imobiturbo-LP-Release', env.RELEASE_SHA || 'local');
    headers.set('X-Imobiturbo-LP-Origin', 'workers-static-assets');
    return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
  },
};
