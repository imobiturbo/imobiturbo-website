const PAGES_ORIGIN = 'imobiturbo-lp-pages.pages.dev';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = PAGES_ORIGIN;
    url.port = '';

    const response = await fetch(new Request(url, request));
    const headers = new Headers(response.headers);
    headers.set('X-Imobiturbo-LP-Origin', 'pages-router');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
