// Cloudflare Pages Function: /tracker
// Server-Side Meta Conversions API (Graph API v25.0) Gateway with SHA-256 PII Hashing

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const DEFAULT_PIXEL_ID = '1025303472485246';
const DEFAULT_CAPI_TOKEN =
  'EABAV1IhEOAkBR1gBGluZBDvUnoGmnZC1s2EXMkQw8nX8m7jIYyf1BJ3MYW0Lg9bGEOB889r3nTrzZBowQPMCpVNfX4j9ZA7bWIegc4fNJdAIdEoIknVZB3PUmfxaz2UmI6JhyCUMU0RMknny3oqv5Ni1DNA19rVs6OAJGUS2M3kjri6nGKs9SpkcHrbO6Lm3nGQZDZD';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '';
    const userAgent = request.headers.get('user-agent') || '';
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const userData = body.user_data || {};

    // Filter crawler bots
    if (isBot(userAgent)) {
      return new Response(JSON.stringify({ ok: true, skipped: 'bot_detected' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const fbp = validateFbCookie(userData.fbp) || validateFbCookie(cookies['_fbp']) || '';
    const fbc = validateFbCookie(userData.fbc) || validateFbCookie(cookies['_fbc']) || '';

    // SHA-256 Normalization (accents preserved for names, 55 country code for phones)
    const hashedEm = userData.em ? await sha256(normalizeEmail(userData.em)) : undefined;
    const hashedPh = userData.ph ? await sha256(normalizePhone(userData.ph)) : undefined;
    const hashedFn = userData.fn ? await sha256(normalizeName(userData.fn)) : undefined;
    const hashedLn = userData.ln ? await sha256(normalizeName(userData.ln)) : undefined;
    const hashedExternalId = userData.external_id ? await sha256(userData.external_id.trim()) : undefined;

    const metaUserData = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    };
    if (fbp) metaUserData.fbp = fbp;
    if (fbc) metaUserData.fbc = fbc;
    if (hashedEm) metaUserData.em = [hashedEm];
    if (hashedPh) metaUserData.ph = [hashedPh];
    if (hashedFn) metaUserData.fn = [hashedFn];
    if (hashedLn) metaUserData.ln = [hashedLn];
    if (hashedExternalId) metaUserData.external_id = [hashedExternalId];

    const pixelId = (env && env.META_PIXEL_ID) || DEFAULT_PIXEL_ID;
    const token = (env && env.META_ACCESS_TOKEN) || DEFAULT_CAPI_TOKEN;

    const eventName = body.event_name || 'PageView';
    const eventTime = body.event_time || Math.floor(Date.now() / 1000);
    const eventSourceUrl = body.event_source_url || request.url;

    const eventItem = {
      event_name: eventName,
      event_time: eventTime,
      event_id: body.event_id,
      event_source_url: eventSourceUrl,
      action_source: 'website',
      user_data: metaUserData,
    };

    if (body.custom_data && typeof body.custom_data === 'object') {
      eventItem.custom_data = body.custom_data;
    }

    const payload = {
      data: [eventItem],
    };

    const testEventCode = (env && env.META_TEST_EVENT_CODE) || body.test_event_code;
    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    const metaResp = await fetch(
      `https://graph.facebook.com/v25.0/${pixelId}/events?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      }
    );

    const metaResult = await metaResp.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        ok: metaResp.ok,
        status: metaResp.status,
        result: metaResult,
        events_received: metaResult.events_received,
        fbtrace_id: metaResult.fbtrace_id,
      }),
      {
        status: metaResp.ok ? 200 : (metaResp.status || 502),
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

async function sha256(str) {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(trimmed));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeEmail(em) {
  if (!em || typeof em !== 'string') return '';
  return em.trim().toLowerCase();
}

function normalizePhone(ph) {
  if (!ph || typeof ph !== 'string') return '';
  const digits = ph.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length >= 8 && digits.length <= 11) return '55' + digits;
  return digits;
}

function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

function parseCookies(header) {
  const map = {};
  if (!header) return map;
  header.split(';').forEach((c) => {
    const idx = c.indexOf('=');
    if (idx !== -1) {
      const k = c.slice(0, idx).trim();
      const v = c.slice(idx + 1).trim();
      if (k) map[k] = v;
    }
  });
  return map;
}

function validateFbCookie(val) {
  if (!val || typeof val !== 'string') return '';
  const p = val.split('.');
  return p.length >= 4 && p[0] === 'fb' && /^\d+$/.test(p[1]) && /^\d+$/.test(p[2]) && Boolean(p[3]) ? val : '';
}

function isBot(ua) {
  if (!ua || typeof ua !== 'string' || ua.length < 10) return true;
  return /bot|crawler|spider|scraper|headless|facebookexternalhit|facebot|whatsapp|slackbot|telegrambot|twitterbot|linkedinbot|googlebot|bingbot|msnbot|python-requests|axios|node-fetch|curl|wget|httpie|phantomjs|selenium|puppeteer|playwright/i.test(ua);
}
