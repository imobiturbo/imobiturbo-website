// Cloudflare Pages Middleware: Canonical 301 Redirect & First-Party Meta Cookies (_fbp, _fbc)
// Safari ITP resilient: Set-Cookie via HTTP response with 400-day expiry (Max-Age=34560000)

const COOKIE_MAX_AGE = 34560000; // 400 days in seconds

const CC_TLDS = new Set([
  'com.br', 'com.ar', 'com.mx', 'com.co', 'com.pe', 'com.ve', 'com.ec',
  'com.au', 'com.pt', 'com.pl', 'com.tr', 'com.ua', 'com.ru',
  'com.cn', 'com.tw', 'com.hk', 'com.sg', 'com.my', 'com.ph', 'com.vn',
  'co.uk', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'co.in', 'co.id',
]);

function computeSubDomainIndex(host) {
  if (!host) return 1;
  const hostname = host.split(':')[0].toLowerCase();
  const parts = hostname.split('.');
  if (parts.length < 2) return 0;
  if (CC_TLDS.has(parts.slice(-2).join('.'))) return 2;
  return 1;
}

function getRawParam(search, name) {
  const match = (search || '').match(new RegExp('[?&]' + name + '=([^&]*)'));
  return match ? match[1] : '';
}

function parseCookies(cookieHeader) {
  const cookies = {};
  (cookieHeader || '').split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) cookies[name.trim()] = rest.join('=');
  });
  return cookies;
}

function extractFbPayload(value) {
  if (!value) return '';
  const parts = value.split('.');
  return parts.length >= 4 ? parts.slice(3).join('.') : '';
}

function isValidFbCookie(value) {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length < 4) return false;
  if (parts[0] !== 'fb') return false;
  if (!/^\d+$/.test(parts[1])) return false;
  if (!/^\d+$/.test(parts[2])) return false;
  return Boolean(parts[3]);
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 1. Canonical Domain 301 Redirect (imobiturbo.com.br -> www.imobiturbo.com.br)
  if (url.hostname === 'imobiturbo.com.br') {
    url.hostname = 'www.imobiturbo.com.br';
    return Response.redirect(url.toString(), 301);
  }

  // 2. Only intercept HTML page GET requests (skip static assets, /api/, and /tracker)
  const isPageRequest =
    request.method === 'GET' &&
    !url.pathname.match(/\.(js|css|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|map|json|webp|avif|mp4|webm|pdf|xml|txt|webmanifest)$/i) &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/tracker');

  if (!isPageRequest) {
    return next();
  }

  // 3. Fail-open execution for cookie generation and header attachment
  try {
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const now = Date.now();
    const subDomainIndex = computeSubDomainIndex(request.headers.get('host') || url.host);

    // Extract raw fbclid (CRITICAL: never decode via searchParams.get)
    const fbclid = getRawParam(url.search, 'fbclid');

    // Resolve or generate _fbp
    let fbp = cookies['_fbp'] || '';
    if (!isValidFbCookie(fbp)) {
      fbp = `fb.${subDomainIndex}.${now}.${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    }

    // Resolve or update _fbc
    let fbc = cookies['_fbc'] || '';
    if (fbclid) {
      const existingPayload = extractFbPayload(fbc);
      if (!isValidFbCookie(fbc) || existingPayload !== fbclid) {
        fbc = `fb.${subDomainIndex}.${now}.${fbclid}`;
      }
    } else if (!isValidFbCookie(fbc)) {
      fbc = '';
    }

    const response = await next();

    // Set-Cookie headers: Path=/; Max-Age=34560000; SameSite=Lax; Secure (NO HttpOnly)
    const newHeaders = new Headers(response.headers);
    const cookieBase = `Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;

    newHeaders.append('Set-Cookie', `_fbp=${fbp}; ${cookieBase}`);
    if (fbc) {
      newHeaders.append('Set-Cookie', `_fbc=${fbc}; ${cookieBase}`);
    }

    const body = (response.status === 204 || response.status === 304) ? null : response.body;
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    console.error('Edge tracking middleware error (fail-open):', err);
    return next();
  }
}
