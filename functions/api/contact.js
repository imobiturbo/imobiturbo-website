/**
 * Cloudflare Pages Function: POST /api/contact e POST /api/asaas
 * Recebe tanto o formulário web quanto webhooks do Asaas (PAYMENT_CONFIRMED, PAYMENT_RECEIVED, CHECKOUT_PAID),
 * normaliza a identidade do cliente (Nome, WhatsApp, E-mail), assina com HMAC SHA-256 e entrega ao Imobiturbo OS.
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
      'access-control-allow-headers': 'content-type, authorization, x-imobiturbo-signature, asaas-access-token',
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
        'access-control-allow-headers': 'content-type, authorization, x-imobiturbo-signature, asaas-access-token',
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

  // Identificação do formato (Asaas Webhook vs Formulário Web)
  const isAsaas = Boolean(
    body.event ||
    body.payment ||
    request.headers.get('asaas-access-token')
  );

  const asaasEvent = typeof body.event === 'string' ? body.event.toUpperCase() : null;

  // Filtragem de eventos do Asaas: só prossegue para compra aprovada
  if (isAsaas && asaasEvent && !['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'CHECKOUT_PAID'].includes(asaasEvent)) {
    return jsonResponse({ ok: true, status: 'ignored_event', event: asaasEvent, message: 'Evento não requer criação de cliente.' });
  }

  const payment = body.payment && typeof body.payment === 'object' ? body.payment : {};
  const customer = body.customer && typeof body.customer === 'object' ? body.customer : {};

  // Extração inteligente de campos em múltiplos formatos (Asaas nested vs flat)
  const name = (
    (typeof payment.customerName === 'string' && payment.customerName) ||
    (typeof customer.name === 'string' && customer.name) ||
    (typeof body.customerName === 'string' && body.customerName) ||
    (typeof body.name === 'string' && body.name) ||
    (typeof body.nome === 'string' && body.nome) ||
    ''
  ).trim();

  const rawPhone = (
    (typeof payment.customerMobilePhone === 'string' && payment.customerMobilePhone) ||
    (typeof payment.customerPhone === 'string' && payment.customerPhone) ||
    (typeof customer.mobilePhone === 'string' && customer.mobilePhone) ||
    (typeof customer.phone === 'string' && customer.phone) ||
    (typeof body.customerMobilePhone === 'string' && body.customerMobilePhone) ||
    (typeof body.customerPhone === 'string' && body.customerPhone) ||
    (typeof body.phone === 'string' && body.phone) ||
    (typeof body.telefone === 'string' && body.telefone) ||
    (typeof body.whatsapp === 'string' && body.whatsapp) ||
    ''
  ).trim();

  const email = (
    (typeof payment.customerEmail === 'string' && payment.customerEmail) ||
    (typeof customer.email === 'string' && customer.email) ||
    (typeof body.customerEmail === 'string' && body.customerEmail) ||
    (typeof body.email === 'string' && body.email) ||
    ''
  ).trim();

  if (!name && !rawPhone && !email) {
    return jsonResponse({ error: 'missing_field', message: 'Nenhum dado identificável de contato encontrado no payload' }, 400);
  }

  const secret = env.IMOBITURBO_WEBHOOK_SECRET || DEFAULT_SECRET;

  // External ID para idempotência (payment.id evita duplicação entre PAYMENT_CONFIRMED e PAYMENT_RECEIVED)
  const externalId = payment.id || body.id || (isAsaas ? `asaas_${Date.now()}` : undefined);

  const payloadToSend = {
    name: name || 'Cliente Asaas',
    ...(rawPhone ? { phone: rawPhone } : {}),
    ...(email ? { email } : {}),
    ...(isAsaas ? {
      tipo_contato: 'cliente',
      status_compra: 'aprovado',
      asaas_event: asaasEvent || 'PAYMENT_APPROVED',
      asaas_payment_id: payment.id || '',
      asaas_value: payment.value ? String(payment.value) : '',
      asaas_billing_type: payment.billingType || '',
      origem: 'asaas_compra_aprovada',
    } : {
      ...(body.message ? { message: body.message } : {}),
      ...(body.perfil ? { perfil: body.perfil } : {}),
      ...(body.utm_source ? { utm_source: body.utm_source } : {}),
      ...(body.utm_medium ? { utm_medium: body.utm_medium } : {}),
      ...(body.utm_campaign ? { utm_campaign: body.utm_campaign } : {}),
      origem: 'site_imobiturbo_contato',
    }),
    ...(externalId ? { external_id: String(externalId) } : {}),
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
          message: upstreamData.message || 'Erro ao processar lead/cliente',
        },
        upstreamRes.status
      );
    }

    return jsonResponse({
      ok: true,
      message: isAsaas ? 'Cliente e compra processados com sucesso!' : 'Contato enviado com sucesso!',
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
