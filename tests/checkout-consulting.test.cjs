const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const load = name => import(pathToFileURL(path.resolve(__dirname, '../functions/api/checkout', name)));
const productId = 'consultoria-individual-natan';
const expiresAt = new Date(Date.now() + 1800000).toISOString();
const reference = JSON.stringify({ product_id: productId, plan: 'consultoria', eid: 'synthetic-consulting', checkout_expires_at: expiresAt });
const payment = { id: 'pay_consulting_synthetic', value: 497, billingType: 'PIX', externalReference: reference, description: 'Consultoria Individual de 1h com Natan Pimentel' };

for (const [status, paid] of [['PENDING', false], ['CONFIRMED', true], ['RECEIVED', true], ['REFUNDED', false], ['CHARGEBACK_REQUESTED', false], ['CHARGEBACK_DISPUTE', false]]) {
  test(`consulting ${status}: authoritative product isolation with partial webhook metadata`, async t => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
      calls.push({ url: String(url), method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
      if (String(url).includes('/v3/payments/')) return Response.json({ ...payment, status });
      assert.ok(String(url).includes('/tracking/collect'), 'no membership, customer, email, WhatsApp or onboarding effect');
      return Response.json({ ok: true });
    });
    const response = await (await load('webhook.js')).onRequestPost({ request: new Request('https://example.invalid/api/checkout/webhook', { method: 'POST', headers: { 'asaas-access-token': 'synthetic-hook' }, body: JSON.stringify({ event: 'PAYMENT_RECEIVED', payment: { id: payment.id } }) }), env: { ASAAS_API_KEY: 'synthetic-key', ASAAS_WEBHOOK_TOKEN: 'synthetic-hook' } });
    assert.equal(response.status, 200); const result = await response.json();
    assert.equal(result.productId, productId); assert.equal(result.paid, paid); assert.equal(result.communityMembershipChanged, false);
    for (const call of calls.filter(c => c.method === 'POST')) {
      assert.equal(call.body.productId, productId); assert.equal(call.body.valueCents, 49700);
      assert.equal(call.body.offerId, '12e90537-263d-4150-9757-52193187ffbd');
      assert.equal(call.body.eventId, paid ? 'synthetic-consulting' : 'synthetic-consulting-pending');
    }
    if (['REFUNDED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'].includes(status)) assert.equal(calls.length, 1);
  });
}
test('consulting rejects wrong amount and ignores deleted payment approval', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw Error('unexpected side effect'); });
  const handler = (await load('_consulting.js')).handleConsultingWebhook;
  const base = { request: new Request('https://example.invalid'), env: { ASAAS_API_KEY: 'synthetic' }, paymentId: payment.id };
  assert.equal((await handler({ ...base, verifiedPayment: { ...payment, value: 1, status: 'RECEIVED' } })).status, 422);
  assert.equal((await (await handler({ ...base, verifiedPayment: { ...payment, deleted: true, status: 'RECEIVED' } })).json()).paid, false);
});
test('consulting card installments 2x through 12x validate the R$588 total and final-cent adjustment', async () => {
  const { checkoutDetails, isValidConsultingPayment } = await load('_products.js');
  for (let count = 2; count <= 12; count++) {
    const offerCode = count === 12 ? 'consultoria-12x49' : `consultoria-${count}x`;
    const externalReference = JSON.stringify({ product_id: productId, plan: 'consultoria', offer_code: offerCode, eid: `installment-${count}` });
    const details = checkoutDetails({ externalReference });
    const baseCents = Math.floor(58800 / count);
    const remainderCents = 58800 - baseCents * count;
    assert.equal(details.installmentCount, count);
    assert.equal(details.installmentValue, baseCents / 100);
    assert.equal(details.orderAmount, 588);
    assert.equal(isValidConsultingPayment({ billingType: 'CREDIT_CARD', value: baseCents / 100, installmentNumber: 1 }, details), true);
    assert.equal(isValidConsultingPayment({ billingType: 'CREDIT_CARD', value: (baseCents + remainderCents) / 100, installmentNumber: count }, details), true);
    if (remainderCents) {
      assert.equal(isValidConsultingPayment({ billingType: 'CREDIT_CARD', value: baseCents / 100, installmentNumber: count }, details), false);
    }
  }
});
test('Asaas webhook authentication fails before provider or membership calls', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw Error('unexpected network'); });
  const response = await (await load('webhook.js')).onRequestPost({ request: new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ payment: { id: payment.id } }) }), env: { ASAAS_API_KEY: 'synthetic', ASAAS_WEBHOOK_TOKEN: 'required' } });
  assert.equal(response.status, 401);
});
test('ACTIVE subscription with no first payment is pending, with recovery metadata', async t => {
  t.mock.method(globalThis, 'fetch', async url => String(url).includes('/payments?') ? Response.json({ data: [] }) : Response.json({ id: 'sub_synthetic', status: 'ACTIVE', description: 'Comunidade Imobiturbo - Plano Mensal', externalReference: JSON.stringify({ plan: 'mensal', checkout_expires_at: expiresAt }), value: 147, billingType: 'CREDIT_CARD' }));
  const response = await (await load('status.js')).onRequestGet({ request: new Request('https://example.invalid/api/checkout/status?gateway=asaas&paymentId=sub_synthetic'), env: { ASAAS_API_KEY: 'synthetic' } });
  const data = await response.json(); assert.equal(data.success, true); assert.equal(data.paid, false); assert.equal(data.plan, 'mensal'); assert.equal(data.expiresAt, expiresAt);
});
test('status recovers only the existing Pix QR without payment or customer writes', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    calls.push(String(url)); assert.equal(options.method, undefined);
    return Response.json(String(url).endsWith('/pixQrCode') ? { encodedImage: 'dGVzdA==', payload: 'SYNTHETIC' } : { ...payment, status: 'PENDING' });
  });
  const response = await (await load('status.js')).onRequestGet({ request: new Request(`https://example.invalid/api/checkout/status?gateway=asaas&paymentId=${payment.id}&includePix=1`), env: { ASAAS_API_KEY: 'synthetic' } });
  const result = await response.json(); assert.equal(result.pix.copyPaste, 'SYNTHETIC'); assert.equal(calls.length, 2); assert.equal(result.paymentId, payment.id);
});
