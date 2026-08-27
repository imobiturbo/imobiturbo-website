/**
 * Cloudflare Pages Function: POST /api/contact
 * Recebe o formulário de contato do site, assina com HMAC SHA-256 usando o webhook secret
 * e envia para o endpoint de captação do Imobiturbo OS.
 */

const WEBHOOK_URL = 'https://os.imobiturbo.com.br/api/v1/webhooks/in/i7F0QAdp3xKbXOSzSft0lCjkzXggzPxV';
const DEFAULT_SECRET = 'whsec_asnPLHWJWNjXM28ppgf6dWlM97KXWIms4_NpWUn3zwk';

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization, x-imobiturbo-signature',
    },
  });

async function computeHmacSha256(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization, x-imobiturbo-signature',
        'access-control-max-age': '86400',
      },
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed', message: 'Método não permitido' }, 405);
  }

  let body = {};
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    }
  } catch (err) {
    return jsonResponse({ error: 'invalid_payload', message: 'Corpo da requisição inválido' }, 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!name) {
    return jsonResponse({ error: 'missing_field', field: 'name', message: 'Nome é obrigatório' }, 400);
  }
  if (!phone) {
    return jsonResponse({ error: 'missing_field', field: 'phone', message: 'WhatsApp é obrigatório' }, 400);
  }

  const secret = env.IMOBITURBO_WEBHOOK_SECRET || DEFAULT_SECRET;

  const payloadToSend = {
    name,
    phone,
    ...(email ? { email } : {}),
    ...(body.message ? { message: body.message } : {}),
    ...(body.perfil ? { perfil: body.perfil } : {}),
    ...(body.utm_source ? { utm_source: body.utm_source } : {}),
    ...(body.utm_medium ? { utm_medium: body.utm_medium } : {}),
    ...(body.utm_campaign ? { utm_campaign: body.utm_campaign } : {}),
    ...(body.utm_content ? { utm_content: body.utm_content } : {}),
    ...(body.utm_term ? { utm_term: body.utm_term } : {}),
    origem: 'site_imobiturbo_contato',
    origem_url: request.url,
    user_agent: request.headers.get('user-agent') || '',
    submitted_at: new Date().toISOString(),
  };

  const rawBody = JSON.stringify(payloadToSend);
  let signature = '';
  try {
    signature = await computeHmacSha256(secret, rawBody);
  } catch (sigErr) {
    console.error('Error computing HMAC signature:', sigErr);
  }

  try {
    const upstreamHeaders = {
      'content-type': 'application/json',
      'authorization': `Bearer ${secret}`,
    };
    if (signature) {
      upstreamHeaders['x-imobiturbo-signature'] = signature;
    }

    const upstreamRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: upstreamHeaders,
      body: rawBody,
    });

    const upstreamText = await upstreamRes.text();
    let upstreamData = {};
    try {
      upstreamData = JSON.parse(upstreamText);
    } catch {
      upstreamData = { raw: upstreamText };
    }

    if (!upstreamRes.ok) {
      return jsonResponse(
        {
          error: 'upstream_error',
          status: upstreamRes.status,
          message: upstreamData.message || 'Erro ao processar contato',
        },
        upstreamRes.status
      );
    }

    return jsonResponse({
      ok: true,
      message: 'Contato enviado com sucesso!',
      data: upstreamData.data || upstreamData,
    });
  } catch (err) {
    return jsonResponse(
      {
        error: 'network_error',
        message: 'Não foi possível conectar ao servidor. Tente novamente mais tarde.',
      },
      502
    );
  }
}
