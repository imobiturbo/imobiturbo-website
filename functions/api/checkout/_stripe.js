// Keep the API version pinned: invoice confirmation_secret is available in Basil.
const STRIPE_VERSION = '2025-06-30.basil';

function checkoutError(message, status) {
  return Object.assign(new Error(message), { status });
}

export async function stripeRequest(env, path, fields, idempotencyKey) {
  if (!env.STRIPE_SECRET_KEY) {
    throw checkoutError('Pagamento por cartão temporariamente indisponível.', 503);
  }
  if (!/^\/(customers|prices|subscriptions|invoices|payment_intents)(\/|\?|$)/.test(path)) {
    throw checkoutError('Operação de pagamento inválida.', 400);
  }
  if (fields && !idempotencyKey) {
    throw checkoutError('O pagamento precisa de um identificador de tentativa.', 400);
  }
  if (fields && Object.keys(fields).some(key => /^(card\[|creditCard|number$|cvc$|ccv$)/i.test(key))) {
    throw checkoutError('Preencha os dados do cartão no formulário seguro.', 400);
  }
  const headers = {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    'Stripe-Version': STRIPE_VERSION,
  };
  if (fields) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Idempotency-Key'] = idempotencyKey;
  }
  let response;
  let data;
  try {
    response = await fetch(`https://api.stripe.com/v1${path}`, {
      method: fields ? 'POST' : 'GET',
      headers,
      ...(fields ? { body: new URLSearchParams(fields).toString() } : {}),
      signal: AbortSignal.timeout(10000),
    });
    data = await response.json();
  } catch {
    throw checkoutError('Não foi possível conectar ao pagamento. Tente novamente em instantes.', 502);
  }
  if (!response.ok || data.error) {
    throw checkoutError('Não foi possível preparar o pagamento. Tente novamente em instantes.', 502);
  }
  return data;
}

// Verify the untouched body before parsing or granting access. Multiple v1
// signatures are expected during rotation; any current signature is valid.
export async function verifyStripeSignature(rawBody, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || !header) return false;
  const fields = header.split(',').map(part => part.trim().split('='));
  const timestamps = fields.filter(([key]) => key === 't');
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1])) return false;
  const timestamp = Number(timestamps[0][1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300) return false;
  const signatures = fields.filter(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/i.test(value)).map(([, value]) => value);
  if (!signatures.length) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signed = encoder.encode(`${timestamp}.${rawBody}`);
  for (const signature of signatures) {
    const bytes = Uint8Array.from(signature.match(/../g), pair => parseInt(pair, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, signed)) return true;
  }
  return false;
}
