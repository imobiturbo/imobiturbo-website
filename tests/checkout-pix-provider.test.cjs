const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const handler = import(pathToFileURL(path.join(root, 'functions/api/checkout/index.js')));
const buyer = { plan: 'mensal', paymentMethod: 'PIX', name: 'Teste Checkout', email: 'checkout@example.invalid', phone: '11999999999', cpfCnpj: '52998224725', eventId: 'checkout-test-1' };

async function checkout(t, { reply, body = {}, env = { ABACATEPAY_API_KEY: 'test-key', ASAAS_API_KEY: 'must-not-use' } } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body || '{}') });
    if (!String(url).startsWith('https://api.abacatepay.com/')) throw new Error('Unexpected provider');
    return reply ? reply() : Response.json({ success: true, data: { id: 'pix_test', brCode: 'test-pix-code', brCodeBase64: 'data:image/png;base64,test', status: 'PENDING', expiresAt: '2026-09-22T20:00:00Z' } });
  });
  const response = await (await handler).onRequestPost({ request: new Request('https://www.imobiturbo.com.br/api/checkout', { method: 'POST', body: JSON.stringify({ ...buyer, ...body }) }), env });
  return { response, data: await response.json(), calls };
}

test('Pix uses AbacatePay and the server plan price', async t => {
  const { response, data, calls } = await checkout(t, { body: { amount: 1 } });
  assert.equal(response.status, 200);
  assert.equal(data.gateway, 'abacatepay');
  assert.equal(calls[0].body.data.amount, 14700);
  assert.equal(data.amount, 147);
});

test('a failed Pix request never creates another charge in Asaas', async t => {
  const { response, data, calls } = await checkout(t, { reply: () => Response.json({ success: false, error: 'private provider detail' }, { status: 503 }) });
  assert.equal(calls.length, 1);
  assert.equal(response.status, 502);
  assert.equal(data.success, false);
  assert.ok(!JSON.stringify(data).includes('private provider detail'));
});

test('a timeout does not switch payment providers', async t => {
  const { response, calls } = await checkout(t, { reply: () => { throw new DOMException('timeout', 'TimeoutError'); } });
  assert.equal(calls.length, 1);
  assert.equal(response.status, 502);
});

test('missing AbacatePay credentials fail before any provider call', async t => {
  const { response, calls } = await checkout(t, { env: { ASAAS_API_KEY: 'must-not-use' } });
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
});

test('tracking cannot override the purchased plan or buyer', async t => {
  const { calls } = await checkout(t, { body: { tracking: { plan: 'anual', email: 'another@example.invalid', eventId: 'forged', utm_source: 'campaign' } } });
  const metadata = calls[0].body.data.metadata;
  assert.equal(metadata.plan, 'mensal');
  assert.equal(metadata.email, buyer.email);
  assert.equal(metadata.eventId, buyer.eventId);
  assert.equal(metadata.utm_source, 'campaign');
});

test('an unknown plan cannot silently create an annual charge', async t => {
  const { response, calls } = await checkout(t, { body: { plan: 'unknown' } });
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});
