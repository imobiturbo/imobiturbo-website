// Product and offer IDs verified in the Hotmart dashboard on 2026-09-22.
const OFFERS = Object.freeze({
  vgygksgc: 'anual',
  k3sq4mg8: 'trimestral',
  ua8aap3x: 'trimestral', // Existing quarterly offer, paid in full.
  '4zruzp5h': 'mensal',
});

export async function authenticateHotmart(request, env) {
  const expected = env?.HOTMART_HOTTOK;
  if (!expected) return 503;
  const received = request.headers.get('x-hotmart-hottok');
  if (!received) return 401;
  const digest = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a, b] = await Promise.all([digest(expected), digest(received)]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0 ? 200 : 401;
}

export function parseHotmartEvent(payload) {
  const data = payload?.data || {};
  if (String(data.product?.id) !== '8559421') return { action: 'ignore' };
  // COMPLETE follows APPROVED after the guarantee period. It is not a renewal.
  // Canceling the subscription stops future charges, not the already paid term.
  const action = payload.event === 'PURCHASE_APPROVED' ? 'activate'
    : ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK'].includes(payload.event) ? 'review' : 'ignore';
  if (action === 'ignore') return { action };
  const purchase = data.purchase || {};
  const plan = OFFERS[purchase.offer?.code];
  if (!plan) throw new Error('hotmart_unknown_offer');
  if (!purchase.transaction || !data.buyer?.email) throw new Error('hotmart_incomplete_purchase');
  const amount = Number(purchase.price?.value);
  if (!Number.isFinite(amount) || amount < 0 || purchase.price?.currency_value !== 'BRL') {
    throw new Error('hotmart_invalid_amount');
  }
  return {
    action, plan, paymentId: purchase.transaction, amount,
    email: data.buyer.email, name: data.buyer.name || '',
    phone: data.buyer.checkout_phone || data.buyer.phone || '',
  };
}
