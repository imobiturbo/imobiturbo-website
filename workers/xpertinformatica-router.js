const PAGES_ORIGIN = 'xpertinformatica-website.pages.dev';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.hostname === 'xpertinformatica.com.br') {
      url.hostname = 'www.xpertinformatica.com.br';
      return Response.redirect(url.toString(), 301);
    }

    url.protocol = 'https:';
    url.hostname = PAGES_ORIGIN;
    url.port = '';

    const response = await fetch(new Request(url, request));
    const headers = new Headers(response.headers);
    headers.set('X-Xpert-Origin', 'cloudflare-pages');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
