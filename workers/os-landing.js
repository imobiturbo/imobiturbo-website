function sliceStream(body, start, length) {
  const reader = body.getReader();
  let skip = start;
  let remaining = length;
  return new ReadableStream({
    async pull(controller) {
      try {
        while (remaining > 0) {
          const {done, value} = await reader.read();
          if (done) { controller.close(); return; }
          if (skip >= value.byteLength) { skip -= value.byteLength; continue; }
          const size = Math.min(remaining, value.byteLength - skip);
          controller.enqueue(value.subarray(skip, skip + size));
          skip = 0;
          remaining -= size;
          if (remaining === 0) { controller.close(); await reader.cancel(); }
          return;
        }
      } catch (error) {
        controller.error(error);
        await reader.cancel(error).catch(() => {});
      }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
}

function mediaResponse(request, response, headers) {
  const generatedLength = headers.get('X-Imobiturbo-Media-Length');
  headers.delete('X-Imobiturbo-Media-Length');
  const full = () => new Response(response.body, {status:response.status,statusText:response.statusText,headers});
  if (response.status !== 200 || !/^(video|audio)\//.test(headers.get('Content-Type') || '')) return full();
  const total = Number(headers.get('Content-Length') || generatedLength);
  if (!Number.isSafeInteger(total) || total <= 0) return full();
  headers.set('Accept-Ranges', 'bytes');
  if (request.method !== 'GET' || !response.body) return full();
  const range = /^bytes=(\d*)-(\d*)$/.exec((request.headers.get('Range') || '').trim());
  if (!range || (!range[1] && !range[2])) return full();
  const validator = request.headers.get('If-Range');
  if (validator && (validator.startsWith('W/') || (validator !== headers.get('ETag') && validator !== headers.get('Last-Modified')))) return full();
  const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= total || end < start || (!range[1] && Number(range[2]) === 0)) {
    response.body.cancel().catch(() => {});
    headers.set('Content-Range', `bytes */${total}`);
    headers.set('Content-Length', '0');
    return new Response(null, {status:416,headers});
  }
  const length = end - start + 1;
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Content-Length', String(length));
  let body = sliceStream(response.body, start, length);
  // Workers calcula Content-Length pelo stream; o tamanho conhecido mantém a resposta exata.
  if (typeof FixedLengthStream === 'function') {
    const fixed = new FixedLengthStream(length);
    body.pipeTo(fixed.writable).catch(() => {});
    body = fixed.readable;
  }
  return new Response(body, {status:206,headers});
}

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
    // O binding pode responder 200 a Range: recorte em streaming para permitir seek.
    return mediaResponse(request, response, headers);
  },
};
