const PAGES_ORIGIN = 'imobiturbo-lp-simulador.pages.dev';
const PREFIX = '/simulador';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = PAGES_ORIGIN;
    url.port = '';
    url.pathname = url.pathname === PREFIX ? '/' : url.pathname.slice(PREFIX.length) || '/';
        const response = await fetch(new Request(url, request));
        const headers = new Headers(response.headers);
        headers.set('X-Imobiturbo-Simulator-Origin', 'pages-router');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
  },
};
